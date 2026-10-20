# Fluxis BLE test vectors

`vectors.json` holds the shared conformance vectors for the Fluxis BLE Protocol v3, preview
only ([`docs/ble-protocol.md`](../../../docs/ble-protocol.md)). The Kotlin (`packages/ble/kotlin`)
and Swift (`packages/ble/swift`) test suites both load this file, so the two SDKs are verified
byte for byte against the same reference.

The file is generated. Don't edit it by hand:

```bash
cd packages/ble/test-vectors/reference
python3 generate_vectors.py         # regenerate (standard library only)
python3 generate_vectors.py --check # CI: fail if vectors.json is stale
```

`reference/fluxis_ble_ref.py` is a small reference implementation of the protocol. It isn't
shipped; it exists to produce and self-check these vectors. Session ids and tokens are derived
from fixed labels, so regeneration is deterministic. Tokens are NASPIP-shaped filler of the
right length, not real tokens.

| Section | Contents |
|---|---|
| `uuids`, `limits`, `previewKinds` | GATT UUIDs, size limits, `PREVIEW` kind codes |
| `amounts` | decimal string ↔ (`minor`, `scale`, `currency`), plus rejected inputs with error codes |
| `records` | discovery records (with or without amount and currency, edge sizes) and rejected records |
| `previews` | `PREVIEW` values (`naspip` up to 512 bytes, `pos_id`), the collector's token/POS-id choice, and rejected values |

Error strings (`truncated`, `preview_too_large`, …) are part of the conformance surface: SDKs
expose them as error codes and the tests compare them exactly.
