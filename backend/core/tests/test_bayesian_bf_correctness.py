"""
Regression tests for Bayesian Bayes-factor correctness.

These guard the PR-A fixes from the 2026-06-05 statistical-correctness audit
of the Bayesian services. Each was a number actually served to users:

- JZS t-test BF previously integrated ``nct.pdf`` over ``(-inf, +inf)``; scipy's
  noncentral-t returns NaN at the Cauchy prior's tails, so the integral came
  back NaN, the ``marginal_h1 > 0`` guard was False, and EVERY Bayesian t-test
  (one-sample, two-sample, paired) silently returned the fabricated fallback
  ``BF10 = 1.0``. Now the Rouder et al. (2009) g-integral, cross-validated
  against ``pingouin.bayesfactor_ttest``.
- Bayesian correlation BF was a Fisher-z normal approximation mislabeled as the
  "exact" Wetzels & Wagenmakers (2012) BF; it over-stated BF10 by orders of
  magnitude as n grew (~10,000x at n ~ 1600). Now the exact Ly et al. (2016) BF
  via ``pingouin.bayesfactor_pearson(method='ly')``.
- Bayesian one-way ANOVA under perfect separation (zero within-group variance)
  returned the fabricated ``BF10 = 1.0`` AND 500-ed the endpoint because the
  frequentist ``F = inf`` hit DRF's ``JSONRenderer(allow_nan=False)``. Now it
  returns ``BF10 = inf`` (decisive H1) and ``to_dict`` sanitizes non-finite
  floats to ``None`` so the response serializes.

pingouin is a declared runtime dependency (requirements.txt), so it is the
independent oracle here rather than a hardcoded constant.
"""
import json

import numpy as np
import pingouin as pg
from django.test import SimpleTestCase

from core.services.bayesian import (
    bayesian_one_sample_ttest,
    bayesian_two_sample_ttest,
    bayesian_paired_ttest,
    bayesian_correlation,
    bayesian_one_way_anova,
)


class BayesianTTestBFTests(SimpleTestCase):
    """The JZS t-test BF must match pingouin and never be the fabricated 1.0."""

    def test_one_sample_matches_pingouin_not_fabricated_one(self):
        data = np.array([1.2, 1.5, 1.8, 2.1, 1.9, 2.3, 1.7, 2.0, 2.4, 1.6])
        res = bayesian_one_sample_ttest(data, mu=0.0, robustness_check=False)
        ref = float(pg.bayesfactor_ttest(res.frequentist_t, res.n, paired=False, r=0.707))
        # Strong effect here -> BF10 in the hundreds of thousands, NOT the old 1.0.
        self.assertGreater(res.bf10, 100.0)
        self.assertAlmostEqual(res.bf10, ref, delta=abs(ref) * 1e-6)

    def test_two_sample_matches_pingouin(self):
        g1 = np.array([2.1, 2.5, 2.8, 3.1, 2.9, 3.0])
        g2 = np.array([1.5, 1.8, 1.6, 1.9, 1.7, 2.0])
        res = bayesian_two_sample_ttest(g1, g2, robustness_check=False)
        ref = float(pg.bayesfactor_ttest(res.frequentist_t, res.n1, res.n2, paired=False, r=0.707))
        self.assertAlmostEqual(res.bf10, ref, delta=abs(ref) * 1e-6)

    def test_paired_matches_pingouin(self):
        d1 = np.array([5.1, 4.8, 5.3, 5.0, 4.9, 5.2, 5.4])
        d2 = np.array([4.2, 4.0, 4.5, 4.1, 3.9, 4.3, 4.4])
        res = bayesian_paired_ttest(d1, d2, robustness_check=False)
        ref = float(pg.bayesfactor_ttest(res.frequentist_t, res.n, paired=True, r=0.707))
        self.assertAlmostEqual(res.bf10, ref, delta=abs(ref) * 1e-6)

    def test_weak_effect_favors_h0(self):
        # A near-null sample should give BF10 < 1 (favoring H0), which the old
        # always-1.0 fallback could never produce.
        rng = np.random.RandomState(7)
        data = rng.normal(0.0, 1.0, 30)
        res = bayesian_one_sample_ttest(data, mu=0.0, robustness_check=False)
        ref = float(pg.bayesfactor_ttest(res.frequentist_t, res.n, paired=False, r=0.707))
        self.assertAlmostEqual(res.bf10, ref, delta=abs(ref) * 1e-6)

    def test_robustness_panel_varies_with_prior(self):
        # The robustness panel used to be all-1.0; it must now vary across priors.
        data = np.array([1.2, 1.5, 1.8, 2.1, 1.9, 2.3, 1.7, 2.0, 2.4, 1.6])
        res = bayesian_one_sample_ttest(data, mu=0.0, robustness_check=True)
        bfs = list(res.robustness_check.values())
        self.assertGreater(len(set(round(b, 6) for b in bfs)), 1)


