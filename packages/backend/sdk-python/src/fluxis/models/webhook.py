"""Webhook models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import cast

from fluxis.models.common import (
    Paginated,
    WebhookEventType,
    _as_dict,
    _optional_bool,
    _optional_str,
    parse_list,
)


@dataclass
class WebhookCreateRequest:
    url: str
    event_type: WebhookEventType
    description: str | None = None


@dataclass
class WebhookUpdateUrlRequest:
    url: str


@dataclass
class Webhook:
    id: str
    url: str
    event_type: WebhookEventType
    enabled: bool
    account_id: str | None = None
    description: str | None = None
    secret: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> Webhook:
        payload = _as_dict(data)
        webhook_id = _optional_str(payload, "id")
        url = _optional_str(payload, "url")
        event_type = _optional_str(payload, "event_type")
        enabled = _optional_bool(payload, "enabled")
        if webhook_id is None or url is None or event_type is None or enabled is None:
            raise ValueError("Webhook response missing required fields")
        return cls(
            id=webhook_id,
            url=url,
            event_type=cast("WebhookEventType", event_type),
            enabled=enabled,
            account_id=_optional_str(payload, "account_id"),
            description=_optional_str(payload, "description"),
            secret=_optional_str(payload, "secret"),
            created_at=_optional_str(payload, "created_at"),
            updated_at=_optional_str(payload, "updated_at"),
        )


@dataclass
class WebhookLog:
    id: str
    webhook_id: str
    event_type: WebhookEventType
    account_id: str | None = None
    response_status: int | None = None
    response_body: str | None = None
    duration_ms: int | None = None
    error: str | None = None
    created_at: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> WebhookLog:
        payload = _as_dict(data)
        log_id = _optional_str(payload, "id")
        webhook_id = _optional_str(payload, "webhook_id")
        event_type = _optional_str(payload, "event_type")
        if log_id is None or webhook_id is None or event_type is None:
            raise ValueError("Webhook log response missing required fields")
        response_status_raw = payload.get("response_status")
        response_status = int(response_status_raw) if isinstance(response_status_raw, int) else None
        duration_raw = payload.get("duration_ms")
        duration_ms = int(duration_raw) if isinstance(duration_raw, int) else None
        return cls(
            id=log_id,
            webhook_id=webhook_id,
            event_type=cast("WebhookEventType", event_type),
            account_id=_optional_str(payload, "account_id"),
            response_status=response_status,
            response_body=_optional_str(payload, "response_body"),
            duration_ms=duration_ms,
            error=_optional_str(payload, "error"),
            created_at=_optional_str(payload, "created_at"),
        )


@dataclass
class ListWebhookLogsOptions:
    page: int | None = None
    page_size: int | None = None


def parse_webhook_list(data: object) -> list[Webhook]:
    return parse_list(data, Webhook)


def parse_webhook_log_page(data: object) -> Paginated:
    return Paginated.from_dict(data, WebhookLog)
