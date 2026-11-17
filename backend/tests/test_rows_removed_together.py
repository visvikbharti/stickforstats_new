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


class TheManuscriptCheckLinksRowsTest(SimpleTestCase):
    """The manuscript check re-runs a reported test on the authors' table (core/manuscript).

    Its linker dropped missing values from the two variables of a correlation one by one. On the 40-row
    table the sentence "r(36) = .96", which is right, was recomputed as 0.4768 and reported DISCREPANT.
    """

    SENTENCE = "Dose and response were strongly correlated, r(36) = .96, p < .001."

    @staticmethod
    def claim(claim_type, test_name, raw_text):
        from types import SimpleNamespace
        return SimpleNamespace(claim_type=claim_type, test_name=test_name, raw_text=raw_text)

    def test_a_reported_correlation_is_recomputed_on_the_complete_rows_and_verified(self):
        from core.manuscript.verify_pipeline import verify_manuscript
        profile = verify_manuscript(self.SENTENCE, dataframe=forty_rows())
        (verdict,) = profile.claim_verdicts
        self.assertEqual(verdict.verdict.name, "VERIFIED")
        self.assertEqual(round(verdict.recomputed_statistic, 4), 0.9586)
        self.assertIn("data: 2 of 40 rows have a missing value in 'dose' or 'response' and were left out of both "
                      "columns; 38 complete rows were tested", verdict.notes)

    def test_without_missing_values_the_check_says_nothing_about_rows(self):
        from core.manuscript.verify_pipeline import verify_manuscript
        profile = verify_manuscript(self.SENTENCE, dataframe=forty_rows().dropna())
        (verdict,) = profile.claim_verdicts
        self.assertEqual(verdict.verdict.name, "VERIFIED")
        self.assertEqual([n for n in verdict.notes if n.startswith("data:")], [])

    def test_the_linker_hands_over_rows_for_every_correlation(self):
        from core.manuscript.claim_data_linker import link_claim_to_table
        df = forty_rows()
        for name in ("Pearson correlation", "Spearman correlation", "Kendall tau"):
            with self.subTest(name=name):
                link = link_claim_to_table(self.claim("r_value", name, "dose and response were correlated"), df)
                self.assertEqual(link.status, "linked")
                spec = link.data_spec
                self.assertEqual(set(zip(spec.x, spec.y)), rows_of(df, "dose", "response"))
                self.assertEqual((len(spec.x), len(spec.y), spec.n), (38, 38, 38))

    def test_a_paired_test_on_a_long_table_leaves_out_pairs_not_values(self):
        from core.manuscript.claim_data_linker import link_claim_to_table
        before = [10.0, 11.0, np.nan, 13.0, 14.0, 15.0]
        after = [10.5, 11.5, 12.5, np.nan, 14.5, 15.5]
        df = pd.DataFrame({"time": ["before"] * 6 + ["after"] * 6, "score": before + after})
        link = link_claim_to_table(self.claim("t_statistic", "paired t-test", "score differed by time"), df)
        self.assertEqual(link.status, "linked")
        spec = link.data_spec
        self.assertEqual(spec.groups, [[10.0, 11.0, 14.0, 15.0], [10.5, 11.5, 14.5, 15.5]])
        self.assertEqual(spec.n, 4)
        self.assertEqual(spec.missing_note, "data: 2 of 6 pairs of 'score' have a missing value and were left out as pairs; "
                                            "4 complete pairs were tested")

    def test_a_paired_test_with_levels_of_different_size_is_not_linked(self):
        from core.manuscript.claim_data_linker import link_claim_to_table
        df = pd.DataFrame({"time": ["before"] * 6 + ["after"] * 5, "score": [float(i) for i in range(11)]})
        link = link_claim_to_table(self.claim("t_statistic", "paired t-test", "score differed by time"), df)
        self.assertEqual(link.status, "ambiguous")
        self.assertIn("(6 and 5 found)", link.reason)
        self.assertIsNone(link.data_spec)

    def test_independent_groups_on_a_long_table_are_still_cleaned_level_by_level(self):
        from core.manuscript.claim_data_linker import link_claim_to_table
        df = pd.DataFrame({"arm": ["a"] * 4 + ["b"] * 4, "score": [1.0, np.nan, 3.0, 4.0, 5.0, 6.0, 7.0, np.nan]})
        link = link_claim_to_table(self.claim("t_statistic", "independent-samples t-test", "score differed by arm"), df)
        spec = link.data_spec
        self.assertEqual(spec.groups, [[1.0, 3.0, 4.0], [5.0, 6.0, 7.0]])
        self.assertEqual((spec.n, spec.missing_note), (6, None))


def paired_columns():
    """The 40-row example as two measurements of the same 40 units."""
    df = forty_rows()
    return df["dose"].to_numpy(), df["response"].to_numpy()


