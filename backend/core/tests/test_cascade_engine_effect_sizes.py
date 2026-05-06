"""
Effect-size formula contracts for AutonomousCascadeEngine.

These tests pin the *formulas* used by the nonparametric branches of the
cascade engine, not just that they execute. They were added 2026-05-06
after the audit (docs/CRITICAL_REVIEW_2026-05-06.md §P1-8) found that:

  * ``_exec_wilcoxon`` was returning ``W / max(W)`` (i.e. the test
    statistic divided by its possible maximum) under the misleading
    label ``"r (effect size)"``. The conventional Wilcoxon r is
    ``|Z| / sqrt(N)`` (Rosenthal 1991; Fritz, Morris & Richler 2012).
  * ``_exec_kruskal_wallis`` was returning the *unbiased
    eta-squared* formula ``(H - k + 1) / (n - k)`` under the label
    ``"Epsilon-squared"``. Some older sources do call this expression
    epsilon-squared, but the modern convention (Tomczak & Tomczak 2014;
    JASP; rcompanion) reserves "epsilon squared" for ``H / (n - 1)``.

Each test below cross-checks the cascade-engine output against the
canonical formulas applied to the same inputs.
"""

from __future__ import annotations

import numpy as np
from django.test import TestCase
from scipy import stats

from core.services.cascade_engine import AutonomousCascadeEngine


def _wilcoxon_r_reference(arr1: np.ndarray, arr2: np.ndarray) -> float:
    """|Z| / sqrt(N) reference for Wilcoxon signed-rank r."""
    res = stats.wilcoxon(arr1, arr2)
    n = len(arr1)
    mu_w = n * (n + 1) / 4.0
    sigma_w = np.sqrt(n * (n + 1) * (2 * n + 1) / 24.0)
    z = (float(res.statistic) - mu_w) / sigma_w if sigma_w > 0 else 0.0
    return abs(z) / float(np.sqrt(n))


def _kw_eta_sq_h_reference(arrays):
    """(H - k + 1) / (n - k) reference for Kruskal-Wallis unbiased eta^2."""
    res = stats.kruskal(*arrays)
    n = sum(len(a) for a in arrays)
    k = len(arrays)
    return float((res.statistic - k + 1) / (n - k))


def _kw_epsilon_sq_reference(arrays):
    """H / (n - 1) reference for Kruskal-Wallis epsilon^2 (Tomczak 2014)."""
    res = stats.kruskal(*arrays)
    n = sum(len(a) for a in arrays)
    return float(res.statistic / (n - 1))


class TestWilcoxonEffectSize(TestCase):
    """Wilcoxon signed-rank r must be |Z|/sqrt(N), not W/max(W)."""

    def setUp(self):
        self.engine = AutonomousCascadeEngine()

    def test_r_matches_z_over_sqrt_n(self):
        rng = np.random.default_rng(2026_05_06)
        a = rng.normal(0.0, 1.0, size=30)
        b = a + rng.normal(0.5, 1.0, size=30)
        result = self.engine._exec_wilcoxon([a, b], alpha=0.05)
        expected = _wilcoxon_r_reference(a, b)
        self.assertAlmostEqual(result.effect_size, expected, places=10)

    def test_r_label_is_z_over_sqrt_n_form(self):
        a = np.array([1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0])
        b = np.array([1.5, 2.6, 3.1, 4.7, 5.2, 6.8, 7.3, 8.4, 9.1, 10.6])
        result = self.engine._exec_wilcoxon([a, b], alpha=0.05)
        # Label must reference the Z/sqrt(N) form so a reader can tell
        # which formula was applied without reading the source.
        self.assertIn("Z", result.effect_size_name)
        self.assertIn("sqrt(N)", result.effect_size_name)

    def test_r_is_on_zero_one_scale_for_typical_input(self):
        rng = np.random.default_rng(0)
        a = rng.normal(0.0, 1.0, size=50)
        b = a + 0.3
        result = self.engine._exec_wilcoxon([a, b], alpha=0.05)
        # Wilcoxon r is bounded in [0, 1] (some authors allow [-1, 1]
        # signed; we report the unsigned magnitude).
        self.assertGreaterEqual(result.effect_size, 0.0)
        self.assertLessEqual(result.effect_size, 1.0)

    def test_z_approx_in_additional(self):
        a = np.arange(20, dtype=float)
        b = a + 1.0
        result = self.engine._exec_wilcoxon([a, b], alpha=0.05)
        self.assertIn("z_approx", result.additional)
        self.assertIn("n_pairs", result.additional)
        self.assertEqual(result.additional["n_pairs"], 20)

    def test_regression_not_w_over_max_w(self):
        """Old buggy formula returned stat / (n*(n+1)/2). Verify we no
        longer produce that value (which is unrelated to Cohen r)."""
        rng = np.random.default_rng(42)
        a = rng.normal(0.0, 1.0, size=25)
        b = a + rng.normal(0.4, 0.7, size=25)
        result = self.engine._exec_wilcoxon([a, b], alpha=0.05)

        n = len(a)
        wilcox = stats.wilcoxon(a, b)
        bad_value = float(wilcox.statistic / (n * (n + 1) / 2))
        # Real r will almost certainly differ from the old formula.
        # Tolerance: must differ by more than 1e-6 to confirm the fix.
        self.assertGreater(abs(result.effect_size - bad_value), 1e-6)


