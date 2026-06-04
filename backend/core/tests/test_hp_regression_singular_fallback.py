"""
Regression test for the singular-matrix ridge fallback (robustness audit 2026-06-04, F-11).

In linear_regression, when the normal-equation inverse fails, the code falls back
to ridge regularization and tries to record a warning. The warning line read
`warnings.append(...)`, but `warnings` is the imported stdlib module (not a list),
so it raised `AttributeError: module 'warnings' has no attribute 'append'` --
turning a recoverable singular-matrix case into a hard 500 and defeating the
graceful-degradation intent.

The fix records the fallback in a local list merged into RegressionResult.warnings.
This test forces the inverse to fail and asserts the fallback degrades gracefully
(no AttributeError) and surfaces the warning.
"""

from __future__ import annotations

import numpy as np
from django.test import SimpleTestCase

from core.hp_regression_comprehensive import HighPrecisionRegression

RIDGE_WARNING = "Matrix near singular, used ridge regularization"


class TestSingularMatrixFallback(SimpleTestCase):
    def setUp(self):
        self.reg = HighPrecisionRegression()
        rng = np.random.RandomState(0)
        x = rng.normal(size=40)
        self.X = x.reshape(-1, 1)
        self.y = 2.0 * x + 1.0 + rng.normal(scale=0.1, size=40)

    def test_well_conditioned_regression_has_no_singular_warning(self):
        result = self.reg.linear_regression(self.X, self.y, do_cv=False)
        self.assertNotIn(RIDGE_WARNING, result.warnings)
        self.assertTrue(result.coefficients)

    def test_singular_inverse_falls_back_to_ridge_with_warning(self):
        # Force ONLY the first inverse (the direct normal-equation solve) to fail,
        # so the ridge fallback -- which itself calls _matrix_inverse -- still works.
        orig_inverse = self.reg._matrix_inverse
        state = {"calls": 0}

        def fail_first(*args, **kwargs):
            state["calls"] += 1
            if state["calls"] == 1:
                raise np.linalg.LinAlgError("singular matrix (forced for test)")
            return orig_inverse(*args, **kwargs)

        self.reg._matrix_inverse = fail_first

        # Before the fix this raised AttributeError; it must now return a result.
        result = self.reg.linear_regression(self.X, self.y, do_cv=False)

        self.assertIn(RIDGE_WARNING, result.warnings)
        self.assertTrue(result.coefficients)  # ridge still produced coefficients
        self.assertGreaterEqual(state["calls"], 2)  # direct solve failed, ridge solved
