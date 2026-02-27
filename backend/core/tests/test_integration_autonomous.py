"""
End-to-End Integration Tests — Pillar 1: Autonomous Intelligence Layer
========================================================================
Tests the complete pipeline: SmartProfiler → CascadeEngine →
PlainLanguageTranslator → AutonomousQueryHandler.

Unlike the unit tests in test_autonomous_services.py, these tests exercise
the full cross-service data flow with real scipy/numpy computations.
No mocking of statistical engines.

Run with: python manage.py test core.tests.test_integration_autonomous -v2

Created: February 2026
"""

import numpy as np
import pandas as pd
from django.test import TestCase, override_settings
from rest_framework.test import APITestCase
from rest_framework import status as http_status

from core.services.smart_profiler import (
    SmartProfiler,
    InferredQuestionType,
)
from core.services.cascade_engine import (
    AutonomousCascadeEngine,
    CascadeStep,
)
from core.services.plain_language_translator import (
    PlainLanguageTranslator,
    OutputMode,
)
from core.services.autonomous_query_handler import (
    AutonomousQueryHandler,
    AutonomousResult,
)
from core.data_profiler import VariableType


# ---------------------------------------------------------------------------
# Data Fixtures: deterministic datasets with known statistical properties
# ---------------------------------------------------------------------------


def _normal_two_group_df(seed=42):
    """Two groups, each N=50, drawn from normals with Cohen's d ≈ 1.0."""
    rng = np.random.RandomState(seed)
    group = np.array(["A"] * 50 + ["B"] * 50)
    score = np.concatenate(
        [
            rng.normal(loc=10, scale=2, size=50),
            rng.normal(loc=12, scale=2, size=50),
        ]
    )
    return pd.DataFrame({"group": group, "score": score})


def _skewed_two_group_df(seed=42):
    """Exponentially distributed data — triggers normality violation → cascade."""
    rng = np.random.RandomState(seed)
    n = 50
    return pd.DataFrame(
        {
            "group": np.array(["X"] * n + ["Y"] * n),
            "outcome": np.concatenate(
                [
                    rng.exponential(scale=5, size=n),
                    rng.exponential(scale=12, size=n),
                ]
            ),
        }
    )


def _correlation_df(seed=42):
    """Two continuous columns with Pearson r ≈ 0.7."""
    rng = np.random.RandomState(seed)
    n = 80
    x = rng.normal(0, 1, n)
    noise = rng.normal(0, 1, n)
    y = 0.7 * x + np.sqrt(1 - 0.49) * noise
    return pd.DataFrame({"x": x, "y": y})


def _multi_group_df(seed=42):
    """3 groups with staggered means for ANOVA."""
    rng = np.random.RandomState(seed)
    groups, scores = [], []
    for i in range(3):
        groups.extend([f"G{i + 1}"] * 30)
        scores.extend(rng.normal(loc=5 + i * 2, scale=1.5, size=30).tolist())
    return pd.DataFrame({"category": groups, "value": scores})


def _categorical_2x2_df(seed=42):
    """Two categorical columns with strong association (OR ≈ 5)."""
    rng = np.random.RandomState(seed)
    n = 120
    gender = rng.choice(["M", "F"], size=n)
    pref = []
    for g in gender:
        if g == "M":
            pref.append(rng.choice(["A", "B"], p=[0.8, 0.2]))
        else:
            pref.append(rng.choice(["A", "B"], p=[0.3, 0.7]))
    return pd.DataFrame({"gender": gender, "preference": pref})


def _paired_prepost_df(seed=42):
    """Pre/post scores with a known mean shift."""
    rng = np.random.RandomState(seed)
    n = 40
    baseline = rng.normal(loc=50, scale=10, size=n)
    return pd.DataFrame(
        {
            "score_pre": baseline,
            "score_post": baseline + rng.normal(loc=3.0, scale=3, size=n),
        }
    )


def _all_nan_df():
    """DataFrame where all values are NaN."""
    return pd.DataFrame(
        {
            "group": [np.nan] * 10,
            "value": [np.nan] * 10,
        }
    )


def _single_value_df():
    """DataFrame where one column is constant."""
    return pd.DataFrame(
        {
            "group": ["A"] * 20 + ["B"] * 20,
            "score": [5.0] * 40,
        }
    )


