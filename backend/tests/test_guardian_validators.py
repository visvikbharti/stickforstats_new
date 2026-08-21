"""
Tests for Guardian Statistical Protection System validators.
Tests: NormalityValidator, VarianceHomogeneityValidator, IndependenceValidator,
OutlierDetector, SampleSizeValidator, ModalityDetector, LinearityValidator,
HomoscedasticityValidator, GuardianCore integration, confidence scoring.
"""

import numpy as np
from django.test import TestCase

from core.guardian.guardian_core import (
    GuardianCore,
    NormalityValidator,
    VarianceHomogeneityValidator,
    IndependenceValidator,
    OutlierDetector,
    SampleSizeValidator,
    ModalityDetector,
    LinearityValidator,
    HomoscedasticityValidator,
    SEVERITY_WEIGHTS,
    AssumptionViolation,
    UnknownTestTypeError,
)


class NormalityValidatorTests(TestCase):
    """Test the NormalityValidator."""

    def setUp(self):
        self.validator = NormalityValidator()
        np.random.seed(42)

    def test_normal_data_passes(self):
        data = [np.random.normal(0, 1, 100)]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])

    def test_skewed_data_fails(self):
        data = [np.random.exponential(1, 200)]
        result = self.validator.validate(data, alpha=0.05)
        self.assertTrue(result["violated"])
        self.assertIn("Normality", result["message"])

    def test_small_sample_critical(self):
        """Samples with n < 3 should be flagged as critical."""
        data = [np.array([1.0, 2.0])]
        result = self.validator.validate(data)
        self.assertTrue(result["violated"])
        self.assertEqual(result["severity"], "critical")

    def test_multiple_groups(self):
        """If one group is non-normal, the result should be violated."""
        normal_group = np.random.normal(0, 1, 100)
        skewed_group = np.random.exponential(1, 200)
        result = self.validator.validate([normal_group, skewed_group])
        self.assertTrue(result["violated"])

    def test_visual_data_returned_on_violation(self):
        data = [np.random.exponential(1, 200)]
        result = self.validator.validate(data)
        if result["violated"]:
            self.assertIn("visual_data", result)

    def test_large_sample_uses_anderson_darling(self):
        """Samples > 5000 should use Anderson-Darling test."""
        data = [np.random.normal(0, 1, 6000)]
        result = self.validator.validate(data)
        # Should not error out; just verify it runs
        self.assertIn("violated", result)


class VarianceHomogeneityValidatorTests(TestCase):
    """Test the VarianceHomogeneityValidator."""

    def setUp(self):
        self.validator = VarianceHomogeneityValidator()
        np.random.seed(42)

    def test_equal_variances_pass(self):
        data = [np.random.normal(0, 1, 100), np.random.normal(0, 1, 100)]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])

    def test_unequal_variances_fail(self):
        data = [np.random.normal(0, 1, 100), np.random.normal(0, 5, 100)]
        result = self.validator.validate(data)
        self.assertTrue(result["violated"])
        self.assertEqual(result["test_name"], "Levene's Test")

    def test_single_group_not_applicable(self):
        """Single group should return not violated (cannot check)."""
        data = [np.random.normal(0, 1, 100)]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])

    def test_critical_severity_for_large_ratio(self):
        """Variance ratio > 4 should be critical."""
        data = [np.random.normal(0, 1, 100), np.random.normal(0, 10, 100)]
        result = self.validator.validate(data)
        if result["violated"]:
            self.assertEqual(result["severity"], "critical")

    def test_levene_p_value_present(self):
        data = [np.random.normal(0, 1, 100), np.random.normal(0, 3, 100)]
        result = self.validator.validate(data)
        self.assertIn("p_value", result)


