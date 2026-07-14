"""Tests for the downloadable receipt bundle + the offline verifier script.

The strongest test here actually RUNS the shipped ``verify_receipt.py`` in a
subprocess against an extracted zip — proving a third party can verify a
receipt offline, and that tampering makes that verification fail.
"""

import base64
import io
import json
import os
import subprocess
import sys
import tempfile
import zipfile
from decimal import Decimal

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from django.test import TestCase

from core.crypto import receipt_signing
from core.models import ManuscriptSubmission
from core.services import receipt_bundle, receipt_service


class ReceiptBundleTests(TestCase):
    def setUp(self):
        receipt_signing.reset_cache()
        self.submission = ManuscriptSubmission.objects.create(
            file_name="paper.tex",
            file_type="tex",
            status="completed",
            file_hash="c" * 64,
            sqs_score=Decimal("80.00"),
            sqs_grade="B",
        )
        self.receipt, _ = receipt_service.issue_manuscript_receipt(self.submission)

    def test_zip_contains_expected_files(self):
        zf = zipfile.ZipFile(io.BytesIO(receipt_bundle.build_zip(self.receipt)))
        names = zf.namelist()
        self.assertTrue(any(n.endswith(".json") for n in names), names)
        self.assertIn("public_key.pem", names)
        self.assertIn("verify_receipt.py", names)
        self.assertIn("README.txt", names)

    @staticmethod
    def _rotate_to_new_active(kid, *cleanups):
        """Install a fresh active signing key under ``kid`` and reset the cache."""
        new_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        os.environ["RECEIPT_RSA_PRIVATE_KEY"] = new_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()
        os.environ["RECEIPT_RSA_KEY_ID"] = kid
        for fn in cleanups:
            fn()
        receipt_signing.reset_cache()

    def test_bundle_refuses_when_the_signing_key_is_gone_from_the_ring(self):
        """If the key that signed a receipt is in NO ring, refuse the bundle.

        Embedding the wrong public key would hand a journal editor a genuine
        receipt that fails our own shipped verify_receipt.py — indistinguishable,
        to them, from a forgery. Refusing is the honest failure. This is the
        rotation case where the old key was NOT retained.
        """
        self.addCleanup(os.environ.pop, "RECEIPT_RSA_PRIVATE_KEY", None)
        self.addCleanup(os.environ.pop, "RECEIPT_RSA_KEY_ID", None)
        self.addCleanup(receipt_signing.reset_cache)
        self._rotate_to_new_active("rotated-key-2")

        self.assertNotEqual(self.receipt.key_id, receipt_signing.active_key_id())
        self.assertNotIn(self.receipt.key_id, receipt_signing.known_key_ids())

        with self.assertRaises(receipt_bundle.SigningKeyMismatch):
            receipt_bundle.build_artifact(self.receipt)
        with self.assertRaises(receipt_bundle.SigningKeyMismatch):
            receipt_bundle.build_zip(self.receipt)

    def test_bundle_survives_rotation_when_old_key_is_retained(self):
        """The keyring's reason to exist: an old receipt stays verifiable+exportable.

        Rotate the active key, but RETAIN the old key (public half only) in
        RECEIPT_RSA_RETIRED_KEYS_B64. The bundle must (a) succeed, (b) embed the
        OLD public key that actually signed the receipt — not the new active key,
        and (c) still pass our own shipped offline verifier.
        """
        old_kid = self.receipt.key_id
        old_pem = receipt_signing.public_pem_for(old_kid)
        self.assertIsNotNone(old_pem)

        retired = base64.b64encode(
            json.dumps([{"kid": old_kid, "public_pem": old_pem}]).encode()
        ).decode()
        os.environ["RECEIPT_RSA_RETIRED_KEYS_B64"] = retired
        self.addCleanup(os.environ.pop, "RECEIPT_RSA_PRIVATE_KEY", None)
        self.addCleanup(os.environ.pop, "RECEIPT_RSA_KEY_ID", None)
        self.addCleanup(os.environ.pop, "RECEIPT_RSA_RETIRED_KEYS_B64", None)
        self.addCleanup(receipt_signing.reset_cache)
        self._rotate_to_new_active("rotated-key-2")

        # Active key really did change, but the old key is still in the ring.
        self.assertEqual(receipt_signing.active_key_id(), "rotated-key-2")
        self.assertIn(old_kid, receipt_signing.known_key_ids())

        art = receipt_bundle.build_artifact(self.receipt)
        # (b) the embedded key is the one that SIGNED, not the new active key.
        self.assertEqual(art["public_key_pem"], old_pem)
        self.assertNotEqual(art["public_key_pem"], receipt_signing.public_pem())
        self.assertEqual(art["signature"]["key_id"], old_kid)

        # (c) the shipped offline verifier accepts the retained-key bundle.
        data = receipt_bundle.build_zip(self.receipt)
        with tempfile.TemporaryDirectory() as d:
            zipfile.ZipFile(io.BytesIO(data)).extractall(d)
            rj = next(f for f in os.listdir(d) if f.endswith(".json"))
            res = subprocess.run(
                [sys.executable, os.path.join(d, "verify_receipt.py"), os.path.join(d, rj)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(res.returncode, 0, res.stdout + res.stderr)
            self.assertIn("VERIFIED", res.stdout)
            self.assertNotIn("NOT VERIFIED", res.stdout)

    def test_offline_verify_script_accepts_genuine_and_rejects_tampered(self):
        data = receipt_bundle.build_zip(self.receipt)
        with tempfile.TemporaryDirectory() as d:
            zipfile.ZipFile(io.BytesIO(data)).extractall(d)
            rj = next(f for f in os.listdir(d) if f.endswith(".json"))
            script = os.path.join(d, "verify_receipt.py")
            jpath = os.path.join(d, rj)

            # Genuine -> exit 0, "VERIFIED"
            ok = subprocess.run(
                [sys.executable, script, jpath], capture_output=True, text=True
            )
            self.assertEqual(ok.returncode, 0, ok.stdout + ok.stderr)
            self.assertIn("VERIFIED", ok.stdout)
            self.assertNotIn("NOT VERIFIED", ok.stdout)

            # Tamper the body -> exit 1, "NOT VERIFIED"
            artifact = json.load(open(jpath))
            artifact["receipt"]["verdict"]["sqs_grade"] = "A+"
            with open(jpath, "w") as fh:
                json.dump(artifact, fh)
            bad = subprocess.run(
                [sys.executable, script, jpath], capture_output=True, text=True
            )
            self.assertEqual(bad.returncode, 1, bad.stdout + bad.stderr)
            self.assertIn("NOT VERIFIED", bad.stdout)

    def test_offline_verify_rejects_body_intact_but_signature_tampered(self):
        """Isolate the SIGNATURE check in the shipped offline verifier.

        The other tamper test mutates the receipt BODY, which breaks the content
        hash independently — so it would still pass even if the offline verifier's
        crypto step silently no-op'd. Here the body (and its hash) are left intact
        and only the signature is corrupted: the result must still be NOT VERIFIED,
        failing specifically on the signature. This is what a keyring cares about —
        a body-consistent receipt whose signature does not match the embedded key.
        """
        data = receipt_bundle.build_zip(self.receipt)
        with tempfile.TemporaryDirectory() as d:
            zipfile.ZipFile(io.BytesIO(data)).extractall(d)
            rj = next(f for f in os.listdir(d) if f.endswith(".json"))
            jpath = os.path.join(d, rj)
            artifact = json.load(open(jpath))
            # Flip one byte of the signature; leave receipt body + hash untouched.
            raw = bytearray(base64.b64decode(artifact["signature"]["value"]))
            raw[0] ^= 0x01
            artifact["signature"]["value"] = base64.b64encode(bytes(raw)).decode()
            with open(jpath, "w") as fh:
                json.dump(artifact, fh)

            res = subprocess.run(
                [sys.executable, os.path.join(d, "verify_receipt.py"), jpath],
                capture_output=True,
                text=True,
            )
            self.assertEqual(res.returncode, 1, res.stdout + res.stderr)
            self.assertIn("NOT VERIFIED", res.stdout)
            # It must fail on the SIGNATURE, with the content hash still OK —
            # proving the signature check, not the hash check, did the rejecting.
            self.assertIn("contents    : OK", res.stdout)
            self.assertIn("signature   : FAIL", res.stdout)

    def test_artifact_has_public_key_and_signature(self):
        art = receipt_bundle.build_artifact(self.receipt)
        self.assertTrue(art["public_key_pem"].startswith("-----BEGIN PUBLIC KEY-----"))
        self.assertEqual(art["signature"]["alg"], "RS256")
        self.assertEqual(art["receipt"], self.receipt.receipt_json)
