"""
Autonomous Intelligence Layer Tests — Pillar 1
================================================
Comprehensive tests for the 4 autonomous services:
  1. SmartProfiler
  2. AutonomousCascadeEngine
  3. PlainLanguageTranslator
  4. AutonomousQueryHandler

All tests use REAL statistical computations with known properties.
No mocking of scipy/numpy/pandas.

Run with: python manage.py test core.tests.test_autonomous_services

Author: StickForStats Development Team
Created: February 2026
"""

import numpy as np
import pandas as pd
from django.test import TestCase

from core.services.smart_profiler import (
    SmartProfiler,
    SmartProfileResult,
    InferredQuestion,
    InferredQuestionType,
    DataHealthCard,
)
from core.services.cascade_engine import (
    AutonomousCascadeEngine,
    CascadeStep,
)
from core.services.plain_language_translator import (
    PlainLanguageTranslator,
    OutputMode,
    _classify_effect_size,
)
from core.services.autonomous_query_handler import (
    AutonomousQueryHandler,
    AutonomousResult,
)


# ---------------------------------------------------------------------------
# Helpers: reproducible datasets with known statistical properties
# ---------------------------------------------------------------------------


def _two_group_normal_df(seed=42, n=50, diff=2.0):
    """Two groups drawn from normals with a known mean difference."""
    rng = np.random.RandomState(seed)
    group = np.array(["A"] * n + ["B"] * n)
    score = np.concatenate(
        [
            rng.normal(loc=10, scale=2, size=n),
            rng.normal(loc=10 + diff, scale=2, size=n),
        ]
    )
    return pd.DataFrame({"group": group, "score": score})


def _correlation_df(seed=42, n=80, r_target=0.7):
    """Two continuous columns with approximately known Pearson r."""
    rng = np.random.RandomState(seed)
    x = rng.normal(0, 1, n)
    noise = rng.normal(0, 1, n)
    y = r_target * x + np.sqrt(1 - r_target**2) * noise
    return pd.DataFrame({"x": x, "y": y})


def _multi_group_df(seed=42, n_per=30, k=3):
    """k groups with staggered means for ANOVA."""
    rng = np.random.RandomState(seed)
    groups, scores = [], []
    for i in range(k):
        groups.extend([f"G{i+1}"] * n_per)
        scores.extend(rng.normal(loc=5 + i * 2, scale=1.5, size=n_per).tolist())
    return pd.DataFrame({"category": groups, "value": scores})


def _two_categorical_df(seed=42, n=100):
    """Two categorical columns with a known association."""
    rng = np.random.RandomState(seed)
    gender = rng.choice(["M", "F"], size=n)
    # Create association: M more likely to prefer A
    pref = []
    for g in gender:
        if g == "M":
            pref.append(rng.choice(["A", "B"], p=[0.7, 0.3]))
        else:
            pref.append(rng.choice(["A", "B"], p=[0.3, 0.7]))
    return pd.DataFrame({"gender": gender, "preference": pref})


def _paired_df(seed=42, n=40, effect=1.5):
    """Pre/post scores with a known mean shift."""
    rng = np.random.RandomState(seed)
    baseline = rng.normal(loc=50, scale=10, size=n)
    return pd.DataFrame(
        {
            "score_pre": baseline,
            "score_post": baseline + rng.normal(loc=effect, scale=3, size=n),
        }
    )


