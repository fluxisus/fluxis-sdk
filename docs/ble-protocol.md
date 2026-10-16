# Fluxis BLE Handoff Protocol — version 3

**Status:** draft, normative. This document is the single source of truth for the Fluxis BLE
SDKs (`packages/ble/kotlin`, `packages/ble/swift`) and for the shared test vectors in
`packages/ble/test-vectors/vectors.json`. When an implementation and this document disagree,
the implementation is wrong. If you change the wire format, bump the protocol version, then
update this document, the reference implementation, the vectors, and every SDK in the same PR.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as in RFC 2119.

## 1. Purpose and roles

A Fluxis point of sale hands the NASPIP payment token for the current sale to a nearby wallet
over Bluetooth Low Energy. It is the same token that core-api generates and the POS would
otherwise render as a QR code. The BLE link carries only that token. Payment happens out of
band:

- The **collector** (the POS) runs a GATT server and advertises. It never builds a payment
  request of its own; it delivers, encrypted, the NASPIP token it got from Fluxis core-api.
  It learns that the sale was paid by polling its own backend, not over BLE.
- The **payer** (a wallet, or any app that integrates Fluxis) is the GATT central. It
  receives the token, resolves and pays it against the Fluxis API, and shows the payment
  details that the API returns.

```
 Collector (POS, GATT server)                               Payer (wallet, GATT central)
 ─────────────────────────────                              ────────────────────────────
 start(token, amount, name, ttl)
   keypair, sessionId, record
   GATT service registered
   advertise SERVICE_UUID ───────── scan ────────────────▶  sees SERVICE_UUID
                          ◀──────── connect, MTU ────────── 
          RECORD ───────────────── READ ─────────────────▶  parse record, show candidate
                          ◀──────── DATA CCCD = 0x0002 ────  subscribe to indications
                          ◀──────── CONTROL: START ───────  ephemeral key + sessionId
   validate, lock to peer,
   stop advertising, ECDH,
   encrypt envelope
          DATA ─────────────────── INDICATE × n ─────────▶  reassemble, ECDH, decrypt
                          ◀──────── CONTROL: ACK ─────────  HMAC over transcript
   verify ACK → delivered
   disconnect after 250 ms                                   resolve NASPIP via Fluxis API
```

## 2. Versioning and history

This is **protocol version 3**, a clean break from the pre-SDK prototype that ran between
TeroKiosk and an internal Fluxis iOS build. That prototype used "bootstrap v1" and
"discovery record v2". Version 3 shares none of its UUIDs and does not interoperate with it.
Version bytes `0x01` and `0x02` are reserved, and receivers MUST reject them.

What changed from the prototype, and why:

| Prototype (v1/v2) | Version 3 | Reason |
|---|---|---|
| `claimSecret` readable in the discovery record; every key derived from it | Ephemeral–ephemeral ECDH on P-256 | Anyone who captured the record READ could decrypt the token. With ECDH, a passive sniffer that records the whole exchange learns nothing. |
| START carried an HMAC "proof" made with the readable `claimSecret` | START carries the payer's ephemeral public key and the `sessionId` | The proof authenticated nothing, since every reader knew the key. |
| Separate discovery service plus a random per-session delivery service | One fixed GATT service holding all three characteristics | A fixed GATT database can't go stale in central-side GATT caches, and there's one less discovery round trip. `sessionId` binds the session instead. |
| Separate 37-byte bootstrap structure (for NFC) | The discovery record *is* the bootstrap | One structure to parse and hash. NFC carries the same bytes (§9). |
| Amount: `u32` whole ARS pesos, no currency | Optional `u64` minor units, explicit `scale`, optional currency code | Supports 2 decimals (`12.50`), crypto precision (6+), any currency, and open-amount sessions. |
| "Payload = MTU − 3" (ambiguous) | Frame ≤ MTU − 3, payload ≤ MTU − 6 | The 3-byte frame header lives inside the ATT value. |
| Plain envelope with a `mode` byte and `u16` length | `contentType` byte followed by the content | The AEAD already authenticates the length. `contentType` leaves room for other payloads. |

## 3. GATT profile

### 3.1 UUIDs

