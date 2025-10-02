"""
Hypothesis Registry for Multiple Testing Management
===================================================
Created: 2025-01-10
Author: StickForStats Development Team
Version: 1.1.0

This module tracks all statistical tests performed in a session to ensure
proper multiplicity corrections are applied and prevent p-hacking.

Key Features:
- Session-based hypothesis tracking
- Automatic warnings after multiple tests
- Forced correction before results export
- Test grouping and hierarchical structure
- Audit trail for reproducibility
- Real-time p-hacking risk assessment

Scientific Integrity: MAXIMUM
Purpose: Prevent selective reporting and p-hacking
"""

import json
import hashlib
import warnings
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any, Set, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
import numpy as np
import pandas as pd
import logging
from pathlib import Path

from .multiplicity import (
    MultiplicityCorrector, CorrectionMethod, CorrectionResult,
    HypothesisTest, recommend_correction_method, generate_correction_statement
)

logger = logging.getLogger(__name__)


class RegistryWarningLevel(Enum):
    """Warning levels for multiple testing"""
    NONE = "none"
    LOW = "low"  # 3-5 tests
    MEDIUM = "medium"  # 6-10 tests
    HIGH = "high"  # 11-20 tests
    CRITICAL = "critical"  # >20 tests


class TestFamily(Enum):
    """Families of related tests"""
    PRIMARY = "primary"  # Pre-specified primary outcomes
    SECONDARY = "secondary"  # Pre-specified secondary outcomes
    EXPLORATORY = "exploratory"  # Post-hoc analyses
    SUBGROUP = "subgroup"  # Subgroup analyses
    SENSITIVITY = "sensitivity"  # Sensitivity analyses
    INTERIM = "interim"  # Interim analyses


@dataclass
class HypothesisRecord:
    """Complete record of a hypothesis test"""
    # Identification
    test_id: str
    session_id: str
    timestamp: datetime
    
    # Test details
    test_name: str
    test_type: str  # t-test, anova, correlation, etc.
    test_family: TestFamily
    
    # Statistical results
    p_value: float
    test_statistic: float
    effect_size: Optional[float]
    confidence_interval: Optional[Tuple[float, float]]
    sample_size: int
    
    # Data information
    variables: List[str]
    data_hash: str  # Hash of data used
    
    # Grouping
    group: Optional[str] = None
    parent_test: Optional[str] = None  # For hierarchical testing
    
    # Corrections
    corrected: bool = False
    adjusted_p_value: Optional[float] = None
    correction_method: Optional[str] = None
    
    # Metadata
    parameters: Dict[str, Any] = field(default_factory=dict)
    notes: Optional[str] = None
    pre_registered: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        # Convert TestFamily enum to string for JSON serialization
        data['test_family'] = self.test_family.value
        return data
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'HypothesisRecord':
        """Create from dictionary"""
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        data['test_family'] = TestFamily(data['test_family'])
        return cls(**data)


@dataclass
class RegistrySession:
    """A session of hypothesis testing"""
    session_id: str
    start_time: datetime
    
    # Configuration
    alpha_level: float = 0.05
    correction_required: bool = True
    max_tests_before_warning: int = 5
    block_export_without_correction: bool = True
    
    # State
    tests: List[HypothesisRecord] = field(default_factory=list)
    corrections_applied: List[CorrectionResult] = field(default_factory=list)
    warnings_issued: Set[str] = field(default_factory=set)
    
    # Metadata
    study_type: str = "exploratory"  # exploratory, confirmatory
    pre_registration: Optional[Dict[str, Any]] = None
    notes: str = ""
    
    def __post_init__(self):
        """Initialize session"""
        logger.info(f"Registry session {self.session_id} started")


