"""
Anti-fabrication contract.
==========================

One rule, tested from several angles: when a quantity is mathematically undefined, the app
reports that it is undefined. It does not substitute a plausible-looking number.

This exists because the codebase kept doing exactly that, in several places and by several
different hands (including this one):

  * a two-sample t-test on two identical constant groups returned t = 0, p = 1.0 -- a
    confident "no significant difference" verdict on data that cannot support any verdict,
    because t = 0/0 there;
  * robust, ridge, lasso, polynomial and logistic fits all reported F = 0, p = 1 for an
    F-test that was never computed and does not apply to them;
  * a singular design matrix produced standard errors of exactly 1.0, so every t-statistic
    silently became "the coefficient" and a p-value was computed from it;
  * a zero standard error was floored to 1e-12, which turns |t| into ~1e12 and reports a
    degenerate fit as overwhelmingly significant;
  * an exactly-fitting model floored its MSE at 1e-300 to keep log(MSE) finite, yielding a
    large, finite, entirely fictional AIC/BIC;
  * a p-value below float64's range was returned as an exact 0.

A number on the screen is a claim. None of these were claims the mathematics supported.
"""

from __future__ import annotations

from decimal import Decimal

import numpy as np
from django.test import SimpleTestCase
from scipy import stats

from core.high_precision_calculator import HighPrecisionCalculator
from core.hp_regression_comprehensive import HighPrecisionRegression
from core.multiplicity import MultiplicityCorrector, CorrectionMethod