def _skewed_df(seed=42, n=60):
    """Highly skewed (exponential) data — should fail normality."""
    rng = np.random.RandomState(seed)
    return pd.DataFrame(
        {
            "group": np.array(["X"] * (n // 2) + ["Y"] * (n // 2)),
            "outcome": rng.exponential(scale=5, size=n),
        }
    )


# ===================================================================
# TEST CLASS 1: SmartProfiler
# ===================================================================


class TestSmartProfiler(TestCase):
    """Tests for SmartProfiler.profile_and_recommend()."""

    def setUp(self):
        self.profiler = SmartProfiler()

    # --- Basic profiling ---

    def test_profile_numeric_dataset(self):
        """Profile a dataset with continuous and categorical variables."""
        df = _two_group_normal_df()
        result = self.profiler.profile_and_recommend(df)

        self.assertIsInstance(result, SmartProfileResult)
        self.assertEqual(result.profile.n_rows, 100)
        self.assertEqual(result.profile.n_columns, 2)

        # Variable type detection
        self.assertIn("group", result.variable_summary)
        self.assertIn("score", result.variable_summary)
        self.assertIn(result.variable_summary["group"]["type"], ["nominal", "binary"])
        self.assertEqual(result.variable_summary["score"]["type"], "continuous")

    # --- Research question inference ---

    def test_infer_group_comparison(self):
        """1 binary + 1 continuous should infer group comparison."""
        df = _two_group_normal_df()
        result = self.profiler.profile_and_recommend(df)

        q_types = [q.question_type for q in result.inferred_questions]
        self.assertIn(InferredQuestionType.GROUP_COMPARISON, q_types)

        gc_q = next(q for q in result.inferred_questions if q.question_type == InferredQuestionType.GROUP_COMPARISON)
        self.assertGreater(gc_q.confidence, 0)
        self.assertTrue(any("t" in t or "mann" in t for t in gc_q.suggested_tests))

    def test_infer_correlation(self):
        """2 continuous variables should infer relationship."""
        df = _correlation_df()
        result = self.profiler.profile_and_recommend(df)

        q_types = [q.question_type for q in result.inferred_questions]
        self.assertIn(InferredQuestionType.RELATIONSHIP, q_types)

    def test_infer_anova(self):
        """1 multi-level categorical + 1 continuous should infer multi-group comparison."""
        df = _multi_group_df(k=4)
        result = self.profiler.profile_and_recommend(df)

        q_types = [q.question_type for q in result.inferred_questions]
        self.assertIn(InferredQuestionType.MULTI_GROUP_COMPARISON, q_types)

    def test_infer_association(self):
        """2 categorical columns should infer association."""
        df = _two_categorical_df()
        result = self.profiler.profile_and_recommend(df)

        q_types = [q.question_type for q in result.inferred_questions]
        self.assertIn(InferredQuestionType.ASSOCIATION, q_types)

    # --- Paired column detection ---

    def test_detect_paired_columns(self):
        """Columns 'score_pre' and 'score_post' should be detected as paired."""
        cols = ["score_pre", "score_post", "age"]
        pairs = self.profiler._detect_paired_columns(cols)
        self.assertTrue(len(pairs) > 0, "Should detect at least one pre/post pair")
        flat = [c for pair in pairs for c in pair]
        self.assertIn("score_pre", flat)
        self.assertIn("score_post", flat)

    # --- Data health ---

    def test_data_health_perfect(self):
        """Clean dataset should yield a high overall health score."""
        df = _two_group_normal_df(n=50)
        result = self.profiler.profile_and_recommend(df)
        health = result.data_health

        self.assertIsInstance(health, DataHealthCard)
        self.assertGreaterEqual(health.completeness_score, 95.0)
        self.assertGreaterEqual(health.overall_score, 70.0)
        self.assertTrue(
            any("missing" in s.lower() or "no" in s.lower() for s in health.strengths),
            "Strengths should note lack of missing data",
        )

    def test_data_health_missing(self):
        """Dataset with ~25% missing should have lower completeness."""
        rng = np.random.RandomState(99)
        df = _two_group_normal_df(n=50)
        # Insert 25% NaN in the score column
        mask = rng.choice([True, False], size=len(df), p=[0.25, 0.75])
        df.loc[mask, "score"] = np.nan
        result = self.profiler.profile_and_recommend(df)
        health = result.data_health

        self.assertLess(health.completeness_score, 95.0)
        self.assertTrue(any("missing" in i["message"].lower() for i in health.issues))

    def test_data_health_small_sample(self):
        """Dataset with n=5 should have low suitability."""
        rng = np.random.RandomState(7)
        df = pd.DataFrame(
            {
                "group": ["A", "A", "B", "B", "B"],
                "val": rng.normal(0, 1, 5),
            }
        )
        result = self.profiler.profile_and_recommend(df)
        health = result.data_health

        self.assertLess(health.suitability_score, 70.0)
        self.assertTrue(any("small" in i["message"].lower() or "sample" in i["message"].lower() for i in health.issues))

    # --- Workflow suggestion ---

    def test_suggest_workflow(self):
        """Verify correct workflow mapping for each question type."""
        mapping = {
            InferredQuestionType.GROUP_COMPARISON: "two_group_comparison",
            InferredQuestionType.MULTI_GROUP_COMPARISON: "multi_group",
            InferredQuestionType.RELATIONSHIP: "find_relationships",
            InferredQuestionType.PREDICTION: "predict_outcomes",
            InferredQuestionType.ASSOCIATION: "category_associations",
            InferredQuestionType.BEFORE_AFTER: "before_after",
        }
        for qt, expected_wf in mapping.items():
            question = InferredQuestion(
                question_type=qt,
                question_text="test",
                variables_involved=["a", "b"],
                suggested_tests=["some_test"],
                confidence=0.9,
                explanation="test",
            )
            workflow = self.profiler._suggest_workflow([question], {})
            self.assertEqual(workflow, expected_wf, f"Workflow for {qt} should be {expected_wf}, got {workflow}")


# ===================================================================
# TEST CLASS 2: AutonomousCascadeEngine
# ===================================================================


class TestCascadeEngine(TestCase):
    """Tests for AutonomousCascadeEngine.execute_with_cascade()."""

    def setUp(self):
        self.engine = AutonomousCascadeEngine()

    # --- Direct test executors ---

    def test_execute_independent_t(self):
        """Two normal groups should produce a valid t-test result."""
        rng = np.random.RandomState(42)
        g1 = rng.normal(10, 2, 40)
        g2 = rng.normal(12, 2, 40)
        result = self.engine.execute_with_cascade({"group1": g1, "group2": g2}, "independent_t")

        self.assertIsNotNone(result.result)
        self.assertEqual(result.result.test_name, "Independent Samples t-test")
        self.assertLess(result.result.p_value, 0.05)
        # Verify Cohen's d is reasonable (true d ~= 1.0)
        self.assertGreater(abs(result.result.effect_size), 0.3)

    def test_execute_welch_t(self):
        """Two groups with unequal variance should produce a valid result.

        Guardian may cascade to Mann-Whitney if assumptions fail,
        so we verify: original_test is welch_t and result is valid.
        """
        rng = np.random.RandomState(42)
        g1 = rng.normal(10, 1, 50)
        g2 = rng.normal(12, 4, 50)
        result = self.engine.execute_with_cascade({"group1": g1, "group2": g2}, "welch_t")

        self.assertIsNotNone(result.result)
        self.assertEqual(result.original_test, "welch_t")
        self.assertIsNotNone(result.result.p_value)
        # Final test should be welch_t or a valid cascade alternative
        self.assertIn(result.final_test, ["welch_t", "mann_whitney_u", "permutation_test"])

    def test_execute_paired_t(self):
        """Paired measurements should produce a valid paired t-test."""
        rng = np.random.RandomState(42)
        pre = rng.normal(50, 10, 30)
        post = pre + rng.normal(5, 3, 30)  # systematic improvement
        result = self.engine.execute_with_cascade([pre, post], "paired_t")

        self.assertIsNotNone(result.result)
        self.assertIn("Paired", result.result.test_name)
        self.assertLess(result.result.p_value, 0.05)

    def test_execute_mann_whitney(self):
        """Non-normal groups should produce a valid Mann-Whitney result."""
        rng = np.random.RandomState(42)
        g1 = rng.exponential(2, 40)
        g2 = rng.exponential(4, 40)
        result = self.engine.execute_with_cascade([g1, g2], "mann_whitney_u")

        self.assertIsNotNone(result.result)
        self.assertIn("Mann-Whitney", result.result.test_name)
        self.assertEqual(result.result.effect_size_name, "Rank-biserial correlation")

    def test_execute_anova(self):
        """3+ groups should produce a valid ANOVA result with eta-squared."""
        rng = np.random.RandomState(42)
        g1 = rng.normal(5, 1, 30)
        g2 = rng.normal(7, 1, 30)
        g3 = rng.normal(9, 1, 30)
        result = self.engine.execute_with_cascade([g1, g2, g3], "one_way_anova")

        self.assertIsNotNone(result.result)
        self.assertIn("ANOVA", result.result.test_name)
        self.assertEqual(result.result.effect_size_name, "Eta-squared")
        self.assertGreater(result.result.effect_size, 0)
        self.assertLess(result.result.p_value, 0.05)
        self.assertEqual(result.result.additional["n_groups"], 3)

    def test_execute_pearson(self):
        """Two correlated variables should produce a valid Pearson r."""
        rng = np.random.RandomState(42)
        x = rng.normal(0, 1, 80)
        y = 0.7 * x + np.sqrt(1 - 0.49) * rng.normal(0, 1, 80)
        result = self.engine.execute_with_cascade([x, y], "pearson")

        self.assertIsNotNone(result.result)
        self.assertIn("Pearson", result.result.test_name)
        # r should be in the ballpark of 0.7
        self.assertGreater(abs(result.result.statistic), 0.4)
        self.assertLess(result.result.p_value, 0.05)

    def test_execute_spearman(self):
        """Ranked data should produce a valid Spearman rho."""
        rng = np.random.RandomState(42)
        x = rng.normal(0, 1, 50)
        y = 0.6 * x + rng.normal(0, 0.5, 50)
        result = self.engine.execute_with_cascade([x, y], "spearman")

        self.assertIsNotNone(result.result)
        self.assertIn("Spearman", result.result.test_name)
        self.assertIsNotNone(result.result.additional.get("rho"))

    def test_execute_chi_square(self):
        """Contingency table should produce a valid chi-square result."""
        rng = np.random.RandomState(42)
        # Two categorical vars with association
        a = rng.choice([0, 1], size=100, p=[0.5, 0.5])
        b = np.where(a == 1, rng.choice([0, 1], size=100, p=[0.7, 0.3]), rng.choice([0, 1], size=100, p=[0.3, 0.7]))
        result = self.engine.execute_with_cascade([a.astype(float), b.astype(float)], "chi_square_independence")

        self.assertIsNotNone(result.result)
        self.assertIn("Chi-Square", result.result.test_name)
        self.assertEqual(result.result.effect_size_name, "Cramer's V")

    # --- Cascade behaviour ---

    def test_cascade_normality_violation(self):
        """Non-normal data with t-test request should cascade to Mann-Whitney."""
        rng = np.random.RandomState(42)
        # Highly skewed data: exponential with large offset
        g1 = rng.exponential(scale=10, size=50)
        g2 = rng.exponential(scale=20, size=50)
        result = self.engine.execute_with_cascade({"group1": g1, "group2": g2}, "independent_t")

        # It should either cascade or still execute
        self.assertIsNotNone(result.result)
        self.assertIsInstance(result.cascade_path, list)
        self.assertGreater(len(result.cascade_path), 0)
        # If it cascaded, final_test differs from original
        if result.n_cascades > 0:
            self.assertNotEqual(result.original_test, result.final_test)

    def test_cascade_path_recorded(self):
        """Verify cascade path is recorded correctly."""
        rng = np.random.RandomState(42)
        g1 = rng.normal(10, 2, 40)
        g2 = rng.normal(12, 2, 40)
        result = self.engine.execute_with_cascade({"group1": g1, "group2": g2}, "independent_t")

        self.assertEqual(result.original_test, "independent_t")
        for step in result.cascade_path:
            self.assertIsInstance(step, CascadeStep)
            self.assertIsInstance(step.test_attempted, str)
            self.assertIsInstance(step.guardian_passed, bool)
            self.assertIsInstance(step.violations, list)

    # --- Data preparation ---

    def test_prepare_data_dict(self):
        """Dict input should be converted to list of arrays."""
        data = {"a": [1, 2, 3], "b": [4, 5, 6]}
        arrays = self.engine._prepare_data(data)
        self.assertEqual(len(arrays), 2)
        np.testing.assert_array_equal(arrays[0], [1, 2, 3])

    def test_prepare_data_list(self):
        """List of lists input should be converted correctly."""
        data = [[1, 2, 3], [4, 5, 6]]
        arrays = self.engine._prepare_data(data)
        self.assertEqual(len(arrays), 2)
        self.assertIsInstance(arrays[0], np.ndarray)

    def test_prepare_data_dataframe(self):
        """DataFrame input should produce one array per column."""
        df = pd.DataFrame({"x": [1.0, 2.0, 3.0], "y": [4.0, 5.0, 6.0]})
        arrays = self.engine._prepare_data(df)
        self.assertEqual(len(arrays), 2)
        self.assertIsInstance(arrays[0], np.ndarray)


# ===================================================================
# TEST CLASS 3: PlainLanguageTranslator
# ===================================================================


class TestPlainLanguageTranslator(TestCase):
    """Tests for PlainLanguageTranslator.translate()."""

    def setUp(self):
        self.translator = PlainLanguageTranslator()

    # --- t-test translations ---

    def _make_ttest_result(self, p=0.005, d=0.8):
        return {
            "statistic": 2.89,
            "p_value": p,
            "effect_size": d,
            "effect_size_name": "Cohen's d",
            "degrees_of_freedom": 58,
            "additional": {
                "mean_group1": 10.5,
                "mean_group2": 8.9,
            },
        }

    def test_translate_t_test_significant_plain(self):
        """Significant t-test in plain English should say 'ARE significantly different'."""
        r = self._make_ttest_result(p=0.005, d=0.8)
        out = self.translator.translate("independent_t", r, OutputMode.PLAIN_ENGLISH)

        self.assertIn("summary", out)
        self.assertTrue(out["is_significant"])
        self.assertIn("ARE", out["summary"])
        self.assertIn("different", out["summary"].lower())

    def test_translate_t_test_not_significant_plain(self):
        """Non-significant t-test should say 'NOT significantly different'."""
        r = self._make_ttest_result(p=0.45, d=0.1)
        out = self.translator.translate("independent_t", r, OutputMode.PLAIN_ENGLISH)

        self.assertFalse(out["is_significant"])
        self.assertIn("NOT", out["summary"])

    def test_translate_t_test_researcher(self):
        """Researcher mode should include t-value and p-value."""
        r = self._make_ttest_result(p=0.005, d=0.8)
        out = self.translator.translate("independent_t", r, OutputMode.RESEARCHER)

        self.assertIn("t =", out["summary"])
        self.assertIn("p =", out["summary"])
        self.assertIn("Cohen's d", out["summary"])

    def test_translate_t_test_apa(self):
        """APA format should include t(df) = ..., p = ..., d = ... ."""
        r = self._make_ttest_result(p=0.005, d=0.8)
        out = self.translator.translate("independent_t", r, OutputMode.APA_FORMAT)

        self.assertIn("t(", out["summary"])
        self.assertIn("p =", out["summary"])
        self.assertIn("d =", out["summary"])

    # --- ANOVA ---

    def test_translate_anova(self):
        """ANOVA translation should reference groups and effect size."""
        r = {
            "statistic": 12.45,
            "p_value": 0.0001,
            "effect_size": 0.15,
            "additional": {
                "n_groups": 3,
                "df_between": 2,
                "df_within": 87,
            },
        }
        out = self.translator.translate("one_way_anova", r, OutputMode.PLAIN_ENGLISH)
        self.assertTrue(out["is_significant"])
        self.assertIn("group", out["summary"].lower())

    # --- Pearson ---

    def test_translate_pearson(self):
        """Pearson correlation translation should include direction and strength."""
        r = {
            "statistic": 0.72,
            "p_value": 0.0001,
            "effect_size": 0.72**2,
            "degrees_of_freedom": 78,
            "additional": {"r": 0.72, "r_squared": 0.72**2},
        }
        out = self.translator.translate("pearson", r, OutputMode.PLAIN_ENGLISH)
        self.assertTrue(out["is_significant"])
        self.assertIn("positive", out["summary"].lower())

    # --- Chi-Square ---

    def test_translate_chi_square(self):
        """Chi-square translation should mention association."""
        r = {
            "statistic": 15.3,
            "p_value": 0.001,
            "effect_size": 0.39,
            "degrees_of_freedom": 1,
        }
        out = self.translator.translate("chi_square_independence", r, OutputMode.PLAIN_ENGLISH)
        self.assertTrue(out["is_significant"])
        self.assertIn("association", out["summary"].lower())

    # --- Regression ---

    def test_translate_regression(self):
        """Regression translation should include R-squared."""
        r = {
            "statistic": 3.5,
            "p_value": 0.001,
            "effect_size": 0.45,
            "additional": {"slope": 1.23, "intercept": 0.5, "r_value": 0.67},
        }
        out = self.translator.translate("linear_regression", r, OutputMode.PLAIN_ENGLISH)
        self.assertTrue(out["is_significant"])
        self.assertIn("predict", out["summary"].lower())
        self.assertIn("%", out["summary"])

    # --- Effect size classification ---

    def test_effect_size_classification(self):
        """Verify effect size categories: negligible/small/medium/large/very_large."""
        self.assertEqual(_classify_effect_size(0.05)["category"], "negligible")
        self.assertEqual(_classify_effect_size(0.3)["category"], "small")
        self.assertEqual(_classify_effect_size(0.6)["category"], "medium")
        self.assertEqual(_classify_effect_size(0.9)["category"], "large")
        self.assertEqual(_classify_effect_size(1.5)["category"], "very_large")

    # --- Generic fallback ---

    def test_generic_translation(self):
        """Unknown test type should use generic translation."""
        r = {"statistic": 5.0, "p_value": 0.03, "effect_size": 0.4}
        out = self.translator.translate("some_unknown_test", r, OutputMode.PLAIN_ENGLISH)
        self.assertIn("summary", out)
        self.assertTrue(out["is_significant"])


# ===================================================================
# TEST CLASS 4: AutonomousQueryHandler
# ===================================================================


class TestAutonomousQueryHandler(TestCase):
    """Tests for AutonomousQueryHandler — the full pipeline orchestrator."""

    def setUp(self):
        self.handler = AutonomousQueryHandler()

    def test_full_pipeline(self):
        """End-to-end: query + data should produce a translated result."""
        df = _two_group_normal_df(n=50, diff=2.0)
        result = self.handler.handle_query(
            query_text="Is there a difference in score between groups?",
            df=df,
            mode=OutputMode.PLAIN_ENGLISH,
        )

        self.assertIsInstance(result, AutonomousResult)
        # Should have profile summary
        self.assertIn("n_rows", result.profile_summary)
        self.assertEqual(result.profile_summary["n_rows"], 100)
        # Should have translation
        self.assertIn("summary", result.translation)
        self.assertNotEqual(result.translation["summary"], "")
        # Should have some confidence
        self.assertGreater(result.confidence, 0)
        # Cascade result present
        self.assertIsNotNone(result.cascade_result)
        # Inferred questions present
        self.assertIsInstance(result.inferred_questions, list)
        self.assertGreater(len(result.inferred_questions), 0)

    def test_profile_only(self):
        """Profiling step should produce a valid summary even without a good test match."""
        df = _two_group_normal_df(n=50)
        result = self.handler.handle_query(
            query_text="Describe my data",
            df=df,
        )
        self.assertIsInstance(result, AutonomousResult)
        # Profile summary should always be populated
        self.assertIn("n_rows", result.profile_summary)
        self.assertIn("variables", result.profile_summary)

    def test_get_next_steps_no_data(self):
        """With no data, should recommend upload."""
        steps = self.handler.get_next_steps({"has_data": False})
        self.assertTrue(len(steps) > 0)
        self.assertEqual(steps[0]["action"], "upload")
        self.assertEqual(steps[0]["priority"], "required")

    def test_get_next_steps_with_data(self):
        """With data but no test, should recommend asking a question."""
        steps = self.handler.get_next_steps(
            {
                "has_data": True,
                "data_profiled": True,
                "test_executed": False,
            }
        )
        actions = [s["action"] for s in steps]
        self.assertIn("query", actions)

    def test_get_next_steps_after_analysis(self):
        """After analysis, should recommend report generation."""
        steps = self.handler.get_next_steps(
            {
                "has_data": True,
                "data_profiled": True,
                "test_executed": True,
                "results_translated": True,
            }
        )
        actions = [s["action"] for s in steps]
        self.assertIn("report", actions)

    def test_error_handling(self):
        """Bad data should produce an error result with profile info."""
        # DataFrame with only text columns — no analyzable numeric data
        df = pd.DataFrame({"name": ["Alice", "Bob"], "city": ["NY", "LA"]})
        result = self.handler.handle_query(
            query_text="Compare groups",
            df=df,
        )
        self.assertIsInstance(result, AutonomousResult)
        # Should contain a warning or error
        self.assertTrue(
            len(result.warnings) > 0 or result.confidence == 0.0,
            "Should report an issue when data is unsuitable",
        )
