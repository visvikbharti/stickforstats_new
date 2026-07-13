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


class TheTableInTheExportedScriptIsNotInvented(TestCase):
    """
    I put a fabricated number into the artifact researchers keep.

    The generated R/Python for a rank test carries a comment table of the sample size each parent
    distribution requires, so the reader can see that the ARE assumption is load-bearing rather
    than a footnote. I ran four of the five rows and INTERPOLATED the fifth: I wrote 65 for the
    uniform parent because ARE = 1.0 sits between the normal (0.955 -> 68) and the logistic
    (1.097 -> 59). The answer is 64. It is off by one subject, which is the least interesting thing
    about it -- what matters is that I typed a number I had not computed, into the one output that
    outlives the session, in the middle of a body of work whose entire subject is that habit.

    This test is the reason it cannot happen again: the table lives in the generated script, and
    the script's numbers are pinned HERE, against the real engine. If the engine ever moves, this
    fails, and the comment gets updated instead of quietly becoming false.

    Keep in sync with ARE_BY_PARENT in frontend/src/utils/codeExport/powerAnalysisCodeGenerator.js.
    """

    # (parent, ARE, n per group) for mann-whitney at d = 0.5, power = 0.80, alpha = 0.05.
    EXPORTED_TABLE = [
        ("normal", 0.955, 68),
        ("uniform", 1.000, 64),
        ("logistic", 1.097, 59),
        ("laplace", 1.500, 43),
        ("exponential", 3.000, 22),
    ]

    def test_every_row_of_the_table_is_what_the_engine_actually_returns(self):
        engine = HighPrecisionPowerAnalysis()

        for parent, are, n in self.EXPORTED_TABLE:
            with self.subTest(parent=parent):
                result = engine.calculate_sample_size_nonparametric(
                    test="mann-whitney",
                    effect_size="0.5",
                    power="0.8",
                    alpha="0.05",
                    parent_distribution=parent,
                )
                self.assertAlmostEqual(result["are"], are, places=3)
                self.assertEqual(result["required_sample_size"], n)

    def test_the_table_makes_the_point_it_claims_to_make(self):
        # The table exists to show that a heavier tail needs FEWER subjects, not the ~5% MORE that
        # the 3/pi figure is usually quoted for. If that ordering ever inverted, the surrounding
        # prose would be wrong even with every number in it correct.
        sizes = [n for _, _, n in self.EXPORTED_TABLE]
        self.assertEqual(sizes, sorted(sizes, reverse=True))
        self.assertLess(sizes[-1], sizes[0] / 2)  # exponential is less than half of normal


