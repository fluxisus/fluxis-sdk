#!/usr/bin/env python3
"""Generate packages/ble/test-vectors/vectors.json from the reference implementation.

    python3 generate_vectors.py          # rewrite vectors.json
    python3 generate_vectors.py --check  # exit 1 if vectors.json is out of date

All keys, nonces and tokens are derived from fixed labels, so the output is reproducible.
"""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

import fluxis_ble_ref as ref

OUT = Path(__file__).resolve().parent.parent / "vectors.json"
P256_N = 0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551


def det(label: str, n: int) -> bytes:
    out, counter = b"", 0
    while len(out) < n:
        out += ref.sha256(f"fluxis-ble-vectors/{label}/{counter}".encode())
        counter += 1
    return out[:n]


def det_scalar(label: str) -> bytes:
    k = int.from_bytes(det(label, 32), "big") % (P256_N - 1) + 1
    return k.to_bytes(32, "big")


def det_token(label: str, length: int) -> str:
    body = base64.urlsafe_b64encode(det(label, length)).decode().rstrip("=")
    return ("v4.local." + body)[:length]


def h(b: bytes) -> str:
    return b.hex()


def expect_error(fn, *args) -> str:
    try:
        fn(*args)
    except ref.ProtocolError as e:
        return str(e)
    raise AssertionError(f"expected ProtocolError from {fn.__name__}{args!r}")


def keypair(label: str):
    scalar = det_scalar(label)
    priv = ref.private_key_from_scalar(scalar)
    return scalar, priv, ref.public_key_bytes(priv)


# ── Amounts ──────────────────────────────────────────────────────────────────


def amounts() -> dict:
    valid_inputs = [
        ("12.50", "ARS"),
        ("1500", "ARS"),
        ("0.05", "USD"),
        ("0", "USD"),
        ("0.000001", "USDC"),
        ("1234.99", ""),
        ("92233720368547758.07", "ARS"),
        ("0.000000000000000001", "ETH"),
    ]
    valid = []
    for dec, cur in valid_inputs:
        a = ref.Amount.parse(dec, cur)
        assert a.to_decimal_string() == dec
        valid.append({"decimal": dec, "currency": cur, "minor": str(a.minor), "scale": a.scale})
    invalid = [
        ("-1", "ARS"),
        ("", "ARS"),
        ("1.", "ARS"),
        (".5", "ARS"),
        ("01.50", "ARS"),
        ("1,50", "ARS"),
        ("1.2.3", "ARS"),
        ("1e3", "ARS"),
        (" 1", "ARS"),
        ("0.0000000000000000001", "ETH"),
        ("92233720368547758.08", "ARS"),
        ("1.00", "ars"),
        ("1.00", "US-D"),
        ("1.00", "ABCDEFGHIJKLM"),
    ]
    return {
        "valid": valid,
        "invalid": [
            {"decimal": d, "currency": c, "error": expect_error(ref.Amount.parse, d, c)} for d, c in invalid
        ],
    }


# ── Records ──────────────────────────────────────────────────────────────────


def record_json(rec: ref.Record, encoded: bytes, name: str, decode_only: bool = False) -> dict:
    out = {
        "name": name,
        "hex": h(encoded),
        "expiresAt": rec.expires_at,
        "sessionId": h(rec.session_id),
        "collectorPublicKey": h(rec.collector_public_key),
        "amount": None
        if rec.amount is None
        else {"minor": str(rec.amount.minor), "scale": rec.amount.scale, "currency": rec.amount.currency},
        "displayName": rec.display_name,
    }
    if decode_only:
        out["decodeOnly"] = True
    return out


