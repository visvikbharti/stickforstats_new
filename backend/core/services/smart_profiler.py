"""
Smart Profiler Service — Autonomous Intelligence Layer
=======================================================
Merges DataProfiler + AutomaticTestSelector into a single entry point.
Upload data → get complete profile + inferred research questions + test recommendations.

Author: StickForStats Development Team
Created: February 2026
Version: 2.0.0
"""

import re
import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging

from ..data_profiler import DataProfiler, DatasetProfile, VariableType, VariableProfile
from ..automatic_test_selector import (
    AutomaticTestSelector, ResearchQuestion, DataType,
    TestRecommendation, DataProfile as ATSDataProfile
)

logger = logging.getLogger(__name__)


class InferredQuestionType(Enum):
    """Types of research questions that can be inferred from data structure."""
    GROUP_COMPARISON = "group_comparison"
    MULTI_GROUP_COMPARISON = "multi_group_comparison"
    RELATIONSHIP = "relationship"
    PREDICTION = "prediction"
    ASSOCIATION = "association"
    BEFORE_AFTER = "before_after"
    TIME_SERIES = "time_series"
    DESCRIPTIVE = "descriptive"


@dataclass
class InferredQuestion:
    """A research question inferred from data structure."""
    question_type: InferredQuestionType
    question_text: str
    variables_involved: List[str]
    suggested_tests: List[str]
    confidence: float  # 0-1 how confident we are in this inference
    explanation: str


@dataclass
class DataHealthCard:
    """Overall health assessment of the uploaded dataset."""
    overall_score: float  # 0-100
    completeness_score: float  # Based on missing data
    quality_score: float  # Based on outliers, constants, etc.
    suitability_score: float  # Based on sample size, variable types
    issues: List[Dict[str, str]]  # severity + message pairs
    strengths: List[str]


@dataclass
class SmartProfileResult:
    """Complete result from smart profiling."""
    profile: DatasetProfile
    inferred_questions: List[InferredQuestion]
    recommendations: List[TestRecommendation]
    data_health: DataHealthCard
    variable_summary: Dict[str, Dict[str, Any]]
    suggested_workflow: str  # Best workflow template name


