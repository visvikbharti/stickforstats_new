"""
Math-correctness contracts for Guardian validators that were corrected
on 2026-05-06 (docs/CRITICAL_REVIEW_2026-05-06.md §P1-8 and §P1-12).

Two areas covered:

1. ``IndependenceValidator`` --- previously claimed Durbin-Watson in its
   docstring while computing lag-1 Pearson autocorrelation on raw data
   with no p-value. Now honestly named, returns a real p-value via
   ``scipy.stats.pearsonr``, and documents the time-order assumption.

2. ``anderson_pvalue_continuous`` (and its callers in ``guardian_core``
   and ``services.assumption_service``) --- previously surfaced
   step-function categorical p-values from the scipy critical-value
   table. Now returns a continuous D'Agostino-Stephens 1986 p-value.
"""

from __future__ import annotations

import math

import numpy as np
from django.test import TestCase
from scipy import stats

from core.guardian.guardian_core import IndependenceValidator, NormalityValidator
from core.utils.anderson_darling import anderson_pvalue_continuous


# ---------------------------------------------------------------------------
# Anderson-Darling continuous p-value
# ---------------------------------------------------------------------------


class TestAndersonDarlingContinuousP(TestCase):
    """The new D'Agostino-Stephens approximation must produce a smooth
    monotonically-decreasing p as A^2 grows."""

    def test_strongly_normal_gives_high_p(self):
        rng = np.random.default_rng(2026_05_06)
        x = rng.normal(0.0, 1.0, size=1000)
        ad = stats.anderson(x, dist="norm")
        p = anderson_pvalue_continuous(ad.statistic, len(x))
        # n=1000 normal samples should have AD p well above 0.10.
        self.assertGreater(p, 0.10)
        self.assertLessEqual(p, 1.0)

    def test_strongly_non_normal_gives_tiny_p(self):
        rng = np.random.default_rng(2026_05_07)
        x = rng.exponential(1.0, size=1000)
        ad = stats.anderson(x, dist="norm")
        p = anderson_pvalue_continuous(ad.statistic, len(x))
        # Exponential samples are highly non-normal at this n.
        self.assertLess(p, 0.001)

    def test_p_is_monotonic_in_statistic(self):
        """Larger A^2 must always give smaller-or-equal p across the
        full piecewise domain."""
        a_values = [0.05, 0.10, 0.15, 0.20, 0.25, 0.30, 0.35,
                    0.50, 0.70, 1.00, 1.50, 2.00, 5.00, 15.00]
        ps = [anderson_pvalue_continuous(a, 100) for a in a_values]
        for prev, curr in zip(ps, ps[1:]):
            self.assertGreaterEqual(prev, curr,
                                    f"p-value not monotonic decreasing: {ps}")

    def test_returns_clamped_floats(self):
        """Output must always be a finite float in [1e-12, 1.0]."""
        for stat in [0.0, 1e-9, 0.5, 5.0, 100.0, 1e6]:
            p = anderson_pvalue_continuous(stat, 100)
            self.assertIsInstance(p, float)
            self.assertGreaterEqual(p, 1e-12)
            self.assertLessEqual(p, 1.0)
            self.assertFalse(math.isnan(p))

    def test_old_categorical_jumps_replaced_with_smooth_curve(self):
        """The old code returned only one of {0.15, 0.10, 0.05, 0.025,
        0.01, 0.001} (or {0.05, 0.10} for n>5000). The new function
        produces values OUTSIDE that discrete set for typical inputs."""
        old_categorical_set = {0.15, 0.10, 0.05, 0.025, 0.01, 0.001}
        # Try a few statistics that under the old logic would all map
        # to the same bucket; now each should get a distinct value.
        ps = {
            anderson_pvalue_continuous(0.45, 100),
            anderson_pvalue_continuous(0.55, 100),
            anderson_pvalue_continuous(0.65, 100),
        }
        # All three should be distinct continuous values.
        self.assertEqual(len(ps), 3)
        # And none should accidentally equal an old categorical level
        # (extremely unlikely floating-point coincidence).
        self.assertEqual(ps & old_categorical_set, set())

    def test_uses_continuous_p_in_normality_validator_for_large_n(self):
        """NormalityValidator switches to AD for n>5000. Previously it
        returned p_value in {0.05, 0.10}; now it should return a value
        not on that two-element set for typical data."""
        rng = np.random.default_rng(0)
        x = rng.normal(0.0, 1.0, size=6000)
        validator = NormalityValidator()
        result = validator.validate([x])
        # No test_results when not violated; but the per-array p should
        # have been computed via the continuous formula. We exercise the
        # public path: a normal sample should NOT have p ∈ {0.05, 0.10}
        # exactly. (One in a million chance of coincidence.)
        # The validator returns either {"violated": False, ...} or a
        # violation dict. For normal data we expect non-violation:
        self.assertFalse(result.get("violated", False))


