"""
Regression tests for Little's MCAR test honesty (robustness audit 2026-06-04, F-01).

Before this fix, MissingDataHandler._littles_mcar_test returned
``chi2_stat = n * log(n_patterns)`` as a "Little's MCAR test" statistic, with a
derived p-value and a boolean ``is_mcar`` verdict. That quantity depends only on
the sample size and the number of missingness patterns -- NOT on the data values
-- so for any moderately large dataset the statistic was huge and the verdict
flipped to "not MCAR" regardless of the actual missingness mechanism. A
statistics tool must never present a fabricated value under the name of a real
statistical test.

Per the "stop the harm now, build the real test later" decision, the method now
returns an explicit ``available: False`` result with no fabricated statistic.
These tests pin that honest behaviour and guard against the fabrication
returning.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from core.missing_data_handler import MissingDataHandler


class TestLittlesMcarHonesty(SimpleTestCase):
    def setUp(self):
        self.handler = MissingDataHandler()

    @staticmethod
    def _df_with_missing(n_rows: int) -> pd.DataFrame:
        rng = np.random.RandomState(0)
        df = pd.DataFrame(
            {
                "a": rng.normal(size=n_rows),
                "b": rng.normal(size=n_rows),
                "c": rng.normal(size=n_rows),
            }
        )
        # Punch some holes so there is more than one missingness pattern.
        df.loc[df.index % 5 == 0, "b"] = np.nan
        df.loc[df.index % 7 == 0, "c"] = np.nan
        return df

    def test_returns_unavailable_not_a_fabricated_statistic(self):
        result = self.handler.littles_mcar_test(self._df_with_missing(40))
        self.assertIsInstance(result, dict)
        self.assertIs(result.get("available"), False)
        # A clear human-readable reason must accompany the unavailable result.
        self.assertIn("reason", result)
        self.assertTrue(result["reason"])

    def test_no_fabricated_keys_present(self):
        result = self.handler.littles_mcar_test(self._df_with_missing(40))
        for forbidden in ("chi2_statistic", "p_value", "degrees_of_freedom", "is_mcar"):
            self.assertNotIn(
                forbidden,
                result,
                msg=f"Fabricated MCAR field '{forbidden}' must not be returned",
            )

    def test_verdict_is_not_driven_by_sample_size(self):
        # The old bug grew chi2 = n*log(n_patterns) with n, flipping the verdict
        # purely on dataset size. The honest result must be identical (no verdict)
        # for a small and a large dataset with the same missingness structure.
        small = self.handler.littles_mcar_test(self._df_with_missing(20))
        large = self.handler.littles_mcar_test(self._df_with_missing(2000))
        self.assertIs(small.get("available"), False)
        self.assertIs(large.get("available"), False)
        self.assertNotIn("is_mcar", small)
        self.assertNotIn("is_mcar", large)

    def test_analyze_missing_patterns_surfaces_unavailable(self):
        # The API wrapper that the public /missing-data/detect/ endpoint uses must
        # also surface the honest unavailable result, not a fabricated verdict.
        out = self.handler.analyze_missing_patterns(self._df_with_missing(60), perform_tests=True)
        little = out.get("little_test_result")
        self.assertIsNotNone(little)
        self.assertIs(little.get("available"), False)
        self.assertNotIn("is_mcar", little)
