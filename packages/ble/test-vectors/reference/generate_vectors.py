#!/usr/bin/env python3
"""Generate packages/ble/test-vectors/vectors.json from the reference implementation.

    python3 generate_vectors.py          # rewrite vectors.json
    python3 generate_vectors.py --check  # exit 1 if vectors.json is out of date

All keys, nonces and tokens are derived from fixed labels, so the output is reproducible.
"""

from __future__ import annotations

import hashlib
import json
import uuid
import sys
from pathlib import Path

import fluxis_ble_ref as ref

OUT = Path(__file__).resolve().parent.parent / "vectors.json"


def det(label: str, n: int) -> bytes:
    out, counter = b"", 0
    while len(out) < n:
        out += hashlib.sha256(f"fluxis-ble-vectors/{label}/{counter}".encode()).digest()
        counter += 1
    return out[:n]


def det_token(label: str, length: int) -> str:
    """A NASPIP-shaped ASCII string of exactly `length` bytes (not a real token)."""
    body = det(label, length).hex()
    while len(body) < length:
        body += body
    return ("naspip;fluxis.us;fluxis.qr.dyn.1;v4.public." + body)[:length]


def h(b: bytes) -> str:
    return b.hex()


def expect_error(fn, *args) -> str:
    try:
        fn(*args)
    except ref.ProtocolError as e:
        return str(e)
    raise AssertionError(f"expected ProtocolError from {fn.__name__}{args!r}")


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


def amount_json(a):
    return None if a is None else {"minor": str(a.minor), "scale": a.scale, "currency": a.currency}


def record_json(rec: ref.Record, encoded: bytes, name: str, decode_only: bool = False) -> dict:
    out = {
        "name": name,
        "hex": h(encoded),
        "sessionId": h(rec.session_id),
        "amount": amount_json(rec.amount),
        "displayName": rec.display_name,
    }
    if decode_only:
        out["decodeOnly"] = True
    return out


def records() -> dict:
    sid = det("record-session", 16)
    cases = [
        ("amount ARS 12.50, accented name", ref.Record(sid, ref.Amount.parse("12.50", "ARS"), "Café Tero")),
        ("open amount", ref.Record(sid, None, "Kiosko 24")),
        ("amount without currency", ref.Record(sid, ref.Amount.parse("999.99"), "POS 1")),
        ("USDC 6 decimals", ref.Record(sid, ref.Amount.parse("25.000001", "USDC"), "Tienda Online")),
        ("max size: 64-byte name, 12-char currency", ref.Record(sid, ref.Amount.parse("1", "ABCDEFGHIJKL"), "€" * 21 + "x")),
        ("one-byte name, max amount", ref.Record(sid, ref.Amount(ref.MAX_AMOUNT_MINOR, 18, "ETH"), "A")),
    ]
    valid = []
    for name, rec in cases:
        enc = rec.encode()
        assert ref.Record.decode(enc) == rec
        valid.append(record_json(rec, enc, name))
    assert len(cases[4][1].encode()) == ref.MAX_RECORD

    reserved = bytearray(cases[0][1].encode())
    reserved[1] |= 0x80
    valid.append(record_json(ref.Record.decode(bytes(reserved)), bytes(reserved), "reserved flag bits are ignored", decode_only=True))

    ok = cases[0][1].encode()  # amount present, currency ARS, name "Café Tero"
    open_ok = cases[1][1].encode()
    amt_off = 18  # offset of amountMinor
    cur_len_off = amt_off + 9
    name_len_off = cur_len_off + 1 + 3

    def patch(b: bytes, off: int, new: bytes) -> bytes:
        return b[:off] + new + b[off + len(new) :]

    invalid_inputs = [
        ("empty", b""),
        ("version 2 (prototype)", patch(ok, 0, b"\x02")),
        ("version 1 (prototype bootstrap)", patch(ok, 0, b"\x01")),
        ("version 4", patch(ok, 0, b"\x04")),
        ("truncated in session id", ok[:10]),
        ("truncated before name", ok[:name_len_off]),
        ("truncated inside name", ok[:-1]),
        ("trailing byte", ok + b"\x00"),
        ("scale 19", patch(ok, amt_off + 8, b"\x13")),
        ("amount above 2^63-1", patch(ok, amt_off, (1 << 63).to_bytes(8, "big"))),
        ("currency length 13", patch(ok, cur_len_off, b"\x0d")),
        ("lower-case currency", patch(ok, cur_len_off + 1, b"ars")),
        ("non-ascii currency", patch(ok, cur_len_off + 1, b"A\xc3\x89")),
        ("name length 0", open_ok[:18] + b"\x00"),
        ("name length 65", open_ok[:18] + b"\x41" + b"a" * 65),
        ("name invalid utf-8", open_ok[:18] + b"\x02\xc3\x28"),
        ("open amount but amount bytes present", patch(ok, 1, b"\x00")),
    ]
    invalid = [{"name": n, "hex": h(b), "error": expect_error(ref.Record.decode, b)} for n, b in invalid_inputs]
    return {"valid": valid, "invalid": invalid}


