"""
A t-test screen that displays a confidence interval must be given one.

The high-precision t-test endpoint returned only t_statistic, p_value, mean1, mean2, mean_diff,
se, df, n1, n2 and alternative. The UI (frontend/src/modules/TTestRealBackend.jsx) meanwhile
rendered rows for "Mean Difference", "Confidence Interval (95%)" and "Effect Size (Cohen's d)",
reading `mean_difference`, `ci_lower`/`ci_upper` and `effect_size` -- none of which the response
contained. Every run therefore displayed:

    Mean Difference: N/A
    Confidence Interval (95%): [N/A, N/A]
    Effect Size (Cohen's d): N/A

and that screen is the one photographed for the manuscript's Guardian figure.

Neither quantity is recomputed here from scratch. The interval uses the same verified
high-precision Student-t quantile as the power module, and Cohen's d comes from the existing
EffectSizeCalculator. Computing either in the browser is the shortcut that produced a "95%"
interval with 94.3% coverage elsewhere in this codebase, so both are asserted to be present in
the API response and to agree with an independent SciPy reference.
"""

import numpy as np
from django.test import Client, SimpleTestCase, TestCase, override_settings
from rest_framework.test import APIClient
from scipy import stats


# Deliberately skewed, unequal-spread samples: the same data as the manuscript figure, so a
# regression here is visible in the artifact the paper ships.
DATA1 = [2, 2, 3, 3, 3, 4, 4, 5, 6, 9, 14, 22, 48, 95]
DATA2 = [3, 3, 4, 4, 4, 5, 5, 6, 8, 12, 19, 30, 60, 110]


def _scipy_reference(a, b, conf=0.95):
    """Pooled two-sample mean difference, its interval, and Cohen's d — from SciPy/NumPy only."""
    n1, n2 = len(a), len(b)
    df = n1 + n2 - 2
    md = np.mean(a) - np.mean(b)
    sp = np.sqrt(((n1 - 1) * np.var(a, ddof=1) + (n2 - 1) * np.var(b, ddof=1)) / df)
    se = sp * np.sqrt(1 / n1 + 1 / n2)
    tc = stats.t.ppf((1 + conf) / 2, df)
    return md, md - tc * se, md + tc * se, md / sp


