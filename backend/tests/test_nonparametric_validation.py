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


def _jonckheere_reference(groups, alternative):
    """
    Independent brute-force Jonckheere-Terpstra, straight from the definition.

    J counts concordant pairs (earlier group's value smaller, ties count a half);
    E[J] = (N^2 - sum n_i^2) / 4; Var[J] is the tie-corrected Hollander & Wolfe form.
    Deliberately written from the textbook rather than by refactoring the implementation,
    so it is a genuine cross-check and not a restatement of the same mistake.
    """
    g = [np.asarray(x, dtype=float) for x in groups]
    j_stat = sum(
        1.0 if a < b else (0.5 if a == b else 0.0)
        for i in range(len(g))
        for j in range(i + 1, len(g))
        for a in g[i]
        for b in g[j]
    )
    n = [len(x) for x in g]
    n_total = sum(n)
    expected = (n_total**2 - sum(x**2 for x in n)) / 4
    ties = [int(x) for x in np.unique(np.concatenate(g), return_counts=True)[1] if x > 1]

    variance = (
        n_total * (n_total - 1) * (2 * n_total + 5)
        - sum(x * (x - 1) * (2 * x + 5) for x in n)
        - sum(x * (x - 1) * (2 * x + 5) for x in ties)
    ) / 72
    if ties:
        variance += (
            sum(x * (x - 1) * (x - 2) for x in n) * sum(x * (x - 1) * (x - 2) for x in ties)
        ) / (36 * n_total * (n_total - 1) * (n_total - 2))
        variance += (sum(x * (x - 1) for x in n) * sum(x * (x - 1) for x in ties)) / (
            8 * n_total * (n_total - 1)
        )

    z = (j_stat - expected) / variance**0.5
    p = {
        "increasing": stats.norm.sf(z),
        "decreasing": stats.norm.cdf(z),
        "two-sided": 2 * stats.norm.sf(abs(z)),
    }[alternative]
    return j_stat, z, p


class JonckheereTerpstraValidation(SimpleTestCase):
    """
    Jonckheere-Terpstra was broken three ways at once and reported p ~= 1.0 for
    "increasing" on a textbook increasing trend:

      1. The J statistic was the SUM OF PAIRWISE MANN-WHITNEY U's -- i.e. it counted the
         pairs running the wrong way, so J came out inverted (7.5 instead of 292.5 on
         three ordered groups of ten).
      2. Var[J] summed the variances of those pairwise U's. They share observations and are
         not independent, so their variances do not add: sigma came out 22.91 where the
         correct value is 26.30, biasing |z| upward and making even the two-sided p wrong.
      3. `alternative` was accepted and then never used -- every caller got the two-sided p.

    Nothing tested it. These cases cross-check J, z and p against the definition.
    """

    def setUp(self):
        self.hp = HighPrecisionNonParametric()

    CASES = {
        "perfectly increasing, no ties": [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10], [11, 12, 13, 14, 15]],
        "perfectly decreasing, no ties": [[11, 12, 13, 14, 15], [6, 7, 8, 9, 10], [1, 2, 3, 4, 5]],
        "no trend": [[5, 9, 1, 7, 3], [8, 2, 6, 4, 10], [3, 7, 5, 9, 1]],
        "heavy ties": [[1, 1, 2, 2, 3], [2, 2, 3, 3, 3], [3, 3, 3, 4, 4]],
        "unequal n with ties": [[1, 2, 2], [2, 3, 3, 4, 4], [4, 5, 5, 6]],
    }

    def test_matches_the_definition_on_every_case_and_alternative(self):
        for name, groups in self.CASES.items():
            for alternative in ("increasing", "decreasing", "two-sided"):
                with self.subTest(case=name, alternative=alternative):
                    exp_j, exp_z, exp_p = _jonckheere_reference(groups, alternative)
                    got = self.hp.jonckheere_terpstra_test(
                        *[np.array(x, dtype=float) for x in groups], alternative=alternative
                    )
                    self.assertAlmostEqual(_f(got.test_statistic), exp_j, places=9)
                    self.assertAlmostEqual(_f(got.z_score), exp_z, places=9)
                    self.assertAlmostEqual(_f(got.p_value), exp_p, places=12)

    def test_an_increasing_trend_is_detected_as_increasing(self):
        """The bug in one assertion: this returned p = 0.99996 before the fix."""
        groups = [np.array(g, dtype=float) for g in self.CASES["perfectly increasing, no ties"]]
        r = self.hp.jonckheere_terpstra_test(*groups, alternative="increasing")
        self.assertLess(_f(r.p_value), 0.001)
        # J at its maximum, effect size at 1.0: every pair is concordant.
        self.assertAlmostEqual(_f(r.effect_size), 1.0, places=12)

    def test_a_decreasing_trend_is_not_reported_as_increasing(self):
        groups = [np.array(g, dtype=float) for g in self.CASES["perfectly decreasing, no ties"]]
        self.assertGreater(_f(self.hp.jonckheere_terpstra_test(*groups, alternative="increasing").p_value), 0.99)
        self.assertLess(_f(self.hp.jonckheere_terpstra_test(*groups, alternative="decreasing").p_value), 0.001)
        self.assertAlmostEqual(
            _f(self.hp.jonckheere_terpstra_test(*groups, alternative="increasing").effect_size), 0.0, places=12
        )

    def test_no_trend_gives_a_z_of_zero_and_an_effect_size_of_a_half(self):
        groups = [np.array(g, dtype=float) for g in self.CASES["no trend"]]
        r = self.hp.jonckheere_terpstra_test(*groups, alternative="two-sided")
        self.assertAlmostEqual(_f(r.z_score), 0.0, places=12)
        self.assertAlmostEqual(_f(r.effect_size), 0.5, places=12)
        self.assertAlmostEqual(_f(r.p_value), 1.0, places=12)

    def test_ties_are_corrected_for_not_ignored(self):
        groups = [np.array(g, dtype=float) for g in self.CASES["heavy ties"]]
        r = self.hp.jonckheere_terpstra_test(*groups, alternative="increasing")
        self.assertTrue(r.ties_present)
        self.assertTrue(r.ties_correction_applied)
        # The no-ties variance formula would give a different sigma; check we used the
        # tie-corrected one by comparing against the reference.
        _, exp_z, _ = _jonckheere_reference(self.CASES["heavy ties"], "increasing")
        self.assertAlmostEqual(_f(r.z_score), exp_z, places=9)

    def test_requires_at_least_three_groups(self):
        with self.assertRaises(ValueError):
            self.hp.jonckheere_terpstra_test(np.array([1.0, 2.0]), np.array([3.0, 4.0]))

    def test_p_value_is_a_decimal(self):
        groups = [np.array(g, dtype=float) for g in self.CASES["heavy ties"]]
        self.assertIsInstance(self.hp.jonckheere_terpstra_test(*groups).p_value, Decimal)


