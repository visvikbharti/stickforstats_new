"""p-values leave the server at full precision.

The site prints p-values through one formatter (frontend/src/utils/formatStats.js), which reads
an exact 0 as "< 2.2e-16". That is true only of a p-value that was computed as 0. The mixed-model
services and the Guardian transformation engine rounded p-values to 4 or 6 decimals first, so a
p of 3e-9 left the server as 0.0 and would have printed as "< 2.2e-16"; the transformation wizard,
which printed them as they came, showed "p = 0". They now return the computed value. Two smaller
faults on the same lines: a p-value of exactly 0 counted as missing (`if shapiro_p`), and the
transformation engine reported a measured p of 0 as 0.001.
"""

from types import SimpleNamespace
from unittest.mock import patch

import numpy as np
from django.test import SimpleTestCase
from scipy import stats

from core.guardian.transformation_engine import TransformationEngine
from core.services.mixed_models import diagnostics, model_comparison, random_effects
from core.services.mixed_models.icc import icc_one_way_random

TINY = 3.2e-9  # 0.0 once rounded to 4 or 6 decimals


class MixedModelPValuesTest(SimpleTestCase):
    def test_icc_f_test_p_value_is_not_rounded(self):
        rng = np.random.default_rng(2)
        data = rng.normal(0, 10, 12)[:, None] + rng.normal(0, 2.0, (12, 2))
        result = icc_one_way_random(data)
        reported = result.to_dict()["f_test"]["p_value"]
        self.assertEqual(reported, float(result.p_value))
        self.assertGreater(reported, 0)
        self.assertLess(reported, 5e-7)  # round(p, 6) made this 0.0

    def test_likelihood_ratio_test_p_value_is_not_rounded(self):
        null = SimpleNamespace(log_likelihood=-120.0, fixed_effects={"Intercept": 1}, random_effects_variance={"g": 1})
        alt = SimpleNamespace(
            log_likelihood=-100.0, fixed_effects={"Intercept": 1, "x": 1, "z": 1}, random_effects_variance={"g": 1}
        )
        reported = model_comparison.likelihood_ratio_test(null, alt)["p_value"]
        self.assertEqual(reported, float(stats.chi2.sf(40.0, 2)))
        self.assertLess(reported, 5e-7)

    def test_model_comparison_result_keeps_the_lrt_p_value(self):
        result = model_comparison.ModelComparisonResult(
            models=["null", "alt"], comparison_type="nested", log_likelihoods=[-120.0, -100.0],
            aics=[246.0, 210.0], bics=[250.0, 218.0], deviances=[240.0, 200.0], lrt_statistic=40.0, lrt_df=2,
            lrt_p_value=TINY, n_parameters=[3, 5], n_observations=60, preferred_model="alt",
            preference_criterion="LRT", interpretation="",
        )
        self.assertEqual(result.to_dict()["likelihood_ratio_test"]["p_value"], TINY)

    def test_residual_diagnostics_keep_the_p_values_and_a_zero_is_not_missing(self):
        rng = np.random.default_rng(4)
        fitted = np.linspace(1, 10, 60)
        lmm = SimpleNamespace(_model_result=SimpleNamespace(resid=rng.normal(0, fitted / 3), fittedvalues=fitted))
        for p in (TINY, 0.0):
            with patch.object(diagnostics.stats, "shapiro", return_value=(0.91, p)):
                out = diagnostics.residual_diagnostics(lmm)
            self.assertEqual(out["normality"]["p_value"], p)
            self.assertIs(out["normality"]["normal"], False)
        expected_het = stats.linregress(fitted, (np.asarray(lmm._model_result.resid)) ** 2).pvalue
        self.assertEqual(out["homoscedasticity"]["p_value"], float(expected_het))

    def test_full_diagnostics_keep_the_random_effect_normality_p_value(self):
        rng = np.random.default_rng(5)
        lmm = SimpleNamespace(
            converged=True, warnings=[], random_effects_variance={"g": 1.0}, residual_variance=1.0,
            _model_result=SimpleNamespace(resid=rng.normal(0, 1, 60), fittedvalues=np.linspace(1, 10, 60)),
            random_effects_blups={f"g{i}": {"Intercept": float(i)} for i in range(10)},
        )
        with patch.object(diagnostics.stats, "shapiro", return_value=(0.9, TINY)):
            out = diagnostics.full_diagnostics(lmm).to_dict()
        self.assertEqual(out["random_effects"]["normality"]["p_value"], TINY)

    def test_random_effects_qq_plot_keeps_the_p_value_and_a_zero_is_not_missing(self):
        lmm = SimpleNamespace(random_effects_blups={f"g{i}": {"Intercept": float(i)} for i in range(10)})
        for p in (TINY, 0.0):
            with patch.object(random_effects.stats, "shapiro", return_value=(0.9, p)):
                out = random_effects.random_effects_qq_plot(lmm)
            self.assertEqual(out["normality_test"]["p_value"], p)
            self.assertIs(out["normality_test"]["normal"], False)


class TransformationPValuesTest(SimpleTestCase):
    skewed = np.exp(np.random.default_rng(3).normal(0, 1.5, 200))

    def test_suggestion_reports_the_measured_p_value(self):
        for p in (TINY, 0.0):
            with patch("core.guardian.transformation_engine.stats.shapiro", return_value=(0.6, p)):
                out = TransformationEngine().suggest_transformation(self.skewed)
            self.assertIsNotNone(out["recommended"])
            self.assertEqual(out["current_p_value"], p)  # was 0.0 (rounded) and 0.001 (for 0)

    def test_validation_reports_the_measured_p_values(self):
        with patch("core.guardian.transformation_engine.stats.shapiro", side_effect=[(0.6, TINY), (0.97, 0.21)]):
            out = TransformationEngine().validate_transformation(self.skewed, np.log(self.skewed))
        self.assertEqual(out["original_p_value"], TINY)
        self.assertEqual(out["transformed_p_value"], 0.21)