class UndefinedTStatisticIsNone(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionCalculator()

    def test_identical_constant_groups(self):
        # t = (0 mean difference) / (0 standard error). scipy returns nan for both.
        result = self.calc.t_statistic_two_sample([5, 5, 5], [5, 5, 5])
        self.assertIsNone(result["t_statistic"])
        self.assertIsNone(result["p_value"])

        scipy_t, scipy_p = stats.ttest_ind([5, 5, 5], [5, 5, 5])
        self.assertTrue(np.isnan(scipy_t) and np.isnan(scipy_p))

    def test_zero_variance_with_a_real_difference(self):
        result = self.calc.t_statistic_two_sample([5, 5, 5], [8, 8, 8])
        self.assertIsNone(result["t_statistic"])
        self.assertIsNone(result["p_value"])


class PValuesKeepTheirDigits(SimpleTestCase):
    """A 50-decimal tool must not collapse a tiny p-value to 0 via float64."""

    def setUp(self):
        self.calc = HighPrecisionCalculator()

    def test_extreme_t_gives_a_real_nonzero_p(self):
        # float64 cannot even hold t**2 here; the old code caught the OverflowError and
        # returned a hand-picked 0 or 1.
        p = self.calc.t_p_value(Decimal("1e200"), 10)
        self.assertGreater(p, 0)
        self.assertLess(p, Decimal("1e-1000"))

    def test_agrees_with_scipy_where_scipy_can_be_trusted(self):
        for t, df, alt in [(-3, 10, "less"), (2.5, 7, "greater"), (1.9, 25, "two-sided")]:
            with self.subTest(t=t, df=df, alternative=alt):
                mine = float(self.calc.t_p_value(Decimal(str(t)), df, alt))
                if alt == "two-sided":
                    theirs = 2 * stats.t.sf(abs(t), df)
                elif alt == "greater":
                    theirs = stats.t.sf(t, df)
                else:
                    theirs = stats.t.cdf(t, df)
                self.assertAlmostEqual(mine, theirs, places=12)

    def test_fifty_digits_are_real_digits(self):
        # The exact t for these two groups, computed independently in Decimal at 60 digits:
        # -9.859006035092990042225456090414438411149404509963...
        # The old float64 round-trip diverged from it at the 17th digit and then printed 33
        # more, all of them round-off.
        result = self.calc.t_statistic_two_sample([1, 2, 3, 4], [10, 11, 12, 13])
        exact = Decimal("-9.859006035092990042225456090414438411149404509963")
        self.assertLess(abs(result["t_statistic"] - exact), Decimal("1e-45"))


class UndefinedCorrelationQuantities(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionCalculator()

    def test_three_points_have_no_fisher_interval(self):
        # se_z = 1/sqrt(n - 3) divides by zero at n = 3. This used to 500 the endpoint.
        result = self.calc.correlation_pearson([1, 2, 3], [2, 4, 7])
        self.assertIsNone(result["ci_lower"])
        self.assertIsNone(result["ci_upper"])
        self.assertIn("undefined", result["ci_note"].lower())
        self.assertIsNotNone(result["correlation"])

    def test_matches_scipy(self):
        x, y = [1, 2, 3, 4, 5], [2, 4, 5, 4, 5]
        result = self.calc.correlation_pearson(x, y)
        reference = stats.pearsonr(x, y)
        self.assertAlmostEqual(float(result["correlation"]), float(reference.statistic), places=12)
        self.assertAlmostEqual(float(result["p_value"]), float(reference.pvalue), places=12)
        low, high = reference.confidence_interval()
        self.assertAlmostEqual(float(result["ci_lower"]), float(low), places=12)
        self.assertAlmostEqual(float(result["ci_upper"]), float(high), places=12)


class RegressionReportsNoFTestRatherThanFEqualsZero(SimpleTestCase):
    def setUp(self):
        self.hp = HighPrecisionRegression(precision=30)
        self.X = np.array([[1.0], [2.0], [3.0], [4.0], [5.0], [6.0]])
        self.y = np.array([2.1, 3.9, 6.2, 7.8, 10.1, 12.2])

    def test_fits_without_an_f_test_say_so(self):
        fits = {
            "robust": lambda: self.hp.robust_regression(self.X, self.y),
            "quantile": lambda: self.hp.quantile_regression(self.X, self.y, quantile=0.5),
            "ridge": lambda: self.hp.ridge_regression(self.X, self.y, alpha=1.0),
            "lasso": lambda: self.hp.lasso_regression(self.X, self.y, alpha=0.1),
        }
        for name, fit in fits.items():
            with self.subTest(regression=name):
                result = fit()
                # F = 0, p = 1 would read as "the model explains nothing, and that is
                # certain" -- the exact opposite of these (well-fitting) models' story.
                self.assertIsNone(result.f_statistic)
                self.assertIsNone(result.f_p_value)

    def test_exact_fit_warns_that_its_uncertainty_is_round_off(self):
        exact_y = np.array([2.0, 4.0, 6.0, 8.0, 10.0, 12.0])
        result = self.hp.robust_regression(self.X, exact_y)
        # The coefficients are real and are still reported...
        self.assertIsNotNone(result.coefficients["X1"])
        # ...but the fit is numerically exact, and the user is told that the uncertainty
        # figures below it are round-off rather than sampling variability.
        self.assertTrue(any("round-off" in w for w in result.warnings))

    def test_ransac_reports_no_inference_at_all(self):
        # RANSAC chooses which observations to keep, so the surviving inliers are not a
        # sample from which its own uncertainty can be estimated. Computing standard errors
        # from them anyway (which this code did) rejects a true null ~2/3 of the time.
        result = self.hp.robust_regression(self.X, self.y, method="ransac")
        self.assertIsNotNone(result.coefficients["X1"])  # the fit itself is real
        self.assertIsNone(result.p_values["X1"])
        self.assertIsNone(result.standard_errors["X1"])
        self.assertIsNone(result.confidence_intervals["X1"][0])
        self.assertTrue(any("no standard errors" in w for w in result.warnings))


class RobustRegressionIsCalibrated(SimpleTestCase):
    """Type I error rate under the null hypothesis of no relationship.

    A p-value that is not calibrated is not a p-value. These estimators shipped with
    standard errors borrowed from ordinary least squares (Theil-Sen) or computed from the
    estimator's own hand-picked inliers (RANSAC); simulated under H0 at a nominal 5% they
    rejected 9-10% and 66-72% of the time respectively. Nothing in a unit test that checks
    a single fit against a reference value would have caught that -- only calibration does.
    """

    REPLICATES = 400
    NOMINAL = 0.05

    def _false_positive_rate(self, method, n=50, seed=11):
        rng = np.random.default_rng(seed)
        hp = HighPrecisionRegression(precision=20)
        rejected = reported = 0
        for _ in range(self.REPLICATES):
            X = rng.normal(size=(n, 1))
            y = rng.normal(size=n)  # H0: y is independent of X
            result = hp.robust_regression(X, y, method=method)
            p = result.p_values.get("X1")
            if p is None:
                continue
            reported += 1
            rejected += float(p) < self.NOMINAL
        return (rejected / reported if reported else None), reported

    def test_huber_holds_its_nominal_level(self):
        rate, reported = self._false_positive_rate("huber")
        self.assertEqual(reported, self.REPLICATES)
        # Binomial standard error at 400 replicates is ~0.011; allow 3 of them plus the known
        # mild small-sample anti-conservatism of the Huber asymptotic covariance.
        self.assertLess(rate, 0.09, f"Huber rejects a true null {rate:.1%} of the time")

    def test_theil_sen_holds_its_nominal_level(self):
        rate, reported = self._false_positive_rate("theil_sen")
        self.assertEqual(reported, self.REPLICATES)
        self.assertLess(rate, 0.09, f"Theil-Sen rejects a true null {rate:.1%} of the time")

    def test_ransac_offers_no_p_value_to_miscalibrate(self):
        rate, reported = self._false_positive_rate("ransac")
        self.assertEqual(reported, 0)
        self.assertIsNone(rate)


class MultiplicityThresholdIsNullWhenNothingIsRejected(SimpleTestCase):
    def test_no_rejections_means_no_threshold(self):
        corrector = MultiplicityCorrector()
        p_values = [0.4, 0.6, 0.9]
        for method in (CorrectionMethod.FDR_BH, CorrectionMethod.HOMMEL):
            with self.subTest(method=method):
                result = corrector.correct(p_values, method=method, alpha=0.05)
                self.assertEqual(int(np.sum(result.rejected)), 0)
                # "Adjusted threshold: 0.000000" is a cutoff the procedure never computed.
                self.assertIsNone(result.threshold)


class TailProbabilitiesSurviveOrdinaryData(SimpleTestCase):
    """`1 - cdf(x)` cancels in float64: once cdf(x) rounds to 1.0, the tail is returned as
    exactly 0.0. That destroys every p below ~2e-16 -- which is not an edge case, it is the
    range every decisively significant result lives in. 87 sites in this codebase used it.
    """

    def test_anova_f_tail(self):
        from core.hp_anova_comprehensive import HighPrecisionANOVA

        groups = [
            [10.0, 10.1, 9.9, 10.05],
            [20.0, 20.1, 19.9, 20.05],
            [30.0, 30.1, 29.9, 30.05],
        ]
        result = HighPrecisionANOVA().one_way_anova(*groups)
        reference = stats.f_oneway(*groups).pvalue

        # This used to be exactly 0.
        self.assertGreater(result.p_value, 0)
        self.assertAlmostEqual(
            float(result.p_value) / reference, 1.0, places=6,
            msg=f"got {result.p_value}, scipy says {reference}",
        )

    def test_correlation_t_tail(self):
        from core.hp_correlation_comprehensive import HighPrecisionCorrelation

        x = list(np.linspace(0, 1, 50))
        y = [xi * 2 + 0.02 * np.sin(i) for i, xi in enumerate(x)]
        result = HighPrecisionCorrelation().pearson_correlation(x, y)
        reference = stats.pearsonr(x, y).pvalue

        self.assertGreater(result.p_value, 0)  # was exactly 0.0
        self.assertAlmostEqual(float(result.p_value) / reference, 1.0, places=6)


class CorrelationRefusesUndefinedInput(SimpleTestCase):
    def test_constant_variable_has_no_correlation(self):
        from core.hp_correlation_comprehensive import HighPrecisionCorrelation

        result = HighPrecisionCorrelation().pearson_correlation([5] * 8, [1, 2, 3, 4, 5, 6, 7, 8])
        # Used to report r = 0, p = 1.0, CI [-0.705, +0.705] and the words "a negligible
        # negative correlation that is not significant" -- a confident null verdict on data
        # that cannot support one. scipy returns nan and raises ConstantInputWarning.
        self.assertIsNone(result.correlation_coefficient)
        self.assertIsNone(result.p_value)
        self.assertIn("undefined", result.interpretation.lower())

    def test_three_points_do_not_crash(self):
        from core.hp_correlation_comprehensive import HighPrecisionCorrelation

        # n = 3 is the serializer's own declared minimum, and 1/sqrt(n-3) raised
        # decimal.DivisionByZero -> HTTP 500 on every 3-point correlation.
        result = HighPrecisionCorrelation().pearson_correlation([1, 2, 3], [2, 4, 7])
        self.assertIsNotNone(result.correlation_coefficient)
        self.assertIsNone(result.confidence_interval_lower)


class TwoByTwoMeasuresAtZeroCells(SimpleTestCase):
    def setUp(self):
        from core.hp_categorical_comprehensive import HighPrecisionCategorical

        self.calc = HighPrecisionCategorical()

    def test_no_events_in_either_arm_is_undefined(self):
        table = np.array([[0, 50], [0, 50]])
        odds = self.calc._calculate_odds_ratio(table)
        risk = self.calc._calculate_relative_risk(table)
        rd = self.calc._calculate_risk_difference(table)

        # Used to report OR = 1, RR = 1 ("no association") and a risk-difference interval of
        # exactly [0, 0] -- "95% confident the difference is precisely zero" -- for a trial in
        # which nobody in either arm had an event. scipy refuses this table outright.
        self.assertIsNone(odds["odds_ratio"])
        self.assertIsNone(risk["relative_risk"])
        # The risk difference IS zero here, honestly; its interval is not degenerate.
        self.assertEqual(rd["risk_difference"], Decimal("0"))
        low, high = rd["confidence_interval"]
        self.assertLess(low, 0)
        self.assertGreater(high, 0)

    def test_ordinary_table_matches_statsmodels(self):
        from statsmodels.stats.contingency_tables import Table2x2

        table = np.array([[20, 30], [10, 40]])
        reference = Table2x2(table)

        odds = self.calc._calculate_odds_ratio(table)
        risk = self.calc._calculate_relative_risk(table)
        self.assertAlmostEqual(float(odds["odds_ratio"]), reference.oddsratio, places=9)
        self.assertAlmostEqual(float(risk["relative_risk"]), reference.riskratio, places=9)

        low, high = odds["confidence_interval"]
        ref_low, ref_high = reference.oddsratio_confint()
        self.assertAlmostEqual(float(low), ref_low, places=6)
        self.assertAlmostEqual(float(high), ref_high, places=6)

    def test_a_single_zero_cell_is_corrected_and_disclosed(self):
        odds = self.calc._calculate_odds_ratio(np.array([[0, 50], [10, 40]]))
        # Haldane-Anscombe is a documented, citable convention. Adding 1e-10 to every cell,
        # as this code used to, is not -- it produced an interval of [8.4e-120379, 1.2e+120378].
        self.assertTrue(odds["haldane_anscombe_correction"])
        self.assertIn("Haldane", odds["note"])
        low, high = odds["confidence_interval"]
        self.assertGreater(float(low), 0)
        self.assertLess(float(high), 1e6)


class MannWhitneyStatisticAgreesWithItsOwnPValue(SimpleTestCase):
    def test_one_sided_direction_is_coherent(self):
        from core.hp_nonparametric_comprehensive import HighPrecisionNonParametric

        a, b = [1, 2, 3, 4, 5], [6, 7, 8, 9, 10]
        calc = HighPrecisionNonParametric()
        for alternative in ("two-sided", "less", "greater"):
            with self.subTest(alternative=alternative):
                result = calc.mann_whitney_u(a, b, alternative=alternative)
                reference = stats.mannwhitneyu(a, b, alternative=alternative)
                # The reported U used to be min(U1, U2) while the p-value came from scipy's
                # U1, so a one-sided test could show z = -0.84 next to p = 0.80.
                self.assertEqual(float(result.test_statistic), float(reference.statistic))
                self.assertAlmostEqual(float(result.p_value), float(reference.pvalue), places=9)

        # Group 1 is entirely below group 2, so the rank-biserial correlation is -1. Computed
        # from min(U1, U2) it could never be negative at all.
        result = calc.mann_whitney_u(a, b)
        self.assertEqual(float(result.effect_size), -1.0)


class EffectSizesRefuseZeroVariance(SimpleTestCase):
    def test_cohens_d_with_no_within_group_variance(self):
        from core.effect_sizes import EffectSizeCalculator

        # Two groups five units apart, each perfectly constant. d = 5/0. It used to report
        # d = 0.00, "negligible effect", CI [-1.39, +1.39].
        with self.assertRaises(ValueError):
            EffectSizeCalculator().cohens_d([5, 5, 5, 5], [10, 10, 10, 10])
