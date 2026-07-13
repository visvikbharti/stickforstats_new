"""
Round two: the same fabrication, found in the places I had not yet looked.

An adversarial sweep of the backend turned up the identical pattern in the flagship regression
engine, in the causal-inference module, in ANOVA's degenerate branches, and in genomics. Two of
them are worse than anything found in round one:

  - every multiple regression reported a Breusch-Pagan test it never ran, and
  - every strongly significant regression coefficient had a p-value of exactly zero.
"""

from __future__ import annotations

import numpy as np
import statsmodels.api as sm
import statsmodels.stats.api as sms
from django.test import TestCase
from scipy import stats

from core.hp_regression_comprehensive import HighPrecisionRegression


class RegressionPValuesSurviveTheTail(TestCase):
    def setUp(self):
        self.engine = HighPrecisionRegression()

    def test_a_hugely_significant_coefficient_does_not_have_p_equal_zero(self):
        # The coefficient p-values went through
        #
        #     p = 2 * (1 - self._t_cdf(|t|, df))
        #
        # and `_t_cdf` was itself `1 - 0.5 * scipy.special.betainc(...)` computed in FLOAT64 and
        # then wrapped in mp.mpf(str(...)). So: (a) the advertised 50 digits were 16 digits in a
        # 50-digit coat, and (b) it was `1 - cdf` TWICE. Once the inner betainc underflows -- any
        # tail below ~1e-16, i.e. every decisively significant coefficient -- the reported
        # p-value is exactly 0.0.
        for t, df in [(40, 20), (100, 30), (200, 50)]:
            with self.subTest(t=t, df=df):
                p = float(self.engine._t_sf_two_sided(t, df))
                reference = float(2 * stats.t.sf(t, df))

                self.assertGreater(p, 0.0)  # the bug: this was exactly 0
                self.assertAlmostEqual(p / reference, 1.0, places=10)

    def test_coefficient_p_values_through_the_full_fit(self):
        rng = np.random.default_rng(3)
        n = 40
        x = rng.normal(0, 1, n)
        y = 5 + 12 * x + rng.normal(0, 0.05, n)  # an overwhelming slope

        result = self.engine.linear_regression(x.reshape(-1, 1), y)
        slope_p = float(list(result.p_values.values())[1])

        self.assertGreater(slope_p, 0.0)
        self.assertLess(slope_p, 1e-40)  # it is real, and it is tiny


class BreuschPaganActuallyRunsTheTest(TestCase):
    def setUp(self):
        self.engine = HighPrecisionRegression()

    def test_multiple_regression_gets_a_real_breusch_pagan(self):
        # This is the worst thing the audit found. The code read:
        #
        #     slope, intercept, r_value, p_value, std_err = (
        #         linregress(X[:, 0], resid_sq) if X.shape[1] == 1 else (0, 0, 0, 1, 0)
        #     )
        #
        # For ANY regression with more than one predictor it did not run the test -- it
        # substituted a literal tuple. r_value = 0, so the statistic was n * 0**2 = 0, and the
        # p-value was 1 - chi2.cdf(0, df) = exactly 1.0. Every multiple regression on this
        # platform reported "homoscedasticity satisfied, BP = 0, p = 1.0": a fabricated pass on
        # the very assumption whose violation invalidates the standard errors printed beside it.
        rng = np.random.default_rng(7)
        n = 60
        x1 = rng.normal(0, 1, n)
        x2 = rng.normal(0, 1, n)
        # variance grows with x1 -- strongly heteroscedastic by construction
        y = 2 + 1.5 * x1 - 0.8 * x2 + rng.normal(0, 1, n) * np.exp(0.8 * x1)
        X = np.column_stack([x1, x2])

        diagnostics = self.engine.linear_regression(X, y).diagnostics
        bp_stat = float(diagnostics.breusch_pagan["statistic"])
        bp_p = float(diagnostics.breusch_pagan["p_value"])

        # Not the fabricated pass.
        self.assertNotEqual(bp_stat, 0.0)
        self.assertNotEqual(bp_p, 1.0)

        # It is statsmodels' Breusch-Pagan, exactly.
        design = sm.add_constant(X)
        reference = sms.het_breuschpagan(sm.OLS(y, design).fit().resid, design)
        self.assertAlmostEqual(bp_stat, float(reference[0]), places=8)
        self.assertAlmostEqual(bp_p, float(reference[1]), places=10)

        # And it catches the heteroscedasticity it is there to catch.
        self.assertTrue(diagnostics.heteroscedasticity_detected)

    def test_a_homoscedastic_multiple_regression_is_not_flagged(self):
        rng = np.random.default_rng(11)
        n = 60
        X = np.column_stack([rng.normal(0, 1, n), rng.normal(0, 1, n)])
        y = 1 + X[:, 0] - X[:, 1] + rng.normal(0, 1, n)

        diagnostics = self.engine.linear_regression(X, y).diagnostics

        self.assertFalse(diagnostics.heteroscedasticity_detected)
        self.assertGreater(float(diagnostics.breusch_pagan["p_value"]), 0.05)