def records() -> dict:
    _, _, pub = keypair("record-collector")
    sid = det("record-session", 16)
    base = dict(expires_at=1792800000, session_id=sid, collector_public_key=pub)

    cases = [
        ("amount ARS 12.50, accented name", ref.Record(amount=ref.Amount.parse("12.50", "ARS"), display_name="Café Tero", **base)),
        ("open amount", ref.Record(amount=None, display_name="Kiosko 24", **base)),
        ("amount without currency", ref.Record(amount=ref.Amount.parse("999.99"), display_name="POS 1", **base)),
        ("USDC 6 decimals", ref.Record(amount=ref.Amount.parse("25.000001", "USDC"), display_name="Tienda Online", **base)),
        ("max name 64 bytes, max currency", ref.Record(amount=ref.Amount.parse("1", "ABCDEFGHIJKL"), display_name="€" * 21 + "x", **base)),
        ("one-byte name, max amount", ref.Record(amount=ref.Amount(ref.MAX_AMOUNT_MINOR, 18, "ETH"), display_name="A", **dict(base, expires_at=0xFFFFFFFF))),
    ]
    valid = []
    for name, rec in cases:
        enc = rec.encode()
        assert ref.Record.decode(enc) == rec
        valid.append(record_json(rec, enc, name))

    reserved = bytearray(cases[0][1].encode())
    reserved[1] |= 0x80
    dec = ref.Record.decode(bytes(reserved))
    valid.append(record_json(dec, bytes(reserved), "reserved flag bits are ignored", decode_only=True))

    ok = cases[0][1].encode()  # amount present, currency ARS, name "Café Tero"
    open_ok = cases[1][1].encode()
    amt_off = 87  # offset of amountMinor
    cur_len_off = amt_off + 9
    name_len_off = cur_len_off + 1 + 3

    def patch(b: bytes, off: int, new: bytes) -> bytes:
        return b[:off] + new + b[off + len(new) :]

    bad_point = bytearray(pub)
    bad_point[-1] ^= 0x01
    compressed = bytes([0x02 + (pub[-1] & 1)]) + pub[1:33] + b"\x00" * 32
    invalid_inputs = [
        ("empty", b""),
        ("version 2 (prototype)", patch(ok, 0, b"\x02")),
        ("version 1 (prototype bootstrap)", patch(ok, 0, b"\x01")),
        ("version 4", patch(ok, 0, b"\x04")),
        ("truncated in public key", ok[:50]),
        ("truncated before name", ok[: name_len_off]),
        ("truncated inside name", ok[:-1]),
        ("trailing byte", ok + b"\x00"),
        ("public key not on curve", patch(ok, 22, bytes(bad_point))),
        ("public key compressed prefix", patch(ok, 22, compressed)),
        ("scale 19", patch(ok, amt_off + 8, b"\x13")),
        ("amount above 2^63-1", patch(ok, amt_off, (1 << 63).to_bytes(8, "big"))),
        ("currency length 13", patch(ok, cur_len_off, b"\x0d")),
        ("lower-case currency", patch(ok, cur_len_off + 1, b"ars")),
        ("non-ascii currency", patch(ok, cur_len_off + 1, b"A\xc3\x89")),
        ("name length 0", open_ok[:87] + b"\x00"),
        ("name length 65", open_ok[:87] + b"\x41" + b"a" * 65),
        ("name invalid utf-8", open_ok[:87] + b"\x02\xc3\x28"),
        ("open amount but amount bytes present", patch(ok, 1, b"\x00")),
    ]
    invalid = [{"name": n, "hex": h(b), "error": expect_error(ref.Record.decode, b)} for n, b in invalid_inputs]
    return {"valid": valid, "invalid": invalid}


# ── Framing ──────────────────────────────────────────────────────────────────


