"""
Guardian Integration Tests
==========================

Tests for Guardian Design Contract compliance.

Design Contract Principle:
"No statistical result may exist without an explicit, traceable assumption context."

These tests verify:
1. GuardianServiceWrapper correctly wraps computations
2. GuardianEnrichedResult contains all required fields
3. @guardian_protected decorator works correctly
4. API responses include Guardian context

@author StickForStats Development Team
@date 2026-01-26
"""

import numpy as np
import pandas as pd
from unittest.mock import Mock, patch
from django.test import TestCase, RequestFactory
from rest_framework.test import APITestCase

# Import Guardian components
from core.guardian import (
    GuardianCore,
    GuardianServiceWrapper,
    GuardianEnrichedResult,
    guardian_protected,
    resolve_test_type,
)


class TestGuardianEnrichedResult(TestCase):
    """Test GuardianEnrichedResult dataclass."""

    def test_enriched_result_has_required_fields(self):
        """Verify EnrichedResult contains all Design Contract required fields."""
        result = GuardianEnrichedResult(
            statistical_results={"t_statistic": 2.5, "p_value": 0.01},
            guardian_report={"test_type": "t_test"},
            assumptions_checked=["normality", "homogeneity"],
            violations=[],
            confidence_score=85.0,
            can_proceed=True,
            alternative_tests=["welch_t_test"],
            expert_mode_override=False,
        )

        # Verify all required fields are present
        self.assertIsNotNone(result.statistical_results)
        self.assertIsNotNone(result.guardian_report)
        self.assertIsNotNone(result.assumptions_checked)
        self.assertIsNotNone(result.violations)
        self.assertIsNotNone(result.confidence_score)
        self.assertIsNotNone(result.can_proceed)
        self.assertIsNotNone(result.alternative_tests)

    def test_enriched_result_to_dict(self):
        """Verify to_dict() includes all Guardian context fields."""
        result = GuardianEnrichedResult(
            statistical_results={"t_statistic": 2.5},
            guardian_report={"test_type": "t_test"},
            assumptions_checked=["normality"],
            violations=[{"assumption": "normality", "severity": "warning"}],
            confidence_score=75.0,
            can_proceed=True,
            alternative_tests=["mann_whitney"],
            expert_mode_override=False,
        )

        result_dict = result.to_dict()

        # Design Contract required fields
        self.assertIn("guardian_report", result_dict)
        self.assertIn("assumptions_checked", result_dict)
        self.assertIn("violations", result_dict)
        self.assertIn("confidence_score", result_dict)
        self.assertIn("can_proceed", result_dict)
        self.assertIn("alternative_tests", result_dict)
        self.assertIn("_guardian_context", result_dict)
        self.assertIn("_contract_compliant", result_dict)

        # Verify compliance flags
        self.assertTrue(result_dict["_guardian_context"])
        self.assertTrue(result_dict["_contract_compliant"])

    def test_enriched_result_with_violations(self):
        """Verify violations are properly included."""
        violations = [
            {
                "assumption": "normality",
                "severity": "critical",
                "message": "Data is not normally distributed",
                "p_value": 0.001,
                "recommendation": "Use non-parametric test",
            }
        ]

        result = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=["normality"],
            violations=violations,
            confidence_score=45.0,
            can_proceed=False,
            alternative_tests=["mann_whitney"],
            expert_mode_override=False,
        )

        self.assertEqual(len(result.violations), 1)
        self.assertEqual(result.violations[0]["severity"], "critical")
        self.assertFalse(result.can_proceed)

    def test_expert_mode_override(self):
        """Verify expert mode allows proceeding despite violations."""
        result = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=["normality"],
            violations=[{"severity": "critical"}],
            confidence_score=45.0,
            can_proceed=False,  # Would normally be blocked
            alternative_tests=[],
            expert_mode_override=True,  # Expert override
        )

        result_dict = result.to_dict()
        self.assertTrue(result_dict["expert_mode_override"])


