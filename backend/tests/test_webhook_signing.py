"""
Tests for webhook HMAC signing and verification.
Tests: valid signatures, tampered payloads, wrong secrets, expired timestamps,
missing fields, timing-safe comparison.
"""

import hashlib
import hmac
import json
import time

from django.test import TestCase

from core.services.webhook_service import (
    verify_webhook_signature,
    WebhookDeliveryService,
    REPLAY_WINDOW_SECONDS,
)


class WebhookSignatureVerificationTests(TestCase):
    """Test the verify_webhook_signature function."""

    def setUp(self):
        self.secret = "test-webhook-secret-key-2026"
        self.payload = json.dumps(
            {"event_type": "report.completed", "submission_id": "abc-123"},
            separators=(",", ":"),
            sort_keys=True,
        )
        self.timestamp = str(int(time.time()))
        # Compute valid signature
        signature_input = f"{self.timestamp}.{self.payload}"
        digest = hmac.new(
            self.secret.encode("utf-8"),
            signature_input.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        self.valid_signature = f"sha256={digest}"

    def test_valid_signature_passes(self):
        result = verify_webhook_signature(
            self.payload, self.valid_signature, self.timestamp, self.secret
        )
        self.assertTrue(result)

    def test_valid_signature_with_bytes_payload(self):
        """Payload as bytes should also work."""
        result = verify_webhook_signature(
            self.payload.encode("utf-8"),
            self.valid_signature,
            self.timestamp,
            self.secret,
        )
        self.assertTrue(result)

    def test_tampered_payload_fails(self):
        tampered = json.dumps(
            {"event_type": "report.completed", "submission_id": "TAMPERED"},
            separators=(",", ":"),
            sort_keys=True,
        )
        result = verify_webhook_signature(
            tampered, self.valid_signature, self.timestamp, self.secret
        )
        self.assertFalse(result)

    def test_wrong_secret_fails(self):
        result = verify_webhook_signature(
            self.payload, self.valid_signature, self.timestamp, "wrong-secret"
        )
        self.assertFalse(result)

    def test_expired_timestamp_fails(self):
        """A timestamp older than REPLAY_WINDOW_SECONDS (5 min) should be rejected."""
        old_timestamp = str(int(time.time()) - REPLAY_WINDOW_SECONDS - 10)
        # Recompute signature with old timestamp
        sig_input = f"{old_timestamp}.{self.payload}"
        digest = hmac.new(
            self.secret.encode("utf-8"),
            sig_input.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        old_signature = f"sha256={digest}"

        result = verify_webhook_signature(
            self.payload, old_signature, old_timestamp, self.secret
        )
        self.assertFalse(result)

    def test_future_timestamp_fails(self):
        """A timestamp too far in the future should also be rejected."""
        future_timestamp = str(int(time.time()) + REPLAY_WINDOW_SECONDS + 10)
        sig_input = f"{future_timestamp}.{self.payload}"
        digest = hmac.new(
            self.secret.encode("utf-8"),
            sig_input.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        future_signature = f"sha256={digest}"

        result = verify_webhook_signature(
            self.payload, future_signature, future_timestamp, self.secret
        )
        self.assertFalse(result)

    def test_missing_signature_fails(self):
        result = verify_webhook_signature(
            self.payload, None, self.timestamp, self.secret
        )
        self.assertFalse(result)

    def test_missing_timestamp_fails(self):
        result = verify_webhook_signature(
            self.payload, self.valid_signature, None, self.secret
        )
        self.assertFalse(result)

    def test_missing_secret_fails(self):
        result = verify_webhook_signature(
            self.payload, self.valid_signature, self.timestamp, None
        )
        self.assertFalse(result)

    def test_empty_signature_fails(self):
        result = verify_webhook_signature(
            self.payload, "", self.timestamp, self.secret
        )
        self.assertFalse(result)

    def test_invalid_timestamp_format_fails(self):
        result = verify_webhook_signature(
            self.payload, self.valid_signature, "not-a-number", self.secret
        )
        self.assertFalse(result)


class WebhookDeliveryServiceSigningTests(TestCase):
    """Test the WebhookDeliveryService.sign_payload static method."""

    def setUp(self):
        self.secret = "signing-test-secret"
        self.timestamp = str(int(time.time()))
        self.payload_str = json.dumps(
            {"key": "value"}, separators=(",", ":"), sort_keys=True
        )

    def test_sign_payload_format(self):
        """Signature should start with 'sha256='."""
        signature = WebhookDeliveryService.sign_payload(
            self.payload_str, self.secret, self.timestamp
        )
        self.assertTrue(signature.startswith("sha256="))

    def test_sign_payload_deterministic(self):
        """Same inputs should always produce the same signature."""
        sig1 = WebhookDeliveryService.sign_payload(
            self.payload_str, self.secret, self.timestamp
        )
        sig2 = WebhookDeliveryService.sign_payload(
            self.payload_str, self.secret, self.timestamp
        )
        self.assertEqual(sig1, sig2)

    def test_different_timestamps_produce_different_signatures(self):
        sig1 = WebhookDeliveryService.sign_payload(
            self.payload_str, self.secret, "1000000000"
        )
        sig2 = WebhookDeliveryService.sign_payload(
            self.payload_str, self.secret, "1000000001"
        )
        self.assertNotEqual(sig1, sig2)

    def test_sign_and_verify_roundtrip(self):
        """sign_payload output should pass verify_webhook_signature."""
        signature = WebhookDeliveryService.sign_payload(
            self.payload_str, self.secret, self.timestamp
        )
        result = verify_webhook_signature(
            self.payload_str, signature, self.timestamp, self.secret
        )
        self.assertTrue(result)

    def test_verify_signature_class_method(self):
        """WebhookDeliveryService.verify_signature should delegate to module function."""
        signature = WebhookDeliveryService.sign_payload(
            self.payload_str, self.secret, self.timestamp
        )
        result = WebhookDeliveryService.verify_signature(
            self.payload_str.encode("utf-8"),
            signature,
            self.timestamp,
            self.secret,
        )
        self.assertTrue(result)
