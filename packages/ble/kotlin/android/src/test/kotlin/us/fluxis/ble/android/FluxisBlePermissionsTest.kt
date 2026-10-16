package us.fluxis.ble.android

import org.junit.Test
import kotlin.test.assertEquals

private const val FINE = "android.permission.ACCESS_FINE_LOCATION"
private const val COARSE = "android.permission.ACCESS_COARSE_LOCATION"
private const val ADVERTISE = "android.permission.BLUETOOTH_ADVERTISE"
private const val CONNECT = "android.permission.BLUETOOTH_CONNECT"
private const val SCAN = "android.permission.BLUETOOTH_SCAN"

class FluxisBlePermissionsTest {
    private fun collector(device: Int, target: Int) = FluxisBlePermissions.requiredFor(FluxisBleRole.COLLECTOR, device, target)
    private fun payer(device: Int, target: Int) = FluxisBlePermissions.requiredFor(FluxisBleRole.PAYER, device, target)

    @Test
    fun cloverPta0010Android10Target29NeedsLocation() = assertEquals(listOf(FINE), collector(29, 29))

    @Test
    fun cloverFlex4Android13Target29UsesLegacyModel() = assertEquals(emptyList(), collector(33, 29))

    @Test
    fun modernCollectorNeedsAdvertiseAndConnect() = assertEquals(listOf(ADVERTISE, CONNECT), collector(34, 34))

    @Test
    fun android8CollectorNeedsNothingAtRuntime() = assertEquals(emptyList(), collector(26, 29))

    @Test
    fun modernPayerNeedsScanAndConnect() = assertEquals(listOf(SCAN, CONNECT), payer(31, 31))

    @Test
    fun legacyPayerNeedsLocation() {
        assertEquals(listOf(FINE), payer(30, 30))
        assertEquals(listOf(FINE), payer(34, 30))
        assertEquals(listOf(COARSE), payer(26, 28))
    }

    @Test
    fun newPermissionsOnlyApplyWhenTargetingApi31() = assertEquals(listOf(FINE), payer(33, 30))
}
