"""
Tests for Little's MCAR test (deferred-algorithm build 2026-06-05).

History: the original code fabricated chi2 = n*log(#patterns) (audit F-01); it
was then stubbed to return available:false; now it is a real EM-based Little's
(1988) test, cross-validated against R's naniar::mcar_test (Case A MCAR: chi2
15.350 vs 15.350; Case B not-MCAR: 77.787 vs 77.787; identical df + pattern
counts). These tests pin: (1) the statistic discriminates MCAR from non-MCAR,
(2) the result structure + df, (3) a frozen regression value for a seeded
dataset, (4) the no-missing trivial case.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from core.missing_data_handler import MissingDataHandler

MEAN = [10.0, 5.0, 20.0]
COV = [[4.0, 1.5, 0.5], [1.5, 3.0, 0.2], [0.5, 0.2, 5.0]]


def _mcar_frame(seed=23, n=120):
    rng = np.random.RandomState(seed)
    X = rng.multivariate_normal(MEAN, COV, size=n)
    A = X.copy()
    A[rng.rand(n, 3) < 0.15] = np.nan  # missingness independent of data -> MCAR
    return pd.DataFrame(A, columns=["v1", "v2", "v3"])


def _not_mcar_frame(seed=23, n=120):
    rng = np.random.RandomState(seed)
    X = rng.multivariate_normal(MEAN, COV, size=n)
    B = X.copy()
    B[X[:, 0] > np.percentile(X[:, 0], 60), 1] = np.nan  # v2 missing when v1 high -> NOT MCAR
    B[rng.rand(n) < 0.1, 2] = np.nan
    return pd.DataFrame(B, columns=["v1", "v2", "v3"])


class TestLittlesMcar(SimpleTestCase):
    def setUp(self):
        self.h = MissingDataHandler()

    def test_mcar_data_not_rejected(self):
        r = self.h._littles_mcar_test(_mcar_frame())
        self.assertTrue(r["available"])
        self.assertGreater(r["p_value"], 0.05)
        self.assertTrue(r["is_mcar"])

    def test_non_mcar_data_is_rejected(self):
        r = self.h._littles_mcar_test(_not_mcar_frame())
        self.assertTrue(r["available"])
        self.assertLess(r["p_value"], 0.05)
        self.assertFalse(r["is_mcar"])

    def test_structure_and_keys(self):
        r = self.h._littles_mcar_test(_mcar_frame())
        for key in ("chi2_statistic", "degrees_of_freedom", "p_value", "is_mcar", "n_missing_patterns"):
            self.assertIn(key, r)
        self.assertGreaterEqual(r["chi2_statistic"], 0.0)
        self.assertGreaterEqual(r["degrees_of_freedom"], 1)

    def test_frozen_regression_value_matches_naniar(self):
        # Seeded dataset; value cross-validated against R naniar::mcar_test (15.350).
        r = self.h._littles_mcar_test(_mcar_frame())
        self.assertEqual(r["degrees_of_freedom"], 9)
        self.assertEqual(r["n_missing_patterns"], 8)
        self.assertAlmostEqual(r["chi2_statistic"], 15.350, places=1)
        self.assertAlmostEqual(r["p_value"], 0.0818, places=2)

    def test_no_missing_values_is_trivially_mcar(self):
        df = pd.DataFrame({"a": [1.0, 2.0, 3.0, 4.0], "b": [2.0, 1.0, 4.0, 3.0]})
        r = self.h._littles_mcar_test(df)
        self.assertTrue(r["available"])
        self.assertTrue(r["is_mcar"])
        self.assertEqual(r["degrees_of_freedom"], 0)