| Name | UUID | Properties | Permissions |
|---|---|---|---|
| Service `SERVICE` | `f1b10100-6ff9-4bf4-a699-f9b7aa31119b` | primary | — |
| `RECORD` | `f1b10101-6ff9-4bf4-a699-f9b7aa31119b` | READ | read (no encryption) |
| `CONTROL` | `f1b10102-6ff9-4bf4-a699-f9b7aa31119b` | WRITE (with response) | write (no encryption) |
| `DATA` | `f1b10103-6ff9-4bf4-a699-f9b7aa31119b` | INDICATE | — |
| `DATA` CCCD | `00002902-0000-1000-8000-00805f9b34fb` | — | read, write |

No pairing or bonding is used. The GATT database is identical for every session.

### 3.2 Advertising

The collector MUST advertise:

- connectable, legacy advertising (so 4.x centrals can see it);
- mode *low latency* (Android `ADVERTISE_MODE_LOW_LATENCY`; roughly a 100 ms interval);
- no timeout; the collector stops advertising itself (§6);
- no device name, local name, TX power or manufacturer data;
- exactly one service UUID: `SERVICE` (18 bytes; with flags the PDU is 21 of 31 bytes).

The display name travels inside the record, never in the advertisement.

### 3.3 Link rules

- **MTU.** The payer SHOULD request the largest ATT MTU it can (Android: `requestMtu(517)`;
  iOS negotiates on its own). Both sides use the MTU negotiated for that connection, or 23 if
  none was.
- **Long reads.** `RECORD` can be longer than MTU − 1. The collector MUST serve ATT Read Blob
  (offset reads). Android and iOS centrals do long reads automatically.
- **No prepared writes.** Every CONTROL frame fits in one ATT Write Request (§4). Collectors
  SHOULD reject prepared/queued writes with `Request Not Supported` (0x06). On iOS, take the
  frame size from `maximumWriteValueLength(for: .withoutResponse)` (which is MTU − 3) even
  though frames are written *with* response. The `.withResponse` value is 512 because iOS
  would otherwise fall back to prepared writes.
- **Indications.** The collector sends one indication at a time and waits for its
  confirmation (Android `onNotificationSent`) before sending the next.

## 4. Framing

CONTROL writes and DATA indications both carry **frames**. A message is split into 1–255
frames:

```
frame   = type:u8 | seq:u8 | total:u8 | payload
```

| Rule | Value |
|---|---|
| Max frame length (ATT value) | `MTU − 3` |
| Max payload per frame | `MTU − 6` (17 bytes at MTU 23) |
| `total` | 1..255 |
| `seq` | 0..total−1, strictly in order, starting at 0 |
| Max reassembled message | 4096 bytes |
| Empty payload | allowed only when `total == 1` |

Senders split a message into chunks of `MTU − 6` bytes; every frame except the last is full.
Receivers MUST NOT depend on that. They accept any chunk sizes within the limits.

Each connection has one reassembly buffer per direction. A receiver MUST treat the following
as a protocol error:

- a frame shorter than 3 bytes, or longer than `MTU − 3` (when the receiver knows the MTU);
- `total == 0`, `seq ≥ total`, or `seq` other than the expected next value;
- a `type` or `total` that differs from frame 0 of the message in progress;
- a new `seq == 0` frame while a message is still incomplete;
- a reassembled length above 4096, or an empty payload with `total > 1`;
- an unknown `type`, or a type sent in the wrong direction (table below).

| Type | Code | Direction | Characteristic | Payload |
|---|---|---|---|---|
| `START` | `0x01` | payer → collector | CONTROL | §5.3 (82 bytes) |
| `DATA` | `0x02` | collector → payer | DATA | §5.5 |
| `ACK` | `0x03` | payer → collector | CONTROL | §5.6 (16 bytes) |
| `ABORT` | `0x04` | payer → collector | CONTROL | `reason:u8` (§5.7) |
| `BUSY` | `0x7E` | collector → payer | DATA | empty |
| `ERROR` | `0x7F` | collector → payer | DATA | `code:u8` (§5.7) |

## 5. Messages and cryptography

All integers are unsigned big-endian. `||` is concatenation. ASCII labels below are encoded
without a terminator.

Primitives (available natively on Android API 26+, JVM 11+ and Apple CryptoKit):

- ECDH on **P-256** (secp256r1). Public keys use the 65-byte SEC1 uncompressed form
  `0x04 || X || Y`. The shared secret is the 32-byte X coordinate.
- **SHA-256**, **HMAC-SHA-256**, **HKDF-SHA-256** (RFC 5869).
- **AES-256-GCM** with a 96-bit nonce and a 128-bit tag.

