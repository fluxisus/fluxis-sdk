"""Organization resource."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fluxis.models.account import SettlementAddressRequest, SettlementAddressResponse
from fluxis.models.organization import Organization, parse_settlement_address_list

if TYPE_CHECKING:
    from fluxis.client import AsyncFluxisClient, FluxisClient


class OrganizationResource:
    def __init__(self, client: FluxisClient) -> None:
        self._client = client

    def get(self) -> Organization:
        data = self._client.request("GET", "/organization")
        return Organization.from_dict(data)

    def get_settlement_addresses(self) -> list[SettlementAddressResponse]:
        data = self._client.request("GET", "/organization/settlement-addresses")
        return parse_settlement_address_list(data)

    def set_settlement_address(self, data: SettlementAddressRequest) -> SettlementAddressResponse:
        result = self._client.request("POST", "/organization/settlement-addresses", data)
        return SettlementAddressResponse.from_dict(result)

    def update_settlement_address(
        self,
        data: SettlementAddressRequest,
    ) -> SettlementAddressResponse:
        result = self._client.request("PUT", "/organization/settlement-addresses", data)
        return SettlementAddressResponse.from_dict(result)

    def delete_settlement_address(self, network: str) -> None:
        self._client.request(
            "DELETE",
            "/organization/settlement-addresses",
            query={"network": network},
        )


class AsyncOrganizationResource:
    def __init__(self, client: AsyncFluxisClient) -> None:
        self._client = client

    async def get(self) -> Organization:
        data = await self._client.request("GET", "/organization")
        return Organization.from_dict(data)

    async def get_settlement_addresses(self) -> list[SettlementAddressResponse]:
        data = await self._client.request("GET", "/organization/settlement-addresses")
        return parse_settlement_address_list(data)

    async def set_settlement_address(
        self,
        data: SettlementAddressRequest,
    ) -> SettlementAddressResponse:
        result = await self._client.request("POST", "/organization/settlement-addresses", data)
        return SettlementAddressResponse.from_dict(result)

    async def update_settlement_address(
        self,
        data: SettlementAddressRequest,
    ) -> SettlementAddressResponse:
        result = await self._client.request("PUT", "/organization/settlement-addresses", data)
        return SettlementAddressResponse.from_dict(result)

    async def delete_settlement_address(self, network: str) -> None:
        await self._client.request(
            "DELETE",
            "/organization/settlement-addresses",
            query={"network": network},
        )
