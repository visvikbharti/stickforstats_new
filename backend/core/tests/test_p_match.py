"""
p_match: the engine computed the right p, held it, and never compared it.

`ClaimVerdict.p_match` was declared but assigned nowhere in the re-analysis path, and
`assign_verdict` returned VERIFIED on a matching statistic alone. So a paper reporting
p = 0.0001 on data that give p = 0.0047 -- wrong by 47x -- was certified VERIFIED. That is a
false clean bill of health, the mirror image of the false DISCREPANT fixed in 3ceeacd, and worse
for a tool whose entire purpose is catching wrong statistics.

Every test names the mutation that must break it.
"""

import numpy as np
from django.test import SimpleTestCase, override_settings
from scipy import stats

from core.manuscript.claim_extractor import StatisticalClaimExtractor
from core.manuscript.reanalysis_engine import verify_claim
from core.manuscript.verdict_decision import assign_verdict, p_matches
from core.manuscript.verdicts import ClaimDataSpec, ClaimVerificationRequest, Verdict


class PMatchesTests(SimpleTestCase):

    def test_exact_p_wrong_by_orders_of_magnitude(self):
        """MUTATION: `return True` from p_matches -> fails."""
        self.assertIs(p_matches(0.0001, 0.0047, "0.0001", "equals"), False)

    def test_exact_p_within_its_own_rounding_interval(self):
        """p = .005 reported, .0047 recomputed: rounds to the same value.

        MUTATION: drop the _decimals-based half-width and compare exactly -> fails.
        """
        self.assertIs(p_matches(0.005, 0.0047, ".005", "equals"), True)

    def test_inequality_is_judged_by_satisfaction(self):
        """"p < .05" with a recomputed .0047 is CORRECT reporting, not a discrepancy.

        MUTATION: compare inequalities by equality -> most of the literature is flagged, fails.
        """
        self.assertIs(p_matches(0.05, 0.0047, ".05", "less_than"), True)

    def test_a_bound_that_is_not_met_is_a_mismatch(self):
        """THE SMALL-p REGRESSION. "p < .001" with a recomputed .0047 is NOT satisfied.

        A flat additive tolerance of 0.005 makes .0047 <= .001 + .005 look fine, certifying a
        real reporting error. consistency_core records exactly this trap for its exact branch
        ("the previous flat additive +/-tolerance swamped tiny p-intervals ... hiding genuine
        small-p reporting errors", audit 2026-06-04 F-06) -- and the first draft of p_matches
        reintroduced it for inequalities. The slack must be the bound's own rounding half-width.

        MUTATION: `recomputed_p <= claimed_p + tolerance` (flat 0.005) -> fails.
        """
        self.assertIs(p_matches(0.001, 0.0047, ".001", "less_than"), False)
        # and the honest boundary: .0015 is inside .001's rounding interval, .0016 is not
        self.assertIs(p_matches(0.001, 0.0015, ".001", "less_than"), True)
        self.assertIs(p_matches(0.001, 0.0016, ".001", "less_than"), False)

    def test_greater_than_bound(self):
        """MUTATION: use the less_than comparison for greater_than -> fails."""
        self.assertIs(p_matches(0.05, 0.0047, ".05", "greater_than"), False)
        self.assertIs(p_matches(0.05, 0.60, ".05", "greater_than"), True)

    def test_three_state_on_missing_or_impossible_input(self):
        """An impossible p is an extraction artifact, not the author's error.

        MUTATION: return False instead of None for the out-of-range case -> a parsing bug becomes
        an accusation against the paper, and this fails.
        """
        self.assertIsNone(p_matches(None, 0.0047))
        self.assertIsNone(p_matches(0.05, None))
        self.assertIsNone(p_matches(1.7, 0.0047, "1.7", "equals"))
        self.assertIsNone(p_matches(-0.2, 0.0047, "-0.2", "equals"))


class AssignVerdictPMatchTests(SimpleTestCase):

    def _verdict(self, statistic_match, p_match):
        return assign_verdict(extraction_reliable=True, test_resolved=True, data_available=True,
                              executed_ok=True, assumptions_ok=None,
                              statistic_match=statistic_match, p_match=p_match)

    def test_matching_statistic_with_a_wrong_p_is_not_verified(self):
        """MUTATION: drop `and p_match is not False` -> fails. This is the whole bug."""
        self.assertEqual(self._verdict(True, False), Verdict.DISCREPANT)

    def test_unknown_p_does_not_block_verified(self):
        """Most claims report no usable p. Three-state discipline: None is no opinion.

        MUTATION: require `p_match is True` -> every claim without a p becomes DISCREPANT, fails.
        """
        self.assertEqual(self._verdict(True, None), Verdict.VERIFIED)
        self.assertEqual(self._verdict(True, True), Verdict.VERIFIED)


@override_settings(SECURE_SSL_REDIRECT=False)
class EndToEndPMatchTests(SimpleTestCase):

    def _run(self, paper):
        rng = np.random.default_rng(7)
        a, b = list(rng.normal(0, 1, 25)), list(rng.normal(0.6, 1, 25))
        claim = StatisticalClaimExtractor().extract(paper, section="Results")[0]
        spec = ClaimDataSpec(intended_test="independent_t", design_type="two_group",
                             groups=[a, b])
        return verify_claim(ClaimVerificationRequest(
            claim=claim, data_spec=spec, manuscript_text=paper, methods_text=paper)), a, b

    def test_correct_statistic_with_a_wrong_p_is_discrepant(self):
        """The headline. The data give p = .0047; the paper claims .0001.

        MUTATION: stop passing p_match into assign_verdict from reanalysis_engine -> the claim
        goes back to VERIFIED and this fails.
        """
        rng = np.random.default_rng(7)
        t, _ = stats.ttest_ind(list(rng.normal(0, 1, 25)), list(rng.normal(0.6, 1, 25)))
        v, _, _ = self._run(f"An independent t-test, t(48) = {abs(t):.2f}, p = 0.0001.")
        self.assertEqual(v.verdict, Verdict.DISCREPANT)
        self.assertIs(v.statistic_match, True)
        self.assertIs(v.p_match, False)

    def test_a_fully_correct_claim_still_verifies(self):
        """The positive control: this must not become a blanket DISCREPANT.

        MUTATION: invert p_matches -> fails.
        """
        rng = np.random.default_rng(7)
        t, p = stats.ttest_ind(list(rng.normal(0, 1, 25)), list(rng.normal(0.6, 1, 25)))
        v, _, _ = self._run(f"An independent t-test, t(48) = {abs(t):.2f}, p = {p:.4f}.")
        self.assertEqual(v.verdict, Verdict.VERIFIED)
        self.assertIs(v.p_match, True)

    def test_p_match_is_recorded_on_the_verdict(self):
        """It was a declared-but-never-assigned field, which is this project's recurring defect.

        MUTATION: remove `p_match=pmatch` from the ClaimVerdict construction -> fails.
        """
        rng = np.random.default_rng(7)
        t, p = stats.ttest_ind(list(rng.normal(0, 1, 25)), list(rng.normal(0.6, 1, 25)))
        v, _, _ = self._run(f"An independent t-test, t(48) = {abs(t):.2f}, p = {p:.4f}.")
        self.assertIsNotNone(v.p_match)
        self.assertIs(v.to_dict()["match"]["p_value"], True)
