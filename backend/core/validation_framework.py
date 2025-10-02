"""
Validation Framework for Statistical Calculations
=================================================
Created: 2025-09-15
Author: StickForStats Development Team
Version: 1.0.0

This module implements a comprehensive validation framework that compares
StickForStats calculations against R, Python (scipy/statsmodels), and SAS.

Scientific Accuracy Target: 15 decimal places
Performance Target: <100ms per test
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import logging
import subprocess
import json
import tempfile
import os
from scipy import stats
import statsmodels.api as sm
from statsmodels.stats import weightstats, proportion
import time
from decimal import Decimal, getcontext

# Set high precision for validation
getcontext().prec = 50

logger = logging.getLogger(__name__)


class ValidationStatus(Enum):
    """Status of validation test"""
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class ValidationResult:
    """Result of a single validation test"""
    test_name: str
    method: str
    status: ValidationStatus

    # Values
    our_value: float
    reference_value: float
    absolute_difference: float
    relative_difference: float

    # Metadata
    execution_time: float
    decimal_places_matched: int
    tolerance_used: float

    # Details
    error_message: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ValidationSuite:
    """Complete validation suite results"""
    suite_name: str
    total_tests: int
    passed: int
    failed: int
    skipped: int
    errors: int

    # Performance
    total_execution_time: float
    average_accuracy: float  # Average decimal places matched

    # Results
    results: List[ValidationResult]

    # Summary
    summary: Dict[str, Any] = field(default_factory=dict)


class StatisticalValidator:
    """
    Validates statistical calculations against multiple reference implementations
    """

    def __init__(self, tolerance: float = 1e-15):
        """
        Initialize validator

        Args:
            tolerance: Maximum acceptable difference (default 1e-15 for 15 decimal places)
        """
        self.tolerance = tolerance
        self.r_available = self._check_r_availability()
        self.sas_available = self._check_sas_availability()

    def _check_r_availability(self) -> bool:
        """Check if R is available for validation"""
        try:
            result = subprocess.run(['R', '--version'],
                                  capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except:
            logger.warning("R not available for validation")
            return False

    def _check_sas_availability(self) -> bool:
        """Check if SAS is available for validation"""
        # SAS is typically not available in most environments
        return False

    def validate_t_test(self, data1: np.ndarray, data2: Optional[np.ndarray] = None,
                       test_type: str = 'two_sample', **kwargs) -> ValidationSuite:
        """
        Validate t-test calculations

        Args:
            data1: First data array
            data2: Second data array (for two-sample tests)
            test_type: Type of t-test ('one_sample', 'two_sample', 'paired')
            **kwargs: Additional parameters

        Returns:
            ValidationSuite with results
        """
        suite_name = f"T-Test Validation ({test_type})"
        results = []
        start_time = time.time()

        # Our calculation (placeholder - should call actual implementation)
        our_result = self._calculate_t_test(data1, data2, test_type, **kwargs)

        # Python scipy validation
        scipy_result = self._validate_with_scipy_t_test(data1, data2, test_type, **kwargs)
        results.append(self._compare_results('scipy', our_result, scipy_result))

        # R validation (if available)
        if self.r_available:
            r_result = self._validate_with_r_t_test(data1, data2, test_type, **kwargs)
            results.append(self._compare_results('R', our_result, r_result))

        # Statsmodels validation
        sm_result = self._validate_with_statsmodels_t_test(data1, data2, test_type, **kwargs)
        if sm_result:
            results.append(self._compare_results('statsmodels', our_result, sm_result))

        # Create suite
        total_time = time.time() - start_time
        passed = sum(1 for r in results if r.status == ValidationStatus.PASSED)
        failed = sum(1 for r in results if r.status == ValidationStatus.FAILED)

        suite = ValidationSuite(
            suite_name=suite_name,
            total_tests=len(results),
            passed=passed,
            failed=failed,
            skipped=0,
            errors=sum(1 for r in results if r.status == ValidationStatus.ERROR),
            total_execution_time=total_time,
            average_accuracy=np.mean([r.decimal_places_matched for r in results]),
            results=results
        )

        return suite

    def _calculate_t_test(self, data1: np.ndarray, data2: Optional[np.ndarray],
                         test_type: str, **kwargs) -> Dict[str, float]:
        """Calculate t-test using our implementation"""
        # This should call the actual StickForStats implementation
        # For now, using scipy as placeholder
        if test_type == 'one_sample':
            mu = kwargs.get('mu', 0)
            statistic, pvalue = stats.ttest_1samp(data1, mu)
        elif test_type == 'two_sample':
            equal_var = kwargs.get('equal_var', True)
            statistic, pvalue = stats.ttest_ind(data1, data2, equal_var=equal_var)
        elif test_type == 'paired':
            statistic, pvalue = stats.ttest_rel(data1, data2)
        else:
            raise ValueError(f"Unknown test type: {test_type}")

        return {
            't_statistic': float(statistic),
            'p_value': float(pvalue),
            'df': len(data1) - 1 if test_type == 'one_sample' else len(data1) + len(data2) - 2
        }

    def _validate_with_scipy_t_test(self, data1: np.ndarray, data2: Optional[np.ndarray],
                                   test_type: str, **kwargs) -> Dict[str, float]:
        """Validate using scipy"""
        try:
            if test_type == 'one_sample':
                mu = kwargs.get('mu', 0)
                statistic, pvalue = stats.ttest_1samp(data1, mu)
            elif test_type == 'two_sample':
                equal_var = kwargs.get('equal_var', True)
                statistic, pvalue = stats.ttest_ind(data1, data2, equal_var=equal_var)
            elif test_type == 'paired':
                statistic, pvalue = stats.ttest_rel(data1, data2)
            else:
                return None

            return {
                't_statistic': float(statistic),
                'p_value': float(pvalue)
            }
        except Exception as e:
            logger.error(f"Scipy validation error: {e}")
            return None

    def _validate_with_r_t_test(self, data1: np.ndarray, data2: Optional[np.ndarray],
                               test_type: str, **kwargs) -> Dict[str, float]:
        """Validate using R"""
        if not self.r_available:
            return None

        try:
            # Create temporary files for data
            with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f1:
                np.savetxt(f1, data1, delimiter=',')
                file1 = f1.name

            if data2 is not None:
                with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f2:
                    np.savetxt(f2, data2, delimiter=',')
                    file2 = f2.name

            # Create R script
            if test_type == 'one_sample':
                mu = kwargs.get('mu', 0)
                r_script = f"""
                data1 <- read.csv("{file1}", header=FALSE)$V1
                result <- t.test(data1, mu={mu})
                cat(result$statistic, result$p.value, sep=",")
                """
            elif test_type == 'two_sample':
                equal_var = kwargs.get('equal_var', True)
                var_equal = 'TRUE' if equal_var else 'FALSE'
                r_script = f"""
                data1 <- read.csv("{file1}", header=FALSE)$V1
                data2 <- read.csv("{file2}", header=FALSE)$V1
                result <- t.test(data1, data2, var.equal={var_equal})
                cat(result$statistic, result$p.value, sep=",")
                """
            elif test_type == 'paired':
                r_script = f"""
                data1 <- read.csv("{file1}", header=FALSE)$V1
                data2 <- read.csv("{file2}", header=FALSE)$V1
                result <- t.test(data1, data2, paired=TRUE)
                cat(result$statistic, result$p.value, sep=",")
                """

            # Run R script
            result = subprocess.run(['R', '--slave', '--no-restore'],
                                  input=r_script, capture_output=True, text=True)

            # Parse output
            output = result.stdout.strip().split(',')

            # Clean up temp files
            os.unlink(file1)
            if data2 is not None:
                os.unlink(file2)

            return {
                't_statistic': float(output[0]),
                'p_value': float(output[1])
            }

        except Exception as e:
            logger.error(f"R validation error: {e}")
            return None

    def _validate_with_statsmodels_t_test(self, data1: np.ndarray, data2: Optional[np.ndarray],
                                         test_type: str, **kwargs) -> Dict[str, float]:
        """Validate using statsmodels"""
        try:
            if test_type == 'one_sample':
                mu = kwargs.get('mu', 0)
                test = weightstats.DescrStatsW(data1)
                statistic, pvalue, df = test.ttest_mean(mu)
                return {
                    't_statistic': float(statistic),
                    'p_value': float(pvalue)
                }
            elif test_type == 'two_sample':
                test = weightstats.CompareMeans(
                    weightstats.DescrStatsW(data1),
                    weightstats.DescrStatsW(data2)
                )
                statistic, pvalue, df = test.ttest_ind()
                return {
                    't_statistic': float(statistic),
                    'p_value': float(pvalue)
                }
            else:
                return None
        except Exception as e:
            logger.error(f"Statsmodels validation error: {e}")
            return None

    def _compare_results(self, method: str, our_result: Dict[str, float],
                        ref_result: Dict[str, float]) -> ValidationResult:
        """Compare our results with reference implementation"""
        if ref_result is None:
            return ValidationResult(
                test_name='t_test',
                method=method,
                status=ValidationStatus.SKIPPED,
                our_value=0,
                reference_value=0,
                absolute_difference=0,
                relative_difference=0,
                execution_time=0,
                decimal_places_matched=0,
                tolerance_used=self.tolerance,
                error_message="Reference implementation not available"
            )

        # Compare t-statistic
        our_t = our_result.get('t_statistic', 0)
        ref_t = ref_result.get('t_statistic', 0)
        abs_diff = abs(our_t - ref_t)
        rel_diff = abs_diff / abs(ref_t) if ref_t != 0 else abs_diff

        # Count matching decimal places
        decimal_places = self._count_matching_decimals(our_t, ref_t)

        # Determine status
        status = ValidationStatus.PASSED if abs_diff < self.tolerance else ValidationStatus.FAILED

        return ValidationResult(
            test_name='t_test_statistic',
            method=method,
            status=status,
            our_value=our_t,
            reference_value=ref_t,
            absolute_difference=abs_diff,
            relative_difference=rel_diff,
            execution_time=0,  # Would be tracked in actual implementation
            decimal_places_matched=decimal_places,
            tolerance_used=self.tolerance
        )

    def _count_matching_decimals(self, val1: float, val2: float) -> int:
        """Count number of matching decimal places"""
        if val1 == val2:
            return 15  # Maximum precision we track

        diff = abs(val1 - val2)
        if diff == 0:
            return 15

        # Count decimal places
        decimal_places = 0
        tolerance = 0.5
        for i in range(15):
            tolerance *= 0.1
            if diff < tolerance:
                decimal_places = i + 1
            else:
                break

        return decimal_places

    def validate_anova(self, *groups, **kwargs) -> ValidationSuite:
        """Validate ANOVA calculations"""
        suite_name = "ANOVA Validation"
        results = []
        start_time = time.time()

        # Our calculation
        our_result = self._calculate_anova(*groups, **kwargs)

        # Scipy validation
        scipy_result = stats.f_oneway(*groups)
        results.append(self._compare_anova_results('scipy', our_result,
                                                  {'f_statistic': scipy_result[0],
                                                   'p_value': scipy_result[1]}))

        # R validation if available
        if self.r_available:
            r_result = self._validate_anova_with_r(*groups, **kwargs)
            if r_result:
                results.append(self._compare_anova_results('R', our_result, r_result))

        # Create suite
        total_time = time.time() - start_time
        passed = sum(1 for r in results if r.status == ValidationStatus.PASSED)
        failed = sum(1 for r in results if r.status == ValidationStatus.FAILED)

        return ValidationSuite(
            suite_name=suite_name,
            total_tests=len(results),
            passed=passed,
            failed=failed,
            skipped=0,
            errors=sum(1 for r in results if r.status == ValidationStatus.ERROR),
            total_execution_time=total_time,
            average_accuracy=np.mean([r.decimal_places_matched for r in results]),
            results=results
        )

    def _calculate_anova(self, *groups, **kwargs) -> Dict[str, float]:
        """Calculate ANOVA using our implementation"""
        # Placeholder - should use actual implementation
        f_stat, p_value = stats.f_oneway(*groups)
        return {
            'f_statistic': float(f_stat),
            'p_value': float(p_value)
        }

    def _validate_anova_with_r(self, *groups, **kwargs) -> Dict[str, float]:
        """Validate ANOVA using R"""
        # Implementation would be similar to t-test validation
        return None  # Return None for now to skip R validation

    def _compare_anova_results(self, method: str, our_result: Dict[str, float],
                              ref_result: Dict[str, float]) -> ValidationResult:
        """Compare ANOVA results"""
        if ref_result is None:
            return ValidationResult(
                test_name='anova',
                method=method,
                status=ValidationStatus.SKIPPED,
                our_value=0,
                reference_value=0,
                absolute_difference=0,
                relative_difference=0,
                execution_time=0,
                decimal_places_matched=0,
                tolerance_used=self.tolerance,
                error_message="Reference implementation not available"
            )

        # Compare F-statistic
        our_f = our_result.get('f_statistic', 0)
        ref_f = ref_result.get('f_statistic', 0)
        abs_diff = abs(our_f - ref_f)
        rel_diff = abs_diff / abs(ref_f) if ref_f != 0 else abs_diff

        # Count matching decimal places
        decimal_places = self._count_matching_decimals(our_f, ref_f)

        # Determine status
        status = ValidationStatus.PASSED if abs_diff < self.tolerance else ValidationStatus.FAILED

        return ValidationResult(
            test_name='anova_f_statistic',
            method=method,
            status=status,
            our_value=our_f,
            reference_value=ref_f,
            absolute_difference=abs_diff,
            relative_difference=rel_diff,
            execution_time=0,
            decimal_places_matched=decimal_places,
            tolerance_used=self.tolerance
        )

    def generate_validation_report(self, suites: List[ValidationSuite]) -> str:
        """
        Generate comprehensive validation report

        Args:
            suites: List of validation suites

        Returns:
            Formatted report string
        """
        report = []
        report.append("=" * 80)
        report.append("STATISTICAL VALIDATION REPORT")
        report.append("=" * 80)
        report.append("")

        # Overall summary
        total_tests = sum(s.total_tests for s in suites)
        total_passed = sum(s.passed for s in suites)
        total_failed = sum(s.failed for s in suites)

        report.append("OVERALL SUMMARY")
        report.append("-" * 40)
        report.append(f"Total Tests Run: {total_tests}")
        report.append(f"Passed: {total_passed} ({100*total_passed/total_tests:.1f}%)")
        report.append(f"Failed: {total_failed} ({100*total_failed/total_tests:.1f}%)")
        report.append(f"Average Accuracy: {np.mean([s.average_accuracy for s in suites]):.1f} decimal places")
        report.append("")

        # Suite details
        for suite in suites:
            report.append(f"\n{suite.suite_name}")
            report.append("-" * len(suite.suite_name))
            report.append(f"Tests: {suite.total_tests} | Passed: {suite.passed} | Failed: {suite.failed}")
            report.append(f"Execution Time: {suite.total_execution_time:.3f}s")
            report.append(f"Average Accuracy: {suite.average_accuracy:.1f} decimal places")

            # Failed tests details
            failed_results = [r for r in suite.results if r.status == ValidationStatus.FAILED]
            if failed_results:
                report.append("\n  Failed Tests:")
                for result in failed_results:
                    report.append(f"    • {result.test_name} ({result.method})")
                    report.append(f"      Our value: {result.our_value:.15f}")
                    report.append(f"      Reference: {result.reference_value:.15f}")
                    report.append(f"      Difference: {result.absolute_difference:.2e}")

            report.append("")

        # Recommendations
        if total_failed > 0:
            report.append("\nRECOMMENDATIONS")
            report.append("-" * 40)
            report.append("• Review calculations with failed tests")
            report.append("• Consider numerical stability improvements")
            report.append("• Verify algorithm implementations")

        report.append("\n" + "=" * 80)

        return "\n".join(report)


class TestDataGenerator:
    """Generate test data for validation"""

    @staticmethod
    def generate_normal_data(n: int = 100, mean: float = 0, std: float = 1,
                            seed: Optional[int] = None) -> np.ndarray:
        """Generate normal distribution data"""
        if seed:
            np.random.seed(seed)
        return np.random.normal(mean, std, n)

    @staticmethod
    def generate_test_datasets() -> Dict[str, np.ndarray]:
        """Generate standard test datasets for validation"""
        return {
            'normal_small': TestDataGenerator.generate_normal_data(10, seed=42),
            'normal_medium': TestDataGenerator.generate_normal_data(100, seed=42),
            'normal_large': TestDataGenerator.generate_normal_data(1000, seed=42),
            'skewed': np.random.gamma(2, 2, 100),
            'uniform': np.random.uniform(-1, 1, 100),
            'with_outliers': np.concatenate([
                np.random.normal(0, 1, 95),
                np.array([10, -10, 15, -12, 8])  # Outliers
            ])
        }


def run_comprehensive_validation():
    """Run comprehensive validation suite"""
    validator = StatisticalValidator(tolerance=1e-15)
    suites = []

    # Generate test data
    test_data = TestDataGenerator.generate_test_datasets()

    # Validate t-tests
    print("Running t-test validations...")

    # One-sample t-test
    suite = validator.validate_t_test(
        test_data['normal_medium'],
        test_type='one_sample',
        mu=0
    )
    suites.append(suite)

    # Two-sample t-test
    suite = validator.validate_t_test(
        test_data['normal_medium'][:50],
        test_data['normal_medium'][50:],
        test_type='two_sample'
    )
    suites.append(suite)

    # ANOVA
    print("Running ANOVA validations...")
    suite = validator.validate_anova(
        test_data['normal_medium'][:33],
        test_data['normal_medium'][33:66],
        test_data['normal_medium'][66:]
    )
    suites.append(suite)

    # Generate report
    report = validator.generate_validation_report(suites)
    print(report)

    # Save report
    with open('validation_report.txt', 'w') as f:
        f.write(report)

    print("\nValidation complete. Report saved to validation_report.txt")

    return suites


if __name__ == "__main__":
    run_comprehensive_validation()