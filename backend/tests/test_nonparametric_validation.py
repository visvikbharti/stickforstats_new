"""
Validation of the high-precision non-parametric tests against scipy.

Guards three defects that were shipping wrong p-values:

  * Mann-Whitney U: the hand-rolled exact CDF returned wrong p-values for small
    samples (the default path) -- p=0 on the module's own example, and a
    significance flip vs scipy on a large fraction of inputs. Now delegated to
    scipy (exact when no ties, tie/continuity-corrected asymptotic otherwise).
  * Mann-Whitney U: the tie-corrected variance (z-score) omitted the n1*n2
    factor, so ties were effectively ignored.
  * Friedman: reported the chi-square statistic but a p-value from the
    Iman-Davenport F transform (mismatched), omitted the tie correction, and
    collapsed to p=1.0 for perfectly concordant (maximally significant) data.

Expected values are scipy, not a prior run of this module.
"""

from decimal import Decimal

import numpy as np
from django.test import SimpleTestCase
from scipy import stats

from core.hp_nonparametric_comprehensive import HighPrecisionNonParametric


def _f(x):
    return float(x)


class MannWhitneyValidation(SimpleTestCase):
    def setUp(self):
        self.hp = HighPrecisionNonParametric()

    def test_no_ties_small_sample_matches_scipy_exact(self):
        x, y = [1, 2, 3, 4, 5], [6, 7, 8, 9, 10]
        r = self.hp.mann_whitney_u(x, y)
        expected = stats.mannwhitneyu(x, y, alternative="two-sided", method="exact").pvalue
        self.assertAlmostEqual(_f(r.p_value), _f(expected), places=10)

    def test_audit_false_positive_case_is_no_longer_significant(self):
        # Previously the module reported p=0.0290 (SIGNIFICANT); scipy says ~0.16.
        x, y = [3, 15, 6, 1, 0], [17, 13, 19, 3, 8, 2, 7, 2, 20]
        r = self.hp.mann_whitney_u(x, y)
        expected = stats.mannwhitneyu(x, y, alternative="two-sided", method="asymptotic").pvalue
        self.assertAlmostEqual(_f(r.p_value), _f(expected), places=9)
        self.assertGreater(_f(r.p_value), 0.05)  # not significant

    def test_clearly_separated_groups_are_not_reported_as_p_zero(self):
        x, y = list(range(1, 16)), list(range(20, 35))  # n1=n2=15, no ties
        r = self.hp.mann_whitney_u(x, y)
        expected = stats.mannwhitneyu(x, y, alternative="two-sided", method="exact").pvalue
        self.assertAlmostEqual(_f(r.p_value), _f(expected), places=10)
        self.assertGreater(_f(r.p_value), 0.0)  # a real tiny p, never exactly 0

    def test_one_sided_alternatives_match_scipy(self):
        x, y = [2, 4, 6, 8, 10], [1, 3, 5, 7, 9]
        for alt in ("less", "greater"):
            r = self.hp.mann_whitney_u(x, y, alternative=alt)
            expected = stats.mannwhitneyu(x, y, alternative=alt, method="exact").pvalue
            self.assertAlmostEqual(_f(r.p_value), _f(expected), places=10, msg=alt)

    def test_tie_corrected_variance_matches_scipy_asymptotic(self):
        # Many ties, n large enough to force the asymptotic path in both.
        rng = np.random.RandomState(0)
        x = list(rng.randint(0, 5, size=25))
        y = list(rng.randint(0, 5, size=25))
        r = self.hp.mann_whitney_u(x, y)
        expected = stats.mannwhitneyu(x, y, alternative="two-sided", method="asymptotic").pvalue
        self.assertAlmostEqual(_f(r.p_value), _f(expected), places=9)

    def test_no_significance_flip_across_random_small_samples(self):
        # The core regression: on random small samples the decision must agree
        # with scipy's exact/asymptotic reference (the old CDF flipped ~26%).
        rng = np.random.RandomState(42)
        flips = 0
        for _ in range(200):
            n1, n2 = int(rng.randint(4, 10)), int(rng.randint(4, 10))
            x = list(rng.randint(0, 20, size=n1))
            y = list(rng.randint(0, 20, size=n2))
            has_ties = len(np.unique(x + y)) < n1 + n2
            method = "asymptotic" if has_ties else "exact"
            got = _f(self.hp.mann_whitney_u(x, y).p_value)
            ref = _f(stats.mannwhitneyu(x, y, alternative="two-sided", method=method).pvalue)
            if (got < 0.05) != (ref < 0.05):
                flips += 1
        self.assertEqual(flips, 0)


class FriedmanValidation(SimpleTestCase):
    def setUp(self):
        self.hp = HighPrecisionNonParametric()

    def test_perfect_concordance_is_significant_not_p_one(self):
        # condition3 > condition2 > condition1 in every block: Kendall's W = 1.
        c = [[10, 12, 9, 11, 13, 8], [14, 15, 13, 16, 14, 12], [20, 22, 19, 21, 23, 18]]
        r = self.hp.friedman(*c)
        sp = stats.friedmanchisquare(*c)
        self.assertAlmostEqual(_f(r.chi_squared), _f(sp.statistic), places=9)
        self.assertAlmostEqual(_f(r.p_value), _f(sp.pvalue), places=9)
        self.assertLess(_f(r.p_value), 0.05)  # maximally significant, not p=1.0

    def test_tie_correction_matches_scipy(self):
        c = [[1, 2, 2, 3, 1], [2, 2, 3, 3, 2], [1, 1, 2, 2, 1]]
        r = self.hp.friedman(*c)
        sp = stats.friedmanchisquare(*c)
        self.assertAlmostEqual(_f(r.chi_squared), _f(sp.statistic), places=9)
        self.assertAlmostEqual(_f(r.p_value), _f(sp.pvalue), places=9)

    def test_statistic_and_p_value_are_consistent(self):
        # The reported statistic (chi-square) and p-value (chi-square, df=k-1)
        # must be from the same distribution -- recompute p from the statistic.
        # Three conditions (k=3), eight subjects (n=8).
        c = [
            [85, 88, 80, 92, 78, 90, 83, 86],  # condition 1
            [90, 92, 85, 95, 82, 93, 88, 91],  # condition 2
            [70, 75, 68, 80, 72, 78, 74, 76],  # condition 3
        ]
        r = self.hp.friedman(*c)
        k = len(c)
        p_from_stat = 1 - stats.chi2.cdf(_f(r.chi_squared), k - 1)
        self.assertAlmostEqual(_f(r.p_value), p_from_stat, places=10)
        self.assertAlmostEqual(_f(r.p_value), _f(stats.friedmanchisquare(*c).pvalue), places=9)

    def test_p_value_is_a_decimal(self):
        c = [[1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6]]
        r = self.hp.friedman(*c)
        self.assertIsInstance(r.p_value, Decimal)