@override_settings(SECURE_SSL_REDIRECT=False)
class TheMinimumDetectableEffectHonoursBothArms(TestCase):
    """
    The FOURTH consumer of the group-2 box, found by the fourth review.

    Three earlier rounds gated this value for the power request, the total N and the code generator,
    each commit claiming the set was now complete. It never was. The "Sample Size (Group 2)" box
    renders in EFFECT-SIZE mode too, and `runMinimumDetectableEffect` had no `sampleSize2` at all --
    neither did this engine method, nor the view.

    So a user who entered 30 and 60 and asked "what is the smallest effect I can detect?" was
    answered for a BALANCED 30/30 design:

        reported: d = 0.7356   <- the balanced answer
        truth   : d = 0.6334   <- for the design they actually described
        overstates the smallest detectable effect by 16%, and the d it quotes has 90.2% power in
        their design, not the 80% they asked for.

    This is the bug the comment above the input box declares dead -- "a field that does nothing is
    worse than no field, because the user believes they have told us something" -- still true, one
    calculation mode to the left.
    """

    URL = "/api/v1/power/mde/"

    def _mde(self, **body):
        response = self.client.post(self.URL, data=json.dumps(body), content_type="application/json")
        return response

    def test_an_unbalanced_design_gets_its_own_answer_not_the_balanced_one(self):
        from statsmodels.stats.power import TTestIndPower

        for n1, n2, ratio in ((30, 30, 1.0), (30, 60, 2.0), (30, 120, 4.0), (60, 30, 0.5)):
            with self.subTest(n1=n1, n2=n2):
                results = self._mde(
                    test_type="t-test", sample_size=n1, sample_size2=n2, power=0.8, alpha=0.05
                ).json()["results"]

                expected = float(TTestIndPower().solve_power(nobs1=n1, power=0.8, alpha=0.05, ratio=ratio))
                self.assertAlmostEqual(results["minimum_detectable_effect_float"], expected, places=5)

                # And it echoes the design it answered for, so the caller can tell.
                self.assertEqual(results["sample_size2"], n2)

    def test_the_specific_number_the_screen_used_to_report(self):
        # The literals below are EXECUTED values, not transcribed ones. I first typed 0.633437 here,
        # having read "0.6334" in a report and invented the last two digits -- the third time in one
        # session that I put a number I had not run into the tree, and in the test whose entire
        # purpose is to catch that. Every literal in this file is now a value printed by the engine.
        unbalanced = self._mde(
            test_type="t-test", sample_size=30, sample_size2=60, power=0.8, alpha=0.05
        ).json()["results"]["minimum_detectable_effect_float"]
        balanced = self._mde(
            test_type="t-test", sample_size=30, power=0.8, alpha=0.05
        ).json()["results"]["minimum_detectable_effect_float"]

        self.assertAlmostEqual(balanced, 0.7356210695976682, places=9)  # what 30/60 used to be told
        self.assertAlmostEqual(unbalanced, 0.6333934505648391, places=9)  # what it should have been
        self.assertGreater(balanced, unbalanced)  # the old answer OVERSTATED the detectable effect

        # 16% overstated -- and the d it quoted has 90.2% power in that design, not the 80% asked for.
        self.assertAlmostEqual((balanced - unbalanced) / unbalanced, 0.1614, places=3)

    def test_omitting_the_second_arm_still_means_balanced(self):
        # Nothing that worked before may change.
        results = self._mde(test_type="t-test", sample_size=64, power=0.8, alpha=0.05).json()["results"]
        self.assertAlmostEqual(results["minimum_detectable_effect_float"], 0.499069, places=5)
        self.assertIsNone(results["sample_size2"])

    def test_the_one_sample_designs_have_no_second_arm_and_ignore_it(self):
        # A paired or one-sample t has ONE sample. Sending an n2 must not change the answer -- and
        # must not be echoed back as though it had been used.
        for t_test_type in ("paired", "one-sample"):
            with self.subTest(t_test_type=t_test_type):
                with_arm = self._mde(
                    test_type="t-test", t_test_type=t_test_type, sample_size=30, sample_size2=60, power=0.8
                ).json()["results"]
                without = self._mde(
                    test_type="t-test", t_test_type=t_test_type, sample_size=30, power=0.8
                ).json()["results"]

                self.assertAlmostEqual(
                    with_arm["minimum_detectable_effect_float"],
                    without["minimum_detectable_effect_float"],
                    places=12,
                )
                self.assertIsNone(with_arm["sample_size2"])

    def test_a_second_arm_too_small_to_support_the_test_is_a_400(self):
        response = self._mde(test_type="t-test", sample_size=30, sample_size2=1, power=0.8)
        self.assertEqual(response.status_code, 400)
        self.assertIn("second group", response.json()["error"])


