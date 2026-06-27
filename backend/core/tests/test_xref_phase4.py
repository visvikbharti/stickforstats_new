"""
Cross-reference resolution — Phase 4 (persistence + API surfacing).
===================================================================

Phase 4: persist the resolution provenance in queryable columns + a normalized
ClaimDatasetLink join (decision D2), and surface the resolution summary + link
method in the API response.

See docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md (Phase 4 / checkpoint C4).
"""

import numpy as np
import pandas as pd
from scipy import stats

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.models import ClaimDatasetLink, ClaimVerdictRecord, VerificationRun
from core.manuscript.reference_linker import make_reference_aware_linker
from core.manuscript.verification_service import run_verification


def _two_group_csv(seed=7, n=40):
    rng = np.random.default_rng(seed)
    treat = rng.normal(58.0, 8.0, n)
    ctrl = rng.normal(50.0, 8.0, n)
    df = pd.DataFrame({"group": ["treatment"] * n + ["control"] * n,
                       "biomarker": list(treat) + list(ctrl)})
    rows = ["group,biomarker"] + [f"{g},{b}" for g, b in zip(df["group"], df["biomarker"])]
    t, p = stats.ttest_ind(treat, ctrl, equal_var=True)
    return df, ("\n".join(rows) + "\n").encode(), abs(float(t)), float(p)


@override_settings(SECURE_SSL_REDIRECT=False)
class BundlePersistenceAPITest(APITestCase):
    URL = "/api/v1/verify/bundle/"

    def test_reference_directed_link_is_surfaced_and_persisted(self):
        _, csv, t_abs, p = _two_group_csv()
        paper = ("Results. Group differences in biomarker are reported in Supplementary Table S3 "
                 f"(t(78) = {t_abs:.2f}, p = {p:.3f}).")
        manuscript = SimpleUploadedFile("paper.txt", paper.encode(), content_type="text/plain")
        data = SimpleUploadedFile("Supplementary_Table_S3.csv", csv, content_type="text/csv")

        resp = self.client.post(self.URL, {"files": [manuscript, data]}, format="multipart")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.content)
        body = resp.json()

        # ---- surfaced in the API response ----
        self.assertIn("n_references_resolved", body)
        self.assertGreaterEqual(body["n_references_resolved"], 1)
        self.assertEqual(body.get("n_citation_conflicts"), 0)
        prov = body["claims"][0]["provenance"]
        self.assertEqual(prov["resolved_reference"], "Supplementary Table S3")
        self.assertEqual(prov["link_method"], "reference-directed")

        # ---- persisted to queryable columns + the join ----
        run = VerificationRun.objects.get(id=body["run_id"])
        rec = run.claim_verdicts.get(claim_id="C001")
        self.assertEqual(rec.source_file, "paper.txt")
        self.assertEqual(rec.resolved_reference, "Supplementary Table S3")
        self.assertEqual(rec.link_method, "reference-directed")

        link = ClaimDatasetLink.objects.get(claim=rec)
        self.assertEqual(link.method, "reference-directed")
        self.assertEqual(link.cited_reference, "Supplementary Table S3")
        self.assertIsNotNone(link.dataset)
        self.assertEqual(link.dataset.file_name, "Supplementary_Table_S3.csv")


class ConflictPersistenceTest(TestCase):
    def test_citation_content_conflict_is_persisted_with_method(self):
        good_df, _, t_abs, p = _two_group_csv(seed=7)
        bad_df = pd.DataFrame({"x": [1.0, 2, 3, 4], "y": [2.0, 4, 6, 8]})   # no grouping factor
        text = ("As described in Additional File 1, the groups differed "
                f"(t(78) = {t_abs:.2f}, p = {p:.3f}).")
        dataframes = [("Additional_file_1.csv", bad_df), ("trial_results.csv", good_df)]
        linker = make_reference_aware_linker(dataframes)
        linked_datasets = [{"source_type": "uploaded", "file_name": n,
                            "n_rows": int(d.shape[0]), "n_cols": int(d.shape[1]),
                            "link_status": "candidate"} for n, d in dataframes]

        result = run_verification(
            "", segments=[("paper.pdf", text)], dataframe=dataframes[0][1], linker=linker,
            data_source="bundle", linked_datasets=linked_datasets, persist=True,
        )
        self.assertIsNotNone(result.run_id)
        self.assertEqual(result.profile.n_citation_conflicts, 1)

        rec = ClaimVerdictRecord.objects.get(run_id=result.run_id, claim_id="C001")
        self.assertEqual(rec.link_method, "conflict")
        link = ClaimDatasetLink.objects.get(claim=rec)
        self.assertEqual(link.method, "conflict")
        self.assertEqual(link.dataset.file_name, "trial_results.csv")    # the file that actually matched


class PersistenceEdgeCasesTest(TestCase):
    def test_links_only_for_linked_claims_and_null_dataset_is_safe(self):
        good_df, _, t_abs, p = _two_group_csv(seed=7)
        # claim 1 links to the data; claim 2 (a correlation with no matching columns) does not.
        text = (f"First, the groups differed (t(78) = {t_abs:.2f}, p = {p:.3f}). "
                "Second, age and score were correlated (r(40) = 0.31, p = 0.05).")
        dataframes = [("trial.csv", good_df)]
        linker = make_reference_aware_linker(dataframes)
        # deliberately register a DIFFERENT file name than what the linker will report, so the
        # claim->dataset FK can't resolve -> must persist with dataset=None (not crash).
        linked_datasets = [{"source_type": "uploaded", "file_name": "MISNAMED.csv",
                            "n_rows": 80, "n_cols": 2, "link_status": "candidate"}]
        result = run_verification(
            "", segments=[("paper.pdf", text)], dataframe=good_df, linker=linker,
            linked_datasets=linked_datasets, persist=True,
        )
        rec1 = ClaimVerdictRecord.objects.get(run_id=result.run_id, claim_id="C001")
        # the linked claim has a join row; its dataset is None because the name didn't match.
        link = ClaimDatasetLink.objects.get(claim=rec1)
        self.assertIsNone(link.dataset)
        self.assertEqual(link.method, "content")
        # exactly one link total (the unlinked correlation claim has none).
        self.assertEqual(ClaimDatasetLink.objects.filter(claim__run_id=result.run_id).count(), 1)
