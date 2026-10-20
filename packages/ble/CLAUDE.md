# CLAUDE.md — Fluxis BLE SDKs

> Conventions for `packages/ble/` (Kotlin/Android and Swift). These SDKs don't call the Fluxis
> REST API, so most of the root `CLAUDE.md` (auth, endpoints) doesn't apply. The NASPIP rules
> still do: never decode tokens locally.

## Source of truth

`docs/ble-protocol.md` is normative. Change it first, then, **in the same PR**:

1. `test-vectors/reference/fluxis_ble_ref.py` (the Python reference implementation);
2. `vectors.json`: `cd test-vectors/reference && python3 generate_vectors.py`;
3. every SDK, until `./gradlew :core:test` and `swift test` pass against the new vectors.

Never edit `vectors.json` by hand; CI runs `generate_vectors.py --check`. Once an SDK version
has been released, any wire-format change bumps the protocol version byte (the preview-only
redesign replaced the unreleased claim draft of v3 in place). Versions `1` and `2` are
reserved for the prototype and stay rejected.

## Layout

```
packages/ble/
├── test-vectors/                 # vectors.json + reference/ (Python, `cryptography`)
├── kotlin/                       # Gradle 8.11, AGP 8.7, Kotlin 2.1, explicitApi
│   ├── core/                     # us.fluxis.ble.core — pure JVM, no Android imports
│   │   ├── DiscoveryRecord, PreviewValue, FluxisAmount
│   │   └── CollectorEngine       # sans-IO collector: offset reads, T_IDLE (spec §6)
│   └── android/                  # us.fluxis.ble.android — thin adapters over core
│       ├── FluxisBleCollector    # GATT server + advertiser on a HandlerThread
│       ├── FluxisBlePayer        # central; coroutines
│       ├── GattClient            # internal suspend wrapper over BluetoothGatt
│       └── FluxisBlePermissions  # device API × targetSdk decision table
└── swift/                        # SwiftPM, tools 5.9, iOS 15 / macOS 12
    ├── Sources/FluxisBLECore/    # pure Swift, no dependencies
    │   └── Preview               # PreviewValue, FluxisBLEPreview, PreviewFlow over FluxisBLEReadLink
    └── Sources/FluxisBLE/        # CoreBluetooth, all behind #if canImport(CoreBluetooth)
```

## Rules

- **Host-agnostic.** No dependency on Fluxis app, Tero or POS code, and no Fluxis API calls. The
  collector takes a token; the payer returns a preview (token or POS id).
- **Read-only link.** No claim, lock or writable attribute: every payer can read the active
  sale, and payment happens through the API. Don't reintroduce per-peer protocol state.
- **Sans-IO cores.** Protocol logic lives in `core` / `FluxisBLECore` and is tested without
  Bluetooth. Platform layers only translate callbacks into engine calls. A bug that can be
  reproduced in a core test gets one.
- **Error strings are API.** `ProtocolErrorCode.wire` and `FluxisBLEProtocolError.rawValue`
  must equal the error strings in `vectors.json`. Add a code to the spec, the reference and
  both SDKs together.
- **Android API levels.** minSdk 26. Clover PTA0010 runs Android 10, and Clover apps may target
  SDK 29. Anything newer than API 26 needs a `Build.VERSION.SDK_INT` guard; lint makes `NewApi`,
  `InlinedApi` and `MissingPermission` fatal. Don't use `BigInteger.TWO` or other APIs that
  the Android 8 runtime lacks.
- **Permissions.** Wrap every Bluetooth call in a `SecurityException` guard and report it as a
  state or exception. The library manifest must not declare location permissions.
- **Coroutines.** Use `withTimeoutOrNull` rather than `withTimeout` inside library code, so a
  `TimeoutCancellationException` never leaks as cancellation. Don't swallow
  `CancellationException`.
- **Swift.** Keep the package warning-free under `-strict-concurrency=complete`. The
  CoreBluetooth layer confines state to one serial queue and bridges callbacks with
  `FluxisBLEPending`.
- **Secrets.** Never log tokens. The collector's `logger` option only receives phases, sizes and
  reasons; `description`/`toString` of previews print the token length, not the token.

## Testing

```bash
cd packages/ble/test-vectors/reference && python3 generate_vectors.py --check
cd packages/ble/kotlin && ./gradlew :core:test :android:testDebugUnitTest :android:lintDebug
cd packages/ble/swift && swift test
```

Real BLE behaviour (advertising, MTU, long reads, iOS ↔ Android interop) can only be checked
on devices; see the manual test plan in `openspec/changes/ble-payment-sdk/tasks.md`.

## Releasing

Components `ble-kotlin` and `ble-swift` in `release-please-config.json`, both `simple` with
`version.txt`. Commit scopes: `ble` (spec and vectors, which bump both), `ble-kotlin`,
`ble-swift`. Kotlin publishes to GitHub Packages. Swift is mirrored to
`fluxisus/fluxis-ble-swift` (needs the `BLE_SWIFT_MIRROR_TOKEN` secret).