class IndependenceValidatorTests(TestCase):
    """Test the IndependenceValidator."""

    def setUp(self):
        self.validator = IndependenceValidator()
        np.random.seed(42)

    def test_independent_data_passes(self):
        data = [np.random.normal(0, 1, 100)]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])

    def test_autocorrelated_data_fails(self):
        """Strongly autocorrelated data (AR(1) process) should be flagged.

        Updated 2026-05-06: the validator was renamed from "Durbin-Watson"
        (which it never actually was) to "Lag-1 Autocorrelation"; the
        violation message now reports the lag-1 r and p-value rather
        than a generic "autocorr=" string. See
        docs/CRITICAL_REVIEW_2026-05-06.md §P1-8.
        """
        n = 200
        ar_data = np.zeros(n)
        ar_data[0] = np.random.normal()
        for i in range(1, n):
            ar_data[i] = 0.8 * ar_data[i - 1] + np.random.normal(0, 0.5)
        result = self.validator.validate([ar_data])
        self.assertTrue(result["violated"])
        # Message includes the lag-1 r value and the new label.
        self.assertIn("lag-1", result["message"].lower())
        self.assertIn("Lag-1 Autocorrelation", result["test_name"])
        # The validator now reports a real p-value (was None before).
        self.assertIsNotNone(result.get("p_value"))
        self.assertLess(result["p_value"], 0.05)

    def test_small_sample_skipped(self):
        """Samples < 10 should be skipped (not enough data for autocorrelation)."""
        data = [np.array([1.0, 2.0, 3.0, 4.0, 5.0])]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])

    def test_critical_severity_for_strong_autocorrelation(self):
        """Autocorrelation > 0.5 should be critical."""
        n = 200
        ar_data = np.zeros(n)
        ar_data[0] = np.random.normal()
        for i in range(1, n):
            ar_data[i] = 0.9 * ar_data[i - 1] + np.random.normal(0, 0.2)
        result = self.validator.validate([ar_data])
        if result["violated"]:
            self.assertEqual(result["severity"], "critical")

    def _ar1(self, n=200, rho=0.8, sd=0.5):
        ar = np.zeros(n)
        ar[0] = np.random.normal()
        for i in range(1, n):
            ar[i] = rho * ar[i - 1] + np.random.normal(0, sd)
        return ar

    def test_gated_off_when_declared_non_sequential(self):
        """sequential_order=False -> not-applicable, never a violation, even on
        strongly autocorrelated data (the arrangement is declared meaningless)."""
        ar_data = self._ar1()
        result = self.validator.validate([ar_data], sequential_order=False)
        self.assertFalse(result["violated"])
        self.assertTrue(result.get("not_applicable"))
        self.assertIn("study design", result["message"].lower())
        self.assertEqual(result["test_name"], "Independence (study design)")

    def test_runs_when_sequential_declared(self):
        """sequential_order=True runs the lag-1 test; AR(1) data is flagged."""
        ar_data = self._ar1()
        result = self.validator.validate([ar_data], sequential_order=True)
        self.assertTrue(result["violated"])
        self.assertIn("lag-1", result["message"].lower())

    def test_default_none_preserves_lag1_behaviour(self):
        """No flag (order unspecified) preserves the original lag-1 behaviour,
        so existing direct callers/tests are unaffected."""
        ar_data = self._ar1()
        result = self.validator.validate([ar_data])
        self.assertTrue(result["violated"])


class OutlierDetectorTests(TestCase):
    """Test the OutlierDetector."""

    def setUp(self):
        self.validator = OutlierDetector()
        np.random.seed(42)

    def test_clean_data_passes(self):
        data = [np.random.normal(0, 1, 100)]
        result = self.validator.validate(data)
        # With 100 normal data points, there may be a few outliers by IQR/Z,
        # but the key is it doesn't crash and returns a valid result
        self.assertIn("violated", result)

    def test_data_with_outliers_detected(self):
        """Insert extreme outliers and verify detection."""
        data = np.random.normal(0, 1, 100)
        data = np.append(data, [100, -100, 200, -200, 150])  # Add extreme outliers
        result = self.validator.validate([data])
        self.assertTrue(result["violated"])
        self.assertIn("outliers", result["message"])

    def test_outlier_percentage_in_message(self):
        """Many diverse extreme outliers should be detected as critical (>10%)."""
        data = np.random.normal(0, 1, 80)
        # Add 12 diverse extreme outliers at different magnitudes
        outliers = [50, -50, 100, -100, 75, -75, 60, -60, 80, -80, 90, -90]
        data = np.append(data, outliers)
        result = self.validator.validate([data])
        self.assertTrue(result["violated"])
        # With ~13% outliers the severity should be critical (>10%)
        self.assertEqual(result["severity"], "critical")

    def test_visual_data_with_outliers(self):
        data = np.random.normal(0, 1, 100)
        data = np.append(data, [50, -50])
        result = self.validator.validate([data])
        if result["violated"]:
            self.assertIn("visual_data", result)
            self.assertIn("outliers", result["visual_data"])


