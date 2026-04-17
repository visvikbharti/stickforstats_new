"""
Unit tests for analyze.py.

Important distinction from study data: these tests use deliberately
synthetic inputs with KNOWN ground-truth outputs to verify the
computation is correct. They are not a substitute for, and are never
mixed into, the real retraction corpus analysis.

Run with:
    python -m pytest code/test_analyze.py -v
or (without pytest):
    python code/test_analyze.py
"""
from __future__ import annotations

import json
import unittest

import numpy as np
import pandas as pd

from analyze import (
    benjamini_hochberg,
    classify_outcome,
    mann_whitney_auc,
    matched_cluster_bootstrap_auc,
    per_rule_analysis,
    AUCResult,
    PRIMARY_AUC_FLOOR,
    PRIMARY_CI_LOWER_FLOOR,
)


class TestMannWhitneyAUC(unittest.TestCase):
    def test_perfect_separation_lower_case(self):
        # Protocol convention: lower SQS -> positive (case-like).
        case = np.array([10.0, 12.0, 15.0])
        ctrl = np.array([80.0, 82.0, 85.0])
        self.assertEqual(mann_whitney_auc(case, ctrl), 1.0)

    def test_perfect_anti_separation(self):
        # Controls have LOWER SQS than cases — if that happens in real data,
        # the classifier is actually running backward.
        case = np.array([80.0, 82.0, 85.0])
        ctrl = np.array([10.0, 12.0, 15.0])
        self.assertEqual(mann_whitney_auc(case, ctrl), 0.0)

    def test_no_information(self):
        case = np.array([50.0, 50.0, 50.0])
        ctrl = np.array([50.0, 50.0, 50.0])
        self.assertEqual(mann_whitney_auc(case, ctrl), 0.5)

    def test_empty(self):
        self.assertTrue(np.isnan(mann_whitney_auc(np.array([]), np.array([1.0]))))


class TestBootstrap(unittest.TestCase):
    def _build_matched_df(self, case_scores, ctrl_scores_per_case):
        rows = []
        for i, (cs, ctrls) in enumerate(
            zip(case_scores, ctrl_scores_per_case), start=1
        ):
            case_id = f"case_{i:04d}"
            rows.append(
                dict(
                    record_id=case_id,
                    **{"class": "case"},
                    case_id=None,
                    sqs_score=cs,
                )
            )
            for j, c in enumerate(ctrls, start=1):
                rows.append(
                    dict(
                        record_id=f"{case_id}_ctrl_{j}",
                        **{"class": "control"},
                        case_id=case_id,
                        sqs_score=c,
                    )
                )
        return pd.DataFrame(rows)

    def test_perfect_separation_auc_is_one(self):
        df = self._build_matched_df(
            case_scores=[10, 15, 20, 25, 30],
            ctrl_scores_per_case=[[70, 75]] * 5,
        )
        result = matched_cluster_bootstrap_auc(df, replicates=200, seed=42)
        self.assertAlmostEqual(result.auc, 1.0, places=3)
        self.assertGreaterEqual(result.ci_lower, 0.9)

    def test_random_data_auc_near_half(self):
        rng = np.random.default_rng(7)
        cases = rng.normal(50, 10, size=30).tolist()
        ctrls_nested = [rng.normal(50, 10, size=2).tolist() for _ in range(30)]
        df = self._build_matched_df(cases, ctrls_nested)
        result = matched_cluster_bootstrap_auc(df, replicates=500, seed=42)
        self.assertAlmostEqual(result.auc, 0.5, delta=0.15)

    def test_empty_frames(self):
        df = pd.DataFrame(
            {
                "record_id": [],
                "class": [],
                "case_id": [],
                "sqs_score": [],
            }
        )
        result = matched_cluster_bootstrap_auc(df, replicates=100, seed=0)
        self.assertTrue(np.isnan(result.auc))