### 5.1 Discovery record (`RECORD` value, version 3)

| Offset | Size | Field | Notes |
|---|---|---|---|
| 0 | 1 | `version` | `0x03` |
| 1 | 1 | `flags` | bit 0 = `AMOUNT_PRESENT`; bits 1–7 reserved, sent as 0, ignored on receive |
| 2 | 4 | `expiresAt` | Unix seconds (UTC) after which the collector refuses START |
| 6 | 16 | `sessionId` | random per session |
| 22 | 65 | `collectorPublicKey` | P-256 uncompressed, ephemeral per session |
| 87 | 8 | `amountMinor` | *only if `AMOUNT_PRESENT`*; 0 ≤ value ≤ 2⁶³−1 |
| +8 | 1 | `scale` | *only if `AMOUNT_PRESENT`*; 0..18 decimal places |
| +9 | 1 | `currencyLen` | *only if `AMOUNT_PRESENT`*; 0..12 (0 = unspecified) |
| +10 | n | `currency` | *only if `AMOUNT_PRESENT`*; ASCII `[A-Z0-9]`, n = `currencyLen` |
| … | 1 | `nameLen` | 1..64 |
| … | n | `displayName` | UTF-8, n = `nameLen` bytes, must be valid UTF-8 |

The record is 88 + `nameLen` bytes without an amount, or 98 + `currencyLen` + `nameLen`
bytes with one, so at most 174 bytes. Receivers MUST reject records whose version isn't 3,
records that are truncated, records with **trailing bytes**, and records with any field out
of range. A layout change requires a new version; it can't be signalled with a flag.

**Amount semantics.** The value is `amountMinor × 10^(−scale)` in `currency`.

| Display | `amountMinor` | `scale` | `currency` |
|---|---|---|---|
| ARS 12.50 | 1250 | 2 | `ARS` |
| ARS 1500 (whole pesos) | 1500 | 0 | `ARS` |
| USD 0.05 | 5 | 2 | `USD` |
| USDC 0.000001 | 1 | 6 | `USDC` |
| amount set, currency unknown | 999 | 2 | (`currencyLen = 0`) |
| open amount (payer decides) | `AMOUNT_PRESENT` clear | — | — |

Encoders keep the scale the caller gave them (`12.50` is encoded as 1250/2, not 125/1), so
receivers can show trailing zeros faithfully. Currency codes are ISO 4217 where one exists,
otherwise the asset ticker, and always upper-case.

The amount and display name are **informational**. Wallets MUST show the amount, currency and
merchant from the NASPIP token as resolved by the Fluxis API, and MUST NOT authorize a payment
from the record fields (§8).

### 5.2 Session parameters

The collector generates, per session: `sessionId` (16 random bytes), an ephemeral P-256 key
pair, and `expiresAt = now + ttl`. The default TTL is 120 s and the maximum 300 s; the hosted
checkout uses 300 s. The record bytes stay constant for the whole session, including across
re-arms (§6.2).

### 5.3 START (payer → collector)

```
start = version:u8 (=0x03) | sessionId:16 | payerPublicKey:65         (82 bytes)
```

The payer generates a fresh ephemeral P-256 key pair for every START, including retries.
`sessionId` MUST equal the one in the record it read.

### 5.4 Key schedule

Both sides compute:

```
Z         = ECDH(own private key, peer public key)            // 32 bytes, X coordinate
TH        = SHA-256( "fluxis-ble/3/transcript" || record || start )
PRK       = HKDF-Extract(salt = TH, IKM = Z)
dataKey   = HKDF-Expand(PRK, info = "fluxis-ble/3/data", L = 32)
ackKey    = HKDF-Expand(PRK, info = "fluxis-ble/3/ack",  L = 32)
```

`record` is the exact byte string served by `RECORD`, and `start` is the exact 82-byte START
payload. Both are self-delimiting, so concatenating them is unambiguous. The collector MUST
validate that `payerPublicKey` is a point on P-256 before running ECDH, and it MUST NOT accept
the point at infinity or a non-uncompressed encoding.

### 5.5 DATA (collector → payer)

```
envelope = contentType:u8 | content
data     = nonce:12 | AES-256-GCM-Seal(key = dataKey, nonce, plaintext = envelope, aad = TH)
         = nonce:12 | ciphertext | tag:16
```

