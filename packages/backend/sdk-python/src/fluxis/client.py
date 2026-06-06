"""Fluxis API clients (sync and async)."""

from __future__ import annotations

import asyncio
import json
import os
import threading
from collections.abc import Mapping
from datetime import datetime, timezone

import httpx

from fluxis.errors import (
    FluxisAuthError,
    FluxisError,
    FluxisNetworkError,
    FluxisResponseParseError,
)
from fluxis.models.auth import AuthTokenResponse
from fluxis.resources.accounts import AccountsResource, AsyncAccountsResource
from fluxis.resources.naspip import AsyncNaspipResource, NaspipResource
from fluxis.resources.organization import AsyncOrganizationResource, OrganizationResource
from fluxis.resources.point_of_sale import AsyncPointOfSaleResource, PointOfSaleResource
from fluxis.resources.transactions import AsyncTransactionsResource, TransactionsResource
from fluxis.resources.webhooks import AsyncWebhooksResource, WebhooksResource

STAGING_BASE_URL = "https://api.stgfluxis.us/v1"
PRODUCTION_BASE_URL = "https://api.fluxis.us/v1"
TOKEN_REFRESH_BUFFER_SECONDS = 60


def infer_base_url(api_key: str) -> str:
    if api_key.startswith("fxs.stg."):
        return STAGING_BASE_URL
    if api_key.startswith("fxs.prd."):
        return PRODUCTION_BASE_URL
    raise ValueError(
        'Invalid Fluxis API key format. Expected a key starting with "fxs.stg." or "fxs.prd.".',
    )


def _build_url(
    base_url: str,
    path: str,
    query: Mapping[str, str | int | float | bool] | None = None,
) -> str:
    url = f"{base_url}{path}"
    if not query:
        return url
    filtered = {key: str(value) for key, value in query.items() if value is not None}
    params = httpx.QueryParams(filtered)
    query_string = str(params)
    if query_string:
        return f"{url}?{query_string}"
    return url


def _parse_response_body(
    response: httpx.Response,
    method: str | None = None,
    path: str | None = None,
) -> dict[str, object] | None:
    if response.status_code == 204:
        return None
    text = response.text
    if not text:
        return None
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise FluxisResponseParseError(
            "Response is not valid JSON",
            text,
            response.status_code,
            method,
            path,
        ) from exc
    if not isinstance(parsed, dict):
        raise FluxisResponseParseError(
            "Response JSON must be an object",
            text,
            response.status_code,
            method,
            path,
        )
    return parsed


def _unwrap_envelope(
    envelope: dict[str, object] | None,
    *,
    status_code: int,
    method: str,
    path: str,
) -> object | None:
    if envelope is None:
        return None
    status = envelope.get("status")
    if status == "error":
        raise FluxisError(
            str(envelope.get("message", "Request failed")),
            str(envelope.get("code", "UNKNOWN_ERROR")),
            str(envelope["details"]) if envelope.get("details") is not None else None,
            status_code,
            method,
            path,
        )
    if status == "success":
        return envelope.get("data")
    if not response_ok(status_code):
        raise FluxisError(
            f"Request failed with status {status_code}",
            "UNKNOWN_ERROR",
            None,
            status_code,
            method,
            path,
        )
    return envelope.get("data")


def response_ok(status_code: int) -> bool:
    return 200 <= status_code < 300


def _auth_error_from_envelope(
    envelope: dict[str, object] | None,
    status_code: int,
) -> FluxisAuthError:
    if envelope is None:
        return FluxisAuthError("Authentication failed")
    message = str(envelope.get("message", "Authentication failed"))
    code = str(envelope.get("code", "AUTH_ERROR"))
    details_value = envelope.get("details")
    details = str(details_value) if details_value is not None else None
    if not response_ok(status_code):
        return FluxisAuthError(message, code, details)
    if envelope.get("status") == "error":
        return FluxisAuthError(message, code, details)
    return FluxisAuthError("Authentication failed")


def _error_details(envelope: dict[str, object] | None) -> str | None:
    if envelope is None:
        return None
    details_value = envelope.get("details")
    return str(details_value) if details_value is not None else None