def framing() -> dict:
    split_cases = [
        ("BUSY, empty payload", ref.T_BUSY, b"", 23),
        ("ERROR expired", ref.T_ERROR, b"\x04", 23),
        ("17 bytes fills one frame at MTU 23", ref.T_DATA, det("f17", 17), 23),
        ("18 bytes needs two frames at MTU 23", ref.T_DATA, det("f18", 18), 23),
        ("START size at MTU 23", ref.T_START, det("f82", 82), 23),
        ("START size at MTU 185", ref.T_START, det("f82", 82), 185),
        ("1000 bytes at MTU 247", ref.T_DATA, det("f1000", 1000), 247),
        ("max message at MTU 23", ref.T_DATA, det("f4096", 4096), 23),
    ]
    split = [
        {"name": n, "type": t, "mtu": m, "payload": h(p), "frames": [h(f) for f in ref.frame(t, p, m)]}
        for n, t, p, m in split_cases
    ]
    for c in split:
        r = ref.Reassembler(ref.TO_COLLECTOR | ref.TO_PAYER, c["mtu"])
        res = [r.push(bytes.fromhex(f)) for f in c["frames"]]
        assert res[-1] == (c["type"], bytes.fromhex(c["payload"])) and all(x is None for x in res[:-1])

    split_errors = [
        {"name": "message above 4096", "type": ref.T_DATA, "mtu": 517, "payloadLength": 4097,
         "error": expect_error(ref.frame, ref.T_DATA, b"\x00" * 4097, 517)},
        {"name": "MTU below 23", "type": ref.T_DATA, "mtu": 22, "payloadLength": 10,
         "error": expect_error(ref.frame, ref.T_DATA, b"\x00" * 10, 22)},
    ]

    def fr(t, seq, total, payload=b"\xaa") -> bytes:
        return bytes([t, seq, total]) + payload

    big = [fr(ref.T_DATA, i, 9, b"\xbb" * 511) for i in range(9)]
    reassembly = [
        ("valid two-frame DATA", "toPayer", 23, [fr(2, 0, 2, b"\x01" * 17), fr(2, 1, 2, b"\x02")]),
        ("valid short chunks are accepted", "toPayer", 23, [fr(2, 0, 3, b"\x01"), fr(2, 1, 3, b"\x02\x03"), fr(2, 2, 3, b"\x04")]),
        ("valid empty BUSY", "toPayer", 23, [bytes([0x7E, 0, 1])]),
        ("valid ACK to collector", "toCollector", 23, [fr(3, 0, 1, b"\x11" * 16)]),
        ("frame shorter than header", "toPayer", 23, [b"\x02\x00"]),
        ("frame longer than MTU-3", "toPayer", 23, [fr(2, 0, 1, b"\x00" * 18)]),
        ("DATA sent to collector", "toCollector", 23, [fr(2, 0, 1)]),
        ("START sent to payer", "toPayer", 23, [fr(1, 0, 1)]),
        ("unknown type", "toPayer", 23, [fr(0x10, 0, 1)]),
        ("total zero", "toPayer", 23, [fr(2, 0, 0)]),
        ("seq not starting at zero", "toPayer", 23, [fr(2, 1, 2)]),
        ("seq skips", "toPayer", 23, [fr(2, 0, 3), fr(2, 2, 3)]),
        ("seq >= total", "toPayer", 23, [fr(2, 0, 2), fr(2, 2, 2)]),
        ("type changes mid-message", "toPayer", 23, [fr(2, 0, 2), fr(0x7F, 1, 2)]),
        ("total changes mid-message", "toPayer", 23, [fr(2, 0, 2), fr(2, 1, 3)]),
        ("new message before previous completed", "toPayer", 23, [fr(2, 0, 2), fr(2, 0, 2)]),
        ("empty payload in multi-frame message", "toPayer", 23, [fr(2, 0, 2, b"")]),
        ("reassembled above 4096", "toPayer", 517, big),
    ]
    reassemble = []
    for name, direction, mtu, frames in reassembly:
        allowed = ref.TO_PAYER if direction == "toPayer" else ref.TO_COLLECTOR
        r = ref.Reassembler(allowed, mtu)
        entry = {"name": name, "direction": direction, "mtu": mtu, "frames": [h(f) for f in frames]}
        result = None
        for i, f in enumerate(frames):
            try:
                result = r.push(f)
            except ref.ProtocolError as e:
                assert i == len(frames) - 1, f"{name}: error must be raised on the last frame"
                entry["error"] = str(e)
                break
            assert (result is None) == (i < len(frames) - 1), name
        else:
            entry["expect"] = {"type": result[0], "payload": h(result[1])}
        reassemble.append(entry)
    return {"split": split, "splitErrors": split_errors, "reassemble": reassemble}


# ── Messages ─────────────────────────────────────────────────────────────────


def messages() -> dict:
    _, _, payer_pub = keypair("msg-payer")
    sid = det("msg-session", 16)
    start = ref.encode_start(sid, payer_pub)
    bad_point = bytearray(payer_pub)
    bad_point[10] ^= 0xFF

    def env_err(b: bytes) -> str:
        return expect_error(ref.decode_envelope, b)

    return {
        "start": {"sessionId": h(sid), "payerPublicKey": h(payer_pub), "hex": h(start)},
        "startInvalid": [
            {"name": n, "hex": h(b), "error": expect_error(ref.decode_start, b)}
            for n, b in [
                ("81 bytes", start[:-1]),
                ("83 bytes", start + b"\x00"),
                ("version 2", b"\x02" + start[1:]),
                ("key not on curve", start[:17] + bytes(bad_point)),
            ]
        ],
        "envelope": [
            {"token": t, "hex": h(ref.encode_envelope(t))}
            for t in ["v4.local.abc", "v4.public.ñandú"]
        ],
        "envelopeInvalid": [
            {"name": "content type 2", "hex": "02" + b"x".hex(), "error": env_err(b"\x02x")},
            {"name": "content type only", "hex": "01", "error": env_err(b"\x01")},
            {"name": "empty", "hex": "", "error": env_err(b"")},
            {"name": "invalid utf-8 token", "hex": "01c328", "error": env_err(b"\x01\xc3\x28")},
        ],
        "abortReasons": {
            "user_cancelled": 0x00, "decrypt_failed": 0x01, "unsupported_content": 0x02,
            "protocol_error": 0x03, "timeout": 0x04, "other": 0xFF,
        },
        "errorCodes": {
            "malformed": 0x01, "unsupported_version": 0x02, "session_mismatch": 0x03, "expired": 0x04,
            "invalid_key": 0x05, "bad_ack": 0x06, "timeout": 0x07, "internal": 0x08,
        },
    }


