"""
T17-A5IDETECT — tests for per-claim assumption-DISCLOSURE auditing.

Every test here names, in its docstring, the MUTATION that must make it fail. A regression test
that survives its own bug tests nothing, and this module exists precisely because a verdict was
declared, persisted and advertised while no code path could produce it.
"""

import itertools
import unittest

from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from core.manuscript.assumption_reporting import (
    EVIDENCE_PATTERNS,
    GUARDIAN_TEST_ALIAS,
    REPORTING_REQUIREMENTS,
    detect_assumption_reporting,
)
from core.manuscript.test_resolver import resolve_test
from core.manuscript.verdict_decision import assign_verdict
from core.manuscript.verdicts import ClaimVerdict, ClaimVerificationRequest, Verdict


class _Claim:
    """Minimal duck-typed StatisticalClaim (the real one is a dataclass with many fields)."""

    def __init__(self, claim_type="t_statistic", test_name="", position=0):
        self.claim_type = claim_type
        self.test_name = test_name
        self.position = position
        self.claim_id = "C001"
        self.statistic_value = 2.5
        self.p_value = 0.018
        self.df = (28,)
        self.raw_text = "t(28) = 2.50, p = 0.018"
        # extraction COMPLETENESS, not correctness. A claim carrying statistic + df + p scores
        # well above extraction_quality.MIN_CLAIM_COMPLETENESS (0.4); without this the
        # UNVERIFIABLE_EXTRACTION gate fires first and the claim never reaches the audit.
        self.confidence = 0.9
        self.location = "Results"


def _text(body):
    return {"manuscript_text": body, "methods_text": body}


# ---------------------------------------------------------------------------
# 1. The verdict is actually reachable
# ---------------------------------------------------------------------------


class AssignVerdictReachabilityTests(unittest.TestCase):

    def test_assumption_unreported_is_reachable(self):
        """MUTATION: delete the `assumptions_reported is False` branch in assign_verdict.

        Before this feature ASSUMPTION_UNREPORTED was declared in the enum, stored as a DB
        choice and named in the /verify/ docstring, yet no input could produce it.
        """
        got = assign_verdict(extraction_reliable=True, test_resolved=True, data_available=False,
                             executed_ok=False, assumptions_ok=None, statistic_match=None,
                             assumptions_reported=False)
        self.assertEqual(got, Verdict.ASSUMPTION_UNREPORTED)

    def test_exhaustive_enumeration_reaches_every_intended_verdict(self):
        """Enumerate the WHOLE input space; assert exactly which verdicts are reachable.

        MUTATION: delete the new branch -> ASSUMPTION_UNREPORTED drops out of `reachable` and
        this fails. This is the test that would have caught the original defect.
        """
        reachable = set()
        tri = [True, False, None]
        for er, tr, da, ok in itertools.product([True, False], repeat=4):
            for ao, sm, ar in itertools.product(tri, tri, tri):
                reachable.add(assign_verdict(
                    extraction_reliable=er, test_resolved=tr, data_available=da, executed_ok=ok,
                    assumptions_ok=ao, statistic_match=sm, assumptions_reported=ar))

        self.assertIn(Verdict.ASSUMPTION_UNREPORTED, reachable)
        self.assertEqual(reachable, {
            Verdict.VERIFIED, Verdict.DISCREPANT, Verdict.ASSUMPTION_VIOLATED,
            Verdict.ASSUMPTION_UNREPORTED, Verdict.INSUFFICIENT_DATA,
            Verdict.UNVERIFIABLE_EXTRACTION,
        })

    def test_none_never_produces_a_finding(self):
        """`assumptions_reported=None` means NO OPINION and must stay INSUFFICIENT_DATA.

        MUTATION: change the branch to `if assumptions_reported is not True` -> a claim we could
        not evaluate becomes an accusation, and this fails. This is the interlock that stops a
        guess turning into a finding.
        """
        for reported in (None, True):
            self.assertEqual(
                assign_verdict(extraction_reliable=True, test_resolved=True, data_available=False,
                               executed_ok=False, assumptions_ok=None, statistic_match=None,
                               assumptions_reported=reported),
                Verdict.INSUFFICIENT_DATA, f"assumptions_reported={reported!r}")

    def test_with_data_assumption_violated_keeps_precedence(self):
        """Real evidence outranks disclosure.

        MUTATION: move the ASSUMPTION_UNREPORTED branch above the data-available checks -> a
        claim we actually re-ran and found violated would be downgraded to a paperwork
        complaint, and this fails.
        """
        self.assertEqual(
            assign_verdict(extraction_reliable=True, test_resolved=True, data_available=True,
                           executed_ok=True, assumptions_ok=False, statistic_match=True,
                           assumptions_reported=False),
            Verdict.ASSUMPTION_VIOLATED)

    def test_unresolved_test_is_never_an_accusation(self):
        """MUTATION: drop the `if not test_resolved` early return -> an unresolvable claim could
        be flagged for assumptions belonging to a test we never identified."""
        self.assertEqual(
            assign_verdict(extraction_reliable=True, test_resolved=False, data_available=False,
                           executed_ok=False, assumptions_ok=None, statistic_match=None,
                           assumptions_reported=False),
            Verdict.INSUFFICIENT_DATA)


