"""
Guardian reports what it EXAMINED, not what the test declares — through every layer.

`assumptions_checked` was populated from ``test_requirements``: a statement about what a test
NEEDS, published as though it were a statement about what we DID. Executed against the live
endpoint before the fix, 22 of 25 test types listed ``independence`` as checked while the audit
trail recorded ``not_applicable`` — the lag-1 autocorrelation test only runs when the caller
declares the rows are ordered, which almost no caller does. Eight of those examined NOTHING AT
ALL and still returned confidence 1.000 with ``can_proceed`` true:

    POST /api/guardian/check/  {"test_type": "cox_regression", ...}   -> HTTP 200
        assumptions_checked: ["independence"]   confidence_score: 1.0   can_proceed: true

This is the ``similar_shapes`` defect in its general form. That one was a requirement with no
validator, and ``_assert_every_requirement_is_implemented`` now makes it unrepresentable. But a
validator that EXISTS and DECLINES leaves identical residue, and no construction-time check can
see it, because whether a validator declines depends on the DATA.

Three earlier repairs each removed one known case by hand (``variance_homogeneity`` and
``similar_shapes`` for paired designs, ``expected_frequencies`` without a declared table).
``independence`` was never given a fourth. The label is now derived from the audit trail, so
there is nothing left to remember.

Every test names the mutation that must break it.
"""

import numpy as np
from django.test import SimpleTestCase, TestCase, override_settings

from core.guardian.guardian_core import GuardianCore
from core.services.cascade_engine import AutonomousCascadeEngine


def _two_groups(n=40, seed=7):
    rng = np.random.default_rng(seed)
    return [rng.normal(0.0, 1.0, n).tolist(), rng.normal(0.4, 1.0, n).tolist()]


def _clean_two_groups(n=40, seed=20260804):
    """Data Guardian finds NOTHING wrong with — verified, not assumed.

    Needed for the confidence control below: the default fixture happens to carry a minor
    outlier violation (confidence 0.722), so asserting "confidence is still 1.0" against it
    would fail for a reason that has nothing to do with this change. Several seeds were run;
    this one is clean.
    """
    rng = np.random.default_rng(seed)
    return [rng.normal(0.0, 1.0, n).tolist(), rng.normal(0.0, 1.0, n).tolist()]