class AsyncFluxisClient:
    """Async Fluxis API client."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        api_secret: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        resolved_key = api_key or os.environ.get("FLUXIS_API_KEY")
        resolved_secret = api_secret or os.environ.get("FLUXIS_API_SECRET")
        if not resolved_key or not resolved_secret:
            raise ValueError("api_key and api_secret are required")
        self._api_key = resolved_key
        self._api_secret = resolved_secret
        self._base_url = infer_base_url(resolved_key)
        self._timeout = timeout
        self._access_token: str | None = None
        self._token_expires_at: datetime | None = None
        self._auth_lock = asyncio.Lock()
        self._http = httpx.AsyncClient(timeout=timeout)

        self.accounts = AsyncAccountsResource(self)
        self.organization = AsyncOrganizationResource(self)
        self.point_of_sale = AsyncPointOfSaleResource(self)
        self.naspip = AsyncNaspipResource(self)
        self.transactions = AsyncTransactionsResource(self)
        self.webhooks = AsyncWebhooksResource(self)

    async def __aenter__(self) -> AsyncFluxisClient:
        return self

    async def __aexit__(self, *args: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        await self._http.aclose()

    def _is_token_expired(self) -> bool:
        if self._access_token is None or self._token_expires_at is None:
            return True
        now = datetime.now(timezone.utc)
        return now.timestamp() >= self._token_expires_at.timestamp() - TOKEN_REFRESH_BUFFER_SECONDS

    async def _authenticate(self) -> None:
        url = f"{self._base_url}/auth/token"
        body = {"api_key": self._api_key, "api_secret": self._api_secret}
        try:
            response = await self._http.post(url, json=body)
        except httpx.HTTPError as exc:
            msg = "Failed to connect to Fluxis API for authentication"
            raise FluxisNetworkError(msg, exc) from exc

        envelope = _parse_response_body(response, "POST", "/auth/token")
        if (
            not response_ok(response.status_code)
            or envelope is None
            or envelope.get("status") == "error"
        ):
            raise _auth_error_from_envelope(envelope, response.status_code)

        data = envelope.get("data")
        auth = AuthTokenResponse.from_dict(data)
        self._access_token = auth.token
        self._token_expires_at = datetime.fromisoformat(auth.expired_at.replace("Z", "+00:00"))

    async def _ensure_authenticated(self) -> None:
        if not self._is_token_expired():
            return
        async with self._auth_lock:
            if not self._is_token_expired():
                return
            await self._authenticate()

    async def request(
        self,
        method: str,
        path: str,
        body: object | None = None,
        query: Mapping[str, str | int | float | bool] | None = None,
    ) -> object | None:
        return await self._execute_request(method, path, body, query, retry_on_401=True)

    async def _execute_request(
        self,
        method: str,
        path: str,
        body: object | None,
        query: Mapping[str, str | int | float | bool] | None,
        *,
        retry_on_401: bool,
    ) -> object | None:
        await self._ensure_authenticated()
        url = _build_url(self._base_url, path, query)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._access_token}",
            "x-fluxis-api-key": self._api_key,
        }
        json_body: dict[str, object] | list[object] | None = None
        if body is not None:
            from fluxis.models.common import to_json_dict

            if hasattr(body, "__dataclass_fields__"):
                json_body = to_json_dict(body)
            elif isinstance(body, dict):
                json_body = body
            else:
                raise TypeError("Request body must be a dataclass or dict")

        try:
            response = await self._http.request(method, url, headers=headers, json=json_body)
        except httpx.HTTPError as exc:
            raise FluxisNetworkError(f"Request failed: {method} {path}", exc) from exc

        envelope = _parse_response_body(response, method, path)

        if response.status_code == 401 and retry_on_401:
            self._access_token = None
            self._token_expires_at = None
            await self._ensure_authenticated()
            return await self._execute_request(method, path, body, query, retry_on_401=False)

        if envelope is not None and envelope.get("status") == "error":
            default_message = f"Request failed with status {response.status_code}"
            raise FluxisError(
                str(envelope.get("message", default_message)),
                str(envelope.get("code", "UNKNOWN_ERROR")),
                _error_details(envelope),
                response.status_code,
                method,
                path,
            )

        if not response_ok(response.status_code):
            default_message = f"Request failed with status {response.status_code}"
            message = str(envelope.get("message", default_message)) if envelope else default_message
            code = str(envelope.get("code", "UNKNOWN_ERROR")) if envelope else "UNKNOWN_ERROR"
            raise FluxisError(
                message,
                code,
                _error_details(envelope),
                response.status_code,
                method,
                path,
            )

        return _unwrap_envelope(
            envelope,
            status_code=response.status_code,
            method=method,
            path=path,
        )


class FluxisClient:
    """Synchronous Fluxis API client."""

    def __init__(
        self,
        *,
        api_key: str | None = None,
        api_secret: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        resolved_key = api_key or os.environ.get("FLUXIS_API_KEY")
        resolved_secret = api_secret or os.environ.get("FLUXIS_API_SECRET")
        if not resolved_key or not resolved_secret:
            raise ValueError("api_key and api_secret are required")
        self._api_key = resolved_key
        self._api_secret = resolved_secret
        self._base_url = infer_base_url(resolved_key)
        self._timeout = timeout
        self._access_token: str | None = None
        self._token_expires_at: datetime | None = None
        self._auth_lock = threading.Lock()
        self._http = httpx.Client(timeout=timeout)

        self.accounts = AccountsResource(self)
        self.organization = OrganizationResource(self)
        self.point_of_sale = PointOfSaleResource(self)
        self.naspip = NaspipResource(self)
        self.transactions = TransactionsResource(self)
        self.webhooks = WebhooksResource(self)

    def __enter__(self) -> FluxisClient:
        return self

    def __exit__(self, *args: object) -> None:
        self.close()

    def close(self) -> None:
        self._http.close()

    def _is_token_expired(self) -> bool:
        if self._access_token is None or self._token_expires_at is None:
            return True
        now = datetime.now(timezone.utc)
        return now.timestamp() >= self._token_expires_at.timestamp() - TOKEN_REFRESH_BUFFER_SECONDS

    def _authenticate(self) -> None:
        url = f"{self._base_url}/auth/token"
        body = {"api_key": self._api_key, "api_secret": self._api_secret}
        try:
            response = self._http.post(url, json=body)
        except httpx.HTTPError as exc:
            msg = "Failed to connect to Fluxis API for authentication"
            raise FluxisNetworkError(msg, exc) from exc

        envelope = _parse_response_body(response, "POST", "/auth/token")
        if (
            not response_ok(response.status_code)
            or envelope is None
            or envelope.get("status") == "error"
        ):
            raise _auth_error_from_envelope(envelope, response.status_code)

        data = envelope.get("data")
        auth = AuthTokenResponse.from_dict(data)
        self._access_token = auth.token
        self._token_expires_at = datetime.fromisoformat(auth.expired_at.replace("Z", "+00:00"))

    def _ensure_authenticated(self) -> None:
        if not self._is_token_expired():
            return
        with self._auth_lock:
            if not self._is_token_expired():
                return
            self._authenticate()

    def request(
        self,
        method: str,
        path: str,
        body: object | None = None,
        query: Mapping[str, str | int | float | bool] | None = None,
    ) -> object | None:
        return self._execute_request(method, path, body, query, retry_on_401=True)

    def _execute_request(
        self,
        method: str,
        path: str,
        body: object | None,
        query: Mapping[str, str | int | float | bool] | None,
        *,
        retry_on_401: bool,
    ) -> object | None:
        self._ensure_authenticated()
        url = _build_url(self._base_url, path, query)
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self._access_token}",
            "x-fluxis-api-key": self._api_key,
        }
        json_body: dict[str, object] | list[object] | None = None
        if body is not None:
            from fluxis.models.common import to_json_dict

            if hasattr(body, "__dataclass_fields__"):
                json_body = to_json_dict(body)
            elif isinstance(body, dict):
                json_body = body
            else:
                raise TypeError("Request body must be a dataclass or dict")

        try:
            response = self._http.request(method, url, headers=headers, json=json_body)
        except httpx.HTTPError as exc:
            raise FluxisNetworkError(f"Request failed: {method} {path}", exc) from exc

        envelope = _parse_response_body(response, method, path)

        if response.status_code == 401 and retry_on_401:
            self._access_token = None
            self._token_expires_at = None
            self._ensure_authenticated()
            return self._execute_request(method, path, body, query, retry_on_401=False)

        if envelope is not None and envelope.get("status") == "error":
            default_message = f"Request failed with status {response.status_code}"
            raise FluxisError(
                str(envelope.get("message", default_message)),
                str(envelope.get("code", "UNKNOWN_ERROR")),
                _error_details(envelope),
                response.status_code,
                method,
                path,
            )

        if not response_ok(response.status_code):
            default_message = f"Request failed with status {response.status_code}"
            message = str(envelope.get("message", default_message)) if envelope else default_message
            code = str(envelope.get("code", "UNKNOWN_ERROR")) if envelope else "UNKNOWN_ERROR"
            raise FluxisError(
                message,
                code,
                _error_details(envelope),
                response.status_code,
                method,
                path,
            )

        return _unwrap_envelope(
            envelope,
            status_code=response.status_code,
            method=method,
            path=path,
        )
