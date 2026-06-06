"""Webhooks resource."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fluxis.models.common import Paginated
from fluxis.models.webhook import (
    ListWebhookLogsOptions,
    Webhook,
    WebhookCreateRequest,
    WebhookUpdateUrlRequest,
    parse_webhook_list,
    parse_webhook_log_page,
)

if TYPE_CHECKING:
    from fluxis.client import AsyncFluxisClient, FluxisClient


def _build_webhook_logs_query(options: ListWebhookLogsOptions | None) -> dict[str, int] | None:
    if options is None:
        return None
    query: dict[str, int] = {}
    if options.page is not None:
        query["page"] = options.page
    if options.page_size is not None:
        query["page_size"] = options.page_size
    return query or None


class WebhooksResource:
    def __init__(self, client: FluxisClient) -> None:
        self._client = client

    def create(self, account_id: str, data: WebhookCreateRequest) -> Webhook:
        result = self._client.request("POST", f"/account/{account_id}/webhook", data)
        return Webhook.from_dict(result)

    def list(self, account_id: str) -> list[Webhook]:
        data = self._client.request("GET", f"/account/{account_id}/webhook/list")
        return parse_webhook_list(data)

    def logs(self, account_id: str, options: ListWebhookLogsOptions | None = None) -> Paginated:
        data = self._client.request(
            "GET",
            f"/account/{account_id}/webhook/logs",
            query=_build_webhook_logs_query(options),
        )
        return parse_webhook_log_page(data)

    def activate(self, account_id: str, webhook_id: str) -> Webhook:
        path = f"/account/{account_id}/webhook/{webhook_id}/activate"
        result = self._client.request("PATCH", path)
        return Webhook.from_dict(result)

    def deactivate(self, account_id: str, webhook_id: str) -> Webhook:
        path = f"/account/{account_id}/webhook/{webhook_id}/deactivate"
        result = self._client.request("PATCH", path)
        return Webhook.from_dict(result)

    def delete(self, account_id: str, webhook_id: str) -> None:
        self._client.request("DELETE", f"/account/{account_id}/webhook/{webhook_id}/delete")

    def test(self, account_id: str, webhook_id: str) -> None:
        self._client.request("POST", f"/account/{account_id}/webhook/{webhook_id}/test")

    def update_url(
        self,
        account_id: str,
        webhook_id: str,
        data: WebhookUpdateUrlRequest,
    ) -> Webhook:
        path = f"/account/{account_id}/webhook/{webhook_id}/url"
        result = self._client.request("PUT", path, data)
        return Webhook.from_dict(result)


class AsyncWebhooksResource:
    def __init__(self, client: AsyncFluxisClient) -> None:
        self._client = client

    async def create(self, account_id: str, data: WebhookCreateRequest) -> Webhook:
        result = await self._client.request("POST", f"/account/{account_id}/webhook", data)
        return Webhook.from_dict(result)

    async def list(self, account_id: str) -> list[Webhook]:
        data = await self._client.request("GET", f"/account/{account_id}/webhook/list")
        return parse_webhook_list(data)

    async def logs(
        self,
        account_id: str,
        options: ListWebhookLogsOptions | None = None,
    ) -> Paginated:
        data = await self._client.request(
            "GET",
            f"/account/{account_id}/webhook/logs",
            query=_build_webhook_logs_query(options),
        )
        return parse_webhook_log_page(data)

    async def activate(self, account_id: str, webhook_id: str) -> Webhook:
        result = await self._client.request(
            "PATCH",
            f"/account/{account_id}/webhook/{webhook_id}/activate",
        )
        return Webhook.from_dict(result)

    async def deactivate(self, account_id: str, webhook_id: str) -> Webhook:
        result = await self._client.request(
            "PATCH",
            f"/account/{account_id}/webhook/{webhook_id}/deactivate",
        )
        return Webhook.from_dict(result)

    async def delete(self, account_id: str, webhook_id: str) -> None:
        await self._client.request("DELETE", f"/account/{account_id}/webhook/{webhook_id}/delete")

    async def test(self, account_id: str, webhook_id: str) -> None:
        await self._client.request("POST", f"/account/{account_id}/webhook/{webhook_id}/test")

    async def update_url(
        self,
        account_id: str,
        webhook_id: str,
        data: WebhookUpdateUrlRequest,
    ) -> Webhook:
        result = await self._client.request(
            "PUT",
            f"/account/{account_id}/webhook/{webhook_id}/url",
            data,
        )
        return Webhook.from_dict(result)