class SmartProfiler:
    """
    Intelligent data profiling that combines DataProfiler and AutomaticTestSelector
    into a single unified entry point for autonomous analysis.
    """

    # Patterns for detecting repeated measures / pre-post columns
    PREPOST_PATTERNS = [
        (r'(.+)[-_\s]?(pre|before|baseline|t[0-9]*0)$',
         r'(.+)[-_\s]?(post|after|followup|t[0-9]*1)$'),
        (r'(.+)[-_\s]?1$', r'(.+)[-_\s]?2$'),
        (r'(pre|before|baseline)[-_\s]?(.+)',
         r'(post|after|followup)[-_\s]?(.+)'),
    ]

    def __init__(self):
        self.data_profiler = DataProfiler(validate_against_r=False)
        self.test_selector = AutomaticTestSelector()

    def profile_and_recommend(
        self,
        df: pd.DataFrame,
        user_hint: Optional[str] = None
    ) -> SmartProfileResult:
        """
        Single entry point: profile data and recommend analyses.

        Args:
            df: Input DataFrame
            user_hint: Optional hint about research goal

        Returns:
            SmartProfileResult with everything needed for autonomous analysis
        """
        logger.info(f"SmartProfiler: profiling dataset with shape {df.shape}")

        # Step 1: Profile the dataset
        profile = self.data_profiler.profile_dataset(df)

        # Step 2: Classify variables
        var_summary = self._build_variable_summary(profile)

        # Step 3: Infer research questions from data structure
        inferred_questions = self._infer_research_questions(df, profile, var_summary, user_hint)

        # Step 4: Get test recommendations for each inferred question
        recommendations = self._get_recommendations(df, profile, inferred_questions)

        # Step 5: Assess data health
        data_health = self._assess_data_health(df, profile)

        # Step 6: Suggest best workflow
        suggested_workflow = self._suggest_workflow(inferred_questions, var_summary)

        return SmartProfileResult(
            profile=profile,
            inferred_questions=inferred_questions,
            recommendations=recommendations,
            data_health=data_health,
            variable_summary=var_summary,
            suggested_workflow=suggested_workflow,
        )

    def _build_variable_summary(self, profile: DatasetProfile) -> Dict[str, Dict[str, Any]]:
        """Build a simplified variable summary for the frontend."""
        summary = {}
        for name, var_prof in profile.variables.items():
            summary[name] = {
                'type': var_prof.type.value,
                'n_unique': var_prof.n_unique,
                'missing_pct': round(var_prof.missing_percentage, 1),
                'is_normal': (
                    var_prof.normality_p_value > 0.05
                    if var_prof.normality_p_value is not None else None
                ),
                'has_outliers': var_prof.n_outliers_iqr > 0,
                'n_outliers': var_prof.n_outliers_iqr,
            }
            if var_prof.type in (VariableType.CONTINUOUS, VariableType.ORDINAL):
                summary[name].update({
                    'mean': var_prof.mean,
                    'std': var_prof.std,
                    'median': var_prof.median,
                    'skewness': var_prof.skewness,
                })
            if var_prof.type in (VariableType.NOMINAL, VariableType.BINARY):
                summary[name].update({
                    'categories': var_prof.categories[:20],  # Cap for large sets
                    'n_categories': len(var_prof.categories),
                })
        return summary

    def _infer_research_questions(
        self,
        df: pd.DataFrame,
        profile: DatasetProfile,
        var_summary: Dict,
        user_hint: Optional[str] = None,
    ) -> List[InferredQuestion]:
        """
        Infer possible research questions from data structure.

        Uses the variable type matrix:
        - 1 categorical (2 levels) + 1 continuous → group comparison
        - 1 categorical (3+ levels) + 1 continuous → multi-group comparison
        - 2 continuous → relationship
        - 1 continuous outcome + k predictors → prediction
        - 2 categorical → association
        - Repeated measures patterns → before/after
        """
        questions = []
        continuous_vars = [
            name for name, v in profile.variables.items()
            if v.type == VariableType.CONTINUOUS
        ]
        categorical_vars = [
            name for name, v in profile.variables.items()
            if v.type in (VariableType.NOMINAL, VariableType.BINARY)
        ]
        binary_vars = [
            name for name, v in profile.variables.items()
            if v.type == VariableType.BINARY
        ]
        ordinal_vars = [
            name for name, v in profile.variables.items()
            if v.type == VariableType.ORDINAL
        ]

        # 1. Group comparison: 1 categorical (2 levels) + 1 continuous
        for cat_var in categorical_vars:
            n_levels = profile.variables[cat_var].n_unique
            if n_levels == 2:
                for cont_var in continuous_vars:
                    is_normal = var_summary[cont_var].get('is_normal', False)
                    tests = ['independent_t', 'welch_t'] if is_normal else ['mann_whitney_u']
                    questions.append(InferredQuestion(
                        question_type=InferredQuestionType.GROUP_COMPARISON,
                        question_text=f"Is there a difference in {cont_var} between the two {cat_var} groups?",
                        variables_involved=[cat_var, cont_var],
                        suggested_tests=tests,
                        confidence=0.85,
                        explanation=f"You have a 2-level grouping variable ({cat_var}) and a continuous outcome ({cont_var}). This is a classic two-group comparison."
                    ))

        # 2. Multi-group comparison: 1 categorical (3+ levels) + 1 continuous
        for cat_var in categorical_vars:
            n_levels = profile.variables[cat_var].n_unique
            if n_levels >= 3:
                for cont_var in continuous_vars:
                    is_normal = var_summary[cont_var].get('is_normal', False)
                    tests = ['one_way_anova'] if is_normal else ['kruskal_wallis']
                    questions.append(InferredQuestion(
                        question_type=InferredQuestionType.MULTI_GROUP_COMPARISON,
                        question_text=f"Do the {n_levels} groups of {cat_var} differ in {cont_var}?",
                        variables_involved=[cat_var, cont_var],
                        suggested_tests=tests,
                        confidence=0.80,
                        explanation=f"You have a {n_levels}-level grouping variable ({cat_var}) and a continuous outcome ({cont_var}). This calls for a multi-group comparison."
                    ))

        # 3. Relationship: 2 continuous variables
        if len(continuous_vars) >= 2:
            for i, var1 in enumerate(continuous_vars):
                for var2 in continuous_vars[i + 1:]:
                    both_normal = (
                        var_summary[var1].get('is_normal', False) and
                        var_summary[var2].get('is_normal', False)
                    )
                    tests = ['pearson'] if both_normal else ['spearman']
                    questions.append(InferredQuestion(
                        question_type=InferredQuestionType.RELATIONSHIP,
                        question_text=f"Is there a relationship between {var1} and {var2}?",
                        variables_involved=[var1, var2],
                        suggested_tests=tests,
                        confidence=0.75,
                        explanation=f"You have two continuous variables ({var1}, {var2}). We can test their correlation."
                    ))

        # 4. Prediction: 1 continuous + multiple predictors
        if len(continuous_vars) >= 2 and (len(continuous_vars) + len(categorical_vars)) >= 3:
            outcome = continuous_vars[0]  # First continuous as default outcome
            predictors = continuous_vars[1:] + categorical_vars
            questions.append(InferredQuestion(
                question_type=InferredQuestionType.PREDICTION,
                question_text=f"Can we predict {outcome} from {', '.join(predictors[:3])}{'...' if len(predictors) > 3 else ''}?",
                variables_involved=[outcome] + predictors[:5],
                suggested_tests=['linear_regression'],
                confidence=0.65,
                explanation=f"With multiple variables, you could predict {outcome} using the others as predictors."
            ))

        # 5. Association: 2 categorical variables
        if len(categorical_vars) >= 2:
            for i, var1 in enumerate(categorical_vars):
                for var2 in categorical_vars[i + 1:]:
                    n1 = profile.variables[var1].n_unique
                    n2 = profile.variables[var2].n_unique
                    if n1 == 2 and n2 == 2:
                        tests = ['fisher_exact', 'chi_square_independence']
                    else:
                        tests = ['chi_square_independence']
                    questions.append(InferredQuestion(
                        question_type=InferredQuestionType.ASSOCIATION,
                        question_text=f"Is there an association between {var1} and {var2}?",
                        variables_involved=[var1, var2],
                        suggested_tests=tests,
                        confidence=0.80,
                        explanation=f"Both {var1} and {var2} are categorical. We can test their association."
                    ))

        # 6. Before/After: detect pre/post column patterns
        paired_sets = self._detect_paired_columns(df.columns.tolist())
        for pre_col, post_col in paired_sets:
            questions.append(InferredQuestion(
                question_type=InferredQuestionType.BEFORE_AFTER,
                question_text=f"Did {pre_col.split('_')[0] if '_' in pre_col else pre_col} change from before to after?",
                variables_involved=[pre_col, post_col],
                suggested_tests=['paired_t', 'wilcoxon_signed_rank'],
                confidence=0.90,
                explanation=f"Detected paired columns ({pre_col}, {post_col}) suggesting a before/after comparison."
            ))

        # Sort by confidence (highest first)
        questions.sort(key=lambda q: q.confidence, reverse=True)

        # Limit to top 10 most relevant questions
        return questions[:10]

    def _detect_paired_columns(self, columns: List[str]) -> List[Tuple[str, str]]:
        """Detect pre/post or repeated measure column pairs."""
        pairs = []
        cols_lower = {col: col.lower().strip() for col in columns}

        for pre_pattern, post_pattern in self.PREPOST_PATTERNS:
            pre_matches = {}
            post_matches = {}
            for col, col_low in cols_lower.items():
                pre_m = re.match(pre_pattern, col_low, re.IGNORECASE)
                if pre_m:
                    key = pre_m.group(1).strip('_- ')
                    pre_matches[key] = col
                post_m = re.match(post_pattern, col_low, re.IGNORECASE)
                if post_m:
                    key = post_m.group(1).strip('_- ')
                    post_matches[key] = col

            for key in pre_matches:
                if key in post_matches:
                    pairs.append((pre_matches[key], post_matches[key]))

        return pairs

    def _get_recommendations(
        self,
        df: pd.DataFrame,
        profile: DatasetProfile,
        inferred_questions: List[InferredQuestion],
    ) -> List[TestRecommendation]:
        """Get AutomaticTestSelector recommendations for inferred questions."""
        recommendations = []
        seen_tests = set()

        for question in inferred_questions[:5]:  # Top 5 questions
            # Map our question types to ATS ResearchQuestion
            rq_map = {
                InferredQuestionType.GROUP_COMPARISON: ResearchQuestion.DIFFERENCE,
                InferredQuestionType.MULTI_GROUP_COMPARISON: ResearchQuestion.DIFFERENCE,
                InferredQuestionType.RELATIONSHIP: ResearchQuestion.CORRELATION,
                InferredQuestionType.PREDICTION: ResearchQuestion.PREDICTION,
                InferredQuestionType.ASSOCIATION: ResearchQuestion.ASSOCIATION,
                InferredQuestionType.BEFORE_AFTER: ResearchQuestion.DIFFERENCE,
            }
            research_q = rq_map.get(question.question_type)
            if not research_q:
                continue

            # Build data arrays for the relevant variables
            var_names = question.variables_involved
            data_arrays = []
            for var_name in var_names:
                if var_name in df.columns:
                    series = df[var_name].dropna()
                    if pd.api.types.is_numeric_dtype(series):
                        data_arrays.append(series.values)

            if not data_arrays:
                continue

            try:
                ats_profile = self.test_selector.analyze_data(
                    data_arrays, variable_names=var_names[:len(data_arrays)]
                )
                # Set paired/repeated flags
                if question.question_type == InferredQuestionType.BEFORE_AFTER:
                    ats_profile.paired_data = True

                rec = self.test_selector.recommend_test(ats_profile, research_q)
                if rec.primary_test not in seen_tests:
                    recommendations.append(rec)
                    seen_tests.add(rec.primary_test)
            except Exception as e:
                logger.warning(f"Failed to get recommendation for {question.question_text}: {e}")

        return recommendations

    def _assess_data_health(self, df: pd.DataFrame, profile: DatasetProfile) -> DataHealthCard:
        """Compute a data health card with scores and issues."""
        issues = []
        strengths = []

        # Completeness score (based on missing data)
        total_cells = profile.n_rows * profile.n_columns
        missing_pct = (profile.total_missing / total_cells * 100) if total_cells > 0 else 0
        if missing_pct == 0:
            completeness_score = 100.0
            strengths.append("No missing data detected")
        elif missing_pct < 5:
            completeness_score = 95.0
            issues.append({'severity': 'minor', 'message': f'{missing_pct:.1f}% missing data'})
        elif missing_pct < 20:
            completeness_score = 70.0
            issues.append({'severity': 'warning', 'message': f'{missing_pct:.1f}% missing data — consider imputation'})
        else:
            completeness_score = max(20, 100 - missing_pct * 2)
            issues.append({'severity': 'critical', 'message': f'{missing_pct:.1f}% missing data — significant data loss'})

        # Quality score (outliers, constants, infinite values)
        quality_deductions = 0
        for name, var_prof in profile.variables.items():
            if var_prof.is_constant:
                quality_deductions += 15
                issues.append({'severity': 'warning', 'message': f'"{name}" is constant (no variation)'})
            if var_prof.has_infinite_values:
                quality_deductions += 10
                issues.append({'severity': 'critical', 'message': f'"{name}" contains infinite values'})
            if var_prof.n_outliers_iqr > 0:
                outlier_pct = var_prof.n_outliers_iqr / var_prof.n_observations * 100
                if outlier_pct > 10:
                    quality_deductions += 10
                    issues.append({'severity': 'warning', 'message': f'"{name}" has {outlier_pct:.0f}% outliers'})
        quality_score = max(0, 100 - quality_deductions)
        if quality_deductions == 0:
            strengths.append("No data quality issues detected")

        # Suitability score (sample size, variable types)
        suitability_score = 100.0
        if profile.n_rows < 10:
            suitability_score -= 40
            issues.append({'severity': 'critical', 'message': f'Very small sample size (n={profile.n_rows})'})
        elif profile.n_rows < 30:
            suitability_score -= 15
            issues.append({'severity': 'warning', 'message': f'Small sample (n={profile.n_rows}) — limited test options'})
        else:
            strengths.append(f"Adequate sample size (n={profile.n_rows})")

        continuous_count = sum(
            1 for v in profile.variables.values()
            if v.type == VariableType.CONTINUOUS
        )
        categorical_count = sum(
            1 for v in profile.variables.values()
            if v.type in (VariableType.NOMINAL, VariableType.BINARY)
        )
        if continuous_count == 0 and categorical_count == 0:
            suitability_score -= 30
            issues.append({'severity': 'critical', 'message': 'No analyzable variables detected'})
        else:
            strengths.append(f"{continuous_count} continuous + {categorical_count} categorical variables")

        # Overall score
        overall_score = round(
            completeness_score * 0.35 +
            quality_score * 0.30 +
            suitability_score * 0.35,
            1
        )

        return DataHealthCard(
            overall_score=overall_score,
            completeness_score=round(completeness_score, 1),
            quality_score=round(quality_score, 1),
            suitability_score=round(suitability_score, 1),
            issues=issues,
            strengths=strengths,
        )

    def _suggest_workflow(
        self,
        questions: List[InferredQuestion],
        var_summary: Dict,
    ) -> str:
        """Suggest the best workflow template based on inferred questions."""
        if not questions:
            return "full_study"

        top = questions[0]
        workflow_map = {
            InferredQuestionType.GROUP_COMPARISON: "two_group_comparison",
            InferredQuestionType.MULTI_GROUP_COMPARISON: "multi_group",
            InferredQuestionType.RELATIONSHIP: "find_relationships",
            InferredQuestionType.PREDICTION: "predict_outcomes",
            InferredQuestionType.ASSOCIATION: "category_associations",
            InferredQuestionType.BEFORE_AFTER: "before_after",
            InferredQuestionType.DESCRIPTIVE: "full_study",
        }
        return workflow_map.get(top.question_type, "full_study")
