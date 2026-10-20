"""Resource routing tests (mocked HTTP, no live API)."""

from __future__ import annotations

import json
from collections.abc import Generator
from datetime import datetime, timedelta, timezone

import httpx
import pytest

from fluxis import FluxisClient
from fluxis.models.account import (
    CreateAccountRequest,
    SettlementAddressRequest,
    UpdateAccountRequest,
)
from fluxis.models.naspip import CreateNaspipRequest, NaspipPaymentData
from fluxis.models.payment_intention import CreatePaymentIntentionRequest
from fluxis.models.point_of_sale import (
    CreatePaymentRequestCheckoutRequest,
    CreatePaymentRequestRequest,
    CreatePointOfSaleRequest,
    ListPointOfSaleOptions,
    UpdatePointOfSaleRequest,
)
from fluxis.models.transaction import ListTransactionsOptions
from fluxis.models.webhook import (
    ListWebhookLogsOptions,
    WebhookCreateRequest,
    WebhookUpdateUrlRequest,
)


def _auth_response() -> httpx.Response:
    expired_at = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    return httpx.Response(
        200,
        json={
            "status": "success",
            "data": {"token": "v4.local.test-token", "expired_at": expired_at},
        },
    )


def _success_response(data: object) -> httpx.Response:
    return httpx.Response(200, json={"status": "success", "data": data})


def _routing_handler(request: httpx.Request) -> httpx.Response:
    path = request.url.path
    if path.endswith("/auth/token"):
        return _auth_response()
    if request.method == "DELETE":
        return httpx.Response(204)
    if path.endswith("/webhook/list"):
        return _success_response([])
    if path.endswith("/pos") and request.method == "POST":
        return _success_response({"id": "pos-1", "name": "Store"})
    if path.endswith("/webhook/logs") or path.endswith("/pos") or path.endswith("/transactions"):
        return _success_response(
            {"data": [], "page": 1, "page_size": 50, "total": 0, "total_pages": 0}
        )
    if path.endswith("/account") and request.method == "GET":
        return _success_response([{"id": "acc-1", "name": "Test"}])
    if path.endswith("/settlement-addresses") and request.method == "GET":
        if "/account/" in path:
            return _success_response({"addresses": []})
        return _success_response([{"address": "0x1", "network": "polygon"}])
    if path.endswith("/settlement-addresses"):
        return _success_response({"address": "0x1", "network": "polygon"})
    if path.endswith("/organization"):
        return _success_response(
            {
                "id": "org-1",
                "name": "Test Org",
                "country": "US",
                "owner_email": "owner@example.com",
            }
        )
    if path.endswith("/naspip/create"):
        return _success_response({"token": "v4.local.created"})
    if path.endswith("/payment-intention/close"):
        return httpx.Response(204)
    if path.endswith("/payment-intention"):
        return _success_response({"id": "pi-1", "amount": 25.0, "coin_code": "USD"})
    if path.endswith("/payment-request-checkout"):
        return _success_response(
            {
                "id": "pr-1",
                "status": "created",
                "token": "v4.local.checkout",
                "checkout_url": "https://checkout.example.com",
            }
        )
    if "/payment-request/" in path:
        return _success_response(
            {"id": "pr-1", "status": "created", "token": "v4.local.request"}
        )
    if path.endswith("/payment-request"):
        return _success_response(
            {"id": "pr-1", "status": "created", "token": "v4.local.request"}
        )
    if path.endswith("/qr"):
        return _success_response({"qr_url": "https://example.com/qr"})
    if "/webhook" in path:
        return _success_response(
            {
                "id": "wh-1",
                "url": "https://example.com/hook",
                "event_type": "payment_request",
                "enabled": True,
            }
        )
    return _success_response({"id": "resource-1", "name": "Test"})


