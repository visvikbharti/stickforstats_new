"""
The df cross-check: did we re-run the model the paper actually describes?

`test_resolver` can only offer `one_way_anova` for any F claim, so a paper reporting a factorial
or repeated-measures ANOVA was silently re-run as one-way and landed **DISCREPANT** — a confident
"your numbers do not reproduce" against a paper that reported a different model. That is the most
damaging output this engine can produce, and it was reachable with no note attached.

The reported df is a free, exact detector: a paper reporting F(2, 45) whose linked data imply
F(2, 57) did not run the model we just ran. Same signal catches a mis-linked dataset.

Every test names the mutation that must break it.
"""

import numpy as np
from django.test import override_settings

from core.manuscript.claim_extractor import StatisticalClaimExtractor
from core.manuscript.reanalysis_engine import verify_claim
from core.manuscript.verdict_decision import (
    assign_verdict,
    df_corroborates_design,
    expected_degrees_of_freedom,
)
from core.manuscript.verdicts import ClaimDataSpec, ClaimVerificationRequest, Verdict

from django.test import SimpleTestCase


def _groups(sizes, means, seed=20260820):
    rng = np.random.default_rng(seed)
    return [list(rng.normal(m, 1.0, n)) for n, m in zip(sizes, means)]


def _verify(paper, spec):
    claim = StatisticalClaimExtractor().extract(paper, section="Results")[0]
    return verify_claim(ClaimVerificationRequest(
        claim=claim, data_spec=spec, manuscript_text=paper, methods_text=paper))


@override_settings(SECURE_SSL_REDIRECT=False)
class ExpectedDfTests(SimpleTestCase):

    def test_expected_df_per_test(self):
        """MUTATION: change one_way_anova's df2 from N-k to N-1 -> fails."""
        g = ClaimDataSpec(groups=[[1.0] * 20, [1.0] * 20, [1.0] * 20])
        self.assertEqual(expected_degrees_of_freedom("one_way_anova", g), (2, 57))
        two = ClaimDataSpec(groups=[[1.0] * 25, [1.0] * 25])
        self.assertEqual(expected_degrees_of_freedom("independent_t", two), (48,))
        self.assertEqual(expected_degrees_of_freedom("paired_t", two), (24,))
        corr = ClaimDataSpec(x=[1.0] * 50, y=[1.0] * 50)
        self.assertEqual(expected_degrees_of_freedom("pearson", corr), (48,))
        tab = ClaimDataSpec(table=[[1, 2, 3], [4, 5, 6]])
        self.assertEqual(expected_degrees_of_freedom("chi_square_independence", tab), (2,))

    def test_welch_and_rank_tests_have_no_opinion(self):
        """Welch's df is Satterthwaite — a function of the variances, not the counts. Guessing it
        from n would manufacture a mismatch on a correct paper.

        MUTATION: give welch_t the independent_t formula -> fails.
        """
        two = ClaimDataSpec(groups=[[1.0] * 25, [1.0] * 25])
        for test in ("welch_t", "mann_whitney_u", "kruskal_wallis", "spearman", "kendall"):
            self.assertIsNone(expected_degrees_of_freedom(test, two), test)

    def test_corroboration_is_three_state(self):
        """Unknown on either side must be None — never False, which would be an accusation.

        MUTATION: `return bool(claimed_df and expected_df and ...)` -> None becomes False, fails.
        """
        self.assertIs(df_corroborates_design((2, 57), (2, 57)), True)
        self.assertIs(df_corroborates_design((2, 45), (2, 57)), False)
        self.assertIsNone(df_corroborates_design(None, (2, 57)))
        self.assertIsNone(df_corroborates_design((2, 45), None))
        self.assertIsNone(df_corroborates_design((48,), (2, 57)))     # incomparable shapes

    def test_none_never_suppresses_a_verdict(self):
        """MUTATION: `if df_matches_design is not True` in assign_verdict -> every claim whose df
        we cannot predict (Welch, rank tests) silently stops being verifiable, and this fails."""
        for df_state in (None, True):
            self.assertEqual(
                assign_verdict(extraction_reliable=True, test_resolved=True, data_available=True,
                               executed_ok=True, assumptions_ok=None, statistic_match=False,
                               df_matches_design=df_state),
                Verdict.DISCREPANT, f"df_matches_design={df_state!r}")


