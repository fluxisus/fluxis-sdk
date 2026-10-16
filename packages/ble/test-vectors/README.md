# Fluxis BLE test vectors

`vectors.json` holds the shared conformance vectors for the Fluxis BLE Handoff Protocol v3
([`docs/ble-protocol.md`](../../../docs/ble-protocol.md)). The Kotlin (`packages/ble/kotlin`) and Swift
(`packages/ble/swift`) test suites both load this file, so the two SDKs are verified byte for byte
against the same reference.

The file is generated. Don't edit it by hand:

```bash
pip install cryptography            # 41+
cd packages/ble/test-vectors/reference
python3 generate_vectors.py         # regenerate
python3 generate_vectors.py --check # CI: fail if vectors.json is stale
```

`reference/fluxis_ble_ref.py` is a small, dependency-light reference implementation of the
protocol. It isn't shipped; it exists to produce and self-check these vectors. Every key, nonce
and token is derived from fixed labels, so regeneration is deterministic.

| Section | Contents |
|---|---|
| `amounts` | decimal string ↔ (`minor`, `scale`, `currency`), plus rejected inputs with error codes |
| `records` | discovery records (with or without amount and currency, edge sizes) and rejected records |
| `framing` | message → frames at several MTUs, split errors, reassembly sequences (valid and invalid) |
| `messages` | START encoding, envelope encoding, invalid START/envelopes, ABORT/ERROR code tables |
| `handshakes` | full exchanges: keys, ECDH secret, transcript hash, HKDF outputs, DATA, ACK and frames |

Error strings (`truncated`, `invalid_key`, …) are part of the conformance surface: SDKs expose
them as error codes and the tests compare them exactly.
