"""
Regression tests for the shared missing-data mechanism classifier
(robustness audit 2026-06-04, F-08).

DataProfiler._analyze_missing_pattern previously INVERTED the MAR/MNAR mapping --
it labelled a weaker missingness/observed association (0.1-0.3) "MNAR" and a
stronger one (>0.3) "MAR" -- and so contradicted MissingDataHandler for the same
data. The mapping is now a single shared function
(missing_data_handler.classify_missing_mechanism) used by both, with the
conventional ordering (low->MCAR, mid->MAR, high->MNAR).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from core.missing_data_handler import (
    MissingPattern,
    classify_missing_mechanism,
)
from core.data_profiler import DataProfiler


class TestSharedMissingMechanismClassifier(SimpleTestCase):
    def test_threshold_ordering(self):
        # Increasing association -> MCAR -> MAR -> MNAR (the conventional order).
        self.assertEqual(classify_missing_mechanism(0.0), "MCAR")
        self.assertEqual(classify_missing_mechanism(0.05), "MCAR")
        self.assertEqual(classify_missing_mechanism(0.2), "MAR")
        self.assertEqual(classify_missing_mechanism(0.5), "MNAR")
        self.assertEqual(classify_missing_mechanism(0.95), "MNAR")

    def test_boundaries(self):
        self.assertEqual(classify_missing_mechanism(0.1), "MAR")   # >= 0.1
        self.assertEqual(classify_missing_mechanism(0.3), "MNAR")  # >= 0.3

    def test_codes_map_onto_handler_enum(self):
        # Every short code the classifier emits is a valid MissingPattern member.
        for corr in (0.0, 0.2, 0.6):
            code = classify_missing_mechanism(corr)
            self.assertIn(MissingPattern[code], MissingPattern)


class TestDataProfilerMechanismNotInverted(SimpleTestCase):
    def test_strong_association_is_mnar_not_mar(self):
        # Missingness in 'y' occurs exactly when observed 'x' is large -> a STRONG
        # association. Correct label is MNAR (suspected); the old inverted code
        # returned MAR for strong associations.
        x = np.arange(1, 101, dtype=float)
        y = x.copy()
        y[x > 50] = np.nan
        df = pd.DataFrame({"x": x, "y": y})

        profiler = DataProfiler(validate_against_r=False)
        self.assertEqual(profiler._analyze_missing_pattern(df), "MNAR")

    def test_no_association_is_mcar(self):
        # No missing values at all -> MCAR (assumed).
        df = pd.DataFrame({"x": np.arange(1, 51, dtype=float), "y": np.arange(1, 51, dtype=float)})
        profiler = DataProfiler(validate_against_r=False)
        self.assertEqual(profiler._analyze_missing_pattern(df), "MCAR")
