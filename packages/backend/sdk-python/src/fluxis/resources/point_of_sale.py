"""Point of sale resource."""

from __future__ import annotations

from typing import TYPE_CHECKING

from fluxis.models.common import Paginated
from fluxis.models.payment_intention import (
    CreatePaymentIntentionRequest,
    GetQrResponse,
    PaymentIntention,
)
from fluxis.models.point_of_sale import (
    CreatePaymentRequestCheckoutRequest,
    CreatePaymentRequestRequest,
    CreatePointOfSaleRequest,
    ListPointOfSaleOptions,
    PaymentRequestCheckoutResponse,
    PaymentRequestResponse,
    PointOfSale,
    UpdatePointOfSaleRequest,
    parse_point_of_sale_page,
)

if TYPE_CHECKING:
    from fluxis.client import AsyncFluxisClient, FluxisClient

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 50


def _build_pos_list_query(options: ListPointOfSaleOptions | None) -> dict[str, str | int]:
    query: dict[str, str | int] = {
        "page": options.page if options and options.page is not None else DEFAULT_PAGE,
        "page_size": (
            options.page_size if options and options.page_size is not None else DEFAULT_PAGE_SIZE
        ),
    }
    if options and options.account_id is not None:
        query["account_id"] = options.account_id
    return query


class PointOfSaleResource:
    def __init__(self, client: FluxisClient) -> None:
        self._client = client

    def list(self, options: ListPointOfSaleOptions | None = None) -> Paginated:
        data = self._client.request("GET", "/pos", query=_build_pos_list_query(options))
        return parse_point_of_sale_page(data)

    def get(self, pos_id: str) -> PointOfSale:
        data = self._client.request("GET", f"/pos/{pos_id}")
        return PointOfSale.from_dict(data)

    def create(self, data: CreatePointOfSaleRequest) -> PointOfSale:
        result = self._client.request("POST", "/pos", data)
        return PointOfSale.from_dict(result)

    def update(self, pos_id: str, data: UpdatePointOfSaleRequest) -> PointOfSale:
        result = self._client.request("PUT", f"/pos/{pos_id}", data)
        return PointOfSale.from_dict(result)

    def delete(self, pos_id: str) -> None:
        self._client.request("DELETE", f"/pos/{pos_id}")

    def get_payment_intention(self, pos_id: str) -> PaymentIntention:
        data = self._client.request("GET", f"/pos/{pos_id}/payment-intention")
        return PaymentIntention.from_dict(data)

    def create_payment_intention(
        self,
        pos_id: str,
        data: CreatePaymentIntentionRequest,
    ) -> PaymentIntention:
        result = self._client.request("POST", f"/pos/{pos_id}/payment-intention", data)
        return PaymentIntention.from_dict(result)

    def close_payment_intention(self, pos_id: str) -> None:
        self._client.request("POST", f"/pos/{pos_id}/payment-intention/close")

    def get_qr(self, pos_id: str) -> GetQrResponse:
        data = self._client.request("GET", f"/pos/{pos_id}/qr")
        return GetQrResponse.from_dict(data)

    def create_payment_request(
        self,
        pos_id: str,
        data: CreatePaymentRequestRequest,
    ) -> PaymentRequestResponse:
        result = self._client.request("POST", f"/pos/{pos_id}/payment-request", data)
        return PaymentRequestResponse.from_dict(result)

    def get_payment_request(self, pos_id: str, payment_request_id: str) -> PaymentRequestResponse:
        data = self._client.request("GET", f"/pos/{pos_id}/payment-request/{payment_request_id}")
        return PaymentRequestResponse.from_dict(data)

    def create_payment_request_checkout(
        self,
        pos_id: str,
        data: CreatePaymentRequestCheckoutRequest,
    ) -> PaymentRequestCheckoutResponse:
        result = self._client.request("POST", f"/pos/{pos_id}/payment-request-checkout", data)
        return PaymentRequestCheckoutResponse.from_dict(result)


class AsyncPointOfSaleResource:
    def __init__(self, client: AsyncFluxisClient) -> None:
        self._client = client

    async def list(self, options: ListPointOfSaleOptions | None = None) -> Paginated:
        data = await self._client.request("GET", "/pos", query=_build_pos_list_query(options))
        return parse_point_of_sale_page(data)

    async def get(self, pos_id: str) -> PointOfSale:
        data = await self._client.request("GET", f"/pos/{pos_id}")
        return PointOfSale.from_dict(data)

    async def create(self, data: CreatePointOfSaleRequest) -> PointOfSale:
        result = await self._client.request("POST", "/pos", data)
        return PointOfSale.from_dict(result)

    async def update(self, pos_id: str, data: UpdatePointOfSaleRequest) -> PointOfSale:
        result = await self._client.request("PUT", f"/pos/{pos_id}", data)
        return PointOfSale.from_dict(result)

    async def delete(self, pos_id: str) -> None:
        await self._client.request("DELETE", f"/pos/{pos_id}")

    async def get_payment_intention(self, pos_id: str) -> PaymentIntention:
        data = await self._client.request("GET", f"/pos/{pos_id}/payment-intention")
        return PaymentIntention.from_dict(data)

    async def create_payment_intention(
        self,
        pos_id: str,
        data: CreatePaymentIntentionRequest,
    ) -> PaymentIntention:
        result = await self._client.request("POST", f"/pos/{pos_id}/payment-intention", data)
        return PaymentIntention.from_dict(result)

    async def close_payment_intention(self, pos_id: str) -> None:
        await self._client.request("POST", f"/pos/{pos_id}/payment-intention/close")

    async def get_qr(self, pos_id: str) -> GetQrResponse:
        data = await self._client.request("GET", f"/pos/{pos_id}/qr")
        return GetQrResponse.from_dict(data)

    async def create_payment_request(
        self,
        pos_id: str,
        data: CreatePaymentRequestRequest,
    ) -> PaymentRequestResponse:
        result = await self._client.request("POST", f"/pos/{pos_id}/payment-request", data)
        return PaymentRequestResponse.from_dict(result)

    async def get_payment_request(
        self,
        pos_id: str,
        payment_request_id: str,
    ) -> PaymentRequestResponse:
        path = f"/pos/{pos_id}/payment-request/{payment_request_id}"
        data = await self._client.request("GET", path)
        return PaymentRequestResponse.from_dict(data)

    async def create_payment_request_checkout(
        self,
        pos_id: str,
        data: CreatePaymentRequestCheckoutRequest,
    ) -> PaymentRequestCheckoutResponse:
        result = await self._client.request("POST", f"/pos/{pos_id}/payment-request-checkout", data)
        return PaymentRequestCheckoutResponse.from_dict(result)