class SampleSizeValidatorTests(TestCase):
    """Test the SampleSizeValidator."""

    def setUp(self):
        self.validator = SampleSizeValidator()

    def test_adequate_sample_passes(self):
        data = [np.random.normal(0, 1, 50)]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])

    def test_tiny_sample_critical(self):
        """n < 3 should be a critical violation."""
        data = [np.array([1.0, 2.0])]
        result = self.validator.validate(data)
        self.assertTrue(result["violated"])
        self.assertEqual(result["severity"], "critical")

    def test_small_sample_warning(self):
        """3 <= n < 20 should be a warning."""
        data = [np.random.normal(0, 1, 10)]
        result = self.validator.validate(data)
        self.assertTrue(result["violated"])
        self.assertEqual(result["severity"], "warning")

    def test_multiple_groups_uses_min(self):
        """The smallest group determines the violation."""
        data = [np.random.normal(0, 1, 100), np.array([1.0, 2.0])]
        result = self.validator.validate(data)
        self.assertTrue(result["violated"])
        self.assertEqual(result["severity"], "critical")


class ModalityDetectorTests(TestCase):
    """Test the ModalityDetector."""

    def setUp(self):
        self.validator = ModalityDetector()
        np.random.seed(42)

    def test_unimodal_data_passes(self):
        data = [np.random.normal(0, 1, 200)]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])

    def test_bimodal_data_detected(self):
        """A mixture of two well-separated normals should be flagged."""
        group1 = np.random.normal(-5, 0.5, 200)
        group2 = np.random.normal(5, 0.5, 200)
        bimodal = np.concatenate([group1, group2])
        result = self.validator.validate([bimodal])
        self.assertTrue(result["violated"])
        self.assertIn("multimodal", result["message"])

    def test_small_sample_skipped(self):
        """Samples < 20 should be skipped."""
        data = [np.random.normal(0, 1, 10)]
        result = self.validator.validate(data)
        self.assertFalse(result["violated"])


class LinearityValidatorTests(TestCase):
    """Test the LinearityValidator."""

    def setUp(self):
        self.validator = LinearityValidator()
        np.random.seed(42)

    def test_linear_data_passes(self):
        x = np.linspace(0, 10, 50)
        y = 2 * x + 1 + np.random.normal(0, 0.5, 50)
        result = self.validator.validate([x, y])
        self.assertFalse(result["violated"])

    def test_nonlinear_data_fails(self):
        """Strongly quadratic data should be flagged."""
        x = np.linspace(-5, 5, 100)
        y = x**2 + np.random.normal(0, 0.5, 100)
        result = self.validator.validate([x, y])
        self.assertTrue(result["violated"])

    def test_single_array_not_applicable(self):
        """Linearity check needs exactly 2 arrays."""
        result = self.validator.validate([np.random.normal(0, 1, 50)])
        self.assertFalse(result["violated"])

    def test_too_few_points_critical(self):
        """n < 3 should be critical."""
        x = np.array([1.0, 2.0])
        y = np.array([3.0, 4.0])
        result = self.validator.validate([x, y])
        self.assertTrue(result["violated"])
        self.assertEqual(result["severity"], "critical")


class HomoscedasticityValidatorTests(TestCase):
    """Test the HomoscedasticityValidator."""

    def setUp(self):
        self.validator = HomoscedasticityValidator()
        np.random.seed(42)

    def test_constant_variance_passes(self):
        x = np.linspace(0, 10, 100)
        y = 2 * x + 1 + np.random.normal(0, 1, 100)
        result = self.validator.validate([x, y])
        self.assertFalse(result["violated"])

    def test_heteroscedastic_data_fails(self):
        """Variance that increases with x should be flagged."""
        x = np.linspace(1, 10, 200)
        y = 2 * x + np.random.normal(0, 1, 200) * x  # variance grows with x
        result = self.validator.validate([x, y])
        self.assertTrue(result["violated"])
        self.assertEqual(result["test_name"], "Breusch-Pagan Test")

    def test_single_array_not_applicable(self):
        result = self.validator.validate([np.random.normal(0, 1, 50)])
        self.assertFalse(result["violated"])

    def test_small_sample_skipped(self):
        """n < 10 should be skipped."""
        x = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        y = np.array([2.0, 4.0, 6.0, 8.0, 10.0])
        result = self.validator.validate([x, y])
        self.assertFalse(result["violated"])