def with_nulls(values):
    return [None if np.isnan(v) else float(v) for v in values]


@override_settings(RATE_LIMIT_ENABLED=False)
class ThePairedConfidenceIntervalTest(APITestCase):
    """POST /api/v1/confidence-intervals/calculate/compare/ with "paired": true removed missing values array by
    array and subtracted what was left. On the 40-row example it answered a mean difference of -0.0332 from 39
    "pairs"; the 38 complete pairs give 0.0093."""

    URL = "/api/v1/confidence-intervals/calculate/compare/"

    def setUp(self):
        self.first, self.second = paired_columns()
        self.complete = np.isfinite(self.first) & np.isfinite(self.second)
        self.expected = float(np.mean(self.first[self.complete] - self.second[self.complete]))

    def post(self, **body):
        return self.client.post(self.URL, body, format="json", HTTP_X_FORWARDED_PROTO="https")

    def test_the_example_is_the_one_described(self):
        self.assertEqual(round(self.expected, 4), 0.0093)
        by_array = np.mean(self.first[np.isfinite(self.first)] - self.second[np.isfinite(self.second)])
        self.assertEqual(round(float(by_array), 4), -0.0332)

    def test_a_pair_with_a_missing_value_is_left_out_as_a_pair(self):
        response = self.post(group1=with_nulls(self.first), group2=with_nulls(self.second), paired=True)
        self.assertEqual(response.status_code, 200, response.content)
        body = response.json()
        self.assertAlmostEqual(body["mean_difference"], self.expected, places=12)
        self.assertEqual((body["sample_size"], body["pairs_left_out"]), (38, 2))
        self.assertAlmostEqual(body["group1_mean"], float(np.mean(self.first[self.complete])), places=12)

    def test_nothing_missing_nothing_left_out(self):
        first, second = self.first[self.complete], self.second[self.complete]
        body = self.post(group1=first.tolist(), group2=second.tolist(), paired=True).json()
        self.assertEqual((body["sample_size"], body["pairs_left_out"]), (38, 0))
        self.assertAlmostEqual(body["mean_difference"], self.expected, places=12)

    def test_arrays_of_different_length_are_refused_as_supplied(self):
        # 40 values with one missing, and 39 values: removed array by array, both would hold 39
        shorter = self.second[np.isfinite(self.second)].tolist()
        self.assertEqual((len(shorter), int(np.isfinite(self.first).sum())), (39, 39))
        response = self.post(group1=with_nulls(self.first), group2=shorter, paired=True)
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("Paired samples must have equal sizes", response.json()["error"])

    def test_independent_groups_are_cleaned_array_by_array(self):
        body = self.post(group1=with_nulls(self.first), group2=with_nulls(self.second)[:-5], paired=False).json()
        self.assertNotIn("pairs_left_out", body)
        self.assertAlmostEqual(body["group1_mean"], float(np.nanmean(self.first)), places=12)
        self.assertAlmostEqual(body["group2_mean"], float(np.nanmean(self.second[:-5])), places=12)


@override_settings(RATE_LIMIT_ENABLED=False)
class ThePairedDesignInTheGuardianCheckTest(APITestCase):
    """A paired design was checked on `first[:n] - second[:n]` with n the shorter length: columns of different
    length were cut and subtracted, and a missing value made a missing difference."""

    URL = "/api/guardian/check/"

    def setUp(self):
        self.first, self.second = paired_columns()

    def post(self, first, second):
        return self.client.post(self.URL, {"data": [first, second], "test_type": "paired_t", "design": "paired"},
                                format="json", HTTP_X_FORWARDED_PROTO="https")

    def test_columns_of_different_length_are_refused(self):
        complete = np.isfinite(self.first) & np.isfinite(self.second)
        response = self.post(self.first[np.isfinite(self.first)].tolist(), self.second[complete].tolist())
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("A paired design needs two columns of the same length", response.json()["error"])
        self.assertIn("The columns hold 39 and 38 values.", response.json()["error"])

    def test_the_checks_run_on_the_differences_of_the_complete_pairs_and_the_report_says_so(self):
        from unittest import mock

        from core.guardian.guardian_core import GuardianCore

        guardian = GuardianCore()
        seen = []
        real = guardian.validators["normality"].validate
        with mock.patch.object(guardian.validators["normality"], "validate",
                               side_effect=lambda arrays, alpha: (seen.append([np.asarray(a) for a in arrays]),
                                                                  real(arrays, alpha))[1]):
            report = guardian.check(data=[self.first, self.second], test_type="paired_t", design="paired")
        complete = np.isfinite(self.first) & np.isfinite(self.second)
        self.assertEqual(len(seen), 1)
        (differences,) = seen[0]
        self.assertEqual(differences.tolist(), (self.first[complete] - self.second[complete]).tolist())
        self.assertEqual([i["message"] for i in report.information if i["assumption"] == "paired_design"],
                         ["2 of 40 pairs have a missing value and were left out as pairs; the checks were run on the "
                          "differences of the complete pairs."])

    def test_complete_columns_carry_no_such_note(self):
        complete = np.isfinite(self.first) & np.isfinite(self.second)
        response = self.post(self.first[complete].tolist(), self.second[complete].tolist())
        self.assertEqual(response.status_code, 200, response.content)
        self.assertNotIn("paired_design", response.content.decode())

    def test_too_few_complete_pairs_are_refused(self):
        response = self.post([1.0, None, 3.0, None], [None, 2.0, 3.5, None])
        self.assertEqual(response.status_code, 400, response.content)
        self.assertIn("1 of the 4 pairs have a value in both columns", response.json()["error"])


