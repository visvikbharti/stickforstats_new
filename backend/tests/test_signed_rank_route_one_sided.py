"""A one-sided signed-rank request is answered for the direction it names.

POST /api/v1/nonparametric/wilcoxon/ takes "less" and "greater". The function behind it computed the
p-value from the smaller of the two rank sums, which says nothing about a direction: "less" returned the
small tail and "greater" the large one whichever sample was the larger. For ten pairs in which every
value of the first sample lies above its partner, "greater" got p = 1 and "less" got p = 0.00098. The
one-sided p-value now comes from the sum of the positive ranks, and so does the statistic next to it.
"""
import warnings

from django.test import override_settings
from rest_framework.test import APITestCase
from scipy import stats

URL = "/api/v1/nonparametric/wilcoxon/"
LOW = [10.1, 11.4, 9.8, 12.3, 10.9, 11.7, 9.5, 12.8, 10.4, 11.1]
HIGH = [12.6, 13.9, 11.2, 15.1, 12.2, 14.4, 11.9, 15.6, 12.3, 13.7]      # each value above its partner in LOW
# some above their partner in LOW and some below; the ten differences have ten sizes (0.2 to 1.6), so no ranks are tied
MIXED = [10.4, 10.9, 10.5, 13.4, 10.7, 12.6, 8.2, 13.2, 12.0, 10.3]
# thirty pairs, no two differences of one size: the route uses the normal approximation from 25 pairs on
FIRST = [20.0 + 0.9 * i for i in range(30)]
SECOND = [value + (0.11 * (i + 1)) * (-1 if i % 4 == 0 else 1) for i, value in enumerate(FIRST)]


@override_settings(RATE_LIMIT_ENABLED=False)
class AOneSidedSignedRankRequestTest(APITestCase):
    def _answer(self, x, y, alternative, **sent):
        response = self.client.post(URL, {"x": x, "y": y, "alternative": alternative, "zero_method": "wilcox", **sent},
                                    format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content[:200])
        return response.json()["high_precision_result"]

    def test_greater_means_that_the_first_sample_tends_to_be_larger(self):
        self.assertTrue(all(high > low for high, low in zip(HIGH, LOW)))
        self.assertEqual(sorted(round(abs(m - low), 1) for m, low in zip(MIXED, LOW)), [0.2, 0.3, 0.4, 0.5, 0.7, 0.8, 0.9, 1.1, 1.3, 1.6])
        smallest = 1 / 2 ** len(HIGH)                 # one pattern of signs of 2 ** 10: every difference positive
        self.assertEqual(float(self._answer(HIGH, LOW, "greater")["p_value"]), smallest)
        self.assertEqual(float(self._answer(HIGH, LOW, "less")["p_value"]), 1.0)
        self.assertEqual(float(self._answer(LOW, HIGH, "less")["p_value"]), smallest)
        self.assertEqual(float(self._answer(LOW, HIGH, "greater")["p_value"]), 1.0)

    def test_it_is_scipy_s_answer_in_both_orders(self):
        for label, x, y in (("larger first", HIGH, LOW), ("smaller first", LOW, HIGH), ("mixed", MIXED, LOW), ("mixed, second", LOW, MIXED)):
            for alternative in ("less", "greater", "two-sided"):
                with self.subTest(samples=label, alternative=alternative):
                    answer = self._answer(x, y, alternative)
                    expected = stats.wilcoxon(x, y, alternative=alternative, method="exact")
                    self.assertAlmostEqual(float(answer["p_value"]), float(expected.pvalue), places=12)
                    self.assertEqual(float(answer["test_statistic"]), float(expected.statistic))

    def test_exchanging_the_samples_exchanges_the_two_one_sided_answers(self):
        for x, y in ((MIXED, LOW), (FIRST, SECOND)):
            with self.subTest(pairs=len(x)):
                self.assertEqual(self._answer(x, y, "less")["p_value"], self._answer(y, x, "greater")["p_value"])
                self.assertEqual(self._answer(x, y, "greater")["p_value"], self._answer(y, x, "less")["p_value"])
                self.assertNotEqual(self._answer(x, y, "less")["p_value"], self._answer(x, y, "greater")["p_value"])

    def test_the_normal_approximation_names_the_direction_too(self):
        differences = [a - b for a, b in zip(FIRST, SECOND)]
        self.assertEqual(len(set(abs(round(d, 6)) for d in differences)), len(differences))
        for x, y in ((FIRST, SECOND), (SECOND, FIRST)):
            for alternative in ("less", "greater", "two-sided"):
                with self.subTest(first_is=x[0], alternative=alternative):
                    answer = self._answer(x, y, alternative)
                    with warnings.catch_warnings():
                        warnings.simplefilter("ignore")
                        expected = stats.wilcoxon(x, y, alternative=alternative, method="approx", correction=False)
                    self.assertAlmostEqual(float(answer["p_value"]), float(expected.pvalue), places=9)
                    self.assertAlmostEqual(float(answer["test_statistic"]), float(expected.statistic), places=9)

    def test_a_two_sided_request_keeps_the_smaller_rank_sum(self):
        for x, y in ((HIGH, LOW), (LOW, HIGH)):
            answer = self._answer(x, y, "two-sided")
            self.assertEqual(float(answer["test_statistic"]), 0.0)
            self.assertEqual(float(answer["p_value"]), 2 / 2 ** len(x))
            self.assertEqual(sorted(float(v) for v in answer["sum_ranks"].values()), [0.0, 55.0])
