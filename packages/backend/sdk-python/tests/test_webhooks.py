"""Webhook signature verification tests."""

from __future__ import annotations

import hashlib
import hmac
import json
import time

from fluxis.webhooks import verify_webhook_signature


def _compute_signature(payload: object, timestamp: str, secret: str) -> str:
    def sort_keys(value: object) -> object:
        if isinstance(value, list):
            return [sort_keys(item) for item in value]
        if isinstance(value, dict):
            return {key: sort_keys(value[key]) for key in sorted(value)}
        return value

    canonical_json = json.dumps(sort_keys(payload), separators=(",", ":"))
    signed_string = f"{timestamp}.{canonical_json}"
    return hmac.new(secret.encode(), signed_string.encode(), hashlib.sha256).hexdigest()


def test_valid_signature() -> None:
    secret = "webhook-test-secret-123"
    payload = {"id": "pay-1", "status": "completed"}
    timestamp = str(int(time.time()))
    signature = _compute_signature(payload, timestamp, secret)
    assert verify_webhook_signature(payload, signature, timestamp, secret) is True


def test_different_key_order() -> None:
    secret = "webhook-test-secret-123"
    payload = {"status": "completed", "id": "pay-1"}
    timestamp = str(int(time.time()))
    signature = _compute_signature({"id": "pay-1", "status": "completed"}, timestamp, secret)
    assert verify_webhook_signature(payload, signature, timestamp, secret) is True


def test_tampered_payload() -> None:
    secret = "webhook-test-secret-123"
    payload = {"id": "pay-1", "status": "completed"}
    timestamp = str(int(time.time()))
    signature = _compute_signature(payload, timestamp, secret)
    tampered = {"id": "pay-1", "status": "failed"}
    assert verify_webhook_signature(tampered, signature, timestamp, secret) is False


def test_wrong_secret() -> None:
    secret = "webhook-test-secret-123"
    payload = {"id": "pay-1", "status": "completed"}
    timestamp = str(int(time.time()))
    signature = _compute_signature(payload, timestamp, "wrong-secret")
    assert verify_webhook_signature(payload, signature, timestamp, secret) is False


def test_expired_timestamp() -> None:
    secret = "webhook-test-secret-123"
    payload = {"id": "pay-1", "status": "completed"}
    timestamp = str(int(time.time()) - 11)
    signature = _compute_signature(payload, timestamp, secret)
    assert verify_webhook_signature(payload, signature, timestamp, secret) is False


def test_invalid_timestamp() -> None:
    secret = "webhook-test-secret-123"
    payload = {"id": "pay-1", "status": "completed"}
    signature = _compute_signature(payload, str(int(time.time())), secret)
    assert verify_webhook_signature(payload, signature, "not-a-timestamp", secret) is False


def test_mismatched_signature_length() -> None:
    payload = {"id": "pay-1"}
    assert verify_webhook_signature(payload, "abc", str(int(time.time())), "secret") is False


def test_empty_signature() -> None:
    payload = {"id": "pay-1"}
    assert verify_webhook_signature(payload, "", str(int(time.time())), "secret") is False


def test_nested_sorted_keys() -> None:
    secret = "webhook-test-secret-123"
    payload = {"event": "payment.completed", "data": {"z": 1, "a": {"y": 2, "b": 3}}}
    timestamp = str(int(time.time()))
    signature = _compute_signature(payload, timestamp, secret)
    assert verify_webhook_signature(payload, signature, timestamp, secret) is True
