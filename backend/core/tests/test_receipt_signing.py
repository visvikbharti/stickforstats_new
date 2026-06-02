"""Tests for receipt signing-key loading from the environment.

A production deploy must supply a STABLE key (RECEIPT_RSA_PRIVATE_KEY) so
that (a) all gunicorn workers sign/verify with the same key and (b)
receipts keep verifying across restarts. These tests cover the three env
forms a docker-compose .env can carry: a real multiline PEM, a single-line
PEM with escaped newlines, and a base64-encoded PEM.
"""

import base64
import os

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import TestCase

from core.crypto import canonical, receipt_signing


def _fresh_pem() -> str:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    return key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    ).decode("utf-8")


class ReceiptSigningKeyLoadTests(TestCase):
    def tearDown(self):
        for var in ("RECEIPT_RSA_PRIVATE_KEY", "RECEIPT_RSA_PRIVATE_KEY_B64", "RECEIPT_RSA_KEY_ID"):
            os.environ.pop(var, None)
        receipt_signing.reset_cache()

    def _assert_sign_verify_roundtrip(self):
        receipt_signing.reset_cache()
        data = canonical.canonical_bytes({"hello": "world", "n": "1"})
        sig = receipt_signing.sign(data)
        self.assertEqual(sig["alg"], "RS256")
        self.assertTrue(receipt_signing.verify(data, sig["value"], sig["key_id"]))
        # Tampered data must fail.
        self.assertFalse(receipt_signing.verify(data + b"x", sig["value"], sig["key_id"]))

    def test_multiline_pem(self):
        os.environ["RECEIPT_RSA_PRIVATE_KEY"] = _fresh_pem()
        os.environ["RECEIPT_RSA_KEY_ID"] = "k-multiline"
        receipt_signing.reset_cache()
        self.assertEqual(receipt_signing.active_key_id(), "k-multiline")
        self._assert_sign_verify_roundtrip()

    def test_escaped_newline_single_line_pem(self):
        # The form a single-line .env value takes: literal backslash-n.
        os.environ["RECEIPT_RSA_PRIVATE_KEY"] = _fresh_pem().replace("\n", "\\n")
        receipt_signing.reset_cache()
        self.assertEqual(receipt_signing.active_key_id(), "stickforstats-receipt-key-1")
        self._assert_sign_verify_roundtrip()

    def test_base64_pem(self):
        os.environ["RECEIPT_RSA_PRIVATE_KEY_B64"] = base64.b64encode(_fresh_pem().encode()).decode()
        receipt_signing.reset_cache()
        self._assert_sign_verify_roundtrip()

    def test_stable_key_is_shared_across_calls(self):
        # Two issue/verify cycles under a fixed key must interoperate — this is
        # the multi-worker / across-restart guarantee.
        pem = _fresh_pem()
        os.environ["RECEIPT_RSA_PRIVATE_KEY"] = pem
        receipt_signing.reset_cache()
        data = canonical.canonical_bytes({"a": "1"})
        sig = receipt_signing.sign(data)
        # Simulate a different worker/process loading the SAME env key.
        receipt_signing.reset_cache()
        self.assertTrue(receipt_signing.verify(data, sig["value"], sig["key_id"]))
