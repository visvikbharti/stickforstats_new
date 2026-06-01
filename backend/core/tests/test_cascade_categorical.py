"""
Regression tests for the cascade engine's categorical-association executors.

Before this fix (audit 2026-05-31, ST-5 / F5):
  * _exec_chi_square / _exec_fisher_exact coerced the category arrays with
    .astype(int), which raised on string categories (e.g. "male"/"female") —
    exactly the NOMINAL columns routed to these tests — so the analysis failed
    silently;
  * _exec_fisher_exact, for r x c tables (>2x2), returned the chi-square
    statistic labeled "Odds Ratio", a meaningless mislabeling.

These tests pin the honest behaviour: string categories work, 2x2 Fisher runs a
real Fisher's exact test, and the >2x2 fallback is reported as chi-square with
Cramér's V (never a fake odds ratio).
"""

from __future__ import annotations

import numpy as np
from django.test import SimpleTestCase

from core.services.cascade_engine import AutonomousCascadeEngine


class TestCascadeCategorical(SimpleTestCase):
    def setUp(self):
        self.engine = AutonomousCascadeEngine()

    def _string_pair(self):
        a = np.array(["male", "female", "male", "female", "male", "female", "male", "female"], dtype=object)
        b = np.array(["yes", "no", "yes", "yes", "no", "no", "yes", "no"], dtype=object)
        return a, b

    def test_chi_square_handles_string_categories(self):
        a, b = self._string_pair()
        result = self.engine._exec_chi_square([a, b], 0.05)  # must not raise
        self.assertEqual(result.test_name, "Chi-Square Test of Independence")
        self.assertEqual(result.effect_size_name, "Cramer's V")
        self.assertIsInstance(result.statistic, float)
        self.assertIsInstance(result.p_value, float)

    def test_fisher_2x2_runs_real_fisher_exact(self):
        a, b = self._string_pair()
        result = self.engine._exec_fisher_exact([a, b], 0.05)
        self.assertEqual(result.test_name, "Fisher's Exact Test")
        self.assertEqual(result.effect_size_name, "Odds Ratio")
        # p-value is a valid probability in [0, 1]
        self.assertGreaterEqual(result.p_value, 0.0)
        self.assertLessEqual(result.p_value, 1.0)

    def test_fisher_rxc_falls_back_to_chisquare_not_fake_odds_ratio(self):
        c1 = np.array(["x", "y", "z", "x", "y", "z", "x", "y", "z"], dtype=object)
        c2 = np.array(["p", "q", "r", "q", "r", "p", "r", "p", "q"], dtype=object)
        result = self.engine._exec_fisher_exact([c1, c2], 0.05)
        # Must NOT mislabel the chi-square statistic as an Odds Ratio.
        self.assertNotEqual(result.effect_size_name, "Odds Ratio")
        self.assertEqual(result.effect_size_name, "Cramer's V")
        self.assertIn("Chi-Square", result.test_name)
        self.assertIsNotNone(result.degrees_of_freedom)