# ── Previews ─────────────────────────────────────────────────────────────────


def preview_json(p: ref.Preview, encoded: bytes, name: str) -> dict:
    if isinstance(p.content, uuid.UUID):
        content = {"kind": "pos_id", "posId": str(p.content)}
    else:
        content = {"kind": "naspip", "token": p.content}
    return {"name": name, "hex": h(encoded), "sessionId": h(p.session_id), "length": len(encoded), **content}


def previews() -> dict:
    sid = det("preview-session", 16)
    pos = uuid.UUID("d2929894-2582-4877-8f92-ebe861f60987")
    cases = [
        ("naspip, staging-sized token (431 bytes)", ref.Preview(sid, det_token("pv-431", 431))),
        ("naspip, max token (494 bytes, value 512)", ref.Preview(sid, det_token("pv-494", ref.MAX_PREVIEW_TOKEN))),
        ("naspip, one byte", ref.Preview(sid, "x")),
        ("naspip, non-ascii", ref.Preview(sid, "v4.public.ñandú")),
        ("pos_id", ref.Preview(sid, pos)),
    ]
    valid = []
    for name, p in cases:
        enc = p.encode()
        assert ref.Preview.decode(enc) == p
        valid.append(preview_json(p, enc, name))
    assert valid[1]["length"] == ref.MAX_ATTRIBUTE

    # The collector's choice between token and POS id.
    choice_inputs = [
        ("token fits", det_token("ch-431", 431), str(pos)),
        ("token exactly 494 bytes", det_token("ch-494", 494), str(pos)),
        ("token 495 bytes falls back to POS id", det_token("ch-495", 495), str(pos)),
        ("token 1200 bytes falls back to POS id", det_token("ch-1200", 1200), str(pos)),
    ]
    choice = []
    for name, token, pid in choice_inputs:
        p = ref.Preview.for_token(sid, token, uuid.UUID(pid))
        choice.append({"name": name, "sessionId": h(sid), "token": token, "posId": pid, "hex": h(p.encode()),
                       "kind": "pos_id" if isinstance(p.content, uuid.UUID) else "naspip"})
    choice_errors = [
        {"name": "token too large without POS id", "sessionId": h(sid), "token": det_token("ce-495", 495), "posId": None,
         "error": expect_error(ref.Preview.for_token, sid, det_token("ce-495", 495), None)},
        {"name": "empty token", "sessionId": h(sid), "token": "", "posId": str(pos),
         "error": expect_error(ref.Preview.for_token, sid, "", pos)},
    ]

    ok = cases[0][1].encode()
    pos_ok = cases[4][1].encode()
    invalid_inputs = [
        ("empty", b""),
        ("version 2", b"\x02" + ok[1:]),
        ("version 4", b"\x04" + ok[1:]),
        ("truncated in session id", ok[:10]),
        ("no kind", ok[:17]),
        ("naspip without content", ok[:18]),
        ("naspip invalid utf-8", ok[:18] + b"\xc3\x28"),
        ("unknown kind 0x03", ok[:17] + b"\x03" + ok[18:]),
        ("kind 0x00", ok[:17] + b"\x00" + ok[18:]),
        ("pos_id 15 bytes", pos_ok[:-1]),
        ("pos_id 17 bytes", pos_ok + b"\x00"),
        ("value 513 bytes", ok[:18] + b"a" * 495),
    ]
    invalid = [{"name": n, "hex": h(b), "error": expect_error(ref.Preview.decode, b)} for n, b in invalid_inputs]
    return {"valid": valid, "choice": choice, "choiceErrors": choice_errors, "invalid": invalid}


def build() -> dict:
    return {
        "description": "Fluxis BLE Protocol v3 (preview only) test vectors. Generated by "
        "reference/generate_vectors.py — do not edit by hand. Spec: docs/ble-protocol.md.",
        "protocolVersion": ref.PROTOCOL_VERSION,
        "uuids": {"service": ref.SERVICE_UUID, "record": ref.RECORD_UUID, "preview": ref.PREVIEW_UUID},
        "limits": {
            "maxAttributeBytes": ref.MAX_ATTRIBUTE,
            "maxPreviewTokenBytes": ref.MAX_PREVIEW_TOKEN,
            "maxRecordBytes": ref.MAX_RECORD,
            "sessionIdBytes": ref.SESSION_ID_LEN,
            "maxDisplayNameBytes": ref.MAX_NAME_BYTES,
            "idleTimeoutMs": ref.T_IDLE_MS,
        },
        "previewKinds": {"naspip": ref.KIND_NASPIP, "pos_id": ref.KIND_POS_ID},
        "amounts": amounts(),
        "records": records(),
        "previews": previews(),
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
