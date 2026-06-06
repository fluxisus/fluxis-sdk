"""Shared models, enums, and parsing helpers."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field, is_dataclass
from typing import Literal, TypeVar, cast

PaymentRequestStatus = Literal[
    "created",
    "pending",
    "processing",
    "confirmed",
    "expired",
    "completed",
    "overpaid",
    "underpaid",
    "failed",
]

TransactionType = Literal[
    "deposit",
    "withdraw",
    "refund",
    "adjustment",
    "swap",
    "payment_in",
    "payment_out",
    "dry_run",
]

TransactionStatus = Literal[
    "preview",
    "pending",
    "created",
    "processing",
    "error",
    "expired",
    "failed",
    "completed",
]

EntityType = Literal["organization", "account", "financial_provider", "point_of_sale"]

PointOfSaleType = Literal["cashier_fixed", "online_fixed", "cashier_open"]

PaymentRequestType = Literal["fixed", "dynamic", "pre_loaded", "open"]

WebhookEventType = Literal["payment_request", "incoming_transfer", "refund"]

TransactionDetailType = Literal[
    "base",
    "fee",
    "tax",
    "other",
    "payment_net_amount",
    "payment_service_fee",
    "payment_developer_fee",
    "payment_revenue_shared_fee",
]

T = TypeVar("T")


@dataclass
class ApiResponse:
    """Successful API envelope."""

    status: Literal["success"]
    data: object


@dataclass
class ApiErrorResponse:
    """Error API envelope."""

    status: Literal["error"]
    code: str
    message: str
    details: str | None = None


@dataclass
class Merchant:
    name: str | None = None
    description: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> Merchant:
        payload = _as_dict(data)
        return cls(
            name=_optional_str(payload, "name"),
            description=_optional_str(payload, "description"),
        )


@dataclass
class OrderItem:
    description: str | None = None
    quantity: int | None = None
    unit_price: str | None = None
    amount: str | None = None
    coin_code: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> OrderItem:
        payload = _as_dict(data)
        return cls(
            description=_optional_str(payload, "description"),
            quantity=_optional_int(payload, "quantity"),
            unit_price=_optional_str(payload, "unit_price"),
            amount=_optional_str(payload, "amount"),
            coin_code=_optional_str(payload, "coin_code"),
        )


@dataclass
class Order:
    total: str | None = None
    coin_code: str | None = None
    description: str | None = None
    merchant: Merchant | None = None
    items: list[OrderItem] | None = None

    @classmethod
    def from_dict(cls, data: object) -> Order:
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
class SettlementAddress:
    settlement_address: str | None = None
    address_tag: str | None = None
    address_type: str | None = None
    owner: EntityType | None = None
    settlement_type: TransactionDetailType | None = None

    @classmethod
    def from_dict(cls, data: object) -> SettlementAddress:
        payload = _as_dict(data)
        return cls(
            settlement_address=_optional_str(payload, "settlement_address"),
            address_tag=_optional_str(payload, "address_tag"),
            address_type=_optional_str(payload, "address_type"),
            owner=cast("EntityType | None", _optional_str(payload, "owner")),
            settlement_type=cast(
                "TransactionDetailType | None",
                _optional_str(payload, "settlement_type"),
            ),
        )


@dataclass
class Paginated:
    """Paginated list wrapper."""

    data: list[object] = field(default_factory=list)
    page: int = 1
    page_size: int = 50
    total: int = 0
    total_pages: int = 0

    @classmethod
    def from_dict(cls, data: object, item_factory: type[T]) -> Paginated:
        payload = _as_dict(data)
        items_raw = payload.get("data")
        items: list[object] = []
        if isinstance(items_raw, list):
            items = [item_factory.from_dict(item) for item in items_raw]  # type: ignore[attr-defined]
        return cls(
            data=items,
            page=_optional_int(payload, "page") or 1,
            page_size=_optional_int(payload, "page_size") or 50,
            total=_optional_int(payload, "total") or 0,
            total_pages=_optional_int(payload, "total_pages") or 0,
        )


def _as_dict(data: object) -> dict[str, object]:
    if not isinstance(data, dict):
        raise TypeError("Expected a mapping response payload")
    return data


def _optional_str(data: dict[str, object], key: str) -> str | None:
    value = data.get(key)
    if value is None:
        return None
    return str(value)


def _optional_int(data: dict[str, object], key: str) -> int | None:
    value = data.get(key)
    if value is None:
        return None
    if isinstance(value, bool):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str) and value.isdigit():
        return int(value)
    return None


def _optional_float(data: dict[str, object], key: str) -> float | None:
    value = data.get(key)
    if value is None:
        return None
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, str):
        return float(value)
    return None


def _optional_bool(data: dict[str, object], key: str) -> bool | None:
    value = data.get(key)
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    return None


def to_json_dict(obj: object) -> dict[str, object]:
    """Serialize a dataclass request body, omitting None values."""
    if not is_dataclass(obj) or isinstance(obj, type):
        raise TypeError("Expected a dataclass instance")
    result: dict[str, object] = {}
    for key, value in asdict(obj).items():
        if value is None:
            continue
        if is_dataclass(value) and not isinstance(value, type):
            result[key] = to_json_dict(value)
        elif isinstance(value, list):
            result[key] = [
                to_json_dict(item) if is_dataclass(item) and not isinstance(item, type) else item
                for item in value
            ]
        else:
            result[key] = value
    return result


def parse_list(data: object, item_factory: type[T]) -> list[T]:
    if not isinstance(data, list):
        raise TypeError("Expected a list response payload")
    return [item_factory.from_dict(item) for item in data]  # type: ignore[attr-defined]
