"""
Regression test for ANOVA observed-power honesty (robustness audit 2026-06-04, F-12).

HighPrecisionANOVA._calculate_power returned a fabricated monotone heuristic
(0.8 + 0.1*effect when significant, else a flat 0.5) under the name "Observed
Power". A correct observed power needs the non-central F-distribution. Per the
"stop the harm now, build later" decision the method now returns None ("not
computed") so no fabricated power can ever be presented; generate_anova_report
omits the line when it is None.
"""

from __future__ import annotations

from decimal import Decimal

import numpy as np
from django.test import SimpleTestCase

from core.hp_anova_comprehensive import HighPrecisionANOVA, generate_anova_report


class TestAnovaObservedPowerNotFabricated(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionANOVA(precision=50)
        self.g1 = np.array([1.0, 2.0, 3.0, 4.0, 5.0])
        self.g2 = np.array([3.0, 4.0, 5.0, 6.0, 7.0])
        self.g3 = np.array([6.0, 7.0, 8.0, 9.0, 10.0])

    def test_calculate_power_returns_none_not_a_heuristic(self):
        # Significant and non-significant F both used to yield fabricated numbers
        # (0.8+ and 0.5 respectively); both must now be None.
        self.assertIsNone(self.calc._calculate_power(Decimal("50.0"), 2, 27))
        self.assertIsNone(self.calc._calculate_power(Decimal("0.1"), 2, 27))

    def test_one_way_result_observed_power_is_none(self):
        result = self.calc.one_way_anova(self.g1, self.g2, self.g3)
        self.assertIsNone(result.observed_power)

    def test_report_omits_observed_power_when_none(self):
        result = self.calc.one_way_anova(self.g1, self.g2, self.g3)
        report = generate_anova_report(result)
        self.assertNotIn("Observed Power", report)