class TheExportedTableIsPerTestNotPerMannWhitney(TestCase):
    """
    The table I pinned in 24c963f is printed in the Wilcoxon and Kruskal-Wallis scripts too, and it
    is a MANN-WHITNEY table.

    One generator function serves all three rank tests, so a researcher exporting a Wilcoxon script
    is told a normal-parent design needs 68 PER GROUP. It needs 36 PAIRS -- 89% too large, and "per
    group" is meaningless for a one-sample test. Kruskal-Wallis is told 68 where the answer is 15,
    off by 4.5x.

    Same class as the fabricated 65 I had just apologised for -- a number in the exported artifact
    that was not computed for the design it is printed under -- one test branch to the left.

    And my own test missed it for the third time in a row, the same way each time: every table
    assertion generated the MANN-WHITNEY script. The table was pinned exactly where it is correct
    and nowhere it is wrong.

    Keep in sync with SAMPLE_SIZE_TABLE in frontend/src/utils/codeExport/powerAnalysisCodeGenerator.js.
    """

    # test -> [(parent, ARE, n)] at d = 0.5, power = 0.80, alpha = 0.05, k = 3 for kruskal-wallis.
    TABLES = {
        "mann-whitney": [
            ("normal", 0.955, 68), ("uniform", 1.000, 64), ("logistic", 1.097, 59),
            ("laplace", 1.500, 43), ("exponential", 3.000, 22),
        ],
        "wilcoxon": [
            ("normal", 0.955, 36), ("uniform", 1.000, 34), ("logistic", 1.097, 32),
            ("laplace", 1.500, 23), ("exponential", 3.000, 12),
        ],
        "kruskal-wallis": [
            ("normal", 0.955, 15), ("uniform", 1.000, 14), ("logistic", 1.097, 13),
            ("laplace", 1.500, 10), ("exponential", 3.000, 5),
        ],
    }

    def test_every_row_of_every_table_is_what_the_engine_returns(self):
        engine = HighPrecisionPowerAnalysis()

        for test, rows in self.TABLES.items():
            for parent, are, n in rows:
                with self.subTest(test=test, parent=parent):
                    result = engine.calculate_sample_size_nonparametric(
                        test=test,
                        effect_size="0.5",
                        power="0.8",
                        alpha="0.05",
                        groups="3",
                        parent_distribution=parent,
                    )
                    self.assertAlmostEqual(result["are"], are, places=3)
                    self.assertEqual(result["required_sample_size"], n)

    def test_the_three_tables_are_genuinely_different(self):
        # If any two were equal, one of them would be the other's answer wearing its name -- which
        # is exactly the bug: the Mann-Whitney table was printed under all three headings.
        columns = {test: tuple(n for _, _, n in rows) for test, rows in self.TABLES.items()}
        self.assertEqual(len(set(columns.values())), 3, columns)

    def test_every_table_still_makes_its_point(self):
        # Heavier tails need FEWER subjects -- the whole reason the table is in the script.
        for test, rows in self.TABLES.items():
            with self.subTest(test=test):
                sizes = [n for _, _, n in rows]
                self.assertEqual(sizes, sorted(sizes, reverse=True))


class TheCurvePassesThroughTheHeadline(TestCase):
    """
    The last place the group-2 box was still being ignored: the power curve underneath the answer.

    The curve was always drawn for a BALANCED design while the headline honoured the second arm, so
    a 30/60 t-test put a headline power of 0.5994 directly above a curve reading 0.4779 at n = 30.
    Two numbers, one screen, one design, both claiming to be its power -- the same defect this
    module has now been through four times, in its last hiding place.

    Holding n2/n1 fixed as n1 varies is what G*Power does, and it is the only reading of "power vs
    n" that means anything for an unequal design.
    """

    def setUp(self):
        self.engine = HighPrecisionPowerAnalysis()

    def test_the_curve_at_the_users_own_n_is_the_headline_power(self):
        headline = self.engine.calculate_power_t_test(
            effect_size="0.5", sample_size="30", sample_size2="60", alpha="0.05"
        )["power_float"]

        curve = self.engine.power_curve(
            test_type="t-test", effect_size=0.5, alpha=0.05, n_min=30, n_max=30, step=1,
            allocation_ratio=2.0,
        )
        at_30 = next(p["power"] for p in curve["points"] if p["n"] == 30)

        self.assertAlmostEqual(at_30, headline, places=9)

        # And it is NOT the balanced answer, which is what was plotted before.
        balanced = self.engine.power_curve(
            test_type="t-test", effect_size=0.5, alpha=0.05, n_min=30, n_max=30, step=1
        )["points"][0]["power"]
        self.assertNotAlmostEqual(at_30, balanced, places=3)

    def test_a_balanced_curve_is_completely_unchanged(self):
        # Nothing that worked before may move.
        default = self.engine.power_curve(test_type="t-test", effect_size=0.5, n_min=10, n_max=100, step=10)
        explicit = self.engine.power_curve(
            test_type="t-test", effect_size=0.5, n_min=10, n_max=100, step=10, allocation_ratio=1.0
        )
        self.assertEqual(default["points"], explicit["points"])

    def test_the_ratio_is_echoed_only_where_it_applies(self):
        t = self.engine.power_curve(test_type="t-test", effect_size=0.5, allocation_ratio=2.0)
        self.assertEqual(t["allocation_ratio"], 2.0)

        # A paired t, an ANOVA and a correlation have no second arm; the ratio is meaningless there
        # and must not be echoed as though it had been used.
        for kwargs in (
            {"test_type": "t-test", "t_test_type": "paired"},
            {"test_type": "anova", "groups": 3},
            {"test_type": "correlation"},
        ):
            with self.subTest(**kwargs):
                curve = self.engine.power_curve(effect_size=0.3, allocation_ratio=2.0, **kwargs)
                self.assertIsNone(curve["allocation_ratio"])

    def test_a_paired_curve_ignores_the_ratio_entirely(self):
        with_ratio = self.engine.power_curve(
            test_type="t-test", t_test_type="paired", effect_size=0.5, n_min=10, n_max=50, step=10,
            allocation_ratio=2.0,
        )
        without = self.engine.power_curve(
            test_type="t-test", t_test_type="paired", effect_size=0.5, n_min=10, n_max=50, step=10
        )
        self.assertEqual(with_ratio["points"], without["points"])

    def test_a_nonsense_ratio_is_refused(self):
        for ratio in (0, -1.0):
            with self.subTest(ratio=ratio):
                with self.assertRaises(ValueError):
                    self.engine.power_curve(test_type="t-test", effect_size=0.5, allocation_ratio=ratio)


