"""
The power of a rank test is not a number. It is a number PLUS an assumption.

There is no distribution-free closed form for the power of a Mann-Whitney, a Wilcoxon or a
Kruskal-Wallis: it depends on the shape of the distribution the data actually came from. The
standard approach -- the one G*Power takes -- is Pitman's asymptotic relative efficiency against
the parametric counterpart, for a STATED parent distribution:

    power_rank(n) ~= power_parametric(n * ARE)      n_rank ~= n_parametric / ARE

The browser did exactly this, with ARE = 3/pi, and never said so anywhere in the UI. That silence
is the bug, and it is worse than it sounds:

  * 3/pi = 0.955 is the ARE for a NORMAL parent -- an assumption that is absurd for a test the
    user reached for precisely BECAUSE normality failed.

  * And it points the WRONG WAY. Under normality the rank test is slightly less efficient, so you
    need ~5% more subjects. But under the heavy-tailed distributions that drive you off the
    t-test in the first place, the rank test is substantially MORE efficient: ARE 1.5 for a
    Laplace parent, 3.0 for an exponential one. Quoting the normal-parent number to a user with
    skewed data does not merely add error -- it inverts the conclusion, telling them to recruit
    68 subjects per group when 22 would do.

So the parent distribution is an explicit input, the ARE is returned with the answer, and the
assumption is stated in the response.
"""

from __future__ import annotations

import json

from django.test import TestCase, override_settings

from core.hp_power_analysis_comprehensive import HighPrecisionPowerAnalysis


class TheParentDistributionChangesTheAnswer(TestCase):
    def setUp(self):
        self.engine = HighPrecisionPowerAnalysis()

    def _n(self, parent):
        return self.engine.calculate_sample_size_nonparametric(
            test="mann-whitney", effect_size=0.5, power=0.8, alpha=0.05, parent_distribution=parent
        )["required_sample_size"]

    def test_a_heavy_tailed_parent_needs_FEWER_subjects_not_more(self):
        # This is the assertion the old code would have failed. It had ONE answer -- the normal
        # one -- and presented it for every kind of data.
        normal = self._n("normal")
        laplace = self._n("laplace")
        exponential = self._n("exponential")

        self.assertLess(laplace, normal)
        self.assertLess(exponential, laplace)

        # And the gap is not a rounding difference.
        self.assertEqual(normal, 68)
        self.assertEqual(laplace, 43)
        self.assertEqual(exponential, 22)

    def test_under_normality_the_rank_test_costs_about_five_percent_more(self):
        # The one case the old constant was right for.
        parametric = self.engine.calculate_sample_size_t_test(
            effect_size=0.5, power=0.8, alpha=0.05, test_type="independent"
        )["required_sample_size"]
        rank = self._n("normal")

        self.assertEqual(parametric, 64)
        self.assertGreater(rank, parametric)
        self.assertAlmostEqual(rank / parametric, 1 / 0.9549, places=1)

    def test_the_assumption_travels_with_the_answer(self):
        result = self.engine.calculate_sample_size_nonparametric(
            test="mann-whitney", effect_size=0.5, parent_distribution="laplace"
        )

        self.assertEqual(result["parent_distribution"], "laplace")
        self.assertAlmostEqual(result["are"], 1.5, places=10)
        self.assertIn("Pitman", result["method"])
        # The note must actually say what was assumed -- a caveat nobody can read is not a caveat.
        self.assertIn("laplace", result["note"])
        self.assertIn("Approximate", result["note"])

    def test_an_unknown_parent_distribution_is_refused(self):
        with self.assertRaises(ValueError):
            self.engine.calculate_sample_size_nonparametric(
                test="mann-whitney", effect_size=0.5, parent_distribution="banana"
            )

    def test_an_unknown_rank_test_is_refused(self):
        with self.assertRaises(ValueError):
            self.engine.calculate_power_nonparametric(test="banana", effect_size=0.5, sample_size=30)


class ChiSquareSampleSizeIsExact(TestCase):
    def setUp(self):
        self.engine = HighPrecisionPowerAnalysis()

    def test_it_is_the_boundary(self):
        result = self.engine.calculate_sample_size_chi_square(effect_size=0.3, df=2, power=0.8, alpha=0.05)
        n = result["required_sample_size"]

        def power_at(n_i):
            return float(
                self.engine.calculate_power_chi_square(effect_size=0.3, df=2, sample_size=n_i, alpha=0.05)[
                    "power_float"
                ]
            )

        self.assertGreaterEqual(power_at(n), 0.8)
        self.assertLess(power_at(n - 1), 0.8)


