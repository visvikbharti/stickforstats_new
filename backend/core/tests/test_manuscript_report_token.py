"""
Report share-token (IDOR protection) tests for manuscript review endpoints.

Before this fix, SubmissionReportView and BatchStatusView were AllowAny with no
ownership/secret check, so anyone who knew or guessed a submission UUID (or batch
UUID) could read the full statistical review. The fix issues an unguessable
per-submission share token at submission time (only its SHA-256 is stored) and
requires it to retrieve the report; a missing/incorrect token returns 404.
See audit 2026-05-31, SEC-3 (IDOR).
"""

from __future__ import annotations

from django.test import TestCase, override_settings

from core.models import ManuscriptSubmission


@override_settings(SECURE_SSL_REDIRECT=False)
class TestReportTokenModel(TestCase):
    def test_set_and_verify_token(self):
        sub = ManuscriptSubmission.objects.create(file_name="a.pdf", file_type="pdf", status="completed")
        raw = sub.set_report_token()
        sub.save(update_fields=["report_token_hash"])
        self.assertTrue(raw)
        self.assertNotEqual(sub.report_token_hash, raw)  # raw never stored
        self.assertTrue(sub.verify_report_token(raw))
        self.assertFalse(sub.verify_report_token("wrong"))
        self.assertFalse(sub.verify_report_token(""))

    def test_empty_hash_never_verifies(self):
        sub = ManuscriptSubmission.objects.create(file_name="a.pdf", file_type="pdf", status="completed")
        self.assertEqual(sub.report_token_hash, "")
        self.assertFalse(sub.verify_report_token("anything"))


@override_settings(SECURE_SSL_REDIRECT=False)
class TestSubmissionReportEndpointToken(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.sub = ManuscriptSubmission.objects.create(
            file_name="m.pdf", file_type="pdf", status="completed", title="A Study"
        )
        self.raw = self.sub.set_report_token()
        self.sub.save(update_fields=["report_token_hash"])
        self.url = f"/api/v1/manuscript/report/{self.sub.id}/"

    def test_correct_token_query_param_returns_200(self):
        resp = self.client.get(self.url, {"token": self.raw})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["title"], "A Study")

    def test_correct_token_header_returns_200(self):
        resp = self.client.get(self.url, HTTP_X_REPORT_TOKEN=self.raw)
        self.assertEqual(resp.status_code, 200)

    def test_missing_token_returns_404(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 404)

    def test_wrong_token_returns_404(self):
        resp = self.client.get(self.url, {"token": "not-the-token"})
        self.assertEqual(resp.status_code, 404)

    def test_legacy_submission_without_token_still_readable(self):
        legacy = ManuscriptSubmission.objects.create(
            file_name="legacy.pdf", file_type="pdf", status="completed", title="Legacy"
        )
        resp = self.client.get(f"/api/v1/manuscript/report/{legacy.id}/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["title"], "Legacy")


@override_settings(SECURE_SSL_REDIRECT=False)
class TestBatchStatusEndpointToken(TestCase):
    def setUp(self):
        from rest_framework.test import APIClient

        self.client = APIClient()
        self.batch_id = "11111111-1111-1111-1111-111111111111"
        self.token_raw = "batch-secret-token-xyz"
        token_hash = ManuscriptSubmission.hash_report_token(self.token_raw)
        for i in range(2):
            ManuscriptSubmission.objects.create(
                file_name=f"b{i}.pdf",
                file_type="pdf",
                status="completed",
                report_token_hash=token_hash,
                parse_result={"batch_id": self.batch_id, "batch_index": i, "batch_total": 2},
            )
        self.url = f"/api/v1/manuscript/batch/{self.batch_id}/status/"

    def test_correct_batch_token_returns_200(self):
        resp = self.client.get(self.url, {"token": self.token_raw})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["total"], 2)

    def test_missing_batch_token_returns_404(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 404)

    def test_wrong_batch_token_returns_404(self):
        resp = self.client.get(self.url, {"token": "nope"})
        self.assertEqual(resp.status_code, 404)
