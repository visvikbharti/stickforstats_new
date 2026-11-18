"""A Guardian check of data in which one group does not vary gets an answer.

The check returns a summary of each group. Skewness and kurtosis are not defined for values that do not vary,
and SciPy returns NaN for them. NaN is not JSON: the renderer refused the whole answer, and a check of
[5, 5, 5, 5] against [1, 2, 3, 4.5] ended in "Server Error (500)". The two numbers are now sent as null, with
the reason.

Two more places ended the same way. The shape descriptors of the similar-shapes check held the same NaN, for
a rank test on groups of different shape. And the sentence of the homoscedasticity check printed a variance
ratio that it had just found to be not computable, for a regression on a column that does not vary.
"""
import json

import numpy as np
from django.test import override_settings
from rest_framework.test import APITestCase
from scipy import stats

from core.guardian.guardian_core import GuardianCore

CONSTANT = [5.0, 5.0, 5.0, 5.0]
VARIES = [1.0, 2.0, 3.0, 4.5]
ALSO_VARIES = [2.0, 2.5, 3.5, 9.0]
NOTE = "skewness and kurtosis are not defined: the values do not vary"


def _strict(content):
    """The body read as JSON, with NaN and Infinity refused as a browser refuses them."""

    def refuse(name):
        raise AssertionError(f"the answer holds {name}, which is not JSON")

    return json.loads(content, parse_constant=refuse)


@override_settings(RATE_LIMIT_ENABLED=False)
class ACheckWithAConstantGroupIsAnsweredTest(APITestCase):
    URL = "/api/guardian/check/"

    def test_one_constant_group_among_groups_that_vary(self):
        for test_type, data in (("t_test", [CONSTANT, VARIES]), ("mann_whitney", [CONSTANT, VARIES]),
                                ("anova", [CONSTANT, VARIES, ALSO_VARIES]), ("t_test", [VARIES, CONSTANT])):
            with self.subTest(test_type=test_type, constant_group=data.index(CONSTANT) + 1):
                response = self.client.post(self.URL, {"data": data, "test_type": test_type}, format="json",
                                            HTTP_X_FORWARDED_PROTO="https")
                self.assertEqual(response.status_code, 200, response.content[:200])
                summary = _strict(response.content)["data_summary"]
                constant = summary[f"group_{data.index(CONSTANT) + 1}"]
                self.assertEqual((constant["n"], constant["mean"], constant["std"]), (4, 5.0, 0.0))
                self.assertIsNone(constant["skewness"])
                self.assertIsNone(constant["kurtosis"])
                self.assertEqual(constant["note"], NOTE)
                varying = summary[f"group_{data.index(VARIES) + 1}"]
                self.assertAlmostEqual(varying["skewness"], float(stats.skew(np.array(VARIES))), places=12)
                self.assertAlmostEqual(varying["kurtosis"], float(stats.kurtosis(np.array(VARIES))), places=12)
                self.assertNotIn("note", varying)


@override_settings(RATE_LIMIT_ENABLED=False)
class TwoChecksOnAGroupThatDoesNotVaryTest(APITestCase):
    URL = "/api/guardian/check/"
    LONG_CONSTANT = [5.0] * 30
    LONG = [round(8.0 + 0.37 * i + (1.9 if i % 3 == 0 else -1.1) * (i % 5), 2) for i in range(30)]

    def _check(self, test_type, data):
        response = self.client.post(self.URL, {"data": data, "test_type": test_type}, format="json",
                                    HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content[:200])
        return _strict(response.content)

    def test_the_shape_descriptors_of_a_rank_test(self):
        for test_type in ("mann_whitney", "kruskal_wallis", "wilcoxon"):
            with self.subTest(test_type=test_type):
                answer = self._check(test_type, [self.LONG_CONSTANT, self.LONG])
                shapes = answer["visual_evidence"]["similar_shapes"]
                self.assertIsNone(shapes["skewness"][0])
                self.assertAlmostEqual(shapes["skewness"][1], float(stats.skew(np.array(self.LONG))), places=12)
                self.assertEqual([v["assumption"] for v in answer["violations"]], ["similar_shapes"])

    def test_the_sentence_of_the_homoscedasticity_check(self):
        for test_type in ("linear_regression", "regression", "mixed_model"):
            with self.subTest(test_type=test_type):
                answer = self._check(test_type, [self.LONG, self.LONG_CONSTANT])
                found = [v for v in answer["violations"] if v["assumption"] == "homoscedasticity"]
                self.assertEqual(len(found), 1, answer["violations"])
                self.assertIn("variance ratio not computed: one half of the fitted range has no residual variance",
                              found[0]["message"])
                self.assertIsNone(answer["visual_evidence"]["homoscedasticity"]["variance_ratio"])

    def test_a_variance_ratio_that_exists_is_printed(self):
        from core.guardian.guardian_core import HomoscedasticityValidator

        x = np.arange(1.0, 41.0)
        y = 2.0 * x + np.where(np.arange(40) % 2 == 0, 1.0, -1.0) * x * 0.4       # the spread grows with x
        result = HomoscedasticityValidator().validate([x, y], 0.05)
        self.assertTrue(result["violated"])
        ratio = result["visual_data"]["variance_ratio"]
        self.assertGreater(ratio, 4.0)
        self.assertTrue(result["message"].endswith(f"variance ratio={ratio:.2f})"), result["message"])


class TheSummaryOfAGroupTest(APITestCase):
    def test_no_summary_holds_a_value_that_is_not_a_number(self):
        for label, values in (("constant", CONSTANT), ("one value", [3.0]), ("two equal values", [2.0, 2.0]),
                              ("constant up to rounding", [0.1 + 0.2, 0.3, 0.3])):
            with self.subTest(values=label):
                summary = GuardianCore()._summarize_data([np.array(values), np.array(VARIES)])
                _strict(json.dumps(summary))
                for value in summary["group_1"].values():
                    if isinstance(value, float):
                        self.assertTrue(np.isfinite(value), summary["group_1"])

    def test_a_group_that_varies_keeps_its_numbers(self):
        summary = GuardianCore()._summarize_data([np.array(VARIES)])["data"]
        self.assertEqual(summary["skewness"], float(stats.skew(np.array(VARIES))))
        self.assertEqual(summary["kurtosis"], float(stats.kurtosis(np.array(VARIES))))
        self.assertNotIn("note", summary)
