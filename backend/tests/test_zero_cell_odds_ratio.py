"""A 2 x 2 table with a zero cell gets an answer.

The odds ratio of such a table is infinite. The engine wrote it into the response as it was, the response
could not be encoded as JSON, and the request ended in a server error: for Fisher's exact test, and for a
chi-square request on a sparse table, which the engine sends to Fisher's exact test. A result is now written
as strict JSON: a statistic that is not a finite number is null, and `statistic_note` says why.
"""
import json
import math
import re
from pathlib import Path

from django.conf import settings
from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from scipy import stats

from core.services.cascade_engine import TestResult
from core.services.plain_language_translator import PlainLanguageTranslator

URL = "/api/v1/autonomous/cascade/"
ZERO_CELL = "infinite: a cell of the table is zero"
EMPTY_LINE = "not defined: a row or a column of the table is empty"


def _strict(content):
    """The body parsed as strict JSON: NaN and Infinity are refused."""
    def refuse(name):
        raise AssertionError(f"the body holds {name}, which is not JSON")
    return json.loads(content, parse_constant=refuse)


@override_settings(SECURE_SSL_REDIRECT=False, RATE_LIMIT_ENABLED=False)
class TheEngineEndpointTest(TestCase):
    def _result(self, test, table):
        response = APIClient(raise_request_exception=False).post(URL, {"test": test, "data": {"table": table}}, format="json")
        self.assertEqual(response.status_code, 200, response.content[:200])
        return _strict(response.content)["result"]

    def test_a_zero_cell_is_answered_with_a_null_odds_ratio_and_the_reason(self):
        for table in ([[9, 0], [3, 6]], [[9, 3], [0, 6]]):
            with self.subTest(table=table):
                self.assertTrue(math.isinf(stats.fisher_exact(table)[0]))
                result = self._result("fisher_exact", table)
                self.assertEqual(result["test_name"], "Fisher's Exact Test")
                self.assertIsNone(result["statistic"])
                self.assertIsNone(result["effect_size"])
                self.assertEqual(result["effect_size_name"], "Odds Ratio")
                self.assertEqual(result["statistic_note"], ZERO_CELL)
                self.assertAlmostEqual(result["p_value"], float(stats.fisher_exact(table)[1]), places=12)

    def test_a_chi_square_request_that_the_engine_sends_to_the_exact_test(self):
        result = self._result("chi_square", [[9, 0], [3, 6]])
        self.assertEqual((result["test_name"], result["statistic"], result["statistic_note"]), ("Fisher's Exact Test", None, ZERO_CELL))
        self.assertAlmostEqual(result["p_value"], float(stats.fisher_exact([[9, 0], [3, 6]])[1]), places=12)

    def test_a_table_without_a_zero_cell_is_unchanged(self):
        table = [[8, 2], [3, 6]]
        odds, p = (float(v) for v in stats.fisher_exact(table))
        result = self._result("fisher_exact", table)
        self.assertEqual((result["statistic"], result["effect_size"], result["statistic_note"]), (odds, odds, ""))
        self.assertAlmostEqual(result["p_value"], p, places=12)

    def test_an_empty_row_or_column_has_its_own_reason(self):
        for table in ([[0, 0], [3, 6]], [[0, 9], [0, 6]]):
            with self.subTest(table=table):
                self.assertTrue(math.isnan(stats.fisher_exact(table)[0]))
                result = self._result("fisher_exact", table)
                self.assertEqual((result["statistic"], result["effect_size"], result["statistic_note"]), (None, None, EMPTY_LINE))
                self.assertEqual(result["p_value"], 1.0)


class AResultIsStrictJsonTest(TestCase):
    def test_what_is_not_a_finite_number_is_null(self):
        for value in (float("inf"), float("-inf"), float("nan")):
            written = TestResult("a test", value, 0.5, effect_size=value, degrees_of_freedom=value).to_dict()
            self.assertEqual((written["statistic"], written["effect_size"], written["degrees_of_freedom"]), (None, None, None))
            self.assertEqual(written["statistic_note"], "not a finite number")
            json.dumps(written, allow_nan=False)
        self.assertEqual(TestResult("a test", float("inf"), 0.5, statistic_note="because").to_dict()["statistic_note"], "because")

    def test_what_is_finite_or_absent_is_as_it_was(self):
        written = TestResult("a test", 2.5, 0.25, effect_size=0.8, effect_size_name="d", degrees_of_freedom=12, additional={"n": 14}).to_dict()
        self.assertEqual(written, {"test_name": "a test", "statistic": 2.5, "statistic_note": "", "p_value": 0.25, "effect_size": 0.8,
                                   "effect_size_name": "d", "degrees_of_freedom": 12.0, "additional": {"n": 14}})
        absent = TestResult("a test", 2.5, 0.25).to_dict()
        self.assertEqual((absent["effect_size"], absent["degrees_of_freedom"], absent["statistic_note"]), (None, None, ""))

    def test_no_place_copies_the_statistic_of_a_result_field_by_field(self):
        # the engine's result hangs on a cascade result: <something>.result.statistic
        copied = re.compile(r"""["']statistic["']\s*:\s*\w+\.result\.statistic\b""")
        self.assertTrue(copied.search('"statistic": cascade_result.result.statistic,'))
        self.assertFalse(copied.search('"result": result.result.to_dict() if result.result else None,'))
        backend = Path(settings.BASE_DIR)
        found = [path.relative_to(backend).as_posix() for folder in ("api", "core") for path in sorted((backend / folder).rglob("*.py"))
                 if "tests" not in path.parts and copied.search(path.read_text(encoding="utf-8", errors="replace"))]
        self.assertEqual(found, [])


class TheSentenceForFishersExactTestTest(TestCase):
    def setUp(self):
        self.translate = PlainLanguageTranslator().translate
        self.infinite = TestResult("Fisher's Exact Test", float("inf"), 0.00905, effect_size=float("inf"), effect_size_name="Odds Ratio",
                                   statistic_note=ZERO_CELL).to_dict()
        self.finite = TestResult("Fisher's Exact Test", 8.0, 0.0698, effect_size=8.0, effect_size_name="Odds Ratio").to_dict()

    def test_an_infinite_odds_ratio_is_said_in_words(self):
        plain = self.translate("Fisher's Exact Test", self.infinite, "plain_english", 0.05)
        self.assertEqual(plain["summary"], f"There IS a significant association (the odds ratio is {ZERO_CELL}).")
        self.assertEqual(plain["effect_size_interpretation"], {"category": "odds_ratio", "label": "OR not finite"})
        technical = self.translate("Fisher's Exact Test", self.infinite, "technical", 0.05)
        self.assertEqual(technical["summary"], "Fisher's exact test: OR not finite, p = 0.0091")

    def test_a_finite_odds_ratio_is_printed_as_before(self):
        plain = self.translate("Fisher's Exact Test", dict(self.finite, p_value=0.01), "plain_english", 0.05)
        self.assertEqual(plain["summary"], "There IS a significant association (odds ratio = 8.00).")
        self.assertEqual(plain["effect_size_interpretation"]["label"], "OR = 8.00")
        self.assertEqual(self.translate("Fisher's Exact Test", self.finite, "technical", 0.05)["summary"],
                         "Fisher's exact test: OR = 8.000, p = 0.0698")
