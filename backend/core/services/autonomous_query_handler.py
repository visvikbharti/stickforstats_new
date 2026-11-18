"""
Autonomous Query Handler — Full Pipeline Orchestrator
======================================================
Orchestrates: query → parse → profile → resolve → plan → execute → translate → report.

Author: StickForStats Development Team
Created: February 2026
Version: 2.0.0
"""

import pandas as pd
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import logging

from .smart_profiler import SmartProfiler, SmartProfileResult
from .cascade_engine import AutonomousCascadeEngine, CascadeResult
from .plain_language_translator import PlainLanguageTranslator, OutputMode

logger = logging.getLogger(__name__)

# Try to import QueryParser — gracefully degrade if not available
try:
    from ...ai_advisor.services.nlp_enhanced.query_parser import QueryParser

    QUERY_PARSER_AVAILABLE = True
except ImportError:
    QUERY_PARSER_AVAILABLE = False
    logger.info("QueryParser not available — falling back to profiler-based inference")


# Map query intents to test types
INTENT_TO_TEST_MAP = {
    "comparison": ["independent_t", "welch_t", "mann_whitney_u"],
    "difference": ["independent_t", "welch_t", "mann_whitney_u"],
    "relationship": ["pearson", "spearman"],
    "prediction": ["linear_regression"],
    "association": ["chi_square_independence", "fisher_exact"],
}


@dataclass
class AnalysisState:
    """Tracks the current state of an analysis session."""

    has_data: bool = False
    data_profiled: bool = False
    query_parsed: bool = False
    test_selected: bool = False
    test_executed: bool = False
    results_translated: bool = False
    profile_result: Optional[Dict] = None
    cascade_result: Optional[Dict] = None
    translation: Optional[Dict] = None
    test_type: Optional[str] = None


@dataclass
class NextStepRecommendation:
    """Recommendation for what to do next."""

    step: str
    description: str
    action: str  # API endpoint or UI action
    priority: str  # 'required', 'recommended', 'optional'


@dataclass
class AutonomousResult:
    """Complete result from autonomous analysis pipeline."""

    query: str
    parsed_intent: Optional[str]
    profile_summary: Dict[str, Any]
    cascade_result: Optional[Dict[str, Any]]
    translation: Dict[str, Any]
    inferred_questions: List[Dict[str, Any]]
    suggested_next_steps: List[Dict[str, Any]]
    confidence: float
    warnings: List[str]


