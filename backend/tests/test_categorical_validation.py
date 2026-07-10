"""
Validation of the high-precision categorical tests against scipy.

Guards the McNemar regression: the exact branch (b+c < 25 discordant pairs --
the primary McNemar use case) called scipy.stats.binom_test, removed in scipy
1.12, so every small-sample McNemar run raised AttributeError and the endpoint
returned HTTP 500 instead of a result.
"""

from django.test import SimpleTestCase
from scipy import stats

from core.hp_categorical_comprehensive import HighPrecisionCategorical


class McNemarValidation(SimpleTestCase):
    def setUp(self):
        self.hp = HighPrecisionCategorical()

    def test_small_sample_exact_branch_does_not_crash(self):
        # b=3, c=8 -> b+c = 11 < 25, the branch that used to 500.
        r = self.hp.mcnemar_test([[20, 3], [8, 25]])
        expected = stats.binomtest(3, 11, 0.5, alternative="two-sided").pvalue
        self.assertAlmostEqual(float(r.p_value), float(expected), places=10)

    def test_exact_p_matches_scipy_binomtest_across_tables(self):
        for a, b, c, d in [(20, 2, 5, 13), (10, 4, 1, 9), (30, 6, 6, 30), (15, 0, 7, 8)]:
            r = self.hp.mcnemar_test([[a, b], [c, d]])
            if b + c < 25:
                expected = stats.binomtest(min(b, c), b + c, 0.5, alternative="two-sided").pvalue
                self.assertAlmostEqual(float(r.p_value), float(expected), places=10, msg=f"{b},{c}")

    def test_large_sample_uses_chi_square(self):
        # b+c >= 25 -> chi-square branch; just assert it returns a valid p in (0,1].
        r = self.hp.mcnemar_test([[50, 20], [10, 60]])
        self.assertGreater(float(r.p_value), 0.0)
        self.assertLessEqual(float(r.p_value), 1.0)
