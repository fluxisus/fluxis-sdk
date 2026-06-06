"""Transactions resource."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fluxis.models.common import Paginated
from fluxis.models.transaction import ListTransactionsOptions, parse_transaction_page

if TYPE_CHECKING:
    from fluxis.client import AsyncFluxisClient, FluxisClient

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 50


def _build_transactions_query(options: ListTransactionsOptions | None) -> dict[str, str | int]:
    query: dict[str, str | int] = {
        "page": options.page if options and options.page is not None else DEFAULT_PAGE,
        "page_size": (
            options.page_size if options and options.page_size is not None else DEFAULT_PAGE_SIZE
        ),
    }
    if options:
        if options.status is not None:
            query["status"] = options.status
        if options.sort is not None:
            query["sort"] = options.sort
        if options.order is not None:
            query["order"] = options.order
        if options.account_id is not None:
            query["account_id"] = options.account_id
    return query


class TransactionsResource:
    def __init__(self, client: FluxisClient) -> None:
        self._client = client

    def list(self, options: ListTransactionsOptions | None = None) -> Paginated:
        query = _build_transactions_query(options)
        data = self._client.request("GET", "/transactions", query=query)
        return parse_transaction_page(data)


class AsyncTransactionsResource:
    def __init__(self, client: AsyncFluxisClient) -> None:
        self._client = client

    async def list(self, options: ListTransactionsOptions | None = None) -> Paginated:
        query = _build_transactions_query(options)
        data = await self._client.request("GET", "/transactions", query=query)
        return parse_transaction_page(data)
