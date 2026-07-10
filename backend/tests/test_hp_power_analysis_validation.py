"""
Validation of HighPrecisionPowerAnalysis (the class wired to /api/v1/power/*)
against scipy / G*Power.

Guards defects that were shipping wrong or spuriously-precise power values:

  * t-test power approximated the non-central t distribution by shifting the
    CENTRAL t by the non-centrality parameter, accurate to only ~3 decimals
    (power came out 0.80138 instead of 0.80146 for d=0.5, n=64) while claiming
    50 decimals. Now uses the true non-central t CDF (Algorithm AS 243) at full
    mpmath precision.
  * _t_cdf / _t_ppf cast to float64 and called scipy, so the advertised extra
    digits were noise. Now computed via the regularized incomplete beta.
  * ANOVA and chi-square power cast to float64 (scipy ncf / ncx2). Now genuine
    Poisson-mixture CDFs in mpmath.
  * The sample-size solver nudged n by ratios and rounded, returning an
    under-powered n (63 instead of 64 for d=0.5, power=0.80). Now returns the
    smallest integer n whose power meets the target.

Expected values are scipy (== G*Power), not a prior run of this module.
"""

import math

from django.test import SimpleTestCase
from scipy import stats

from core.hp_power_analysis_comprehensive import HighPrecisionPowerAnalysis


def scipy_t_power(d, n, alpha=0.05, alternative="two-sided", kind="independent"):
    if kind == "independent":
        df = 2 * n - 2
        ncp = d * math.sqrt(n / 2)
    else:
        df = n - 1
        ncp = d * math.sqrt(n)
    if alternative == "two-sided":
        tc = stats.t.ppf(1 - alpha / 2, df)
        return 1 - stats.nct.cdf(tc, df, ncp) + stats.nct.cdf(-tc, df, ncp)
    if alternative == "greater":
        tc = stats.t.ppf(1 - alpha, df)
        return 1 - stats.nct.cdf(tc, df, ncp)
    tc = stats.t.ppf(alpha, df)
    return stats.nct.cdf(tc, df, ncp)


class TTestPowerValidation(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionPowerAnalysis()

    def test_power_matches_scipy_nct(self):
        cases = [
            (0.5, 64, "two-sided", "independent"),
            (0.8, 20, "two-sided", "independent"),
            (0.3, 50, "greater", "independent"),
            (0.5, 27, "two-sided", "paired"),
        ]
        for d, n, alt, kind in cases:
            r = self.calc.calculate_power_t_test(
                effect_size=d, sample_size=n, alternative=alt, test_type=kind
            )
            expected = scipy_t_power(d, n, alternative=alt, kind=kind)
            self.assertAlmostEqual(
                r["power_float"], expected, places=10, msg=f"d={d} n={n} {alt} {kind}"
            )

    def test_not_the_old_shift_approximation(self):
        # The shifted-central-t approximation gave 0.80138; the true value is
        # 0.80146. Guard the 4th decimal so the approximation can't return.
        r = self.calc.calculate_power_t_test(effect_size=0.5, sample_size=64)
        self.assertAlmostEqual(r["power_float"], 0.8014595579222543, places=6)

    def test_precision_is_genuine_not_float64(self):
        # A true 50-digit computation carries meaningful digits past the 16th; a
        # float64-then-stringified value would be zero-padded there.
        r = self.calc.calculate_power_t_test(effect_size=0.5, sample_size=64)
        digits = r["power"].split(".")[1]
        self.assertGreater(len(digits), 20)
        self.assertNotEqual(digits[16:30], "0" * 14)


class SampleSizeSolverValidation(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionPowerAnalysis()

    def test_returns_minimal_sufficient_n(self):
        cases = [
            (0.5, 0.80, "two-sided", 64),
            (0.8, 0.90, "two-sided", 34),
            (0.2, 0.80, "two-sided", 394),
        ]
        for d, target, alt, expected_n in cases:
            r = self.calc.calculate_sample_size_t_test(
                effect_size=d, power=target, alternative=alt
            )
            n = r["required_sample_size"]
            self.assertEqual(n, expected_n, msg=f"d={d} power={target}")
            pn = self.calc.calculate_power_t_test(
                effect_size=d, sample_size=n, alternative=alt
            )["power_float"]
            pn1 = self.calc.calculate_power_t_test(
                effect_size=d, sample_size=n - 1, alternative=alt
            )["power_float"]
            self.assertGreaterEqual(pn, target)
            self.assertLess(pn1, target)


class OtherPowerValidation(SimpleTestCase):
    def setUp(self):
        self.calc = HighPrecisionPowerAnalysis()

    def test_anova_power_matches_scipy_ncf(self):
        r = self.calc.calculate_power_anova(effect_size=0.25, groups=3, n_per_group=52)
        d1, d2 = 2, 3 * 51
        ncp = 0.25 ** 2 * 156
        expected = 1 - stats.ncf.cdf(stats.f.ppf(0.95, d1, d2), d1, d2, ncp)
        self.assertAlmostEqual(r["power_float"], expected, places=10)

    def test_chi_square_power_matches_scipy_ncx2(self):
        r = self.calc.calculate_power_chi_square(effect_size=0.3, sample_size=100, df=1)
        expected = 1 - stats.ncx2.cdf(stats.chi2.ppf(0.95, 1), 1, 100 * 0.3 ** 2)
        self.assertAlmostEqual(r["power_float"], expected, places=10)
        # G*Power 3.1.9.7 reports 0.8508 for this configuration.
        self.assertAlmostEqual(r["power_float"], 0.8508, places=3)

    def test_correlation_power_reasonable(self):
        r = self.calc.calculate_power_correlation(effect_size=0.3, sample_size=84)
        # G*Power reports ~0.80 for r=0.3, N=84.
        self.assertAlmostEqual(r["power_float"], 0.7955, places=3)