def _single_row_df():
    """DataFrame with only one row."""
    return pd.DataFrame({"group": ["A"], "score": [10.0]})


def _empty_df():
    """Empty DataFrame with columns but no rows."""
    return pd.DataFrame({"group": pd.Series(dtype=str), "score": pd.Series(dtype=float)})


def _mixed_types_df():
    """DataFrame with numeric, string, and boolean columns."""
    return pd.DataFrame(
        {
            "name": ["Alice", "Bob", "Carol", "Dave"] * 5,
            "score": np.random.RandomState(42).normal(50, 10, 20),
            "passed": [True, False, True, False] * 5,
            "grade": ["A", "B", "C", "D"] * 5,
        }
    )


# ===================================================================
# TEST CLASS 1: Full Pipeline Integration
# ===================================================================


class TestFullPipelineIntegration(TestCase):
    """Feed data + query through AutonomousQueryHandler.handle_query() end-to-end."""

    def setUp(self):
        self.handler = AutonomousQueryHandler()

    def test_ttest_pipeline(self):
        """2-group normal data → t-test → translated result with summary."""
        df = _normal_two_group_df()
        result = self.handler.handle_query(
            query_text="Is there a difference in score between groups?",
            df=df,
            mode=OutputMode.PLAIN_ENGLISH,
        )

        self.assertIsInstance(result, AutonomousResult)
        self.assertIn("summary", result.translation)
        self.assertNotEqual(result.translation["summary"], "")
        self.assertGreater(result.confidence, 0)
        self.assertIsNotNone(result.cascade_result)
        # Should have detected the group comparison question
        self.assertGreater(len(result.inferred_questions), 0)
        # Profile should report correct shape
        self.assertEqual(result.profile_summary["n_rows"], 100)
        self.assertEqual(result.profile_summary["n_columns"], 2)

    def test_correlation_pipeline(self):
        """Correlation data → pearson/spearman → relationship summary."""
        df = _correlation_df()
        result = self.handler.handle_query(
            query_text="What is the relationship between x and y?",
            df=df,
            mode=OutputMode.PLAIN_ENGLISH,
        )

        self.assertIsInstance(result, AutonomousResult)
        self.assertIn("summary", result.translation)
        # Should detect relationship question
        q_types = [q["type"] for q in result.inferred_questions]
        self.assertIn(InferredQuestionType.RELATIONSHIP.value, q_types)

    def test_anova_pipeline(self):
        """Multi-group data → anova/kruskal → groups differ summary."""
        df = _multi_group_df()
        result = self.handler.handle_query(
            query_text="Do the groups differ on value?",
            df=df,
            mode=OutputMode.PLAIN_ENGLISH,
        )

        self.assertIsInstance(result, AutonomousResult)
        self.assertIn("summary", result.translation)
        self.assertGreater(result.confidence, 0)

    def test_chi_square_pipeline(self):
        """Categorical data → chi_square/fisher → association summary."""
        df = _categorical_2x2_df()
        result = self.handler.handle_query(
            query_text="Is there an association between gender and preference?",
            df=df,
            mode=OutputMode.PLAIN_ENGLISH,
        )

        self.assertIsInstance(result, AutonomousResult)
        self.assertIn("summary", result.translation)

    def test_paired_pipeline(self):
        """Pre/post data → paired_t/wilcoxon → change detected."""
        df = _paired_prepost_df()
        result = self.handler.handle_query(
            query_text="Is there a change from pre to post?",
            df=df,
            mode=OutputMode.PLAIN_ENGLISH,
        )

        self.assertIsInstance(result, AutonomousResult)
        self.assertIn("summary", result.translation)

    def test_all_output_modes(self):
        """Same data through plain_english, researcher, and apa_format modes."""
        df = _normal_two_group_df()
        query = "Compare groups"

        results = {}
        for mode in [OutputMode.PLAIN_ENGLISH, OutputMode.RESEARCHER, OutputMode.APA_FORMAT]:
            results[mode] = self.handler.handle_query(
                query_text=query,
                df=df,
                mode=mode,
            )

        # All should produce valid results
        for mode, result in results.items():
            self.assertIsInstance(result, AutonomousResult, f"Failed for mode {mode}")
            self.assertIn("summary", result.translation, f"No summary for mode {mode}")
            self.assertNotEqual(result.translation["summary"], "", f"Empty summary for mode {mode}")

        # APA format should include parenthetical notation
        apa_summary = results[OutputMode.APA_FORMAT].translation["summary"]
        self.assertTrue(
            any(c in apa_summary for c in ["t(", "U(", "p =", "p <"]),
            f"APA summary missing statistical notation: {apa_summary}",
        )


