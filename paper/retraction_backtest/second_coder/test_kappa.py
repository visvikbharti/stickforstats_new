"""Tests for compute_kappa.py.

Run with:
    cd paper/retraction_backtest/second_coder
    python -m unittest test_kappa -v
"""
from __future__ import annotations

import csv
import json
import math
import tempfile
import unittest
from pathlib import Path

import compute_kappa as ck


class TestCohensKappa(unittest.TestCase):
    def test_perfect_agreement_is_one(self):
        pairs = [("stat", "stat")] * 50 + [("nonstat", "nonstat")] * 50
        r = ck.cohens_kappa(pairs)
        self.assertAlmostEqual(r["kappa"], 1.0, places=6)
        self.assertAlmostEqual(r["p_o"], 1.0, places=6)
        self.assertEqual(r["n"], 100)
        self.assertEqual(ck.decision_from_kappa(r["kappa"]), "ACCEPT")

    def test_total_disagreement_is_negative(self):
        # Primary says stat for 50 rows, coder says nonstat. Primary says
        # nonstat for 50 rows, coder says stat. p_o = 0, p_e = 0.5, κ = -1.
        pairs = [("stat", "nonstat")] * 50 + [("nonstat", "stat")] * 50
        r = ck.cohens_kappa(pairs)
        self.assertLess(r["kappa"], 0.0)
        self.assertAlmostEqual(r["p_o"], 0.0, places=6)
        self.assertEqual(ck.decision_from_kappa(r["kappa"]), "HALT")

    def test_chance_level_is_near_zero(self):
        # With uniform-at-random independent coders on 2 classes, expected
        # κ ≈ 0. We construct 4 cells in the 2×2 matrix that yield p_e == p_o.
        pairs = (
            [("stat", "stat")] * 25
            + [("stat", "nonstat")] * 25
            + [("nonstat", "stat")] * 25
            + [("nonstat", "nonstat")] * 25
        )
        r = ck.cohens_kappa(pairs)
        self.assertAlmostEqual(r["kappa"], 0.0, places=6)

    def test_accept_adjudicate_halt_boundaries(self):
        # Construct cases at κ boundaries via hand-tuned cells. Exact
        # boundaries are harder to hit by construction; assert each tier
        # instead by picking unambiguous κ values.
        self.assertEqual(ck.decision_from_kappa(0.85), "ACCEPT")
        self.assertEqual(ck.decision_from_kappa(0.80), "ACCEPT")
        self.assertEqual(ck.decision_from_kappa(0.79), "ADJUDICATE")
        self.assertEqual(ck.decision_from_kappa(0.60), "ADJUDICATE")
        self.assertEqual(ck.decision_from_kappa(0.59), "HALT")
        self.assertEqual(ck.decision_from_kappa(0.0), "HALT")
        self.assertEqual(ck.decision_from_kappa(-0.3), "HALT")
        self.assertEqual(ck.decision_from_kappa(float("nan")), "INDETERMINATE")

    def test_ci_contains_point_estimate(self):
        pairs = (
            [("stat", "stat")] * 40
            + [("stat", "nonstat")] * 5
            + [("nonstat", "stat")] * 5
            + [("nonstat", "nonstat")] * 50
        )
        r = ck.cohens_kappa(pairs)
        self.assertGreaterEqual(r["ci95_high"], r["kappa"])
        self.assertLessEqual(r["ci95_low"], r["kappa"])
        # A healthy-sized sample with strong agreement should clear 0.60.
        self.assertGreater(r["kappa"], 0.6)

    def test_empty_input_is_nan(self):
        r = ck.cohens_kappa([])
        self.assertTrue(math.isnan(r["kappa"]))
        self.assertEqual(r["n"], 0)
        self.assertEqual(ck.decision_from_kappa(r["kappa"]), "INDETERMINATE")

    def test_single_label_input_is_nan(self):
        # If both coders only used 'stat', p_e = 1 and κ is undefined.
        pairs = [("stat", "stat")] * 10
        r = ck.cohens_kappa(pairs)
        self.assertTrue(math.isnan(r["kappa"]))

    def test_labels_outside_universe_are_dropped(self):
        pairs = [("stat", "stat"), ("stat", "fishfinger"), ("nonstat", "nonstat")]
        r = ck.cohens_kappa(pairs)
        # Only the 2 valid pairs are counted.
        self.assertEqual(r["n"], 2)


