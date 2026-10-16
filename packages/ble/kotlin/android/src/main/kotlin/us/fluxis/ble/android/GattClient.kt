package us.fluxis.ble.android

import android.annotation.SuppressLint
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothGatt
import android.bluetooth.BluetoothGattCallback
import android.bluetooth.BluetoothGattCharacteristic
import android.bluetooth.BluetoothGattDescriptor
import android.bluetooth.BluetoothGattService
import android.bluetooth.BluetoothProfile
import android.bluetooth.BluetoothStatusCodes
import android.content.Context
import android.os.Build
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withTimeoutOrNull
import us.fluxis.ble.core.FluxisBle

/**
 * Minimal coroutine wrapper over [BluetoothGatt]: one outstanding operation at a time, as the
 * Android stack requires, with indications delivered on [indications].
 */
@SuppressLint("MissingPermission")
internal class GattClient(private val context: Context, private val device: BluetoothDevice) {
    private var gatt: BluetoothGatt? = null
    private val mutex = Mutex()

    @Volatile private var pending: CompletableDeferred<Any?>? = null
    private val connected = CompletableDeferred<Unit>()

    @Volatile var mtu: Int = FluxisBle.DEFAULT_MTU
        private set

    val indications = Channel<ByteArray>(Channel.UNLIMITED)

    private val callback = object : BluetoothGattCallback() {
        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
            if (newState == BluetoothProfile.STATE_CONNECTED && status == BluetoothGatt.GATT_SUCCESS) {
                connected.complete(Unit)
            } else if (newState == BluetoothProfile.STATE_DISCONNECTED || status != BluetoothGatt.GATT_SUCCESS) {
                val error = GattException("disconnected (status $status)", status)
                connected.completeExceptionally(error)
                pending?.completeExceptionally(error)
                indications.close(error)
            }
        }

        override fun onMtuChanged(g: BluetoothGatt, newMtu: Int, status: Int) {
            if (status == BluetoothGatt.GATT_SUCCESS) mtu = maxOf(FluxisBle.DEFAULT_MTU, newMtu)
            pending?.complete(mtu)
        }

        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) = finish(status, null)

        override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray, status: Int) =
            finish(status, value)

        @Deprecated("Called below API 33")
        @Suppress("DEPRECATION")
        override fun onCharacteristicRead(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) =
            finish(status, c.value?.copyOf())

        override fun onCharacteristicWrite(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) = finish(status, null)

        override fun onDescriptorWrite(g: BluetoothGatt, d: BluetoothGattDescriptor, status: Int) = finish(status, null)

        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray) {
            if (c.uuid == FluxisBle.DATA_UUID) indications.trySend(value.copyOf())
        }

        @Deprecated("Called below API 33")
        @Suppress("DEPRECATION")
        override fun onCharacteristicChanged(g: BluetoothGatt, c: BluetoothGattCharacteristic) {
            if (c.uuid == FluxisBle.DATA_UUID) c.value?.let { indications.trySend(it.copyOf()) }
        }

        private fun finish(status: Int, value: Any?) {
            val p = pending ?: return
            if (status == BluetoothGatt.GATT_SUCCESS) p.complete(value) else p.completeExceptionally(GattException("GATT status $status", status))
        }
    }

    suspend fun connect(timeoutMs: Long) {
        gatt = device.connectGatt(context, false, callback, BluetoothDevice.TRANSPORT_LE)
            ?: throw GattException("connectGatt returned null", -1)
        withTimeoutOrNull(timeoutMs) { connected.await() } ?: throw GattException("connect timed out", -1)
        gatt?.requestConnectionPriority(BluetoothGatt.CONNECTION_PRIORITY_HIGH)
    }

    suspend fun requestMtu(desired: Int): Int = op { g -> g.requestMtu(desired) } as Int

    suspend fun discover(): BluetoothGattService {
        op { g -> g.discoverServices() }
        return gatt?.getService(FluxisBle.SERVICE_UUID) ?: throw GattException("Fluxis service not found", -1)
    }

    suspend fun read(c: BluetoothGattCharacteristic): ByteArray =
        op { g -> g.readCharacteristic(c) } as ByteArray? ?: ByteArray(0)

    suspend fun enableIndications(c: BluetoothGattCharacteristic) {
        val g = gatt ?: throw GattException("not connected", -1)
        if (!g.setCharacteristicNotification(c, true)) throw GattException("setCharacteristicNotification failed", -1)
        val cccd = c.getDescriptor(FluxisBle.CCCD_UUID) ?: throw GattException("DATA has no CCCD", -1)
        op { gg ->
            if (Build.VERSION.SDK_INT >= 33) {
                gg.writeDescriptor(cccd, BluetoothGattDescriptor.ENABLE_INDICATION_VALUE) == BluetoothStatusCodes.SUCCESS
            } else {
                writeDescriptorLegacy(gg, cccd)
            }
        }
    }

    suspend fun write(c: BluetoothGattCharacteristic, value: ByteArray) {
        op { g ->
            if (Build.VERSION.SDK_INT >= 33) {
                g.writeCharacteristic(c, value, BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT) == BluetoothStatusCodes.SUCCESS
            } else {
                writeCharacteristicLegacy(g, c, value)
            }
        }
    }

    fun close() {
        val g = gatt ?: return
        gatt = null
        runCatching { g.disconnect() }
        runCatching { g.close() }
        indications.close()
        pending?.cancel()
    }

    private suspend fun op(start: (BluetoothGatt) -> Boolean): Any? = mutex.withLock {
        val g = gatt ?: throw GattException("not connected", -1)
        val d = CompletableDeferred<Any?>()
        pending = d
        try {
            if (!start(g)) throw GattException("GATT operation rejected by the stack", -1)
            // withTimeoutOrNull + an explicit sentinel: a leaked TimeoutCancellationException
            // would look like cancellation of the caller's coroutine.
            val result = withTimeoutOrNull(OP_TIMEOUT_MS) { Result.success(d.await()) }
                ?: throw GattException("GATT operation timed out", -1)
            result.getOrNull()
        } finally {
            pending = null
        }
    }

    @Suppress("DEPRECATION")
    private fun writeDescriptorLegacy(g: BluetoothGatt, d: BluetoothGattDescriptor): Boolean {
        d.value = BluetoothGattDescriptor.ENABLE_INDICATION_VALUE
        return g.writeDescriptor(d)
    }

    @Suppress("DEPRECATION")
    private fun writeCharacteristicLegacy(g: BluetoothGatt, c: BluetoothGattCharacteristic, value: ByteArray): Boolean {
        c.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
        c.value = value
        return g.writeCharacteristic(c)
    }

    private companion object {
        const val OP_TIMEOUT_MS = 5_000L
    }
}

internal class GattException(message: String, val status: Int) : Exception(message)
