"""Integration tests for resource endpoints."""

from __future__ import annotations

from fluxis import AsyncFluxisClient, FluxisClient


def test_sync_list_accounts(sync_client: FluxisClient) -> None:
    accounts = sync_client.accounts.list()
    assert isinstance(accounts, list)


def test_sync_get_organization(sync_client: FluxisClient) -> None:
    org = sync_client.organization.get()
    assert org.id
    assert org.name


def test_sync_list_point_of_sale(sync_client: FluxisClient) -> None:
    page = sync_client.point_of_sale.list()
    assert page.page >= 1
    assert page.page_size >= 1


def test_sync_list_transactions(sync_client: FluxisClient) -> None:
    page = sync_client.transactions.list()
    assert page.total >= 0


async def test_async_list_accounts(async_client: AsyncFluxisClient) -> None:
    accounts = await async_client.accounts.list()
    assert isinstance(accounts, list)


async def test_async_get_organization(async_client: AsyncFluxisClient) -> None:
    org = await async_client.organization.get()
    assert org.id
    assert org.name


async def test_async_list_transactions(async_client: AsyncFluxisClient) -> None:
    page = await async_client.transactions.list()
    assert page.total >= 0