class TheTestRecommenderPreparesPairsTest(SimpleTestCase):
    def test_a_paired_request_is_prepared_from_complete_rows(self):
        from core.api_views import TestExecutionView

        df = forty_rows()
        for test_type in ("paired", "Paired T-Test", "wilcoxon signed-rank"):
            with self.subTest(test_type=test_type):
                first, second = TestExecutionView()._prepare_guardian_data(df, test_type, "dose", ["response"])
                self.assertEqual(set(zip(first, second)), rows_of(df, "dose", "response"))
                self.assertEqual((len(first), len(second)), (38, 38))


@override_settings(RATE_LIMIT_ENABLED=False)
class AnEmptyEntryInATextColumnTest(APITestCase):
    """A column may be sent as comma-separated text, and an empty entry in it ("5.1,,4.9") is skipped. Where the
    position says which unit a value belongs to, skipping it moved every later value one position up: with one
    empty entry in each column, in different places, the paired t-test, the repeated-measures ANOVA and the ANCOVA
    answered from values of different units. Those requests are now refused. A null in a list already was."""

    A, B, C = "5.1,4.9,6.0,5.5,5.8", "4.8,5.0,5.5,5.2,5.9", "6.1,5.2,6.6,5.9,6.4"
    A_GAP, B_GAP, C_GAP = "5.1,,4.9,6.0,5.5,5.8", "4.8,5.0,,5.5,5.2,5.9", "6.1,5.2,6.6,,5.9,6.4"

    def post(self, url, body):
        return self.client.post(url, body, format="json", HTTP_X_FORWARDED_PROTO="https")

    def refusal(self, response):
        self.assertEqual(response.status_code, 400, response.content)
        return " ".join(response.json()["details"]["non_field_errors"])

    def test_the_positions_of_empty_entries(self):
        from api.v1.serializers import empty_entries

        self.assertEqual(empty_entries("5.1,,4.9, ,6.0"), [2, 4])
        self.assertEqual(empty_entries(",5.1"), [1])
        self.assertEqual(empty_entries("5.1,4.9,"), [])            # a trailing separator
        self.assertEqual(empty_entries("5.1,4.9,, "), [])
        self.assertEqual(empty_entries("5.1,4.9"), [])
        self.assertEqual(empty_entries([5.1, None, 4.9]), [])      # not text: the field itself refuses a null

    def test_a_paired_t_test_refuses_an_empty_entry_and_says_where(self):
        for body, where in (({"data1": self.A_GAP, "data2": self.B_GAP}, "data1 has an empty entry at position 2"),
                            ({"data1": self.A, "data2": self.B_GAP}, "data2 has an empty entry at position 3")):
            with self.subTest(where=where):
                message = self.refusal(self.post("/api/v1/stats/ttest/", {"test_type": "paired", **body}))
                self.assertIn(where, message)
                self.assertIn("Remove that pair from both columns.", message)

    def test_a_paired_t_test_on_complete_text_columns_is_unchanged(self):
        with_text = self.post("/api/v1/stats/ttest/", {"test_type": "paired", "data1": self.A, "data2": self.B})
        with_lists = self.post("/api/v1/stats/ttest/", {"test_type": "paired",
                                                        "data1": [float(v) for v in self.A.split(",")],
                                                        "data2": [float(v) for v in self.B.split(",")]})
        trailing = self.post("/api/v1/stats/ttest/", {"test_type": "paired", "data1": self.A + ",", "data2": self.B})
        for response in (with_text, with_lists, trailing):
            self.assertEqual(response.status_code, 200, response.content)
        expected = with_lists.json()["high_precision_result"]["t_statistic"]
        self.assertEqual(with_text.json()["high_precision_result"]["t_statistic"], expected)
        self.assertEqual(trailing.json()["high_precision_result"]["t_statistic"], expected)

    def test_two_separate_samples_may_still_have_an_empty_entry(self):
        response = self.post("/api/v1/stats/ttest/", {"test_type": "two_sample", "data1": self.A_GAP, "data2": self.B})
        self.assertEqual(response.status_code, 200, response.content)

    def test_a_repeated_measures_anova_refuses_an_empty_entry_under_every_name_and_address(self):
        conditions = [{"name": "week1", "data": self.A}, {"name": "week2", "data": self.B_GAP}, {"name": "week3", "data": self.C_GAP}]
        for url in ("/api/v1/stats/anova/", "/api/v1/anova/repeated-measures/"):
            for key in ("groups", "data"):
                for kind in ({"anova_type": "repeated_measures"}, {"anova_type": "rm"}, {"anova_type": "repeated-measures"}):
                    with self.subTest(url=url, key=key, kind=kind):
                        message = self.refusal(self.post(url, {**kind, key: conditions}))
                        self.assertIn("Condition week2 has an empty entry at position 3", message)
                        self.assertIn("Remove that subject from every condition.", message)

    def test_a_repeated_measures_anova_on_complete_text_columns_runs(self):
        conditions = [{"name": "week1", "data": self.A}, {"name": "week2", "data": self.B}, {"name": "week3", "data": self.C}]
        response = self.post("/api/v1/stats/anova/", {"anova_type": "repeated_measures", "groups": conditions})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNotNone(response.json()["high_precision_result"]["f_statistic"])

    def test_a_one_way_anova_may_still_have_an_empty_entry(self):
        groups = [{"name": "a", "data": self.A_GAP}, {"name": "b", "data": self.B_GAP}, {"name": "c", "data": self.C}]
        response = self.post("/api/v1/stats/anova/", {"anova_type": "one_way", "groups": groups})
        self.assertEqual(response.status_code, 200, response.content)

    def test_an_ancova_refuses_an_empty_entry_in_a_group_or_in_a_covariate(self):
        groups = [{"name": "a", "data": self.A}, {"name": "b", "data": self.B}]
        age = {"name": "age", "data": "30,31,32,33,34,35,36,37,38,39"}
        complete = self.post("/api/v1/stats/ancova/", {"groups": groups, "covariates": [age]})
        self.assertEqual(complete.status_code, 200, complete.content)
        in_group = self.post("/api/v1/stats/ancova/", {"groups": [{"name": "a", "data": self.A_GAP}, groups[1]],
                                                       "covariates": [{"name": "age", "data": "30,31,32,33,34,35,,36,37,38,39"}]})
        self.assertIn("Group a has an empty entry at position 2", self.refusal(in_group))
        in_covariate = self.post("/api/v1/stats/ancova/", {"groups": groups,
                                                           "covariates": [{"name": "age", "data": "30,31,32,33,,34,35,36,37,38,39"}]})
        message = self.refusal(in_covariate)
        self.assertIn("Covariate age has an empty entry at position 5", message)
        self.assertIn("Remove that observation from its group and from every covariate.", message)


