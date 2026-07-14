"""Tests for receipt signing-key loading from the environment.

A production deploy must supply a STABLE key (RECEIPT_RSA_PRIVATE_KEY) so
that (a) all gunicorn workers sign/verify with the same key and (b)
receipts keep verifying across restarts. These tests cover the three env
forms a docker-compose .env can carry: a real multiline PEM, a single-line
PEM with escaped newlines, and a base64-encoded PEM.
"""

import base64
import os
from io import StringIO

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.test import TestCase, override_settings

from core.crypto import canonical, receipt_signing

_ALL_RECEIPT_ENV = (
    "RECEIPT_RSA_PRIVATE_KEY",
    "RECEIPT_RSA_PRIVATE_KEY_B64",
    "RECEIPT_RSA_KEY_ID",
    "RECEIPT_ALLOW_EPHEMERAL_KEY",
)


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


class EphemeralKeyGuardTests(TestCase):
    """The ephemeral key was a silent coin flip. It must now be loud, and refused.

    Production runs gunicorn with ``--workers 4`` and no ``--preload``, so with no
    key configured every worker minted its OWN ephemeral keypair — while all of
    them advertised the *same* key id. ``verify()`` checks the key id first, so a
    receipt signed by worker 1 passed the identity check on worker 3 and then
    failed the signature check: a genuine receipt reported invalid, with nothing
    in it to explain why.
    """

    def setUp(self):
        self._saved = {v: os.environ.get(v) for v in _ALL_RECEIPT_ENV}
        for var in _ALL_RECEIPT_ENV:
            os.environ.pop(var, None)
        receipt_signing.reset_cache()

    def tearDown(self):
        for var, val in self._saved.items():
            if val is None:
                os.environ.pop(var, None)
            else:
                os.environ[var] = val
        receipt_signing.reset_cache()

    @override_settings(DEBUG=True, TESTING=False)
    def test_ephemeral_key_ids_are_unique_per_key(self):
        # Two processes with no configured key. Each mints its own keypair, so
        # each must announce a DIFFERENT identity. Before the fix both returned
        # the literal "stickforstats-receipt-ephemeral" and this assertion failed.
        _, pub_a, kid_a = receipt_signing.get_keypair()
        receipt_signing.reset_cache()
        _, pub_b, kid_b = receipt_signing.get_keypair()

        self.assertNotEqual(
            pub_a.public_numbers().n,
            pub_b.public_numbers().n,
            "precondition: the two processes should hold different ephemeral keys",
        )
        self.assertNotEqual(
            kid_a, kid_b, "two different ephemeral keys must not share a key id"
        )
        self.assertTrue(kid_a.startswith("stickforstats-receipt-ephemeral-"))

    @override_settings(DEBUG=True, TESTING=False)
    def test_cross_process_ephemeral_receipt_fails_on_identity_not_on_crypto(self):
        # The multi-worker scenario. The receipt must be rejected (it is not
        # verifiable), but now it is rejected because the key id does not match —
        # which is diagnosable — rather than by a bare signature failure under a
        # key id that claimed to be the right one.
        data = canonical.canonical_bytes({"a": "1"})
        sig = receipt_signing.sign(data)
        receipt_signing.reset_cache()  # a different worker, a different key

        self.assertFalse(receipt_signing.verify(data, sig["value"], sig["key_id"]))
        self.assertNotEqual(sig["key_id"], receipt_signing.active_key_id())

    @override_settings(DEBUG=False, TESTING=False)
    def test_production_refuses_to_sign_with_an_ephemeral_key(self):
        data = canonical.canonical_bytes({"a": "1"})
        with self.assertRaises(ImproperlyConfigured) as ctx:
            receipt_signing.sign(data)
        # The message has to tell the operator what to actually do.
        self.assertIn("generate_receipt_keypair", str(ctx.exception))

    @override_settings(DEBUG=False, TESTING=False)
    def test_production_with_a_configured_key_signs_normally(self):
        os.environ["RECEIPT_RSA_PRIVATE_KEY_B64"] = base64.b64encode(
            _fresh_pem().encode()
        ).decode()
        os.environ["RECEIPT_RSA_KEY_ID"] = "prod-1"
        receipt_signing.reset_cache()
        data = canonical.canonical_bytes({"a": "1"})
        sig = receipt_signing.sign(data)
        self.assertEqual(sig["key_id"], "prod-1")
        self.assertTrue(receipt_signing.verify(data, sig["value"], sig["key_id"]))

    @override_settings(DEBUG=False, TESTING=False)
    def test_explicit_opt_in_allows_an_ephemeral_key(self):
        os.environ["RECEIPT_ALLOW_EPHEMERAL_KEY"] = "1"
        receipt_signing.reset_cache()
        sig = receipt_signing.sign(canonical.canonical_bytes({"a": "1"}))
        self.assertTrue(sig["key_id"].startswith("stickforstats-receipt-ephemeral-"))


class GenerateReceiptKeypairEnvTests(TestCase):
    """`--env` must emit something the loader actually accepts.

    The runbook told operators to set RECEIPT_RSA_PRIVATE_KEY_B64, but no command
    emitted that form — which is a fair part of why the key never made it into
    .env.example. This test pins the command's output to the loader.
    """

    def setUp(self):
        self._saved = {v: os.environ.get(v) for v in _ALL_RECEIPT_ENV}

    def tearDown(self):
        for var in _ALL_RECEIPT_ENV:
            os.environ.pop(var, None)
        for var, val in self._saved.items():
            if val is not None:
                os.environ[var] = val
        receipt_signing.reset_cache()

    @override_settings(DEBUG=False, TESTING=False)
    def test_env_output_round_trips_into_a_working_production_key(self):
        out = StringIO()
        call_command("generate_receipt_keypair", "--env", "--kid", "round-trip-1", stdout=out)

        env_lines = dict(
            line.split("=", 1)
            for line in out.getvalue().splitlines()
            if line.startswith("RECEIPT_RSA_")
        )
        self.assertIn("RECEIPT_RSA_PRIVATE_KEY_B64", env_lines)
        self.assertEqual(env_lines["RECEIPT_RSA_KEY_ID"], "round-trip-1")

        # Feed the printed lines back in exactly as a .env would, with DEBUG=False:
        # if the command's output were not loadable, this would raise.
        for var, val in env_lines.items():
            os.environ[var] = val
        receipt_signing.reset_cache()

        data = canonical.canonical_bytes({"a": "1"})
        sig = receipt_signing.sign(data)
        self.assertEqual(sig["key_id"], "round-trip-1")
        self.assertTrue(receipt_signing.verify(data, sig["value"], sig["key_id"]))
