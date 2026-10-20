# Fluxis BLE Protocol — version 3 (preview only)

**Status:** draft, normative. This document is the single source of truth for the Fluxis BLE
SDKs (`packages/ble/kotlin`, `packages/ble/swift`) and for the shared test vectors in
`packages/ble/test-vectors/vectors.json`. When an implementation and this document disagree,
the implementation is wrong. If you change the wire format, update this document, the
reference implementation, the vectors, and every SDK in the same PR.

The key words MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are used as in RFC 2119.

## 1. Purpose and roles

A Fluxis point of sale publishes, over Bluetooth Low Energy, the NASPIP token of its active
sale, so that every wallet nearby can show the **verified** merchant and amount before the user
taps *Pay*. It is the same token that core-api returns for the POS payment intention and that
the POS also renders as a QR code. Nothing is claimed or locked over BLE: the link is
read-only, and payment happens out of band.

- The **collector** (the POS) runs a GATT server and advertises. It serves two read-only
  values, `RECORD` (unauthenticated hints) and `PREVIEW` (the NASPIP token, or the POS id as a
  fallback), until the host app stops it. It never learns who read them. It learns that the
  sale was paid by polling its own backend.
- The **payer** (a wallet, or any app that integrates Fluxis) is the GATT central. It reads the
  preview, resolves it with the Fluxis API, shows the merchant and amount **that the API
  returns**, and pays through the API. Whoever pays first is the payer; several wallets may be
  looking at the same sale.

```
 Collector (POS, GATT server)                               Payer (wallet, GATT central)
 ─────────────────────────────                              ────────────────────────────
 start(token, amount, name, posId?)
   sessionId, RECORD, PREVIEW
   GATT service registered
   advertise SERVICE_UUID ───────── scan ────────────────▶  sees SERVICE_UUID (+ RSSI)
                          ◀──────── connect, MTU ────────── 
          RECORD ───────────────── READ ─────────────────▶  hints: name, amount, sessionId
          PREVIEW ──────────────── READ (long) ──────────▶  sessionId + NASPIP token
                          ◀──────── disconnect ───────────  
                                                             POST /public/qr/read  → merchant
                                                             GET  /public/checkout/pos/{posId}
                                                                                   → amount
                                                             user taps Pay → re-check pending
                                                             → pay via Fluxis API
   (any number of payers, in parallel or one after another)
   host polls backend → paid → stop()
```

## 2. Versioning and history

This is **protocol version 3**. Version bytes `0x01` and `0x02` belong to the pre-SDK
prototype (TeroKiosk ↔ internal Fluxis iOS build) and receivers MUST reject them.

An earlier draft of version 3 handed the token to one payer at a time over an encrypted
claim (START, ephemeral ECDH, DATA indications, ACK, BUSY). It was withdrawn before any SDK
release (all SDK versions were `0.0.0`), so it was replaced in place rather than given a new
version byte. Reasons:

| Claim draft | Preview only | Reason |
|---|---|---|
| One payer claims the token; others get BUSY | Every payer reads the active request | A wallet should show the verified sale before the user decides to pay, without locking the POS for everyone else. |
| Token encrypted with ephemeral ECDH | Token in clear | The token is public by design (it is printed as a QR on the same screen). ECDH without authentication protected nothing an attacker in radio range couldn't get from the screen. |
| `CONTROL`, `DATA`, CCCD, framing, START/ACK/ABORT/BUSY/ERROR | Two READ characteristics | Less code, no per-peer state, nothing that can get stuck. |
| Record with collector public key and `expiresAt` | Record with `sessionId`, amount and name | No key exchange anymore. Expiry is the API's job: it says whether the request is still pending. |

Old payers and collectors of the claim draft don't interoperate with this version.

## 3. GATT profile

### 3.1 UUIDs

| Name | UUID | Properties | Permissions |
|---|---|---|---|
| Service `SERVICE` | `f1b10100-6ff9-4bf4-a699-f9b7aa31119b` | primary | — |
| `RECORD` | `f1b10101-6ff9-4bf4-a699-f9b7aa31119b` | READ | read (no encryption) |
| `PREVIEW` | `f1b10104-6ff9-4bf4-a699-f9b7aa31119b` | READ | read (no encryption) |

`f1b10102-…` and `f1b10103-…` were `CONTROL` and `DATA` in the claim draft and stay
reserved. No pairing or bonding is used. The GATT database is identical for every session.

### 3.2 Advertising

The collector MUST advertise:

- connectable, legacy advertising (so 4.x centrals can see it);
- mode *low latency* (Android `ADVERTISE_MODE_LOW_LATENCY`; roughly a 100 ms interval);
- no timeout; the collector advertises until the host app stops it (§6);
- no device name, local name, TX power or manufacturer data;
- exactly one service UUID: `SERVICE` (18 bytes; with flags the PDU is 21 of 31 bytes).

