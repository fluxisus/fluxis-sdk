"""Account resource."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fluxis.models.account import (
    Account,
    AccountSettlementAddresses,
    CreateAccountRequest,
    SettlementAddressRequest,
    SettlementAddressResponse,
    UpdateAccountRequest,
)
from fluxis.models.common import parse_list

if TYPE_CHECKING:
    from fluxis.client import AsyncFluxisClient, FluxisClient


class AccountsResource:
    def __init__(self, client: FluxisClient) -> None:
        self._client = client

    def list(self) -> list[Account]:
        data = self._client.request("GET", "/account")
        return parse_list(data, Account)

    def get(self, account_id: str) -> Account:
        data = self._client.request("GET", f"/account/{account_id}")
        return Account.from_dict(data)

    def create(self, data: CreateAccountRequest) -> Account:
        result = self._client.request("POST", "/account", data)
        return Account.from_dict(result)

    def update(self, account_id: str, data: UpdateAccountRequest) -> Account:
        result = self._client.request("PUT", f"/account/{account_id}", data)
        return Account.from_dict(result)

    def delete(self, account_id: str) -> None:
        self._client.request("DELETE", f"/account/{account_id}")

    def get_settlement_addresses(self, account_id: str) -> AccountSettlementAddresses:
        data = self._client.request("GET", f"/account/{account_id}/settlement-addresses")
        return AccountSettlementAddresses.from_dict(data)

    def set_settlement_address(
        self,
        account_id: str,
        data: SettlementAddressRequest,
    ) -> SettlementAddressResponse:
        result = self._client.request("POST", f"/account/{account_id}/settlement-addresses", data)
        return SettlementAddressResponse.from_dict(result)

    def update_settlement_address(
        self,
        account_id: str,
        data: SettlementAddressRequest,
    ) -> SettlementAddressResponse:
        result = self._client.request("PUT", f"/account/{account_id}/settlement-addresses", data)
        return SettlementAddressResponse.from_dict(result)

    def delete_settlement_address(self, account_id: str, network: str) -> None:
        self._client.request(
            "DELETE",
            f"/account/{account_id}/settlement-addresses",
            query={"network": network},
        )


class AsyncAccountsResource:
    def __init__(self, client: AsyncFluxisClient) -> None:
        self._client = client

    async def list(self) -> list[Account]:
        data = await self._client.request("GET", "/account")
        return parse_list(data, Account)

    async def get(self, account_id: str) -> Account:
        data = await self._client.request("GET", f"/account/{account_id}")
        return Account.from_dict(data)

    async def create(self, data: CreateAccountRequest) -> Account:
        result = await self._client.request("POST", "/account", data)
        return Account.from_dict(result)

    async def update(self, account_id: str, data: UpdateAccountRequest) -> Account:
        result = await self._client.request("PUT", f"/account/{account_id}", data)
        return Account.from_dict(result)

    async def delete(self, account_id: str) -> None:
        await self._client.request("DELETE", f"/account/{account_id}")

    async def get_settlement_addresses(self, account_id: str) -> AccountSettlementAddresses:
        data = await self._client.request("GET", f"/account/{account_id}/settlement-addresses")
        return AccountSettlementAddresses.from_dict(data)

    async def set_settlement_address(
        self,
        account_id: str,
        data: SettlementAddressRequest,
    ) -> SettlementAddressResponse:
        result = await self._client.request(
            "POST",
            f"/account/{account_id}/settlement-addresses",
            data,
        )
        return SettlementAddressResponse.from_dict(result)

    async def update_settlement_address(
        self,
        account_id: str,
        data: SettlementAddressRequest,
    ) -> SettlementAddressResponse:
        result = await self._client.request(
            "PUT",
            f"/account/{account_id}/settlement-addresses",
            data,
        )
        return SettlementAddressResponse.from_dict(result)

    async def delete_settlement_address(self, account_id: str, network: str) -> None:
        await self._client.request(
            "DELETE",
            f"/account/{account_id}/settlement-addresses",
            query={"network": network},
        )
