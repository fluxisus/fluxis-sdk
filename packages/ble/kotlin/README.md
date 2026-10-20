# Fluxis BLE for Android (Kotlin)

Collector (POS) and payer (wallet) roles of the
[Fluxis BLE Protocol v3 (preview only)](../../../docs/ble-protocol.md) for Android 8.0+ (API 26).

| Artifact | Contents |
|---|---|
| `us.fluxis:fluxis-ble-android` | `FluxisBleCollector`, `FluxisBlePayer`, `FluxisBlePermissions` (AAR, minSdk 26) |
| `us.fluxis:fluxis-ble-core` | Wire format (`DiscoveryRecord`, `PreviewValue`, `FluxisAmount`) and the `CollectorEngine` state machine (pure JVM, no Android) |

`fluxis-ble-android` depends on `fluxis-ble-core` and `kotlinx-coroutines-android`; there are
no other dependencies.

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

The collector advertises and serves `RECORD` and `PREVIEW` (the sale's NASPIP token) to every
wallet nearby until you stop it. Nobody can claim or lock it. `start` returns immediately;
follow it through `state` (a `StateFlow`) or a `Listener`.

```kotlin
class CheckoutActivity : ComponentActivity() {
    private val collector by lazy { FluxisBleCollector(this) }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                collector.state.collect { s ->
                    when (s.phase) {
                        CollectorPhase.ADVERTISING -> showPulse()          // wallets nearby can see the sale
                        CollectorPhase.FAILED -> showQrOnly(s.detail)      // e.g. bluetooth_off, missing_permission:…
                        else -> Unit
                    }
                }
            }
        }
    }

    fun onPaymentIntention(token: String, posId: UUID) {
        collector.start(
            token = token,                                 // NASPIP token from core-api
            amount = FluxisAmount.parse("12.50", "ARS"),   // hint; null for open amount
            displayName = "Café Tero",                     // hint; cut to 64 UTF-8 bytes
            posId = posId,                                 // published only if the token is > 494 bytes
        )
        // Payment status comes from your backend: poll it, and stop() when paid/cancelled/expired.
    }

    override fun onDestroy() {
        collector.release()
        super.onDestroy()
    }
}
```

From Java, `start(token, amount, displayName)` and `start(token, amount, displayName, posId,
listener)` are available:

```java
collector.start(token, FluxisAmount.parse("12.50", "ARS"), "Café Tero", posId,
    state -> Log.d("POS", state.getPhase().getWire()));
```

- Phases: `IDLE` → `PREPARING` → `ADVERTISING` → `STOPPED` (by `stop()`) or `FAILED`.
- One session at a time. `start` replaces a running session; `stop()` ends it; `release()`
  also frees the worker thread. There is no TTL: the session runs until you stop it.
- `CollectorState` also carries `sessionId` (hex), `previewBytes`, `previewKind` (`naspip` or
  `pos_id`) and `previewReads` (complete PREVIEW reads, for diagnostics only). The token is
  never logged.
- Invalid input (an empty token, a token over 494 bytes without `posId`, a bad display name)
  throws synchronously from `start`.
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

// "Hold the phone near the POS": read the strongest collector's active sale.
lifecycleScope.launch {
    try {
        val preview = payer.readNearestPreview()
        val sale = when (val c = preview.content) {
            is PreviewContent.Naspip -> walletApi.readQr(c.token)          // POST /public/qr/read → merchant + checkout URL
            is PreviewContent.PosId -> walletApi.checkoutForPos(c.posId)   // GET /public/checkout/pos/{posId}
        }
        showConfirmation(sale.merchant, sale.amount)   // from the API, never from preview.record
        // On "Pay": re-fetch the payment request, check it is still pending, then sign and pay.
    } catch (e: FluxisBlePayerException) {
        when (e.reason) {
            FluxisBlePayerException.Reason.NOT_FOUND -> toast("No Fluxis POS nearby")
            FluxisBlePayerException.Reason.NOT_SUPPORTED -> toast("This POS doesn't publish its sale; scan the QR")
            else -> toast("Bluetooth error: ${e.message}")
        }
    }
}

// Or let the user pick among several POS:
val candidates = payer.discover()                      // RECORD read: name + amount hints, RSSI
showPicker(candidates)                                 // candidate.displayName, candidate.amount, candidate.rssi
val preview = payer.readPreview(candidates[chosen])
```

| Call | What it does |
|---|---|
| `scan()` | `Flow` of advertisements (service UUID filter, low latency). |
| `discover(scanTimeoutMs = 4000, maxCandidates = 5)` | Scans, then reads `RECORD` from the strongest collectors. |
| `readPreview(candidate, timeoutMs = 6000)` | Short connection: MTU 517, reads `RECORD` and `PREVIEW` (long read), disconnects, checks the session ids match. |
| `readNearestPreview(scanTimeoutMs = 6000, timeoutMs = 6000)` | Waits for the first collector, keeps the strongest seen over 0.8 s more, and reads its preview. |

`FluxisBlePreview` has `record`, `sessionId`, `content` (`PreviewContent.Naspip(token)` or
`PreviewContent.PosId(posId)`), `address` and `rssi`, plus `token`/`posId` shortcuts. Errors
are `FluxisBlePayerException` with a `reason`: `BLUETOOTH_UNAVAILABLE`, `BLUETOOTH_OFF`,
`PERMISSION_DENIED`, `SCAN_FAILED`, `NOT_FOUND`, `CONNECTION_FAILED`, `NOT_SUPPORTED`,
`INVALID` or `TIMEOUT`. Cancelling the coroutine cancels the operation and closes the
connection.

Android limits apps to five scan starts per 30 seconds. Don't call `discover`/`readNearestPreview`
in a tight retry loop.

The preview is public, like the QR on the POS screen, and the record fields are
unauthenticated. Show the merchant from `POST /public/qr/read` and the amount from
`GET /public/checkout/pos/{posId}`, make the merchant name prominent (a fake collector is the
BLE version of a swapped QR sticker), and re-check that the request is still pending right
before signing (see §7–8 of the spec).

## Protocol core without Android

`fluxis-ble-core` runs on any JVM: `DiscoveryRecord`, `PreviewValue`, `FluxisAmount` and the
`CollectorEngine` state machine. The engine is sans-IO: you feed it GATT events (connections,
offset reads) and a clock, and it calls back through `CollectorIo`. The Android
collector is a thin adapter around it, and the engine tests run on a plain JVM.

## Development

```bash
cd packages/ble/kotlin
./gradlew :core:test                    # shared vectors + collector engine (no Android SDK needed)
./gradlew :android:testDebugUnitTest :android:lintDebug :android:assembleRelease
```

The `:android` module is only included when an Android SDK is found (`ANDROID_HOME` or
`sdk.dir` in `local.properties`). `FLUXIS_BLE_VECTORS=/path/to/vectors.json` points the tests at
another vectors file.