The display name travels inside the record, never in the advertisement.

### 3.3 Link rules

- **MTU.** The payer SHOULD request the largest ATT MTU it can (Android: `requestMtu(517)`;
  iOS negotiates on its own). A larger MTU makes the `PREVIEW` long read take fewer round
  trips; it is not required.
- **Long reads.** A value can be longer than `MTU − 1`. The collector MUST serve ATT Read Blob
  (offset reads) for both characteristics: it answers a read at `offset` with the bytes from
  `offset` to the end, and `Invalid Offset` (0x07) when `offset` is greater than the length.
  Android and iOS centrals do long reads automatically.
- **512-byte limit.** No value is longer than 512 bytes, the ATT maximum attribute length.
  iOS refuses longer values; some Android stacks allow 600 but MUST NOT be relied on.
- **Stable values.** A collector MUST NOT change `RECORD` or `PREVIEW` while a session runs.
  A new sale is a new session with a new `sessionId` (§6), so a long read never splices two
  values.
- **No writes.** The service has no writable attribute. Collectors reject any write or
  prepared write.
- **Short connections.** Payers connect, read, and disconnect right away. The collector
  disconnects any peer still connected after `T_IDLE` (15 s), so idle connections can't
  exhaust the controller's link slots.

## 4. Values

All integers are unsigned big-endian.

### 4.1 Discovery record (`RECORD`)

| Offset | Size | Field | Notes |
|---|---|---|---|
| 0 | 1 | `version` | `0x03` |
| 1 | 1 | `flags` | bit 0 `AMOUNT_PRESENT`; other bits reserved (sent as 0, ignored on receipt) |
| 2 | 16 | `sessionId` | random per session; equals `PREVIEW.sessionId` |
| 18 | 8 | `amountMinor` | only if `AMOUNT_PRESENT`; ≤ 2^63 − 1 |
| … | 1 | `scale` | only if `AMOUNT_PRESENT`; 0..18 |
| … | 1 | `currencyLen` | only if `AMOUNT_PRESENT`; 0..12 |
| … | n | `currency` | only if `AMOUNT_PRESENT`; `[A-Z0-9]`, ASCII |
| … | 1 | `nameLen` | 1..64 |
| … | n | `displayName` | UTF-8, n = `nameLen` bytes, must be valid UTF-8 |

The record is 19 + `nameLen` bytes without an amount, or 29 + `currencyLen` + `nameLen` with
one, so at most 105 bytes. That fits in one read at the 185-byte MTU most phones negotiate,
which keeps `discover()` fast. Receivers MUST reject records whose version isn't 3, records
that are truncated, records with **trailing bytes**, and records with any field out of range.

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

The record is **unauthenticated**. Wallets MAY show its name and amount in a picker of nearby
POS, but MUST show and pay the merchant and amount returned by the Fluxis API (§7, §8).

### 4.2 Preview (`PREVIEW`)

```
preview = version:u8 (=0x03) | sessionId:16 | kind:u8 | content
```

| `kind` | Name | `content` |
|---|---|---|
| `0x01` | `naspip` | the NASPIP token, UTF-8, ≥ 1 byte, valid UTF-8 |
| `0x02` | `pos_id` | the POS id (UUID), exactly 16 bytes, RFC 4122 byte order |

- The whole value MUST be at most **512 bytes**, so a NASPIP token can be up to 494 bytes.
  Measured on staging (October 2026): a POS payment-intention token is 431 bytes.
- The collector uses `naspip` whenever the token fits, and `pos_id` only when it doesn't. A
  collector that has neither a fitting token nor a POS id MUST NOT start.
- Receivers MUST reject: a version other than 3 (`unsupported_version`), a value shorter than
  18 bytes (`truncated`), a value longer than 512 bytes (`preview_too_large`), an unknown
  `kind` (`unsupported_content`), an empty or non-UTF-8 token (`invalid_token`), and a
  `pos_id` content that isn't exactly 16 bytes (`invalid_pos_id`).
- Payers MUST check that `PREVIEW.sessionId` equals `RECORD.sessionId` read on the same
  connection, and report a mismatch as an invalid preview.
- SDKs never decode the NASPIP token. It is opaque to the BLE layer.

## 5. Session parameters

The collector generates, per session, `sessionId` (16 random bytes). A session lasts until the
host app stops it, normally when the sale is paid, cancelled or expired according to its
backend. There is no BLE-level expiry. Starting a session while another one runs replaces it.

## 6. Collector behaviour

### 6.1 Phases

| Phase | Meaning |
|---|---|
| `idle` | not started |
| `preparing` | GATT server opening, service being added, advertising starting |
| `advertising` | advertising; serving `RECORD` and `PREVIEW` to any number of peers |
| `stopped` | stopped by the host app (terminal) |
| `failed` | unrecoverable error: no Bluetooth, missing permission, advertising failure (terminal) |

