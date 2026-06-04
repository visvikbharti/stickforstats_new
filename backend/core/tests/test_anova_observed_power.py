"""
Tests for ANOVA observed (post-hoc) power (deferred-algorithm build 2026-06-05).

F-12 removed a fabricated heuristic (0.8 + 0.1*effect, else 0.5) and returned
None. Observed power is now computed for real via the non-central F distribution
(Cohen's f^2 = df1*F/df2; lambda = f^2 * N) and cross-validated against
statsmodels FTestAnovaPower. (Post-hoc power is a monotone transform of the
p-value and is reported for completeness, not as an a-priori power analysis.)
"""

from __future__ import annotations

from decimal import Decimal

import numpy as np
from django.test import SimpleTestCase

from core.hp_anova_comprehensive import HighPrecisionANOVA


class TestAnovaObservedPower(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionANOVA(precision=50)

    def test_matches_statsmodels_ftestanovapower(self):
        from statsmodels.stats.power import FTestAnovaPower

        for F, df1, df2 in [(8.0, 2, 27), (3.5, 3, 40), (1.2, 2, 57), (15.0, 2, 12), (5.0, 4, 100)]:
            mine = self.calc._calculate_power(Decimal(str(F)), df1, df2)
            cohen_f = np.sqrt(df1 * F / df2)
            sm = FTestAnovaPower().power(effect_size=cohen_f, nobs=df1 + df2 + 1, alpha=0.05, k_groups=df1 + 1)
            self.assertIsNotNone(mine)
            self.assertAlmostEqual(float(mine), float(sm), places=6, msg=f"F={F}, df=({df1},{df2})")

    def test_power_in_unit_interval(self):
        for F, df1, df2 in [(0.5, 2, 30), (50.0, 3, 40), (2.0, 5, 90)]:
            p = self.calc._calculate_power(Decimal(str(F)), df1, df2)
            self.assertIsNotNone(p)
            self.assertGreaterEqual(float(p), 0.0)
            self.assertLessEqual(float(p), 1.0)

    def test_no_fabrication_on_degenerate_input(self):
        # Non-positive df or F is undefined -> None (never a fabricated value).
        self.assertIsNone(self.calc._calculate_power(Decimal("5.0"), 0, 27))
        self.assertIsNone(self.calc._calculate_power(Decimal("5.0"), 2, 0))
        self.assertIsNone(self.calc._calculate_power(Decimal("0.0"), 2, 27))

    def test_one_way_anova_populates_real_observed_power(self):
        g1 = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        g2 = np.array([3.0, 4.0, 5.0, 6.0, 7.0])
        g3 = np.array([6.0, 7.0, 8.0, 9.0, 10.0])
        result = self.calc.one_way_anova(g1, g2, g3)
        self.assertIsNotNone(result.observed_power)
        self.assertGreaterEqual(float(result.observed_power), 0.0)
        self.assertLessEqual(float(result.observed_power), 1.0)
