"""Point of sale and payment request models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import cast

from fluxis.models.common import (
    Merchant,
    Order,
    Paginated,
    PaymentRequestStatus,
    PointOfSaleType,
    _as_dict,
    _optional_int,
    _optional_str,
)


@dataclass
class CreatePointOfSaleRequest:
    name: str
    reference_currency: str
    type: PointOfSaleType
    account_id: str | None = None
    merchant: Merchant | None = None
    payment_options: list[str] | None = None


@dataclass
class UpdatePointOfSaleRequest:
    reference_currency: str
    name: str | None = None
    merchant: Merchant | None = None
    payment_options: list[str] | None = None


@dataclass
class PointOfSaleConfig:
    reference_currency: str | None = None
    merchant: Merchant | None = None
    payment_options: list[str] | None = None

    @classmethod
    def from_dict(cls, data: object) -> PointOfSaleConfig:
        payload = _as_dict(data)
        merchant_raw = payload.get("merchant")
        payment_options_raw = payload.get("payment_options")
        payment_options = (
            [str(item) for item in payment_options_raw]
            if isinstance(payment_options_raw, list)
            else None
        )
        return cls(
            reference_currency=_optional_str(payload, "reference_currency"),
            merchant=Merchant.from_dict(merchant_raw) if isinstance(merchant_raw, dict) else None,
            payment_options=payment_options,
        )


@dataclass
class PointOfSale:
    id: str
    name: str
    type: PointOfSaleType | None = None
    organization_id: str | None = None
    organization_name: str | None = None
    account_id: str | None = None
    account_name: str | None = None
    config: PointOfSaleConfig | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> PointOfSale:
        payload = _as_dict(data)
        pos_id = _optional_str(payload, "id")
        name = _optional_str(payload, "name")
        if pos_id is None or name is None:
            raise ValueError("Point of sale response missing required fields")
        config_raw = payload.get("config")
        return cls(
            id=pos_id,
            name=name,
            type=cast("PointOfSaleType | None", _optional_str(payload, "type")),
            organization_id=_optional_str(payload, "organization_id"),
            organization_name=_optional_str(payload, "organization_name"),
            account_id=_optional_str(payload, "account_id"),
            account_name=_optional_str(payload, "account_name"),
            config=(
                PointOfSaleConfig.from_dict(config_raw) if isinstance(config_raw, dict) else None
            ),
            created_at=_optional_str(payload, "created_at"),
            updated_at=_optional_str(payload, "updated_at"),
        )


@dataclass
class ListPointOfSaleOptions:
    page: int | None = None
    page_size: int | None = None
    account_id: str | None = None


@dataclass
class CreatePaymentRequestRequest:
    amount: str
    unique_asset_id: str
    reference_id: str | None = None
    order: Order | None = None


@dataclass
class CreatePaymentRequestCheckoutRequest:
    amount: float
    coin_code: str
    reference_id: str | None = None
    order: Order | None = None


@dataclass
class PaymentRequestResponse:
    id: str
    status: PaymentRequestStatus
    token: str
    reference_id: str | None = None
    expiration: int | None = None

    @classmethod
    def from_dict(cls, data: object) -> PaymentRequestResponse:
        payload = _as_dict(data)
        pr_id = _optional_str(payload, "id")
        status = _optional_str(payload, "status")
        token = _optional_str(payload, "token")
        if pr_id is None or status is None or token is None:
            raise ValueError("Payment request response missing required fields")
        return cls(
            id=pr_id,
            status=cast("PaymentRequestStatus", status),
            token=token,
            reference_id=_optional_str(payload, "reference_id"),
            expiration=_optional_int(payload, "expiration"),
        )


@dataclass
class PaymentRequestCheckoutResponse(PaymentRequestResponse):
    checkout_url: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> PaymentRequestCheckoutResponse:
        base = PaymentRequestResponse.from_dict(data)
        payload = _as_dict(data)
        return cls(
            id=base.id,
            status=base.status,
            token=base.token,
            reference_id=base.reference_id,
            expiration=base.expiration,
            checkout_url=_optional_str(payload, "checkout_url"),
        )


def parse_point_of_sale_page(data: object) -> Paginated:
    page = Paginated.from_dict(data, PointOfSale)
    return page
