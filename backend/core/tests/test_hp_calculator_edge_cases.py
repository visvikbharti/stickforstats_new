"""
Edge-case regression tests for HighPrecisionCalculator.t_statistic_two_sample.

Before this fix (audit 2026-05-31, ST-2), the two-sample t-test fabricated
statistics in degenerate cases: when the within-group variance (and thus the
standard error) was ~0 with a non-zero mean difference it returned a made-up
t = +/-999.999 and p = 1e-50, and it capped genuinely-large t-statistics to
999999.999. A statistics tool must not present invented numbers as results.

These tests pin the honest behaviour:
  * degenerate zero-variance groups -> t_statistic and p_value are None
    (undefined), flagged extreme_precision with an explanation;
  * a real, well-separated comparison -> a finite computed t and p, never the
    old fabricated sentinels.
"""

from __future__ import annotations

from decimal import Decimal

from django.test import SimpleTestCase

from core.high_precision_calculator import HighPrecisionCalculator


class TestTwoSampleTEdgeCases(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionCalculator()

    def test_zero_within_variance_returns_undefined_not_fabricated(self):
        # Each group is constant -> within-group variance 0 -> SE ~ 0, but the
        # group means differ, so t is mathematically undefined (divide by ~0).
        result = self.calc.t_statistic_two_sample([5.0, 5.0, 5.0], [8.0, 8.0, 8.0], equal_var=True)
        self.assertIsNone(result["t_statistic"])
        self.assertIsNone(result["p_value"])
        self.assertTrue(result.get("extreme_precision"))
        self.assertIn("undefined", result.get("interpretation", "").lower())

    def test_no_fabricated_sentinels_anywhere_in_result(self):
        result = self.calc.t_statistic_two_sample([5.0, 5.0, 5.0], [8.0, 8.0, 8.0], equal_var=True)
        for key in ("t_statistic", "p_value"):
            val = result[key]
            self.assertNotIn(
                val,
                (Decimal("999.999"), Decimal("-999.999"), Decimal("999999.999"),
                 Decimal("-999999.999"), Decimal("1e-50")),
                f"{key} still uses a fabricated sentinel value",
            )

    def test_identical_groups_report_no_difference(self):
        # Same constant in both groups -> SE ~ 0 AND mean_diff ~ 0 -> identical.
        result = self.calc.t_statistic_two_sample([5.0, 5.0, 5.0], [5.0, 5.0, 5.0], equal_var=True)
        self.assertEqual(result["t_statistic"], Decimal("0"))
        self.assertEqual(result["p_value"], Decimal("1.0"))

    def test_normal_case_returns_finite_real_values(self):
        # Well-separated groups with real variance -> a genuine finite t and p.
        result = self.calc.t_statistic_two_sample(
            [1.0, 2.0, 3.0, 4.0], [10.0, 11.0, 12.0, 13.0], equal_var=True
        )
        self.assertIsNotNone(result["t_statistic"])
        self.assertIsNotNone(result["p_value"])
        # t should be a real, large-magnitude separation (~ -9.86), not a cap.
        t = float(result["t_statistic"])
        self.assertLess(t, -5.0)
        self.assertNotEqual(abs(t), 999.999)
        self.assertNotEqual(abs(t), 999999.999)
        # p is a small positive probability, strictly between 0 and 1.
        p = float(result["p_value"])
        self.assertGreater(p, 0.0)
        self.assertLess(p, 0.01)
