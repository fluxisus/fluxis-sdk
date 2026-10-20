# Fluxis BLE SDKs

Publish the active sale of a Fluxis point of sale over Bluetooth Low Energy, so every wallet
nearby can show the **verified** merchant and amount before the customer taps *Pay*, without
scanning a QR code. The BLE link is read-only: nobody claims or locks the POS. The wallet
resolves the sale and pays through the Fluxis API, exactly as if it had scanned the QR.

| Role | Runs on | Package |
|---|---|---|
| **Collector** (POS: GATT server and advertiser) | Android 8.0+ (API 26), including Clover devices | [`kotlin/`](kotlin/README.md): `us.fluxis:fluxis-ble-android` |
| **Payer** (wallet: GATT central) | Android 8.0+ | [`kotlin/`](kotlin/README.md): `us.fluxis:fluxis-ble-android` |
| **Payer** (wallet: GATT central) | iOS 15+ / macOS 12+ | [`swift/`](swift/README.md): `FluxisBLE` (Swift Package) |
| Protocol core only (no Bluetooth) | JVM 11+ / any Swift platform, including Linux | `us.fluxis:fluxis-ble-core` / `FluxisBLECore` |

The SDKs are host-agnostic: the collector takes a token, the payer returns it. They don't
call the Fluxis API and don't depend on any Fluxis or POS app code.

## How it works

1. The POS gets the NASPIP token of the sale from Fluxis core-api (the one it renders as a QR)
   and starts a collector: `start(token, amount, displayName, posId)`.
2. The collector advertises one fixed service UUID and serves two read-only values:
   `RECORD` (session id, display name, amount hint) and `PREVIEW` (session id + the NASPIP
   token, or the POS id if the token is longer than 494 bytes).
3. Any wallet nearby scans, connects briefly, reads both values and disconnects:
   `readNearestPreview()` / `discover()` + `readPreview(_:)`.
4. The wallet resolves the preview: `POST /public/qr/read` (signed merchant + checkout URL),
   then `GET /public/checkout/pos/{posId}` (the active payment request and its amount). It
   shows the merchant and amount **returned by the API**.
5. When the user taps *Pay*, the wallet re-checks that the request is still pending (several
   wallets may be looking at it) and pays through the API. The POS learns that the sale was
   paid from its own backend and stops the collector.

The wire format, behaviour and security notes are in
[`docs/ble-protocol.md`](../../docs/ble-protocol.md) (protocol version 3, preview only), which
is the single source of truth.

## Amounts

Amounts are integers in minor units with an explicit scale and an optional currency code, so
`12.50 ARS` is `minorUnits = 1250, scale = 2, currency = "ARS"`. Crypto precision works the same
way (`0.000001 USDC` is `1, 6, "USDC"`), and open-amount PoS sessions send no amount at all.
The amount in the record is a display hint only.

## Layout

```
packages/ble/
├── test-vectors/      # vectors.json (shared by every SDK) + Python reference generator
├── kotlin/            # Gradle build: :core (pure JVM) and :android (collector + payer)
└── swift/             # Swift package: FluxisBLECore (pure Swift) and FluxisBLE (CoreBluetooth)
```

## Development

```bash
make ble-vectors        # check that vectors.json matches the reference implementation
make test-ble-kotlin    # JVM core tests; Android unit tests + lint when an Android SDK is present
make test-ble-swift     # Swift core tests (macOS or Linux)
```

Conventions for changing the protocol or the SDKs are in [`CLAUDE.md`](CLAUDE.md).
