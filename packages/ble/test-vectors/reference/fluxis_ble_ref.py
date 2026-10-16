"""Reference implementation of the Fluxis BLE Handoff Protocol, version 3.

Normative spec: docs/ble-protocol.md. This module exists to generate and self-check the shared
test vectors; it is not shipped. It favours obviousness over speed.
"""

from __future__ import annotations

import hashlib
import hmac
import re
import struct
from dataclasses import dataclass
from typing import Optional

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDFExpand

PROTOCOL_VERSION = 3

SERVICE_UUID = "f1b10100-6ff9-4bf4-a699-f9b7aa31119b"
RECORD_UUID = "f1b10101-6ff9-4bf4-a699-f9b7aa31119b"
CONTROL_UUID = "f1b10102-6ff9-4bf4-a699-f9b7aa31119b"
DATA_UUID = "f1b10103-6ff9-4bf4-a699-f9b7aa31119b"
CCCD_UUID = "00002902-0000-1000-8000-00805f9b34fb"

FLAG_AMOUNT_PRESENT = 0x01

MAX_MESSAGE = 4096
MAX_FRAMES = 255
DEFAULT_MTU = 23
FRAME_HEADER = 3
MAX_NAME_BYTES = 64
MAX_CURRENCY = 12
MAX_SCALE = 18
MAX_AMOUNT_MINOR = (1 << 63) - 1
PUBLIC_KEY_LEN = 65
SESSION_ID_LEN = 16
NONCE_LEN = 12
TAG_LEN = 16
ACK_LEN = 16
START_LEN = 1 + SESSION_ID_LEN + PUBLIC_KEY_LEN

T_START, T_DATA, T_ACK, T_ABORT, T_BUSY, T_ERROR = 0x01, 0x02, 0x03, 0x04, 0x7E, 0x7F
TO_COLLECTOR = {T_START, T_ACK, T_ABORT}
TO_PAYER = {T_DATA, T_BUSY, T_ERROR}

CONTENT_NASPIP = 0x01

LABEL_TRANSCRIPT = b"fluxis-ble/3/transcript"
LABEL_DATA = b"fluxis-ble/3/data"
LABEL_ACK = b"fluxis-ble/3/ack"

_CURRENCY_RE = re.compile(r"[A-Z0-9]*")
_DECIMAL_RE = re.compile(r"(0|[1-9][0-9]*)(\.[0-9]+)?")


class ProtocolError(ValueError):
    """Raised for any input that the spec says MUST be rejected."""


# ── Amount ───────────────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Amount:
    minor: int
    scale: int
    currency: str  # "" = unspecified

    def __post_init__(self) -> None:
        if not (0 <= self.minor <= MAX_AMOUNT_MINOR):
            raise ProtocolError("amount_out_of_range")
        if not (0 <= self.scale <= MAX_SCALE):
            raise ProtocolError("scale_out_of_range")
        if len(self.currency) > MAX_CURRENCY or not _CURRENCY_RE.fullmatch(self.currency):
            raise ProtocolError("invalid_currency")

    @staticmethod
    def parse(decimal: str, currency: str = "") -> "Amount":
        if not _DECIMAL_RE.fullmatch(decimal):
            raise ProtocolError("invalid_decimal")
        whole, _, frac = decimal.partition(".")
        scale = len(frac)
        if scale > MAX_SCALE:
            raise ProtocolError("scale_out_of_range")
        minor = int(whole + frac)
        return Amount(minor, scale, currency)

    def to_decimal_string(self) -> str:
        if self.scale == 0:
            return str(self.minor)
        digits = str(self.minor).rjust(self.scale + 1, "0")
        return f"{digits[:-self.scale]}.{digits[-self.scale:]}"


