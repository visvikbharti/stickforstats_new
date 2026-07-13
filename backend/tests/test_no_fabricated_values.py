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

    def test_exact_fit_has_no_standard_errors_and_no_aic(self):
        exact_y = np.array([2.0, 4.0, 6.0, 8.0, 10.0, 12.0])
        result = self.hp.robust_regression(self.X, exact_y)
        # The coefficients are real and are still reported...
        self.assertIsNotNone(result.coefficients["X1"])
        # ...but the fit is numerically exact, and the user is told that the uncertainty
        # figures below it are round-off rather than sampling variability.
        self.assertTrue(any("round-off" in w for w in result.warnings))

    def test_a_singular_design_yields_null_standard_errors_not_ones(self):
        # Two perfectly collinear predictors: (X'WX) is singular, so the standard errors do
        # not exist. They used to come back as exactly 1.0 each.
        X = np.array([[1.0, 2.0], [2.0, 4.0], [3.0, 6.0], [4.0, 8.0], [5.0, 10.0]])
        y = np.array([1.0, 2.1, 2.9, 4.2, 5.1])
        result = self.hp.robust_regression(X, y)
        for name, se in result.standard_errors.items():
            with self.subTest(term=name):
                self.assertNotEqual(se, Decimal("1"))


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