# ---------------------------------------------------------------------------
# 2. Structural invariants
# ---------------------------------------------------------------------------


class RequirementTableInvariantTests(unittest.TestCase):

    def test_every_required_assumption_has_a_detector(self):
        """The `similar_shapes` lesson: a requirement with nothing behind it is a lie.

        MUTATION: add "sphericity" to any REPORTING_REQUIREMENTS row without adding a pattern ->
        importing the module raises, and this fails.
        """
        for test_key, required in REPORTING_REQUIREMENTS.items():
            for assumption in required:
                self.assertIn(assumption, EVIDENCE_PATTERNS,
                              f"{test_key} requires {assumption} with no detector")

    def test_requirements_are_a_subset_of_guardians(self):
        """Binds this table to Guardian's WITHOUT copying it (one rule, one place).

        The two may legitimately differ -- Welch needs no homogeneity check here -- but this side
        may never demand something Guardian does not consider an assumption of that test.

        MUTATION: add "linearity" to `independent_t` -> not in Guardian's t_test list, fails.
        """
        from core.guardian.guardian_core import GuardianCore
        guardian_requirements = GuardianCore().test_requirements

        for test_key, required in REPORTING_REQUIREMENTS.items():
            alias = GUARDIAN_TEST_ALIAS[test_key]
            if alias is None:
                self.assertFalse(required,
                                 f"{test_key} has no Guardian anchor but requires {required}")
                continue
            self.assertIn(alias, guardian_requirements,
                          f"GUARDIAN_TEST_ALIAS maps {test_key} -> {alias}, absent from Guardian")
            self.assertLessEqual(
                set(required), set(guardian_requirements[alias]),
                f"{test_key} requires more than Guardian's '{alias}' does")

    def test_welch_does_not_require_a_homogeneity_check(self):
        """Welch's t-test IS the remedy for unequal variances; demanding Levene for it is wrong.

        MUTATION: add "variance_homogeneity" to the welch_t row -> fails.
        """
        self.assertNotIn("variance_homogeneity", REPORTING_REQUIREMENTS["welch_t"])
        self.assertIn("variance_homogeneity", REPORTING_REQUIREMENTS["independent_t"])

    def test_rank_based_tests_require_nothing(self):
        """MUTATION: give mann_whitney_u a "normality" requirement -> fails.

        The TODO calls this out by name: a Mann-Whitney must never be asked for normality.
        """
        for key in ("mann_whitney_u", "kruskal_wallis", "spearman", "kendall"):
            self.assertEqual(REPORTING_REQUIREMENTS[key], (), f"{key} should require nothing")


# ---------------------------------------------------------------------------
# 3. Detector behaviour
# ---------------------------------------------------------------------------


