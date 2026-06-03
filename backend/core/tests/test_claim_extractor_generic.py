"""Tests for generic statistic extraction (statistics without df + H/W/U).

Guards the enhancement that captures test statistics the strict df-requiring
patterns miss, links a nearby p-value, and deduplicates against the strict
patterns so fully-specified results are not double-counted.
"""

from django.test import TestCase

from core.manuscript.claim_extractor import StatisticalClaimExtractor


def _by_type(claims):
    out = {}
    for c in claims:
        out.setdefault(c.claim_type, []).append(c)
    return out


class GenericStatExtractionTests(TestCase):
    def setUp(self):
        self.ex = StatisticalClaimExtractor()

    def test_f_without_df_captured_with_merged_p(self):
        claims = self.ex.extract("One-way ANOVA: F = 1122.10, p = 1.34e-35.", "results")
        fs = _by_type(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertEqual(fs[0].statistic_value, 1122.10)
        self.assertEqual(fs[0].p_value, 1.34e-35)
        self.assertIsNone(fs[0].df)

    def test_kruskal_wallis_and_shapiro_wilk(self):
        text = "Shapiro-Wilk W = 0.793, p = 0.012. Kruskal-Wallis H = 36.59, p = 5.62e-08."
        bt = _by_type(self.ex.extract(text, "results"))
        self.assertEqual(len(bt.get("shapiro_wilk", [])), 1)
        self.assertEqual(len(bt.get("kruskal_wallis", [])), 1)
        self.assertEqual(bt["kruskal_wallis"][0].statistic_value, 36.59)
        self.assertEqual(bt["kruskal_wallis"][0].p_value, 5.62e-08)

    def test_mann_whitney_u(self):
        bt = _by_type(self.ex.extract("Mann-Whitney U = 41, p = 0.03.", "results"))
        self.assertEqual(len(bt.get("mann_whitney", [])), 1)
        self.assertEqual(bt["mann_whitney"][0].statistic_value, 41.0)

    def test_strict_f_with_df_not_double_counted(self):
        # The strict pattern captures this WITH df; the generic pass must not
        # add a second f_statistic claim for the same result.
        claims = self.ex.extract("A one-way ANOVA, F(2, 45) = 3.67, p = .034, was run.", "results")
        fs = _by_type(claims).get("f_statistic", [])
        self.assertEqual(len(fs), 1)
        self.assertEqual(fs[0].df, (2, 45))
        self.assertEqual(fs[0].statistic_value, 3.67)

    def test_plain_prose_not_misread_as_statistic(self):
        # "Figure 2 = ..." style tokens and bare p-values must not become
        # spurious statistic claims.
        claims = self.ex.extract("The result was significant (p = 0.04). See Figure 2.", "results")
        stat_claims = [c for c in claims if c.statistic_value is not None]
        self.assertEqual(stat_claims, [])

    def test_trailing_period_not_captured_in_p_value(self):
        # "p = .05." at a sentence boundary must yield p = 0.05, not 5.0
        # (the capture must not swallow the sentence-ending period).
        claims = self.ex.extract("A t-test, t(30) = 2.042, p = .05. Another sentence.", "results")
        tclaims = [c for c in claims if c.claim_type == "t_statistic"]
        self.assertEqual(len(tclaims), 1)
        self.assertEqual(tclaims[0].p_value, 0.05)