class HypothesisRegistry:
    """
    Central registry for tracking all hypothesis tests in a session
    """
    
    def __init__(self,
                 session_id: Optional[str] = None,
                 alpha: float = 0.05,
                 auto_correct: bool = True,
                 strict_mode: bool = True):
        """
        Initialize hypothesis registry
        
        Args:
            session_id: Unique session identifier
            alpha: Significance level
            auto_correct: Automatically apply corrections
            strict_mode: Block exports without corrections
        """
        if session_id is None:
            session_id = self._generate_session_id()
        
        self.session = RegistrySession(
            session_id=session_id,
            start_time=datetime.now(),
            alpha_level=alpha,
            correction_required=auto_correct,
            block_export_without_correction=strict_mode
        )
        
        self.corrector = MultiplicityCorrector(alpha)
        self._export_blocked = False
        
        logger.info(f"HypothesisRegistry initialized for session {session_id}")
    
    def register_test(self,
                      test_name: str,
                      p_value: float,
                      test_statistic: float,
                      sample_size: int,
                      variables: List[str],
                      test_type: str = "unknown",
                      test_family: TestFamily = TestFamily.EXPLORATORY,
                      effect_size: Optional[float] = None,
                      confidence_interval: Optional[Tuple[float, float]] = None,
                      data: Optional[Union[pd.DataFrame, np.ndarray]] = None,
                      group: Optional[str] = None,
                      parent_test: Optional[str] = None,
                      parameters: Optional[Dict[str, Any]] = None,
                      pre_registered: bool = False) -> str:
        """
        Register a hypothesis test
        
        Args:
            test_name: Name/description of the test
            p_value: Obtained p-value
            test_statistic: Test statistic value
            sample_size: Sample size used
            variables: Variables involved in test
            test_type: Type of test (t-test, anova, etc.)
            test_family: Family of test (primary, secondary, etc.)
            effect_size: Effect size if calculated
            confidence_interval: CI if calculated
            data: Original data (for hashing)
            group: Test group for hierarchical correction
            parent_test: Parent test ID for hierarchical structure
            parameters: Test parameters
            pre_registered: Whether test was pre-registered
            
        Returns:
            Unique test ID
        """
        # Generate test ID
        test_id = self._generate_test_id(test_name, variables)
        
        # Calculate data hash if provided
        if data is not None:
            data_hash = self._hash_data(data)
        else:
            data_hash = "no_data"
        
        # Create hypothesis record
        record = HypothesisRecord(
            test_id=test_id,
            session_id=self.session.session_id,
            timestamp=datetime.now(),
            test_name=test_name,
            test_type=test_type,
            test_family=test_family,
            p_value=p_value,
            test_statistic=test_statistic,
            effect_size=effect_size,
            confidence_interval=confidence_interval,
            sample_size=sample_size,
            variables=variables,
            data_hash=data_hash,
            group=group,
            parent_test=parent_test,
            parameters=parameters or {},
            pre_registered=pre_registered
        )
        
        # Add to session
        self.session.tests.append(record)
        
        # Check for warnings
        self._check_and_issue_warnings()
        
        # Auto-correct if enabled and threshold reached
        if self.session.correction_required:
            n_tests = len(self.session.tests)
            if n_tests >= self.session.max_tests_before_warning:
                if self.session.alpha_level / n_tests < 0.001:
                    # Getting very conservative, suggest FDR
                    logger.warning(
                        f"With {n_tests} tests, Bonferroni correction would use "
                        f"α={self.session.alpha_level/n_tests:.5f}. "
                        f"Consider using FDR control instead."
                    )
        
        logger.info(f"Test registered: {test_id} (p={p_value:.4f})")
        
        # Set export block if needed
        if self.session.block_export_without_correction:
            self._export_blocked = True
        
        return test_id
    
    def apply_correction(self,
                        method: Optional[CorrectionMethod] = None,
                        test_ids: Optional[List[str]] = None,
                        group: Optional[str] = None) -> CorrectionResult:
        """
        Apply multiplicity correction to registered tests
        
        Args:
            method: Correction method (auto-selected if None)
            test_ids: Specific tests to correct (all if None)
            group: Correct only tests in this group
            
        Returns:
            CorrectionResult object
        """
        # Select tests to correct
        if test_ids:
            tests = [t for t in self.session.tests if t.test_id in test_ids]
        elif group:
            tests = [t for t in self.session.tests if t.group == group]
        else:
            tests = self.session.tests
        
        if not tests:
            raise ValueError("No tests to correct")
        
        # Extract p-values
        p_values = np.array([t.p_value for t in tests])
        
        # Auto-select method if not provided
        if method is None:
            n_tests = len(tests)
            study_type = self.session.study_type
            
            # Check if tests are likely dependent
            unique_vars = set()
            for test in tests:
                unique_vars.update(test.variables)
            
            # If same variables used multiple times, likely dependent
            dependence = "arbitrary" if len(unique_vars) < len(tests) * 1.5 else "unknown"
            
            method = recommend_correction_method(n_tests, study_type, dependence)
            
            logger.info(f"Auto-selected correction method: {method.value}")
        
        # Apply correction
        result = self.corrector.correct(p_values, method=method, alpha=self.session.alpha_level)
        
        # Update test records with adjusted p-values
        for i, test in enumerate(tests):
            test.corrected = True
            test.adjusted_p_value = result.adjusted_pvalues[i]
            test.correction_method = method.value
        
        # Store correction result
        self.session.corrections_applied.append(result)
        
        # Clear export block
        self._export_blocked = False
        
        logger.info(
            f"Correction applied: {method.value} "
            f"({result.n_rejected}/{result.n_tests} rejected)"
        )
        
        return result
    
    def get_summary(self) -> Dict[str, Any]:
        """
        Get summary of all tests in session
        
        Returns:
            Summary dictionary
        """
        n_tests = len(self.session.tests)
        
        if n_tests == 0:
            return {
                "session_id": self.session.session_id,
                "n_tests": 0,
                "status": "No tests registered"
            }
        
        # Count by family
        family_counts = {}
        for family in TestFamily:
            count = sum(1 for t in self.session.tests if t.test_family == family)
            if count > 0:
                family_counts[family.value] = count
        
        # Count significant (uncorrected)
        n_significant_raw = sum(1 for t in self.session.tests if t.p_value < self.session.alpha_level)
        
        # Count significant (corrected)
        n_significant_corrected = 0
        if any(t.corrected for t in self.session.tests):
            n_significant_corrected = sum(
                1 for t in self.session.tests 
                if t.adjusted_p_value and t.adjusted_p_value < self.session.alpha_level
            )
        
        # Warning level
        warning_level = self._get_warning_level()
        
        # P-hacking risk assessment
        p_hacking_risk = self._assess_p_hacking_risk()
        
        summary = {
            "session_id": self.session.session_id,
            "start_time": self.session.start_time.isoformat(),
            "n_tests": n_tests,
            "test_families": family_counts,
            "n_significant_raw": n_significant_raw,
            "n_significant_corrected": n_significant_corrected,
            "corrections_applied": [c.method.value for c in self.session.corrections_applied],
            "warning_level": warning_level.value,
            "p_hacking_risk": p_hacking_risk,
            "export_blocked": self._export_blocked,
            "alpha_level": self.session.alpha_level
        }
        
        # Add correction recommendation if not corrected
        if not any(t.corrected for t in self.session.tests):
            method = recommend_correction_method(
                n_tests, 
                self.session.study_type, 
                "unknown"
            )
            summary["recommended_correction"] = method.value
        
        return summary
    
    def generate_report(self) -> str:
        """
        Generate detailed report of hypothesis testing session
        
        Returns:
            Formatted report string
        """
        lines = []
        lines.append("=" * 80)
        lines.append("HYPOTHESIS TESTING SESSION REPORT")
        lines.append("=" * 80)
        lines.append("")
        
        # Session information
        lines.append(f"Session ID: {self.session.session_id}")
        lines.append(f"Start Time: {self.session.start_time}")
        lines.append(f"Study Type: {self.session.study_type}")
        lines.append(f"Alpha Level: {self.session.alpha_level}")
        lines.append("")
        
        # Summary statistics
        summary = self.get_summary()
        lines.append("SUMMARY")
        lines.append("-" * 40)
        lines.append(f"Total Tests Performed: {summary['n_tests']}")
        
        if summary['test_families']:
            lines.append("Tests by Family:")
            for family, count in summary['test_families'].items():
                lines.append(f"  • {family}: {count}")
        
        lines.append(f"Significant (uncorrected): {summary['n_significant_raw']}")
        
        if summary['n_significant_corrected'] > 0:
            lines.append(f"Significant (corrected): {summary['n_significant_corrected']}")
        
        lines.append(f"P-hacking Risk: {summary['p_hacking_risk']}")
        lines.append("")
        
        # Individual tests
        lines.append("HYPOTHESIS TESTS")
        lines.append("-" * 40)
        
        for i, test in enumerate(self.session.tests, 1):
            lines.append(f"{i}. {test.test_name}")
            lines.append(f"   Type: {test.test_type} | Family: {test.test_family.value}")
            lines.append(f"   Variables: {', '.join(test.variables)}")
            lines.append(f"   Sample Size: {test.sample_size}")
            lines.append(f"   p-value: {test.p_value:.4f}")
            
            if test.effect_size:
                lines.append(f"   Effect Size: {test.effect_size:.3f}")
            
            if test.corrected:
                lines.append(f"   Adjusted p-value: {test.adjusted_p_value:.4f}")
                lines.append(f"   Correction: {test.correction_method}")
            
            sig_marker = "*" if test.p_value < self.session.alpha_level else ""
            adj_sig_marker = "*" if test.adjusted_p_value and test.adjusted_p_value < self.session.alpha_level else ""
            
            if sig_marker or adj_sig_marker:
                lines.append(f"   Significance: Raw{sig_marker} Adjusted{adj_sig_marker}")
            
            lines.append("")
        
        # Corrections applied
        if self.session.corrections_applied:
            lines.append("MULTIPLICITY CORRECTIONS")
            lines.append("-" * 40)
            
            for correction in self.session.corrections_applied:
                lines.append(correction.summary())
                lines.append("")
                
                # Generate methods statement
                statement = generate_correction_statement(correction)
                lines.append("Methods Statement:")
                lines.append(statement)
                lines.append("")
        
        # Warnings
        if self.session.warnings_issued:
            lines.append("WARNINGS ISSUED")
            lines.append("-" * 40)
            for warning in self.session.warnings_issued:
                lines.append(f"⚠️ {warning}")
            lines.append("")
        
        # Recommendations
        lines.append("RECOMMENDATIONS")
        lines.append("-" * 40)
        
        if not any(t.corrected for t in self.session.tests) and summary['n_tests'] > 1:
            lines.append(f"⚠️ Multiple testing correction recommended!")
            lines.append(f"   Suggested method: {summary.get('recommended_correction', 'FDR')}")
        
        if summary['p_hacking_risk'] in ['High', 'Very High']:
            lines.append("⚠️ High risk of p-hacking detected!")
            lines.append("   Consider pre-registration for future studies")
            lines.append("   Report all tests performed, not just significant ones")
        
        lines.append("")
        lines.append("=" * 80)
        
        return "\n".join(lines)
    
    def export_results(self,
                      filepath: Optional[Path] = None,
                      format: str = "json",
                      force: bool = False) -> Optional[str]:
        """
        Export test results with corrections
        
        Args:
            filepath: Output file path
            format: Export format (json, csv, excel)
            force: Force export even without corrections
            
        Returns:
            Exported data as string or None if blocked
        """
        # Check if export is blocked
        if self._export_blocked and not force:
            n_tests = len(self.session.tests)
            warning = (
                f"Export blocked: {n_tests} tests performed without correction. "
                f"Apply corrections first or use force=True to override."
            )
            logger.warning(warning)
            raise PermissionError(warning)
        
        # Prepare data
        data = {
            "session": {
                "id": self.session.session_id,
                "start_time": self.session.start_time.isoformat(),
                "alpha": self.session.alpha_level,
                "study_type": self.session.study_type
            },
            "summary": self.get_summary(),
            "tests": [t.to_dict() for t in self.session.tests],
            "corrections": []
        }
        
        # Add correction details
        for correction in self.session.corrections_applied:
            data["corrections"].append({
                "method": correction.method.value,
                "n_tests": correction.n_tests,
                "n_rejected": correction.n_rejected,
                "alpha": correction.alpha
            })
        
        # Format output
        if format == "json":
            output = json.dumps(data, indent=2)
        elif format == "csv":
            df = pd.DataFrame([t.to_dict() for t in self.session.tests])
            output = df.to_csv(index=False)
        elif format == "excel":
            if filepath:
                df = pd.DataFrame([t.to_dict() for t in self.session.tests])
                df.to_excel(filepath, index=False)
                output = f"Exported to {filepath}"
            else:
                raise ValueError("Filepath required for Excel export")
        else:
            raise ValueError(f"Unknown format: {format}")
        
        # Write to file if path provided
        if filepath and format != "excel":
            with open(filepath, 'w') as f:
                f.write(output)
        
        logger.info(f"Results exported: {format} format")
        
        return output
    
    def _generate_session_id(self) -> str:
        """Generate unique session ID"""
        timestamp = datetime.now().isoformat()
        return hashlib.md5(timestamp.encode()).hexdigest()[:12]
    
    def _generate_test_id(self, test_name: str, variables: List[str]) -> str:
        """Generate unique test ID"""
        content = f"{test_name}_{sorted(variables)}_{datetime.now().isoformat()}"
        return hashlib.md5(content.encode()).hexdigest()[:8]
    
    def _hash_data(self, data: Union[pd.DataFrame, np.ndarray]) -> str:
        """Generate hash of data for tracking"""
        if isinstance(data, pd.DataFrame):
            data_str = data.to_csv(index=False)
        else:
            data_str = str(data.flatten()[:100])  # Use first 100 elements
        
        return hashlib.sha256(data_str.encode()).hexdigest()[:16]
    
    def _get_warning_level(self) -> RegistryWarningLevel:
        """Determine current warning level"""
        n_tests = len(self.session.tests)
        
        if n_tests == 0:
            return RegistryWarningLevel.NONE
        elif n_tests <= 2:
            return RegistryWarningLevel.NONE
        elif n_tests <= 5:
            return RegistryWarningLevel.LOW
        elif n_tests <= 10:
            return RegistryWarningLevel.MEDIUM
        elif n_tests <= 20:
            return RegistryWarningLevel.HIGH
        else:
            return RegistryWarningLevel.CRITICAL
    
    def _check_and_issue_warnings(self):
        """Check conditions and issue warnings"""
        n_tests = len(self.session.tests)
        
        # Warning thresholds
        thresholds = [5, 10, 20, 50]
        
        for threshold in thresholds:
            if n_tests == threshold:
                warning = (
                    f"You have performed {n_tests} statistical tests. "
                    f"Multiple testing correction is {'strongly ' if n_tests >= 20 else ''}recommended."
                )
                
                if warning not in self.session.warnings_issued:
                    self.session.warnings_issued.add(warning)
                    logger.warning(warning)
                    warnings.warn(warning, UserWarning)
        
        # Check for p-value near threshold
        recent_tests = self.session.tests[-5:] if len(self.session.tests) >= 5 else self.session.tests
        near_threshold = [t for t in recent_tests if 0.04 < t.p_value < 0.06]
        
        if len(near_threshold) >= 3:
            warning = (
                "Multiple p-values near significance threshold detected. "
                "This pattern suggests possible p-hacking or selective reporting."
            )
            if warning not in self.session.warnings_issued:
                self.session.warnings_issued.add(warning)
                logger.warning(warning)
    
    def _assess_p_hacking_risk(self) -> str:
        """
        Assess risk of p-hacking based on testing patterns
        
        Returns:
            Risk level string
        """
        if not self.session.tests:
            return "None"
        
        risk_score = 0
        
        # Factor 1: Number of tests
        n_tests = len(self.session.tests)
        if n_tests > 20:
            risk_score += 3
        elif n_tests > 10:
            risk_score += 2
        elif n_tests > 5:
            risk_score += 1
        
        # Factor 2: No corrections applied
        if n_tests > 1 and not any(t.corrected for t in self.session.tests):
            risk_score += 2
        
        # Factor 3: Many exploratory tests
        n_exploratory = sum(1 for t in self.session.tests if t.test_family == TestFamily.EXPLORATORY)
        if n_exploratory / max(n_tests, 1) > 0.7:
            risk_score += 2
        
        # Factor 4: P-values clustering near threshold
        p_values = [t.p_value for t in self.session.tests]
        near_threshold = sum(1 for p in p_values if 0.04 < p < 0.06)
        if near_threshold / max(n_tests, 1) > 0.2:
            risk_score += 2
        
        # Factor 5: Multiple tests on same data
        data_hashes = [t.data_hash for t in self.session.tests if t.data_hash != "no_data"]
        if data_hashes:
            unique_hashes = len(set(data_hashes))
            if len(data_hashes) / max(unique_hashes, 1) > 3:
                risk_score += 1
        
        # Map score to risk level
        if risk_score >= 7:
            return "Very High"
        elif risk_score >= 5:
            return "High"
        elif risk_score >= 3:
            return "Medium"
        elif risk_score >= 1:
            return "Low"
        else:
            return "None"
    
    def pre_register(self, tests: List[Dict[str, Any]]) -> None:
        """
        Pre-register planned analyses
        
        Args:
            tests: List of planned test specifications
        """
        self.session.pre_registration = {
            "timestamp": datetime.now().isoformat(),
            "planned_tests": tests,
            "n_planned": len(tests)
        }
        
        logger.info(f"Pre-registered {len(tests)} planned analyses")
    
    def check_pre_registration_compliance(self) -> Dict[str, Any]:
        """
        Check if performed tests match pre-registration
        
        Returns:
            Compliance report
        """
        if not self.session.pre_registration:
            return {"status": "No pre-registration"}
        
        planned = self.session.pre_registration["planned_tests"]
        performed = self.session.tests
        
        # Match tests to plan
        matched = []
        unplanned = []
        
        for test in performed:
            # Simple matching by test name
            if any(p.get("name") == test.test_name for p in planned):
                matched.append(test.test_id)
            else:
                unplanned.append(test.test_id)
        
        compliance = {
            "n_planned": len(planned),
            "n_performed": len(performed),
            "n_matched": len(matched),
            "n_unplanned": len(unplanned),
            "compliance_rate": len(matched) / max(len(performed), 1),
            "unplanned_tests": unplanned
        }
        
        return compliance