class DetectorTests(unittest.TestCase):

    def test_flags_both_when_nothing_is_reported(self):
        """MUTATION: make _evidence_span always return a truthy span -> nothing is ever
        unreported and this fails."""
        r = detect_assumption_reporting(
            _Claim(test_name="independent-samples t-test"),
            **_text("Groups were compared with an independent-samples t-test."))
        self.assertTrue(r.evaluable)
        self.assertEqual(set(r.unreported), {"normality", "variance_homogeneity"})
        self.assertIs(r.all_reported, False)

    def test_clean_when_both_are_reported(self):
        """MUTATION: remove 'levene' from the variance_homogeneity pattern -> fails."""
        r = detect_assumption_reporting(
            _Claim(test_name="independent-samples t-test"),
            **_text("Normality was assessed with the Shapiro-Wilk test and homogeneity of "
                    "variance with Levene's test. An independent-samples t-test was used."))
        self.assertTrue(r.evaluable)
        self.assertEqual(r.unreported, [])
        self.assertIs(r.all_reported, True)

    def test_partial_disclosure_flags_only_the_missing_one(self):
        """MUTATION: make the audit all-or-nothing -> fails."""
        r = detect_assumption_reporting(
            _Claim(test_name="independent-samples t-test"),
            **_text("Normality was assessed using Q-Q plots. "
                    "An independent-samples t-test was used."))
        self.assertEqual(r.reported, ["normality"])
        self.assertEqual(r.unreported, ["variance_homogeneity"])

    def test_welch_with_normality_only_is_clean(self):
        """MUTATION: alias welch_t's requirements to independent_t's -> Levene is demanded and
        this fails."""
        r = detect_assumption_reporting(
            _Claim(test_name="Welch's t-test"),
            **_text("Normality was assessed with the Shapiro-Wilk test. Welch's t-test was used."))
        self.assertIs(r.all_reported, True)

    def test_mann_whitney_is_never_asked_for_normality(self):
        """MUTATION: give mann_whitney_u a normality requirement -> fails."""
        r = detect_assumption_reporting(
            _Claim(claim_type="mann_whitney", test_name="Mann-Whitney U test"),
            **_text("Groups were compared with the Mann-Whitney U test."))
        self.assertEqual(r.required, ())
        self.assertIsNone(r.all_reported)

    def test_ambiguous_resolution_stays_silent(self):
        """A bare 't-test' does not state its design; the resolver DEFAULTS. Never accuse on a
        guess.

        MUTATION: read the flag as `getattr(resolution, "defaulted", False)` -- the attribute is
        actually named `ambiguous`, so the interlock silently goes inert and this fails. That is
        not hypothetical: it is the bug this module shipped with in its first draft.
        """
        claim = _Claim(test_name="t-test")
        self.assertTrue(resolve_test(claim).ambiguous, "precondition: resolver must default here")
        r = detect_assumption_reporting(claim, **_text("A t-test was used to compare the groups."))
        self.assertFalse(r.evaluable)
        self.assertIsNone(r.all_reported)

    def test_explicit_one_way_anova_is_evaluable(self):
        """MUTATION: revert the f_statistic branch to unconditional ambiguous=True -> ANOVA, the
        commonest family, becomes unreachable and this fails."""
        r = detect_assumption_reporting(
            _Claim(claim_type="f_statistic", test_name="one-way ANOVA"),
            **_text("A one-way ANOVA compared the three groups."))
        self.assertTrue(r.evaluable)
        self.assertEqual(set(r.unreported), {"normality", "variance_homogeneity"})

    def test_repeated_measures_anova_stays_silent(self):
        """'one-way repeated-measures ANOVA' contains 'one-way'; order of the substring checks
        must not mark it certain.

        MUTATION: test for 'one-way' before the repeated/factorial guard -> fails.
        """
        r = detect_assumption_reporting(
            _Claim(claim_type="f_statistic", test_name="one-way repeated-measures ANOVA"),
            **_text("A one-way repeated-measures ANOVA was used."))
        self.assertFalse(r.evaluable)

    def test_disclosure_far_from_the_claim_still_counts(self):
        """The false-ACCUSATION guard: a check stated in Methods covers a claim in Results.

        MUTATION: narrow _search_scope back to a window around claim.position -> the Methods
        disclosure is missed, the paper is wrongly reported as undisclosed, and this fails.
        """
        methods = ("Normality was assessed with the Shapiro-Wilk test and homogeneity of variance "
                   "with Levene's test.")
        results = "x" * 5000 + " Group A exceeded group B, t(28) = 2.50, p = 0.018."
        r = detect_assumption_reporting(
            _Claim(test_name="independent-samples t-test", position=5020),
            manuscript_text=results, methods_text=methods)
        self.assertEqual(r.unreported, [])

    def test_evidence_span_is_returned_as_a_receipt(self):
        """Every accepted assumption must show the text that justified it.

        MUTATION: return True instead of the span from _evidence_span -> fails.
        """
        r = detect_assumption_reporting(
            _Claim(test_name="independent-samples t-test"),
            **_text("Normality was assessed with the Shapiro-Wilk test and homogeneity of "
                    "variance with Levene's test. An independent-samples t-test was used."))
        self.assertIn("normality", r.evidence)
        self.assertIn("Shapiro-Wilk", r.evidence["normality"])


# ---------------------------------------------------------------------------
# 4. Fail-closed, and end to end
# ---------------------------------------------------------------------------