class MinimumDetectableEffectInvertsTheSampleSizeSolve(TestCase):
    def setUp(self):
        self.engine = HighPrecisionPowerAnalysis()

    def test_it_matches_statsmodels(self):
        from statsmodels.stats.power import TTestIndPower

        mde = self.engine.calculate_minimum_detectable_effect(
            test_type="t-test", sample_size=64, power=0.8, alpha=0.05
        )["minimum_detectable_effect_float"]

        self.assertAlmostEqual(mde, float(TTestIndPower().solve_power(nobs1=64, power=0.8, alpha=0.05)), places=6)

    def test_it_is_the_inverse_of_the_sample_size_solve(self):
        # We solved n = 45 per group for Cohen's f = 0.25. Asking the MDE at n = 45 must give back
        # (just under) 0.25 -- just under, because n = 45 delivers slightly MORE than 80% power,
        # so the smallest effect detectable at exactly 80% is slightly smaller than 0.25.
        mde = self.engine.calculate_minimum_detectable_effect(
            test_type="anova", sample_size=45, groups=4, power=0.8, alpha=0.05
        )["minimum_detectable_effect_float"]

        self.assertLess(mde, 0.25)
        self.assertAlmostEqual(mde, 0.25, places=2)


@override_settings(SECURE_SSL_REDIRECT=False)
class TheEndpoints(TestCase):
    def _post(self, url, body):
        return self.client.post(url, data=json.dumps(body), content_type="application/json")

    def test_nonparametric_sample_size(self):
        response = self._post(
            "/api/v1/power/sample-size/nonparametric/",
            {"test": "mann-whitney", "effect_size": 0.5, "power": 0.8, "parent_distribution": "laplace"},
        )
        self.assertEqual(response.status_code, 200)

        results = response.json()["results"]
        self.assertEqual(results["required_sample_size"], 43)
        self.assertEqual(results["parent_distribution"], "laplace")
        self.assertIn("note", results)

    def test_chi_square_sample_size(self):
        response = self._post(
            "/api/v1/power/sample-size/chi-square/", {"effect_size": 0.3, "df": 2, "power": 0.8}
        )
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()["results"]["actual_power_float"], 0.8)

    def test_minimum_detectable_effect(self):
        response = self._post("/api/v1/power/mde/", {"test_type": "t-test", "sample_size": 64, "power": 0.8})
        self.assertEqual(response.status_code, 200)
        self.assertAlmostEqual(
            response.json()["results"]["minimum_detectable_effect_float"], 0.499069, places=5
        )

    def test_the_power_curve_omits_points_it_cannot_compute(self):
        # A correlation needs n > 3 for the Fisher transform to exist. Those points are dropped,
        # not emitted at a placeholder value: a gap in a line is honest, a point at 0.001 is not.
        response = self._post(
            "/api/v1/power/curve/",
            {"test_type": "correlation", "effect_size": 0.3, "n_min": 2, "n_max": 20, "step": 1},
        )
        self.assertEqual(response.status_code, 200)

        points = response.json()["results"]["points"]
        self.assertTrue(all(point["n"] > 3 for point in points))
        self.assertTrue(all(point["power"] is not None for point in points))

    def test_the_curve_honours_the_t_test_variant(self):
        # power_curve() hardcoded `"independent"`, so a curve requested for a PAIRED design came
        # back as the independent one -- a different curve, drawn under the label of the design
        # the user actually chose. A paired t uses ncp = d*sqrt(n) and df = n - 1 rather than
        # d*sqrt(n/2) and df = 2n - 2, so it reaches a given power at roughly half the n: at
        # n = 40, d = 0.5 it has 0.869 power where the independent design has 0.598.
        def points(variant):
            response = self._post(
                "/api/v1/power/curve/",
                {
                    "test_type": "t-test",
                    "effect_size": 0.5,
                    "alpha": 0.05,
                    "n_min": 10,
                    "n_max": 70,
                    "step": 10,
                    "t_test_type": variant,
                },
            )
            self.assertEqual(response.status_code, 200)
            return {p["n"]: p["power"] for p in response.json()["results"]["points"]}

        independent = points("independent")
        paired = points("paired")

        self.assertNotEqual(independent, paired)
        for n in independent:
            self.assertGreater(paired[n], independent[n])

        self.assertAlmostEqual(paired[40], 0.8694, places=3)
        self.assertAlmostEqual(independent[40], 0.5981, places=3)

    def test_a_bad_parent_distribution_is_a_400(self):
        response = self._post(
            "/api/v1/power/sample-size/nonparametric/",
            {"test": "mann-whitney", "effect_size": 0.5, "parent_distribution": "banana"},
        )
        self.assertEqual(response.status_code, 400)