class TestBenjaminiHochberg(unittest.TestCase):
    def test_known_example_from_original_paper(self):
        # Benjamini & Hochberg 1995 Table 1 style example.
        # With p-values [0.001, 0.01, 0.04, 0.05, 0.6], FDR=0.05,
        # threshold for rank k is 0.05 * k / 5 = [0.01, 0.02, 0.03, 0.04, 0.05].
        # p=0.001 <= 0.01: yes. p=0.01 <= 0.02: yes. p=0.04 <= 0.03: no.
        # p=0.05 <= 0.04: no. p=0.6 <= 0.05: no.
        # Largest k with pass is k=2, so first two rejected.
        p = np.array([0.001, 0.01, 0.04, 0.05, 0.6])
        reject = benjamini_hochberg(p, alpha=0.05)
        self.assertTrue(np.array_equal(reject, [True, True, False, False, False]))

    def test_empty(self):
        reject = benjamini_hochberg(np.array([]), alpha=0.05)
        self.assertEqual(len(reject), 0)


class TestPerRule(unittest.TestCase):
    def test_single_rule_case_fails_more(self):
        df = pd.DataFrame(
            {
                "record_id": [f"r{i}" for i in range(10)],
                "class": ["case"] * 5 + ["control"] * 5,
                "rules_missed": ["R1"] * 4 + [""] * 1 + [""] * 4 + ["R1"] * 1,
            }
        )
        out = per_rule_analysis(df)
        self.assertEqual(len(out), 1)
        row = out.iloc[0]
        self.assertEqual(row["rule_id"], "R1")
        self.assertEqual(row["case_fail"], 4)
        self.assertEqual(row["ctrl_fail"], 1)
        # One-sided Fisher should return a smallish p-value.
        self.assertLess(row["p_value"], 0.15)


class TestDecisionRule(unittest.TestCase):
    def test_positive_outcome(self):
        r = AUCResult(
            auc=0.75,
            ci_lower=0.65,
            ci_upper=0.85,
            n_bootstrap_replicates=2000,
            n_cases=200,
            n_controls=400,
        )
        self.assertEqual(classify_outcome(r), "POSITIVE")

    def test_partial_outcome_wide_ci(self):
        # Point estimate high but CI too wide: should be PARTIAL not POSITIVE.
        r = AUCResult(
            auc=0.72,
            ci_lower=0.55,
            ci_upper=0.89,
            n_bootstrap_replicates=2000,
            n_cases=50,
            n_controls=100,
        )
        self.assertEqual(classify_outcome(r), "PARTIAL")

    def test_null_outcome(self):
        # AUC < 0.60 lands in NULL per PROTOCOL §11.
        r = AUCResult(
            auc=0.55,
            ci_lower=0.45,
            ci_upper=0.65,
            n_bootstrap_replicates=2000,
            n_cases=200,
            n_controls=400,
        )
        self.assertEqual(classify_outcome(r), "NULL")
        # 0.60 ≤ AUC < 0.70 lands in PARTIAL.
        r2 = AUCResult(
            auc=0.62,
            ci_lower=0.52,
            ci_upper=0.72,
            n_bootstrap_replicates=2000,
            n_cases=200,
            n_controls=400,
        )
        self.assertEqual(classify_outcome(r2), "PARTIAL")

    def test_inconclusive_when_nan(self):
        r = AUCResult(
            auc=float("nan"),
            ci_lower=float("nan"),
            ci_upper=float("nan"),
            n_bootstrap_replicates=0,
            n_cases=0,
            n_controls=0,
        )
        self.assertEqual(classify_outcome(r), "INCONCLUSIVE")

    def test_primary_floor_constants_match_protocol(self):
        self.assertEqual(PRIMARY_AUC_FLOOR, 0.70)
        self.assertEqual(PRIMARY_CI_LOWER_FLOOR, 0.60)


if __name__ == "__main__":
    unittest.main(verbosity=2)