class FailClosedTests(unittest.TestCase):

    def test_a_crashing_audit_never_reads_as_clean(self):
        """A Guardian crash once recorded guardian_passed=True. Never again.

        MUTATION: swallow the exception with `except Exception: pass` and leave the verdict
        untouched -> the crash note disappears and this fails.
        """
        from core.manuscript import reanalysis_engine

        def boom(*a, **kw):
            raise RuntimeError("detector exploded")

        original = reanalysis_engine.detect_assumption_reporting
        reanalysis_engine.detect_assumption_reporting = boom
        try:
            verdict = reanalysis_engine.verify_claim(ClaimVerificationRequest(
                claim=_Claim(test_name="independent-samples t-test"),
                data_spec=None,
                **_text("An independent-samples t-test was used.")))
        finally:
            reanalysis_engine.detect_assumption_reporting = original

        self.assertIsInstance(verdict, ClaimVerdict)
        self.assertEqual(verdict.verdict, Verdict.INSUFFICIENT_DATA)
        self.assertIsNone(verdict.assumptions_reported_in_text)
        self.assertTrue(any("audit failed" in n for n in verdict.notes),
                        f"the failure must be stated out loud; notes were {verdict.notes}")


class EndToEndTests(unittest.TestCase):

    def test_verify_claim_emits_assumption_unreported(self):
        """MUTATION: stop passing `assumptions_reported` into assign_verdict -> the claim falls
        back to INSUFFICIENT_DATA and this fails."""
        from core.manuscript.reanalysis_engine import verify_claim

        verdict = verify_claim(ClaimVerificationRequest(
            claim=_Claim(test_name="independent-samples t-test"),
            data_spec=None,
            **_text("Groups were compared with an independent-samples t-test.")))

        self.assertEqual(verdict.verdict, Verdict.ASSUMPTION_UNREPORTED)
        self.assertIs(verdict.assumptions_reported_in_text, False)
        self.assertTrue(any("does not report checking" in n for n in verdict.notes))
        self.assertTrue(any("independent-samples t-test" in n for n in verdict.notes),
                        "user-facing notes must not leak the internal key 'independent_t'")
        self.assertFalse(any("independent_t," in n or "a independent_t" in n
                             for n in verdict.notes))

    def test_disclosed_paper_is_not_flagged(self):
        """The negative control. MUTATION: make the detector always return unreported -> fails."""
        from core.manuscript.reanalysis_engine import verify_claim

        verdict = verify_claim(ClaimVerificationRequest(
            claim=_Claim(test_name="independent-samples t-test"),
            data_spec=None,
            **_text("Normality was assessed with the Shapiro-Wilk test and homogeneity of "
                    "variance with Levene's test. An independent-samples t-test was used.")))

        self.assertEqual(verdict.verdict, Verdict.INSUFFICIENT_DATA)
        self.assertIs(verdict.assumptions_reported_in_text, True)


# ---------------------------------------------------------------------------
# 6. The design must come from the PAPER, for every claim family
# ---------------------------------------------------------------------------