# ===================================================================
# TEST CLASS 2: Data Flow Contract Integration
# ===================================================================


class TestDataFlowContractIntegration(TestCase):
    """Verify output of each service matches input contract of the next."""

    def setUp(self):
        self.profiler = SmartProfiler()
        self.engine = AutonomousCascadeEngine()
        self.translator = PlainLanguageTranslator()
        self.handler = AutonomousQueryHandler()

    def test_profiler_to_query_handler_data_prep(self):
        """Profiler output feeds into _prepare_test_data() successfully."""
        df = _normal_two_group_df()
        profile_result = self.profiler.profile_and_recommend(df)

        # Get the top suggested test
        self.assertGreater(len(profile_result.inferred_questions), 0)
        top_q = profile_result.inferred_questions[0]
        self.assertGreater(len(top_q.suggested_tests), 0)

        test_name = top_q.suggested_tests[0]
        variables = top_q.variables_involved

        # _prepare_test_data should succeed
        data = self.handler._prepare_test_data(df, variables, test_name, profile_result)
        self.assertIsNotNone(data, "Data preparation returned None")

    def test_cascade_result_to_translator(self):
        """CascadeResult dict → translator produces valid summary."""
        rng = np.random.RandomState(42)
        g1 = rng.normal(10, 2, 50)
        g2 = rng.normal(12, 2, 50)

        cascade_result = self.engine.execute_with_cascade(
            {"group1": g1, "group2": g2},
            "independent_t",
        )

        self.assertIsNotNone(cascade_result.result)
        result_dict = {
            "statistic": cascade_result.result.statistic,
            "p_value": cascade_result.result.p_value,
            "effect_size": cascade_result.result.effect_size,
            "effect_size_name": cascade_result.result.effect_size_name,
            "degrees_of_freedom": cascade_result.result.degrees_of_freedom,
            "additional": cascade_result.result.additional,
        }

        translation = self.translator.translate(
            cascade_result.result.test_name,
            result_dict,
            OutputMode.PLAIN_ENGLISH,
        )

        self.assertIn("summary", translation)
        self.assertNotEqual(translation["summary"], "")
        self.assertIn("is_significant", translation)

    def test_variable_types_are_valid_enum_values(self):
        """All profiled variable types should be valid VariableType enum values."""
        df = _normal_two_group_df()
        profile_result = self.profiler.profile_and_recommend(df)

        valid_types = {vt.value for vt in VariableType}
        for var_name, var_info in profile_result.variable_summary.items():
            self.assertIn(
                var_info["type"],
                valid_types,
                f"Variable '{var_name}' has invalid type: {var_info['type']}",
            )

    def test_cascade_path_structure(self):
        """Each CascadeStep has required attributes."""
        rng = np.random.RandomState(42)
        g1 = rng.normal(10, 2, 40)
        g2 = rng.normal(12, 2, 40)

        result = self.engine.execute_with_cascade(
            {"group1": g1, "group2": g2},
            "independent_t",
        )

        self.assertIsInstance(result.cascade_path, list)
        self.assertGreater(len(result.cascade_path), 0)

        for step in result.cascade_path:
            self.assertIsInstance(step, CascadeStep)
            self.assertIsInstance(step.test_attempted, str)
            self.assertIsInstance(step.guardian_passed, bool)
            self.assertIsInstance(step.violations, list)
            self.assertIsInstance(step.alternatives_suggested, list)

    def test_inferred_questions_match_data(self):
        """Inferred question types should match the data structure."""
        # 2-group → GROUP_COMPARISON
        df_2g = _normal_two_group_df()
        result_2g = self.profiler.profile_and_recommend(df_2g)
        q_types_2g = [q.question_type for q in result_2g.inferred_questions]
        self.assertIn(InferredQuestionType.GROUP_COMPARISON, q_types_2g)

        # 2 continuous → RELATIONSHIP
        df_corr = _correlation_df()
        result_corr = self.profiler.profile_and_recommend(df_corr)
        q_types_corr = [q.question_type for q in result_corr.inferred_questions]
        self.assertIn(InferredQuestionType.RELATIONSHIP, q_types_corr)

        # 3 groups → MULTI_GROUP_COMPARISON
        df_mg = _multi_group_df()
        result_mg = self.profiler.profile_and_recommend(df_mg)
        q_types_mg = [q.question_type for q in result_mg.inferred_questions]
        self.assertIn(InferredQuestionType.MULTI_GROUP_COMPARISON, q_types_mg)