class PagesTrendValidation(SimpleTestCase):
    """
    Page's L used Var(L) = n*k^2*(k+1)*(k-1)/144 -- one factor of (k+1) short of the
    standard n*k^2*(k+1)^2*(k-1)/144. sigma was therefore too small by sqrt(k+1) and every
    |z| inflated by the same factor, so the test declared a significant trend on pure noise
    about ONE TIME IN FIVE at alpha = 0.05. It also hard-coded the increasing one-tailed
    p-value regardless of `alternative`, and its "effect size" used bounds that were neither
    the maximum nor the minimum attainable L.
    """

    def setUp(self):
        self.hp = HighPrecisionNonParametric()

    def test_null_distribution_is_standard_normal(self):
        """
        THE regression test. Under exchangeable treatments there is no trend, so z must be
        ~N(0, 1) and the test must reject at about the nominal rate. Before the fix this
        gave sd ~= 2.0 and a 21% false-positive rate for k = 3.
        """
        rng = np.random.default_rng(20260713)
        for k in (3, 4, 5):
            with self.subTest(k=k):
                z = np.array(
                    [_f(self.hp.pages_trend(rng.normal(size=(8, k))).z_score) for _ in range(1500)]
                )
                self.assertAlmostEqual(z.mean(), 0.0, delta=0.12)
                self.assertAlmostEqual(z.std(), 1.0, delta=0.08)
                # Nominal 5%; allow Monte-Carlo slack but nothing like the old 21%.
                self.assertLess((z > 1.645).mean(), 0.085)

    def test_variance_matches_the_standard_page_statistic(self):
        """z must equal (12L - 3nk(k+1)^2) / (k(k+1)*sqrt(n(k-1))) exactly."""
        data = [[1, 3, 2], [2, 1, 3], [1, 2, 3], [3, 1, 2], [1, 2, 3]]
        n, k = len(data), len(data[0])
        r = self.hp.pages_trend(data)
        expected_z = (12 * _f(r.test_statistic) - 3 * n * k * (k + 1) ** 2) / (
            k * (k + 1) * np.sqrt(n * (k - 1))
        )
        self.assertAlmostEqual(_f(r.z_score), float(expected_z), places=10)

    def test_perfect_increasing_trend(self):
        data = [[1, 2, 3]] * 3  # every subject ranks the treatments in order
        r = self.hp.pages_trend(data, alternative="increasing")
        # L is at its maximum: n*k*(k+1)*(2k+1)/6 = 3*3*4*7/6 = 42
        self.assertAlmostEqual(_f(r.test_statistic), 42.0, places=10)
        self.assertAlmostEqual(_f(r.effect_size), 1.0, places=10)
        self.assertLess(_f(r.p_value), 0.05)

    def test_perfect_decreasing_trend_is_not_called_increasing(self):
        data = [[3, 2, 1]] * 3
        self.assertGreater(_f(self.hp.pages_trend(data, alternative="increasing").p_value), 0.95)
        self.assertLess(_f(self.hp.pages_trend(data, alternative="decreasing").p_value), 0.05)
        self.assertAlmostEqual(_f(self.hp.pages_trend(data).effect_size), 0.0, places=10)

    def test_alternative_is_honoured(self):
        data = [[1, 2, 3], [1, 3, 2], [1, 2, 3], [2, 1, 3]]
        inc = _f(self.hp.pages_trend(data, alternative="increasing").p_value)
        dec = _f(self.hp.pages_trend(data, alternative="decreasing").p_value)
        two = _f(self.hp.pages_trend(data, alternative="two-sided").p_value)
        self.assertAlmostEqual(inc + dec, 1.0, places=10)
        self.assertAlmostEqual(two, 2 * min(inc, dec), places=10)

    def test_effect_size_is_a_half_when_there_is_no_trend(self):
        # A balanced Latin-square-ish design: rank sums are equal across treatments.
        data = [[1, 2, 3], [2, 3, 1], [3, 1, 2]]
        r = self.hp.pages_trend(data)
        self.assertAlmostEqual(_f(r.z_score), 0.0, places=10)
        self.assertAlmostEqual(_f(r.effect_size), 0.5, places=10)

    def test_requires_at_least_three_treatments(self):
        with self.assertRaises(ValueError):
            self.hp.pages_trend([[1, 2], [2, 1]])
