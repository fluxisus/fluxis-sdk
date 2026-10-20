package us.fluxis.ble.android

import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattServer
import android.bluetooth.BluetoothGattServerCallback
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import android.os.Handler
import android.os.HandlerThread
import android.os.ParcelUuid
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import us.fluxis.ble.core.CollectorConfig
import us.fluxis.ble.core.CollectorEngine
import us.fluxis.ble.core.CollectorIo
import us.fluxis.ble.core.CollectorPhase
import us.fluxis.ble.core.FluxisAmount
import us.fluxis.ble.core.FluxisBle
import us.fluxis.ble.core.PreviewContent
import us.fluxis.ble.core.toHex
import java.util.UUID

/** Snapshot of the collector, published on [FluxisBleCollector.state]. */
public data class CollectorState(
    val phase: CollectorPhase,
    /** Why the phase changed, e.g. `advertise_failed:…`, `server_failed:missing_permission:…`. */
    val detail: String? = null,
    /** Hex session id of the current session, for logs and support. */
    val sessionId: String? = null,
    /** Size in bytes of the PREVIEW value being served (never the token itself). */
    val previewBytes: Int? = null,
    /** `naspip` or `pos_id`: what PREVIEW carries. */
    val previewKind: String? = null,
    /** Complete PREVIEW reads served in this session (diagnostics; not payment status). */
    val previewReads: Int = 0,
) {
    val isTerminal: Boolean get() = phase.isTerminal
    val isAdvertising: Boolean get() = phase == CollectorPhase.ADVERTISING
}

/**
 * Collector (POS) role: advertises and serves RECORD and PREVIEW (the active sale's NASPIP
 * token) to every payer nearby until stopped (docs/ble-protocol.md §6). Nothing is claimed or
 * locked; payment status comes from your backend, never from BLE.
 *
 * ```
 * val collector = FluxisBleCollector(context)
 * collector.start(token = naspipToken, amount = FluxisAmount.parse("12.50", "ARS"), displayName = "Café Tero", posId = posId)
 * // … poll the backend; when the sale is paid, cancelled or expired:
 * collector.stop()
 * ```
 *
 * One session runs at a time; [start] replaces any running session. Thread-safe.
 */
