"""End-to-end integration flows against staging."""

from __future__ import annotations

import uuid

import pytest

from fluxis import AsyncFluxisClient, FluxisClient
from fluxis.errors import FluxisError
from fluxis.models.point_of_sale import ListPointOfSaleOptions


def test_sync_auth_and_pagination(sync_client: FluxisClient) -> None:
    org = sync_client.organization.get()
    assert org.owner_email

    page = sync_client.point_of_sale.list(ListPointOfSaleOptions(page=1, page_size=5))
    assert page.page == 1
    assert page.page_size == 5


async def test_async_auth_and_pagination(async_client: AsyncFluxisClient) -> None:
    org = await async_client.organization.get()
    assert org.owner_email

    page = await async_client.point_of_sale.list(ListPointOfSaleOptions(page=1, page_size=5))
    assert page.page == 1
    assert page.page_size == 5


def test_sync_naspip_read_invalid_token(sync_client: FluxisClient) -> None:
    with pytest.raises(FluxisError):
        sync_client.naspip.read("v4.local.invalid-token-for-integration-test")


async def test_async_naspip_read_invalid_token(async_client: AsyncFluxisClient) -> None:
    with pytest.raises(FluxisError):
        await async_client.naspip.read("v4.local.invalid-token-for-integration-test")


def test_sync_create_and_delete_account(sync_client: FluxisClient) -> None:
    from fluxis.models.account import CreateAccountRequest

    name = f"sdk-test-{uuid.uuid4().hex[:8]}"
    account = sync_client.accounts.create(CreateAccountRequest(name=name))
    assert account.name == name
    assert account.id
    account_id = account.id
    assert account_id is not None
    sync_client.accounts.delete(account_id)
