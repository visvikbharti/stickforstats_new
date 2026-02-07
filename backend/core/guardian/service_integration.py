"""
Guardian Service Integration Module
===================================

Provides integration patterns to ensure all statistical services
invoke Guardian checks before returning results.

Design Contract Compliance:
- "No statistical result may exist without an explicit, traceable assumption context."
- Guardian report must ALWAYS accompany statistical results
- Results without Guardian context are CONTRACT VIOLATIONS

Author: StickForStats Development Team
Date: 2025-01-26
"""

from typing import Dict, Any, List, Optional, Callable, Union
from functools import wraps
import numpy as np
import pandas as pd
from dataclasses import dataclass, asdict

from .guardian_core import GuardianCore, GuardianReport, AssumptionViolation


@dataclass
class GuardianEnrichedResult:
    """
    Container for statistical results with mandatory Guardian context.

    This ensures compliance with the design contract that no statistical
    result can exist without its assumption context.
    """
    statistical_results: Dict[str, Any]
    guardian_report: Dict[str, Any]
    assumptions_checked: List[str]
    violations: List[Dict[str, Any]]
    confidence_score: float
    can_proceed: bool
    alternative_tests: List[str]
    expert_mode_override: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            'statistical_results': self.statistical_results,
            'guardian_report': self.guardian_report,
            'assumptions_checked': self.assumptions_checked,
            'violations': self.violations,
            'confidence_score': self.confidence_score,
            'can_proceed': self.can_proceed,
            'alternative_tests': self.alternative_tests,
            'expert_mode_override': self.expert_mode_override,
            # Metadata for frontend
            '_guardian_context': True,  # Flag indicating Guardian was invoked
            '_contract_compliant': True  # Flag for design contract compliance
        }


class GuardianServiceWrapper:
    """
    Wrapper that ensures Guardian integration for any statistical service.

    Usage:
        wrapper = GuardianServiceWrapper()
        enriched_result = wrapper.execute_with_guardian(
            test_type='t_test',
            data=my_data,
            compute_function=lambda d: my_service.run_test(d),
            expert_mode=False
        )
    """

    def __init__(self):
        self.guardian = GuardianCore()

    def execute_with_guardian(
        self,
        test_type: str,
        data: Any,
        compute_function: Callable,
        alpha: float = 0.05,
        expert_mode: bool = False
    ) -> GuardianEnrichedResult:
        """
        Execute a statistical computation with Guardian pre-check.

        Args:
            test_type: Type of statistical test (must be in Guardian's test_requirements)
            data: Data to analyze (array-like, dict, or DataFrame)
            compute_function: Function that computes the statistical result
            alpha: Significance level for assumption tests
            expert_mode: If True, allows proceeding despite critical violations

        Returns:
            GuardianEnrichedResult with both statistical results and Guardian context

        Raises:
            GuardianBlockError: If can_proceed is False and expert_mode is False
        """
        # Step 1: Run Guardian check BEFORE statistical computation
        guardian_report = self.guardian.check(data, test_type, alpha)

        # Step 2: Check if we can proceed
        if not guardian_report.can_proceed and not expert_mode:
            # Return result with failed Guardian check but no statistical results
            return GuardianEnrichedResult(
                statistical_results={
                    'blocked': True,
                    'reason': 'Critical assumption violations detected',
                    'message': 'Enable Expert Mode to proceed despite violations'
                },
                guardian_report=self._report_to_dict(guardian_report),
                assumptions_checked=guardian_report.assumptions_checked,
                violations=[self._violation_to_dict(v) for v in guardian_report.violations],
                confidence_score=guardian_report.confidence_score,
                can_proceed=False,
                alternative_tests=guardian_report.alternative_tests,
                expert_mode_override=False
            )

        # Step 3: Execute statistical computation
        statistical_results = compute_function(data)

        # Step 4: Return enriched result with Guardian context
        return GuardianEnrichedResult(
            statistical_results=statistical_results,
            guardian_report=self._report_to_dict(guardian_report),
            assumptions_checked=guardian_report.assumptions_checked,
            violations=[self._violation_to_dict(v) for v in guardian_report.violations],
            confidence_score=guardian_report.confidence_score,
            can_proceed=guardian_report.can_proceed,
            alternative_tests=guardian_report.alternative_tests,
            expert_mode_override=expert_mode and not guardian_report.can_proceed
        )

    def _report_to_dict(self, report: GuardianReport) -> Dict[str, Any]:
        """Convert GuardianReport to dictionary."""
        return {
            'test_type': report.test_type,
            'data_summary': report.data_summary,
            'assumptions_checked': report.assumptions_checked,
            'violations': [self._violation_to_dict(v) for v in report.violations],
            'can_proceed': report.can_proceed,
            'alternative_tests': report.alternative_tests,
            'confidence_score': report.confidence_score,
            'visual_evidence': report.visual_evidence,
            'effect_size_report': report.effect_size_report
        }

    def _violation_to_dict(self, violation: AssumptionViolation) -> Dict[str, Any]:
        """Convert AssumptionViolation to dictionary."""
        return {
            'assumption': violation.assumption,
            'test_name': violation.test_name,
            'severity': violation.severity,
            'p_value': violation.p_value,
            'statistic': violation.statistic,
            'message': violation.message,
            'recommendation': violation.recommendation,
            'visual_evidence': violation.visual_evidence
        }


