"""Tests for receipt signing-key loading from the environment.

A production deploy must supply a STABLE key (RECEIPT_RSA_PRIVATE_KEY) so
that (a) all gunicorn workers sign/verify with the same key and (b)
receipts keep verifying across restarts. These tests cover the three env
forms a docker-compose .env can carry: a real multiline PEM, a single-line
PEM with escaped newlines, and a base64-encoded PEM.
"""

import base64
import json
import os
from io import StringIO

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings

from core.crypto import canonical, receipt_signing

_ALL_RECEIPT_ENV = (
    "RECEIPT_RSA_PRIVATE_KEY",
    "RECEIPT_RSA_PRIVATE_KEY_B64",
    "RECEIPT_RSA_KEY_ID",
    "RECEIPT_RSA_RETIRED_KEYS_B64",
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


@override_settings(DEBUG=False, TESTING=False)
class ReceiptKeyringTests(TestCase):
    """The keyring: verify against any known kid, sign with the active key.

    A rotation that keeps only one key turns every receipt signed under the old
    key into an unverifiable, unexportable dead end. The ring holds the retired
    key (public half only) so old receipts keep verifying and keep exporting a
    self-consistent bundle, while new receipts sign under the new active key.
    DEBUG/TESTING are off here so the ephemeral fallback stays out of the way and
    these tests exercise real, configured keys.
    """

    def setUp(self):
        self._saved = {v: os.environ.get(v) for v in _ALL_RECEIPT_ENV}
        for var in _ALL_RECEIPT_ENV:
            os.environ.pop(var, None)
        receipt_signing.reset_cache()
        # Two independent keys we fully control (A = old, B = new).
        self.priv_a = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        self.priv_b = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    def tearDown(self):
        for var, val in self._saved.items():
            if val is None:
                os.environ.pop(var, None)
            else:
                os.environ[var] = val
        receipt_signing.reset_cache()

    def _pem_priv(self, key) -> str:
        return key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()

    def _pem_pub(self, key) -> str:
        return key.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()

    def _install(self, active_priv, active_kid, retired):
        """Point the ring at ``active_priv`` under ``active_kid`` + retired ``(kid, pem)``."""
        os.environ["RECEIPT_RSA_PRIVATE_KEY"] = self._pem_priv(active_priv)
        os.environ["RECEIPT_RSA_KEY_ID"] = active_kid
        if retired:
            os.environ["RECEIPT_RSA_RETIRED_KEYS_B64"] = base64.b64encode(
                json.dumps([{"kid": k, "public_pem": p} for k, p in retired]).encode()
            ).decode()
        else:
            os.environ.pop("RECEIPT_RSA_RETIRED_KEYS_B64", None)
        receipt_signing.reset_cache()

    def test_old_receipt_still_verifies_after_the_key_is_rotated_out(self):
        self._install(self.priv_a, "key-a", retired=None)
        data = canonical.canonical_bytes({"x": "1"})
        sig = receipt_signing.sign(data)
        self.assertEqual(sig["key_id"], "key-a")

        # Rotate: B active, A retained as verify-only.
        self._install(self.priv_b, "key-b", retired=[("key-a", self._pem_pub(self.priv_a))])
        self.assertEqual(receipt_signing.active_key_id(), "key-b")

        # A-signed receipt still verifies (looked up by its own kid)...
        self.assertTrue(receipt_signing.verify(data, sig["value"], "key-a"))
        # ...a fresh receipt signs under B and verifies...
        sig_b = receipt_signing.sign(data)
        self.assertEqual(sig_b["key_id"], "key-b")
        self.assertTrue(receipt_signing.verify(data, sig_b["value"], "key-b"))
        # ...and an A-signature presented under B's kid must NOT verify.
        self.assertFalse(receipt_signing.verify(data, sig["value"], "key-b"))

    def test_unknown_kid_is_rejected_even_when_signature_is_valid_under_active(self):
        # The strong form: a signature that WOULD verify under a ring key, but
        # presented with a kid the ring does not know, must be rejected — verify
        # must honor the kid and not fall through to trying every key.
        self._install(self.priv_b, "key-b", retired=None)
        data = canonical.canonical_bytes({"x": "1"})
        sig = receipt_signing.sign(data)  # valid under the active key 'key-b'
        self.assertEqual(sig["key_id"], "key-b")
        self.assertNotIn("some-unknown-kid", receipt_signing.known_key_ids())
        # Same valid bytes, wrong/unknown kid -> False (no fall-through probing).
        self.assertFalse(receipt_signing.verify(data, sig["value"], "some-unknown-kid"))
        # Sanity: with the correct kid it verifies.
        self.assertTrue(receipt_signing.verify(data, sig["value"], "key-b"))

    def test_blank_kid_is_tried_against_every_key(self):
        # A legacy receipt recorded no kid.
        self._install(self.priv_a, "key-a", retired=None)
        data = canonical.canonical_bytes({"x": "1"})
        sig = receipt_signing.sign(data)
        self._install(self.priv_b, "key-b", retired=[("key-a", self._pem_pub(self.priv_a))])
        self.assertTrue(receipt_signing.verify(data, sig["value"], None))
        self.assertTrue(receipt_signing.verify(data, sig["value"], ""))
        # A genuinely bad signature still fails even with the try-all path.
        self.assertFalse(receipt_signing.verify(data + b"x", sig["value"], None))

    def test_jwks_publishes_every_key_active_first(self):
        self._install(self.priv_b, "key-b", retired=[("key-a", self._pem_pub(self.priv_a))])
        jwks = receipt_signing.get_public_jwks()
        self.assertEqual([k["kid"] for k in jwks["keys"]], ["key-b", "key-a"])
        self.assertEqual(len({k["n"] for k in jwks["keys"]}), 2)  # two distinct moduli
        for k in jwks["keys"]:
            self.assertEqual(k["kty"], "RSA")
            self.assertEqual(k["alg"], "RS256")
            self.assertEqual(k["use"], "sig")

    def test_public_pem_for_matches_kid_and_is_none_for_unknown(self):
        self._install(self.priv_b, "key-b", retired=[("key-a", self._pem_pub(self.priv_a))])
        self.assertEqual(receipt_signing.public_pem_for("key-a"), self._pem_pub(self.priv_a))
        self.assertEqual(receipt_signing.public_pem_for("key-b"), self._pem_pub(self.priv_b))
        self.assertIsNone(receipt_signing.public_pem_for("no-such-kid"))
        # Blank falls back to the active key.
        self.assertEqual(receipt_signing.public_pem_for(None), receipt_signing.public_pem())

    def test_retired_entry_colliding_with_active_kid_keeps_active(self):
        # Misconfiguration: a retired entry claims the ACTIVE kid but a different key.
        self._install(
            self.priv_b, "shared-kid", retired=[("shared-kid", self._pem_pub(self.priv_a))]
        )
        # The active key (B) must win for 'shared-kid'.
        self.assertEqual(receipt_signing.public_pem_for("shared-kid"), self._pem_pub(self.priv_b))
        data = canonical.canonical_bytes({"x": "1"})
        sig_b = receipt_signing.sign(data)  # active B signs under 'shared-kid'
        self.assertTrue(receipt_signing.verify(data, sig_b["value"], "shared-kid"))
        # An A-made signature under the same kid must NOT verify (A did not win).
        raw_a = self.priv_a.sign(data, padding.PKCS1v15(), hashes.SHA256())
        self.assertFalse(
            receipt_signing.verify(data, base64.b64encode(raw_a).decode(), "shared-kid")
        )

    def test_malformed_retired_keys_env_raises(self):
        self._install(self.priv_a, "key-a", retired=None)
        os.environ["RECEIPT_RSA_RETIRED_KEYS_B64"] = "not base64 json !!!"
        receipt_signing.reset_cache()
        with self.assertRaises(RuntimeError):
            receipt_signing.get_public_jwks()

    def test_retired_keys_env_requires_kid_and_pem(self):
        self._install(self.priv_a, "key-a", retired=None)
        os.environ["RECEIPT_RSA_RETIRED_KEYS_B64"] = base64.b64encode(
            json.dumps([{"kid": "x"}]).encode()  # missing public_pem
        ).decode()
        receipt_signing.reset_cache()
        with self.assertRaises(RuntimeError):
            receipt_signing.known_key_ids()


@override_settings(DEBUG=False, TESTING=False)
class RotateReceiptKeyCommandTests(TestCase):
    """`rotate_receipt_key` must emit lines that keep OLD receipts verifiable.

    The command's whole reason to exist is a safe rotation: after applying its
    output, receipts signed under the old key must still verify (via the retained
    verify-only key) while new receipts sign under the new active key.
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

    def _apply_env_lines(self, out_text):
        lines = dict(
            line.split("=", 1)
            for line in out_text.splitlines()
            if line.startswith("RECEIPT_RSA_")
        )
        # A rotation supersedes any plain-PEM active key with the _B64 form.
        os.environ.pop("RECEIPT_RSA_PRIVATE_KEY", None)
        for var, val in lines.items():
            os.environ[var] = val
        receipt_signing.reset_cache()
        return lines

    def test_rotation_output_keeps_old_receipts_verifiable(self):
        os.environ["RECEIPT_RSA_PRIVATE_KEY_B64"] = base64.b64encode(_fresh_pem().encode()).decode()
        os.environ["RECEIPT_RSA_KEY_ID"] = "stickforstats-receipt-key-1"
        receipt_signing.reset_cache()
        data = canonical.canonical_bytes({"a": "1"})
        old_sig = receipt_signing.sign(data)
        self.assertEqual(old_sig["key_id"], "stickforstats-receipt-key-1")

        out = StringIO()
        call_command("rotate_receipt_key", stdout=out)
        lines = self._apply_env_lines(out.getvalue())

        self.assertIn("RECEIPT_RSA_RETIRED_KEYS_B64", lines)
        self.assertEqual(receipt_signing.active_key_id(), "stickforstats-receipt-key-2")
        self.assertIn("stickforstats-receipt-key-1", receipt_signing.known_key_ids())

        # The OLD receipt still verifies under its original kid...
        self.assertTrue(receipt_signing.verify(data, old_sig["value"], old_sig["key_id"]))
        # ...and new receipts sign under the new active key and verify.
        new_sig = receipt_signing.sign(data)
        self.assertEqual(new_sig["key_id"], "stickforstats-receipt-key-2")
        self.assertTrue(receipt_signing.verify(data, new_sig["value"], new_sig["key_id"]))

    def test_rotation_preserves_previously_retired_keys(self):
        # Active B, with A already retired. Rotating to C must keep BOTH A and B.
        priv_a = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        pub_a = priv_a.public_key().public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo,
        ).decode()
        os.environ["RECEIPT_RSA_PRIVATE_KEY_B64"] = base64.b64encode(_fresh_pem().encode()).decode()
        os.environ["RECEIPT_RSA_KEY_ID"] = "key-b"
        os.environ["RECEIPT_RSA_RETIRED_KEYS_B64"] = base64.b64encode(
            json.dumps([{"kid": "key-a", "public_pem": pub_a}]).encode()
        ).decode()
        receipt_signing.reset_cache()

        out = StringIO()
        call_command("rotate_receipt_key", "--new-kid", "key-c", stdout=out)
        self._apply_env_lines(out.getvalue())

        self.assertEqual(receipt_signing.active_key_id(), "key-c")
        known = receipt_signing.known_key_ids()
        self.assertIn("key-a", known)
        self.assertIn("key-b", known)

    def test_rotation_refuses_without_a_configured_key(self):
        with self.assertRaises(CommandError):
            call_command("rotate_receipt_key")
