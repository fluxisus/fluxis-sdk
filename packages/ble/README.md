# Fluxis BLE SDKs

Hand a Fluxis NASPIP payment token from a point of sale to a nearby wallet over Bluetooth Low
Energy, so the customer doesn't have to scan a QR code. The BLE link only carries the token.
The wallet then resolves and pays it through the Fluxis API, exactly as if it had scanned the QR.

| Role | Runs on | Package |
|---|---|---|
| **Collector** (POS: GATT server and advertiser) | Android 8.0+ (API 26), including Clover devices | [`kotlin/`](kotlin/README.md): `us.fluxis:fluxis-ble-android` |
| **Payer** (wallet: GATT central) | Android 8.0+ | [`kotlin/`](kotlin/README.md): `us.fluxis:fluxis-ble-android` |
| **Payer** (wallet: GATT central) | iOS 15+ / macOS 12+ | [`swift/`](swift/README.md): `FluxisBLE` (Swift Package) |
| Protocol core only (no Bluetooth) | JVM 11+ / any Swift platform, including Linux | `us.fluxis:fluxis-ble-core` / `FluxisBLECore` |

The SDKs are host-agnostic: they take a token and deliver a token. They don't call the Fluxis
API and don't depend on any Fluxis or POS app code.

## How it works

1. The POS gets a NASPIP token from Fluxis core-api (the one it would render as a QR) and starts
   a collector session: `start(token, amount, displayName, ttl)`.
2. The collector advertises one fixed service UUID and serves a small discovery record with a
   session id, an ephemeral P-256 public key, the display name and an optional amount hint.
3. The wallet scans, reads the record, and sends START with its own ephemeral key.
4. Both sides run ECDH and HKDF over a transcript hash. The collector sends the token sealed with
   AES-256-GCM; the wallet decrypts it and answers with an HMAC acknowledgement.
5. The wallet resolves the token through the Fluxis API and shows the merchant and amount *that
   the API returns*. The POS learns that the sale was paid from its own backend, not over BLE.

The full wire format, state machines, timeouts and security analysis are in
[`docs/ble-protocol.md`](../../docs/ble-protocol.md) (protocol version 3), which is the single
source of truth.

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
make test-ble-swift     # Swift core tests (macOS, or Linux with swift-crypto)
```

Conventions for changing the protocol or the SDKs are in [`CLAUDE.md`](CLAUDE.md).