class TheLabelMatchesTheAuditTrailTests(SimpleTestCase):

    def setUp(self):
        self.guardian = GuardianCore()
        self.data = _two_groups()

    def test_independence_is_not_claimed_as_checked_when_it_did_not_run(self):
        """The headline: 22 of 25 test types claimed it.

        MUTATION: set `assumptions_checked=requirements` at the end of check() -> fails.
        """
        report = self.guardian.check(self.data, "t_test")
        self.assertNotIn("independence", report.assumptions_checked)
        self.assertIn("independence", report.assumptions_not_evaluated)
        # and the trail agrees, which is the source of truth
        entry = [e for e in report.audit_trail if e.assumption == "independence"][0]
        self.assertEqual(entry.result, "not_applicable")

    def test_declaring_sequential_rows_moves_it_back_into_checked(self):
        """THE POSITIVE CONTROL. Without this the fix could be a blanket deletion of the
        label rather than a truthful one: when the check DOES run, it must be reported.

        MUTATION: hardcode `checked = [r for r in requirements if r != "independence"]` ->
        the assumption never returns to the checked list and this fails.
        """
        report = self.guardian.check(self.data, "t_test", observation_order="sequential")
        self.assertIn("independence", report.assumptions_checked)
        self.assertNotIn("independence", report.assumptions_not_evaluated)

    def test_the_two_lists_partition_the_requirements(self):
        """Nothing may be silently dropped: together they must reconstruct what the test
        requires, so a caller can always see the full picture.

        MUTATION: return only `checked` and leave `assumptions_not_evaluated` empty -> fails.
        """
        for test_type in ("t_test", "anova", "regression", "mann_whitney", "pearson"):
            report = self.guardian.check(self.data, test_type)
            required = set(self.guardian.test_requirements[
                self.guardian._canonical_test_type(test_type)])
            reported = set(report.assumptions_checked) | set(report.assumptions_not_evaluated)
            self.assertTrue(reported.issubset(required), test_type)
            self.assertEqual(set(report.assumptions_checked)
                             & set(report.assumptions_not_evaluated), set(), test_type)

    def test_a_report_that_examined_nothing_says_so(self):
        """`cox_regression` returned confidence 1.0 having examined nothing, over HTTP.

        MUTATION: delete the `none_evaluated` block in guardian_core -> confidence returns to
        1.0 and all three assertions fail.
        """
        report = self.guardian.check(self.data, "cox_regression")
        self.assertEqual(report.assumptions_checked, [])
        self.assertEqual(report.assumptions_not_evaluated, ["independence"])
        self.assertLess(report.confidence_score, 1.0)
        self.assertTrue(any(v.assumption == "none_evaluated" for v in report.violations))

    def test_a_report_that_examined_something_keeps_its_confidence(self):
        """THE CONTROL that bounds the change. Firing the warning whenever ANYTHING was
        skipped would re-rate essentially every check the product performs — independence is
        unevaluated on 22 of 25 test types — which is a far larger change than the defect
        warrants.

        MUTATION: fire `none_evaluated` on `if not_evaluated:` instead of `if not checked:` ->
        a clean t-test drops below 1.0 and this fails.
        """
        report = self.guardian.check(_clean_two_groups(), "t_test")
        self.assertEqual(report.assumptions_checked,
                         ["normality", "variance_homogeneity", "outliers"])
        self.assertEqual(report.confidence_score, 1.0)
        self.assertEqual(report.violations, [])

    def test_the_contingency_path_stops_contradicting_itself(self):
        """`_check_contingency` records independence as not_applicable and then listed it as
        checked, thirty lines apart, in the same function.

        MUTATION: restore `assumptions_checked=["expected_frequencies", "independence"]` ->
        fails.
        """
        report = self.guardian.check({"observed": [[10, 20], [30, 40]]}, "chi_square")
        self.assertEqual(report.assumptions_checked, ["expected_frequencies"])
        self.assertIn("independence", report.assumptions_not_evaluated)
        self.assertEqual(report.confidence_score, 1.0)   # what DID run, ran clean


class ItSurvivesTheCascadeBoundaryTests(SimpleTestCase):
    """The dict is where the information was being lost."""

    def test_the_dict_carries_what_was_not_evaluated(self):
        """`_report_to_dict` dropped the audit trail AND had no other way to express
        "nothing ran", so every consumer downstream was forced to guess.

        MUTATION: remove `assumptions_not_evaluated` from _report_to_dict -> fails.
        """
        report = GuardianCore().check(_two_groups(), "t_test")
        payload = AutonomousCascadeEngine()._report_to_dict(report)
        self.assertEqual(payload["assumptions_checked"],
                         ["normality", "variance_homogeneity", "outliers"])
        self.assertEqual(payload["assumptions_not_evaluated"], ["independence"])


@override_settings(SECURE_SSL_REDIRECT=False)
class TheVerdictDoesNotCertifyWhatWasNotCheckedTests(SimpleTestCase):
    """`reanalysis_engine` set `assumptions_checked=True` on the mere EXISTENCE of a report."""

    def _verdict(self, guardian_report):
        """Build a verdict from a synthetic engine result carrying `guardian_report`."""
        from core.manuscript import reanalysis_engine as engine
        from core.manuscript.claim_extractor import StatisticalClaimExtractor
        from core.manuscript.verdicts import ClaimDataSpec, ClaimVerificationRequest

        paper = "An independent-samples t-test, t(78) = 2.10, p = .039."
        claim = StatisticalClaimExtractor().extract(paper, section="Results")[0]
        spec = ClaimDataSpec(intended_test="independent_t", design_type="two_group",
                             groups=_two_groups())

        class _Res:
            result = type("R", (), {"statistic": 2.10, "p_value": 0.039,
                                    "effect_size": None, "effect_size_name": None})()
            final_test = "independent_t"
            confidence_score = 1.0

        res = _Res()
        res.guardian_report = guardian_report
        original = engine._engine
        engine._engine = lambda: type("E", (), {
            "execute_with_cascade": staticmethod(lambda *a, **k: res)})()
        try:
            return engine.verify_claim(ClaimVerificationRequest(
                claim=claim, data_spec=spec, manuscript_text=paper, sentence=paper))
        finally:
            engine._engine = original

    def test_nothing_examined_means_no_opinion_not_a_clean_bill(self):
        """A report where every requirement came back not_applicable must not become
        "assumptions checked: yes, satisfied: yes" on the claim verdict.

        MUTATION: restore `assumptions_checked=res.guardian_report is not None` and
        `assumptions_satisfied=assumptions_ok` -> both flip to True and this fails.
        """
        verdict = self._verdict({"violations": [], "assumptions_checked": [],
                                 "assumptions_not_evaluated": ["independence"]})
        self.assertIs(verdict.assumptions_checked, False)
        self.assertIsNone(verdict.assumptions_satisfied)

    def test_a_real_check_still_reports_as_checked_and_satisfied(self):
        """THE POSITIVE CONTROL: this must not silently disable assumption reporting for the
        claims where Guardian really did the work.

        MUTATION: hardcode `assumptions_checked=False` / `assumptions_satisfied=None` -> fails.
        """
        verdict = self._verdict({"violations": [],
                                 "assumptions_checked": ["normality", "outliers"],
                                 "assumptions_not_evaluated": ["independence"]})
        self.assertIs(verdict.assumptions_checked, True)
        self.assertIs(verdict.assumptions_satisfied, True)


