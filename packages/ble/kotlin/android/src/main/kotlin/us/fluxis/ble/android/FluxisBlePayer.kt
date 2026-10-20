package us.fluxis.ble.android

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothManager
import android.bluetooth.le.ScanCallback
import android.bluetooth.le.ScanFilter
import android.bluetooth.le.ScanResult
import android.bluetooth.le.ScanSettings
import android.content.Context
import android.os.ParcelUuid
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import us.fluxis.ble.core.DiscoveryRecord
import us.fluxis.ble.core.FluxisAmount
import us.fluxis.ble.core.FluxisBle
import us.fluxis.ble.core.FluxisBleProtocolException
import us.fluxis.ble.core.PreviewContent
import us.fluxis.ble.core.PreviewValue
import java.util.UUID

/** A collector seen while scanning (not yet connected). */
public class FluxisBleAdvertisement(public val address: String, public val rssi: Int, internal val device: BluetoothDevice)

/** A collector whose discovery record was read. [displayName] and [amount] are hints only. */
public class FluxisBleCandidate internal constructor(
    public val address: String,
    public val rssi: Int,
    public val record: DiscoveryRecord,
    internal val device: BluetoothDevice,
) {
    public val displayName: String get() = record.displayName
    public val amount: FluxisAmount? get() = record.amount
}

/**
 * The active sale of a nearby POS. Resolve [content] with the Fluxis API and show the merchant
 * and amount the API returns; [record] only holds unauthenticated hints.
 *
 * - [PreviewContent.Naspip]: `POST /public/qr/read {"token": …}` → merchant + checkout URL.
 * - [PreviewContent.PosId]: `GET /public/checkout/pos/{posId}` directly.
 *
 * Several payers may see the same sale: re-check that the payment request is still pending
 * right before signing.
 */
public class FluxisBlePreview internal constructor(
    public val record: DiscoveryRecord,
    sessionId: ByteArray,
    public val content: PreviewContent,
    public val address: String,
    public val rssi: Int,
) {
    private val sid = sessionId.copyOf()
    public val sessionId: ByteArray get() = sid.copyOf()

    /** The NASPIP token, or null when the POS published its id instead. */
    public val token: String? get() = (content as? PreviewContent.Naspip)?.token

    /** The POS id, when the POS published it instead of the token. */
    public val posId: UUID? get() = (content as? PreviewContent.PosId)?.posId
}

public class FluxisBlePayerException internal constructor(
    public val reason: Reason,
    message: String,
    cause: Throwable? = null,
) : Exception(message, cause) {
    public enum class Reason {
        BLUETOOTH_UNAVAILABLE,
        BLUETOOTH_OFF,
        PERMISSION_DENIED,
        SCAN_FAILED,
        NOT_FOUND,
        CONNECTION_FAILED,
        /** The collector has no PREVIEW characteristic. */
        NOT_SUPPORTED,
        /** RECORD or PREVIEW failed strict decoding, or their session ids differ. */
        INVALID,
        TIMEOUT,
    }
}

/**
 * Payer (wallet) role on Android: finds Fluxis collectors and reads the active sale they publish
 * (docs/ble-protocol.md §7). Read-only and host-agnostic: it never claims or locks the POS and
 * never calls the Fluxis API.
 *
 * ```
 * val payer = FluxisBlePayer(context)
 * val preview = payer.readNearestPreview()          // or: discover() + readPreview(candidate)
 * val sale = myWalletBackend.resolve(preview)       // /public/qr/read + /public/checkout/pos/{posId}
 * ```
 */
@SuppressLint("MissingPermission")
public class FluxisBlePayer(context: Context) {
    private val appContext = context.applicationContext
    private val adapter: BluetoothAdapter? =
        (appContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager?)?.adapter