| `contentType` | Content |
|---|---|
| `0x01` | NASPIP token, UTF-8 (for example `v4.local.…` or `v4.public.…`), 1..4067 bytes |
| others | reserved; the payer MUST abort with `unsupported_content` |

`nonce` is 12 random bytes from a CSPRNG. Because `dataKey` is unique to a (session, START)
pair, a nonce is never reused under the same key. The 4096-byte message limit caps the
envelope at 4068 bytes.

### 5.6 ACK (payer → collector)

```
ack = HMAC-SHA-256( ackKey, TH || SHA-256(envelope) )[0..16]          (16 bytes)
```

The collector recomputes the value and compares it in **constant time**. A valid ACK proves
that the peer holding the payer private key decrypted exactly this envelope.

### 5.7 ABORT reasons and ERROR codes

ABORT `reason` (payer → collector):

| Code | Name |
|---|---|
| `0x00` | `user_cancelled` |
| `0x01` | `decrypt_failed` |
| `0x02` | `unsupported_content` |
| `0x03` | `protocol_error` |
| `0x04` | `timeout` |
| `0xFF` | `other` |

ERROR `code` (collector → payer):

| Code | Name | Sent when |
|---|---|---|
| `0x01` | `malformed` | frame or message fails validation |
| `0x02` | `unsupported_version` | START `version` ≠ 3 |
| `0x03` | `session_mismatch` | START `sessionId` ≠ record |
| `0x04` | `expired` | START after `expiresAt` |
| `0x05` | `invalid_key` | `payerPublicKey` not on the curve |
| `0x06` | `bad_ack` | ACK verification failed |
| `0x07` | `timeout` | a §6.3 timeout fired while the peer was subscribed |
| `0x08` | `internal` | collector-side failure |

Receivers MUST accept unknown codes and map them to `other` or `internal`. The collector sends
ERROR or BUSY only to a peer that subscribed to DATA, and then disconnects that peer.

## 6. Collector behaviour

### 6.1 Phases

| Phase | Meaning |
|---|---|
| `idle` | not started |
| `preparing` | key pair and record generated; GATT server opening, service being added, advertising starting |
| `ready` | advertising; accepting connections, record reads and START |
| `claimed` | locked to one peer; sending DATA frames; advertising stopped |
| `awaiting_ack` | last DATA frame confirmed; waiting for ACK |
| `delivered` | ACK verified (terminal) |
| `expired` | `expiresAt` reached before delivery (terminal) |
| `stopped` | stopped by the host app (terminal) |
| `failed` | unrecoverable error: no Bluetooth, missing permission, advertising failure (terminal) |

### 6.2 Rules

1. `start()` generates the session parameters, opens the GATT server, adds `SERVICE`, waits
   for the service-added callback, then starts advertising. When advertising has started, the
   phase is `ready`.
2. In `ready`, any number of peers may connect, read `RECORD` and subscribe.
3. On a complete START from peer *P*, the collector checks, in this order: `version` is 3,
   `sessionId` matches, `now < expiresAt`, *P* is subscribed to DATA indications, and
   `payerPublicKey` is valid. Failing any check produces the matching ERROR (where it can be
   sent) and disconnects *P*.
4. Once START is valid, the collector locks to *P* (`claimed`), stops advertising, derives
   the keys, seals the envelope, and sends the DATA frames one confirmed indication at a time,
   sized to *P*'s MTU.
5. While the collector is locked, a START from any other peer gets BUSY and a disconnect.
   Other peers may still read `RECORD`.
6. After the last frame is confirmed: `awaiting_ack`. A valid ACK moves the session to
   `delivered`. The collector disconnects *P* after 250 ms, closes the GATT server, and
   reports delivery to the host app. The host app then polls its backend for the payment
   status.
7. Any invalid frame, wrong-direction message, bad ACK, ABORT, timeout or disconnect from *P*
   before `delivered` ends the attempt and disconnects *P*. If the session hasn't expired,
   the collector **re-arms**: it goes back to `ready` and advertises again with the same
   record. Implementations MAY offer an option to fail the session instead.
8. When `expiresAt` passes before delivery: `expired`. The collector stops advertising,
   disconnects everyone and closes the server.
9. Delivering the token doesn't mean the sale is paid. Only the backend status does.

### 6.3 Timeouts

