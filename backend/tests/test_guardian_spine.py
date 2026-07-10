"""
Regression tests for the Guardian product spine (design-aware assumption
checking and recommendation), covering the blockers/majors found in the
2026-07-10 spine audit:

  [1] paired-t normality must be tested on the paired DIFFERENCES, not the raw
      columns (silently passed a violated assumption before).
  [2] between-subjects ANOVA must NOT recommend Friedman (a repeated-measures
      test); repeated-measures ANOVA may.
  [3] a one-sample t-test must not recommend Mann-Whitney / Welch (two-sample
      tests) — the report methods text was fabricating a two-sample method.
  [8] ANOVA must check outliers on the same footing as the t-test.
  [9] one catastrophically non-normal group must be flagged 'critical', not
      demoted to 'warning' because a co-group is normal.
  [10] recommendations must be design-aware at the backend so every consumer
      inherits the correct list.
"""

import numpy as np
from django.test import SimpleTestCase

from core.guardian.guardian_core import GuardianCore


class DesignAwareRecommendations(SimpleTestCase):
    def setUp(self):
        self.g = GuardianCore()
        self.rng = np.random.RandomState(20260710)

    def _nonnormal(self, n=40):
        return self.rng.exponential(1.0, n)

    def test_one_sample_recommends_one_sample_nonparametric(self):  # [3][10]
        rep = self.g.check([self._nonnormal()], "t_test", design="one_sample")
        self.assertIn("wilcoxon_signed_rank", rep.alternative_tests)
        self.assertNotIn("mann_whitney", rep.alternative_tests)
        self.assertNotIn("welch_t_test", rep.alternative_tests)

    def test_one_sample_inferred_from_single_array(self):  # [3]
        # Even without an explicit design, a single array is one-sample, so
        # Mann-Whitney (two-sample) must not be offered.
        rep = self.g.check([self._nonnormal()], "t_test")
        self.assertNotIn("mann_whitney", rep.alternative_tests)

    def test_paired_recommends_wilcoxon_not_mann_whitney(self):  # [10]
        a = self.rng.normal(50, 10, 40)
        b = a + self.rng.exponential(3, 40)
        rep = self.g.check([a, b], "t_test", design="paired")
        self.assertIn("wilcoxon_signed_rank", rep.alternative_tests)
        self.assertNotIn("mann_whitney", rep.alternative_tests)

    def test_independent_recommends_mann_whitney(self):
        rep = self.g.check([self._nonnormal(), self._nonnormal()], "t_test", design="independent")
        self.assertIn("mann_whitney", rep.alternative_tests)

    def test_between_anova_excludes_friedman(self):  # [2]
        groups = [self._nonnormal(), self._nonnormal(), self._nonnormal()]
        rep = self.g.check(groups, "anova")
        self.assertIn("kruskal_wallis", rep.alternative_tests)
        self.assertNotIn("friedman", rep.alternative_tests)

    def test_repeated_anova_may_offer_friedman(self):  # [2]
        groups = [self._nonnormal(), self._nonnormal(), self._nonnormal()]
        rep = self.g.check(groups, "anova", design="repeated")
        self.assertIn("friedman", rep.alternative_tests)


class DesignAwareAssumptions(SimpleTestCase):
    def setUp(self):
        self.g = GuardianCore()
        self.rng = np.random.RandomState(11)

    def test_paired_normality_on_differences_false_negative(self):  # [1]
        # Raw columns ~normal but the paired differences are strongly non-normal:
        # a paired design must flag normality (the old raw-column check missed it).
        a = self.rng.normal(50, 10, 50)
        b = a + self.rng.exponential(4, 50)  # differences = -exponential (skewed)
        rep = self.g.check([a, b], "t_test", design="paired")
        self.assertTrue(any(v.assumption == "normality" for v in rep.violations))
        # variance homogeneity does not apply to a paired (one-sample) design
        self.assertNotIn("variance_homogeneity", rep.assumptions_checked)

    def test_anova_checks_outliers(self):  # [8]
        a = self.rng.normal(10, 1, 30)
        b = self.rng.normal(10, 1, 30)
        c = self.rng.normal(10, 1, 30).copy()
        c[0] = 500.0
        rep = self.g.check([a, b, c], "anova")
        self.assertIn("outliers", rep.assumptions_checked)
        self.assertTrue(any(v.assumption == "outliers" for v in rep.violations))

    def test_one_severely_nonnormal_group_is_critical(self):  # [9]
        g1 = np.array([0.0] * 14 + [500.0])  # point mass + spike, Shapiro ~ 0
        g2 = self.rng.normal(0, 1, 15)
        rep = self.g.check([g1, g2], "anova")
        normality = [v for v in rep.violations if v.assumption == "normality"]
        self.assertTrue(normality)
        self.assertEqual(normality[0].severity, "critical")
        self.assertFalse(rep.can_proceed)