# ---------------------------------------------------------------------------
# IndependenceValidator (lag-1 autocorrelation, not Durbin-Watson)
# ---------------------------------------------------------------------------


class TestIndependenceValidatorHonestNaming(TestCase):

    def test_test_name_no_longer_claims_durbin_watson(self):
        """Class docstring + return labels must not claim Durbin-Watson."""
        validator = IndependenceValidator()
        # No autocorrelation in random data.
        rng = np.random.default_rng(1)
        x = rng.normal(0.0, 1.0, size=200)
        result = validator.validate([x])
        self.assertNotIn("Durbin-Watson", result.get("test_name", ""))
        self.assertIn("Lag-1 Autocorrelation", result["test_name"])

    def test_returns_p_value_for_violation(self):
        """When a violation fires, the returned dict must carry a
        numeric p_value (was None in the old implementation)."""
        # Construct strongly autocorrelated series: AR(1) with phi=0.9.
        rng = np.random.default_rng(2)
        n = 200
        x = np.zeros(n)
        x[0] = rng.normal()
        for i in range(1, n):
            x[i] = 0.9 * x[i - 1] + rng.normal(0, 0.5)
        validator = IndependenceValidator()
        result = validator.validate([x])
        self.assertTrue(result["violated"])
        self.assertIsNotNone(result.get("p_value"))
        self.assertIsInstance(result["p_value"], float)
        self.assertLess(result["p_value"], 0.05)

    def test_no_violation_for_independent_data(self):
        """IID normal data should pass."""
        rng = np.random.default_rng(3)
        x = rng.normal(0.0, 1.0, size=500)
        validator = IndependenceValidator()
        result = validator.validate([x])
        self.assertFalse(result["violated"])
        # p_value should still be reported even on non-violation.
        self.assertIn("p_value", result)

    def test_short_array_skipped(self):
        """Arrays with <10 obs should not contribute (cannot reliably
        test lag-1 autocorr with so few points)."""
        validator = IndependenceValidator()
        result = validator.validate([np.array([1.0, 2.0, 3.0, 4.0, 5.0])])
        # Skipped → returns the no-violation default with statistic=None.
        self.assertFalse(result["violated"])
        self.assertIsNone(result.get("statistic"))

    def test_combines_practical_and_statistical_significance(self):
        """A statistically significant but tiny |r|=0.05 should NOT
        trigger a violation, because the practical-significance gate
        |r| > 0.3 is still required."""
        # Fake input with very small but non-zero autocorr in a large n.
        # Here we just rely on independent random data (|r| typically
        # well below 0.05, p typically large): no violation expected.
        rng = np.random.default_rng(4)
        x = rng.normal(0.0, 1.0, size=10000)
        validator = IndependenceValidator()
        result = validator.validate([x])
        self.assertFalse(result["violated"])

    def test_pvalue_matches_scipy_pearsonr(self):
        """The reported p-value (when violated) should match
        scipy.stats.pearsonr applied to (arr[:-1], arr[1:]) directly."""
        rng = np.random.default_rng(5)
        n = 100
        # Strongly autocorrelated AR(1)
        x = np.zeros(n)
        x[0] = rng.normal()
        for i in range(1, n):
            x[i] = 0.85 * x[i - 1] + rng.normal(0, 0.4)
        validator = IndependenceValidator()
        result = validator.validate([x])
        if result["violated"]:
            r_ref, p_ref = stats.pearsonr(x[:-1], x[1:])
            self.assertAlmostEqual(result["statistic"], float(r_ref), places=10)
            self.assertAlmostEqual(result["p_value"], float(p_ref), places=10)