class _RoutingRecorder:
    def __init__(self) -> None:
        self.requests: list[httpx.Request] = []

    def handler(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return _routing_handler(request)

    def last_api_request(self) -> httpx.Request:
        for request in reversed(self.requests):
            if not request.url.path.endswith("/auth/token"):
                return request
        raise AssertionError("no API request recorded")


@pytest.fixture
def routing_recorder() -> _RoutingRecorder:
    return _RoutingRecorder()


@pytest.fixture
def routed_client(
    routing_recorder: _RoutingRecorder,
) -> Generator[FluxisClient, None, None]:
    client = FluxisClient(api_key="fxs.stg.test-key", api_secret="test-secret")
    client._http = httpx.Client(transport=httpx.MockTransport(routing_recorder.handler))
    yield client
    client.close()


class TestAccountsResourceRouting:
    def test_list(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.accounts.list()
        req = routing_recorder.last_api_request()
        assert req.method == "GET"
        assert req.url.path.endswith("/account")

    def test_get(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.accounts.get("acc-1")
        assert routing_recorder.last_api_request().url.path.endswith("/account/acc-1")

    def test_create(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.accounts.create(CreateAccountRequest(name="Test"))
        req = routing_recorder.last_api_request()
        assert req.method == "POST"
        body = json.loads(req.content.decode())
        assert body["name"] == "Test"

    def test_update(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.accounts.update("acc-1", UpdateAccountRequest(name="Updated"))
        req = routing_recorder.last_api_request()
        assert req.method == "PUT"
        assert req.url.path.endswith("/account/acc-1")

    def test_delete(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.accounts.delete("acc-1")
        assert routing_recorder.last_api_request().method == "DELETE"

    def test_get_settlement_addresses(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.accounts.get_settlement_addresses("acc-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/account/acc-1/settlement-addresses"
        )

    def test_set_settlement_address(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.accounts.set_settlement_address(
            "acc-1", SettlementAddressRequest(address="0x1", network="polygon")
        )
        req = routing_recorder.last_api_request()
        assert req.method == "POST"
        assert req.url.path.endswith("/account/settlement/acc-1/settlement-addresses")
        assert json.loads(req.content.decode())["network"] == "polygon"

    def test_update_settlement_address(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.accounts.update_settlement_address(
            "acc-1", SettlementAddressRequest(address="0x2", network="ethereum")
        )
        req = routing_recorder.last_api_request()
        assert req.method == "PUT"
        assert req.url.path.endswith("/account/settlement/acc-1/settlement-addresses")

    def test_delete_settlement_address(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.accounts.delete_settlement_address("acc-1", "polygon")
        req = routing_recorder.last_api_request()
        assert req.url.path.endswith("/account/settlement/acc-1/settlement-addresses")
        assert req.url.params["network"] == "polygon"


class TestOrganizationResourceRouting:
    def test_get(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.organization.get()
        assert routing_recorder.last_api_request().url.path.endswith("/organization")

    def test_set_settlement_address(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.organization.set_settlement_address(
            SettlementAddressRequest(address="0x1", network="polygon")
        )
        req = routing_recorder.last_api_request()
        assert req.method == "POST"
        assert req.url.path.endswith("/organization/settlement-addresses")

    def test_update_settlement_address(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.organization.update_settlement_address(
            SettlementAddressRequest(address="0x2", network="ethereum")
        )
        assert routing_recorder.last_api_request().method == "PUT"

    def test_get_settlement_addresses(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.organization.get_settlement_addresses()
        assert routing_recorder.last_api_request().method == "GET"

    def test_delete_settlement_address(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.organization.delete_settlement_address("polygon")
        assert routing_recorder.last_api_request().url.params["network"] == "polygon"


class TestPointOfSaleResourceRouting:
    def test_list_defaults(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.list()
        req = routing_recorder.last_api_request()
        assert req.url.path.endswith("/pos")
        assert req.url.params["page"] == "1"
        assert req.url.params["page_size"] == "50"

    def test_list_with_options(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.list(
            ListPointOfSaleOptions(page=2, page_size=25, account_id="acc-1")
        )
        req = routing_recorder.last_api_request()
        assert req.url.params["page"] == "2"
        assert req.url.params["page_size"] == "25"
        assert req.url.params["account_id"] == "acc-1"

    def test_get(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.point_of_sale.get("pos-1")
        assert routing_recorder.last_api_request().url.path.endswith("/pos/pos-1")

    def test_create(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.point_of_sale.create(
            CreatePointOfSaleRequest(
                name="Store",
                type="online_fixed",
                reference_currency="USD",
            )
        )
        assert routing_recorder.last_api_request().method == "POST"

    def test_update(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.point_of_sale.update(
            "pos-1",
            UpdatePointOfSaleRequest(reference_currency="USD", name="Updated"),
        )
        assert routing_recorder.last_api_request().method == "PUT"

    def test_delete(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.point_of_sale.delete("pos-1")
        assert routing_recorder.last_api_request().method == "DELETE"

    def test_get_payment_intention(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.get_payment_intention("pos-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/pos/pos-1/payment-intention"
        )

    def test_create_payment_intention(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.create_payment_intention(
            "pos-1", CreatePaymentIntentionRequest(amount=25, coin_code="USD")
        )
        assert routing_recorder.last_api_request().method == "POST"

    def test_close_payment_intention(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.close_payment_intention("pos-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/pos/pos-1/payment-intention/close"
        )

    def test_get_qr(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.point_of_sale.get_qr("pos-1")
        assert routing_recorder.last_api_request().url.path.endswith("/pos/pos-1/qr")

    def test_create_payment_request(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.create_payment_request(
            "pos-1",
            CreatePaymentRequestRequest(amount="10.00", unique_asset_id="npolygon_t0xabc"),
        )
        assert routing_recorder.last_api_request().url.path.endswith(
            "/pos/pos-1/payment-request"
        )

    def test_get_payment_request(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.get_payment_request("pos-1", "pr-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/pos/pos-1/payment-request/pr-1"
        )

    def test_create_payment_request_checkout(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.point_of_sale.create_payment_request_checkout(
            "pos-1",
            CreatePaymentRequestCheckoutRequest(amount=49.99, coin_code="USD"),
        )
        assert routing_recorder.last_api_request().url.path.endswith(
            "/pos/pos-1/payment-request-checkout"
        )


class TestNaspipResourceRouting:
    def test_create(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.naspip.create(
            CreateNaspipRequest(
                payment=NaspipPaymentData(address="0x1", amount=10, unique_asset_id="asset")
            )
        )
        assert routing_recorder.last_api_request().url.path.endswith("/naspip/create")

    def test_read(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.naspip.read("v4.local.test")
        req = routing_recorder.last_api_request()
        assert req.url.path.endswith("/naspip/read")
        assert json.loads(req.content.decode())["token"] == "v4.local.test"


class TestWebhooksResourceRouting:
    def test_create(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.webhooks.create(
            "acc-1",
            WebhookCreateRequest(url="https://example.com/hook", event_type="payment_request"),
        )
        assert routing_recorder.last_api_request().url.path.endswith("/account/acc-1/webhook")

    def test_list(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.webhooks.list("acc-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/account/acc-1/webhook/list"
        )

    def test_logs(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.webhooks.logs("acc-1", ListWebhookLogsOptions(page=1, page_size=20))
        req = routing_recorder.last_api_request()
        assert req.url.params["page"] == "1"
        assert req.url.params["page_size"] == "20"

    def test_activate(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.webhooks.activate("acc-1", "wh-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/account/acc-1/webhook/wh-1/activate"
        )

    def test_deactivate(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.webhooks.deactivate("acc-1", "wh-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/account/acc-1/webhook/wh-1/deactivate"
        )

    def test_delete(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.webhooks.delete("acc-1", "wh-1")
        assert routing_recorder.last_api_request().method == "DELETE"

    def test_test(self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder) -> None:
        routed_client.webhooks.test("acc-1", "wh-1")
        assert routing_recorder.last_api_request().url.path.endswith(
            "/account/acc-1/webhook/wh-1/test"
        )

    def test_update_url(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.webhooks.update_url(
            "acc-1",
            "wh-1",
            WebhookUpdateUrlRequest(url="https://example.com/hook-v2"),
        )
        assert routing_recorder.last_api_request().url.path.endswith(
            "/account/acc-1/webhook/wh-1/url"
        )


class TestTransactionsResourceRouting:
    def test_list_defaults(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.transactions.list()
        req = routing_recorder.last_api_request()
        assert req.url.path.endswith("/transactions")
        assert req.url.params["page"] == "1"
        assert req.url.params["page_size"] == "50"

    def test_list_with_options(
        self, routed_client: FluxisClient, routing_recorder: _RoutingRecorder
    ) -> None:
        routed_client.transactions.list(
            ListTransactionsOptions(
                account_id="acc-1",
                page=2,
                page_size=10,
                status="completed",
                sort="created_at",
                order="desc",
            )
        )
        req = routing_recorder.last_api_request()
        assert req.url.params["account_id"] == "acc-1"
        assert req.url.params["page"] == "2"
        assert req.url.params["page_size"] == "10"
        assert req.url.params["status"] == "completed"
        assert req.url.params["sort"] == "created_at"
        assert req.url.params["order"] == "desc"
