package us.fluxis.ble.android

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Process

public enum class FluxisBleRole { COLLECTOR, PAYER }

/**
 * Runtime permissions each role needs. The answer depends on the device API level *and* the
 * host app's `targetSdkVersion`, because Android 12's `BLUETOOTH_*` runtime permissions only
 * apply to apps targeting API 31+. Apps targeting ≤ 30 (for example a Clover app pinned to
 * targetSdk 29) keep the legacy model on every device:
 *
 * | Model | Collector | Payer |
 * |---|---|---|
 * | device ≥ 31 and target ≥ 31 | `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT` | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` |
 * | legacy, device API 29–30 | `ACCESS_FINE_LOCATION` | location¹ |
 * | legacy, device ≥ 31 (target ≤ 30) | none at runtime | location¹ |
 * | legacy, device API 26–28 | none at runtime | location¹ |
 *
 * ¹ `ACCESS_FINE_LOCATION` when the app targets ≥ 29, otherwise `ACCESS_COARSE_LOCATION`.
 *
 * Legacy `BLUETOOTH` / `BLUETOOTH_ADMIN` are install-time permissions declared by this
 * library's manifest. Location permissions are *not* declared by the library; host apps that
 * fall into a row needing them must declare them (see README). Collectors ask for location on
 * Android 10/11 because some POS builds refuse to advertise or host a GATT server without it.
 */
public object FluxisBlePermissions {
    @JvmStatic
    public fun required(context: Context, role: FluxisBleRole): List<String> =
        requiredFor(role, Build.VERSION.SDK_INT, context.applicationInfo.targetSdkVersion)

    @JvmStatic
    public fun missing(context: Context, role: FluxisBleRole): List<String> =
        required(context, role).filter {
            context.checkPermission(it, Process.myPid(), Process.myUid()) != PackageManager.PERMISSION_GRANTED
        }

    @JvmStatic
    public fun hasAll(context: Context, role: FluxisBleRole): Boolean = missing(context, role).isEmpty()

    /** Pure decision table; exposed for tests and for apps that want to explain the request. */
    @JvmStatic
    public fun requiredFor(role: FluxisBleRole, deviceSdk: Int, targetSdk: Int): List<String> {
        if (deviceSdk >= 31 && targetSdk >= 31) {
            return when (role) {
                FluxisBleRole.COLLECTOR -> listOf(BLUETOOTH_ADVERTISE, BLUETOOTH_CONNECT)
                FluxisBleRole.PAYER -> listOf(BLUETOOTH_SCAN, BLUETOOTH_CONNECT)
            }
        }
        return when (role) {
            FluxisBleRole.COLLECTOR ->
                if (deviceSdk in 29..30) listOf(Manifest.permission.ACCESS_FINE_LOCATION) else emptyList()
            FluxisBleRole.PAYER ->
                if (targetSdk >= 29) {
                    listOf(Manifest.permission.ACCESS_FINE_LOCATION)
                } else {
                    listOf(Manifest.permission.ACCESS_COARSE_LOCATION)
                }
        }
    }

    // String literals instead of Manifest.permission.* so the library compiles and lints cleanly
    // without referencing API 31 fields from code that runs on API 26.
    private const val BLUETOOTH_ADVERTISE = "android.permission.BLUETOOTH_ADVERTISE"
    private const val BLUETOOTH_CONNECT = "android.permission.BLUETOOTH_CONNECT"
    private const val BLUETOOTH_SCAN = "android.permission.BLUETOOTH_SCAN"
}
