"""
Regression tests for small-p consistency checking (robustness audit 2026-06-04, F-06).

The exact-p overlap test in consistency_core.classify added a flat additive
tolerance (0.005) to both ends of the reported-p rounding interval. For small
reported p-values (<= ~0.01) that fixed slack is comparable to or larger than the
values being compared, so the inflated interval almost always overlapped the
near-zero statistic-implied interval -- and genuine reported-p transcription
errors in the sub-0.01 range slipped through as "consistent" (false negatives on
the product's headline statcheck-style feature).

The fix uses pure rounding-interval overlap (no additive slack) in the exact
branch; the rounding intervals already absorb legitimate rounding. These tests
pin that real small-p errors are now flagged while correctly-reported values
(including borderline and the inequality branch) remain consistent.
"""

from __future__ import annotations

from django.test import SimpleTestCase

from core.manuscript.consistency_core import classify


class TestSmallPConsistency(SimpleTestCase):
    def test_small_p_correlation_error_flagged_major(self):
        # r(48) = .67 implies p ~ 1e-7, not .002. Both are < alpha, so the
        # significance decision is unchanged -> 'major', not 'gross_error'.
        v = classify("r_value", 0.67, "0.67", 0.002, "0.002", "equals", 48, sample_size=50)
        self.assertFalse(v.is_consistent)
        self.assertEqual(v.severity, "major")

    def test_small_p_t_error_flagged_major(self):
        # t(100) = 4.0 implies p ~ 1.2e-4, not .005.
        v = classify("t_statistic", 4.0, "4.0", 0.005, "0.005", "equals", 100)
        self.assertFalse(v.is_consistent)
        self.assertEqual(v.severity, "major")

    def test_correctly_reported_small_p_stays_consistent(self):
        # The same statistic with the correctly-rounded p must NOT be flagged.
        v = classify("t_statistic", 4.0, "4.0", 0.000124, "0.000124", "equals", 100)
        self.assertTrue(v.is_consistent)
        self.assertEqual(v.severity, "none")

    def test_borderline_correct_p_no_false_positive(self):
        # t(48) = 2.0 -> p ~ .0512; reported .051 rounds correctly -> consistent.
        v = classify("t_statistic", 2.0, "2.0", 0.051, "0.051", "equals", 48)
        self.assertTrue(v.is_consistent)

    def test_inequality_branch_unaffected(self):
        # The inequality branch (p < .05 satisfied by recomputed ~.015) was
        # validated as correct and is untouched by the exact-branch fix.
        v = classify("t_statistic", 2.5, "2.5", 0.05, "0.05", "less_than", 60)
        self.assertTrue(v.is_consistent)
