"""The signed-rank route computes the test on the pairs that differ, unless the request names another method.

A pair that does not differ says nothing about the direction of a change, and Wilcoxon's test leaves it out.
The route's default was "pratt". For that method the function ranks the zero differences with the others and
then reads the p-value from the distribution for as many untied ranks as there are pairs: nine pairs without
a difference and five that rise got p = 0.000122, where five differences cannot give less than 0.0625. The
analysis hub and the Python client send no method, so that was the number they showed.
"""
from django.test import override_settings
from rest_framework.test import APITestCase
from scipy import stats

URL = "/api/v1/nonparametric/wilcoxon/"
# (first column, second column, pairs that differ): every pair that differs rises
TWO_OF_FIVE_DO_NOT_DIFFER = ([5, 7, 4, 6, 9], [5, 7, 5, 8, 12], 3)
NINE_OF_FOURTEEN_DO_NOT_DIFFER = ([3] * 9 + [1, 2, 3, 4, 5], [3] * 9 + [2, 4, 6, 8, 10], 5)
EVERY_PAIR_DIFFERS = ([12.1, 14.3, 11.2, 15.8, 13.4, 16.9], [13.0, 14.1, 12.9, 17.4, 13.1, 19.5])


@override_settings(RATE_LIMIT_ENABLED=False)
class TheSignedRankRouteLeavesOutPairsThatDoNotDifferTest(APITestCase):
    def _answer(self, x, y, **sent):
        response = self.client.post(URL, {"x": x, "y": y, **sent}, format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content[:200])
        return response.json()["high_precision_result"]

    def test_a_request_without_a_method_is_computed_on_the_pairs_that_differ(self):
        for x, y, differ in (TWO_OF_FIVE_DO_NOT_DIFFER, NINE_OF_FOURTEEN_DO_NOT_DIFFER):
            with self.subTest(pairs=len(x), differ=differ):
                answer = self._answer(x, y)
                self.assertEqual(answer["sample_sizes"], [len(x), differ])
                # Every pair that differs rises, so the result is the most extreme one that `differ`
                # differences can give: one pattern of signs in each tail, of 2 ** differ.
                self.assertAlmostEqual(float(answer["p_value"]), 2 / 2 ** differ, places=12)
                nonzero = [a - b for a, b in zip(x, y) if a != b]
                self.assertAlmostEqual(float(answer["p_value"]), float(stats.wilcoxon(nonzero).pvalue), places=12)
                self.assertEqual(float(answer["test_statistic"]), 0.0)

    def test_the_default_is_the_method_named_wilcox(self):
        x, y, _ = NINE_OF_FOURTEEN_DO_NOT_DIFFER
        self.assertEqual(self._answer(x, y), self._answer(x, y, zero_method="wilcox"))

    def test_the_function_called_without_a_method_does_the_same(self):
        from core.hp_nonparametric_comprehensive import HighPrecisionNonParametric

        x, y, differ = NINE_OF_FOURTEEN_DO_NOT_DIFFER
        direct = HighPrecisionNonParametric().wilcoxon_signed_rank(x, y)
        self.assertEqual(direct.sample_sizes, [len(x), differ])
        self.assertAlmostEqual(float(direct.p_value), float(self._answer(x, y)["p_value"]), places=12)

    def test_a_request_that_names_another_method_gets_that_method(self):
        x, y, differ = NINE_OF_FOURTEEN_DO_NOT_DIFFER
        for method in ("pratt", "zsplit"):
            with self.subTest(zero_method=method):
                answer = self._answer(x, y, zero_method=method)
                # Both methods keep every pair in the ranking; the second number is how many were ranked.
                self.assertEqual(answer["sample_sizes"], [len(x), len(x)])
                self.assertNotEqual(answer, self._answer(x, y))

    def test_data_in_which_every_pair_differs_get_the_answer_they_got(self):
        x, y = EVERY_PAIR_DIFFERS
        self.assertTrue(all(a != b for a, b in zip(x, y)))
        default = self._answer(x, y)
        for method in ("wilcox", "pratt", "zsplit"):
            with self.subTest(zero_method=method):
                self.assertEqual(self._answer(x, y, zero_method=method), default)
        self.assertEqual(default["sample_sizes"], [len(x), len(x)])
        self.assertAlmostEqual(float(default["p_value"]), float(stats.wilcoxon(x, y).pvalue), places=12)
