"""Webhook signature verification utilities."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from collections.abc import Mapping

MAX_AGE_SECONDS = 10


def _sort_keys(value: object) -> object:
    if isinstance(value, list):
        return [_sort_keys(item) for item in value]
    if isinstance(value, Mapping):
        return {key: _sort_keys(value[key]) for key in sorted(value)}
    return value


def verify_webhook_signature(
    payload: object,
    signature: str,
    timestamp: str,
    secret: str,
) -> bool:
    """Verify a Fluxis webhook HMAC-SHA256 signature."""
    try:
        request_timestamp = int(timestamp)
    except ValueError:
        return False

    now = int(time.time())
    if now - request_timestamp > MAX_AGE_SECONDS:
        return False

    canonical_json = json.dumps(_sort_keys(payload), separators=(",", ":"))
    signed_string = f"{timestamp}.{canonical_json}"
    expected_signature = hmac.new(
        secret.encode("utf-8"),
        signed_string.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    if len(signature) != len(expected_signature):
        return False

    return hmac.compare_digest(signature, expected_signature)