    /** Raw scan for collectors (service UUID filter, low latency). Cancel the collector to stop. */
    public fun scan(): Flow<FluxisBleAdvertisement> = callbackFlow {
        val scanner = ensureReady().bluetoothLeScanner ?: throw error(FluxisBlePayerException.Reason.BLUETOOTH_OFF, "no LE scanner")
        val callback = object : ScanCallback() {
            override fun onScanResult(callbackType: Int, result: ScanResult) {
                trySend(FluxisBleAdvertisement(result.device.address, result.rssi, result.device))
            }

            override fun onBatchScanResults(results: MutableList<ScanResult>) {
                results.forEach { onScanResult(0, it) }
            }

            override fun onScanFailed(errorCode: Int) {
                close(error(FluxisBlePayerException.Reason.SCAN_FAILED, "scan failed: $errorCode"))
            }
        }
        val filters = listOf(ScanFilter.Builder().setServiceUuid(ParcelUuid(FluxisBle.SERVICE_UUID)).build())
        val settings = ScanSettings.Builder().setScanMode(ScanSettings.SCAN_MODE_LOW_LATENCY).build()
        try {
            scanner.startScan(filters, settings, callback)
        } catch (e: SecurityException) {
            throw error(FluxisBlePayerException.Reason.PERMISSION_DENIED, "scan not permitted", e)
        }
        awaitClose { runCatching { scanner.stopScan(callback) } }
    }

    /**
     * Scans for [scanTimeoutMs], then reads the record of up to [maxCandidates] collectors
     * (strongest signal first). Unreadable collectors are skipped.
     */
    @JvmOverloads
    public suspend fun discover(scanTimeoutMs: Long = 4_000, maxCandidates: Int = 5): List<FluxisBleCandidate> {
        val seen = LinkedHashMap<String, FluxisBleAdvertisement>()
        withTimeoutOrNull(scanTimeoutMs) {
            scan().collect { ad -> if ((seen[ad.address]?.rssi ?: Int.MIN_VALUE) < ad.rssi) seen[ad.address] = ad }
        }
        val candidates = mutableListOf<FluxisBleCandidate>()
        for (ad in seen.values.sortedByDescending { it.rssi }.take(maxCandidates)) {
            val record = try {
                withTimeoutOrNull(DEFAULT_READ_TIMEOUT_MS) { readRecord(ad.device) } ?: continue
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                continue
            }
            candidates += FluxisBleCandidate(ad.address, ad.rssi, record, ad.device)
        }
        return candidates
    }

    /** Short connection to [candidate]: reads RECORD and PREVIEW, then disconnects. */
    @JvmOverloads
    public suspend fun readPreview(candidate: FluxisBleCandidate, timeoutMs: Long = DEFAULT_READ_TIMEOUT_MS): FluxisBlePreview =
        preview(candidate.device, candidate.rssi, timeoutMs)

    /**
     * Scans until a collector is seen (keeping the strongest one found within a short settle
     * window) and reads its preview. For the common "hold the phone near the POS" flow.
     */
    @JvmOverloads
    public suspend fun readNearestPreview(scanTimeoutMs: Long = 6_000, timeoutMs: Long = DEFAULT_READ_TIMEOUT_MS): FluxisBlePreview {
        val seen = LinkedHashMap<String, FluxisBleAdvertisement>()
        val first = withTimeoutOrNull(scanTimeoutMs) { scan().first() }
            ?: throw error(FluxisBlePayerException.Reason.NOT_FOUND, "no Fluxis collector in range")
        seen[first.address] = first
        withTimeoutOrNull(SETTLE_MS) {
            scan().collect { ad -> if ((seen[ad.address]?.rssi ?: Int.MIN_VALUE) < ad.rssi) seen[ad.address] = ad }
        }
        val nearest = seen.values.maxByOrNull { it.rssi }!!
        return preview(nearest.device, nearest.rssi, timeoutMs)
    }

    private suspend fun readRecord(device: BluetoothDevice): DiscoveryRecord {
        val client = open(device)
        try {
            val record = client.discover().getCharacteristic(FluxisBle.RECORD_UUID)
                ?: throw error(FluxisBlePayerException.Reason.NOT_SUPPORTED, "RECORD characteristic missing")
            return DiscoveryRecord.decode(client.read(record))
        } finally {
            client.close()
        }
    }