@override_settings(SECURE_SSL_REDIRECT=False)
class TwoSampleTTestReportsAnIntervalAndAnEffectSize(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.url = "/api/v1/stats/ttest/"

    def _post(self):
        resp = self.client.post(
            self.url,
            {
                "data1": DATA1,
                "data2": DATA2,
                "test_type": "two_sample",
                "options": {"check_assumptions": True, "compare_standard": False},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.data)
        hp = resp.data["high_precision_result"]
        self.assertNotIn(
            "derived_fields_error", hp,
            f"the derived fields failed instead of being computed: {hp.get('derived_fields_error')}",
        )
        return hp

    def test_the_response_carries_every_field_the_ui_renders(self):
        # If any of these is missing the UI prints "N/A" with no explanation of why.
        hp = self._post()
        for field in ("mean_difference", "ci_lower", "ci_upper", "ci_level", "effect_size", "df"):
            self.assertIn(field, hp, f"UI reads {field!r} but the response does not provide it")
            self.assertIsNotNone(hp[field])

    def test_the_confidence_interval_matches_an_independent_scipy_reference(self):
        hp = self._post()
        _, lo_ref, hi_ref, _ = _scipy_reference(DATA1, DATA2)
        self.assertAlmostEqual(float(hp["ci_lower"]), lo_ref, places=9)
        self.assertAlmostEqual(float(hp["ci_upper"]), hi_ref, places=9)

    def test_cohens_d_matches_an_independent_scipy_reference(self):
        hp = self._post()
        *_, d_ref = _scipy_reference(DATA1, DATA2)
        self.assertAlmostEqual(float(hp["effect_size"]), d_ref, places=9)

    def test_the_interval_brackets_the_mean_difference_and_is_ordered(self):
        # A guard against a sign or ordering slip that the point comparisons above would miss.
        hp = self._post()
        lo, md, hi = float(hp["ci_lower"]), float(hp["mean_difference"]), float(hp["ci_upper"])
        self.assertLess(lo, hi, "interval bounds are inverted")
        self.assertLess(lo, md, "lower bound does not lie below the estimate")
        self.assertGreater(hi, md, "upper bound does not lie above the estimate")

    def test_the_interval_uses_the_t_quantile_and_not_the_normal_one(self):
        # The specific defect that produced a "95%" interval covering 94.3% elsewhere in this
        # codebase was a normal quantile standing in for Student's t. At df = 26 they differ by
        # about 4.9%, which this asserts is not happening.
        hp = self._post()
        df = float(hp["df"])
        se = float(hp["se"])
        half_width = (float(hp["ci_upper"]) - float(hp["ci_lower"])) / 2
        implied_crit = half_width / se
        t_crit = stats.t.ppf(0.975, df)
        z_crit = stats.norm.ppf(0.975)
        self.assertAlmostEqual(implied_crit, t_crit, places=9)
        self.assertNotAlmostEqual(implied_crit, z_crit, places=3)

    def test_the_high_precision_interval_carries_more_than_float64_precision(self):
        # The interval is built from the 50-digit mean difference and standard error, so the
        # string must not have been rounded to a float on the way out.
        hp = self._post()
        self.assertGreater(
            len(str(hp["ci_lower"]).split(".")[-1]), 20,
            "ci_lower looks like a float64 round-trip, not a high-precision value",
        )


@override_settings(SECURE_SSL_REDIRECT=False)
class DegenerateInputMustNotYieldAnIntervalTests(SimpleTestCase):
    """A confidence interval must not exist where the test statistic does not.

    On two groups with zero within-group variance the calculator correctly
    reports t and p as None -- but the CI code only required mean_diff, se and
    df to be present. se is exactly 0 there, so the half-width was 0 and the
    response carried ci_lower == ci_upper == mean_diff: a zero-width "95%
    confidence interval" that excludes 0 and reads as a significant result for
    a statistic that does not exist. Cohen's d already refused on this input;
    the interval did not.

    Executed before the fix: data1=[5]*5, data2=[7]*5 returned
    ci_lower = ci_upper = "-2.000...", t_statistic = None, p_value = None.
    """

    URL = "/api/v1/stats/ttest/"

    def _post(self, payload):
        return Client().post(self.URL, payload, content_type="application/json")

    def test_zero_variance_emits_no_interval_and_says_why(self):
        r = self._post({"test_type": "two_sample",
                        "data1": [5, 5, 5, 5, 5], "data2": [7, 7, 7, 7, 7]})
        self.assertEqual(r.status_code, 200, r.content[:300])
        hpr = r.json()["high_precision_result"]
        self.assertIsNone(hpr.get("t_statistic"), "premise: t must be undefined here")
        self.assertNotIn(
            "ci_lower", hpr,
            f"a confidence interval was reported for a test with no statistic: "
            f"[{hpr.get('ci_lower')}, {hpr.get('ci_upper')}]",
        )
        self.assertNotIn("ci_upper", hpr)
        self.assertIn("ci_error", hpr, "the absence of an interval must be explained")

    def test_degenerate_input_does_not_crash_the_endpoint(self):
        """A NaN reaching DRF's JSON renderer raises "Out of range float values
        are not JSON compliant", which is an HTTP 500. Levene returns NaN on
        zero-variance groups, and the assumptions dict is assembled field by
        field rather than through AssumptionResult.to_dict(), so its NaN guard
        did not cover it."""
        r = self._post({"test_type": "two_sample",
                        "data1": [5, 5, 5, 5, 5], "data2": [7, 7, 7, 7, 7]})
        self.assertEqual(r.status_code, 200)
        ev = r.json()["assumptions"]["equal_variance"]
        self.assertIsNone(ev["p_value"], "a non-finite p must serialise as null")
        self.assertIsNone(ev["test_statistic"])
        self.assertIn("could not be computed", ev["warning"] or "")

    def test_confidence_level_as_a_percentage_is_not_silently_nan(self):
        """The two serializers disagree on this field's scale.

        TTestRequestSerializer declares confidence_level as a percent string
        (default "95", and derived from alpha as (1 - alpha) * 100);
        CorrelationRequestSerializer declares it as a fraction. Read as a
        fraction, 99 makes (1 + 99)/2 = 50, and the mpmath quantile returns NaN
        rather than raising -- so the response carried ci_lower = ci_upper =
        "NaN" with HTTP 200 and ci_level echoed as 99.0.
        """
        pct = self._post({"test_type": "two_sample",
                          "data1": [1, 2, 3, 4, 5, 6], "data2": [3, 4, 5, 6, 7, 9],
                          "parameters": {"confidence_level": 99}}).json()["high_precision_result"]
        frac = self._post({"test_type": "two_sample",
                           "data1": [1, 2, 3, 4, 5, 6], "data2": [3, 4, 5, 6, 7, 9],
                           "parameters": {"confidence_level": 0.99}}).json()["high_precision_result"]
        self.assertNotIn("NaN", str(pct.get("ci_lower")))
        self.assertNotIn("NaN", str(pct.get("ci_upper")))
        # Equivalent requests must give the identical interval.
        self.assertEqual(pct["ci_lower"], frac["ci_lower"])
        self.assertEqual(pct["ci_upper"], frac["ci_upper"])
        self.assertEqual(pct["ci_level"], 0.99)

    def test_a_nonsensical_confidence_level_is_refused_not_guessed(self):
        r = self._post({"test_type": "two_sample",
                        "data1": [1, 2, 3, 4, 5, 6], "data2": [3, 4, 5, 6, 7, 9],
                        "parameters": {"confidence_level": 0}})
        hpr = r.json()["high_precision_result"]
        self.assertNotIn("ci_lower", hpr)
        self.assertIn("confidence_level", hpr.get("derived_fields_error", ""))


@override_settings(SECURE_SSL_REDIRECT=False)
class ConfidenceLevelActuallyReachesTheIntervalTests(SimpleTestCase):
    """Changing the requested level must change the interval.

    The sibling file test_api_honours_its_parameters.py exists because this
    codebase has repeatedly accepted a parameter and then ignored it. The CI
    tests asserted only that ``ci_level`` was PRESENT, so replacing
    ``float(parameters.get("confidence_level", 0.95))`` with a hardcoded 0.95
    left them green -- the interval would silently be a 95% one under a "99%"
    heading, which is the exact defect the dropped ``equal_variance`` and
    ``alternative`` flags produced before.

    Note that asserting "the percent form equals the fraction form" does NOT
    close this: if the level were hardcoded, both would be 95% and still agree.
    The discriminator has to be that two DIFFERENT levels give two different
    widths, checked against the t quantile.
    """

    URL = "/api/v1/stats/ttest/"
    D1 = [1, 2, 3, 4, 5, 6]
    D2 = [3, 4, 5, 6, 7, 9]

    def _ci(self, level=None):
        payload = {"test_type": "two_sample", "data1": self.D1, "data2": self.D2}
        if level is not None:
            payload["parameters"] = {"confidence_level": level}
        hpr = Client().post(
            self.URL, payload, content_type="application/json"
        ).json()["high_precision_result"]
        return hpr

    def test_a_higher_level_gives_a_strictly_wider_interval(self):
        a = self._ci(0.95)
        b = self._ci(0.99)
        wa = float(a["ci_upper"]) - float(a["ci_lower"])
        wb = float(b["ci_upper"]) - float(b["ci_lower"])
        self.assertEqual(a["ci_level"], 0.95)
        self.assertEqual(b["ci_level"], 0.99)
        self.assertGreater(
            wb, wa,
            f"the 99% interval ({wb}) is not wider than the 95% one ({wa}); the "
            f"requested confidence level is not reaching the calculation",
        )

    def test_the_half_width_equals_the_t_quantile_times_the_standard_error(self):
        """Checked against scipy, not against a previously reported number."""
        from scipy import stats as scipy_stats

        for level in (0.90, 0.95, 0.99):
            hpr = self._ci(level)
            se = float(hpr["se"])
            df = float(hpr["df"])
            half = (float(hpr["ci_upper"]) - float(hpr["ci_lower"])) / 2.0
            expected = scipy_stats.t.ppf((1 + level) / 2, df) * se
            with self.subTest(level=level):
                self.assertAlmostEqual(
                    half, expected, places=10,
                    msg=f"half-width {half} != t.ppf({(1+level)/2}, {df}) * {se} "
                        f"= {expected}",
                )