| Name | Value | Applies to |
|---|---|---|
| `T_IDLE` | 15 s | a connected peer that hasn't completed START is disconnected (frees the radio) |
| `T_FRAME` | 3 s | maximum gap between frames of one message, in either direction, and maximum wait for an indication confirmation |
| `T_ACK` | 5 s | from the last DATA confirmation to a complete ACK |
| `T_LINGER` | 250 ms | delay before the collector disconnects after `delivered` |
| `TTL` | 120 s default, 300 s max | session lifetime (`expiresAt`) |

## 7. Payer behaviour

1. Scan in the foreground with a filter on `SERVICE` (Android: `SCAN_MODE_LOW_LATENCY`).
2. Connect, request the MTU, discover `SERVICE`, read `RECORD`, and parse it strictly. Hide
   candidates whose `expiresAt` is more than 60 s in the past by the payer's clock. The
   collector's clock is authoritative.
3. Pick a candidate: let the user choose, or take the strongest RSSI. Showing the record's
   display name and amount in a picker is fine, but they're hints (§8).
4. On the connection used for delivery: subscribe to DATA indications (CCCD = `0x0002`), then
   write START as frames sized `MTU − 3`, each with response.
5. The first DATA/BUSY/ERROR frame must arrive within 5 s of the last START frame, and
   later frames within `T_FRAME` of each other. On BUSY, report "POS busy" (the user can
   retry). On ERROR, report the code.
6. Reassemble DATA, derive the keys, open the AEAD. If that fails, write ABORT
   `decrypt_failed` and disconnect. If `contentType` isn't `0x01`, write ABORT
   `unsupported_content`.
7. Write ACK, return the token to the host app, and disconnect (the collector also disconnects
   after `T_LINGER`).
8. The host app resolves the token through the Fluxis API (`POST /naspip/read` or its wallet
   backend) and shows the merchant, amount and asset returned **by the API** for
   confirmation.

## 8. Security considerations

- **Passive eavesdroppers** see the record, both public keys and the ciphertext. They can't
  recover the token without one of the ephemeral private keys. Forward secrecy is per
  session, because both key pairs are ephemeral and discarded.
- **Unauthenticated key exchange (known limitation).** Neither side is authenticated. A nearby
  active attacker can (a) claim the token first, which is a denial of service and exposes the
  token, (b) run a fake collector that advertises any display name and amount, or (c) relay
  and substitute keys in the middle. A token is a payment *instruction*, not a credential: it
  is equally visible in the POS's QR code, and paying it only ever sends funds to the merchant
  encoded in it. The real protections are therefore:
  1. the payer shows the merchant and amount **from the Fluxis API's resolution of the
     token**, never from the record, and the user confirms them;
  2. short session expiry (`expiresAt`, NASPIP's own expiration);
  3. the collector re-arms after failed attempts and the host keeps a QR fallback on screen.

  A future version may add a record signature (for example, core-api signing
  `sessionId || collectorPublicKey || expiresAt`) to authenticate the collector.
- **Privacy.** Anyone in range can read the record: display name, amount and currency. Don't
  put personal data in `displayName`.
- **Replay.** ACKs and ciphertexts are bound to `TH`, which covers both ephemeral keys, so
  they can't be replayed into another attempt or session.
- **Constant time.** ACK comparison and AEAD tag checks MUST be constant-time.
- **Resource limits.** The 4096-byte and 255-frame limits, `T_IDLE` and `T_FRAME` bound
  collector memory and connection hogging.

## 9. NFC carriage (optional)

A collector with an NFC reader/HCE MAY publish the same record bytes as an NDEF External
record of type `fluxis.us:ble` (TNF 0x04). A payer that reads the record over NFC still
connects over BLE, scans for `SERVICE`, and selects the peripheral whose `RECORD` bytes equal
the NFC payload. NFC only serves to pick the candidate; the cryptography is unchanged.

## 10. Conformance and test vectors

`packages/ble/test-vectors/vectors.json` is generated by the reference implementation in
`packages/ble/test-vectors/reference/` (Python and `cryptography`) from fixed keys and nonces.
It covers:

- amount parsing and formatting, valid and invalid;
- record encoding (with and without amount, without currency) and invalid records;
- framing at MTU 23 and 185, plus invalid frame sequences;
- every message encoding;
- full handshakes: ECDH secret, `TH`, keys, DATA payload and frames, ACK.

Every SDK MUST run all of the vectors in CI. CI also regenerates the file and fails if it
changes (`python3 generate_vectors.py --check`).