def guardian_protected(test_type: str):
    """
    Decorator to automatically add Guardian protection to a service method.

    Usage:
        class MyService:
            @guardian_protected('t_test')
            def run_t_test(self, data, **kwargs):
                # Computation code
                return results

    The decorated method will:
    1. Run Guardian check before computation
    2. Return GuardianEnrichedResult instead of raw results
    3. Block on critical violations unless expert_mode=True
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(self, data, *args, expert_mode: bool = False, alpha: float = 0.05, **kwargs):
            # Get or create Guardian instance
            if not hasattr(self, '_guardian_wrapper'):
                self._guardian_wrapper = GuardianServiceWrapper()

            # Define the computation function
            def compute(d):
                return func(self, d, *args, **kwargs)

            # Execute with Guardian
            return self._guardian_wrapper.execute_with_guardian(
                test_type=test_type,
                data=data,
                compute_function=compute,
                alpha=alpha,
                expert_mode=expert_mode
            )
        return wrapper
    return decorator


class GuardianIntegratedService:
    """
    Base class for services that require Guardian integration.

    Subclass this to create services that automatically include
    Guardian context with all statistical results.

    Example:
        class TTestService(GuardianIntegratedService):
            def run_independent_t_test(self, group1, group2, **kwargs):
                data = {'group1': group1, 'group2': group2}

                def compute(d):
                    # Your statistical computation here
                    return {'t_statistic': t, 'p_value': p, ...}

                return self.execute_with_guardian('t_test', data, compute, **kwargs)
    """

    def __init__(self):
        self.guardian = GuardianCore()
        self._wrapper = GuardianServiceWrapper()

    def execute_with_guardian(
        self,
        test_type: str,
        data: Any,
        compute_function: Callable,
        alpha: float = 0.05,
        expert_mode: bool = False
    ) -> GuardianEnrichedResult:
        """
        Execute computation with Guardian protection.

        See GuardianServiceWrapper.execute_with_guardian for details.
        """
        return self._wrapper.execute_with_guardian(
            test_type=test_type,
            data=data,
            compute_function=compute_function,
            alpha=alpha,
            expert_mode=expert_mode
        )

    def check_assumptions_only(
        self,
        test_type: str,
        data: Any,
        alpha: float = 0.05
    ) -> Dict[str, Any]:
        """
        Check assumptions without running computation.

        Useful for pre-validation before expensive computations.
        """
        report = self.guardian.check(data, test_type, alpha)
        return self._wrapper._report_to_dict(report)


# Test type mapping for common statistical tests
# Maps user-friendly names to Guardian test_requirements keys
TEST_TYPE_ALIASES = {
    # T-tests
    'one_sample_t': 't_test',
    'independent_t': 't_test',
    'paired_t': 't_test',
    'welch_t': 't_test',

    # ANOVA
    'one_way_anova': 'anova',
    'two_way_anova': 'anova',
    'repeated_measures_anova': 'anova',

    # Correlation
    'pearson_correlation': 'pearson',
    'spearman_correlation': 'pearson',  # Uses similar assumptions but less strict

    # Regression
    'linear_regression': 'regression',
    'multiple_regression': 'regression',
    'logistic_regression': 'regression',

    # Non-parametric
    'mann_whitney_u': 'mann_whitney',
    'wilcoxon_signed_rank': 'mann_whitney',
    'kruskal_wallis_h': 'kruskal_wallis',

    # Chi-square
    'chi_square_independence': 'chi_square',
    'chi_square_goodness_of_fit': 'chi_square',
}


def resolve_test_type(test_type: str) -> str:
    """
    Resolve user-friendly test type to Guardian test_requirements key.

    Args:
        test_type: User-provided test type name

    Returns:
        Normalized test type for Guardian lookup
    """
    normalized = test_type.lower().replace(' ', '_').replace('-', '_')
    return TEST_TYPE_ALIASES.get(normalized, normalized)
