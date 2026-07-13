"""
The bugs I introduced while fixing the bugs.

An adversarial pass over my own power-analysis diff found four P0s in it. Three were mine. They are
worth their own test file because they are the same failure modes I had just spent a day removing --
the fix is exactly as capable of lying as the thing it replaced, and nothing about having written it
carefully makes it true.

  1. `alternative` had the identical `else`-swallowing bug that `test_type` had. I guarded one
     parameter and left the other.
  2. A NaN drove a search, because every comparison against NaN is False.
  3. A left-tailed sample-size search never terminated, because I assumed power rises with n.
  4. A minimum detectable effect of 8.7e-18 was reported as a real answer.
"""

from __future__ import annotations

import json

import numpy as np
from django.test import TestCase, override_settings
from statsmodels.stats.power import TTestIndPower

from core.hp_power_analysis_comprehensive import HighPrecisionPowerAnalysis


@override_settings(SECURE_SSL_REDIRECT=False)
class AlternativeIsGuardedTheSameWayTestTypeIs(TestCase):
    URL = "/api/v1/power/t-test/"

    def _power(self, alternative):
        response = self.client.post(
            self.URL,
            data=json.dumps(
                {"effect_size": 0.5, "sample_size": 64, "alpha": 0.05, "alternative": alternative}
            ),
            content_type="application/json",
        )
        return response

    def test_the_uis_own_menu_value_did_not_mean_what_it_said(self):
        # The Effect Size & Power tab offered `<MenuItem value="one-sided">`. No mapping knew that
        # string, so it fell into the engine's
        #
        #     else:  # less
        #
        # and was computed as a LEFT-tailed test -- the tail pointing AWAY from the effect. For
        # d = 0.5, n = 64, alpha = 0.05 the screen reported 0.0% power, "Underpowered", for a design
        # whose actual power is 87.9%.
        #
        # This is the same bug as `test_type`'s bare `else`, which the very same commit fixed. I
        # guarded one parameter and not the other.
        response = self._power("one-sided")
        self.assertEqual(response.status_code, 200)

        power = response.json()["results"]["power_float"]
        self.assertAlmostEqual(power, 0.8786641914, places=8)  # the hypothesised direction
        self.assertGreater(power, 0.8)  # emphatically NOT 4.1e-06

    def test_two_sided_and_greater_are_unchanged(self):
        self.assertAlmostEqual(self._power("two-sided").json()["results"]["power_float"], 0.8014595579, places=8)
        self.assertAlmostEqual(self._power("greater").json()["results"]["power_float"], 0.8786641914, places=8)

    def test_less_is_still_available_and_still_means_less(self):
        # A left-tailed test is a legitimate thing to ask for. It just has to be asked for.
        power = self._power("less").json()["results"]["power_float"]
        self.assertLess(power, 1e-05)

    def test_an_unrecognized_alternative_is_a_400(self):
        response = self._power("banana")
        self.assertEqual(response.status_code, 400)
        self.assertIn("alternative", json.dumps(response.json()))


