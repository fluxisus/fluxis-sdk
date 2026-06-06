"""Transaction models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, cast

from fluxis.models.common import (
    Paginated,
    TransactionStatus,
    TransactionType,
    _as_dict,
    _optional_float,
    _optional_str,
)


@dataclass
class ListTransactionsOptions:
    page: int | None = None
    page_size: int | None = None
    status: TransactionStatus | None = None
    sort: str | None = None
    order: Literal["asc", "desc"] | None = None
    account_id: str | None = None


@dataclass
class Transaction:
    id: str
    type: TransactionType
    status: TransactionStatus
    currency: str | None = None
    network: str | None = None
    unique_asset_id: str | None = None
    gross_amount: float | None = None
    net_amount: float | None = None
    expected_amount: float | None = None
    from_address: str | None = None
    from_type: str | None = None
    to_address: str | None = None
    to_type: str | None = None
    transaction_hash: str | None = None
    financial_provider: str | None = None
    account_external_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> Transaction:
        payload = _as_dict(data)
        tx_id = _optional_str(payload, "id")
        tx_type = _optional_str(payload, "type")
        status = _optional_str(payload, "status")
        if tx_id is None or tx_type is None or status is None:
            raise ValueError("Transaction response missing required fields")
        return cls(
            id=tx_id,
            type=cast("TransactionType", tx_type),
            status=cast("TransactionStatus", status),
            currency=_optional_str(payload, "currency"),
            network=_optional_str(payload, "network"),
            unique_asset_id=_optional_str(payload, "unique_asset_id"),
            gross_amount=_optional_float(payload, "gross_amount"),
            net_amount=_optional_float(payload, "net_amount"),
            expected_amount=_optional_float(payload, "expected_amount"),
            from_address=_optional_str(payload, "from"),
            from_type=_optional_str(payload, "from_type"),
            to_address=_optional_str(payload, "to"),
            to_type=_optional_str(payload, "to_type"),
            transaction_hash=_optional_str(payload, "transaction_hash"),
            financial_provider=_optional_str(payload, "financial_provider"),
            account_external_id=_optional_str(payload, "account_external_id"),
            created_at=_optional_str(payload, "created_at"),
            updated_at=_optional_str(payload, "updated_at"),
        )


def parse_transaction_page(data: object) -> Paginated:
    return Paginated.from_dict(data, Transaction)
