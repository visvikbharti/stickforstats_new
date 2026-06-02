"""Tests for signed reproducibility receipts (issue / verify / tamper / revoke).

Mirrors the certificate-signature tests: prove that a genuine receipt
verifies, that any tampering with the body or the signature is detected,
that the download token is timing-safe, and that revocation works.
"""

import uuid
from decimal import Decimal

from django.test import TestCase

from core.crypto import canonical, receipt_signing
from core.models import ManuscriptSubmission
from core.services import receipt_service


class ReceiptServiceTests(TestCase):
    def setUp(self):
        # Fresh ephemeral keypair for the process; issue + verify in the same
        # process share it, so signatures re-verify within a test run.
        receipt_signing.reset_cache()
        self.submission = ManuscriptSubmission.objects.create(
            file_name="paper.tex",
            file_type="tex",
            status="completed",
            file_hash="a" * 64,
            sqs_score=Decimal("80.00"),
            sqs_grade="B",
            claims_found=23,
            claims_consistent=0,
            claims_inconsistent=0,
            consistency_rate=Decimal("0.0000"),
            decision_errors=0,
            gross_errors=0,
            sqs_data={"categories": {"effect_size": 20}},
        )

    def test_issue_and_verify_valid(self):
        receipt, token = receipt_service.issue_manuscript_receipt(self.submission, title="My paper")
        self.assertTrue(receipt.signature)
        self.assertEqual(receipt.subject_hash, "a" * 64)
        self.assertEqual(receipt.sig_alg, "RS256")
        self.assertEqual(receipt.receipt_json["verdict"]["sqs_grade"], "B")

        v = receipt_service.verify_receipt(receipt.receipt_id, token=token)
        self.assertTrue(v["valid"])
        self.assertTrue(v["payload_hash_ok"])
        self.assertTrue(v["signature_ok"])
        self.assertTrue(v["token_ok"])
        self.assertFalse(v["is_revoked"])
        self.assertEqual(v["verdict"]["sqs_grade"], "B")
        self.assertEqual(v["subject_hash"], "a" * 64)

    def test_body_tamper_detected(self):
        receipt, _ = receipt_service.issue_manuscript_receipt(self.submission)
        # Forge a better grade in the stored body.
        receipt.receipt_json["verdict"]["sqs_grade"] = "A"
        receipt.save(update_fields=["receipt_json"])

        v = receipt_service.verify_receipt(receipt.receipt_id)
        self.assertFalse(v["valid"])
        self.assertFalse(v["payload_hash_ok"])
        self.assertFalse(v["signature_ok"])

    def test_signature_tamper_detected(self):
        receipt, _ = receipt_service.issue_manuscript_receipt(self.submission)
        first = receipt.signature[0]
        receipt.signature = ("B" if first != "B" else "C") + receipt.signature[1:]
        receipt.save(update_fields=["signature"])

        v = receipt_service.verify_receipt(receipt.receipt_id)
        self.assertFalse(v["signature_ok"])
        self.assertFalse(v["valid"])
        # Body untouched, so the payload hash still matches.
        self.assertTrue(v["payload_hash_ok"])

    def test_download_token_timing_safe(self):
        receipt, token = receipt_service.issue_manuscript_receipt(self.submission)
        self.assertIsNone(receipt_service.verify_receipt(receipt.receipt_id)["token_ok"])
        self.assertFalse(receipt_service.verify_receipt(receipt.receipt_id, token="wrong")["token_ok"])
        self.assertTrue(receipt_service.verify_receipt(receipt.receipt_id, token=token)["token_ok"])

    def test_revoke(self):
        receipt, _ = receipt_service.issue_manuscript_receipt(self.submission)
        self.assertTrue(receipt_service.revoke_receipt(receipt.receipt_id, reason="superseded"))
        v = receipt_service.verify_receipt(receipt.receipt_id)
        self.assertFalse(v["valid"])
        self.assertTrue(v["is_revoked"])
        # Signature itself is still cryptographically intact.
        self.assertTrue(v["signature_ok"])

    def test_unknown_receipt_is_not_found(self):
        v = receipt_service.verify_receipt(uuid.uuid4())
        self.assertFalse(v["valid"])
        self.assertEqual(v["reason"], "not_found")

    def test_requires_completed_submission(self):
        self.submission.status = "analyzing"
        self.submission.save(update_fields=["status"])
        with self.assertRaises(ValueError):
            receipt_service.issue_manuscript_receipt(self.submission)

    def test_requires_file_hash(self):
        self.submission.file_hash = ""
        self.submission.save(update_fields=["file_hash"])
        with self.assertRaises(ValueError):
            receipt_service.issue_manuscript_receipt(self.submission)

    def test_canonical_determinism(self):
        receipt, _ = receipt_service.issue_manuscript_receipt(self.submission)
        b1 = canonical.canonical_bytes(receipt.receipt_json)
        b2 = canonical.canonical_bytes(receipt.receipt_json)
        self.assertEqual(b1, b2)
        self.assertEqual(canonical.canonical_hash(receipt.receipt_json), receipt.canonical_payload_hash)

    def test_minimal_mode_omits_sqs_detail(self):
        receipt, _ = receipt_service.issue_manuscript_receipt(self.submission, minimal=True)
        self.assertNotIn("sqs_detail", receipt.receipt_json)
        # Still fully verifiable.
        self.assertTrue(receipt_service.verify_receipt(receipt.receipt_id)["valid"])
