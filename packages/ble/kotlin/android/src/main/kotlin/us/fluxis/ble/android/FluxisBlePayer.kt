package us.fluxis.ble.android

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGattCharacteristic
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
import us.fluxis.ble.core.AbortReason
import us.fluxis.ble.core.CollectorErrorCode
import us.fluxis.ble.core.DiscoveryRecord
import us.fluxis.ble.core.FluxisAmount
import us.fluxis.ble.core.FluxisBle
import us.fluxis.ble.core.FluxisBleProtocolException
import us.fluxis.ble.core.PayerEvent
import us.fluxis.ble.core.PayerSession

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
    public val expiresAtEpochSeconds: Long get() = record.expiresAtEpochSeconds
}

/**
 * A delivered NASPIP token. Resolve it with the Fluxis API and show the merchant and amount the
 * API returns; [record] only says which POS it came from.
 */
public class FluxisBleDelivery internal constructor(
    public val token: String,
    public val record: DiscoveryRecord,
    public val address: String,
)

public class FluxisBlePayerException internal constructor(
    public val reason: Reason,
    message: String,
    /** Set when [reason] is [Reason.REJECTED]: the collector's ERROR code. */
    public val collectorError: CollectorErrorCode? = null,
    cause: Throwable? = null,
) : Exception(message, cause) {
    public enum class Reason {
        BLUETOOTH_UNAVAILABLE,
        BLUETOOTH_OFF,
        PERMISSION_DENIED,
        SCAN_FAILED,
        NOT_FOUND,
        CONNECTION_FAILED,
        /** The POS is serving another payer; retrying shortly usually works. */
        BUSY,
        /** The POS answered with ERROR; see [collectorError]. */
        REJECTED,
        EXPIRED,
        PROTOCOL_ERROR,
        DECRYPT_FAILED,
        TIMEOUT,
    }
}