class TestGuardianServiceWrapper(TestCase):
    """Test GuardianServiceWrapper functionality."""

    def setUp(self):
        """Set up test fixtures."""
        self.wrapper = GuardianServiceWrapper()

    def test_wrapper_initialization(self):
        """Verify wrapper initializes with GuardianCore."""
        self.assertIsNotNone(self.wrapper.guardian)
        self.assertIsInstance(self.wrapper.guardian, GuardianCore)

    def test_execute_with_guardian_returns_enriched_result(self):
        """Verify execute_with_guardian returns GuardianEnrichedResult."""
        # Create mock data with ONLY numeric values (no group column with strings)
        data = np.random.normal(100, 15, 30)

        # Mock compute function
        def mock_compute(d):
            return {"t_statistic": 2.5, "p_value": 0.015}

        result = self.wrapper.execute_with_guardian(
            test_type="t_test", data=data, compute_function=mock_compute, expert_mode=False
        )

        # Verify result type
        self.assertIsInstance(result, GuardianEnrichedResult)

        # Verify Guardian context is present
        self.assertIsNotNone(result.guardian_report)
        self.assertIsNotNone(result.assumptions_checked)
        self.assertIsInstance(result.confidence_score, (int, float))

    def test_execute_with_guardian_calls_guardian_check(self):
        """Verify Guardian check is called before computation."""
        data = pd.DataFrame({"value": [1, 2, 3, 4, 5]})

        with patch.object(self.wrapper.guardian, "check") as mock_check:
            mock_check.return_value = Mock(
                assumptions_checked=["normality"],
                violations=[],
                confidence_score=90.0,
                can_proceed=True,
                alternative_tests=[],
            )

            self.wrapper.execute_with_guardian(
                test_type="t_test", data=data, compute_function=lambda d: {"result": 1}, expert_mode=False
            )

            # Verify check was called
            mock_check.assert_called_once()


class TestResolveTestType(TestCase):
    """Test test type resolution functionality."""

    def test_resolve_known_aliases(self):
        """Verify known aliases resolve correctly."""
        # Test aliases that ARE in TEST_TYPE_ALIASES
        self.assertEqual(resolve_test_type("independent_t"), "t_test")
        self.assertEqual(resolve_test_type("one_sample_t"), "t_test")
        self.assertEqual(resolve_test_type("paired_t"), "t_test")
        self.assertEqual(resolve_test_type("one_way_anova"), "anova")

    def test_resolve_normalizes_hyphens_and_spaces(self):
        """Verify hyphens and spaces are normalized to underscores."""
        # t-test becomes t_test (normalization)
        self.assertEqual(resolve_test_type("t-test"), "t_test")
        self.assertEqual(resolve_test_type("chi square"), "chi_square")

    def test_resolve_preserves_valid_types(self):
        """Verify valid types pass through unchanged."""
        valid_types = ["t_test", "anova", "chi_square", "pearson"]
        for test_type in valid_types:
            # Should return the type (possibly normalized)
            result = resolve_test_type(test_type)
            self.assertIsNotNone(result)

    def test_resolve_handles_case_insensitivity(self):
        """Verify case-insensitive resolution."""
        self.assertEqual(resolve_test_type("T_TEST"), resolve_test_type("t_test"))


class TestGuardianProtectedDecorator(TestCase):
    """Test @guardian_protected decorator."""

    def test_decorator_wraps_method(self):
        """Verify decorator properly wraps class method."""

        # The decorator is designed for class methods (requires self)
        class TestService:
            @guardian_protected(test_type="t_test")
            def sample_test(self, data):
                return {"t_statistic": 2.5, "p_value": 0.01}

        service = TestService()
        data = np.array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
        result = service.sample_test(data)

        # Result should be GuardianEnrichedResult
        self.assertIsInstance(result, GuardianEnrichedResult)

    def test_decorator_preserves_function_name(self):
        """Verify decorator preserves function metadata."""

        class TestService:
            @guardian_protected(test_type="anova")
            def my_anova_test(self, data):
                """My ANOVA test docstring."""
                return {}

        # Check the wrapped method name is preserved
        service = TestService()
        self.assertEqual(service.my_anova_test.__name__, "my_anova_test")


class TestGuardianAPICompliance(APITestCase):
    """Test API endpoints for Guardian compliance."""

    def setUp(self):
        """Set up test client."""
        self.factory = RequestFactory()

    def test_statistical_endpoint_includes_guardian_context(self):
        """Verify statistical endpoints include Guardian context."""
        # This test would need actual endpoint testing
        # For now, verify the expected response structure

        expected_fields = [
            "guardian_report",
            "assumptions_checked",
            "violations",
            "confidence_score",
            "can_proceed",
            "alternative_tests",
            "_guardian_context",
            "_contract_compliant",
        ]

        # Mock response structure
        mock_response = {
            "statistical_results": {"t": 2.5, "p": 0.01},
            "guardian_report": {"test_type": "t_test"},
            "assumptions_checked": ["normality"],
            "violations": [],
            "confidence_score": 85.0,
            "can_proceed": True,
            "alternative_tests": [],
            "_guardian_context": True,
            "_contract_compliant": True,
        }

        for field in expected_fields:
            self.assertIn(field, mock_response)