class TestConfusionMatrix(unittest.TestCase):
    def test_matrix_counts(self):
        pairs = [
            ("stat", "stat"),
            ("stat", "stat"),
            ("stat", "nonstat"),
            ("nonstat", "stat"),
            ("nonstat", "nonstat"),
            ("ambiguous", "ambiguous"),
        ]
        m = ck.confusion_matrix(pairs)
        self.assertEqual(m["stat"]["stat"], 2)
        self.assertEqual(m["stat"]["nonstat"], 1)
        self.assertEqual(m["nonstat"]["stat"], 1)
        self.assertEqual(m["nonstat"]["nonstat"], 1)
        self.assertEqual(m["ambiguous"]["ambiguous"], 1)
        # Zero cells remain zero, not missing.
        self.assertEqual(m["stat"]["ambiguous"], 0)


class TestPerClassAgreement(unittest.TestCase):
    def test_sensitivity_and_ppv(self):
        pairs = (
            [("stat", "stat")] * 8  # TP for stat
            + [("stat", "nonstat")] * 2  # FN for stat
            + [("nonstat", "stat")] * 1  # FP for stat
            + [("nonstat", "nonstat")] * 9
        )
        per_class = ck.per_class_agreement(pairs)
        # sensitivity = 8 / (8 + 2) = 0.8
        self.assertAlmostEqual(per_class["stat"]["sensitivity"], 0.8)
        # PPV = 8 / (8 + 1) = 0.888...
        self.assertAlmostEqual(per_class["stat"]["ppv"], 8 / 9)
        # specificity for 'stat' = n(both not stat) / n(primary not stat) = 9/10
        self.assertAlmostEqual(per_class["stat"]["specificity"], 0.9)


class TestCLIEndToEnd(unittest.TestCase):
    """End-to-end: write sheet + primary CSVs, run main, read the report."""

    def setUp(self):
        self.tmpdir = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmpdir.cleanup)
        self.root = Path(self.tmpdir.name)

        sheet = [
            # record_id, reason, your_label
            ("r001", "+Error in Analyses;", "stat"),
            ("r002", "+Error in Analyses;", "stat"),
            ("r003", "+Plagiarism of Text;", "nonstat"),
            ("r004", "+Plagiarism of Text;", "nonstat"),
            # Disagreement: primary says stat, coder says nonstat.
            ("r005", "+Error in Analyses;+Plagiarism;", "nonstat"),
            # Missing label — should be skipped.
            ("r006", "+Error in Data;", ""),
        ]
        primary = [
            ("r001", "stat"),
            ("r002", "stat"),
            ("r003", "nonstat"),
            ("r004", "nonstat"),
            ("r005", "stat"),
            ("r006", "stat"),
            # r007 only in primary — should not be flagged (labeling_sheet
            # is the source of truth for "what was asked").
            ("r007", "stat"),
        ]

        self.sheet_path = self.root / "labeling_sheet.csv"
        self.primary_path = self.root / "primary_labels.csv"

        with self.sheet_path.open("w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=[
                "record_id", "reason_raw", "journal", "retraction_doi",
                "original_doi", "your_label", "notes",
            ])
            w.writeheader()
            for rid, reason, label in sheet:
                w.writerow({
                    "record_id": rid,
                    "reason_raw": reason,
                    "journal": "J", "retraction_doi": "", "original_doi": "",
                    "your_label": label, "notes": "",
                })

        with self.primary_path.open("w", encoding="utf-8", newline="") as fh:
            w = csv.DictWriter(fh, fieldnames=["record_id", "primary_label"])
            w.writeheader()
            for rid, lab in primary:
                w.writerow({"record_id": rid, "primary_label": lab})

    def test_end_to_end_writes_reports(self):
        out_md = self.root / "kappa_report.md"
        out_json = self.root / "kappa_report.json"
        rc = ck.main([
            "--sheet", str(self.sheet_path),
            "--primary", str(self.primary_path),
            "--manifest", str(self.root / "_nonexistent.json"),
            "--out-md", str(out_md),
            "--out-json", str(out_json),
        ])
        self.assertEqual(rc, 0)
        self.assertTrue(out_md.exists())
        self.assertTrue(out_json.exists())

        data = json.loads(out_json.read_text(encoding="utf-8"))
        # 5 paired rows (r006 skipped). 4 agree, 1 disagrees.
        self.assertEqual(data["kappa"]["n"], 5)
        self.assertAlmostEqual(data["kappa"]["p_o"], 4 / 5)
        self.assertEqual(data["n_skipped"], 1)  # r006
        # r007 is only in primary — since labeling_sheet is the driver,
        # it isn't considered "missing in primary" from the sheet's POV.
        self.assertEqual(data["n_missing_in_primary"], 0)
        self.assertEqual(data["n_disagreements"], 1)

        md = out_md.read_text(encoding="utf-8")
        self.assertIn("Inter-Rater Reliability Report", md)
        self.assertIn("r005", md)  # disagreement listed
        self.assertIn("Decision (PROTOCOL §9.2)", md)


if __name__ == "__main__":
    unittest.main()
