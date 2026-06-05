"""
Regression tests for p-curve statistical correctness.

Guards the 2026-06-05 audit fixes (each was a served-wrong verdict):

- The 33%-power FLAT test was direction-inverted (a right-tail binomial vs 1/3
  that fired on right-skewed data). It is now the canonical Stouffer-of-pp33
  test, and only runs when per-study test statistics are available.
- The AVERAGE-POWER estimate was a fabricated piecewise-linear heuristic
  (~38% power for pure noise). It is now the loss-function estimator
  (recovers known power); unavailable from bare p-values.
- has_evidential_value over-called via a magnitude-blind binomial half-test;
  now the canonical right-skew/half-curve Stouffer combination rule.

Calibration (null -> flat-significant, 33% -> calibrated, high power ->
right-skew) is validated by simulation; these tests pin the direction and the
honest-unavailable behavior with deterministic constructed inputs.
"""
import json

import numpy as np
from scipy import stats
from django.test import SimpleTestCase

from core.services.pcurve import compute_pcurve, parse_test_statistic
from core.services.pcurve.core import flat_test_33, estimate_power


def _t_studies(p_values, df=38):
    return [{"p_value": float(p), "test_type": "t", "df1": df} for p in p_values]


class PCurveParserTests(SimpleTestCase):
    def test_correlation_uses_apa_df(self):
        # r(38) means df = 38 (n = 40) -- no discontinuous +2 heuristic
        res = parse_test_statistic("r(38) = 0.45")
        self.assertEqual(res.df1, 38)
        self.assertEqual(res.n, 40)
        expected_t = 0.45 * np.sqrt(38 / (1 - 0.45 ** 2))
        self.assertAlmostEqual(res.p_value, 2 * stats.t.sf(expected_t, 38), places=6)

    def test_p_inequality_is_excluded_not_treated_as_exact(self):
        res = parse_test_statistic("p < 0.05")
        self.assertTrue(res.is_bound)
        self.assertFalse(res.is_valid)
        self.assertIsNone(res.p_value)

    def test_exact_p_is_parsed(self):
        res = parse_test_statistic("p = 0.023")
        self.assertTrue(res.is_valid)
        self.assertAlmostEqual(res.p_value, 0.023)


class PCurveFlatTestDirectionTests(SimpleTestCase):
    def test_right_skewed_data_is_not_flagged_flat(self):
        # Tiny p's (high power) -> NOT flatter than 33% power.
        studies = _t_studies([0.001, 0.002, 0.0005, 0.003, 0.0015])
        ft = flat_test_33(studies)
        self.assertTrue(ft["available"])
        self.assertFalse(ft["significant"])  # old inverted test fired here

    def test_flat_data_is_flagged_flat(self):
        # p's bunched near .05 (flatter than 33% power) -> flat test significant.
        studies = _t_studies([0.045, 0.048, 0.049, 0.047, 0.046, 0.044, 0.049])
        ft = flat_test_33(studies)
        self.assertTrue(ft["available"])
        self.assertTrue(ft["significant"])

    def test_flat_test_unavailable_without_test_statistics(self):
        ft = flat_test_33([{"p_value": 0.01, "test_type": "p"}] * 4)
        self.assertFalse(ft["available"])
        self.assertIn("test statistic", ft["reason"])


class PCurvePowerEstimateTests(SimpleTestCase):
    def test_high_power_data_recovers_high_power(self):
        # All very small p's -> high estimated power (NOT the old ~38%-for-noise).
        studies = _t_studies([0.0001, 0.0002, 0.0003, 0.00005, 0.0004, 0.0001])
        power, ci = estimate_power(studies)
        self.assertIsNotNone(power)
        self.assertGreater(power, 0.6)
        self.assertEqual(len(ci), 2)

    def test_power_estimate_is_deterministic(self):
        # Seeded bootstrap -> identical CI across calls (reproducibility).
        studies = _t_studies([0.001, 0.01, 0.02, 0.005, 0.03, 0.001])
        p1, ci1 = estimate_power(studies)
        p2, ci2 = estimate_power(studies)
        self.assertEqual(p1, p2)
        self.assertEqual(ci1, ci2)

    def test_power_none_for_bare_pvalues(self):
        power, ci = estimate_power([{"p_value": 0.01, "test_type": "p"}] * 5)
        self.assertIsNone(power)
        self.assertIsNone(ci)


class PCurveComputeTests(SimpleTestCase):
    def test_evidential_value_for_strong_right_skew(self):
        studies = _t_studies([0.001, 0.002, 0.0005, 0.003, 0.0015])
        res = compute_pcurve([s["p_value"] for s in studies], studies=studies)
        self.assertTrue(res.has_evidential_value)
        self.assertFalse(res.inadequate_evidence)
        self.assertIsNotNone(res.estimated_power)
        json.dumps(res.to_dict())

    def test_inadequate_for_flat_curve(self):
        studies = _t_studies([0.045, 0.048, 0.049, 0.047, 0.046, 0.044, 0.049])
        res = compute_pcurve([s["p_value"] for s in studies], studies=studies)
        self.assertFalse(res.has_evidential_value)
        self.assertTrue(res.inadequate_evidence)

    def test_bare_pvalues_disable_df_dependent_outputs(self):
        res = compute_pcurve([0.01, 0.02, 0.03, 0.001, 0.04])
        self.assertFalse(res.flat_test.get("available"))
        self.assertIsNone(res.estimated_power)
        json.dumps(res.to_dict())

    def test_insufficient_significant_pvalues(self):
        res = compute_pcurve([0.01, 0.2, 0.3])  # only 1 significant
        self.assertEqual(res.n_significant, 1)
        self.assertFalse(res.has_evidential_value)
        json.dumps(res.to_dict())

    def test_expected_33_is_monotonically_decreasing(self):
        # The old hardcoded curve was flat after bin 1 ([.356, .161, .161, ...]).
        studies = _t_studies([0.001, 0.01, 0.02, 0.005, 0.03])
        res = compute_pcurve([s["p_value"] for s in studies], studies=studies)
        e = res.expected_33
        self.assertTrue(all(e[i] >= e[i + 1] - 1e-9 for i in range(len(e) - 1)), e)