### 6.2 Rules

1. `start()` validates the input, builds both values, opens the GATT server, adds `SERVICE`,
   waits for the service-added callback, then starts advertising. When advertising has
   started, the phase is `advertising`.
2. In `advertising`, any number of peers may connect and read. Reads don't change the phase.
   Implementations MAY count complete `PREVIEW` reads (reads at offset 0) for diagnostics.
3. The collector disconnects a peer `T_IDLE` (15 s) after it connected.
4. `stop()` stops advertising, disconnects every peer and closes the GATT server (`stopped`).
5. If Bluetooth turns off, a permission is revoked, or advertising fails, the session ends in
   `failed` with a detail string, and everything is torn down as in `stop()`.
6. Payment status never comes from BLE. The host app polls its backend.

### 6.3 Timeouts

| Name | Value | Applies to |
|---|---|---|
| `T_IDLE` | 15 s | a connected peer is disconnected after this long |
| payer read timeout | 6 s default | connect + discovery + both reads, on the payer |

## 7. Payer behaviour

1. Scan in the foreground with a filter on `SERVICE` (Android: `SCAN_MODE_LOW_LATENCY`).
2. For a picker: connect to each candidate (strongest RSSI first), read `RECORD`, parse it
   strictly, and disconnect. Its fields are hints.
3. To preview: connect, request the MTU, discover `SERVICE`, read `RECORD` and `PREVIEW`,
   disconnect, parse both strictly, and check that the `sessionId`s match. A collector without
   `PREVIEW` is reported as *not supported*.
4. Resolve the preview with the Fluxis API:
   - `naspip`: `POST /public/qr/read` with `{"token": …}` verifies the signature and returns
     the merchant and the checkout URL (`…/public/checkout/pos/{posId}`).
   - `pos_id`: build the checkout URL for the configured Fluxis environment from the POS id.
   - `GET /public/checkout/pos/{posId}` returns the POS's **active** payment request (amount,
     asset, payment request id), or `PR0006` when there is none.
5. Show the merchant and amount returned **by the API**, and the payment request id it
   belongs to.
6. When the user taps *Pay*, re-check right before signing that the same payment request is
   still pending. If it was paid, cancelled, or replaced by another request, don't sign: show
   the new state, and ask for confirmation again if there is a new request.
7. Pay through the Fluxis API. The BLE link is not involved.

## 8. Security considerations

- **The preview is public.** It is the same token the POS shows as a QR on its screen. A
  NASPIP token is a payment *instruction*, not a credential: paying it only ever sends funds to
  the merchant it names. Reading it requires no pairing and leaves no trace on the collector.
- **Verification happens at the API.** The BLE values are unauthenticated. The wallet MUST
  show the merchant from `POST /public/qr/read` (signature verified by core-api) and the amount
  from `GET /public/checkout/pos/{posId}`, never the `RECORD` fields. It SHOULD warn when the
  record's name or amount disagree with the API.
- **Spoofed collector = swapped QR sticker.** Anyone can run a collector that serves *another*
  real merchant's token (for example their own). The API will verify that merchant correctly,
  so the defence is the same as for a printed QR: show the API's merchant name prominently and
  make the user confirm it; prefer the strongest RSSI and ask the user to hold the phone near
  the POS; let the user pick when several POS are close.
- **Relay.** A relay can replay a real POS's preview elsewhere. Paying it pays that merchant's
  active request, which the merchant receives; the user would have paid the wrong sale, which
  the merchant-name check above also catches.
- **Concurrency and double payment.** Every payer in range can see the same active request,
  and nobody holds a lock. The wallet MUST re-check that the request is still pending right
  before signing (§7.6), and the backend remains the arbiter of which payment settles it.
- **Privacy.** Anyone in range can read the display name, amount and token. Don't put
  personal data in `displayName`.
- **Resource limits.** Values are at most 512 bytes, the collector keeps no per-peer protocol
  state, and `T_IDLE` bounds how long one peer can hold a link.

## 9. NFC carriage (optional)

A collector with NFC/HCE MAY publish the `PREVIEW` bytes as an NDEF External record of type
`fluxis.us:ble` (TNF 0x04). A payer that reads it over NFC doesn't need BLE at all; it
resolves the preview with the API as in §7.

## 10. Conformance and test vectors

`packages/ble/test-vectors/vectors.json` is generated by the reference implementation in
`packages/ble/test-vectors/reference/` (Python, standard library only). It covers:

- the UUIDs and limits;
- amount parsing and formatting, valid and invalid;
- record encoding (with and without amount, without currency, edge sizes) and invalid records;
- preview encoding (`naspip` at typical and maximum size, `pos_id`), the fallback choice, and
  invalid previews.

Every SDK MUST run all of the vectors in CI. CI also regenerates the file and fails if it
changes (`python3 generate_vectors.py --check`).
