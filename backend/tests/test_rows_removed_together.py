"""Columns that share rows lose their missing values together.

The question path (POST /api/v1/autonomous/query/) removed missing values from each of two columns
on its own and paired what was left by position. The pairs were then no longer rows of the table.
The example below: 40 rows with r = 0.96; one value is missing in each column, in different rows.
The complete rows give r = 0.9586. The answer was r = 0.4768, without a warning.

A row with a missing value in either column is now left out of both, and the response says how
many rows were left out. Independent groups are still cleaned group by group: their rows do not
belong together.
"""

import numpy as np
import pandas as pd
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase
from scipy import stats

from core.services.autonomous_query_handler import AutonomousQueryHandler

QUERY_URL = "/api/v1/autonomous/query/"


def forty_rows():
    """x and y on 40 rows, with one value missing in each column, in rows 3 and 17."""
    rng = np.random.default_rng(5)
    x = rng.normal(0, 1, 40)
    y = x + rng.normal(0, 0.25, 40)
    x[3], y[17] = np.nan, np.nan
    return pd.DataFrame({"dose": x, "response": y})


def rows_of(df, first, second):
    return {(a, b) for a, b in df[[first, second]].dropna().itertuples(index=False, name=None)}


class TheFortyRowExampleTest(SimpleTestCase):
    def setUp(self):
        self.df = forty_rows()
        self.complete = self.df.dropna()
        self.expected = stats.pearsonr(self.complete["dose"], self.complete["response"])

    def test_the_example_is_the_one_described(self):
        self.assertEqual(len(self.complete), 38)
        self.assertEqual(round(float(self.expected[0]), 4), 0.9586)
        column_by_column = stats.pearsonr(self.df["dose"].dropna(), self.df["response"].dropna())[0]
        self.assertEqual(round(float(column_by_column), 4), 0.4768)

    def test_the_question_path_answers_with_the_correlation_of_the_complete_rows(self):
        result = AutonomousQueryHandler().handle_query("Is dose correlated with response?", self.df)
        cascade = result.cascade_result
        self.assertEqual((cascade["original_test"], cascade["final_test"]), ("pearson", "pearson"))
        self.assertAlmostEqual(cascade["result"]["statistic"], float(self.expected[0]), places=12)
        self.assertAlmostEqual(cascade["result"]["p_value"], float(self.expected[1]), places=12)
        self.assertEqual(round(cascade["result"]["statistic"], 4), 0.9586)

    def test_the_response_says_how_many_rows_were_left_out(self):
        result = AutonomousQueryHandler().handle_query("Is dose correlated with response?", self.df)
        self.assertIn(
            "2 of 40 rows have a missing value in 'dose' or 'response' and were left out of both columns; "
            "the test used the 38 complete rows.",
            result.warnings,
        )

    def test_without_missing_values_nothing_is_said(self):
        result = AutonomousQueryHandler().handle_query("Is dose correlated with response?", self.complete)
        self.assertEqual([w for w in result.warnings if "left out" in w], [])
        self.assertEqual(round(result.cascade_result["result"]["statistic"], 4), 0.9586)