@override_settings(SECURE_SSL_REDIRECT=False)
class EndToEndDfGateTests(SimpleTestCase):

    FACTORIAL = ("We conducted a two-way factorial ANOVA of score by condition and sex. "
                 "The main effect of condition was significant, F(2, 45) = 3.67, p = .034.")

    def test_factorial_reported_as_one_way_is_not_called_discrepant(self):
        """The bug. 60 rows in 3 groups imply df=(2,57); the paper reports (2,45).

        MUTATION: drop the `df_matches_design is False` branch from assign_verdict -> the claim
        goes back to DISCREPANT and this fails.
        """
        spec = ClaimDataSpec(intended_test="one_way_anova", design_type="k_group",
                             groups=_groups([20, 20, 20], [0, 0.8, 1.6]))
        v = _verify(self.FACTORIAL, spec)
        self.assertEqual(v.verdict, Verdict.INSUFFICIENT_DATA)
        self.assertNotEqual(v.verdict, Verdict.DISCREPANT)
        self.assertTrue(any("not comparable" in n and "(2, 45)" in n and "(2, 57)" in n
                            for n in v.notes),
                        f"the note must name BOTH dfs; got {v.notes}")

    def test_a_genuine_discrepancy_is_still_reported(self):
        """THE POSITIVE CONTROL — this gate must not become a blanket amnesty.

        Same data, but the paper reports the df its data actually imply, so the model matches and
        the numbers genuinely disagree. That is a real discrepancy and must survive.

        MUTATION: make the gate unconditional (`df_matches_design is not True`) -> fails.
        """
        paper = ("A one-way ANOVA compared the three conditions, F(2, 57) = 3.67, p = .034.")
        spec = ClaimDataSpec(intended_test="one_way_anova", design_type="k_group",
                             groups=_groups([20, 20, 20], [0, 0.8, 1.6]))
        v = _verify(paper, spec)
        self.assertEqual(v.verdict, Verdict.DISCREPANT)
        self.assertFalse(any("not comparable" in n for n in v.notes))

    def test_matching_numbers_still_verify(self):
        """A correct paper must still come back VERIFIED.

        MUTATION: invert the gate to fire when df MATCHES -> fails.
        """
        groups = _groups([20, 20, 20], [0, 0.8, 1.6])
        from scipy import stats
        f, pval = stats.f_oneway(*groups)
        # the p must be the data's own p too: now that p_match is enforced, a placeholder p
        # would make this "correct paper" control fail for the wrong reason.
        paper = (f"A one-way ANOVA compared the three conditions, "
                 f"F(2, 57) = {f:.2f}, p = {pval:.4f}.")
        spec = ClaimDataSpec(intended_test="one_way_anova", design_type="k_group", groups=groups)
        v = _verify(paper, spec)
        self.assertEqual(v.verdict, Verdict.VERIFIED)

    def test_a_mislinked_dataset_is_caught_by_the_same_check(self):
        """The gate is about "did we reproduce THEIR analysis", so a wrong dataset trips it too.

        The paper's own df is internally consistent (2, 57) but we linked 3x10 rows -> (2, 27).

        MUTATION: compare only df1 instead of the whole tuple -> df1 matches (2 == 2), the
        mismatch is missed, and this fails.
        """
        paper = "A one-way ANOVA compared the three conditions, F(2, 57) = 3.67, p = .034."
        spec = ClaimDataSpec(intended_test="one_way_anova", design_type="k_group",
                             groups=_groups([10, 10, 10], [0, 0.8, 1.6]))
        v = _verify(paper, spec)
        self.assertEqual(v.verdict, Verdict.INSUFFICIENT_DATA)
        self.assertTrue(any("not comparable" in n for n in v.notes))
