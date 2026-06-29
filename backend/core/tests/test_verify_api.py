"""
Tests for the raw-data manuscript verification surface (T24) + persistence (T10).
==================================================================================

Exercises the full Django path: POST /api/v1/verify/analyze/ with a manuscript whose
t-test claim is reproducible from an attached data table -> a VERIFIED verdict, a persisted
VerificationRun + ClaimVerdictRecord rows, and a token-gated GET /api/v1/verify/report/.

The fixture reuses the proven tabular example from
paper/replication/verification/demo_tabular_end_to_end.py (numpy seed 7), so the claimed
t-statistic is computed from the same data the verifier re-runs -> a deterministic VERIFIED.

Created: 2026-06-25 IST  (TODO items T10-SCHEMA + T24-SURFACE)
"""

import numpy as np
from scipy import stats

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import ClaimVerdictRecord, VerificationRun


def _build_csv_and_t() -> tuple[str, float, float]:
    """Two normal groups (n=40 each, df=78) with a real mean difference -> (csv, |t|, p)."""
    rng = np.random.default_rng(7)
    n = 40
    treat = rng.normal(58.0, 8.0, n)
    ctrl = rng.normal(50.0, 8.0, n)
    rows = ["group,biomarker"]
    rows += [f"treatment,{v}" for v in treat]
    rows += [f"control,{v}" for v in ctrl]
    csv = "\n".join(rows) + "\n"
    t, p = stats.ttest_ind(treat, ctrl, equal_var=True)
    return csv, abs(float(t)), float(p)


class VerifyAnalyzeAPITest(APITestCase):
    ANALYZE = "/api/v1/verify/analyze/"

    def test_verify_with_data_returns_verdicts_and_persists(self):
        csv, t_abs, p = _build_csv_and_t()
        paper = (
            "Results. Serum biomarker concentration was significantly higher in the treatment "
            f"group than in the control group (t(78) = {t_abs:.2f}, p = {p:.3f})."
        )
        data_file = SimpleUploadedFile("trial.csv", csv.encode(), content_type="text/csv")

        resp = self.client.post(self.ANALYZE, {"text": paper, "data": data_file}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        body = resp.json()

        # the faithful claim should VERIFY against its own data
        self.assertIn("verdict_distribution", body)
        self.assertIn("VERIFIED", body["verdict_distribution"], body["verdict_distribution"])
        self.assertGreaterEqual(body["verifiability_rate"], 0.0)
        self.assertIn("certify_note", body)

        # persisted: one run + per-claim rows + linked dataset
        self.assertEqual(VerificationRun.objects.count(), 1)
        run = VerificationRun.objects.first()
        self.assertEqual(run.data_source, "uploaded_table")
        self.assertTrue(run.claim_verdicts.exists())
        self.assertTrue(run.datasets.filter(source_type="uploaded").exists())
        self.assertTrue(
            ClaimVerdictRecord.objects.filter(run=run, verdict="VERIFIED").exists()
        )

    def test_report_retrieval_is_token_gated(self):
        csv, t_abs, p = _build_csv_and_t()
        paper = f"Results. The treatment group exceeded the control group (t(78) = {t_abs:.2f}, p = {p:.3f})."
        data_file = SimpleUploadedFile("trial.csv", csv.encode(), content_type="text/csv")

        resp = self.client.post(self.ANALYZE, {"text": paper, "data": data_file}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        body = resp.json()
        run_id, token = body["run_id"], body["report_token"]

        # no token -> 404 (does not confirm existence)
        self.assertEqual(
            self.client.get(f"/api/v1/verify/report/{run_id}/").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        # wrong token -> 404
        self.assertEqual(
            self.client.get(f"/api/v1/verify/report/{run_id}/?token=wrong").status_code,
            status.HTTP_404_NOT_FOUND,
        )
        # correct token -> 200 + the stored profile
        ok = self.client.get(f"/api/v1/verify/report/{run_id}/?token={token}")
        self.assertEqual(ok.status_code, status.HTTP_200_OK)
        self.assertEqual(ok.json()["run_id"], run_id)
        self.assertIn("verdict_distribution", ok.json())

    def test_no_data_yields_insufficient_data(self):
        """Without a data table, a checkable claim must resolve to INSUFFICIENT_DATA (honest)."""
        paper = "Results. The intervention had a significant effect, t(48) = 2.10, p = 0.041."
        resp = self.client.post(self.ANALYZE, {"text": paper}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        body = resp.json()
        self.assertIn("INSUFFICIENT_DATA", body["verdict_distribution"], body["verdict_distribution"])

    def test_empty_request_is_rejected(self):
        resp = self.client.post(self.ANALYZE, {}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_malformed_xlsx_data_is_rejected(self):
        """A non-zip file posing as .xlsx is rejected (the decompression-bomb guard rejects
        anything that is not a valid workbook before openpyxl materializes it)."""
        paper = "Results. The effect was significant, t(78) = 2.50, p = 0.014."
        bad = SimpleUploadedFile("data.xlsx", b"not a real workbook", content_type="application/vnd.ms-excel")
        resp = self.client.post(self.ANALYZE, {"text": paper, "data": bad}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


class VerifyAccessControlTest(APITestCase):
    """Access policy for the verification endpoints: open behind the beta gateway by
    default, switchable to auth-required via VERIFY_REQUIRE_AUTH, and rate-limited."""

    ANALYZE = "/api/v1/verify/analyze/"
    BUNDLE = "/api/v1/verify/bundle/"

    def setUp(self):
        # isolate this class from the shared throttle cache so per-IP counters
        # from other verify tests can't leak in and 429 these requests.
        from django.core.cache import cache

        cache.clear()

    def test_open_by_default(self):
        """With the flag off, an unauthenticated request reaches the view (400 for an
        empty body) rather than being rejected at the permission layer."""
        resp = self.client.post(self.ANALYZE, {}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(VERIFY_REQUIRE_AUTH=True)
    def test_requires_auth_when_flag_set(self):
        for url in (self.ANALYZE, self.BUNDLE):
            resp = self.client.post(url, {}, format="multipart")
            self.assertIn(
                resp.status_code,
                (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
                f"{url} should be gated when VERIFY_REQUIRE_AUTH is on, got {resp.status_code}",
            )

    @override_settings(VERIFY_REQUIRE_AUTH=True)
    def test_authenticated_user_passes_when_flag_set(self):
        user = get_user_model().objects.create_user(username="verifier", password="pw-test-123")  # nosec B106
        self.client.force_authenticate(user)
        resp = self.client.post(self.ANALYZE, {}, format="multipart")
        # permission passes -> reaches the view -> 400 for an empty body (not 401/403)
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_throttle_classes_declared(self):
        from api.v1.verify_views import (
            VerifyAnalyzeView,
            VerifyAnonThrottle,
            VerifyBundleView,
            VerifyReportView,
            VerifyUserThrottle,
        )

        for view in (VerifyAnalyzeView, VerifyBundleView, VerifyReportView):
            self.assertIn(VerifyAnonThrottle, view.throttle_classes)
            self.assertIn(VerifyUserThrottle, view.throttle_classes)
