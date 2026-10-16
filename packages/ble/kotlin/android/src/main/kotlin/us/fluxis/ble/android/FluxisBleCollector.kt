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
import android.bluetooth.BluetoothStatusCodes
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
import us.fluxis.ble.core.toHex

/** GATT server work items, executed strictly in order with one indication in flight. */
private sealed class Op {
    class Indicate(val peer: String, val frame: ByteArray) : Op()
    class Disconnect(val peer: String) : Op()
    object Close : Op()
}

/** Snapshot of the collector, published on [FluxisBleCollector.state]. */
public data class CollectorState(
    val phase: CollectorPhase,
    /** Why the phase changed, e.g. `bad_ack`, `peer_disconnected`, `missing_permission:…`. */
    val detail: String? = null,
    /** Hex session id of the current session, for logs and support. */
    val sessionId: String? = null,
    val expiresAtEpochSeconds: Long? = null,
) {
    val isTerminal: Boolean get() = phase.isTerminal
}

/**
 * Collector (POS) role: advertises, serves the discovery record and delivers the NASPIP token
 * to the first payer that claims it (docs/ble-protocol.md §6).
 *
 * ```
 * val collector = FluxisBleCollector(context)
 * collector.start(token = naspipToken, amount = FluxisAmount.parse("12.50", "ARS"), displayName = "Café Tero")
 * collector.state.collect { if (it.phase == CollectorPhase.DELIVERED) startPollingBackend() }
 * ```
 *
 * Delivery only means the wallet received the token; poll your backend for the payment status.
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
        /** Go back to `ready` after a failed attempt instead of failing the session. */
        public val rearmOnFailure: Boolean = true,
        /** Debug log sink; never receives the token or key material. */
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
     * Starts a session for [token] (the NASPIP token from Fluxis core-api). [amount] is shown
     * to wallets as a hint (null for open-amount PoS). [displayName] is cut to 64 UTF-8 bytes.
     * Throws [IllegalArgumentException] or `FluxisBleProtocolException` for invalid input;
     * runtime Bluetooth problems surface as [CollectorPhase.FAILED] with a [CollectorState.detail].
     */
    @JvmOverloads
    public fun start(
        token: String,
        amount: FluxisAmount?,
        displayName: String,
        ttlSeconds: Int = FluxisBle.DEFAULT_TTL_SECONDS,
        listener: Listener? = null,
    ) {
        val config = CollectorConfig(token, amount, displayName, ttlSeconds, options.rearmOnFailure)
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
        private val subscribed = HashSet<String>()
        private val queue = ArrayDeque<Op>()
        private var inFlight: Op.Indicate? = null
        private var closed = false
        private val engine = CollectorEngine(config, this)
        private val sessionHex = engine.record.sessionId.toHex()
        private val tick = Runnable { onTick() }
        private val watchdog = Runnable { onIndicationDone(inFlight?.peer ?: return@Runnable, false) }

        private val recordChar = BluetoothGattCharacteristic(
            FluxisBle.RECORD_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ,
        )
        private val controlChar = BluetoothGattCharacteristic(
            FluxisBle.CONTROL_UUID,
            BluetoothGattCharacteristic.PROPERTY_WRITE,
            BluetoothGattCharacteristic.PERMISSION_WRITE,
        )
        private val dataChar = BluetoothGattCharacteristic(
            FluxisBle.DATA_UUID,
            BluetoothGattCharacteristic.PROPERTY_INDICATE,
            0,
        ).apply {
            addDescriptor(
                BluetoothGattDescriptor(
                    FluxisBle.CCCD_UUID,
                    BluetoothGattDescriptor.PERMISSION_READ or BluetoothGattDescriptor.PERMISSION_WRITE,
                ),
            )
        }

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
                service.addCharacteristic(controlChar)
                service.addCharacteristic(dataChar)
                if (!s.addService(service)) engine.onServerFailed("add_service_failed")
            }
            scheduleTick()
        }

        /** Stops and closes synchronously, so a replacement session never overlaps this server. */
        fun stop() {
            engine.stop()
            queue.removeAll { it is Op.Indicate }
            handler.removeCallbacks(watchdog)
            inFlight = null
            pump()
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
                    handler.post { if (advertiseCallback === this) engine.onAdvertisingStarted().also { scheduleTick() } }
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
                        scheduleTick()
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

        override fun indicate(peer: String, frame: ByteArray) {
            queue.addLast(Op.Indicate(peer, frame))
            pump()
        }

        override fun disconnect(peer: String) {
            queue.addLast(Op.Disconnect(peer))
            pump()
        }

        override fun closeServer() {
            queue.addLast(Op.Close)
            pump()
        }

        override fun onPhaseChanged(phase: CollectorPhase, detail: String?) {
            log("phase=${phase.wire}${detail?.let { " ($it)" } ?: ""} session=$sessionHex")
            val s = CollectorState(phase, detail, sessionHex, engine.record.expiresAtEpochSeconds)
            mutableState.value = s
            listener?.onStateChanged(s)
        }

        // ── Op queue: indications strictly one at a time, disconnects/close in order ──

        private fun pump() {
            while (inFlight == null && queue.isNotEmpty()) {
                when (val op = queue.removeFirst()) {
                    is Op.Indicate -> sendIndication(op)
                    is Op.Disconnect -> devices[op.peer]?.let { d -> guarded("disconnect") { server?.cancelConnection(d) } }
                    Op.Close -> closeNow()
                }
            }
        }

        private fun sendIndication(op: Op.Indicate) {
            val device = devices[op.peer]
            val s = server
            if (device == null || s == null || op.peer !in subscribed) {
                engine.onIndicationSent(op.peer, false)
                return
            }
            inFlight = op
            handler.postDelayed(watchdog, FluxisBle.T_FRAME_MS)
            val ok = try {
                if (Build.VERSION.SDK_INT >= 33) {
                    s.notifyCharacteristicChanged(device, dataChar, true, op.frame) == BluetoothStatusCodes.SUCCESS
                } else {
                    indicateLegacy(s, device, op.frame)
                }
            } catch (e: SecurityException) {
                false
            }
            if (!ok) onIndicationDone(op.peer, false)
        }

        @Suppress("DEPRECATION")
        private fun indicateLegacy(s: BluetoothGattServer, device: BluetoothDevice, frame: ByteArray): Boolean {
            dataChar.value = frame
            return s.notifyCharacteristicChanged(device, dataChar, true)
        }

        private fun onIndicationDone(peer: String, success: Boolean) {
            val op = inFlight ?: return
            if (op.peer != peer) return
            handler.removeCallbacks(watchdog)
            inFlight = null
            engine.onIndicationSent(peer, success)
            pump()
            scheduleTick()
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
            queue.clear()
            handler.removeCallbacks(watchdog)
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
                    subscribed.remove(id)
                    queue.removeAll { it is Op.Indicate && it.peer == id }
                    engine.onDisconnected(id)
                    onIndicationDone(id, false)
                }
            }

            override fun onMtuChanged(device: BluetoothDevice, mtu: Int) = post { engine.onMtuChanged(device.address, mtu) }

            override fun onCharacteristicReadRequest(
                device: BluetoothDevice,
                requestId: Int,
                offset: Int,
                characteristic: BluetoothGattCharacteristic,
            ) = post {
                devices.getOrPut(device.address) { device }
                if (characteristic.uuid != FluxisBle.RECORD_UUID) {
                    respond(device, requestId, BluetoothGatt.GATT_READ_NOT_PERMITTED, offset, null)
                    return@post
                }
                val value = engine.readRecord(device.address, offset)
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
                devices.getOrPut(device.address) { device }
                val status = when {
                    characteristic.uuid != FluxisBle.CONTROL_UUID -> BluetoothGatt.GATT_WRITE_NOT_PERMITTED
                    preparedWrite -> GATT_REQUEST_NOT_SUPPORTED
                    offset != 0 -> BluetoothGatt.GATT_INVALID_OFFSET
                    else -> BluetoothGatt.GATT_SUCCESS
                }
                if (responseNeeded) respond(device, requestId, status, offset, null)
                if (status == BluetoothGatt.GATT_SUCCESS) engine.onControlWrite(device.address, value ?: ByteArray(0))
            }

            override fun onExecuteWrite(device: BluetoothDevice, requestId: Int, execute: Boolean) = post {
                respond(device, requestId, GATT_REQUEST_NOT_SUPPORTED, 0, null)
            }

            override fun onDescriptorReadRequest(
                device: BluetoothDevice,
                requestId: Int,
                offset: Int,
                descriptor: BluetoothGattDescriptor,
            ) = post {
                val on = device.address in subscribed
                val value = if (on) BluetoothGattDescriptor.ENABLE_INDICATION_VALUE else BluetoothGattDescriptor.DISABLE_NOTIFICATION_VALUE
                respond(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, value)
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
                devices.getOrPut(device.address) { device }
                val isCccd = descriptor.uuid == FluxisBle.CCCD_UUID && descriptor.characteristic?.uuid == FluxisBle.DATA_UUID
                if (!isCccd || preparedWrite) {
                    if (responseNeeded) respond(device, requestId, BluetoothGatt.GATT_WRITE_NOT_PERMITTED, offset, null)
                    return@post
                }
                val enabled = value != null && value.isNotEmpty() && (value[0].toInt() and 0x02) != 0
                if (enabled) subscribed += device.address else subscribed -= device.address
                if (responseNeeded) respond(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, null)
                engine.onSubscriptionChanged(device.address, enabled)
            }

            override fun onNotificationSent(device: BluetoothDevice, status: Int) = post {
                onIndicationDone(device.address, status == BluetoothGatt.GATT_SUCCESS)
            }
        }

        private fun post(block: () -> Unit) {
            handler.post {
                if (closed && server == null) return@post
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
