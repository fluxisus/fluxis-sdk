"""Organization models."""

from __future__ import annotations

from dataclasses import dataclass

from fluxis.models.account import SettlementAddressResponse
from fluxis.models.common import _as_dict, _optional_str, parse_list


@dataclass
class Organization:
    id: str
    name: str
    country: str
    owner_email: str
    tax_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> Organization:
        payload = _as_dict(data)
        org_id = _optional_str(payload, "id")
        name = _optional_str(payload, "name")
        country = _optional_str(payload, "country")
        owner_email = _optional_str(payload, "owner_email")
        if org_id is None or name is None or country is None or owner_email is None:
            raise ValueError("Organization response missing required fields")
        return cls(
            id=org_id,
            name=name,
            country=country,
            owner_email=owner_email,
            tax_id=_optional_str(payload, "tax_id"),
            created_at=_optional_str(payload, "created_at"),
            updated_at=_optional_str(payload, "updated_at"),
        )


def parse_settlement_address_list(data: object) -> list[SettlementAddressResponse]:
    return parse_list(data, SettlementAddressResponse)