/**
 * Payer (wallet) role on Android: finds Fluxis collectors and receives the NASPIP token over
 * BLE (docs/ble-protocol.md §7). Host-agnostic: it returns the token and nothing else.
 *
 * ```
 * val payer = FluxisBlePayer(context)
 * val delivery = payer.claimNearest()          // or: discover() + claim(candidate)
 * val payment = myWalletBackend.resolveNaspip(delivery.token)
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
     * (strongest signal first). Expired and unreadable collectors are skipped.
     */
    @JvmOverloads
    public suspend fun discover(scanTimeoutMs: Long = 4_000, maxCandidates: Int = 5): List<FluxisBleCandidate> {
        val seen = LinkedHashMap<String, FluxisBleAdvertisement>()
        withTimeoutOrNull(scanTimeoutMs) {
            scan().collect { ad -> if ((seen[ad.address]?.rssi ?: Int.MIN_VALUE) < ad.rssi) seen[ad.address] = ad }
        }
        val nowSeconds = System.currentTimeMillis() / 1000
        val candidates = mutableListOf<FluxisBleCandidate>()
        for (ad in seen.values.sortedByDescending { it.rssi }.take(maxCandidates)) {
            val record = try {
                readRecord(ad.device)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                continue
            }
            if (!record.isExpired(nowSeconds, FluxisBle.EXPIRY_TOLERANCE_SECONDS)) {
                candidates += FluxisBleCandidate(ad.address, ad.rssi, record, ad.device)
            }
        }
        return candidates
    }

    /** Claims the token from [candidate] over a fresh connection. */
    @JvmOverloads
    public suspend fun claim(candidate: FluxisBleCandidate, timeoutMs: Long = 15_000): FluxisBleDelivery =
        deliver(candidate.device, timeoutMs)

    /**
     * Scans until a collector is seen (keeping the strongest one found within a short settle
     * window) and claims its token in one connection. For the common "tap phone to POS" flow.
     */
    @JvmOverloads
    public suspend fun claimNearest(scanTimeoutMs: Long = 6_000, timeoutMs: Long = 15_000): FluxisBleDelivery {
        val seen = LinkedHashMap<String, FluxisBleAdvertisement>()
        val first = withTimeoutOrNull(scanTimeoutMs) { scan().first() }
            ?: throw error(FluxisBlePayerException.Reason.NOT_FOUND, "no Fluxis collector in range")
        seen[first.address] = first
        withTimeoutOrNull(SETTLE_MS) {
            scan().collect { ad -> if ((seen[ad.address]?.rssi ?: Int.MIN_VALUE) < ad.rssi) seen[ad.address] = ad }
        }
        return deliver(seen.values.maxByOrNull { it.rssi }!!.device, timeoutMs)
    }

    private suspend fun readRecord(device: BluetoothDevice): DiscoveryRecord {
        val client = open(device)
        try {
            val record = client.discover().getCharacteristic(FluxisBle.RECORD_UUID)
                ?: throw error(FluxisBlePayerException.Reason.PROTOCOL_ERROR, "RECORD characteristic missing")
            return DiscoveryRecord.decode(client.read(record))
        } finally {
            client.close()
        }
    }

    private suspend fun deliver(device: BluetoothDevice, timeoutMs: Long): FluxisBleDelivery {
        ensureReady()
        var client: GattClient? = null
        try {
            return withTimeoutOrNull(timeoutMs) {
                open(device).also { client = it }.let { runDelivery(it, device) }
            } ?: throw error(FluxisBlePayerException.Reason.TIMEOUT, "delivery timed out")
        } catch (e: FluxisBleProtocolException) {
            throw error(FluxisBlePayerException.Reason.PROTOCOL_ERROR, e.message ?: "protocol error", e)
        } catch (e: GattException) {
            throw error(FluxisBlePayerException.Reason.CONNECTION_FAILED, e.message ?: "GATT error", e)
        } catch (e: SecurityException) {
            throw error(FluxisBlePayerException.Reason.PERMISSION_DENIED, "Bluetooth permission missing", e)
        } finally {
            client?.close()
        }
    }

    private suspend fun runDelivery(client: GattClient, device: BluetoothDevice): FluxisBleDelivery {
        val mtu = try {
            client.requestMtu(DESIRED_MTU)
        } catch (e: GattException) {
            client.mtu
        }
        val service = client.discover()
        val recordChar = service.getCharacteristic(FluxisBle.RECORD_UUID)
        val controlChar = service.getCharacteristic(FluxisBle.CONTROL_UUID)
        val dataChar = service.getCharacteristic(FluxisBle.DATA_UUID)
        if (recordChar == null || controlChar == null || dataChar == null) {
            throw error(FluxisBlePayerException.Reason.PROTOCOL_ERROR, "Fluxis characteristics missing")
        }
        val recordBytes = client.read(recordChar)
        val session = PayerSession(recordBytes, mtu)
        if (session.record.isExpired(System.currentTimeMillis() / 1000, FluxisBle.EXPIRY_TOLERANCE_SECONDS)) {
            throw error(FluxisBlePayerException.Reason.EXPIRED, "collector session expired")
        }
        client.enableIndications(dataChar)
        session.startFrames.forEach { client.write(controlChar, it) }

        var waitMs = FluxisBle.T_FIRST_RESPONSE_MS
        while (true) {
            val frame = withTimeoutOrNull(waitMs) { client.indications.receive() }
                ?: run {
                    writeBestEffort(client, controlChar, session.abortFrames(AbortReason.TIMEOUT))
                    throw error(FluxisBlePayerException.Reason.TIMEOUT, "collector stopped responding")
                }
            waitMs = FluxisBle.T_FRAME_MS
            when (val event = session.onIndication(frame)) {
                PayerEvent.Incomplete -> continue
                is PayerEvent.Delivered -> {
                    event.ackFrames.forEach { client.write(controlChar, it) }
                    return FluxisBleDelivery(event.token, session.record, device.address)
                }
                PayerEvent.Busy -> throw error(FluxisBlePayerException.Reason.BUSY, "collector is busy with another payer")
                is PayerEvent.Rejected -> {
                    val reason = if (event.code == CollectorErrorCode.EXPIRED) FluxisBlePayerException.Reason.EXPIRED
                    else FluxisBlePayerException.Reason.REJECTED
                    throw error(reason, "collector rejected the request: ${event.code.name.lowercase()}", collectorError = event.code)
                }
                is PayerEvent.Failed -> {
                    writeBestEffort(client, controlChar, event.abortFrames)
                    val reason = if (event.reason == AbortReason.DECRYPT_FAILED) FluxisBlePayerException.Reason.DECRYPT_FAILED
                    else FluxisBlePayerException.Reason.PROTOCOL_ERROR
                    throw error(reason, event.cause.message ?: "protocol error", cause = event.cause)
                }
            }
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

    private suspend fun writeBestEffort(client: GattClient, c: BluetoothGattCharacteristic, frames: List<ByteArray>) {
        try {
            frames.forEach { client.write(c, it) }
        } catch (e: GattException) {
            // The link is being torn down anyway.
        }
    }

    private fun ensureReady(): BluetoothAdapter {
        val a = adapter ?: throw error(FluxisBlePayerException.Reason.BLUETOOTH_UNAVAILABLE, "no Bluetooth adapter")
        val missing = FluxisBlePermissions.missing(appContext, FluxisBleRole.PAYER)
        if (missing.isNotEmpty()) throw error(FluxisBlePayerException.Reason.PERMISSION_DENIED, "missing ${missing.joinToString()}")
        if (!a.isEnabled) throw error(FluxisBlePayerException.Reason.BLUETOOTH_OFF, "Bluetooth is off")
        return a
    }

    private fun error(
        reason: FluxisBlePayerException.Reason,
        message: String,
        cause: Throwable? = null,
        collectorError: CollectorErrorCode? = null,
    ) = FluxisBlePayerException(reason, message, collectorError, cause)

    private companion object {
        const val DESIRED_MTU = 517
        const val CONNECT_ATTEMPTS = 2
        const val CONNECT_TIMEOUT_MS = 6_000L
        const val RETRY_DELAY_MS = 300L
        const val SETTLE_MS = 800L
    }
}