@override_settings(SECURE_SSL_REDIRECT=False)
class TheLiveEndpointTellsTheTruthTests(TestCase):
    """Through the real HTTP surface, which is where the false claim was being served."""

    def _check(self, test_type):
        return self.client.post(
            "/api/guardian/check/",
            data={"data": {"a": _two_groups()[0], "b": _two_groups()[1]},
                  "test_type": test_type, "alpha": 0.05},
            content_type="application/json").json()

    def test_the_endpoint_no_longer_claims_an_unrun_check(self):
        """MUTATION: any break in the chain (guardian_core, views._serialize_report) -> fails."""
        payload = self._check("independent_t")
        self.assertNotIn("independence", payload["assumptions_checked"])
        self.assertEqual(payload["assumptions_not_evaluated"], ["independence"])

    def test_the_endpoint_no_longer_serves_a_vacuous_clean_bill(self):
        """This exact request returned assumptions_checked=['independence'],
        confidence_score=1.0, can_proceed=true, violations=[].

        MUTATION: delete the `none_evaluated` block -> confidence returns to 1.0, the
        violation disappears, and this fails.
        """
        payload = self._check("cox_regression")
        self.assertEqual(payload["assumptions_checked"], [])
        self.assertLess(payload["confidence_score"], 1.0)
        self.assertTrue(any(v["assumption"] == "none_evaluated"
                            for v in payload["violations"]))


