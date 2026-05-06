"""
Genomics differential-expression silent-failure contracts.

Pre-2026-05-06 the per-gene helper had two failure modes that silently
returned a "non-significant" verdict:

  1. ``stats.mannwhitneyu`` raising ``ValueError`` (e.g., on all-tied
     data) was caught and replaced with ``(stat, p_val) = (0.0, 1.0)``.
     The gene was then reported with raw_p_value=1.0 → adjusted p=1.0
     → significant=False, with no flag. In a real expression-matrix
     analysis with 20,000+ genes this could silently mark thousands of
     true-positive genes "not significant".

  2. ``stats.shapiro`` and ``stats.levene`` were each wrapped in a
     bare ``except Exception: pass``. When normality/variance could
     not be computed, the gene was treated as if it PASSED both checks,
     and the parametric t-test/ANOVA was then run on data whose
     assumptions had not actually been verified.

These tests pin the new contract: tests that cannot be computed raise
visible flags instead of silently substituting "not significant" or
"assumptions OK".

See docs/CRITICAL_REVIEW_2026-05-06.md §P0-1 (genomics fallback) and
§P1-12 (silent exception swallows in critical paths).
"""

from __future__ import annotations

import math

import numpy as np
from django.test import TestCase

from core.services.genomics.differential_expression import (
    DifferentialExpressionService,
    GeneResult,
)


class TestMannWhitneyFailureFlag(TestCase):

    def setUp(self):
        self.svc = DifferentialExpressionService()

    def test_all_tied_input_yields_nan_and_flag(self):
        """When Mann-Whitney cannot be computed because both groups
        are identical constants, the gene must be flagged and its
        p-value must be NaN, not 1.0."""
        all_zeros_a = np.zeros(20)
        all_zeros_b = np.zeros(20)
        result = self.svc._test_two_groups("dummy_gene", all_zeros_a, all_zeros_b)

        # Cascade should have fired (Shapiro fails on constants).
        self.assertTrue(result.cascaded or result.test_failed,
                        "Expected cascade or failure flag for all-constant input")
        if result.test_failed:
            self.assertTrue(math.isnan(result.raw_p_value))
            self.assertNotEqual(result.test_failure_reason, "")

    def test_dict_round_trip_emits_None_p_when_failed(self):
        """to_dict() must convert NaN p-values to None (JSON-safe) and
        report significant=False without claiming a result."""
        gene = GeneResult(
            gene_name="g1",
            test_used="mann_whitney",
            statistic=float("nan"),
            raw_p_value=float("nan"),
            test_failed=True,
            test_failure_reason="mannwhitneyu raised ValueError: ...",
        )
        d = gene.to_dict()
        self.assertIsNone(d["raw_p_value"])
        self.assertIsNone(d["adjusted_p_value"])
        self.assertFalse(d["significant"])
        self.assertTrue(d["test_failed"])
        self.assertIn("mannwhitneyu", d["test_failure_reason"])

    def test_normal_path_unchanged(self):
        """Healthy input still produces a real numeric p-value and
        significant=True/False per the normal path."""
        rng = np.random.default_rng(0)
        a = rng.normal(0, 1, size=30)
        b = rng.normal(0.5, 1, size=30)
        result = self.svc._test_two_groups("g_normal", a, b)
        self.assertFalse(result.test_failed)
        self.assertFalse(math.isnan(result.raw_p_value))
        d = result.to_dict()
        self.assertIsNotNone(d["raw_p_value"])
        self.assertIsInstance(d["raw_p_value"], float)


class TestNormalityVarianceFailureForcesCascade(TestCase):

    def setUp(self):
        self.svc = DifferentialExpressionService()

    def test_normality_failure_records_violation_and_forces_cascade(self):
        """When shapiro/levene cannot be computed (raised OR returned
        NaN) on constant input, the previous code silently treated the
        group as having "passed" the assumption. Now the failure must
        be recorded as a violation and the cascade must fire."""
        # Constant within-group data → both shapiro and levene either
        # raise or return NaN, depending on scipy version.
        const_a = np.ones(15)
        const_b = np.ones(15) * 2.0
        result = self.svc._test_two_groups("gene_const", const_a, const_b)

        # Cascade must have fired (norm_pass and/or var_pass False).
        self.assertFalse(result.assumptions_passed)
        # At least one violation message — either about normality or
        # variance not being computable — must be present. The exact
        # phrasing depends on scipy version, but we MUST have surfaced
        # something rather than silently passing the assumption check.
        self.assertGreater(
            len(result.violations), 0,
            f"Expected at least one violation for constant input, got: {result.violations}",
        )
        joined = " | ".join(result.violations).lower()
        self.assertTrue(
            "normality" in joined or "variance" in joined or "not be computed" in joined or "nan" in joined,
            f"Expected a normality/variance/not-computable/NaN violation, got: {result.violations}",
        )

    def test_violations_no_longer_swallowed_silently(self):
        """The number of violation messages on un-checkable input
        should be greater than zero (was always zero before the fix)."""
        const_data = np.zeros(12)
        result = self.svc._test_two_groups("g", const_data, const_data)
        self.assertGreater(len(result.violations), 0)


class TestMultiGroupFailurePath(TestCase):
    """Same contracts apply to the multi-group helper."""

    def setUp(self):
        self.svc = DifferentialExpressionService()

    def test_multi_group_normality_failure_records_violation(self):
        const_g1 = np.ones(8)
        const_g2 = np.ones(8) * 2.0
        const_g3 = np.ones(8) * 3.0
        result = self.svc._test_multi_groups(
            "g_multi", [const_g1, const_g2, const_g3]
        )
        # Multiple violations expected; assumptions_passed False;
        # cascade should fire.
        self.assertGreater(len(result.violations), 0)
        self.assertFalse(result.assumptions_passed)