# ── Discovery record ─────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Record:
    expires_at: int
    session_id: bytes
    collector_public_key: bytes
    amount: Optional[Amount]
    display_name: str
    flags: int = 0  # extra (reserved) bits only; AMOUNT_PRESENT is derived

    def encode(self) -> bytes:
        if not (0 <= self.expires_at <= 0xFFFFFFFF):
            raise ProtocolError("expires_at_out_of_range")
        if len(self.session_id) != SESSION_ID_LEN:
            raise ProtocolError("invalid_session_id")
        validate_public_key(self.collector_public_key)
        name = self.display_name.encode("utf-8")
        if not (1 <= len(name) <= MAX_NAME_BYTES):
            raise ProtocolError("invalid_display_name")
        flags = (self.flags & ~FLAG_AMOUNT_PRESENT) | (FLAG_AMOUNT_PRESENT if self.amount else 0)
        out = bytearray([PROTOCOL_VERSION, flags])
        out += struct.pack(">I", self.expires_at)
        out += self.session_id + self.collector_public_key
        if self.amount is not None:
            cur = self.amount.currency.encode("ascii")
            out += struct.pack(">QBB", self.amount.minor, self.amount.scale, len(cur)) + cur
        out += bytes([len(name)]) + name
        return bytes(out)

    @staticmethod
    def decode(data: bytes) -> "Record":
        r = _Reader(data)
        version = r.u8()
        if version != PROTOCOL_VERSION:
            raise ProtocolError("unsupported_version")
        flags = r.u8()
        expires_at = r.u32()
        session_id = r.take(SESSION_ID_LEN)
        pub = r.take(PUBLIC_KEY_LEN)
        validate_public_key(pub)
        amount = None
        if flags & FLAG_AMOUNT_PRESENT:
            minor = r.u64()
            scale = r.u8()
            cur_len = r.u8()
            if cur_len > MAX_CURRENCY:
                raise ProtocolError("invalid_currency")
            cur_raw = r.take(cur_len)
            try:
                cur = cur_raw.decode("ascii")
            except UnicodeDecodeError as e:
                raise ProtocolError("invalid_currency") from e
            amount = Amount(minor, scale, cur)
        name_len = r.u8()
        if not (1 <= name_len <= MAX_NAME_BYTES):
            raise ProtocolError("invalid_display_name")
        try:
            name = r.take(name_len).decode("utf-8")
        except UnicodeDecodeError as e:
            raise ProtocolError("invalid_display_name") from e
        if r.remaining():
            raise ProtocolError("trailing_bytes")
        return Record(expires_at, session_id, pub, amount, name, flags & ~FLAG_AMOUNT_PRESENT)


class _Reader:
    def __init__(self, data: bytes) -> None:
        self.data, self.pos = data, 0

    def take(self, n: int) -> bytes:
        if self.pos + n > len(self.data):
            raise ProtocolError("truncated")
        out = self.data[self.pos : self.pos + n]
        self.pos += n
        return out

    def u8(self) -> int:
        return self.take(1)[0]

    def u32(self) -> int:
        return struct.unpack(">I", self.take(4))[0]

    def u64(self) -> int:
        return struct.unpack(">Q", self.take(8))[0]

    def remaining(self) -> int:
        return len(self.data) - self.pos


# ── Framing ──────────────────────────────────────────────────────────────────


def max_payload(mtu: int) -> int:
    if mtu < DEFAULT_MTU:
        raise ProtocolError("mtu_too_small")
    return mtu - 3 - FRAME_HEADER


def frame(msg_type: int, payload: bytes, mtu: int) -> list[bytes]:
    if len(payload) > MAX_MESSAGE:
        raise ProtocolError("message_too_large")
    size = max_payload(mtu)
    chunks = [payload[i : i + size] for i in range(0, len(payload), size)] or [b""]
    if len(chunks) > MAX_FRAMES:
        raise ProtocolError("too_many_frames")
    return [bytes([msg_type, i, len(chunks)]) + c for i, c in enumerate(chunks)]


class Reassembler:
    """One instance per connection and direction."""

    def __init__(self, allowed_types: set[int], mtu: Optional[int] = None) -> None:
        self.allowed, self.mtu = allowed_types, mtu
        self._reset()

    def _reset(self) -> None:
        self.type = self.total = None
        self.next_seq = 0
        self.buf = bytearray()

    def push(self, f: bytes) -> Optional[tuple[int, bytes]]:
        """Returns (type, payload) when a message completes, None if more frames are needed."""
        try:
            return self._push(f)
        except ProtocolError:
            self._reset()
            raise

    def _push(self, f: bytes) -> Optional[tuple[int, bytes]]:
        if len(f) < FRAME_HEADER:
            raise ProtocolError("frame_too_short")
        if self.mtu is not None and len(f) > self.mtu - 3:
            raise ProtocolError("frame_too_long")
        t, seq, total = f[0], f[1], f[2]
        payload = f[3:]
        if t not in self.allowed:
            raise ProtocolError("unexpected_type")
        if total == 0 or seq >= total:
            raise ProtocolError("bad_sequence")
        if self.type is None:
            if seq != 0:
                raise ProtocolError("bad_sequence")
            self.type, self.total = t, total
        elif seq == 0:
            raise ProtocolError("interleaved_message")
        elif t != self.type or total != self.total:
            raise ProtocolError("inconsistent_frame")
        if seq != self.next_seq:
            raise ProtocolError("bad_sequence")
        if not payload and total > 1:
            raise ProtocolError("empty_frame")
        self.buf += payload
        if len(self.buf) > MAX_MESSAGE:
            raise ProtocolError("message_too_large")
        self.next_seq += 1
        if self.next_seq == self.total:
            out = (self.type, bytes(self.buf))
            self._reset()
            return out
        return None


