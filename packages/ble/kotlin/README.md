# Fluxis BLE for Android (Kotlin)

Collector (POS) and payer (wallet) roles of the
[Fluxis BLE Handoff Protocol v3](../../../docs/ble-protocol.md) for Android 8.0+ (API 26).

| Artifact | Contents |
|---|---|
| `us.fluxis:fluxis-ble-android` | `FluxisBleCollector`, `FluxisBlePayer`, `FluxisBlePermissions` (AAR, minSdk 26) |
| `us.fluxis:fluxis-ble-core` | Wire format, crypto, `CollectorEngine` and `PayerSession` state machines (pure JVM, no Android) |

`fluxis-ble-android` depends on `fluxis-ble-core` and `kotlinx-coroutines-android`. It uses
only platform crypto (P-256, AES-GCM, HMAC-SHA256); there are no other dependencies.

## Install

Releases are published to GitHub Packages, which needs a GitHub token with `read:packages`
even for public packages:

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
        maven {
            url = uri("https://maven.pkg.github.com/fluxisus/fluxis-sdk")
            credentials {
                username = providers.gradleProperty("gpr.user").orNull ?: System.getenv("GITHUB_ACTOR")
                password = providers.gradleProperty("gpr.key").orNull ?: System.getenv("GITHUB_TOKEN")
            }
        }
    }
}

// app/build.gradle.kts
dependencies {
    implementation("us.fluxis:fluxis-ble-android:<version>")
}
```

## Collector (POS)

The collector advertises, serves the discovery record and delivers the token to the first
wallet that claims it. `start` returns immediately; follow progress through `state` (a
`StateFlow`) or a `Listener`.

```kotlin
class CheckoutActivity : AppCompatActivity() {
    private lateinit var collector: FluxisBleCollector

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        collector = FluxisBleCollector(this)

        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                collector.state.collect { s ->
                    when (s.phase) {
                        CollectorPhase.READY -> showHint("Hold the phone near the terminal")
                        CollectorPhase.CLAIMED, CollectorPhase.AWAITING_ACK -> showHint("Sending to wallet…")
                        CollectorPhase.DELIVERED -> showHint("Confirm the payment in your wallet")
                        CollectorPhase.EXPIRED -> offerRestart()
                        CollectorPhase.FAILED -> showQrOnly(reason = s.detail) // e.g. "bluetooth_off"
                        else -> Unit
                    }
                }
            }
        }
    }

    fun onPaymentRequestCreated(naspipToken: String) {
        if (!FluxisBlePermissions.hasAll(this, FluxisBleRole.COLLECTOR)) {
            requestPermissions(FluxisBlePermissions.missing(this, FluxisBleRole.COLLECTOR).toTypedArray(), 1)
            return
        }
        collector.start(
            token = naspipToken,                           // from Fluxis core-api
            amount = FluxisAmount.parse("12.50", "ARS"),   // hint for the wallet; null for open amount
            displayName = "Café Tero",                     // cut to 64 UTF-8 bytes
            ttlSeconds = 120,                              // max 300
        )
        // Keep the QR on screen as well: BLE is an extra channel, not a replacement.
        // Keep polling your backend for the payment status; DELIVERED only means the wallet got the token.
    }

    override fun onDestroy() {
        collector.release()
        super.onDestroy()
    }
}
```

From Java, `start(token, amount, displayName)` and `start(token, amount, displayName, ttl,
listener)` are both available, and `Listener` is a functional interface:

```java
collector.start(token, FluxisAmount.parse("12.50", "ARS"), "Café Tero", 120,
        state -> runOnUiThread(() -> render(state)));
