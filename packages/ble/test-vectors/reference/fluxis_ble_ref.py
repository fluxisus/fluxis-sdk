"""Reference implementation of the Fluxis BLE Protocol, version 3 (preview only).

Normative spec: docs/ble-protocol.md. This module exists to generate and self-check the shared
test vectors; it is not shipped. It favours obviousness over speed. Standard library only.
"""

from __future__ import annotations

import re
import struct
import uuid
from dataclasses import dataclass
from typing import Optional, Union

PROTOCOL_VERSION = 3

SERVICE_UUID = "f1b10100-6ff9-4bf4-a699-f9b7aa31119b"
RECORD_UUID = "f1b10101-6ff9-4bf4-a699-f9b7aa31119b"
PREVIEW_UUID = "f1b10104-6ff9-4bf4-a699-f9b7aa31119b"

FLAG_AMOUNT_PRESENT = 0x01

MAX_ATTRIBUTE = 512
SESSION_ID_LEN = 16
PREVIEW_HEADER = 1 + SESSION_ID_LEN + 1
MAX_PREVIEW_TOKEN = MAX_ATTRIBUTE - PREVIEW_HEADER  # 494
MAX_NAME_BYTES = 64
MAX_CURRENCY = 12
MAX_SCALE = 18
MAX_AMOUNT_MINOR = (1 << 63) - 1
MAX_RECORD = 1 + 1 + SESSION_ID_LEN + 8 + 1 + 1 + MAX_CURRENCY + 1 + MAX_NAME_BYTES  # 105
T_IDLE_MS = 15_000

KIND_NASPIP = 0x01
KIND_POS_ID = 0x02

_CURRENCY_RE = re.compile(r"[A-Z0-9]*")
_DECIMAL_RE = re.compile(r"(0|[1-9][0-9]*)(\.[0-9]+)?")


class ProtocolError(ValueError):
    """Raised for any input that the spec says MUST be rejected."""


class _Reader:
    def __init__(self, data: bytes) -> None:
        self.data = data
        self.pos = 0

    def take(self, n: int) -> bytes:
        if n < 0 or self.pos + n > len(self.data):
            raise ProtocolError("truncated")
        out = self.data[self.pos : self.pos + n]
        self.pos += n
        return out

    def u8(self) -> int:
        return self.take(1)[0]

    def u64(self) -> int:
        return struct.unpack(">Q", self.take(8))[0]

    def remaining(self) -> int:
        return len(self.data) - self.pos


def _utf8_strict(b: bytes) -> Optional[str]:
    try:
        return b.decode("utf-8", errors="strict")
    except UnicodeDecodeError:
        return None


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
        return Amount(int(whole + frac), scale, currency)

    def to_decimal_string(self) -> str:
        if self.scale == 0:
            return str(self.minor)
        digits = str(self.minor).rjust(self.scale + 1, "0")
        return f"{digits[:-self.scale]}.{digits[-self.scale:]}"


# ── Discovery record ─────────────────────────────────────────────────────────


@dataclass(frozen=True)
class Record:
    session_id: bytes
    amount: Optional[Amount]
    display_name: str

    def encode(self) -> bytes:
        if len(self.session_id) != SESSION_ID_LEN:
            raise ProtocolError("invalid_session_id")
        name = self.display_name.encode("utf-8")
        if not (1 <= len(name) <= MAX_NAME_BYTES):
            raise ProtocolError("invalid_display_name")
        out = bytearray([PROTOCOL_VERSION, FLAG_AMOUNT_PRESENT if self.amount else 0])
        out += self.session_id
        if self.amount is not None:
            cur = self.amount.currency.encode("ascii")
            out += struct.pack(">QBB", self.amount.minor, self.amount.scale, len(cur)) + cur
        out += bytes([len(name)]) + name
        return bytes(out)

    @staticmethod
    def decode(data: bytes) -> "Record":
        r = _Reader(data)
        if r.u8() != PROTOCOL_VERSION:
            raise ProtocolError("unsupported_version")
        flags = r.u8()
        session_id = r.take(SESSION_ID_LEN)
        amount = None
        if flags & FLAG_AMOUNT_PRESENT:
            minor = r.u64()
            scale = r.u8()
            cur_len = r.u8()
            if cur_len > MAX_CURRENCY:
                raise ProtocolError("invalid_currency")
            cur = r.take(cur_len)
            if any(c >= 0x80 for c in cur):
                raise ProtocolError("invalid_currency")
            amount = Amount(minor, scale, cur.decode("ascii"))
        name_len = r.u8()
        if not (1 <= name_len <= MAX_NAME_BYTES):
            raise ProtocolError("invalid_display_name")
        name = _utf8_strict(r.take(name_len))
        if name is None:
            raise ProtocolError("invalid_display_name")
        if r.remaining():
            raise ProtocolError("trailing_bytes")
        return Record(session_id, amount, name)


# ── Preview ──────────────────────────────────────────────────────────────────

Content = Union[str, uuid.UUID]  # str = NASPIP token, UUID = POS id


@dataclass(frozen=True)
class Preview:
    session_id: bytes
    content: Content

    def encode(self) -> bytes:
        if len(self.session_id) != SESSION_ID_LEN:
            raise ProtocolError("invalid_session_id")
        head = bytes([PROTOCOL_VERSION]) + self.session_id
        if isinstance(self.content, uuid.UUID):
            return head + bytes([KIND_POS_ID]) + self.content.bytes
        token = self.content.encode("utf-8")
        if not token:
            raise ProtocolError("invalid_token")
        out = head + bytes([KIND_NASPIP]) + token
        if len(out) > MAX_ATTRIBUTE:
            raise ProtocolError("preview_too_large")
        return out

    @staticmethod
    def for_token(session_id: bytes, token: str, pos_id: Optional[uuid.UUID]) -> "Preview":
        """The collector's choice: the token if it fits, else the POS id (spec §4.2)."""
        raw = token.encode("utf-8")
        if not raw:
            raise ProtocolError("invalid_token")
        if len(raw) <= MAX_PREVIEW_TOKEN:
            return Preview(session_id, token)
        if pos_id is None:
            raise ProtocolError("preview_too_large")
        return Preview(session_id, pos_id)

    @staticmethod
    def decode(data: bytes) -> "Preview":
        if len(data) > MAX_ATTRIBUTE:
            raise ProtocolError("preview_too_large")
        r = _Reader(data)
        if r.u8() != PROTOCOL_VERSION:
            raise ProtocolError("unsupported_version")
        session_id = r.take(SESSION_ID_LEN)
        kind = r.u8()
        rest = r.take(r.remaining())
        if kind == KIND_NASPIP:
            token = _utf8_strict(rest)
            if not rest or token is None:
                raise ProtocolError("invalid_token")
            return Preview(session_id, token)
        if kind == KIND_POS_ID:
            if len(rest) != 16:
                raise ProtocolError("invalid_pos_id")
            return Preview(session_id, uuid.UUID(bytes=rest))
        raise ProtocolError("unsupported_content")