class CoverageIsPublishedBesideConfidenceTests(SimpleTestCase):
    """`confidence_score` grades how BAD the findings were. It says nothing about how much was
    examined, and on its own it cannot distinguish a thorough clean report from an empty one.

    Executed on identical data before this change, every one of these read "confidence 1.0"
    with a full assumptions_checked list:

        pearson       confidence 1.0   coverage 1.00   (3 of 3 examined)
        independent_t confidence 1.0   coverage 0.75   (3 of 4)
        mann_whitney  confidence 1.0   coverage 0.50   (1 of 2)
        cox_regression                 coverage 0.00   (0 of 1)
    """

    def setUp(self):
        self.guardian = GuardianCore()

    def test_coverage_reports_the_fraction_actually_examined(self):
        """MUTATION: `return 1.0` from assumption_coverage -> fails."""
        self.assertEqual(
            self.guardian.check(_clean_two_groups(), "pearson").assumption_coverage, 1.0)
        self.assertEqual(
            self.guardian.check(_clean_two_groups(), "t_test").assumption_coverage, 0.75)
        self.assertEqual(
            self.guardian.check(_clean_two_groups(), "mann_whitney").assumption_coverage, 0.5)
        self.assertEqual(
            self.guardian.check(_clean_two_groups(), "cox_regression").assumption_coverage, 0.0)

    def test_full_confidence_does_not_imply_full_coverage(self):
        """THE POINT OF THE NUMBER. Two reports, both perfectly confident, one of which
        examined half as much. Nothing in the old payload could tell them apart.

        MUTATION: derive coverage from `confidence_score` -> the two become equal and this
        fails.
        """
        thorough = self.guardian.check(_clean_two_groups(), "pearson")
        partial = self.guardian.check(_clean_two_groups(), "mann_whitney")
        self.assertEqual(thorough.confidence_score, partial.confidence_score)
        self.assertGreater(thorough.assumption_coverage, partial.assumption_coverage)

    def test_coverage_cannot_be_assigned(self):
        """It is a read-only property, so a figure disagreeing with the two lists beside it is
        not a bug anyone can write -- the same reasoning as `Rule` having no confidence field.

        MUTATION: turn it into a plain dataclass field -> the assignment succeeds and this
        fails.
        """
        report = self.guardian.check(_clean_two_groups(), "t_test")
        with self.assertRaises(AttributeError):
            report.assumption_coverage = 1.0

    def test_coverage_agrees_with_the_two_lists_for_every_test_type(self):
        """The invariant that makes it trustworthy: it is DERIVED, never stored.

        MUTATION: round to 0 decimals, or divide by len(assumptions_checked) -> fails.
        """
        for test_type in sorted(self.guardian.test_requirements):
            report = self.guardian.check(_two_groups(), test_type)
            n_checked = len(report.assumptions_checked)
            n_total = n_checked + len(report.assumptions_not_evaluated)
            expected = round(n_checked / n_total, 3) if n_total else None
            self.assertEqual(report.assumption_coverage, expected, test_type)

    def test_no_requirements_means_no_opinion_rather_than_a_flattering_one(self):
        """A test declaring nothing must not mint coverage 1.0. No test type does today; the
        branch exists so that adding one cannot silently claim perfection.

        MUTATION: `return 1.0` when total == 0 -> fails.
        """
        report = self.guardian.check(_clean_two_groups(), "t_test")
        report.assumptions_checked = []
        report.assumptions_not_evaluated = []
        self.assertIsNone(report.assumption_coverage)

    def test_coverage_crosses_the_cascade_boundary_and_the_api(self):
        """MUTATION: drop it from _report_to_dict or from _serialize_report -> fails."""
        report = self.guardian.check(_clean_two_groups(), "t_test")
        self.assertEqual(
            AutonomousCascadeEngine()._report_to_dict(report)["assumption_coverage"], 0.75)


@override_settings(SECURE_SSL_REDIRECT=False)
class CoverageReachesTheSurfacesTests(TestCase):

    def test_the_guardian_endpoint_publishes_coverage(self):
        """MUTATION: remove it from views._serialize_report -> KeyError, fails."""
        payload = self.client.post(
            "/api/guardian/check/",
            data={"data": {"a": _clean_two_groups()[0], "b": _clean_two_groups()[1]},
                  "test_type": "independent_t", "alpha": 0.05},
            content_type="application/json").json()
        self.assertEqual(payload["assumption_coverage"], 0.75)
        self.assertEqual(payload["confidence_score"], 1.0)   # the contrast is the point

    def test_a_claim_verdict_carries_coverage(self):
        """A claim can be VERIFIED with assumptions "checked" and "satisfied" while a quarter
        of them were never examined. The verdict now says which quarter.

        MUTATION: stop passing assumption_coverage in reanalysis_engine, or drop "coverage"
        from ClaimVerdict.to_dict -> fails.
        """
        import numpy as np
        from scipy import stats

        from core.manuscript.claim_extractor import StatisticalClaimExtractor
        from core.manuscript.reanalysis_engine import verify_claim
        from core.manuscript.verdicts import ClaimDataSpec, ClaimVerificationRequest

        rng = np.random.default_rng(7)
        a, b = list(rng.normal(0, 1, 25)), list(rng.normal(0.6, 1, 25))
        t, p = stats.ttest_ind(a, b)
        paper = f"An independent-samples t-test, t(48) = {abs(t):.2f}, p = {p:.4f}."
        claim = StatisticalClaimExtractor().extract(paper, section="Results")[0]
        verdict = verify_claim(ClaimVerificationRequest(
            claim=claim,
            data_spec=ClaimDataSpec(intended_test="independent_t", design_type="two_group",
                                    groups=[a, b]),
            manuscript_text=paper, sentence=paper))
        assumptions = verdict.to_dict()["assumptions"]
        self.assertIs(assumptions["satisfied"], True)
        self.assertEqual(assumptions["coverage"], 0.75)
