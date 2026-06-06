"""Authentication models."""

from __future__ import annotations

from dataclasses import dataclass

from fluxis.models.common import _as_dict, _optional_str


@dataclass
class AuthTokenRequest:
    api_key: str
    api_secret: str


@dataclass
class AuthTokenResponse:
    token: str
    expired_at: str

    @classmethod
    def from_dict(cls, data: object) -> AuthTokenResponse:
        payload = _as_dict(data)
        token = _optional_str(payload, "token")
        expired_at = _optional_str(payload, "expired_at")
        if token is None or expired_at is None:
            raise ValueError("Auth token response missing required fields")
        return cls(token=token, expired_at=expired_at)
