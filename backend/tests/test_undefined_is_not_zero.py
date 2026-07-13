"""
Where the mathematics gives no number, the software must give no number.
=======================================================================

Every case below is a quantity that is genuinely undefined on the input -- a 0/0, a division
by an estimated standard error of zero, a test statistic with no null distribution. In each
case the code used to return a plausible-looking number instead: 0, or 1.0, or 0.5, or a
p-value floored into significance.

A fabricated 0 is worse than a crash, because a crash is visible.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from django.test import TestCase

from core.assumption_checker import AssumptionChecker
from core.guardian.effect_size_calculator import EffectSizeCalculator
from core.guardian.guardian_core import LinearityValidator
from core.meta_analysis import MetaAnalysisEngine, StudyData
from core.missing_data_handler import MissingDataHandler, MissingPattern


def _studies(effects, ses):
    return [
        StudyData(study_id=str(i), study_name=f"S{i}", effect_size=e, standard_error=s)
        for i, (e, s) in enumerate(zip(effects, ses))
    ]


class EggersTestDoesNotManufactureBias(TestCase):
    def setUp(self):
        self.engine = MetaAnalysisEngine()

    def test_a_perfect_funnel_regression_is_undefined_not_p_zero(self):
        # Three studies whose (1/SE, effect/SE) points are exactly collinear: the regression
        # fits them without residual, so the intercept's standard error is truly 0 and
        # t = intercept / 0 does not exist.
        #
        # The old code computed sqrt(max(var_intercept, 1e-10)), which FLOORED the standard
        # error at 1e-5. t became intercept * 100000, its p-value underflowed to ~0, and the
        # test announced "Strong evidence of publication bias (p < 0.01)" -- from three points
        # on a line, which contain no evidence about publication bias whatsoever.
        se = np.array([0.5, 0.25, 0.2])
        precision = 1.0 / se
        z = 2.0 + 3.0 * precision  # exactly on the line intercept=2, slope=3
        effects = z * se

        result = self.engine.eggers_test(_studies(effects.tolist(), se.tolist()))

        self.assertTrue(result["undefined"])
        self.assertIsNone(result["p_value"])
        self.assertIsNone(result["t_statistic"])
        self.assertNotIn("evidence of publication bias", result["interpretation"].lower())

    def test_two_studies_have_no_residual_degree_of_freedom(self):
        result = self.engine.eggers_test(_studies([0.3, -0.2], [0.1, 0.4]))
        self.assertTrue(result["undefined"])
        self.assertIsNone(result["p_value"])

    def test_a_real_asymmetric_funnel_still_reports_bias(self):
        # The guards must not blunt the test on data where it applies. This is the canonical
        # IV-magnesium pattern: small studies report large benefits, the large trial does not.
        rng = np.random.default_rng(0)
        se = np.array([0.6, 0.55, 0.5, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05])
        effects = -1.2 * se + rng.normal(0, 0.02, len(se))  # asymmetry by construction

        result = self.engine.eggers_test(_studies(effects.tolist(), se.tolist()))

        self.assertNotIn("undefined", result)
        self.assertIsNotNone(result["p_value"])
        self.assertLess(result["p_value"], 0.05)

    def test_few_studies_are_flagged_as_underpowered(self):
        # "No significant evidence of publication bias" from 5 studies is not evidence of no
        # bias, and the caller must be told which of the two they are looking at.
        result = self.engine.eggers_test(_studies([0.1, 0.2, 0.15, 0.05, 0.3], [0.1, 0.2, 0.15, 0.3, 0.25]))
        self.assertTrue(result["underpowered"])
        self.assertIn("power", result["power_note"].lower())


class BeggsTestIsBeggsTest(TestCase):
    def setUp(self):
        self.engine = MetaAnalysisEngine()

    def test_identical_effects_give_no_tau_not_a_clean_bill_of_health(self):
        # Every effect identical -> the standardized effects are constant -> Kendall's tau is
        # nan. `nan < 0.05` is False, so this used to fall straight through to
        # "No significant evidence of publication bias": a verdict from a statistic that does
        # not exist.
        result = self.engine.beggs_test(_studies([0.5] * 6, [0.1, 0.2, 0.3, 0.15, 0.25, 0.35]))
        self.assertIsNone(result["p_value"])
        self.assertIsNone(result["tau"])
        self.assertNotIn("no significant evidence", result["interpretation"].lower())

    def test_two_studies_are_rejected(self):
        result = self.engine.beggs_test(_studies([0.3, -0.2], [0.1, 0.4]))
        self.assertTrue(result["undefined"])

    def test_it_uses_the_inverse_variance_pooled_effect(self):
        # Begg & Mazumdar standardize by sqrt(v_i - v_pooled) about the INVERSE-VARIANCE
        # pooled effect. The old code used an unweighted mean and divided by sqrt(v_i) with no
        # v_pooled correction, so the tau it reported was not Begg's tau. Reproduce the
        # published definition here and require the code to match it.
        from scipy import stats as sp

        effects = [0.9, 0.6, 0.35, 0.2, 0.1, 0.05, 0.02, -0.05]
        ses = [0.5, 0.4, 0.3, 0.25, 0.2, 0.15, 0.1, 0.05]

        var = np.array(ses) ** 2
        weights = 1.0 / var
        theta_pooled = np.sum(weights * np.array(effects)) / np.sum(weights)
        v_pooled = 1.0 / np.sum(weights)
        standardized = (np.array(effects) - theta_pooled) / np.sqrt(var - v_pooled)
        expected_tau = sp.kendalltau(standardized, var)[0]

        result = self.engine.beggs_test(_studies(effects, ses))
        self.assertAlmostEqual(result["tau"], float(expected_tau), places=12)


class RunsTestDoesNotCallAFlatLineNonLinear(TestCase):
    def setUp(self):
        self.validator = LinearityValidator()

    def test_constant_residuals_have_no_runs(self):
        # A constant response fits a flat line exactly: every residual is 0, so every residual
        # equals its own median, so there are no signs to count runs in. The old code sent all
        # of them "below" the median, found n1 = 0, and returned p_value = 0.0 with
        # pattern_detected = True -- which the linearity validator escalates to a CRITICAL
        # violation. Guardian used to declare a perfectly straight line critically non-linear,
        # with a p-value of zero.
        result = self.validator._runs_test(np.zeros(30))

        self.assertIsNone(result["p_value"])
        self.assertIsNone(result["pattern_detected"])
        self.assertIn("median", result["reason"])

    def test_a_constant_response_is_not_a_critical_linearity_violation(self):
        x = np.arange(30, dtype=float)
        y = np.full(30, 7.0)

        result = self.validator.validate([x, y])

        self.assertFalse(result["violated"])

    def test_a_genuine_curve_is_still_caught(self):
        # The guards must not blunt the test where it applies: a strong quadratic leaves
        # residuals that cluster by sign, which is exactly what the runs test is for.
        x = np.linspace(-3, 3, 60)
        y = x**2

        result = self.validator.validate([x, y])

        self.assertTrue(result["violated"])
        self.assertEqual(result["severity"], "critical")


class EtaSquaredIsUndefinedWithoutVariance(TestCase):
    def test_identical_groups_have_no_effect_size(self):
        # SST = 0: every observation is the same number. eta^2 = SSB/SST = 0/0. It used to be
        # reported as 0, which renders as "Negligible effect, 0.0% of variance explained" -- a
        # measured finding of no effect from data that cannot show an effect either way.
        calc = EffectSizeCalculator()
        result = calc.calculate_eta_squared([np.array([5.0] * 6), np.array([5.0] * 6)])

        self.assertIsNone(result["value"])
        self.assertEqual(result["magnitude"], "undefined")
        self.assertNotIn("negligible", result["interpretation"].lower())

    def test_a_real_difference_still_gets_an_eta_squared(self):
        calc = EffectSizeCalculator()
        result = calc.calculate_eta_squared([np.array([1.0, 2, 3, 2, 1]), np.array([8.0, 9, 10, 9, 8])])

        self.assertIsNotNone(result["value"])
        self.assertGreater(result["value"], 0.5)


class MCARIsAClaimNotADefault(TestCase):
    def test_no_assessable_association_means_undetermined_not_mcar(self):
        # One column, so there is no second variable to associate missingness against and not
        # a single correlation can be computed. The old code returned MCAR with a confidence of
        # 0.5 -- converting an absence of any computation into the strongest of the three
        # mechanisms, the one that licenses listwise deletion and mean imputation.
        handler = MissingDataHandler()
        frame = pd.DataFrame({"x": [1.0, 2.0, np.nan, 4.0, np.nan, 6.0]})

        analysis = handler.analyze_missing_data(frame)

        self.assertEqual(analysis.missing_pattern, MissingPattern.UNDETERMINED)
        self.assertIsNone(analysis.pattern_confidence)

    def test_an_undetermined_mechanism_does_not_select_mean_imputation(self):
        # This is why the fabrication mattered: the mechanism feeds straight into the choice of
        # imputation, and MCAR is what selects "mean" -- the method that biases every estimate
        # if the data are not in fact MCAR.
        handler = MissingDataHandler()
        strategy = handler._determine_strategy_for_test(
            "regression", MissingPattern.UNDETERMINED, __import__("decimal").Decimal("10")
        )
        self.assertEqual(strategy, "mice")
        self.assertNotEqual(strategy, "mean")


class AssumptionConfidenceIsNotInvented(TestCase):
    def setUp(self):
        self.checker = AssumptionChecker()

    def test_a_single_test_reports_no_corroboration(self):
        # `confidence = 0.8 if avg_p_value else 0.6`. Neither number came from anywhere. And
        # because a p-value of exactly 0.0 is falsy in Python, the most decisive rejection of
        # normality possible was the one branded LEAST confident.
        result = self.checker.check_normality(np.random.default_rng(1).normal(size=40))
        self.assertIsNone(result.confidence)
        self.assertIsNone(result.to_dict()["confidence"])

    def test_combined_reports_a_real_test_not_the_mean_of_p_values(self):
        # The combined method used to report `np.mean(p_values)` in the `p_value` field. The
        # arithmetic mean of a Shapiro-Wilk p, a D'Agostino p and a Jarque-Bera p is not a
        # p-value: it has no null distribution and comparing it to 0.05 controls nothing. It
        # must now be one named test's own p-value, with the rest kept as corroboration.
        from scipy import stats as sp

        data = np.random.default_rng(2).normal(size=60)
        result = self.checker.check_normality(data, method="combined")

        shapiro_p = float(sp.shapiro(data).pvalue)
        self.assertAlmostEqual(result.p_value, shapiro_p, places=10)
        self.assertIn("shapiro", result.test_name)

        # ...and confidence is now a defined quantity: agreement among the tests that ran.
        self.assertIsNotNone(result.confidence)
        self.assertGreaterEqual(result.confidence, 0.0)
        self.assertLessEqual(result.confidence, 1.0)

    def test_an_unknown_method_raises_instead_of_asserting_non_normality(self):
        # The fall-through used to set is_normal = False: a verdict of non-normality from a
        # test that was never run.
        with self.assertRaises(ValueError):
            self.checker.check_normality(np.random.default_rng(3).normal(size=30), method="shapiroo")

        with self.assertRaises(ValueError):
            self.checker.check_homoscedasticity(
                np.array([1.0, 2, 3, 4]), np.array([2.0, 3, 4, 5]), method="levine"
            )


class TheDeadFabricatingRegressionServiceIsGone(TestCase):
    def test_it_cannot_be_imported(self):
        # core/services/regression/ was an unused parallel implementation of regression that
        # reported f_statistic = 0 / f_p_value = 1.0 for a PERFECT fit (a perfect fit is the
        # most significant model possible, not the least), r_squared = 0 for a constant
        # response, and z = 0 / p = 1.0 from its runs test. Nothing imported it. Dead code that
        # fabricates statistics is a landmine for whoever wires it up next; the live path is
        # core/hp_regression_comprehensive.py.
        with self.assertRaises(ImportError):
            from core.services.regression.linear_regression_service import (  # noqa: F401
                LinearRegressionService,
            )
