"""
Cross-reference resolution — Phase 3 (data-file mapping + disambiguation).
==========================================================================

Phase 3: the author's citation selects WHICH uploaded data table to re-run
against, and citation-vs-content conflicts are surfaced (decision D4):
  - reference-directed: the cited data file is chosen even when another table
    also matches by columns (disambiguation).
  - conflict A: the author cites a data file that doesn't match the claim, but
    another table does -> flagged.
  - conflict B: the cited data file links but does NOT reproduce -> flagged.

See docs/manuscript_verifier/XREF_RESOLUTION_WORKPLAN.md (Phase 3 / checkpoint C3).
"""

import numpy as np
import pandas as pd
from scipy import stats

from django.test import SimpleTestCase

from core.manuscript.reference_linker import make_reference_aware_linker
from core.manuscript.verdicts import Verdict
from core.manuscript.verify_pipeline import verify_segments


def _two_group(seed, loc_treat=58.0, loc_ctrl=50.0, n=40):
    """A 2-group (group, biomarker) frame + its |t|(df=2n-2) and p."""
    rng = np.random.default_rng(seed)
    treat = rng.normal(loc_treat, 8.0, n)
    ctrl = rng.normal(loc_ctrl, 8.0, n)
    df = pd.DataFrame({"group": ["treatment"] * n + ["control"] * n,
                       "biomarker": list(treat) + list(ctrl)})
    t, p = stats.ttest_ind(treat, ctrl, equal_var=True)
    return df, abs(float(t)), float(p)


class DisambiguationTest(SimpleTestCase):
    def test_citation_selects_the_right_table_among_several(self):
        cited_df, t_abs, p = _two_group(seed=7)
        other_df, _, _ = _two_group(seed=99, loc_treat=51.0)   # also (group, biomarker), different data
        text = ("Group differences in biomarker are reported in Supplementary Table S3 "
                f"(t(78) = {t_abs:.2f}, p = {p:.3f}).")
        # the uncited table is listed FIRST: a content-only linker would wrongly take it.
        dataframes = [("other_results.csv", other_df), ("Supplementary_Table_S3.csv", cited_df)]
        linker = make_reference_aware_linker(dataframes)
        prof = verify_segments([("paper.pdf", text)], dataframe=dataframes[0][1], linker=linker)
        v = prof.claim_verdicts[0]
        self.assertEqual(v.linked_dataset_id, "Supplementary_Table_S3.csv")   # the CITED file
        self.assertTrue(any("reference-directed" in n for n in v.notes), v.notes)
        self.assertEqual(v.verdict, Verdict.VERIFIED)        # reproduces against the cited table
        # the citation that directed the link is recorded even though selection was by filename
        # convention (no JATS artifact index here) — honest provenance.
        self.assertEqual(v.resolved_reference, "Supplementary Table S3")


class ConflictTest(SimpleTestCase):
    def test_conflict_A_cited_file_does_not_match_another_does(self):
        # the cited "Additional File 1" has no 2-level group -> a t-test cannot link to it;
        # a different uploaded table does -> citation-content conflict.
        good_df, t_abs, p = _two_group(seed=7)
        bad_df = pd.DataFrame({"x": [1.0, 2, 3, 4], "y": [2.0, 4, 6, 8]})  # no grouping factor
        text = ("As described in Additional File 1, the groups differed "
                f"(t(78) = {t_abs:.2f}, p = {p:.3f}).")
        dataframes = [("Additional_file_1.csv", bad_df), ("trial_results.csv", good_df)]
        linker = make_reference_aware_linker(dataframes)
        prof = verify_segments([("paper.pdf", text)], dataframe=dataframes[0][1], linker=linker)
        v = prof.claim_verdicts[0]
        self.assertEqual(v.linked_dataset_id, "trial_results.csv")
        self.assertTrue(any("citation-content conflict" in n for n in v.notes), v.notes)

    def test_conflict_B_cited_file_links_but_does_not_reproduce(self):
        cited_df, t_real, _ = _two_group(seed=7)
        # claim a clearly different statistic than the data yields -> DISCREPANT against the cited file
        claimed_t = t_real + 3.0
        text = ("Group means differed markedly, as shown in Supplementary Table S2 "
                f"(t(78) = {claimed_t:.2f}, p = 0.001).")
        dataframes = [("Supplementary_Table_S2.csv", cited_df)]
        linker = make_reference_aware_linker(dataframes)
        prof = verify_segments([("paper.pdf", text)], dataframe=dataframes[0][1], linker=linker)
        v = prof.claim_verdicts[0]
        self.assertEqual(v.linked_dataset_id, "Supplementary_Table_S2.csv")
        self.assertEqual(v.verdict, Verdict.DISCREPANT)
        self.assertTrue(any("citation-content conflict" in n for n in v.notes), v.notes)


class RobustnessTest(SimpleTestCase):
    def test_a_malformed_table_does_not_sink_the_run(self):
        good_df, t_abs, p = _two_group(seed=7)
        text = f"The groups differed (t(78) = {t_abs:.2f}, p = {p:.3f})."
        # a non-DataFrame among the tables would raise inside link_claim_to_table; it must be skipped.
        dataframes = [("broken.csv", object()), ("good.csv", good_df)]
        linker = make_reference_aware_linker(dataframes)
        prof = verify_segments([("paper.pdf", text)], dataframe=good_df, linker=linker)
        v = prof.claim_verdicts[0]
        self.assertEqual(v.verdict, Verdict.VERIFIED)
        self.assertEqual(v.linked_dataset_id, "good.csv")


class NoReferenceBaselineTest(SimpleTestCase):
    def test_no_citation_falls_back_to_content_without_conflict(self):
        df, t_abs, p = _two_group(seed=7)
        text = f"The groups differed (t(78) = {t_abs:.2f}, p = {p:.3f})."   # no reference token
        dataframes = [("data.csv", df)]
        linker = make_reference_aware_linker(dataframes)
        prof = verify_segments([("paper.pdf", text)], dataframe=dataframes[0][1], linker=linker)
        v = prof.claim_verdicts[0]
        self.assertEqual(v.verdict, Verdict.VERIFIED)
        self.assertFalse(any("conflict" in n for n in v.notes), v.notes)
        self.assertEqual(v.cited_references, [])
