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
