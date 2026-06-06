"""NASPIP helper tests."""

from __future__ import annotations

from fluxis.resources.naspip import AsyncNaspipResource, NaspipResource


class _DummyClient:
    pass


def test_is_valid_token_format_sync() -> None:
    naspip = NaspipResource(_DummyClient())  # type: ignore[arg-type]
    assert naspip.is_valid_token_format("v4.local.abc123xyz") is True
    assert naspip.is_valid_token_format("v4.local.Gx1TZT3STnhzZ-0o") is True
    assert naspip.is_valid_token_format("v3.local.abc") is False
    assert naspip.is_valid_token_format("not-a-token") is False
    assert naspip.is_valid_token_format("") is False


def test_is_valid_token_format_async() -> None:
    naspip = AsyncNaspipResource(_DummyClient())  # type: ignore[arg-type]
    assert naspip.is_valid_token_format("v4.local.abc123xyz") is True
    assert naspip.is_valid_token_format("v3.local.abc") is False