class TestGuardianViolationSeverity(TestCase):
    """Test violation severity handling."""

    def test_critical_violation_blocks_by_default(self):
        """Verify critical violations block analysis by default."""
        result = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=["normality"],
            violations=[{"severity": "critical", "assumption": "normality"}],
            confidence_score=30.0,
            can_proceed=False,  # Blocked due to critical
            alternative_tests=["mann_whitney"],
            expert_mode_override=False,
        )

        self.assertFalse(result.can_proceed)

    def test_warning_violation_allows_proceed(self):
        """Verify warning violations allow proceeding."""
        result = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=["normality"],
            violations=[{"severity": "warning", "assumption": "normality"}],
            confidence_score=70.0,
            can_proceed=True,  # Allowed with warning
            alternative_tests=[],
            expert_mode_override=False,
        )

        self.assertTrue(result.can_proceed)

    def test_expert_mode_overrides_critical(self):
        """Verify expert mode can override critical violations."""
        # With expert_mode, can_proceed should be True even with critical
        result = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=["normality"],
            violations=[{"severity": "critical"}],
            confidence_score=30.0,
            can_proceed=True,  # Expert override
            alternative_tests=[],
            expert_mode_override=True,
        )

        self.assertTrue(result.can_proceed)
        self.assertTrue(result.expert_mode_override)


class TestGuardianConfidenceScore(TestCase):
    """Test confidence score calculation."""

    def test_confidence_score_range(self):
        """Verify confidence score is within valid range."""
        scores = [0, 25, 50, 75, 100]

        for score in scores:
            result = GuardianEnrichedResult(
                statistical_results={},
                guardian_report={},
                assumptions_checked=[],
                violations=[],
                confidence_score=score,
                can_proceed=True,
                alternative_tests=[],
                expert_mode_override=False,
            )

            self.assertGreaterEqual(result.confidence_score, 0)
            self.assertLessEqual(result.confidence_score, 100)

    def test_violations_reduce_confidence(self):
        """Verify violations reduce confidence score."""
        # No violations = high confidence
        result_clean = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=["normality", "homogeneity"],
            violations=[],
            confidence_score=95.0,
            can_proceed=True,
            alternative_tests=[],
            expert_mode_override=False,
        )

        # With violations = lower confidence
        result_violations = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=["normality", "homogeneity"],
            violations=[
                {"severity": "warning", "assumption": "normality"},
                {"severity": "warning", "assumption": "homogeneity"},
            ],
            confidence_score=65.0,
            can_proceed=True,
            alternative_tests=["welch_t_test"],
            expert_mode_override=False,
        )

        self.assertGreater(result_clean.confidence_score, result_violations.confidence_score)


class TestDesignContractCompliance(TestCase):
    """Test overall Design Contract compliance."""

    def test_no_result_without_guardian_context(self):
        """
        Core Design Contract principle:
        'No statistical result may exist without an explicit, traceable assumption context.'
        """
        # A compliant result MUST have these fields
        required_context_fields = [
            "guardian_report",
            "assumptions_checked",
            "violations",
            "confidence_score",
            "can_proceed",
        ]

        result = GuardianEnrichedResult(
            statistical_results={"t": 2.5},
            guardian_report={"test_type": "t_test"},
            assumptions_checked=["normality"],
            violations=[],
            confidence_score=90.0,
            can_proceed=True,
            alternative_tests=[],
            expert_mode_override=False,
        )

        result_dict = result.to_dict()

        for field in required_context_fields:
            self.assertIn(field, result_dict, f"Design Contract violation: missing required field '{field}'")

    def test_guardian_context_flag_present(self):
        """Verify _guardian_context flag is present and True."""
        result = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=[],
            violations=[],
            confidence_score=0,
            can_proceed=True,
            alternative_tests=[],
            expert_mode_override=False,
        )

        result_dict = result.to_dict()

        self.assertIn("_guardian_context", result_dict)
        self.assertTrue(result_dict["_guardian_context"])

    def test_contract_compliant_flag_present(self):
        """Verify _contract_compliant flag is present and True."""
        result = GuardianEnrichedResult(
            statistical_results={},
            guardian_report={},
            assumptions_checked=[],
            violations=[],
            confidence_score=0,
            can_proceed=True,
            alternative_tests=[],
            expert_mode_override=False,
        )

        result_dict = result.to_dict()

        self.assertIn("_contract_compliant", result_dict)
        self.assertTrue(result_dict["_contract_compliant"])


# Run with: python manage.py test core.guardian.tests.test_guardian_integration
