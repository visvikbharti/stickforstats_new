"""
One-tailed t-tests must actually be one-tailed.

The t-test UI has an "Alternative Hypothesis" selector. TTestRequestSerializer declares an
`alternative` field, validates it and canonicalizes it. UniversalParameterAdapter normalizes
it. And then HighPrecisionTTestView never passed it to the calculator, which hard-coded the
two-sided p-value:

    x = df / (df + t^2);  p = I_x(df/2, 1/2)      # two-sided, always

So every one-tailed t-test this application has ever run was silently two-tailed -- reporting
a p-value twice the true one when the effect ran in the hypothesised direction, and a p-value
that should have been near 1 (nowhere near significance) when it ran the other way. Selecting
"greater" on data where group 1 is clearly SMALLER would still have reported a significant
result. Nothing in the suite noticed, because nothing tested the direction.
"""

from decimal import Decimal

import numpy as np
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from scipy import stats

from core.high_precision_calculator import HighPrecisionCalculator

# Group 1 is clearly the LARGER group -- so "greater" should be significant and "less" should
# be nowhere near it. If `alternative` is dropped, both come back as the same two-sided p.
HIGH = [12.5, 14.2, 11.8, 15.3, 13.7, 12.9, 14.8, 13.1, 12.2, 14.0]
LOW = [10.2, 9.8, 11.1, 8.9, 10.5, 9.4, 10.8, 9.1, 10.0, 9.7]

BEFORE = [120, 125, 130, 128, 132, 127, 131, 129, 126, 133]
AFTER = [115, 118, 122, 119, 124, 121, 123, 120, 117, 125]

ALTERNATIVES = ["two-sided", "less", "greater"]


class CalculatorHonoursAlternative(TestCase):
    def setUp(self):
        self.calc = HighPrecisionCalculator(precision=50)

    def test_two_sample_matches_scipy_for_every_alternative(self):
        for equal_var in (True, False):
            for alternative in ALTERNATIVES:
                with self.subTest(equal_var=equal_var, alternative=alternative):
                    result = self.calc.t_statistic_two_sample(
                        HIGH, LOW, equal_var=equal_var, alternative=alternative
                    )
                    expected = stats.ttest_ind(
                        HIGH, LOW, equal_var=equal_var, alternative=alternative
                    )
                    self.assertAlmostEqual(
                        float(result["p_value"]), float(expected.pvalue), places=10
                    )
                    self.assertAlmostEqual(
                        float(result["t_statistic"]), float(expected.statistic), places=10
                    )

    def test_one_sample_matches_scipy_for_every_alternative(self):
        for alternative in ALTERNATIVES:
            with self.subTest(alternative=alternative):
                result = self.calc.t_statistic_one_sample(HIGH, 12.0, alternative=alternative)
                expected = stats.ttest_1samp(HIGH, 12.0, alternative=alternative)
                self.assertAlmostEqual(float(result["p_value"]), float(expected.pvalue), places=10)

    def test_the_direction_actually_matters(self):
        """
        Group 1 is clearly larger. 'greater' must be significant; 'less' must not be. If the
        alternative were dropped, these two would be equal (both the two-sided p).
        """
        greater = float(self.calc.t_statistic_two_sample(HIGH, LOW, alternative="greater")["p_value"])
        less = float(self.calc.t_statistic_two_sample(HIGH, LOW, alternative="less")["p_value"])
        two_sided = float(self.calc.t_statistic_two_sample(HIGH, LOW, alternative="two-sided")["p_value"])

        self.assertLess(greater, 0.001)
        self.assertGreater(less, 0.999)
        self.assertNotAlmostEqual(greater, less, places=6)
        # The two one-sided p-values partition the line, and the smaller one is half the
        # two-sided p.
        self.assertAlmostEqual(greater + less, 1.0, places=10)
        self.assertAlmostEqual(greater, two_sided / 2, places=10)

    def test_a_one_sided_test_against_the_wrong_tail_is_not_significant(self):
        """
        The failure this bug produced in the field: ask for 'less' on data where group 1 is
        larger, and the old code still handed back the significant two-sided p-value.
        """
        p = float(self.calc.t_statistic_two_sample(HIGH, LOW, alternative="less")["p_value"])
        self.assertGreater(p, 0.05, "a test against the wrong tail must not be significant")

    def test_accepts_every_spelling(self):
        for spelling in ["two_sided", "two-sided", "TWO-SIDED", "both"]:
            with self.subTest(spelling=spelling):
                result = self.calc.t_statistic_two_sample(HIGH, LOW, alternative=spelling)
                self.assertEqual(result["alternative"], "two-sided")

    def test_p_value_is_a_decimal(self):
        result = self.calc.t_statistic_two_sample(HIGH, LOW, alternative="greater")
        self.assertIsInstance(result["p_value"], Decimal)


