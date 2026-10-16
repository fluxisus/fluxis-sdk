# Fluxis BLE for iOS (Swift)

Payer (wallet) role of the
[Fluxis BLE Handoff Protocol v3](https://github.com/fluxisus/fluxis-sdk/blob/main/docs/ble-protocol.md)
for iOS 15+ and macOS 12+, on CoreBluetooth and CryptoKit.

| Library | Contents |
|---|---|
| `FluxisBLE` | `FluxisBLEPayer` (CoreBluetooth central). Re-exports `FluxisBLECore`. |
| `FluxisBLECore` | Wire format, crypto, `PayerSession` and the transport-independent `PayerFlow`. No CoreBluetooth; also builds on Linux with swift-crypto. |

There are no third-party dependencies on Apple platforms. On Linux the core uses
[swift-crypto](https://github.com/apple/swift-crypto), which has the same API as CryptoKit.

## Install

Swift Package Manager needs `Package.swift` at the repository root, so releases are mirrored
to `fluxisus/fluxis-ble-swift`:

```swift
// Package.swift
.package(url: "https://github.com/fluxisus/fluxis-ble-swift.git", from: "0.1.0"),
// target dependency:
.product(name: "FluxisBLE", package: "fluxis-ble-swift"),
```

In Xcode: File → Add Package Dependencies… and enter the same URL. To work against the
monorepo directly, add `packages/ble/swift` as a local package.

Add the Bluetooth usage string to your app's `Info.plist`. iOS shows it the first time the
payer runs:

```xml
<key>NSBluetoothAlwaysUsageDescription</key>
<string>Bluetooth is used to receive payment requests from nearby points of sale.</string>
```

## Payer (wallet)

```swift
import FluxisBLE

let payer = FluxisBLEPayer()

// "Tap to pay": connect to the strongest collector nearby and take its token.
func payNearby() async {
    do {
        let delivery = try await payer.claimNearest()
        let payment = try await walletAPI.resolveNaspip(delivery.token)  // your backend / POST /naspip/read
        showConfirmation(merchant: payment.merchant, amount: payment.amount)  // from the API, never from the record
    } catch let error as FluxisBLEPayerError {
        switch error.reason {
        case .busy: show("The POS is serving someone else, try again")
        case .notFound: show("No Fluxis POS nearby")
        case .bluetoothOff: show("Turn on Bluetooth")
        case .unauthorized: openSettings()
        case .cancelled: break
        default: show("Couldn't receive the payment (\(error.reason.rawValue))")
        }
    } catch {
        show("Unexpected error: \(error)")
    }
}

// Or let the user pick:
let candidates = try await payer.discover()    // records read, expired ones hidden
// candidates[i].displayName, candidates[i].amount?.description (e.g. "ARS 12.50"), .rssi
let delivery = try await payer.claim(candidates[chosen])
```

| Call | What it does |
|---|---|
| `discover(scanTimeout: 4, maxCandidates: 5)` | Scans for the Fluxis service, then reads the record of the strongest collectors. |
| `claim(_:timeout: 15)` | Connects, runs START/DATA/ACK and returns `FluxisBLEDelivery(token:record:)`. |
| `claimNearest(scanTimeout: 6, timeout: 15)` | Waits for the first collector, keeps the strongest seen over 0.8 s more, and claims it. |

- Errors are `FluxisBLEPayerError` with a `reason`: `bluetoothUnavailable`, `bluetoothOff`,
  `unauthorized`, `notFound`, `connectionFailed`, `busy`, `rejected` (see `collectorError`),
  `expired`, `protocolError`, `decryptFailed`, `timeout` or `cancelled`.
- Cancel the calling `Task` to abort; the connection is closed and the call throws `.cancelled`.
- `FluxisBLEPayer(options: .init(showPowerAlert: true))` lets iOS show its own "Turn on
  Bluetooth" alert. It's off by default so the wallet can show its own UI.
- Scanning works in the foreground. iOS throttles background scans and ignores
  duplicate-advertisement updates while backgrounded.

The record's `displayName` and `amount` are unauthenticated hints: any nearby device can
advertise a fake collector. Show the merchant and amount returned by the Fluxis API for the
token and have the user confirm them (§8 of the spec).

## Other transports and testing

`PayerFlow.deliver(over:)` runs the payer side of the protocol over any type that conforms to
`FluxisBLELink` (read the record, subscribe, write CONTROL frames, receive indications).
`FluxisBLEPayer` is the CoreBluetooth implementation. The unit tests drive the same flow
against an in-memory collector built from the shared test vectors.

## Collector on iOS

`FluxisBLECollector` is a scaffold that throws `FluxisBLECollectorError.notImplemented`. iOS
only advertises a service UUID while the app is in the foreground (in the background the UUID
moves to the "overflow area", which Android scanners don't match), so POS devices use the
Android collector in `us.fluxis:fluxis-ble-android`.

## Development

```bash
cd packages/ble/swift
swift build
swift test      # shared vectors + PayerFlow scenarios; runs on macOS and on Linux
```

On Linux only `FluxisBLECore` is compiled (the CoreBluetooth sources are behind
`#if canImport(CoreBluetooth)`). The tests find `packages/ble/test-vectors/vectors.json` by
walking up from the test file; set `FLUXIS_BLE_VECTORS` to use another file.
