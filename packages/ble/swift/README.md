# Fluxis BLE for iOS (Swift)

Payer (wallet) role of the
[Fluxis BLE Protocol v3 (preview only)](https://github.com/fluxisus/fluxis-sdk/blob/main/docs/ble-protocol.md)
for iOS 15+ and macOS 12+, on CoreBluetooth.

| Library | Contents |
|---|---|
| `FluxisBLE` | `FluxisBLEPayer` (CoreBluetooth central). Re-exports `FluxisBLECore`. |
| `FluxisBLECore` | Wire format (`DiscoveryRecord`, `PreviewValue`, `FluxisAmount`), `FluxisBLEPreview` and the transport-independent `PreviewFlow`. No CoreBluetooth; also builds on Linux. |

There are no dependencies.

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
<string>Bluetooth is used to show the sale of a nearby point of sale.</string>
```

## Payer (wallet)

```swift
import FluxisBLE

let payer = FluxisBLEPayer()

func previewNearestSale() async {
    do {
        let preview = try await payer.readNearestPreview()
        let sale: Sale
        switch preview.content {
        case .naspip(let token): sale = try await walletAPI.readQR(token)        // POST /public/qr/read → merchant + checkout URL
        case .posId(let posId):  sale = try await walletAPI.checkout(posId)      // GET /public/checkout/pos/{posId}
        }
        showConfirmation(merchant: sale.merchant, amount: sale.amount)           // from the API, never preview.record
        // On "Pay": re-fetch the payment request, check it is still pending, then sign and pay.
    } catch let error as FluxisBLEPayerError {
        switch error.reason {
        case .notFound: show("No Fluxis POS nearby")
        case .notSupported: show("This POS doesn't publish its sale; scan the QR")
        case .bluetoothOff: show("Turn on Bluetooth")
        default: show("Bluetooth error: \(error.message)")
        }
    } catch {}
}

// Or let the user pick among several POS:
let candidates = try await payer.discover()     // RECORD read: displayName + amount hints, rssi
let preview = try await payer.readPreview(candidates[chosen])
```

| Call | What it does |
|---|---|
| `discover(scanTimeout: 4, maxCandidates: 5)` | Scans, then reads `RECORD` from the strongest collectors; returns `[FluxisBLECandidate]`. |
| `readPreview(_:timeout: 6)` | Short connection: reads `RECORD` and `PREVIEW` (CoreBluetooth does the long read), disconnects, checks the session ids match. |
| `readNearestPreview(scanTimeout: 6, timeout: 6)` | Waits for the first collector, keeps the strongest seen over 0.8 s more, and reads its preview. |

- `FluxisBLEPreview` has `record`, `sessionId`, `content` (`.naspip(String)` or
  `.posId(UUID)`), `identifier` and `rssi`, plus `token`/`posId` shortcuts. Its `description`
  never prints the token.
- Errors are `FluxisBLEPayerError` with a `reason`: `bluetoothUnavailable`, `bluetoothOff`,
  `unauthorized`, `notFound`, `connectionFailed`, `notSupported` (no PREVIEW), `invalid` (see
  `protocolError`), `timeout` or `cancelled`.
- Cancel the calling `Task` to abort; the connection is closed and the call throws `.cancelled`.
- `FluxisBLEPayer(options: .init(showPowerAlert: true))` lets iOS show its own "Turn on
  Bluetooth" alert. It's off by default so the wallet can show its own UI.
- Scanning works in the foreground. iOS throttles background scans and ignores
  duplicate-advertisement updates while backgrounded.

The preview is public, like the QR on the POS screen, and the record fields are
unauthenticated. Show the merchant from `POST /public/qr/read` and the amount from
`GET /public/checkout/pos/{posId}`, make the merchant name prominent (a fake collector is the
BLE version of a swapped QR sticker), and re-check that the request is still pending right
before signing (§7–8 of the spec).

## Other transports and testing

`PreviewFlow.read(over:)` runs the payer's read sequence over any type that conforms to
`FluxisBLEReadLink` (discover, read RECORD, read PREVIEW). `FluxisBLEPayer` is the
CoreBluetooth implementation; the unit tests use an in-memory link.

## Collector on iOS

`FluxisBLECollector` is a scaffold that throws `FluxisBLECollectorError.notImplemented`. iOS
only advertises a service UUID while the app is in the foreground (in the background the UUID
moves to the "overflow area", which Android scanners don't match), so POS devices use the
Android collector in `us.fluxis:fluxis-ble-android`.

## Development

```bash
cd packages/ble/swift
swift build
swift test      # shared vectors + PreviewFlow scenarios; runs on macOS and on Linux
```

On Linux only `FluxisBLECore` is compiled (the CoreBluetooth sources are behind
`#if canImport(CoreBluetooth)`). The tests find `packages/ble/test-vectors/vectors.json` by
walking up from the test file; set `FLUXIS_BLE_VECTORS` to use another file.
