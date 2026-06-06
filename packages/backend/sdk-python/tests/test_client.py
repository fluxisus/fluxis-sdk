"""Client unit tests."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from fluxis.client import AsyncFluxisClient, FluxisClient, infer_base_url
from fluxis.errors import FluxisAuthError, FluxisError, FluxisNetworkError, FluxisResponseParseError


def _auth_success_response(expires_in_seconds: int = 3600) -> httpx.Response:
    expired_at = (datetime.now(timezone.utc) + timedelta(seconds=expires_in_seconds)).isoformat()
    return httpx.Response(
        200,
        json={
            "status": "success",
            "data": {"token": "v4.local.test-token", "expired_at": expired_at},
        },
    )


def _api_success_response(data: object, status_code: int = 200) -> httpx.Response:
    return httpx.Response(status_code, json={"status": "success", "data": data})


def _api_error_response(
    code: str,
    message: str,
    status_code: int,
    details: str | None = None,
) -> httpx.Response:
    payload: dict[str, object] = {"status": "error", "code": code, "message": message}
    if details is not None:
        payload["details"] = details
    return httpx.Response(status_code, json=payload)


class TestInferBaseUrl:
    def test_staging_key(self) -> None:
        assert infer_base_url("fxs.stg.test") == "https://api.stgfluxis.us/v1"

    def test_production_key(self) -> None:
        assert infer_base_url("fxs.prd.test") == "https://api.fluxis.us/v1"

    def test_invalid_key(self) -> None:
        with pytest.raises(ValueError, match="Invalid Fluxis API key format"):
            infer_base_url("invalid-key")


class TestFluxisClient:
    def test_authenticates_on_first_request_and_caches_token(self) -> None:
        calls = {"auth": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                calls["auth"] += 1
                return _auth_success_response()
            return _api_success_response([])

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        client.accounts.list()
        client.accounts.list()
        client.close()
        assert calls["auth"] == 1

    def test_refreshes_token_when_expired(self) -> None:
        calls = {"auth": 0, "api": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                calls["auth"] += 1
                return _auth_success_response(expires_in_seconds=0)
            calls["api"] += 1
            return _api_success_response([])

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        client.accounts.list()
        client.accounts.list()
        client.close()
        assert calls["auth"] == 2
        assert calls["api"] == 2

    def test_retries_once_on_401(self) -> None:
        state = {"api_calls": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            state["api_calls"] += 1
            if state["api_calls"] == 1:
                return _api_error_response("AUTH_EXPIRED", "Token expired", 401)
            return _api_success_response({"id": "1", "name": "Acc"})

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        account = client.accounts.get("1")
        client.close()
        assert account.id == "1"
        assert state["api_calls"] == 2

    def test_raises_fluxis_error_on_second_401(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            return _api_error_response("AUTH_EXPIRED", "Still expired", 401)

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        with pytest.raises(FluxisError) as exc_info:
            client.accounts.get("1")
        assert not isinstance(exc_info.value, FluxisAuthError)
        client.close()

    def test_handles_empty_response_body(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            return httpx.Response(200, text="")

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        client.accounts.delete("123")
        client.close()

    def test_handles_204_no_content(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            return httpx.Response(204)

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        client.accounts.delete("123")
        client.close()

    def test_raises_parse_error_on_non_json(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            return httpx.Response(502, text="<html>502 Bad Gateway</html>")

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        with pytest.raises(FluxisResponseParseError) as exc_info:
            client.accounts.list()
        assert "502 Bad Gateway" in exc_info.value.raw_body
        client.close()

    def test_raises_fluxis_error_with_api_details(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            return _api_error_response("VAL001", "Invalid amount", 400, "Amount must be positive")

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        with pytest.raises(FluxisError) as exc_info:
            from fluxis.models.point_of_sale import CreatePaymentRequestRequest

            client.point_of_sale.create_payment_request(
                "pos-1",
                CreatePaymentRequestRequest(amount="-1", unique_asset_id="npolygon_t0x"),
            )
        err = exc_info.value
        assert err.code == "VAL001"
        assert err.details == "Amount must be positive"
        assert err.status_code == 400
        client.close()

    def test_wraps_network_errors(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            raise httpx.ConnectError("connection failed", request=request)

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        with pytest.raises(FluxisNetworkError):
            client.accounts.list()
        client.close()

    def test_snake_case_request_body(self) -> None:
        captured: dict[str, object] = {}

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                return _auth_success_response()
            captured["body"] = json.loads(request.content.decode())
            return _api_success_response({"id": "pos-1", "name": "Store"})

        client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.Client(transport=httpx.MockTransport(handler))
        from fluxis.models.point_of_sale import CreatePointOfSaleRequest

        client.point_of_sale.create(
            CreatePointOfSaleRequest(
                name="Store",
                reference_currency="USD",
                type="online_fixed",
                account_id="acc-1",
                payment_options=["asset-1"],
            )
        )
        client.close()
        assert captured["body"] == {
            "name": "Store",
            "reference_currency": "USD",
            "type": "online_fixed",
            "account_id": "acc-1",
            "payment_options": ["asset-1"],
        }


class TestAsyncFluxisClient:
    async def test_authenticates_on_first_request(self) -> None:
        calls = {"auth": 0}

        def handler(request: httpx.Request) -> httpx.Response:
            if request.url.path.endswith("/auth/token"):
                calls["auth"] += 1
                return _auth_success_response()
            return _api_success_response([])

        client = AsyncFluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
        client._http = httpx.AsyncClient(transport=httpx.MockTransport(handler))
        await client.accounts.list()
        await client.accounts.list()
        await client.aclose()
        assert calls["auth"] == 1
