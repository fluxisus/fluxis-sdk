"""NASPIP resource."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fluxis.models.naspip import CreateNaspipRequest, CreateNaspipResponse, ReadNaspipResponse

if TYPE_CHECKING:
    from fluxis.client import AsyncFluxisClient, FluxisClient


class NaspipResource:
    def __init__(self, client: FluxisClient) -> None:
        self._client = client

    def create(self, data: CreateNaspipRequest) -> CreateNaspipResponse:
        result = self._client.request("POST", "/naspip/create", data)
        return CreateNaspipResponse.from_dict(result)

    def read(self, token: str) -> ReadNaspipResponse:
        data = self._client.request("POST", "/naspip/read", {"token": token})
        return ReadNaspipResponse.from_dict(data)

    def is_valid_token_format(self, token: str) -> bool:
        return token.startswith("v4.local.")


class AsyncNaspipResource:
    def __init__(self, client: AsyncFluxisClient) -> None:
        self._client = client

    async def create(self, data: CreateNaspipRequest) -> CreateNaspipResponse:
        result = await self._client.request("POST", "/naspip/create", data)
        return CreateNaspipResponse.from_dict(result)

    async def read(self, token: str) -> ReadNaspipResponse:
        data = await self._client.request("POST", "/naspip/read", {"token": token})
        return ReadNaspipResponse.from_dict(data)

    def is_valid_token_format(self, token: str) -> bool:
        return token.startswith("v4.local.")