# ── Handshakes ───────────────────────────────────────────────────────────────


def handshake(name: str, label: str, amount, display_name: str, token_len: int, mtus: list[int]) -> dict:
    c_scalar, c_priv, c_pub = keypair(f"{label}/collector")
    p_scalar, p_priv, p_pub = keypair(f"{label}/payer")
    sid = det(f"{label}/session", 16)
    record = ref.Record(1792800000, sid, c_pub, amount, display_name).encode()
    start = ref.encode_start(sid, p_pub)
    keys = ref.derive_keys(c_priv, p_pub, record, start)
    assert ref.derive_keys(p_priv, c_pub, record, start) == keys
    token = det_token(f"{label}/token", token_len)
    envelope = ref.encode_envelope(token)
    nonce = det(f"{label}/nonce", 12)
    data = ref.seal_data(keys, nonce, envelope)
    assert ref.open_data(keys, data) == envelope
    ack = ref.ack_mac(keys, envelope)
    assert ref.verify_ack(keys, envelope, ack)

    tampered = bytearray(data)
    tampered[20] ^= 0x01
    assert expect_error(ref.open_data, keys, bytes(tampered)) == "decrypt_failed"
    bad_ack = bytearray(ack)
    bad_ack[0] ^= 0x80
    assert not ref.verify_ack(keys, envelope, bytes(bad_ack))

    return {
        "name": name,
        "collectorPrivateKey": h(c_scalar),
        "collectorPublicKey": h(c_pub),
        "payerPrivateKey": h(p_scalar),
        "payerPublicKey": h(p_pub),
        "sessionId": h(sid),
        "record": h(record),
        "start": h(start),
        "sharedSecret": h(keys.shared_secret),
        "transcriptHash": h(keys.transcript_hash),
        "prk": h(keys.prk),
        "dataKey": h(keys.data_key),
        "ackKey": h(keys.ack_key),
        "token": token,
        "envelope": h(envelope),
        "nonce": h(nonce),
        "data": h(data),
        "ack": h(ack),
        "tamperedData": h(bytes(tampered)),
        "tamperedAck": h(bytes(bad_ack)),
        "frames": [
            {
                "mtu": m,
                "start": [h(f) for f in ref.frame(ref.T_START, start, m)],
                "data": [h(f) for f in ref.frame(ref.T_DATA, data, m)],
                "ack": [h(f) for f in ref.frame(ref.T_ACK, ack, m)],
            }
            for m in mtus
        ],
    }


def handshakes() -> list[dict]:
    return [
        handshake("ARS 12.50, typical token", "hs1", ref.Amount.parse("12.50", "ARS"), "Café Tero", 290, [23, 185]),
        handshake("open amount, long token", "hs2", None, "Kiosko 24", 1500, [23, 247, 517]),
        handshake("max-size token", "hs3", ref.Amount.parse("0.000001", "USDC"), "Max", 4067, [23, 517]),
    ]


def build() -> dict:
    return {
        "description": "Fluxis BLE Handoff Protocol v3 test vectors. Generated by "
        "reference/generate_vectors.py — do not edit by hand. Spec: docs/ble-protocol.md.",
        "protocolVersion": ref.PROTOCOL_VERSION,
        "uuids": {
            "service": ref.SERVICE_UUID,
            "record": ref.RECORD_UUID,
            "control": ref.CONTROL_UUID,
            "data": ref.DATA_UUID,
            "cccd": ref.CCCD_UUID,
        },
        "messageTypes": {"start": ref.T_START, "data": ref.T_DATA, "ack": ref.T_ACK,
                         "abort": ref.T_ABORT, "busy": ref.T_BUSY, "error": ref.T_ERROR},
        "amounts": amounts(),
        "records": records(),
        "framing": framing(),
        "messages": messages(),
        "handshakes": handshakes(),
    }


def main() -> int:
    text = json.dumps(build(), indent=2, ensure_ascii=False) + "\n"
    if "--check" in sys.argv:
        if not OUT.exists() or OUT.read_text(encoding="utf-8") != text:
            print(f"{OUT} is out of date; run generate_vectors.py", file=sys.stderr)
            return 1
        print("vectors.json is up to date")
        return 0
    OUT.write_text(text, encoding="utf-8")
    print(f"wrote {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