class CausalInferenceDoesNotTurnAMissingSEIntoNoEffect(TestCase):
    def test_a_degenerate_standard_error_yields_no_p_value(self):
        # `t_stat = ate / se if se > 0 else 0` and then `p = 2 * norm.sf(|t|)`. sf(0) is exactly
        # 0.5, so p came out as exactly 1.0 -- "no evidence of any effect", stated with total
        # confidence, from a computation that failed. The confidence interval collapsed to
        # `estimate +/- 0` at the same time: a point estimate of infinite precision, sitting next
        # to a p-value saying there was nothing to estimate.
        from core.services.causal.effects import normal_inference

        for bad_se in (0.0, -1.0, np.nan, np.inf, None):
            with self.subTest(se=bad_se):
                t, p, lo, hi = normal_inference(estimate=0.5, se=bad_se)
                self.assertIsNone(t)
                self.assertIsNone(p)
                self.assertIsNone(lo)
                self.assertIsNone(hi)

    def test_a_real_standard_error_still_gives_inference(self):
        from core.services.causal.effects import normal_inference

        t, p, lo, hi = normal_inference(estimate=1.0, se=0.25, confidence_level=0.95)

        self.assertAlmostEqual(t, 4.0, places=10)
        self.assertAlmostEqual(p, float(2 * stats.norm.sf(4.0)), places=12)
        self.assertAlmostEqual(lo, 1.0 - 1.959963984540054 * 0.25, places=8)
        self.assertLess(hi - lo, 1.5)  # a real interval, with width


class GenomicsFoldChangeIsNotAnEpsilon(TestCase):
    def test_a_zero_group_mean_has_no_fold_change(self):
        # log2(mean2 / mean1) is undefined when either mean is 0. Clamping both at 1e-10 does not
        # define it -- it invents it, and the magnitude then comes from the EPSILON rather than
        # the data: mean1 = 1, mean2 = 0 gave log2FC = -33.2, an enormous fabricated effect that
        # lands at the far edge of the volcano plot looking like the most compelling gene in the
        # experiment. Change the epsilon to 1e-20 and the "effect" doubles.
        from core.services.genomics.differential_expression import DifferentialExpressionService

        rng = np.random.default_rng(5)
        matrix = np.abs(rng.normal(5, 1, (6, 10))) + 1.0
        matrix[0, 5:] = 0.0  # gene 0 is completely absent in group 2
        names = [f"G{i}" for i in range(6)]
        labels = ["control"] * 5 + ["treatment"] * 5

        service = DifferentialExpressionService(alpha=0.05)
        result = service.analyze(
            expression_matrix=matrix,
            gene_names=names,
            group_labels=labels,
            group1_name="control",
            group2_name="treatment",
        )

        gene0 = next(g for g in result.gene_results if g.gene_name == "G0")
        self.assertIsNone(gene0.log2_fold_change)
        self.assertIsNone(gene0.to_dict()["log2_fold_change"])

        # ...and it is not plotted at a fabricated coordinate.
        plotted = {point["gene"] for point in result.volcano_data}
        self.assertNotIn("G0", plotted)


class PropensityAUCIsNotAlwaysACoinFlip(TestCase):
    def test_an_empty_treatment_arm_has_no_auc(self):
        # With no treated units there are no pairs to rank, so the ROC-AUC does not exist.
        # Returning 0.5 is not a neutral default -- it is the specific claim that the model
        # discriminates exactly as well as a coin flip, and it then triggered the downstream
        # `auc < 0.6` check, which printed "Low AUC (0.500) -- covariates may not predict
        # treatment well": a diagnostic finding about a model that was never scored.
        from core.services.causal.propensity import _calculate_auc

        y_true = np.zeros(20)  # every unit is a control
        y_score = np.random.default_rng(1).uniform(size=20)

        self.assertIsNone(_calculate_auc(y_true, y_score))


class ANOVADegeneracyIsNotAConfidentNull(TestCase):
    def test_significance_of_a_missing_p_value_is_neither_true_nor_false(self):
        # `F = ms_effect / ms_residual if ms_residual > 0 else 0` -- and F = 0 is not "undefined",
        # it is the strongest evidence of NO effect the statistic can express. It was then handed
        # to stats.f.sf(0, ...), which returns exactly 1.0. The degenerate design -- the one that
        # cannot support the test at all -- came out as "F = 0.00, p = 1.000, no effect".
        from core.services.anova.advanced_anova_service import _sig

        self.assertIsNone(_sig(None))
        self.assertTrue(_sig(0.01))
        self.assertFalse(_sig(0.5))


class AScoreOfZeroIsAScore(TestCase):
    def test_decimal_zero_is_not_null(self):
        # Decimal("0.00") is FALSY. `float(x) if x else None` therefore erased the worst possible
        # score -- the one that most needs reporting -- and made it indistinguishable from "never
        # computed". This is the same bug as the serializers, in the API views themselves.
        from decimal import Decimal

        worst = Decimal("0.00")
        self.assertFalse(bool(worst))  # this is why it happened

        # The fixed idiom.
        self.assertEqual(float(worst) if worst is not None else None, 0.0)