    private suspend fun preview(device: BluetoothDevice, rssi: Int, timeoutMs: Long): FluxisBlePreview {
        ensureReady()
        var client: GattClient? = null
        try {
            return withTimeoutOrNull(timeoutMs) {
                val c = open(device).also { client = it }
                // A large MTU turns the ~450-byte long read into one or two round trips.
                try {
                    c.requestMtu(DESIRED_MTU)
                } catch (e: GattException) {
                    // Keep the default MTU; long reads still work.
                }
                val service = c.discover()
                val recordChar = service.getCharacteristic(FluxisBle.RECORD_UUID)
                val previewChar = service.getCharacteristic(FluxisBle.PREVIEW_UUID)
                if (recordChar == null || previewChar == null) {
                    throw error(FluxisBlePayerException.Reason.NOT_SUPPORTED, "collector has no PREVIEW characteristic")
                }
                val recordBytes = c.read(recordChar)
                val previewBytes = c.read(previewChar)
                c.close()
                client = null
                val record = DiscoveryRecord.decode(recordBytes)
                val value = PreviewValue.decode(previewBytes)
                if (!record.sessionId.contentEquals(value.sessionId)) {
                    throw error(FluxisBlePayerException.Reason.INVALID, "RECORD and PREVIEW session ids differ")
                }
                FluxisBlePreview(record, value.sessionId, value.content, device.address, rssi)
            } ?: throw error(FluxisBlePayerException.Reason.TIMEOUT, "preview read timed out")
        } catch (e: FluxisBleProtocolException) {
            throw error(FluxisBlePayerException.Reason.INVALID, e.message ?: "invalid preview", e)
        } catch (e: GattException) {
            throw error(FluxisBlePayerException.Reason.CONNECTION_FAILED, e.message ?: "GATT error", e)
        } catch (e: SecurityException) {
            throw error(FluxisBlePayerException.Reason.PERMISSION_DENIED, "Bluetooth permission missing", e)
        } finally {
            client?.close()
        }
    }

    /** Connects with one retry: status 133 on the first attempt is common on Android. */
    private suspend fun open(device: BluetoothDevice): GattClient {
        var last: GattException? = null
        for (attempt in 1..CONNECT_ATTEMPTS) {
            val client = GattClient(appContext, device)
            try {
                client.connect(CONNECT_TIMEOUT_MS)
                return client
            } catch (e: GattException) {
                client.close()
                last = e
            } catch (e: Throwable) {
                client.close()
                throw e
            }
            if (attempt < CONNECT_ATTEMPTS) delay(RETRY_DELAY_MS)
        }
        throw error(FluxisBlePayerException.Reason.CONNECTION_FAILED, last?.message ?: "connect failed", cause = last)
    }

    private fun ensureReady(): BluetoothAdapter {
        val a = adapter ?: throw error(FluxisBlePayerException.Reason.BLUETOOTH_UNAVAILABLE, "no Bluetooth adapter")
        val missing = FluxisBlePermissions.missing(appContext, FluxisBleRole.PAYER)
        if (missing.isNotEmpty()) throw error(FluxisBlePayerException.Reason.PERMISSION_DENIED, "missing ${missing.joinToString()}")
        if (!a.isEnabled) throw error(FluxisBlePayerException.Reason.BLUETOOTH_OFF, "Bluetooth is off")
        return a
    }

    private fun error(reason: FluxisBlePayerException.Reason, message: String, cause: Throwable? = null) =
        FluxisBlePayerException(reason, message, cause)

    public companion object {
        public const val DEFAULT_READ_TIMEOUT_MS: Long = 6_000
        private const val DESIRED_MTU = 517
        private const val CONNECT_ATTEMPTS = 2
        private const val CONNECT_TIMEOUT_MS = 5_000L
        private const val RETRY_DELAY_MS = 300L
        private const val SETTLE_MS = 800L
    }
}