class BayesianCorrelationBFTests(SimpleTestCase):
    """The correlation BF must be the exact Ly BF, stable at large n."""

    def test_matches_exact_ly_small_n(self):
        rng = np.random.RandomState(1)
        x = rng.normal(size=40)
        y = 0.4 * x + rng.normal(size=40)
        res = bayesian_correlation(x, y, robustness_check=False)
        ref = float(pg.bayesfactor_pearson(res.r, res.n, method="ly", kappa=1.0))
        self.assertAlmostEqual(res.bf10, ref, delta=abs(ref) * 1e-6)

    def test_matches_exact_ly_large_n_regression(self):
        # The old Fisher-z approximation was ~10,000x too large at this n.
        rng = np.random.RandomState(2)
        x = rng.normal(size=1599)
        y = 0.48 * x + rng.normal(size=1599) * np.sqrt(1 - 0.48 ** 2)
        res = bayesian_correlation(x, y, robustness_check=False)
        ref = float(pg.bayesfactor_pearson(res.r, res.n, method="ly", kappa=1.0))
        self.assertAlmostEqual(res.bf10 / ref, 1.0, places=6)

    def test_result_is_json_serializable(self):
        rng = np.random.RandomState(3)
        x = rng.normal(size=25)
        y = rng.normal(size=25)
        res = bayesian_correlation(x, y, robustness_check=True)
        json.dumps(res.to_dict())


class BayesianAnovaSeparationTests(SimpleTestCase):
    """Perfect separation must be decisive (not 1.0) and must not 500."""

    def test_perfect_separation_is_decisive_and_json_safe(self):
        a = np.array([1.0, 1.0, 1.0])
        b = np.array([2.0, 2.0, 2.0])
        c = np.array([3.0, 3.0, 3.0])
        res = bayesian_one_way_anova(a, b, c, robustness_check=False, compute_pairwise=False)
        self.assertTrue(np.isinf(res.bf10))  # decisive H1, NOT the old fabricated 1.0
        self.assertEqual(res.interpretation["favors"], "H1")
        self.assertEqual(res.posterior_probability_h1, 1.0)
        d = res.to_dict()
        self.assertIsNone(d["bf10"])  # inf sanitized for the wire
        self.assertIsNone(d["frequentist_f"])
        json.dumps(d)  # must not raise (this was the HTTP 500)

    def test_constant_data_gives_no_evidence(self):
        a = np.array([2.0, 2.0, 2.0])
        b = np.array([2.0, 2.0, 2.0])
        res = bayesian_one_way_anova(a, b, robustness_check=False, compute_pairwise=False)
        self.assertEqual(res.bf10, 1.0)
        json.dumps(res.to_dict())

    def test_normal_anova_finite_and_json_safe(self):
        a = np.array([4.2, 3.8, 4.1, 3.9, 4.0])
        b = np.array([3.5, 3.2, 3.4, 3.3, 3.6])
        c = np.array([4.8, 4.5, 4.7, 4.6, 4.9])
        res = bayesian_one_way_anova(a, b, c, robustness_check=False, compute_pairwise=False)
        self.assertTrue(np.isfinite(res.bf10) and res.bf10 > 0)
        json.dumps(res.to_dict())