class TestKruskalWallisEffectSize(TestCase):
    """Kruskal-Wallis effect size must be labelled correctly:
    primary = unbiased eta-squared H; epsilon-squared in additional."""

    def setUp(self):
        self.engine = AutonomousCascadeEngine()

    def test_primary_effect_size_is_eta_squared_h(self):
        rng = np.random.default_rng(1)
        groups = [
            rng.normal(0.0, 1.0, size=30),
            rng.normal(0.5, 1.0, size=30),
            rng.normal(1.0, 1.0, size=30),
        ]
        result = self.engine._exec_kruskal_wallis(groups, alpha=0.05)
        expected = _kw_eta_sq_h_reference(groups)
        self.assertAlmostEqual(result.effect_size, expected, places=10)

    def test_label_no_longer_says_epsilon_squared(self):
        groups = [
            np.array([1.0, 2.0, 3.0, 4.0, 5.0]),
            np.array([3.0, 4.0, 5.0, 6.0, 7.0]),
            np.array([5.0, 6.0, 7.0, 8.0, 9.0]),
        ]
        result = self.engine._exec_kruskal_wallis(groups, alpha=0.05)
        # Must NOT call the unbiased eta^2 formula "Epsilon-squared".
        self.assertNotEqual(result.effect_size_name, "Epsilon-squared")
        # Must mention eta in some form.
        self.assertIn("eta", result.effect_size_name.lower())

    def test_epsilon_squared_reported_in_additional(self):
        rng = np.random.default_rng(2)
        groups = [rng.normal(0.0, 1.0, size=20) for _ in range(4)]
        result = self.engine._exec_kruskal_wallis(groups, alpha=0.05)
        self.assertIn("epsilon_squared", result.additional)
        expected_eps = _kw_epsilon_sq_reference(groups)
        self.assertAlmostEqual(
            result.additional["epsilon_squared"], expected_eps, places=10
        )

    def test_n_total_in_additional(self):
        groups = [np.arange(7, dtype=float), np.arange(7, 14, dtype=float)]
        result = self.engine._exec_kruskal_wallis(groups, alpha=0.05)
        self.assertEqual(result.additional["n_total"], 14)

    def test_eta_squared_h_in_zero_one_range(self):
        rng = np.random.default_rng(3)
        groups = [
            rng.normal(0.0, 1.0, size=40),
            rng.normal(2.0, 1.0, size=40),  # large separation
        ]
        result = self.engine._exec_kruskal_wallis(groups, alpha=0.05)
        # Unbiased eta^2 is in [0, 1] for non-degenerate inputs.
        self.assertGreaterEqual(result.effect_size, 0.0)
        self.assertLessEqual(result.effect_size, 1.0)