@override_settings(SECURE_SSL_REDIRECT=False)
class TTestEndpointHonoursAlternative(TestCase):
    URL = "/api/v1/stats/ttest/"

    def setUp(self):
        self.client = APIClient()

    def _p(self, payload):
        response = self.client.post(self.URL, payload, format="json")
        self.assertEqual(response.status_code, 200, response.content[:300])
        return float(response.json()["high_precision_result"]["p_value"])

    def test_two_sample_direction_reaches_the_backend(self):
        greater = self._p(
            {"test_type": "two_sample", "data1": HIGH, "data2": LOW, "alternative": "greater"}
        )
        less = self._p(
            {"test_type": "two_sample", "data1": HIGH, "data2": LOW, "alternative": "less"}
        )
        two_sided = self._p({"test_type": "two_sample", "data1": HIGH, "data2": LOW})

        self.assertLess(greater, 0.001)
        self.assertGreater(less, 0.999)
        self.assertAlmostEqual(greater, two_sided / 2, places=9)

    def test_paired_direction_reaches_the_backend(self):
        # BEFORE is consistently higher than AFTER, so before-after > 0.
        greater = self._p(
            {"test_type": "paired", "data1": BEFORE, "data2": AFTER, "alternative": "greater"}
        )
        less = self._p(
            {"test_type": "paired", "data1": BEFORE, "data2": AFTER, "alternative": "less"}
        )
        self.assertLess(greater, 0.001)
        self.assertGreater(less, 0.999)

    def test_one_sample_direction_reaches_the_backend(self):
        greater = self._p(
            {"test_type": "one_sample", "data1": HIGH, "parameters": {"mu": 12.0}, "alternative": "greater"}
        )
        less = self._p(
            {"test_type": "one_sample", "data1": HIGH, "parameters": {"mu": 12.0}, "alternative": "less"}
        )
        self.assertLess(greater, less)

    def test_endpoint_matches_scipy_for_every_alternative(self):
        for alternative in ALTERNATIVES:
            with self.subTest(alternative=alternative):
                got = self._p(
                    {
                        "test_type": "two_sample",
                        "data1": HIGH,
                        "data2": LOW,
                        "alternative": alternative,
                        "parameters": {"equal_var": True},
                    }
                )
                expected = stats.ttest_ind(HIGH, LOW, equal_var=True, alternative=alternative).pvalue
                self.assertAlmostEqual(got, float(expected), places=9)

    def test_the_reported_alternative_is_echoed_back(self):
        """So the result can never be read under the wrong hypothesis."""
        response = self.client.post(
            self.URL,
            {"test_type": "two_sample", "data1": HIGH, "data2": LOW, "alternative": "greater"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content[:300])
        self.assertEqual(response.json()["high_precision_result"]["alternative"], "greater")

    def test_welch_and_student_both_honour_the_alternative(self):
        for equal_var in (True, False):
            with self.subTest(equal_var=equal_var):
                got = self._p(
                    {
                        "test_type": "two_sample",
                        "data1": HIGH,
                        "data2": LOW,
                        "alternative": "greater",
                        "parameters": {"equal_var": equal_var},
                    }
                )
                expected = stats.ttest_ind(
                    HIGH, LOW, equal_var=equal_var, alternative="greater"
                ).pvalue
                self.assertAlmostEqual(got, float(expected), places=9)


class TPValueHelper(TestCase):
    """The shared directional p-value helper, against scipy's t distribution."""

    def test_matches_scipy_across_a_grid(self):
        for df in (1.0, 5.0, 30.0, 200.0):
            for t in (-6.0, -2.5, -0.7, 0.0, 0.7, 2.5, 6.0):
                with self.subTest(df=df, t=t):
                    self.assertAlmostEqual(
                        float(HighPrecisionCalculator.t_p_value(t, df, "two-sided")),
                        float(2 * stats.t.sf(abs(t), df)),
                        places=10,
                    )
                    self.assertAlmostEqual(
                        float(HighPrecisionCalculator.t_p_value(t, df, "greater")),
                        float(stats.t.sf(t, df)),
                        places=10,
                    )
                    self.assertAlmostEqual(
                        float(HighPrecisionCalculator.t_p_value(t, df, "less")),
                        float(stats.t.cdf(t, df)),
                        places=10,
                    )

    def test_the_two_one_sided_pvalues_sum_to_one(self):
        for t in (-3.0, 0.0, 1.7):
            self.assertAlmostEqual(
                float(HighPrecisionCalculator.t_p_value(t, 20.0, "greater"))
                + float(HighPrecisionCalculator.t_p_value(t, 20.0, "less")),
                1.0,
                places=10,
            )

    def test_rejects_an_unknown_alternative(self):
        with self.assertRaises(ValueError):
            HighPrecisionCalculator.t_p_value(1.0, 10.0, "sideways")


class NoRegressionInTheDefault(TestCase):
    """Omitting `alternative` must still give the two-sided p it always gave."""

    def test_default_is_two_sided(self):
        calc = HighPrecisionCalculator(precision=50)
        default = float(calc.t_statistic_two_sample(HIGH, LOW)["p_value"])
        explicit = float(calc.t_statistic_two_sample(HIGH, LOW, alternative="two-sided")["p_value"])
        expected = stats.ttest_ind(HIGH, LOW, equal_var=True).pvalue
        self.assertAlmostEqual(default, explicit, places=12)
        self.assertAlmostEqual(default, float(expected), places=10)

    def test_identical_groups_give_a_half_not_a_one_on_a_one_sided_test(self):
        calc = HighPrecisionCalculator(precision=50)
        identical = [5.0, 5.0, 5.0, 5.0]
        result = calc.t_statistic_two_sample(identical, identical, alternative="greater")
        self.assertAlmostEqual(float(result["p_value"]), 0.5, places=10)
        self.assertAlmostEqual(
            float(calc.t_statistic_two_sample(identical, identical)["p_value"]), 1.0, places=10
        )


class ScipyGridAgreement(TestCase):
    """Random data, every alternative, both variance assumptions -- must never disagree."""

    def test_random_samples_agree_with_scipy(self):
        rng = np.random.default_rng(20260713)
        calc = HighPrecisionCalculator(precision=50)
        for _ in range(25):
            a = rng.normal(10, 2, rng.integers(5, 30)).tolist()
            b = rng.normal(10.5, 3, rng.integers(5, 30)).tolist()
            for equal_var in (True, False):
                for alternative in ALTERNATIVES:
                    got = float(
                        calc.t_statistic_two_sample(
                            a, b, equal_var=equal_var, alternative=alternative
                        )["p_value"]
                    )
                    expected = stats.ttest_ind(
                        a, b, equal_var=equal_var, alternative=alternative
                    ).pvalue
                    self.assertAlmostEqual(got, float(expected), places=9)