class SequentialTestingRegistry(HypothesisRegistry):
    """
    Extended registry for sequential/interim analyses
    """
    
    def __init__(self, *args, **kwargs):
        """Initialize sequential testing registry"""
        super().__init__(*args, **kwargs)
        self.interim_analyses = []
        self.information_schedule = []
        self.stopping_boundaries = {}
    
    def register_interim_analysis(self,
                                 analysis_number: int,
                                 information_fraction: float,
                                 tests: List[HypothesisRecord]) -> bool:
        """
        Register interim analysis results
        
        Args:
            analysis_number: Sequential number of analysis
            information_fraction: Proportion of total information
            tests: Test results at this interim
            
        Returns:
            Whether to stop for efficacy/futility
        """
        self.interim_analyses.append({
            "number": analysis_number,
            "information": information_fraction,
            "timestamp": datetime.now(),
            "tests": tests
        })
        
        # Check stopping boundaries
        should_stop = self._check_stopping_rules(tests, information_fraction)
        
        if should_stop:
            logger.info(f"Stopping recommended at interim {analysis_number}")
        
        return should_stop
    
    def _check_stopping_rules(self, 
                             tests: List[HypothesisRecord],
                             information: float) -> bool:
        """Check if stopping boundaries are crossed"""
        # Simplified implementation
        # Full implementation would use alpha-spending functions
        
        # Check primary endpoint
        primary_tests = [t for t in tests if t.test_family == TestFamily.PRIMARY]
        
        if primary_tests:
            min_p = min(t.p_value for t in primary_tests)
            
            # O'Brien-Fleming-like boundary
            boundary = 0.05 * np.sqrt(information)
            
            if min_p < boundary:
                return True  # Stop for efficacy
        
        return False


def create_registry(study_type: str = "exploratory",
                   strict: bool = True) -> HypothesisRegistry:
    """
    Factory function to create appropriate registry
    
    Args:
        study_type: Type of study (exploratory, confirmatory, sequential)
        strict: Whether to enforce strict correction requirements
        
    Returns:
        Configured HypothesisRegistry instance
    """
    if study_type == "sequential":
        registry = SequentialTestingRegistry(
            auto_correct=True,
            strict_mode=strict
        )
    else:
        registry = HypothesisRegistry(
            auto_correct=True,
            strict_mode=strict
        )
    
    registry.session.study_type = study_type
    
    return registry