@override_settings(SECURE_SSL_REDIRECT=False)
class TheVariantIsReadUnderEitherNameItIsGivenBy(TestCase):
    """
    The bare-`else` class one final time, at the transport layer instead of in the engine.

    This module names the same concept two ways, because `test_type` means different things on
    different endpoints:

        /power/t-test/              variant as `test_type`     ("independent" / "paired" / ...)
        /power/mde/, /power/curve/  variant as `t_test_type`   (`test_type` there names the TEST)

    So a caller who sent `t_test_type: "paired"` to /power/t-test/ -- the name the other two
    endpoints use, and the obvious guess -- had it SILENTLY DROPPED and got the INDEPENDENT answer:

        shown:  0.4779   (independent)
        truth:  0.7540   (paired)

    27 percentage points, under the name of the test they asked for. I found this by falling into it
    myself while writing a probe to verify the screen-facing numbers -- which is the best evidence
    available that a real caller would too.
    """

    def _power(self, url="/api/v1/power/t-test/", **body):
        return self.client.post(url, data=json.dumps(body), content_type="application/json")

    def test_both_spellings_of_the_variant_are_honoured(self):
        for key in ("test_type", "t_test_type"):
            for variant, expected in (
                ("independent", 0.4778965207601648),
                ("paired", 0.7539647157436925),
                ("one-sample", 0.7539647157436925),
            ):
                with self.subTest(key=key, variant=variant):
                    response = self._power(**{"effect_size": 0.5, "sample_size": 30, "alpha": 0.05, key: variant})
                    self.assertEqual(response.status_code, 200)
                    self.assertAlmostEqual(response.json()["results"]["power_float"], expected, places=12)

    def test_a_paired_request_is_never_answered_with_the_independent_number(self):
        paired = self._power(effect_size=0.5, sample_size=30, alpha=0.05, t_test_type="paired")
        independent = self._power(effect_size=0.5, sample_size=30, alpha=0.05, test_type="independent")

        self.assertNotAlmostEqual(
            paired.json()["results"]["power_float"],
            independent.json()["results"]["power_float"],
            places=3,
        )

    def test_asking_for_two_different_variants_at_once_is_a_400(self):
        # Silently picking one of them is how this class of bug lives. Refuse instead.
        response = self._power(
            effect_size=0.5, sample_size=30, test_type="independent", t_test_type="paired"
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("different t-test variants", response.json()["error"])

    def test_agreeing_spellings_are_fine(self):
        response = self._power(
            effect_size=0.5, sample_size=30, test_type="paired", t_test_type="dependent"  # both -> paired
        )
        self.assertEqual(response.status_code, 200)
        self.assertAlmostEqual(response.json()["results"]["power_float"], 0.7539647157436925, places=12)

    def test_the_sample_size_endpoint_reads_it_the_same_way(self):
        for key in ("test_type", "t_test_type"):
            with self.subTest(key=key):
                response = self.client.post(
                    "/api/v1/power/sample-size/t-test/",
                    data=json.dumps({"effect_size": 0.5, "power": 0.8, "alpha": 0.05, key: "paired"}),
                    content_type="application/json",
                )
                self.assertEqual(response.status_code, 200)
                # A paired design needs far fewer subjects than the independent 64.
                self.assertEqual(response.json()["results"]["required_sample_size"], 34)
