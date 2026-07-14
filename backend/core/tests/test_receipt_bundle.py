"""Tests for the downloadable receipt bundle + the offline verifier script.

The strongest test here actually RUNS the shipped ``verify_receipt.py`` in a
subprocess against an extracted zip — proving a third party can verify a
receipt offline, and that tampering makes that verification fail.
"""

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

    def test_bundle_refuses_to_ship_a_key_that_cannot_verify_it(self):
        """Rotating the signing key must not turn old receipts into forgeries.

        ``build_artifact`` embedded ``public_key_pem`` from whichever process
        served the DOWNLOAD, not from the key that signed the receipt. After a key
        rotation the bundle therefore carried a public key that cannot verify the
        signature beside it — so a journal editor running our own shipped
        verify_receipt.py on a perfectly genuine receipt got InvalidSignature, and
        the honest artifact was indistinguishable from a forged one.
        """
        # The receipt in setUp was signed under the key active then. Rotate.
        new_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        os.environ["RECEIPT_RSA_PRIVATE_KEY"] = new_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()
        os.environ["RECEIPT_RSA_KEY_ID"] = "rotated-key-2"
        self.addCleanup(os.environ.pop, "RECEIPT_RSA_PRIVATE_KEY", None)
        self.addCleanup(os.environ.pop, "RECEIPT_RSA_KEY_ID", None)
        self.addCleanup(receipt_signing.reset_cache)
        receipt_signing.reset_cache()

        self.assertNotEqual(self.receipt.key_id, receipt_signing.active_key_id())

        with self.assertRaises(receipt_bundle.SigningKeyMismatch):
            receipt_bundle.build_artifact(self.receipt)
        with self.assertRaises(receipt_bundle.SigningKeyMismatch):
            receipt_bundle.build_zip(self.receipt)

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

    def test_artifact_has_public_key_and_signature(self):
        art = receipt_bundle.build_artifact(self.receipt)
        self.assertTrue(art["public_key_pem"].startswith("-----BEGIN PUBLIC KEY-----"))
        self.assertEqual(art["signature"]["alg"], "RS256")
        self.assertEqual(art["receipt"], self.receipt.receipt_json)