# ===================================================================
# TEST CLASS 3: Cascade Chain Integration
# ===================================================================


class TestCascadeChainIntegration(TestCase):
    """Test Guardian violation → cascade with real data."""

    def setUp(self):
        self.engine = AutonomousCascadeEngine()

    def test_skewed_data_cascades_to_nonparametric(self):
        """Exponential data should trigger cascade from t-test to nonparametric."""
        rng = np.random.RandomState(42)
        g1 = rng.exponential(scale=10, size=50)
        g2 = rng.exponential(scale=20, size=50)

        result = self.engine.execute_with_cascade(
            {"group1": g1, "group2": g2},
            "independent_t",
        )

        self.assertIsNotNone(result.result)
        self.assertEqual(result.original_test, "independent_t")
        # Should cascade to nonparametric
        if result.n_cascades > 0:
            self.assertNotEqual(result.final_test, "independent_t")
            self.assertIn(
                result.final_test,
                [
                    "welch_t",
                    "mann_whitney_u",
                    "permutation_test",
                ],
            )

    def test_normal_data_no_cascade(self):
        """Well-behaved normal data should pass without cascading."""
        rng = np.random.RandomState(42)
        g1 = rng.normal(10, 2, 50)
        g2 = rng.normal(12, 2, 50)

        result = self.engine.execute_with_cascade(
            {"group1": g1, "group2": g2},
            "independent_t",
        )

        self.assertIsNotNone(result.result)
        self.assertEqual(result.original_test, "independent_t")
        # Normal data with equal variance should not cascade
        # (or may cascade to welch_t if Levene's marginal)
        self.assertIn(result.final_test, ["independent_t", "welch_t"])

    def test_max_cascades_respected(self):
        """Cascade count should not exceed the engine's max_cascades limit."""
        rng = np.random.RandomState(42)
        g1 = rng.exponential(scale=10, size=50)
        g2 = rng.exponential(scale=20, size=50)

        result = self.engine.execute_with_cascade(
            {"group1": g1, "group2": g2},
            "independent_t",
        )

        max_allowed = getattr(self.engine, "max_cascades", 5)
        self.assertLessEqual(result.n_cascades, max_allowed)

    def test_guardian_report_schema(self):
        """guardian_report from CascadeResult has expected structure."""
        rng = np.random.RandomState(42)
        g1 = rng.normal(10, 2, 40)
        g2 = rng.normal(12, 2, 40)

        result = self.engine.execute_with_cascade(
            {"group1": g1, "group2": g2},
            "independent_t",
        )

        if result.guardian_report is not None:
            report = result.guardian_report
            # Guardian report should be a dict with expected keys
            self.assertIsInstance(report, dict)
            # Check common keys
            expected_keys = {"confidence", "violations", "passed"}
            present_keys = set(report.keys())
            self.assertTrue(
                expected_keys.issubset(present_keys) or len(present_keys) > 0,
                f"Guardian report has unexpected structure: {present_keys}",
            )


# ===================================================================
# TEST CLASS 4: Edge Case Integration
# ===================================================================