class AutonomousQueryHandler:
    """
    The orchestrator: takes a natural language query + data,
    runs the full autonomous pipeline, returns translated results.
    """

    def __init__(self):
        self.profiler = SmartProfiler()
        self.cascade_engine = AutonomousCascadeEngine()
        self.translator = PlainLanguageTranslator()
        self.query_parser = QueryParser() if QUERY_PARSER_AVAILABLE else None

    def handle_query(
        self,
        query_text: str,
        df: pd.DataFrame,
        mode: str = OutputMode.PLAIN_ENGLISH,
        alpha: float = 0.05,
    ) -> AutonomousResult:
        """
        Full pipeline: query + data → validated results in plain language.

        Args:
            query_text: Natural language query
            df: Input DataFrame
            mode: Output mode (plain_english, researcher, apa_format)
            alpha: Significance level

        Returns:
            AutonomousResult with everything the frontend needs
        """
        warnings = []

        # Step 1: Profile the data
        try:
            profile_result = self.profiler.profile_and_recommend(df)
        except Exception as e:
            logger.error(f"Profiling failed: {e}")
            return self._error_result(query_text, f"Data profiling failed: {str(e)}")

        # Step 2: Parse the query
        parsed_intent = None
        selected_test = None
        target_variables = []

        if self.query_parser:
            try:
                parsed = self.query_parser.parse(query_text)
                parsed_intent = parsed.primary_intent.value
                if parsed.confidence_score < 0.6:
                    warnings.append(
                        f"Query interpretation confidence is low ({parsed.confidence_score:.0%}). "
                        f"Results based on data structure inference."
                    )
                # Extract variables from parsed query
                target_variables = [v.name for v in parsed.variables if v.name in df.columns]
                # Map intent to test
                intent_tests = INTENT_TO_TEST_MAP.get(parsed_intent, [])
                if intent_tests:
                    selected_test = intent_tests[0]
            except Exception as e:
                logger.warning(f"Query parsing failed: {e}")
                warnings.append("Query parser unavailable — using data structure inference.")

        # Step 3: If no test from query, use profiler's top recommendation
        if not selected_test and profile_result.inferred_questions:
            top_question = profile_result.inferred_questions[0]
            if top_question.suggested_tests:
                selected_test = top_question.suggested_tests[0]
            target_variables = top_question.variables_involved

        if not selected_test:
            return self._error_result(
                query_text,
                "Could not determine an appropriate test. Please provide more details or select a test manually.",
                profile_result=profile_result,
            )

        # Step 4: Prepare data for the selected test
        data_for_test, left_out = self._prepare_test_data_and_count(df, target_variables, selected_test, profile_result)
        if left_out:
            warnings.append(left_out)

        if data_for_test is None:
            return self._error_result(
                query_text,
                f"Could not prepare data for {selected_test}. Check variable types and missing values.",
                profile_result=profile_result,
            )

        # Step 5: Execute with Guardian cascade
        try:
            cascade_result = self.cascade_engine.execute_with_cascade(data_for_test, selected_test, alpha=alpha)
        except Exception as e:
            logger.error(f"Cascade execution failed: {e}")
            return self._error_result(
                query_text,
                f"Test execution failed: {str(e)}",
                profile_result=profile_result,
            )

        # Step 6: Translate results
        translation = {}
        if cascade_result.result:
            result_dict = {
                "statistic": cascade_result.result.statistic,
                "p_value": cascade_result.result.p_value,
                "effect_size": cascade_result.result.effect_size,
                "effect_size_name": cascade_result.result.effect_size_name,
                "degrees_of_freedom": cascade_result.result.degrees_of_freedom,
                "additional": cascade_result.result.additional,
            }
            translation = self.translator.translate(cascade_result.result.test_name, result_dict, mode, alpha)
        else:
            translation = {"summary": "Test execution produced no results.", "details": ""}
            warnings.append("No results returned from test execution.")

        # Step 7: Build response
        inferred_questions = [
            {
                "type": q.question_type.value,
                "text": q.question_text,
                "variables": q.variables_involved,
                "tests": q.suggested_tests,
                "confidence": q.confidence,
                "explanation": q.explanation,
            }
            for q in profile_result.inferred_questions
        ]

        profile_summary = {
            "n_rows": profile_result.profile.n_rows,
            "n_columns": profile_result.profile.n_columns,
            "health": {
                "overall": profile_result.data_health.overall_score,
                "completeness": profile_result.data_health.completeness_score,
                "quality": profile_result.data_health.quality_score,
                "suitability": profile_result.data_health.suitability_score,
                "issues": profile_result.data_health.issues,
                "strengths": profile_result.data_health.strengths,
            },
            "variables": profile_result.variable_summary,
            "suggested_workflow": profile_result.suggested_workflow,
        }

        cascade_dict = None
        if cascade_result:
            cascade_dict = {
                "original_test": cascade_result.original_test,
                "final_test": cascade_result.final_test,
                "n_cascades": cascade_result.n_cascades,
                "assumptions_satisfied": cascade_result.assumptions_satisfied,
                "confidence_score": cascade_result.confidence_score,
                "cascade_path": [
                    {
                        "test": step.test_attempted,
                        "passed": step.guardian_passed,
                        "violations": step.violations,
                    }
                    for step in cascade_result.cascade_path
                ],
                "result": {
                    "test_name": cascade_result.result.test_name,
                    "statistic": cascade_result.result.statistic,
                    "p_value": cascade_result.result.p_value,
                    "effect_size": cascade_result.result.effect_size,
                    "effect_size_name": cascade_result.result.effect_size_name,
                    "additional": cascade_result.result.additional,
                }
                if cascade_result.result
                else None,
                "guardian_report": cascade_result.guardian_report,
            }

        next_steps = self._get_next_steps_for_result(cascade_result, profile_result)

        return AutonomousResult(
            query=query_text,
            parsed_intent=parsed_intent,
            profile_summary=profile_summary,
            cascade_result=cascade_dict,
            translation=translation,
            inferred_questions=inferred_questions,
            suggested_next_steps=next_steps,
            confidence=cascade_result.confidence_score if cascade_result else 0.0,
            warnings=warnings,
        )

    def get_next_steps(self, analysis_state: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Recommend what to do next based on current analysis state.

        Args:
            analysis_state: Dict describing current state

        Returns:
            List of NextStepRecommendation dicts
        """
        steps = []

        if not analysis_state.get("has_data"):
            steps.append(
                {
                    "step": "Upload Data",
                    "description": "Upload your dataset (CSV, Excel, or paste data)",
                    "action": "upload",
                    "priority": "required",
                }
            )
            return steps

        if not analysis_state.get("data_profiled"):
            steps.append(
                {
                    "step": "Profile Data",
                    "description": "Automatically analyze your data structure and quality",
                    "action": "profile",
                    "priority": "required",
                }
            )

        if not analysis_state.get("test_executed"):
            steps.append(
                {
                    "step": "Ask a Question",
                    "description": "Type your research question in plain English",
                    "action": "query",
                    "priority": "recommended",
                }
            )
            steps.append(
                {
                    "step": "Choose a Workflow",
                    "description": "Follow a guided step-by-step analysis",
                    "action": "wizard",
                    "priority": "recommended",
                }
            )

        if analysis_state.get("test_executed") and not analysis_state.get("results_translated"):
            steps.append(
                {
                    "step": "View Results",
                    "description": "See your results explained in plain English",
                    "action": "translate",
                    "priority": "required",
                }
            )

        if analysis_state.get("results_translated"):
            steps.append(
                {
                    "step": "Generate Report",
                    "description": "Create an APA-formatted report of your analysis",
                    "action": "report",
                    "priority": "recommended",
                }
            )
            steps.append(
                {
                    "step": "Try Another Analysis",
                    "description": "Ask a different research question about your data",
                    "action": "query",
                    "priority": "optional",
                }
            )
            steps.append(
                {
                    "step": "Check Assumptions",
                    "description": "Review the Guardian assumption validation report",
                    "action": "guardian",
                    "priority": "optional",
                }
            )

        return steps

    def _prepare_test_data(
        self,
        df: pd.DataFrame,
        variables: List[str],
        test_name: str,
        profile_result: SmartProfileResult,
    ) -> Optional[Any]:
        """Prepare data in the format expected by the cascade engine."""
        return self._prepare_test_data_and_count(df, variables, test_name, profile_result)[0]

    @staticmethod
    def _complete_rows(df: pd.DataFrame, first: str, second: str):
        """The two columns on the rows in which both hold a value, and the number of rows left out.

        The columns belong to the same rows (the two variables of a correlation, a before and an
        after, two categories of the same subjects). A row with a missing value in either column is
        therefore removed from both. Removing missing values column by column and pairing what is
        left pairs values from different rows: one missing value in each of two columns turned a
        correlation of 0.96 into 0.48.
        """
        pair = df[[first, second]]
        complete = pair.dropna()
        return complete.iloc[:, 0].values, complete.iloc[:, 1].values, int(len(pair) - len(complete))

    def _prepare_test_data_and_count(
        self,
        df: pd.DataFrame,
        variables: List[str],
        test_name: str,
        profile_result: SmartProfileResult,
    ):
        """The data in the format expected by the cascade engine, and a sentence that says how many
        rows or values were left out because a value is missing (None when none were)."""
        from ..data_profiler import VariableType

        # Filter to valid columns
        valid_vars = [v for v in variables if v in df.columns]
        if not valid_vars:
            # Try using the first suitable columns from the profile
            for q in profile_result.inferred_questions:
                valid_vars = [v for v in q.variables_involved if v in df.columns]
                if valid_vars:
                    break

        if not valid_vars:
            return None, None

        def together(first, second, as_numbers):
            x, y, left_out = self._complete_rows(df, first, second)
            note = None
            if left_out:
                note = (
                    f"{left_out} of {len(df)} rows have a missing value in '{first}' or '{second}' and were "
                    f"left out of both columns; the test used the {len(df) - left_out} complete rows."
                )
            if as_numbers:
                x, y = x.astype(float), y.astype(float)
            return [x, y], note

        # For group comparison tests, we need to split by grouping variable
        group_tests = {"independent_t", "welch_t", "mann_whitney_u", "one_way_anova", "kruskal_wallis"}
        if test_name in group_tests and len(valid_vars) >= 2:
            # Find the categorical (grouping) and continuous (outcome) variables
            cat_var = None
            cont_var = None
            for v in valid_vars:
                var_prof = profile_result.profile.variables.get(v)
                if var_prof:
                    if var_prof.type in (VariableType.NOMINAL, VariableType.BINARY):
                        cat_var = v
                    elif var_prof.type == VariableType.CONTINUOUS:
                        cont_var = v

            if cat_var and cont_var:
                # Independent groups: a missing value leaves its own row out and nothing else.
                groups = df.groupby(cat_var)[cont_var].apply(lambda x: x.dropna().values)
                data = {str(k): v for k, v in groups.items()}
                left_out = len(df) - sum(len(v) for v in data.values())
                note = None
                if left_out:
                    note = (
                        f"{left_out} of {len(df)} rows have no value in '{cont_var}' or no group in '{cat_var}' "
                        f"and were left out."
                    )
                return data, note

        # For correlation/regression the two columns are two variables of the same rows
        corr_tests = {"pearson", "spearman", "kendall", "linear_regression"}
        if test_name in corr_tests and len(valid_vars) >= 2:
            return together(valid_vars[0], valid_vars[1], as_numbers=True)

        # For categorical tests the two columns are cross-tabulated row by row
        cat_tests = {"chi_square_independence", "fisher_exact"}
        if test_name in cat_tests and len(valid_vars) >= 2:
            return together(valid_vars[0], valid_vars[1], as_numbers=False)

        # For paired tests the two columns are two measurements of the same rows
        paired_tests = {"paired_t", "wilcoxon_signed_rank"}
        if test_name in paired_tests and len(valid_vars) >= 2:
            return together(valid_vars[0], valid_vars[1], as_numbers=True)

        # Default: the columns are separate groups, each cleaned on its own
        numeric = [v for v in valid_vars if pd.api.types.is_numeric_dtype(df[v])]
        missing = {v: int(df[v].isna().sum()) for v in numeric}
        note = None
        if any(missing.values()):
            listed = ", ".join(f"'{v}': {n}" for v, n in missing.items() if n)
            note = f"Missing values were left out column by column ({listed}); the columns were treated as separate groups."
        return [df[v].dropna().values.astype(float) for v in numeric], note

    def _get_next_steps_for_result(
        self,
        cascade_result: Optional[CascadeResult],
        profile_result: SmartProfileResult,
    ) -> List[Dict[str, Any]]:
        """Generate next step recommendations based on analysis results."""
        steps = []

        if cascade_result and cascade_result.result:
            p = cascade_result.result.p_value

            # Post-hoc tests for ANOVA
            if cascade_result.final_test in ("one_way_anova", "kruskal_wallis") and p < 0.05:
                steps.append(
                    {
                        "step": "Run Post-Hoc Tests",
                        "description": "Identify which specific groups differ",
                        "action": "post_hoc",
                        "priority": "recommended",
                    }
                )

            # Effect size reporting
            steps.append(
                {
                    "step": "Report Effect Size",
                    "description": "Include effect size for practical significance",
                    "action": "effect_size",
                    "priority": "recommended",
                }
            )

            # Additional analyses from profile
            remaining = [q for q in profile_result.inferred_questions[1:4]]
            for q in remaining:
                steps.append(
                    {
                        "step": f"Explore: {q.question_text[:50]}...",
                        "description": q.explanation,
                        "action": "query",
                        "priority": "optional",
                    }
                )

            # Generate report
            steps.append(
                {
                    "step": "Generate APA Report",
                    "description": "Create a publication-ready methods and results section",
                    "action": "report",
                    "priority": "recommended",
                }
            )

        return steps

    def _error_result(
        self,
        query: str,
        error_msg: str,
        profile_result: Optional[SmartProfileResult] = None,
    ) -> AutonomousResult:
        """Create an error result."""
        profile_summary = {}
        inferred_questions = []
        if profile_result:
            profile_summary = {
                "n_rows": profile_result.profile.n_rows,
                "n_columns": profile_result.profile.n_columns,
                "variables": profile_result.variable_summary,
            }
            inferred_questions = [
                {
                    "type": q.question_type.value,
                    "text": q.question_text,
                    "variables": q.variables_involved,
                    "tests": q.suggested_tests,
                    "confidence": q.confidence,
                    "explanation": q.explanation,
                }
                for q in profile_result.inferred_questions
            ]

        return AutonomousResult(
            query=query,
            parsed_intent=None,
            profile_summary=profile_summary,
            cascade_result=None,
            translation={"summary": error_msg, "details": ""},
            inferred_questions=inferred_questions,
            suggested_next_steps=self.get_next_steps({"has_data": True}),
            confidence=0.0,
            warnings=[error_msg],
        )