@override_settings(RATE_LIMIT_ENABLED=False)
class TheFortyRowExampleOverHttpTest(APITestCase):
    def test_json_with_nulls_gives_the_correlation_of_the_complete_rows_and_says_what_was_left_out(self):
        df = forty_rows()
        columns = {name: [None if np.isnan(v) else float(v) for v in df[name]] for name in df.columns}
        response = self.client.post(QUERY_URL, {"query": "Is dose correlated with response?", "data": columns},
                                    format="json", HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertEqual(round(body["cascade_result"]["result"]["statistic"], 4), 0.9586)
        self.assertTrue(any(w.startswith("2 of 40 rows have a missing value in 'dose' or 'response'")
                            for w in body["warnings"]), body["warnings"])


class EveryKindOfRequestTest(SimpleTestCase):
    """_prepare_test_data_and_count, for each kind of test the question path can select."""

    def setUp(self):
        self.handler = AutonomousQueryHandler()
        self.df = forty_rows()

    def prepare(self, df, variables, test):
        return self.handler._prepare_test_data_and_count(df, variables, test, None)

    def test_two_variables_of_the_same_rows_are_handed_over_as_rows(self):
        rows = rows_of(self.df, "dose", "response")
        for test in ("pearson", "spearman", "kendall", "linear_regression", "paired_t", "wilcoxon_signed_rank"):
            with self.subTest(test=test):
                (x, y), note = self.prepare(self.df, ["dose", "response"], test)
                self.assertEqual(len(x), 38)
                self.assertEqual(len(y), 38)
                self.assertEqual({(a, b) for a, b in zip(x, y)}, rows)
                self.assertEqual(x.dtype, float)
                self.assertTrue(note.startswith("2 of 40 rows have a missing value in 'dose' or 'response'"))

    def test_columns_with_different_numbers_of_missing_values_are_not_cut_to_the_shorter(self):
        df = self.df.copy()
        df.loc[[8, 9, 30], "dose"] = np.nan        # four missing in one column, one in the other
        (x, y), note = self.prepare(df, ["dose", "response"], "pearson")
        self.assertEqual({(a, b) for a, b in zip(x, y)}, rows_of(df, "dose", "response"))
        self.assertEqual(len(x), 35)
        self.assertTrue(note.startswith("5 of 40 rows have a missing value"))

    def test_two_columns_of_labels_are_handed_over_as_rows(self):
        rng = np.random.default_rng(3)
        sex = rng.choice(["male", "female"], 40).astype(object)
        answer = np.where(sex == "male", "yes", "no").astype(object)      # the answer follows the sex exactly
        df = pd.DataFrame({"sex": sex, "answer": answer})
        df.loc[3, "sex"] = None
        df.loc[30, "answer"] = None
        for test in ("chi_square_independence", "fisher_exact"):
            with self.subTest(test=test):
                (a, b), note = self.prepare(df, ["sex", "answer"], test)
                self.assertEqual(set(zip(a, b)), {("male", "yes"), ("female", "no")})
                self.assertEqual((len(a), len(b)), (38, 38))
                self.assertTrue(note.startswith("2 of 40 rows have a missing value in 'sex' or 'answer'"))

    def test_nothing_missing_nothing_said_and_nothing_removed(self):
        df = self.df.dropna()
        (x, y), note = self.prepare(df, ["dose", "response"], "pearson")
        self.assertIsNone(note)
        self.assertEqual(x.tolist(), df["dose"].tolist())
        self.assertEqual(y.tolist(), df["response"].tolist())

    def test_independent_groups_are_cleaned_group_by_group(self):
        df = pd.DataFrame({"arm": ["a"] * 6 + ["b"] * 6 + [None],
                           "score": [1.0, 2.0, np.nan, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, np.nan, np.nan, 12.0, 13.0]})
        profile = self.handler.profiler.profile_and_recommend(df)
        data, note = self.handler._prepare_test_data_and_count(df, ["arm", "score"], "welch_t", profile)
        self.assertEqual({k: v.tolist() for k, v in data.items()}, {"a": [1.0, 2.0, 4.0, 5.0, 6.0], "b": [7.0, 8.0, 9.0, 12.0]})
        self.assertEqual(note, "4 of 13 rows have no value in 'score' or no group in 'arm' and were left out.")

    def test_two_numeric_columns_compared_as_groups_are_cleaned_column_by_column_and_it_says_so(self):
        profile = self.handler.profiler.profile_and_recommend(self.df)      # no grouping column in it
        data, note = self.handler._prepare_test_data_and_count(self.df, ["dose", "response"], "independent_t", profile)
        self.assertEqual([len(g) for g in data], [39, 39])
        self.assertEqual(data[0].tolist(), self.df["dose"].dropna().tolist())
        self.assertEqual(note, "Missing values were left out column by column ('dose': 1, 'response': 1); "
                               "the columns were treated as separate groups.")

    def test_the_earlier_entry_point_returns_the_same_data(self):
        x, y = self.handler._prepare_test_data(self.df, ["dose", "response"], "pearson", None)
        (x2, y2), _ = self.prepare(self.df, ["dose", "response"], "pearson")
        self.assertEqual((x.tolist(), y.tolist()), (x2.tolist(), y2.tolist()))

    def test_no_usable_column_is_still_no_data(self):
        self.assertEqual(self.handler._prepare_test_data_and_count(self.df, ["absent"], "pearson", self._no_questions()), (None, None))

    @staticmethod
    def _no_questions():
        class Profile:
            inferred_questions = []
        return Profile()