@override_settings(SECURE_SSL_REDIRECT=False)
class TheSampleSizeSearchTerminates(TestCase):
    def test_a_design_no_sample_size_can_satisfy_is_a_400_not_a_hang(self):
        # `calculate_sample_size_t_test` walked n upward until the power met the target:
        #
        #     while power_at(n) < target and n < 10_000_000:
        #         n += 1
        #
        # which assumes power RISES with n. For a one-sided test in the direction opposite to the
        # effect -- offered in the UI as "One-sided (mu1 < mu2)" -- it falls: 3.2e-03 at n = 10,
        # 6.2e-38 at n = 1000. The condition never became false, and at ~5 ms per exact evaluation
        # the walk to max_n is roughly FIFTEEN HOURS of CPU. One click, one pinned worker.
        response = self.client.post(
            "/api/v1/power/sample-size/t-test/",
            data=json.dumps({"effect_size": 0.5, "power": 0.8, "alpha": 0.05, "alternative": "less"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("opposite", response.json()["error"])

    def test_the_ordinary_case_still_returns_64(self):
        response = self.client.post(
            "/api/v1/power/sample-size/t-test/",
            data=json.dumps({"effect_size": 0.5, "power": 0.8, "alpha": 0.05}),
            content_type="application/json",
        )
        self.assertEqual(response.json()["results"]["required_sample_size"], 64)


class NaNNeverDrivesASearch(TestCase):
    def setUp(self):
        self.engine = HighPrecisionPowerAnalysis()

    def test_scipys_noncentral_t_returns_nan_and_we_do_not_pass_it_on(self):
        # scipy's `nct` returns NaN once the non-centrality gets large -- at n = 64 that is any
        # Cohen's d above about 1.5, an ordinary effect size. NaN then propagates silently, because
        # every comparison against it is False:
        #
        #   - it drove the minimum-detectable-effect bisection, which returned d = 6.44 (the EDGE
        #     OF THE NaN REGION) where the answer is 0.499;
        #   - and it dropped the entire high-effect end off every power curve, because a non-finite
        #     point is filtered out.
        for d in (1.5, 2.0, 6.44, 10.0):
            with self.subTest(d=d):
                value = self.engine._t_power_float(d, 64, 0.05, "independent", "two-sided")
                self.assertIsNotNone(value)
                self.assertTrue(np.isfinite(value))
                self.assertGreater(value, 0.99)

    def test_the_curve_keeps_its_large_effect_points(self):
        curve = self.engine.power_curve(test_type="t-test", effect_size=2.0, n_min=5, n_max=50, step=5)

        self.assertEqual(len(curve["points"]), 10)  # was 0: every point was NaN and got filtered
        self.assertTrue(all(np.isfinite(p["power"]) for p in curve["points"]))

    def test_the_minimum_detectable_effect_is_the_power_boundary_not_the_nan_boundary(self):
        mde = self.engine.calculate_minimum_detectable_effect(
            test_type="t-test", sample_size=64, power=0.8, alpha=0.05
        )["minimum_detectable_effect_float"]

        self.assertNotAlmostEqual(mde, 6.44, places=1)  # the NaN boundary
        self.assertAlmostEqual(mde, float(TTestIndPower().solve_power(nobs1=64, power=0.8, alpha=0.05)), places=6)


@override_settings(SECURE_SSL_REDIRECT=False)
class AnUndefinedMinimumDetectableEffectSaysSo(TestCase):
    def _mde(self, body):
        return self.client.post("/api/v1/power/mde/", data=json.dumps(body), content_type="application/json")

    def test_a_power_target_below_alpha_has_no_answer(self):
        # The bisection bracket started at lo = 0 and never tested it. With a target BELOW alpha,
        # power_at(0) = alpha already meets it -- the test rejects at rate alpha when there is no
        # effect at all -- so the search converged on an effect size of 8.7e-18 and reported it as
        # the minimum detectable effect. That is not a small effect. It is the absence of one,
        # dressed up as an answer.
        response = self._mde({"test_type": "t-test", "sample_size": 64, "power": 0.01, "alpha": 0.05})

        self.assertEqual(response.status_code, 400)
        self.assertIn("alpha", response.json()["error"])

    def test_designs_too_small_to_support_the_test_are_400s_not_500s(self):
        # n = 3 for a correlation divides by sqrt(n - 3); n = 1 per group for an ANOVA gives
        # df2 = 0. Both used to raise, and the ANOVA one leaked a NaN all the way to the JSON
        # encoder ("Out of range float values are not JSON compliant").
        for body in (
            {"test_type": "correlation", "sample_size": 3, "power": 0.8},
            {"test_type": "anova", "sample_size": 1, "groups": 3, "power": 0.8},
            {"test_type": "t-test", "sample_size": 1, "power": 0.8},
        ):
            with self.subTest(body=body):
                response = self._mde(body)
                self.assertEqual(response.status_code, 400)
                self.assertIn("error", response.json())

    def test_the_valid_cases_still_answer(self):
        for body, expected in (
            ({"test_type": "t-test", "sample_size": 64, "power": 0.8}, 0.499069),
            ({"test_type": "anova", "sample_size": 45, "groups": 4, "power": 0.8}, 0.248859),
            ({"test_type": "correlation", "sample_size": 85, "power": 0.8}, 0.299876),
        ):
            with self.subTest(body=body):
                response = self._mde(body)
                self.assertEqual(response.status_code, 200)
                self.assertAlmostEqual(
                    response.json()["results"]["minimum_detectable_effect_float"], expected, places=5
                )


@override_settings(SECURE_SSL_REDIRECT=False)
class UnequalGroupsAreNotSilentlyBalanced(TestCase):
    def test_the_group_2_box_is_no_longer_dropped_on_the_floor(self):
        # The UI has always had a "Sample Size (Group 2)" field. It was never sent, so a user who
        # entered n1 = 30, n2 = 60 was shown the power for 30/30. A field that does nothing is worse
        # than no field, because the user believes they have told us something.
        def power(n1, n2=None):
            body = {"effect_size": 0.5, "sample_size": n1, "alpha": 0.05}
            if n2 is not None:
                body["sample_size2"] = n2
            response = self.client.post(
                "/api/v1/power/t-test/", data=json.dumps(body), content_type="application/json"
            )
            return response.json()["results"]["power_float"]

        balanced = power(30, 30)
        unbalanced = power(30, 60)

        self.assertNotAlmostEqual(balanced, unbalanced, places=3)

        # Both match statsmodels exactly.
        self.assertAlmostEqual(balanced, float(TTestIndPower().power(0.5, nobs1=30, alpha=0.05, ratio=1.0)), places=10)
        self.assertAlmostEqual(
            unbalanced, float(TTestIndPower().power(0.5, nobs1=30, alpha=0.05, ratio=2.0)), places=10
        )

        # And omitting group 2 still means "balanced", so nothing that worked before changed.
        self.assertAlmostEqual(power(64), 0.8014595579, places=8)


@override_settings(SECURE_SSL_REDIRECT=False)
class TheCurveAgreesWithTheHeadline(TestCase):
    """
    A second adversarial pass found the SAME bug one function to the left.

    `_t_power_float` got its explicit `less` branch. `_correlation_power_float` -- the float64
    helper that draws the curve and drives the MDE bisection -- did not, and took `abs()` of the
    effect besides. So a left-tailed correlation was handed the RIGHT-tailed answer, and the two
    numbers on the screen came from different code paths:

        headline (exact engine, honours `less`):  0.0000013444
        curve underneath it (this helper):        0.9197751836

    Six orders of magnitude apart, same design, same screen. Guarding one caller of a shared idea
    and not the other is how this class of bug survives a fix aimed directly at it.
    """

    def setUp(self):
        self.engine = HighPrecisionPowerAnalysis()

    def test_the_fast_helper_and_the_exact_engine_give_the_same_answer_on_every_tail(self):
        for alternative in ("two-sided", "greater", "less"):
            for r in (0.3, -0.3, 0.5):
                with self.subTest(alternative=alternative, r=r):
                    exact = self.engine.calculate_power_correlation(
                        effect_size=str(r), sample_size="100", alpha="0.05", alternative=alternative
                    )["power_float"]
                    fast = self.engine._correlation_power_float(r, 100, 0.05, alternative)
                    self.assertAlmostEqual(exact, fast, places=9)

    def test_the_sign_of_the_effect_decides_which_tail_has_the_power(self):
        # abs() threw the sign away, and the sign is the whole content of a one-sided test.
        left_tail = self.engine._correlation_power_float(-0.3, 100, 0.05, "less")
        right_tail = self.engine._correlation_power_float(0.3, 100, 0.05, "less")

        self.assertGreater(left_tail, 0.9)  # a NEGATIVE r is what a left-tailed test detects
        self.assertLess(right_tail, 1e-05)  # a positive one is not

    def test_a_left_tailed_correlation_mde_refuses_rather_than_inventing_a_positive_r(self):
        # This one was a REGRESSION. The MDE used to call the exact engine; routing it through the
        # unsigned helper made it return r = +0.2472 as the minimum detectable effect of a
        # LEFT-tailed test. The t-test path, which was already signed, correctly 400s here -- so
        # the two paths disagreed about whether the question even had an answer.
        response = self.client.post(
            "/api/v1/power/mde/",
            data=json.dumps(
                {"test_type": "correlation", "sample_size": 100, "power": 0.8, "alternative": "less"}
            ),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("No effect size reaches", response.json()["error"])

    def test_the_ordinary_correlation_mde_still_answers(self):
        response = self.client.post(
            "/api/v1/power/mde/",
            data=json.dumps({"test_type": "correlation", "sample_size": 85, "power": 0.8}),
            content_type="application/json",
        )
        self.assertAlmostEqual(
            response.json()["results"]["minimum_detectable_effect_float"], 0.299876, places=5
        )


@override_settings(SECURE_SSL_REDIRECT=False)
class TestTypeWasTheLastUnguardedElse(TestCase):
    """
    Three parameters dispatch on a bare `else`. Two were fixed. This is the third.

    `/power/mde/` and `/power/curve/` passed `test_type` straight through to an engine that
    branches `if anova / elif correlation / else: t-test`, so ANY unrecognised value was computed
    as a t-test and returned stamped with the name of the test the caller asked for:

        POST /power/mde/  {"test_type": "chi-square", "sample_size": 30}
          -> 0.7356210695976682, "test_type": "chi-square"      <- this is the t-test answer

    The React UI guards it, so it was never a lie on screen. Both endpoints are AllowAny and the
    SDK talks to them directly, so it was a lie to anyone scripting against the API.
    """

    def _mde(self, test_type):
        return self.client.post(
            "/api/v1/power/mde/",
            data=json.dumps({"test_type": test_type, "sample_size": 30, "power": 0.8}),
            content_type="application/json",
        )

    def _curve(self, test_type):
        return self.client.post(
            "/api/v1/power/curve/",
            data=json.dumps({"test_type": test_type, "effect_size": 0.5, "n_min": 10, "n_max": 30, "step": 10}),
            content_type="application/json",
        )

    def test_a_test_we_do_not_compute_is_a_400_not_a_t_test_wearing_its_name(self):
        for test_type in ("chi-square", "banana", "logistic-regression", "friedman"):
            for name, response in (("mde", self._mde(test_type)), ("curve", self._curve(test_type))):
                with self.subTest(endpoint=name, test_type=test_type):
                    self.assertEqual(response.status_code, 400)
                    self.assertIn("test_type", json.dumps(response.json()))

    def test_the_three_supported_families_still_work_and_differ_from_each_other(self):
        answers = {}
        for test_type in ("t-test", "anova", "correlation"):
            response = self._mde(test_type)
            self.assertEqual(response.status_code, 200)
            answers[test_type] = response.json()["results"]["minimum_detectable_effect_float"]

        # If any two are equal, one of them silently computed the other.
        self.assertEqual(len(set(round(v, 9) for v in answers.values())), 3, answers)

    def test_aliases_are_accepted_and_case_does_not_matter(self):
        for alias in ("ANOVA", "one_way_anova", "Pearson", "t_test"):
            with self.subTest(alias=alias):
                self.assertEqual(self._mde(alias).status_code, 200)


@override_settings(SECURE_SSL_REDIRECT=False)
class TheRankTestsReportThePowerTheyActuallyAchieve(TestCase):
    """
    Every sample-size function returns the power the design will ACTUALLY have at the integer n it
    prescribes -- which is never exactly the target, because n is discrete. Except this one, which
    returned no `actual_power` at all, so the "Power at that N" card rendered an em dash for all
    three rank tests while the engine had the number the whole time.

    Rendering honestly as "—" is not the same as being right. A number we have and do not show is
    a number the user has to take on faith.
    """

    def test_the_number_is_supplied_and_it_meets_the_target(self):
        for test in ("mann-whitney", "wilcoxon", "kruskal-wallis"):
            with self.subTest(test=test):
                response = self.client.post(
                    "/api/v1/power/sample-size/nonparametric/",
                    data=json.dumps(
                        {"test": test, "effect_size": 0.5, "power": 0.8, "alpha": 0.05, "groups": 3}
                    ),
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 200)

                results = response.json()["results"]
                self.assertIn("actual_power_float", results)
                self.assertIsNotNone(results["actual_power_float"])

                # It is the power AT the prescribed n, so it must actually meet the target.
                self.assertGreaterEqual(results["actual_power_float"], 0.8)

                # And it must be the power of the RANK test at that n, not the parametric one.
                direct = self.client.post(
                    "/api/v1/power/nonparametric/",
                    data=json.dumps(
                        {
                            "test": test,
                            "effect_size": 0.5,
                            "sample_size": results["required_sample_size"],
                            "alpha": 0.05,
                            "groups": 3,
                        }
                    ),
                    content_type="application/json",
                )
                self.assertAlmostEqual(
                    results["actual_power_float"], direct.json()["results"]["power_float"], places=10
                )
