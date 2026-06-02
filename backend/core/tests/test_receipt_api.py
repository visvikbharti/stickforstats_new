"""End-to-end API tests for the reproducibility-receipt endpoints.

Exercises the full surface: issue (with proof-of-ownership token), public
verify, token-gated download, JWKS, and that tampering is caught through
the public verify endpoint.
"""

from decimal import Decimal

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from core.crypto import receipt_signing
from core.models import ManuscriptSubmission, ReproducibilityReceipt


@override_settings(SECURE_SSL_REDIRECT=False)
class ReceiptAPITests(APITestCase):
    def setUp(self):
        receipt_signing.reset_cache()
        self.submission = ManuscriptSubmission.objects.create(
            file_name="paper.tex",
            file_type="tex",
            status="completed",
            file_hash="b" * 64,
            sqs_score=Decimal("80.00"),
            sqs_grade="B",
            claims_found=23,
            consistency_rate=Decimal("0.0000"),
        )
        self.report_token = self.submission.set_report_token()
        self.submission.save(update_fields=["report_token_hash"])

    def _issue(self, token=None):
        return self.client.post(
            reverse("api-v1:receipt-issue"),
            {"submission_id": str(self.submission.id), "token": token or self.report_token},
            format="json",
        )

    def test_full_flow_issue_verify_download_jwks(self):
        # Issue
        r = self._issue()
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        rid = r.data["receipt_id"]
        dl_token = r.data["download_token"]
        self.assertEqual(r.data["sig_alg"], "RS256")
        self.assertEqual(r.data["subject_hash"], "b" * 64)

        # Verify (public, no token)
        v = self.client.get(reverse("api-v1:receipt-verify", kwargs={"receipt_id": rid}))
        self.assertEqual(v.status_code, status.HTTP_200_OK)
        self.assertTrue(v.data["valid"])
        self.assertTrue(v.data["signature_ok"])
        self.assertTrue(v.data["payload_hash_ok"])
        self.assertEqual(v.data["verdict"]["sqs_grade"], "B")

        # Download (token-gated): self-contained signed artifact
        d = self.client.get(
            reverse("api-v1:receipt-download", kwargs={"receipt_id": rid}) + f"?token={dl_token}"
        )
        self.assertEqual(d.status_code, status.HTTP_200_OK)
        self.assertIn("receipt", d.data)
        self.assertIn("public_key_pem", d.data)
        self.assertTrue(d.data["public_key_pem"].startswith("-----BEGIN PUBLIC KEY-----"))
        self.assertEqual(d.data["signature"]["alg"], "RS256")
        self.assertIn("attachment", d["Content-Disposition"])

        # JWKS (public)
        j = self.client.get(reverse("api-v1:receipt-jwks"))
        self.assertEqual(j.status_code, status.HTTP_200_OK)
        self.assertEqual(j.data["keys"][0]["kty"], "RSA")
        self.assertEqual(j.data["keys"][0]["alg"], "RS256")

    def test_issue_requires_valid_submission_token(self):
        r = self._issue(token="wrong-token")
        self.assertEqual(r.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(ReproducibilityReceipt.objects.count(), 0)

    def test_verify_unknown_receipt(self):
        import uuid

        v = self.client.get(reverse("api-v1:receipt-verify", kwargs={"receipt_id": uuid.uuid4()}))
        self.assertEqual(v.status_code, status.HTTP_200_OK)
        self.assertFalse(v.data["valid"])
        self.assertEqual(v.data["reason"], "not_found")

    def test_download_requires_token(self):
        rid = self._issue().data["receipt_id"]
        d = self.client.get(reverse("api-v1:receipt-download", kwargs={"receipt_id": rid}) + "?token=nope")
        self.assertEqual(d.status_code, status.HTTP_404_NOT_FOUND)

    def test_tamper_caught_through_verify_endpoint(self):
        rid = self._issue().data["receipt_id"]
        receipt = ReproducibilityReceipt.objects.get(receipt_id=rid)
        receipt.receipt_json["verdict"]["sqs_grade"] = "A"  # forge a better grade
        receipt.save(update_fields=["receipt_json"])

        v = self.client.get(reverse("api-v1:receipt-verify", kwargs={"receipt_id": rid}))
        self.assertFalse(v.data["valid"])
        self.assertFalse(v.data["payload_hash_ok"])