# ── Crypto ───────────────────────────────────────────────────────────────────


def private_key_from_scalar(scalar: bytes) -> ec.EllipticCurvePrivateKey:
    return ec.derive_private_key(int.from_bytes(scalar, "big"), ec.SECP256R1())


def public_key_bytes(priv: ec.EllipticCurvePrivateKey) -> bytes:
    return priv.public_key().public_bytes(
        serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
    )


def validate_public_key(pub: bytes) -> ec.EllipticCurvePublicKey:
    if len(pub) != PUBLIC_KEY_LEN or pub[0] != 0x04:
        raise ProtocolError("invalid_key")
    try:
        return ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), pub)
    except ValueError as e:
        raise ProtocolError("invalid_key") from e


def ecdh(priv: ec.EllipticCurvePrivateKey, peer_pub: bytes) -> bytes:
    return priv.exchange(ec.ECDH(), validate_public_key(peer_pub))


def sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def hkdf_extract(salt: bytes, ikm: bytes) -> bytes:
    return hmac.new(salt, ikm, hashlib.sha256).digest()


def hkdf_expand(prk: bytes, info: bytes, length: int) -> bytes:
    return HKDFExpand(hashes.SHA256(), length, info).derive(prk)


def encode_start(session_id: bytes, payer_pub: bytes) -> bytes:
    if len(session_id) != SESSION_ID_LEN:
        raise ProtocolError("invalid_session_id")
    validate_public_key(payer_pub)
    return bytes([PROTOCOL_VERSION]) + session_id + payer_pub


def decode_start(payload: bytes) -> tuple[bytes, bytes]:
    if len(payload) != START_LEN:
        raise ProtocolError("malformed")
    if payload[0] != PROTOCOL_VERSION:
        raise ProtocolError("unsupported_version")
    session_id, pub = payload[1:17], payload[17:]
    validate_public_key(pub)
    return session_id, pub


@dataclass(frozen=True)
class Keys:
    shared_secret: bytes
    transcript_hash: bytes
    prk: bytes
    data_key: bytes
    ack_key: bytes


def derive_keys(own_priv: ec.EllipticCurvePrivateKey, peer_pub: bytes, record: bytes, start: bytes) -> Keys:
    z = ecdh(own_priv, peer_pub)
    th = sha256(LABEL_TRANSCRIPT + record + start)
    prk = hkdf_extract(th, z)
    return Keys(z, th, prk, hkdf_expand(prk, LABEL_DATA, 32), hkdf_expand(prk, LABEL_ACK, 32))


def encode_envelope(token: str) -> bytes:
    content = token.encode("utf-8")
    if not content:
        raise ProtocolError("empty_token")
    env = bytes([CONTENT_NASPIP]) + content
    if NONCE_LEN + len(env) + TAG_LEN > MAX_MESSAGE:
        raise ProtocolError("message_too_large")
    return env


def decode_envelope(env: bytes) -> str:
    if len(env) < 2:
        raise ProtocolError("malformed")
    if env[0] != CONTENT_NASPIP:
        raise ProtocolError("unsupported_content")
    try:
        return env[1:].decode("utf-8")
    except UnicodeDecodeError as e:
        raise ProtocolError("malformed") from e


def seal_data(keys: Keys, nonce: bytes, envelope: bytes) -> bytes:
    if len(nonce) != NONCE_LEN:
        raise ProtocolError("invalid_nonce")
    return nonce + AESGCM(keys.data_key).encrypt(nonce, envelope, keys.transcript_hash)


def open_data(keys: Keys, data: bytes) -> bytes:
    if len(data) < NONCE_LEN + TAG_LEN + 2:
        raise ProtocolError("malformed")
    try:
        return AESGCM(keys.data_key).decrypt(data[:NONCE_LEN], data[NONCE_LEN:], keys.transcript_hash)
    except Exception as e:  # cryptography raises InvalidTag
        raise ProtocolError("decrypt_failed") from e


def ack_mac(keys: Keys, envelope: bytes) -> bytes:
    return hmac.new(keys.ack_key, keys.transcript_hash + sha256(envelope), hashlib.sha256).digest()[:ACK_LEN]


def verify_ack(keys: Keys, envelope: bytes, ack: bytes) -> bool:
    return len(ack) == ACK_LEN and hmac.compare_digest(ack_mac(keys, envelope), ack)