@SuppressLint("MissingPermission")
public class FluxisBleCollector @JvmOverloads constructor(
    context: Context,
    private val options: Options = Options(),
) {
    public class Options @JvmOverloads constructor(
        /** One of `AdvertiseSettings.ADVERTISE_TX_POWER_*`. Medium keeps range near the counter. */
        public val txPowerLevel: Int = AdvertiseSettings.ADVERTISE_TX_POWER_MEDIUM,
        /** Debug log sink; never receives the token. */
        public val logger: ((String) -> Unit)? = null,
    )

    /** Callback alternative to [state]; invoked on the collector's internal thread. */
    public fun interface Listener {
        public fun onStateChanged(state: CollectorState)
    }

    private val appContext = context.applicationContext
    private val thread = HandlerThread("fluxis-ble-collector").apply { start() }
    private val handler = Handler(thread.looper)
    private val mutableState = MutableStateFlow(CollectorState(CollectorPhase.IDLE))
    private var session: Session? = null

    public val state: StateFlow<CollectorState> = mutableState.asStateFlow()

    /**
     * Starts a session for [token] (the NASPIP token from Fluxis core-api). [amount] and
     * [displayName] are published as hints (amount null for open-amount PoS; name cut to 64
     * UTF-8 bytes). [posId] is published instead of the token only if the token is longer
     * than 494 bytes; without it such a token is rejected. Throws [IllegalArgumentException]
     * or `FluxisBleProtocolException` for invalid input; runtime Bluetooth problems surface as
     * [CollectorPhase.FAILED] with a [CollectorState.detail].
     */
    @JvmOverloads
    public fun start(
        token: String,
        amount: FluxisAmount?,
        displayName: String,
        posId: UUID? = null,
        listener: Listener? = null,
    ) {
        val config = CollectorConfig(token, amount, displayName, posId)
        handler.post {
            session?.stop()
            session = Session(config, listener).also { it.start() }
        }
    }

    /** Stops the running session (phase `stopped`). Safe to call at any time. */
    public fun stop() {
        handler.post { session?.stop() }
    }

    /** Stops the session and releases the worker thread. The instance can't be reused. */
    public fun release() {
        handler.post {
            session?.stop()
            session = null
            thread.quitSafely()
        }
    }

    private fun log(msg: String) = options.logger?.invoke(msg)

    /** One session: owns the GATT server, the advertiser and the engine. Runs on [handler]. */
    private inner class Session(config: CollectorConfig, private val listener: Listener?) : CollectorIo {
        private val manager = appContext.getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager?
        private val adapter: BluetoothAdapter? = manager?.adapter
        private var server: BluetoothGattServer? = null
        private var advertiser: BluetoothLeAdvertiser? = null
        private var advertiseCallback: AdvertiseCallback? = null
        private val devices = HashMap<String, BluetoothDevice>()
        private var closed = false
        private val engine = CollectorEngine(config, this)
        private val sessionHex = engine.record.sessionId.toHex()
        private val previewSize = engine.previewBytes().size
        private val previewKind = if (engine.preview.content is PreviewContent.PosId) "pos_id" else "naspip"
        private val tick = Runnable { onTick() }

        private val recordChar = BluetoothGattCharacteristic(
            FluxisBle.RECORD_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ,
        )
        private val previewChar = BluetoothGattCharacteristic(
            FluxisBle.PREVIEW_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ,
        )

        private val bluetoothStateReceiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                val s = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, BluetoothAdapter.ERROR)
                if (s == BluetoothAdapter.STATE_TURNING_OFF || s == BluetoothAdapter.STATE_OFF) {
                    handler.post { engine.onServerFailed("bluetooth_off") }
                }
            }
        }
        private var receiverRegistered = false

        fun start() {
            engine.begin()
            val missing = FluxisBlePermissions.missing(appContext, FluxisBleRole.COLLECTOR)
            when {
                adapter == null -> return engine.onServerFailed("bluetooth_unavailable")
                missing.isNotEmpty() -> return engine.onServerFailed("missing_permission:${missing.joinToString(",")}")
                !adapter.isEnabled -> return engine.onServerFailed("bluetooth_off")
            }
            advertiser = adapter!!.bluetoothLeAdvertiser
            if (advertiser == null) return engine.onServerFailed("advertising_unsupported")
            registerBluetoothReceiver()
            guarded("open_server") {
                server = manager!!.openGattServer(appContext, serverCallback)
                val s = server ?: return@guarded engine.onServerFailed("open_server_failed")
                val service = BluetoothGattService(FluxisBle.SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)
                service.addCharacteristic(recordChar)
                service.addCharacteristic(previewChar)
                if (!s.addService(service)) engine.onServerFailed("add_service_failed")
            }
        }

        /** Stops and closes synchronously, so a replacement session never overlaps this server. */
        fun stop() {
            engine.stop()
            closeNow()
        }

        // ── CollectorIo ──────────────────────────────────────────────────────

        override fun startAdvertising() {
            val adv = advertiser ?: return
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setConnectable(true)
                .setTimeout(0)
                .setTxPowerLevel(options.txPowerLevel)
                .build()
            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(ParcelUuid(FluxisBle.SERVICE_UUID))
                .build()
            val callback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                    handler.post { if (advertiseCallback === this) engine.onAdvertisingStarted() }
                }

                override fun onStartFailure(errorCode: Int) {
                    handler.post {
                        if (advertiseCallback !== this) return@post
                        if (errorCode == ADVERTISE_FAILED_ALREADY_STARTED) {
                            engine.onAdvertisingStarted()
                        } else {
                            advertiseCallback = null
                            engine.onAdvertisingFailed(advertiseError(errorCode))
                        }
                    }
                }
            }
            advertiseCallback = callback
            guarded("start_advertising") { adv.startAdvertising(settings, data, callback) }
        }

        override fun stopAdvertising() {
            val callback = advertiseCallback ?: return
            advertiseCallback = null
            guarded("stop_advertising") { advertiser?.stopAdvertising(callback) }
        }

        override fun disconnect(peer: String) {
            devices[peer]?.let { d -> guarded("disconnect") { server?.cancelConnection(d) } }
        }

        override fun closeServer() = closeNow()

        override fun onPhaseChanged(phase: CollectorPhase, detail: String?) {
            log("phase=${phase.wire}${detail?.let { " ($it)" } ?: ""} session=$sessionHex preview=$previewKind/${previewSize}B")
            publish(phase, detail)
        }

        override fun onPreviewRead(peer: String, total: Int) {
            log("preview read #$total session=$sessionHex")
            publish(engine.phase, mutableState.value.detail)
        }

        private fun publish(phase: CollectorPhase, detail: String?) {
            val s = CollectorState(phase, detail, sessionHex, previewSize, previewKind, engine.previewReads)
            mutableState.value = s
            listener?.onStateChanged(s)
        }

        private fun closeNow() {
            if (closed) return
            closed = true
            stopAdvertising()
            guarded("close_server") {
                server?.clearServices()
                server?.close()
            }
            server = null
            handler.removeCallbacks(tick)
            if (receiverRegistered) {
                runCatching { appContext.unregisterReceiver(bluetoothStateReceiver) }
                receiverRegistered = false
            }
        }

        // ── Timers ───────────────────────────────────────────────────────────

        private fun scheduleTick() {
            handler.removeCallbacks(tick)
            if (closed) return
            val deadline = engine.nextDeadlineMs() ?: return
            handler.postDelayed(tick, maxOf(0L, deadline - System.currentTimeMillis()))
        }

        private fun onTick() {
            engine.onTick()
            scheduleTick()
        }

        // ── GATT server callbacks (binder threads → handler) ─────────────────

        private val serverCallback = object : BluetoothGattServerCallback() {
            override fun onServiceAdded(status: Int, service: BluetoothGattService) = post {
                if (status == BluetoothGatt.GATT_SUCCESS) engine.onServiceAdded() else engine.onServerFailed("add_service_status:$status")
            }

            override fun onConnectionStateChange(device: BluetoothDevice, status: Int, newState: Int) = post {
                val id = device.address
                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    devices[id] = device
                    engine.onConnected(id)
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    devices.remove(id)
                    engine.onDisconnected(id)
                }
            }

            override fun onCharacteristicReadRequest(
                device: BluetoothDevice,
                requestId: Int,
                offset: Int,
                characteristic: BluetoothGattCharacteristic,
            ) = post {
                devices.getOrPut(device.address) { device }
                val value = when (characteristic.uuid) {
                    FluxisBle.RECORD_UUID -> engine.readRecord(device.address, offset)
                    FluxisBle.PREVIEW_UUID -> engine.readPreview(device.address, offset)
                    else -> {
                        respond(device, requestId, BluetoothGatt.GATT_READ_NOT_PERMITTED, offset, null)
                        return@post
                    }
                }
                // The stack truncates the value to MTU − 1; the central asks again at the next offset.
                if (value == null) {
                    respond(device, requestId, BluetoothGatt.GATT_INVALID_OFFSET, offset, null)
                } else {
                    respond(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
                }
            }

            override fun onCharacteristicWriteRequest(
                device: BluetoothDevice,
                requestId: Int,
                characteristic: BluetoothGattCharacteristic,
                preparedWrite: Boolean,
                responseNeeded: Boolean,
                offset: Int,
                value: ByteArray?,
            ) = post {
                if (responseNeeded) respond(device, requestId, BluetoothGatt.GATT_WRITE_NOT_PERMITTED, offset, null)
            }

            override fun onExecuteWrite(device: BluetoothDevice, requestId: Int, execute: Boolean) = post {
                respond(device, requestId, GATT_REQUEST_NOT_SUPPORTED, 0, null)
            }

            override fun onDescriptorWriteRequest(
                device: BluetoothDevice,
                requestId: Int,
                descriptor: BluetoothGattDescriptor,
                preparedWrite: Boolean,
                responseNeeded: Boolean,
                offset: Int,
                value: ByteArray?,
            ) = post {
                if (responseNeeded) respond(device, requestId, BluetoothGatt.GATT_WRITE_NOT_PERMITTED, offset, null)
            }
        }

        private fun post(block: () -> Unit) {
            handler.post {
                if (closed) return@post
                block()
                scheduleTick()
            }
        }

        private fun respond(device: BluetoothDevice, requestId: Int, status: Int, offset: Int, value: ByteArray?) {
            guarded("send_response") { server?.sendResponse(device, requestId, status, offset, value) }
        }

        private fun registerBluetoothReceiver() {
            val filter = IntentFilter(BluetoothAdapter.ACTION_STATE_CHANGED)
            if (Build.VERSION.SDK_INT >= 33) {
                appContext.registerReceiver(bluetoothStateReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
            } else {
                appContext.registerReceiver(bluetoothStateReceiver, filter)
            }
            receiverRegistered = true
        }

        /** Runs a Bluetooth call; a SecurityException (permission revoked) fails the session. */
        private inline fun guarded(what: String, block: () -> Unit) {
            try {
                block()
            } catch (e: SecurityException) {
                log("$what: ${e.message}")
                engine.onServerFailed("missing_permission:$what")
            }
        }
    }

    private companion object {
        const val GATT_REQUEST_NOT_SUPPORTED = 0x06

        fun advertiseError(code: Int): String = when (code) {
            AdvertiseCallback.ADVERTISE_FAILED_DATA_TOO_LARGE -> "data_too_large"
            AdvertiseCallback.ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "too_many_advertisers"
            AdvertiseCallback.ADVERTISE_FAILED_INTERNAL_ERROR -> "internal_error"
            AdvertiseCallback.ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "feature_unsupported"
            else -> "code_$code"
        }
    }
}