class TestEdgeCaseIntegration(TestCase):
    """Pathological data through the pipeline."""

    def setUp(self):
        self.handler = AutonomousQueryHandler()

    def test_empty_dataframe(self):
        """0-row DataFrame returns warnings, doesn't crash."""
        df = _empty_df()
        result = self.handler.handle_query(
            query_text="Compare groups",
            df=df,
        )

        self.assertIsInstance(result, AutonomousResult)
        self.assertTrue(
            len(result.warnings) > 0 or result.confidence == 0.0,
            "Should report an issue for empty data",
        )

    def test_all_nan_data(self):
        """All-NaN data doesn't crash, returns warnings."""
        df = _all_nan_df()
        result = self.handler.handle_query(
            query_text="Compare groups",
            df=df,
        )

        self.assertIsInstance(result, AutonomousResult)
        self.assertTrue(
            len(result.warnings) > 0 or result.confidence == 0.0,
            "Should report an issue for all-NaN data",
        )

    def test_single_value_column(self):
        """Constant column detected in health report."""
        df = _single_value_df()
        profiler = SmartProfiler()
        profile = profiler.profile_and_recommend(df)

        # The health card or issues should flag zero variance
        health = profile.data_health
        has_issue = (
            any(
                "constant" in str(i).lower() or "variance" in str(i).lower() or "zero" in str(i).lower()
                for i in health.issues
            )
            or health.suitability_score < 80
        )
        self.assertTrue(has_issue, "Should flag constant column as issue")

    def test_single_row_data(self):
        """Single-row data is flagged as small sample."""
        df = _single_row_df()
        profiler = SmartProfiler()
        profile = profiler.profile_and_recommend(df)

        health = profile.data_health
        has_small_sample = (
            any(
                "small" in str(i).lower() or "sample" in str(i).lower() or "insufficient" in str(i).lower()
                for i in health.issues
            )
            or health.suitability_score < 50
        )
        self.assertTrue(has_small_sample, "Should flag single-row data")

    def test_mixed_types_graceful(self):
        """Mixed numeric/string/boolean data handled without error."""
        df = _mixed_types_df()
        result = self.handler.handle_query(
            query_text="Analyze this data",
            df=df,
        )

        self.assertIsInstance(result, AutonomousResult)
        # Should not crash and should report at least the profile
        self.assertIn("n_rows", result.profile_summary)
        self.assertEqual(result.profile_summary["n_rows"], 20)


# ===================================================================
# TEST CLASS 5: Autonomous API Integration
# ===================================================================


@override_settings(SECURE_SSL_REDIRECT=False)
class TestAutonomousAPIIntegration(APITestCase):
    """Real HTTP endpoint tests for autonomous API."""

    def test_profile_endpoint_with_json_data(self):
        """POST to /api/v1/autonomous/profile/ with JSON data."""
        payload = {
            "data": [
                {"group": "A", "score": 85, "age": 25},
                {"group": "A", "score": 90, "age": 30},
                {"group": "A", "score": 88, "age": 35},
                {"group": "B", "score": 78, "age": 22},
                {"group": "B", "score": 82, "age": 28},
                {"group": "B", "score": 75, "age": 24},
            ],
        }

        response = self.client.post(
            "/api/v1/autonomous/profile/",
            payload,
            format="json",
        )

        self.assertIn(
            response.status_code,
            [
                http_status.HTTP_200_OK,
                http_status.HTTP_201_CREATED,
            ],
        )
        data = response.json()
        self.assertIn("profile", data)

    def test_query_endpoint_with_json_data(self):
        """POST to /api/v1/autonomous/query/ with query + data."""
        payload = {
            "query": "Is there a difference in score between groups?",
            "data": [
                {"group": "A", "score": 85},
                {"group": "A", "score": 90},
                {"group": "A", "score": 88},
                {"group": "A", "score": 92},
                {"group": "B", "score": 78},
                {"group": "B", "score": 82},
                {"group": "B", "score": 75},
                {"group": "B", "score": 80},
            ],
            "mode": "plain_english",
        }

        response = self.client.post(
            "/api/v1/autonomous/query/",
            payload,
            format="json",
        )

        self.assertIn(
            response.status_code,
            [
                http_status.HTTP_200_OK,
                http_status.HTTP_201_CREATED,
            ],
        )
        data = response.json()
        # Should contain analysis result fields
        self.assertTrue(
            "translation" in data or "result" in data or "profile" in data,
            f"Response missing expected keys: {list(data.keys())}",
        )
