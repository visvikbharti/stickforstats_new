"""
A sample size that is one subject too small, and never says so.

Power analysis is the one calculation whose entire purpose is to be run BEFORE the data exist.
If it returns a number that is too small, nothing downstream can detect that: the study is run,
it is underpowered, it misses the effect, and the result is filed as a negative finding. There is
no residual to inspect and no diagnostic that fires. The only defence is that the number was right
when it was printed.

The browser computed it with the normal-approximation closed form

    n = ceil(2 * ((z_alpha/2 + z_beta) / d)^2)

which for the single most common power analysis in the literature -- d = 0.5, alpha = 0.05,
power = 0.80 -- returns 63. The answer is 64. At n = 63 the true power is 0.7952, not the 0.80
the researcher asked for and believes they have. The formula ignores that the t-distribution has
heavier tails than the normal and that its critical value depends on n, which is precisely what
makes this hard and precisely what the approximation drops.

These tests pin the sample-size solvers to the exact non-central power functions, and pin the
BOUNDARY: power(n) >= target > power(n - 1). Not "close to", not "approximately" -- the exact
integer, certified in the arithmetic that produced it.
"""

from __future__ import annotations

import json

from django.test import TestCase, override_settings
from statsmodels.stats.power import FTestAnovaPower, TTestIndPower

from core.hp_power_analysis_comprehensive import HighPrecisionPowerAnalysis


class SampleSizeIsTheExactBoundary(TestCase):
    def setUp(self):
        self.engine = HighPrecisionPowerAnalysis()

    def _assert_is_the_boundary(self, n, power_at, target=0.8):
        """n is the answer iff it meets the target and n - 1 does not. Nothing else is."""
        self.assertGreaterEqual(power_at(n), target, f"n={n} does not actually reach {target}")
        self.assertLess(power_at(n - 1), target, f"n={n} is one larger than it needs to be")

    def test_the_textbook_t_test_case_is_64_and_not_63(self):
        # The bug, in one assertion. The browser's closed form gives 63.
        result = self.engine.calculate_sample_size_t_test(
            effect_size=0.5, power=0.8, alpha=0.05, test_type="independent"
        )
        n = result["required_sample_size"]

        self.assertEqual(n, 64)

        # And 63 -- the number the app used to print -- really is underpowered.
        power_at_63 = float(
            self.engine.calculate_power_t_test(
                effect_size=0.5, sample_size=63, alpha=0.05, test_type="independent"
            )["power_float"]
        )
        self.assertLess(power_at_63, 0.8)
        self.assertAlmostEqual(power_at_63, 0.7951, places=3)

        # statsmodels agrees on the boundary.
        self.assertEqual(int(-(-TTestIndPower().solve_power(0.5, power=0.8, alpha=0.05) // 1)), 64)

    def test_anova_sample_size_is_exact(self):
        for f, k in [(0.25, 4), (0.40, 3), (0.10, 5)]:
            with self.subTest(cohens_f=f, groups=k):
                n = self.engine.calculate_sample_size_anova(effect_size=f, groups=k, power=0.8, alpha=0.05)[
                    "required_sample_size"
                ]

                def power_at(n_i, f=f, k=k):
                    return float(
                        self.engine.calculate_power_anova(
                            effect_size=f, groups=k, n_per_group=n_i, alpha=0.05
                        )["power_float"]
                    )

                self._assert_is_the_boundary(n, power_at)

                # ...and it is the same boundary statsmodels' continuous solve rounds up to.
                reference = FTestAnovaPower().solve_power(effect_size=f, k_groups=k, alpha=0.05, power=0.8)
                self.assertEqual(n, int(-(-(reference / k) // 1)))

    def test_correlation_sample_size_is_exact(self):
        for r in [0.3, 0.5, 0.1]:
            with self.subTest(r=r):
                n = self.engine.calculate_sample_size_correlation(effect_size=r, power=0.8, alpha=0.05)[
                    "required_sample_size"
                ]

                def power_at(n_i, r=r):
                    return float(
                        self.engine.calculate_power_correlation(effect_size=r, sample_size=n_i, alpha=0.05)[
                            "power_float"
                        ]
                    )

                self._assert_is_the_boundary(n, power_at)

    def test_the_reported_power_is_the_power_at_the_reported_n(self):
        # The response carries both, and they must be the same computation -- otherwise the user
        # is shown a target ("80%") next to a sample size that does not deliver it.
        result = self.engine.calculate_sample_size_anova(effect_size=0.25, groups=4, power=0.8, alpha=0.05)

        recomputed = float(
            self.engine.calculate_power_anova(
                effect_size=0.25, groups=4, n_per_group=result["required_sample_size"], alpha=0.05
            )["power_float"]
        )
        self.assertAlmostEqual(result["actual_power_float"], recomputed, places=12)
        self.assertGreaterEqual(result["actual_power_float"], 0.8)

    def test_a_larger_effect_never_needs_a_larger_sample(self):
        # Monotonicity is what makes the bisection exact; if it ever failed, the search would
        # silently return the wrong integer rather than crash.
        sizes = [
            self.engine.calculate_sample_size_correlation(effect_size=r, power=0.8, alpha=0.05)[
                "required_sample_size"
            ]
            for r in (0.1, 0.2, 0.3, 0.5, 0.7)
        ]
        self.assertEqual(sizes, sorted(sizes, reverse=True))


@override_settings(SECURE_SSL_REDIRECT=False)
class SampleSizeEndpoints(TestCase):
    def _post(self, url, body):
        return self.client.post(url, data=json.dumps(body), content_type="application/json")

    def test_anova_endpoint(self):
        response = self._post(
            "/api/v1/power/sample-size/anova/",
            {"effect_size": 0.25, "groups": 4, "power": 0.8, "alpha": 0.05},
        )
        self.assertEqual(response.status_code, 200)

        results = response.json()["results"]
        self.assertEqual(results["sample_size_per_group"], 45)
        self.assertEqual(results["total_sample_size"], 180)
        self.assertGreaterEqual(results["actual_power_float"], 0.8)

    def test_correlation_endpoint(self):
        response = self._post(
            "/api/v1/power/sample-size/correlation/", {"effect_size": 0.3, "power": 0.8, "alpha": 0.05}
        )
        self.assertEqual(response.status_code, 200)

        results = response.json()["results"]
        self.assertEqual(results["required_sample_size"], 85)
        self.assertGreaterEqual(results["actual_power_float"], 0.8)

    def test_an_impossible_request_is_a_400_with_a_reason(self):
        # Not a 500, and above all not a plausible-looking number. There IS no sample size that
        # gives power against an effect of exactly zero, and saying so is the honest answer.
        for body, url in [
            ({"effect_size": 0, "groups": 3}, "/api/v1/power/sample-size/anova/"),
            ({"effect_size": 0.3, "groups": 1}, "/api/v1/power/sample-size/anova/"),
            ({"effect_size": 0}, "/api/v1/power/sample-size/correlation/"),
            ({"effect_size": 1.0}, "/api/v1/power/sample-size/correlation/"),
        ]:
            with self.subTest(body=body):
                response = self._post(url, body)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.json())

    def test_a_missing_effect_size_is_a_400(self):
        for url in ("/api/v1/power/sample-size/anova/", "/api/v1/power/sample-size/correlation/"):
            with self.subTest(url=url):
                self.assertEqual(self._post(url, {"groups": 3}).status_code, 400)