class GuardianCoreIntegrationTests(TestCase):
    """Test the GuardianCore.check() pipeline end-to-end."""

    def setUp(self):
        self.guardian = GuardianCore()
        np.random.seed(42)

    def test_t_test_clean_data(self):
        """Clean normal data should produce can_proceed=True."""
        data = {
            "group1": np.random.normal(0, 1, 50).tolist(),
            "group2": np.random.normal(0, 1, 50).tolist(),
        }
        report = self.guardian.check(data, "t_test")
        self.assertEqual(report.test_type, "t_test")
        self.assertIsInstance(report.confidence_score, float)
        self.assertGreater(report.confidence_score, 0)
        self.assertLessEqual(report.confidence_score, 1.0)
        self.assertIn("normality", report.assumptions_checked)
        self.assertIn("variance_homogeneity", report.assumptions_checked)

    def test_t_test_non_normal_data(self):
        """Highly skewed data should produce violations."""
        data = {
            "group1": np.random.exponential(1, 100).tolist(),
            "group2": np.random.exponential(1, 100).tolist(),
        }
        report = self.guardian.check(data, "t_test")
        self.assertGreater(len(report.violations), 0)
        violated_assumptions = {v.assumption for v in report.violations}
        self.assertIn("normality", violated_assumptions)

    def test_alternatives_suggested_for_violations(self):
        """When normality is violated for t_test, non-parametric alternatives should be suggested."""
        data = {
            "group1": np.random.exponential(1, 100).tolist(),
            "group2": np.random.exponential(1, 100).tolist(),
        }
        report = self.guardian.check(data, "t_test")
        if report.violations:
            self.assertGreater(len(report.alternative_tests), 0)

    def test_data_summary_present(self):
        data = [np.random.normal(5, 2, 50).tolist()]
        report = self.guardian.check(data, "pearson")
        self.assertIn("data", report.data_summary)
        summary = report.data_summary["data"]
        self.assertIn("n", summary)
        self.assertIn("mean", summary)
        self.assertIn("std", summary)

    def test_unknown_test_type_refuses_to_report(self):
        """An unrecognised test type must RAISE, not return a clean report.

        This test previously asserted the opposite -- that an unknown test type
        "should not cause an error, just skip checks", and that the resulting
        report carried confidence_score == 1.0. That was the bug, written down
        as if it were the specification: a caller who misspelled a test type
        received zero assumptions_checked, zero violations and full confidence,
        which is indistinguishable from "every assumption was verified and all
        of them held". Guardian's entire purpose is to prevent exactly that
        conclusion from being reached without evidence, so it now refuses.
        """
        data = [np.random.normal(0, 1, 50).tolist()]
        with self.assertRaises(UnknownTestTypeError) as ctx:
            self.guardian.check(data, "unknown_test")
        # The message must be actionable: name the offending value and enumerate
        # what would have been accepted, or the caller cannot fix their call.
        message = str(ctx.exception)
        self.assertIn("unknown_test", message)
        self.assertIn("t_test", message)

    def test_known_aliases_still_resolve_and_check(self):
        """The refusal above must not swallow legitimate synonyms.

        Guarding against the obvious over-correction: if canonicalisation were
        too strict, real callers using ordinary spellings would start raising,
        and the natural "fix" would be to re-widen the net until the defect
        came back. Each of these must resolve to a real requirement set and
        actually run checks.
        """
        data = {"group1": np.random.normal(0, 1, 40).tolist(),
                "group2": np.random.normal(0, 1, 40).tolist()}
        for alias in ("welch_t", "students_t", "mann_whitney_u", "oneway_anova"):
            with self.subTest(alias=alias):
                report = self.guardian.check(data, alias)
                self.assertGreater(
                    len(report.assumptions_checked), 0,
                    f"alias {alias!r} resolved to zero assumption checks",
                )

    def _ar1_groups(self):
        """Two strongly autocorrelated (AR(1)) groups -- lag-1 would flag them
        if run, so they isolate the independence-gate behaviour."""
        def ar1(n=200, rho=0.85, sd=0.4):
            ar = np.zeros(n)
            ar[0] = np.random.normal()
            for i in range(1, n):
                ar[i] = rho * ar[i - 1] + np.random.normal(0, sd)
            return ar.tolist()
        return {"group1": ar1(), "group2": ar1()}

    def test_independence_referred_to_study_design_by_default(self):
        """Without an observation_order declaration, the independence check is
        referred to study design and never contributes a violation, even for
        strongly autocorrelated data (which would flag if lag-1 ran)."""
        data = self._ar1_groups()
        report = self.guardian.check(data, "t_test")
        # "Referred to study design" means NOT EXAMINED, so it belongs in the not-evaluated
        # list. This assertion used to read `assertIn("independence", assumptions_checked)`,
        # directly contradicting the audit-trail assertion four lines below, which this same
        # test has always made: result == "not_applicable". The test recorded the contradiction
        # without noticing it -- the trail knew the truth while the label said otherwise.
        self.assertNotIn("independence", report.assumptions_checked)
        self.assertIn("independence", report.assumptions_not_evaluated)
        violated = {v.assumption for v in report.violations}
        self.assertNotIn("independence", violated)
        # audit trail records it as not_applicable rather than pass/violation
        indep = [e for e in report.audit_trail if e.assumption == "independence"]
        self.assertTrue(indep)
        self.assertEqual(indep[0].result, "not_applicable")

    def test_independence_checked_when_sequential_declared(self):
        """Declaring observation_order='sequential' re-enables the lag-1 check,
        which flags the autocorrelated data."""
        data = self._ar1_groups()
        report = self.guardian.check(data, "t_test", observation_order="sequential")
        violated = {v.assumption for v in report.violations}
        self.assertIn("independence", violated)


