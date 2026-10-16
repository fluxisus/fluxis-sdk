## 1. Protocol and vectors

- [x] 1.1 Write `docs/ble-protocol.md` (v3): GATT profile, record, framing, START/DATA/ACK, key schedule, phases, timeouts, security, NFC carriage
- [x] 1.2 Python reference implementation `packages/ble/test-vectors/reference/fluxis_ble_ref.py`
- [x] 1.3 Deterministic generator with `--check`; commit `vectors.json` (amounts, records, framing, messages, three handshakes at several MTUs)

## 2. Kotlin

- [x] 2.1 `:core`: amount, record, framing, P-256/HKDF/AES-GCM/HMAC, START/DATA/ACK codecs
- [x] 2.2 `:core`: `PayerSession` and `CollectorEngine` (sans-IO), including re-arm, busy, timeouts, linger, expiry
- [x] 2.3 `:core` tests: every vector and collector state-machine scenarios
- [x] 2.4 `:android`: `FluxisBleCollector` (GATT server, advertising, blob reads, CCCD, indication queue, Bluetooth state receiver)
- [x] 2.5 `:android`: `FluxisBlePayer` (scan, discover, claim, claimNearest) over a coroutine `GattClient`
- [x] 2.6 `:android`: `FluxisBlePermissions` for device API × targetSdk, with unit tests
- [x] 2.7 Lint clean with `NewApi`/`InlinedApi`/`MissingPermission` fatal at minSdk 26; release AAR builds

## 3. Swift

- [x] 3.1 `FluxisBLECore`: same codecs and crypto on CryptoKit / swift-crypto
- [x] 3.2 `PayerSession`, `PayerFlow` over `FluxisBLELink`, async helpers
- [x] 3.3 Tests: every vector and `PayerFlow` scenarios (deliver at each MTU, busy, reject, timeout, tamper); passing on Linux
- [x] 3.4 `FluxisBLE`: CoreBluetooth `FluxisBLEPayer` and `PeripheralLink`
- [x] 3.5 iOS `FluxisBLECollector` scaffold
- [x] 3.6 `swift test` and an iOS build on macOS (the `sdk-ble-swift` workflow: Xcode 16.4, no warnings)

## 4. Repo integration

- [x] 4.1 Workflows `sdk-ble-kotlin.yml` (vectors check, tests, lint, AAR) and `sdk-ble-swift.yml` (macOS, iOS, Linux)
- [x] 4.2 release-please components `ble-kotlin` and `ble-swift`; publish jobs
- [x] 4.3 READMEs (overview, Kotlin, Swift) and `packages/ble/CLAUDE.md`
- [x] 4.4 Root `README.md`, `CLAUDE.md`, `llms.txt`, `Makefile`
- [ ] 4.5 Create `fluxisus/fluxis-ble-swift` and add the `BLE_SWIFT_MIRROR_TOKEN` secret before the first Swift release

## 5. On-device verification (manual)

- [ ] 5.1 Clover Flex 4 (Android 13, targetSdk 29 app): collector advertises, Android and iOS wallets discover and claim
- [ ] 5.2 Clover PTA0010 (Android 10): same, including the location permission prompt
- [ ] 5.3 MTU 23 path (force a small MTU) and a 4 KB token: multi-frame DATA delivers within the timeouts
- [ ] 5.4 Two wallets at once: the second gets BUSY; the collector re-arms after the first walks away mid-handshake
- [ ] 5.5 Toggle Bluetooth off during a session: the collector reports `FAILED` with `bluetooth_off`; the payer reports `.bluetoothOff` / `CONNECTION_FAILED`
- [ ] 5.6 Session expiry: the collector stops advertising at `expiresAt`; wallets hide the candidate

## 6. Migration (separate repositories)

- [ ] 6.1 TeroKiosk adopts `FluxisBleCollector`
- [ ] 6.2 The Fluxis Android and iOS wallets adopt `FluxisBlePayer` / `FluxisBLEPayer`