@override_settings(RATE_LIMIT_ENABLED=False)
class TheControlChartNumbersTheRowsOfTheTableTest(APITestCase):
    """An individuals and moving-range chart reports the rows whose moving range is out of control. The rows were
    counted along the moving ranges that exist, so one missing measurement moved every later signal two rows up:
    a jump in row 18 was reported in rows 16 and 17."""

    URL = "/api/v1/sqc-analysis/quick-control-chart/"

    @staticmethod
    def series():
        values = [10.0 + 0.1 * (i % 3) for i in range(24)]
        values[18] = 14.0                    # one jump up, and down again in row 19
        return values

    def moving_range_signals(self, measurements):
        response = self.client.post(self.URL, {"measurements": measurements, "chart_type": "i_mr"}, format="json",
                                    HTTP_X_FORWARDED_PROTO="https")
        self.assertEqual(response.status_code, 200, response.content)
        violations = response.json()["data"]["results"]["violations"]
        return sorted(v["index"] for v in violations if v["type"] == "Out of control (mr)")

    def test_the_jump_is_reported_in_its_own_rows(self):
        self.assertEqual(self.moving_range_signals(self.series()), [18, 19])

    def test_a_missing_measurement_before_the_jump_does_not_move_it(self):
        for missing in (5, 0, 12):
            with self.subTest(missing=missing):
                series = [None if i == missing else v for i, v in enumerate(self.series())]
                self.assertEqual(self.moving_range_signals(series), [18, 19])

    def test_the_service_reads_the_same_rows(self):
        from sqc_analysis.services.control_chart_service import ControlChartService

        series = [np.nan if i == 5 else v for i, v in enumerate(self.series())]
        result = ControlChartService().analyze_control_chart(pd.DataFrame({"Measurement": series}), chart_type="imr")
        self.assertEqual(result["out_of_control"], {"individuals": [18], "mr": [18, 19]})