class ConfidenceScoreTests(TestCase):
    """Test the confidence score calculation formula."""

    def setUp(self):
        self.guardian = GuardianCore()

    def test_no_violations_gives_perfect_score(self):
        score = self.guardian._calculate_confidence([])
        self.assertEqual(score, 1.0)

    def test_single_critical_violation(self):
        violations = [
            AssumptionViolation(
                assumption="normality",
                test_name="Shapiro-Wilk",
                severity="critical",
                p_value=0.001,
                statistic=0.8,
                message="test",
                recommendation="test",
            )
        ]
        score = self.guardian._calculate_confidence(violations)
        # Formula: max(0, 1 - 3.0 / (1 * 3.0 * 1.2)) = max(0, 1 - 3.0/3.6) ≈ 0.167
        expected = round(max(0, 1 - 3.0 / (1 * 3.0 * 1.2)), 3)
        self.assertAlmostEqual(score, expected, places=3)

    def test_single_warning_violation(self):
        violations = [
            AssumptionViolation(
                assumption="normality",
                test_name="Shapiro-Wilk",
                severity="warning",
                p_value=0.03,
                statistic=0.9,
                message="test",
                recommendation="test",
            )
        ]
        score = self.guardian._calculate_confidence(violations)
        # Formula: max(0, 1 - 2.0 / (1 * 3.0 * 1.2)) = max(0, 1 - 2.0/3.6) ≈ 0.444
        expected = round(max(0, 1 - 2.0 / (1 * 3.0 * 1.2)), 3)
        self.assertAlmostEqual(score, expected, places=3)

    def test_single_minor_violation(self):
        violations = [
            AssumptionViolation(
                assumption="outliers",
                test_name="Outlier Detection",
                severity="minor",
                p_value=None,
                statistic=None,
                message="test",
                recommendation="test",
            )
        ]
        score = self.guardian._calculate_confidence(violations)
        # Formula: max(0, 1 - 1.0 / (1 * 3.0 * 1.2)) = max(0, 1 - 1.0/3.6) ≈ 0.722
        expected = round(max(0, 1 - 1.0 / (1 * 3.0 * 1.2)), 3)
        self.assertAlmostEqual(score, expected, places=3)

    def test_multiple_violations_lower_score(self):
        """Adding a critical violation to a minor one should produce a lower score."""
        one_violation = [
            AssumptionViolation(
                assumption="normality",
                test_name="t",
                severity="minor",
                p_value=0.03,
                statistic=0.9,
                message="t",
                recommendation="t",
            )
        ]
        two_violations = one_violation + [
            AssumptionViolation(
                assumption="outliers",
                test_name="t",
                severity="critical",
                p_value=None,
                statistic=None,
                message="t",
                recommendation="t",
            )
        ]
        score_one = self.guardian._calculate_confidence(one_violation)
        score_two = self.guardian._calculate_confidence(two_violations)
        self.assertGreater(score_one, score_two)

    def test_score_never_negative(self):
        """Even with many critical violations, score should be >= 0."""
        violations = [
            AssumptionViolation(
                assumption=f"test_{i}",
                test_name="t",
                severity="critical",
                p_value=0.001,
                statistic=0.5,
                message="t",
                recommendation="t",
            )
            for i in range(10)
        ]
        score = self.guardian._calculate_confidence(violations)
        self.assertGreaterEqual(score, 0.0)

    def test_severity_weights_are_correct(self):
        """Verify the SEVERITY_WEIGHTS constants."""
        self.assertEqual(SEVERITY_WEIGHTS["critical"], 3.0)
        self.assertEqual(SEVERITY_WEIGHTS["warning"], 2.0)
        self.assertEqual(SEVERITY_WEIGHTS["minor"], 1.0)