class DesignIsReadNotGuessedTests(unittest.TestCase):
    """The t-test fix was only a third of the bug.

    `_extract_f_tests` overwrote the paper's own words with `"one-way ANOVA" if df1 > 1`, so a
    manuscript saying "two-way factorial ANOVA" was reported back as an undisclosed *one-way*
    ANOVA — and for a repeated-measures design the demanded assumption (equality of variances)
    is the wrong one entirely; sphericity is. The chi-square path named every claim a test of
    independence, including explicit goodness-of-fit tests.

    These assert the whole chain: extractor -> resolver -> verdict.
    """

    def _verdict(self, text):
        from core.manuscript.claim_extractor import StatisticalClaimExtractor
        from core.manuscript.reanalysis_engine import verify_claim
        claims = StatisticalClaimExtractor().extract(text, section="Results")
        self.assertTrue(claims, f"precondition: a claim must be extracted from {text!r}")
        return verify_claim(ClaimVerificationRequest(
            claim=claims[0], data_spec=None, manuscript_text=text, methods_text=text))

    def test_factorial_anova_is_not_reported_back_as_one_way(self):
        """MUTATION: restore `test_name = "one-way ANOVA" if df1 > 1 else "F-test"` -> fails."""
        v = self._verdict("We ran a two-way factorial ANOVA on the 2x3 design. "
                          "The main effect was significant, F(2, 45) = 3.67, p = .034.")
        self.assertEqual(v.verdict, Verdict.INSUFFICIENT_DATA)
        self.assertIsNone(v.assumptions_reported_in_text)

    def test_repeated_measures_anova_is_not_asked_for_equal_variances(self):
        """A within-subjects ANOVA assumes sphericity, not equality of variances.

        The phrasing is "one-WAY repeated-measures ANOVA" on purpose. Plain "repeated-measures
        ANOVA" does NOT discriminate: with the guard removed nothing else matches either, so it
        falls through to "" and is silent for the wrong reason — the mutation survives and the
        test proves nothing (verified: it did survive). Adding "one-way" makes the ordering
        load-bearing, because without the guard "one-way" matches first, the design resolves
        NON-ambiguously, and the claim is flagged for equality of variances — the actual harm.

        MUTATION: drop the repeated/within-subject guard from _F_DESIGN_PATTERNS -> fails.
        """
        v = self._verdict("A one-way repeated-measures ANOVA was conducted across the three "
                          "timepoints, F(2, 45) = 3.67, p = .034.")
        self.assertEqual(v.verdict, Verdict.INSUFFICIENT_DATA)
        self.assertFalse(any("equality of variances" in n for n in v.notes))

    def test_explicit_one_way_anova_is_still_flagged(self):
        """The positive control — the fix must not simply silence every ANOVA.

        MUTATION: make _design_from_context always return "" -> fails.
        """
        v = self._verdict("A one-way ANOVA compared the three groups, F(2, 45) = 3.67, p = .034.")
        self.assertEqual(v.verdict, Verdict.ASSUMPTION_UNREPORTED)

    def test_anova_with_no_stated_design_stays_silent(self):
        v = self._verdict("Scores differed across groups, F(2, 45) = 3.67, p = .034.")
        self.assertEqual(v.verdict, Verdict.INSUFFICIENT_DATA)

    def test_goodness_of_fit_is_not_called_a_test_of_independence(self):
        """MUTATION: delete the `if "goodness" in name` branch in test_resolver -> fails."""
        v = self._verdict("A chi-square goodness-of-fit test compared observed counts against a "
                          "uniform expectation, chi-square(3) = 8.40, p = .038.")
        self.assertEqual(v.verdict, Verdict.INSUFFICIENT_DATA)
        self.assertFalse(any("independence" in n for n in v.notes))

    def test_chi_square_of_independence_is_flagged_but_labelled_generically(self):
        """We may say "a chi-square test"; we may not assert WHICH one when the key cannot tell.

        MUTATION: set the display name back to "a chi-square test of independence" -> fails.
        """
        v = self._verdict("A chi-square test of independence related group to outcome, "
                          "chi-square(3) = 8.40, p = .038.")
        self.assertEqual(v.verdict, Verdict.ASSUMPTION_UNREPORTED)
        self.assertTrue(any("expected cell frequencies" in n for n in v.notes))
        self.assertFalse(any("test of independence" in n for n in v.notes))


# ---------------------------------------------------------------------------
# 5. Through the real HTTP endpoint
# ---------------------------------------------------------------------------


@override_settings(SECURE_SSL_REDIRECT=False)
class VerifyAPIAppropriatenessTests(APITestCase):
    """The unit layer can be right while the wiring is wrong; assert the JSON users receive."""

    ANALYZE = "/api/v1/verify/analyze/"

    def _distribution(self, paper):
        r = self.client.post(self.ANALYZE, {"text": paper}, format="multipart")
        self.assertEqual(r.status_code, status.HTTP_200_OK, r.content)
        return r.json()["verdict_distribution"]

    def test_undisclosed_paper_is_flagged(self):
        """MUTATION: stop threading manuscript_text through verify_pipeline -> the audit has no
        text, reports not-evaluable, and this fails."""
        self.assertIn("ASSUMPTION_UNREPORTED", self._distribution(
            "Methods. Group means were compared with an independent-samples t-test. "
            "Results. The intervention group scored higher, t(48) = 2.10, p = 0.041."))

    def test_disclosed_paper_is_not_flagged(self):
        """The negative control at API level."""
        self.assertNotIn("ASSUMPTION_UNREPORTED", self._distribution(
            "Methods. Normality was assessed with the Shapiro-Wilk test and homogeneity of "
            "variance with Levene's test. Group means were compared with an "
            "independent-samples t-test. "
            "Results. The intervention group scored higher, t(48) = 2.10, p = 0.041."))

    def test_paper_that_never_states_its_design_is_not_flagged(self):
        """A bare t(48) states no design. MUTATION: restore the extractor's
        "integer df -> independent t-test" guess -> a design the paper never claimed becomes an
        accusation, and this fails."""
        self.assertNotIn("ASSUMPTION_UNREPORTED", self._distribution(
            "Results. The intervention had a significant effect, t(48) = 2.10, p = 0.041."))


if __name__ == "__main__":
    unittest.main()