```

Behaviour worth knowing:

- One session at a time. `start` replaces a running session; `stop()` ends it (`STOPPED`);
  `release()` also frees the worker thread.
- A failed attempt (wallet walked away, bad ACK, ABORT, timeout) re-arms the session: it goes
  back to `READY` and advertises again until `expiresAt`. Pass
  `Options(rearmOnFailure = false)` to fail instead.
- `FAILED` covers problems the collector can't recover from. `detail` holds a machine-readable
  reason, such as `server_failed:bluetooth_off`, `server_failed:bluetooth_unavailable`,
  `server_failed:missing_permission:<perms>`, `server_failed:advertising_unsupported`,
  `server_failed:open_server_failed` or `advertise_failed:too_many_advertisers`.
- Invalid input (an empty token, a token over 4067 bytes, a bad display name or TTL) throws
  synchronously from `start`.
- Callbacks and `state` updates come from an internal `HandlerThread`. `StateFlow` collectors
  run on whatever dispatcher you collect on.
- `Options(txPowerLevel = …)` takes `AdvertiseSettings.ADVERTISE_TX_POWER_*`. Medium (the
  default) keeps the range close to the counter.

### Clover and other targetSdk ≤ 30 apps

Android 12's `BLUETOOTH_ADVERTISE`/`BLUETOOTH_CONNECT` permissions only apply to apps that
*target* API 31+. A Clover app pinned to `targetSdkVersion 29` stays on the legacy model on
every device, including Android 13 devices such as the Clover Flex 4. `FluxisBlePermissions`
takes the device API level and the app's target into account:

| Device / app target | Collector needs at runtime | Payer needs at runtime |
|---|---|---|
| API ≥ 31 and target ≥ 31 | `BLUETOOTH_ADVERTISE`, `BLUETOOTH_CONNECT` | `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` |
| API 29–30 (e.g. PTA0010 on Android 10), legacy target | `ACCESS_FINE_LOCATION` | `ACCESS_FINE_LOCATION` |
| API ≥ 31 with target ≤ 30 (e.g. Flex 4 with a targetSdk 29 app) | nothing | `ACCESS_FINE_LOCATION` (target ≥ 29) or `ACCESS_COARSE_LOCATION` |
| API 26–28 | nothing | location, as above |

The library manifest declares `BLUETOOTH`, `BLUETOOTH_ADMIN` and the three API 31
permissions (`BLUETOOTH_SCAN` with `neverForLocation`). It does **not** declare location. If
your app lands in a row that needs location, declare it yourself:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

Location services (the system toggle) must also be on for legacy BLE scanning on many
devices. `FluxisBlePermissions.requiredFor(role, deviceSdk, targetSdk)` is a pure function if you
want to explain the request before showing the system dialog.

## Payer (wallet)

```kotlin
val payer = FluxisBlePayer(context)

// "Tap to pay": connect to the strongest collector nearby and take its token.
lifecycleScope.launch {
    try {
        val delivery = payer.claimNearest()
        val payment = walletApi.resolveNaspip(delivery.token)   // your backend / POST /naspip/read
        showConfirmation(payment.merchant, payment.amount)      // from the API, never from the record
    } catch (e: FluxisBlePayerException) {
        when (e.reason) {
            FluxisBlePayerException.Reason.BUSY -> toast("The POS is serving someone else, try again")
            FluxisBlePayerException.Reason.NOT_FOUND -> toast("No Fluxis POS nearby")
            FluxisBlePayerException.Reason.PERMISSION_DENIED -> askForBluetoothPermissions()
            else -> toast("Couldn't receive the payment (${e.reason})")
        }
    }
}

// Or let the user pick:
val candidates = payer.discover()                      // records read, expired ones hidden
showPicker(candidates.map { "${it.displayName} ${it.amount ?: ""}" })
val delivery = payer.claim(candidates[chosen])
```

| Call | What it does |
|---|---|
| `scan(): Flow<FluxisBleAdvertisement>` | Raw low-latency scan filtered by the Fluxis service UUID. Cancel the collecting coroutine to stop. |
| `discover(scanTimeoutMs = 4000, maxCandidates = 5)` | Scans, then reads the record of the strongest collectors. |
| `claim(candidate, timeoutMs = 15000)` | Connects, runs START/DATA/ACK and returns `FluxisBleDelivery(token, record, address)`. |
| `claimNearest(scanTimeoutMs = 6000, timeoutMs = 15000)` | Waits for the first collector, keeps the strongest seen over 0.8 s more, and claims it. |

Errors are `FluxisBlePayerException` with a `reason`: `BLUETOOTH_UNAVAILABLE`,
`BLUETOOTH_OFF`, `PERMISSION_DENIED`, `SCAN_FAILED`, `NOT_FOUND`, `CONNECTION_FAILED`, `BUSY`,
`REJECTED` (see `collectorError`), `EXPIRED`, `PROTOCOL_ERROR`, `DECRYPT_FAILED` or `TIMEOUT`.
Cancelling the coroutine cancels the operation and closes the connection.

Android limits apps to five scan starts per 30 seconds. Don't call `discover`/`claimNearest`
in a tight retry loop.

The record's `displayName` and `amount` are unauthenticated hints: any nearby device can
advertise a fake collector. Show the merchant and amount returned by the Fluxis API for the
token and have the user confirm them (see §8 of the spec).

## Protocol core without Android

`fluxis-ble-core` runs on any JVM: `DiscoveryRecord`, `FluxisAmount`, `Framing`/`Reassembler`,
`KeySchedule`, `PayerSession` and the `CollectorEngine` state machine. The engine is sans-IO:
you feed it GATT events and a clock, and it calls back through `CollectorIo`. The Android
collector is a thin adapter around it, and the engine tests run on a plain JVM.

## Development

```bash
cd packages/ble/kotlin
./gradlew :core:test                    # shared vectors + collector state machine (no Android SDK needed)
./gradlew :android:testDebugUnitTest :android:lintDebug :android:assembleRelease
```

The `:android` module is only included when an Android SDK is found (`ANDROID_HOME` or
`sdk.dir` in `local.properties`). `FLUXIS_BLE_VECTORS=/path/to/vectors.json` points the tests at
another vectors file.