class ConfidenceScoreMeasuresSeverityNotCountTests(TestCase):
    """The documented property of the score, which nothing pinned.

    ``_calculate_confidence`` divides the total penalty by
    ``len(violations) * 3.0``, so BOTH numerator and denominator scale with the
    count. The score therefore reports AVERAGE severity, not how much is wrong:
    one critical violation and five critical violations both give 0.167. That is
    a deliberate design choice stated in the method's own docstring, and it is a
    headline number -- it appears in Guardian reports, in the API response and
    in the manuscript's case studies.

    It had no test. Mutating the denominator from ``len(violations) * 3.0`` to
    ``1 * 3.0`` -- which makes the score count-sensitive, so two minor
    violations fall from 0.722 to 0.444 and three criticals to 0.0 -- left all
    98 tests across the three Guardian test modules passing. The existing
    ConfidenceScoreTests only ever build single-violation lists, where the
    mutation is a no-op, and the one multi-violation test asserts only an
    ordering that survives it.
    """

    def setUp(self):
        self.guardian = GuardianCore()

    def _v(self, severity):
        return AssumptionViolation(
            assumption="normality",
            test_name="Shapiro-Wilk",
            severity=severity,
            p_value=0.001,
            statistic=0.5,
            message="m",
            recommendation="r",
        )

    def test_score_is_invariant_to_the_number_of_violations(self):
        for severity in ("critical", "warning", "minor"):
            one = self.guardian._calculate_confidence([self._v(severity)])
            for n in (2, 3, 5, 20):
                many = self.guardian._calculate_confidence([self._v(severity)] * n)
                with self.subTest(severity=severity, n=n):
                    self.assertAlmostEqual(
                        one, many, places=9,
                        msg=f"{n} {severity} violations scored {many} but one scored "
                            f"{one}; the score has become count-sensitive, so it no "
                            f"longer means what its docstring and the manuscript say",
                    )

    def test_the_three_attainable_uniform_values_are_what_is_documented(self):
        """Hand-computed from the formula, not copied from a document.

        confidence = 1 - total/(len*3.0*1.2). For a uniform set the count
        cancels, leaving 1 - w/3.6: critical 1 - 3/3.6 = 0.167, warning
        1 - 2/3.6 = 0.444, minor 1 - 1/3.6 = 0.722. The implementation rounds
        the result to three decimals, so the assertion matches that rounding
        rather than the unrounded quotient -- this test was written against the
        unrounded value first and failed, which is how the rounding was found.
        """
        for severity, weight in (("critical", 3.0), ("warning", 2.0), ("minor", 1.0)):
            expected = round(1 - weight / 3.6, 3)
            got = self.guardian._calculate_confidence([self._v(severity)] * 3)
            with self.subTest(severity=severity):
                self.assertAlmostEqual(got, expected, places=6)
                # And the rounding is to exactly 3 decimals, not more.
                self.assertEqual(got, round(got, 3))

    def test_a_mixed_set_averages_the_severities(self):
        # [minor, critical]: total 4.0, denominator 2 * 3.0 * 1.2 = 7.2
        got = self.guardian._calculate_confidence([self._v("minor"), self._v("critical")])
        self.assertAlmostEqual(got, round(1 - 4.0 / 7.2, 3), places=6)
        # Which must sit between the all-minor and all-critical values.
        self.assertGreater(got, self.guardian._calculate_confidence([self._v("critical")]))
        self.assertLess(got, self.guardian._calculate_confidence([self._v("minor")]))

    def test_no_violations_is_the_only_way_to_score_one(self):
        self.assertEqual(self.guardian._calculate_confidence([]), 1.0)
        for severity in ("critical", "warning", "minor"):
            self.assertLess(self.guardian._calculate_confidence([self._v(severity)]), 1.0)
