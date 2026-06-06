"""Payment intention models."""

from __future__ import annotations

from dataclasses import dataclass

from fluxis.models.common import _as_dict, _optional_float, _optional_str


@dataclass
class PaymentIntention:
    id: str
    amount: float
    coin_code: str
    external_id: str | None = None
    status: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> PaymentIntention:
        payload = _as_dict(data)
        intention_id = _optional_str(payload, "id")
        amount = _optional_float(payload, "amount")
        coin_code = _optional_str(payload, "coin_code")
        if intention_id is None or amount is None or coin_code is None:
            raise ValueError("Payment intention response missing required fields")
        return cls(
            id=intention_id,
            amount=amount,
            coin_code=coin_code,
            external_id=_optional_str(payload, "external_id"),
            status=_optional_str(payload, "status"),
            created_at=_optional_str(payload, "created_at"),
            updated_at=_optional_str(payload, "updated_at"),
        )


@dataclass
class CreatePaymentIntentionRequest:
    amount: float
    coin_code: str
    external_id: str | None = None


@dataclass
class GetQrResponse:
    qr_url: str | None = None
    token: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> GetQrResponse:
        payload = _as_dict(data)
        return cls(
            qr_url=_optional_str(payload, "qr_url"),
            token=_optional_str(payload, "token"),
        )
