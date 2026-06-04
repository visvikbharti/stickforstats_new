"""
Cross-validation tests for the two-way and repeated-measures ANOVA implemented
in HighPrecisionANOVA (deferred-algorithm build 2026-06-05; previously these
raised NotImplementedError / returned an honest 501).

These pin the implementations against INDEPENDENT engines:
  * two-way  -> pingouin.anova (independent SS computation)
  * RM       -> statsmodels AnovaRM (independent F/p)
so a future regression that silently changes the numbers fails CI.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from django.test import SimpleTestCase

from core.hp_anova_comprehensive import HighPrecisionANOVA


class TestTwoWayAnova(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionANOVA(precision=50)
        rng = np.random.RandomState(7)
        self.n1, self.n2, self.ncell = 2, 3, 8
        self.cells, rows = [], []
        for i in range(self.n1):
            for j in range(self.n2):
                vals = rng.normal(loc=10 + 2 * i + 1.5 * j + 0.8 * (i * j), scale=2.0, size=self.ncell)
                self.cells.append(vals)
                for v in vals:
                    rows.append({"y": v, "f1": f"L{i}", "f2": f"L{j}"})
        self.long = pd.DataFrame(rows)

    def test_matches_pingouin_on_all_effects(self):
        import pingouin as pg
        out = self.calc.two_way_anova(self.cells, ["A0", "A1"], ["B0", "B1", "B2"], sum_of_squares_type=2)
        ref = pg.anova(data=self.long, dv="y", between=["f1", "f2"], detailed=True)
        ref_src = {"factor1": "f1", "factor2": "f2", "interaction": "f1 * f2"}
        for eff in out["effects"]:
            r = ref[ref["Source"] == ref_src[eff["name"]]]
            self.assertAlmostEqual(eff["f_statistic"], float(r["F"].iloc[0]), places=6, msg=eff["name"])
            self.assertAlmostEqual(eff["p_value"], float(r["p-unc"].iloc[0]), places=9, msg=eff["name"])

    def test_structure_and_partial_eta_squared_bounds(self):
        out = self.calc.two_way_anova(self.cells, ["A0", "A1"], ["B0", "B1", "B2"])
        self.assertEqual(out["anova_type"], "two_way")
        self.assertEqual(len(out["effects"]), 3)  # 2 main + interaction
        self.assertTrue(out["design"]["balanced"])
        for eff in out["effects"]:
            self.assertGreaterEqual(eff["partial_eta_squared"], 0.0)
            self.assertLessEqual(eff["partial_eta_squared"], 1.0)

    def test_rejects_wrong_cell_count(self):
        with self.assertRaises(ValueError):
            self.calc.two_way_anova(self.cells[:5], ["A0", "A1"], ["B0", "B1", "B2"])


class TestRepeatedMeasuresAnova(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionANOVA(precision=50)
        rng = np.random.RandomState(7)
        self.k, self.nsub = 4, 12
        base = rng.normal(0, 3, size=self.nsub)
        self.conds = [base + rng.normal(loc=0.7 * c, scale=1.5, size=self.nsub) for c in range(self.k)]

    def test_matches_statsmodels_anovarm(self):
        from statsmodels.stats.anova import AnovaRM
        out = self.calc.repeated_measures_anova(self.conds)
        rows = []
        for c, a in enumerate(self.conds):
            for s in range(self.nsub):
                rows.append({"subject": s, "cond": f"C{c}", "val": a[s]})
        ref = AnovaRM(data=pd.DataFrame(rows), depvar="val", subject="subject", within=["cond"]).fit().anova_table
        self.assertAlmostEqual(out["f_statistic"], float(ref["F Value"].iloc[0]), places=6)
        self.assertAlmostEqual(out["p_value"], float(ref["Pr > F"].iloc[0]), places=9)
        self.assertEqual(out["df_between"], self.k - 1)
        self.assertEqual(out["df_within"], (self.k - 1) * (self.nsub - 1))

    def test_sphericity_and_gg_fields_present(self):
        out = self.calc.repeated_measures_anova(self.conds)
        sph = out["sphericity"]
        self.assertIn("mauchly_w", sph)
        self.assertIn("assumption_met", sph)
        self.assertIn("epsilon", out["greenhouse_geisser"])
        # GG epsilon is in (0, 1]; recommended p basis is one of the two documented values.
        eps = out["greenhouse_geisser"]["epsilon"]
        self.assertTrue(0.0 < eps <= 1.0 + 1e-9)
        self.assertIn(out["recommended_p_basis"], ("uncorrected", "greenhouse_geisser"))

    def test_rejects_unequal_subject_counts(self):
        bad = [self.conds[0], self.conds[1][:-1]]
        with self.assertRaises(ValueError):
            self.calc.repeated_measures_anova(bad)


class TestManova(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionANOVA(precision=50)
        rng = np.random.RandomState(11)
        self.k, self.n = 3, 20
        self.dv0, self.dv1, self.labels = [], [], []
        for g in range(self.k):
            self.dv0 += list(rng.normal(10 + 1.5 * g, 2.0, self.n))
            self.dv1 += list(rng.normal(5 + 0.8 * g, 1.5, self.n))
            self.labels += [g] * self.n
        self.groups = [np.zeros(self.n) for _ in range(self.k)]  # lengths define the factor
        self.dvs = [np.array(self.dv0), np.array(self.dv1)]

    def test_wilks_lambda_matches_manual_sscp(self):
        # Independent check: Wilks' lambda = det(E) / det(E + H), where H is the
        # between-group and E the within-group sum-of-squares-and-cross-products.
        out = self.calc.manova(self.groups, self.dvs)
        X = np.column_stack([self.dv0, self.dv1])
        labels = np.array(self.labels)
        grand = X.mean(axis=0)
        H = np.zeros((2, 2))
        E = np.zeros((2, 2))
        for g in range(self.k):
            Xg = X[labels == g]
            mg = Xg.mean(axis=0)
            d = (mg - grand).reshape(-1, 1)
            H += len(Xg) * (d @ d.T)
            for row in Xg:
                e = (row - mg).reshape(-1, 1)
                E += e @ e.T
        wilks_manual = np.linalg.det(E) / np.linalg.det(E + H)
        self.assertAlmostEqual(out["test_statistics"]["wilks_lambda"]["value"], wilks_manual, places=8)

    def test_all_four_statistics_present_and_valid(self):
        out = self.calc.manova(self.groups, self.dvs)
        for key in ("wilks_lambda", "pillai_trace", "hotelling_lawley_trace", "roy_greatest_root"):
            self.assertIn(key, out["test_statistics"])
            st = out["test_statistics"][key]
            self.assertGreaterEqual(st["p_value"], 0.0)
            self.assertLessEqual(st["p_value"], 1.0)
        # A real group effect was injected -> Wilks should be significant.
        self.assertLess(out["test_statistics"]["wilks_lambda"]["p_value"], 0.05)

    def test_requires_at_least_two_dependent_variables(self):
        with self.assertRaises(ValueError):
            self.calc.manova(self.groups, [self.dvs[0]])
