"""Pytest fixtures and environment loading."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator, Iterator
from pathlib import Path

import pytest

from fluxis import AsyncFluxisClient, FluxisClient

PACKAGE_ROOT = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv(PACKAGE_ROOT / ".env")


@pytest.fixture
def fluxis_credentials() -> dict[str, str]:
    api_key = os.environ.get("FLUXIS_API_KEY", "")
    api_secret = os.environ.get("FLUXIS_API_SECRET", "")
    if not api_key or not api_secret:
        pytest.skip("FLUXIS_API_KEY and FLUXIS_API_SECRET are required for integration tests")
    return {"api_key": api_key, "api_secret": api_secret}


@pytest.fixture
def sync_client(fluxis_credentials: dict[str, str]) -> Iterator[FluxisClient]:
    with FluxisClient(
        api_key=fluxis_credentials["api_key"],
        api_secret=fluxis_credentials["api_secret"],
    ) as client:
        yield client


@pytest.fixture
async def async_client(fluxis_credentials: dict[str, str]) -> AsyncIterator[AsyncFluxisClient]:
    async with AsyncFluxisClient(
        api_key=fluxis_credentials["api_key"],
        api_secret=fluxis_credentials["api_secret"],
    ) as client:
        yield client
