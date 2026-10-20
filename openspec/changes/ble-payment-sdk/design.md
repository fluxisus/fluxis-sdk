> **Superseded in part (2026-10-20).** The claim handshake designed below (ECDH, AES-GCM,
> framing, BUSY, re-arm, expiry) was replaced by a read-only PREVIEW characteristic. See the
> revision note in `proposal.md` and `docs/ble-protocol.md` §2 and §8 for the current design and
> its security model (the preview is public, like the printed QR).

## Context

The prototype (TeroKiosk ↔ Fluxis iOS) proved that a POS can serve the NASPIP token over a GATT
server, and that wallets can read it in a few hundred milliseconds. Its record exposed a
`claimSecret` from which every key was derived, so anyone in range who read the record could
decrypt the token. The private `TeroMinds/pos` repository wasn't accessible while this change
was written. The SDK is built from the prototype's description, not its code.

Target devices: Clover Flex 4 (Android 13) and PTA0010 (Android 10) as collectors, in a Clover
app whose `targetSdkVersion` must stay ≤ 29; Android and iOS wallets as payers.

## Goals / Non-Goals

**Goals:**
- One normative spec and one set of byte-exact vectors that every SDK runs in CI.
- A passive sniffer that records the whole exchange can't recover the token.
- Amounts with explicit decimals and currency; open-amount sessions.
- Small, host-agnostic APIs: the collector takes a token, the payer returns one.
- Android collector and payer from API 26, correct under both permission models.

**Non-Goals:**
- Interoperability with the prototype (v1/v2).
- Authenticating the collector (no PKI yet; see Risks).
- An iOS collector beyond a scaffold.
- Calling the Fluxis API from the SDKs.

## Decisions

**Ephemeral–ephemeral ECDH (P-256) instead of a secret in the record.** Both platforms ship
P-256 natively (Android `KeyPairGenerator("EC")`, CryptoKit), so the SDKs need no third-party
crypto. X25519 isn't available from the platform providers at Android API 26. The transcript hash
`TH = SHA-256(label ‖ record ‖ START)` salts HKDF and is the AEAD's AAD, so the keys, the
ciphertext and the ACK are all bound to both public keys and to the exact record bytes.

**One fixed GATT service.** The prototype's random per-session delivery service invalidated
central-side GATT caches (an iOS pain point) and cost a second discovery. A fixed database,
with `sessionId` binding the session, is simpler and faster.

**Sans-IO engines.** `CollectorEngine` (Kotlin) and `PayerSession`/`PayerFlow` (both SDKs)
hold all protocol logic and take events plus a clock. The Android and CoreBluetooth layers are
thin adapters. This makes the state machine testable on a plain JVM and on Linux, and keeps a
future iOS collector to "write the adapter, port the engine".

**Minor units + scale + currency.** `u64 ≤ 2^63−1`, `scale ≤ 18`, `[A-Z0-9]{0,12}` cover
fiat (2 decimals) and crypto (6–18 decimals) without floats. Amounts are hints only; the wallet
shows what the API returns.

**Strict decoding and shared error strings.** Decoders reject trailing bytes and out-of-range
fields. Error codes are strings in the vectors (`truncated`, `invalid_key`, …), so both SDKs
report identical failures for identical input.

**Re-arm after a failed attempt.** A wallet that walks away mid-handshake must not burn the
sale. The collector returns to `ready` with the same record until `expiresAt`.

**Permissions keyed on device API *and* targetSdk.** Android 12's `BLUETOOTH_*` runtime
permissions only exist for apps targeting 31+. A targetSdk 29 Clover app on Android 13 uses
the legacy model. The library declares no location permission; the decision table tells the
host what to request.

**Swift crypto on Linux.** The manifest adds swift-crypto only when evaluated on Linux, so iOS
apps never fetch it, while CI and contributors can run the vector tests without a Mac.

**Releases.** Kotlin goes to GitHub Packages (no signing infrastructure needed). Swift is
mirrored to a public repository, since SwiftPM needs `Package.swift` at the root. This follows
the existing Go SDK mirror.

## Risks / Trade-offs

- **Unauthenticated key exchange.** An active attacker nearby can claim the token first,
  impersonate a collector, or relay traffic. → The token is a payment instruction (it's also
  in the QR), wallets must show the merchant and amount from the API, sessions are short, the
  collector re-arms, and the QR stays on screen. A record signature from core-api is the
  planned follow-up.
- **Clover BLE stack behaviour is unverified.** Advertising, GATT server and indications
  haven't been exercised on Flex 4 or PTA0010 hardware. → Manual test plan in `tasks.md`.
  `FAILED` states carry precise reasons for field diagnosis.
- **CoreBluetooth layer untested on device.** It compiles only on Apple platforms. → macOS
  CI builds it, `PayerFlow` is unit-tested on every platform, and the adapter is a thin
  translation layer.
- **GitHub Packages needs a token to download.** → Documented. Maven Central can follow once
  signing is set up.

## Migration Plan

TeroKiosk replaces its BLE code with `FluxisBleCollector.start(token, amount, name, ttl)`. The
Fluxis wallets replace theirs with `FluxisBlePayer` / `FluxisBLEPayer`. Roll out the collectors
and wallets together, since v3 and the prototype don't interoperate. A POS can keep showing the
QR during the transition.

## Open Questions

- Should core-api sign the record (`sessionId ‖ collectorPublicKey ‖ expiresAt`)? This needs a
  key distribution decision and would be protocol v4.
- Should collectors send the token's own expiration rather than a TTL? Today the host passes
  `ttlSeconds` (≤ 300).
