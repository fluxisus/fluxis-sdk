"""NASPIP token models."""

from __future__ import annotations

from dataclasses import dataclass

from fluxis.models.common import (
    Merchant,
    OrderItem,
    _as_dict,
    _optional_bool,
    _optional_float,
    _optional_int,
    _optional_str,
)


@dataclass
class NaspipPaymentData:
    address: str
    amount: float
    unique_asset_id: str
    id: str | None = None
    expires_at: int | None = None
    is_open: bool | None = None


@dataclass
class CreateNaspipRequest:
    payment: NaspipPaymentData


@dataclass
class CreateNaspipResponse:
    token: str

    @classmethod
    def from_dict(cls, data: object) -> CreateNaspipResponse:
        payload = _as_dict(data)
        token = _optional_str(payload, "token")
        if token is None:
            raise ValueError("NASPIP create response missing token")
        return cls(token=token)


@dataclass
class NaspipPaymentInfo:
    id: str | None = None
    address: str | None = None
    amount: float | None = None
    unique_asset_id: str | None = None
    expires_at: int | None = None
    is_open: bool | None = None

    @classmethod
    def from_dict(cls, data: object) -> NaspipPaymentInfo:
        payload = _as_dict(data)
        return cls(
            id=_optional_str(payload, "id"),
            address=_optional_str(payload, "address"),
            amount=_optional_float(payload, "amount"),
            unique_asset_id=_optional_str(payload, "unique_asset_id"),
            expires_at=_optional_int(payload, "expires_at"),
            is_open=_optional_bool(payload, "is_open"),
        )


@dataclass
class NaspipOrderInfo:
    total: str | None = None
    coin_code: str | None = None
    description: str | None = None
    merchant: Merchant | None = None
    items: list[OrderItem] | None = None

    @classmethod
    def from_dict(cls, data: object) -> NaspipOrderInfo:
        payload = _as_dict(data)
        merchant_raw = payload.get("merchant")
        items_raw = payload.get("items")
        return cls(
            total=_optional_str(payload, "total"),
            coin_code=_optional_str(payload, "coin_code"),
            description=_optional_str(payload, "description"),
            merchant=Merchant.from_dict(merchant_raw) if isinstance(merchant_raw, dict) else None,
            items=(
                [OrderItem.from_dict(item) for item in items_raw]
                if isinstance(items_raw, list)
                else None
            ),
        )


@dataclass
class ReadNaspipResponse:
    payment: NaspipPaymentInfo | None = None
    order: NaspipOrderInfo | None = None
    payment_options: list[str] | None = None
    url: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> ReadNaspipResponse:
        payload = _as_dict(data)
        payment_raw = payload.get("payment")
        order_raw = payload.get("order")
        payment_options_raw = payload.get("payment_options")
        payment_options = (
            [str(item) for item in payment_options_raw]
            if isinstance(payment_options_raw, list)
            else None
        )
        return cls(
            payment=(
                NaspipPaymentInfo.from_dict(payment_raw) if isinstance(payment_raw, dict) else None
            ),
            order=NaspipOrderInfo.from_dict(order_raw) if isinstance(order_raw, dict) else None,
            payment_options=payment_options,
            url=_optional_str(payload, "url"),
        )
