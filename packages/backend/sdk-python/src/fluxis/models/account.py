"""Account models."""

from __future__ import annotations

from dataclasses import dataclass

from fluxis.models.common import SettlementAddress, _as_dict, _optional_str


@dataclass
class CreateAccountRequest:
    name: str
    external_id: str | None = None


@dataclass
class UpdateAccountRequest:
    name: str | None = None
    external_id: str | None = None


@dataclass
class Account:
    name: str
    id: str | None = None
    external_id: str | None = None
    created_at: str | None = None
    updated_at: str | None = None
    deleted_at: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> Account:
        payload = _as_dict(data)
        name = _optional_str(payload, "name")
        if name is None:
            raise ValueError("Account response missing name")
        return cls(
            name=name,
            id=_optional_str(payload, "id"),
            external_id=_optional_str(payload, "external_id"),
            created_at=_optional_str(payload, "created_at"),
            updated_at=_optional_str(payload, "updated_at"),
            deleted_at=_optional_str(payload, "deleted_at"),
        )


@dataclass
class SettlementAddressRequest:
    address: str
    network: str
    address_tag: str | None = None


@dataclass
class SettlementAddressResponse:
    address: str
    network: str
    address_tag: str | None = None

    @classmethod
    def from_dict(cls, data: object) -> SettlementAddressResponse:
        payload = _as_dict(data)
        address = _optional_str(payload, "address")
        network = _optional_str(payload, "network")
        if address is None or network is None:
            raise ValueError("Settlement address response missing required fields")
        return cls(
            address=address,
            network=network,
            address_tag=_optional_str(payload, "address_tag"),
        )


@dataclass
class AccountSettlementAddresses:
    addresses: list[SettlementAddress]

    @classmethod
    def from_dict(cls, data: object) -> AccountSettlementAddresses:
        payload = _as_dict(data)
        addresses_raw = payload.get("addresses")
        addresses: list[SettlementAddress] = []
        if isinstance(addresses_raw, list):
            addresses = [SettlementAddress.from_dict(item) for item in addresses_raw]
        return cls(addresses=addresses)
