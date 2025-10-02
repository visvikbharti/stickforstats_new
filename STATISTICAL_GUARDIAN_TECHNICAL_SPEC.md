# 🛡️ STATISTICAL GUARDIAN - TECHNICAL SPECIFICATION
## Complete Implementation Guide for the Revolutionary Protection System
### Version 1.0 | Date: September 23, 2025

---

## 📋 TABLE OF CONTENTS

1. [System Overview](#system-overview)
2. [Guardian Core Engine](#guardian-core)
3. [Assumption Validators](#assumption-validators)
4. [Violation Detection Algorithms](#violation-detection)
5. [Alternative Recommendation Engine](#recommendation-engine)
6. [Visual Evidence Generation](#visual-evidence)
7. [Education System](#education-system)
8. [Audit Trail System](#audit-trail)
9. [Implementation Code](#implementation-code)
10. [Testing Framework](#testing-framework)

---

## 🎯 SYSTEM OVERVIEW {#system-overview}

### The Guardian Philosophy
```python
"""
The Statistical Guardian is not just a validator - it's a teacher, protector,
and guide that makes statistical malpractice impossible while educating users
on proper statistical methodology.
"""

GUARDIAN_PRINCIPLES = {
    "MANDATORY": "Cannot be bypassed or disabled",
    "EDUCATIONAL": "Explains why, not just what",
    "PREVENTIVE": "Stops errors before they happen",
    "TRANSPARENT": "Shows all evidence and reasoning",
    "CONSTRUCTIVE": "Always provides alternatives"
}
```

### Architecture Overview
```
User Request → Guardian Gate → Validation Engine → Decision Point
                                        ↓                ↓
                              Visual Evidence    Block OR Proceed
                                        ↓                ↓
                              Education Module   Alternative OR Execute
```

---

## 🔧 GUARDIAN CORE ENGINE {#guardian-core}

### Main Guardian Class

```python
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from enum import Enum
import logging
from datetime import datetime

class ViolationSeverity(Enum):
    """Severity levels for assumption violations"""
    CRITICAL = "critical"  # Must block analysis
    MAJOR = "major"        # Should block, but can override with acknowledgment
    MINOR = "minor"        # Warning only
    INFO = "info"          # Informational

@dataclass
class AssumptionResult:
    """Result of an assumption check"""
    assumption_name: str
    passed: bool
    severity: ViolationSeverity
    p_value: Optional[float]
    test_statistic: Optional[float]
    visual_evidence: Dict[str, Any]
    explanation: str
    recommendations: List[str]
    educational_content: str

class StatisticalGuardian:
    """
    The core Guardian engine that protects against statistical malpractice
    """

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or self._default_config()
        self.logger = logging.getLogger(__name__)
        self.validators = self._initialize_validators()
        self.test_requirements = self._define_test_requirements()
        self.education_engine = EducationEngine()
        self.visual_generator = VisualEvidenceGenerator()
        self.audit_logger = AuditLogger()

    def _default_config(self) -> Dict:
        """Default Guardian configuration"""
        return {
            'strict_mode': True,  # Cannot bypass critical violations
            'education_level': 'comprehensive',  # How much to explain
            'visual_evidence': True,  # Generate plots
            'audit_logging': True,  # Log all decisions
            'p_value_threshold': 0.05,
            'min_sample_size': {
                't_test': 5,
                'anova': 3,
                'correlation': 10,
                'regression': 20,
                'chi_square': 5
            }
        }

    def _define_test_requirements(self) -> Dict:
        """Define which assumptions each test requires"""
        return {
            't_test_independent': {
                'required': ['normality', 'equal_variance', 'independence'],
                'recommended': ['outliers', 'sample_size']
            },
            't_test_paired': {
                'required': ['normality', 'independence'],
                'recommended': ['outliers']
            },
            'anova_oneway': {
                'required': ['normality', 'equal_variance', 'independence'],
                'recommended': ['outliers', 'sample_size']
            },
            'anova_twoway': {
                'required': ['normality', 'equal_variance', 'independence', 'no_interaction'],
                'recommended': ['outliers', 'balanced_design']
            },
            'pearson_correlation': {
                'required': ['normality', 'linearity'],
                'recommended': ['outliers', 'homoscedasticity']
            },
            'spearman_correlation': {
                'required': ['monotonic'],
                'recommended': ['outliers']
            },
            'linear_regression': {
                'required': ['normality_residuals', 'linearity', 'independence', 'homoscedasticity'],
                'recommended': ['outliers', 'multicollinearity']
            },
            'logistic_regression': {
                'required': ['independence', 'linearity_logit'],
                'recommended': ['multicollinearity', 'sample_size']
            },
            'chi_square': {
                'required': ['independence', 'expected_frequency'],
                'recommended': ['sample_size']
            },
            'mann_whitney_u': {
                'required': ['independence'],
                'recommended': ['similar_shape']
            },
            'kruskal_wallis': {
                'required': ['independence'],
                'recommended': ['similar_shape']
            },
            'wilcoxon_signed_rank': {
                'required': ['independence', 'symmetry'],
                'recommended': []
            }
        }

    def guard_analysis(self,
                      data: Any,
                      test_type: str,
                      alpha: float = 0.05,
                      override_token: Optional[str] = None) -> 'GuardianDecision':
        """
        Main Guardian entry point - validates before allowing analysis

        Args:
            data: The data to analyze
            test_type: Type of statistical test requested
            alpha: Significance level
            override_token: Token from user acknowledging violations (for MAJOR only)

        Returns:
            GuardianDecision object with verdict and details
        """

        # Log the request
        request_id = self.audit_logger.log_request(test_type, data)

        # Get test requirements
        if test_type not in self.test_requirements:
            raise ValueError(f"Unknown test type: {test_type}")

        requirements = self.test_requirements[test_type]

        # Check all assumptions
        violations = []
        warnings = []
        evidence = {}

        for assumption in requirements['required']:
            result = self._check_assumption(assumption, data, test_type)
            evidence[assumption] = result

            if not result.passed:
                if result.severity == ViolationSeverity.CRITICAL:
                    violations.append(result)
                elif result.severity == ViolationSeverity.MAJOR:
                    if not override_token:
                        violations.append(result)
                    else:
                        warnings.append(result)

        # Check recommended assumptions
        for assumption in requirements.get('recommended', []):
            result = self._check_assumption(assumption, data, test_type)
            evidence[assumption] = result

            if not result.passed:
                warnings.append(result)

        # Make decision
        if violations:
            decision = self._block_analysis(
                violations=violations,
                warnings=warnings,
                evidence=evidence,
                test_type=test_type,
                data=data
            )
        else:
            decision = self._approve_analysis(
                warnings=warnings,
                evidence=evidence,
                test_type=test_type
            )

        # Log the decision
        self.audit_logger.log_decision(request_id, decision)

        return decision

    def _check_assumption(self,
                         assumption: str,
                         data: Any,
                         test_type: str) -> AssumptionResult:
        """Check a specific assumption"""

        validator = self.validators.get(assumption)
        if not validator:
            raise ValueError(f"No validator for assumption: {assumption}")

        # Run the validation
        result = validator.validate(data, test_type)

        # Generate visual evidence
        if self.config['visual_evidence']:
            result.visual_evidence = self.visual_generator.generate(
                assumption, data, result
            )

        # Add educational content
        if self.config['education_level'] != 'none':
            result.educational_content = self.education_engine.explain(
                assumption, result, test_type
            )

        return result

    def _block_analysis(self, **kwargs) -> 'GuardianDecision':
        """Create a blocking decision with alternatives"""

        alternatives = self._recommend_alternatives(
            kwargs['violations'],
            kwargs['test_type'],
            kwargs['data']
        )

        return GuardianDecision(
            allowed=False,
            test_type=kwargs['test_type'],
            violations=kwargs['violations'],
            warnings=kwargs.get('warnings', []),
            alternatives=alternatives,
            evidence=kwargs['evidence'],
            education=self._create_education_package(kwargs['violations']),
            override_possible=(
                all(v.severity == ViolationSeverity.MAJOR
                    for v in kwargs['violations'])
            )
        )

    def _approve_analysis(self, **kwargs) -> 'GuardianDecision':
        """Create an approval decision"""

        return GuardianDecision(
            allowed=True,
            test_type=kwargs['test_type'],
            violations=[],
            warnings=kwargs.get('warnings', []),
            alternatives=[],
            evidence=kwargs['evidence'],
            education=None,
            certification=self._generate_certification(kwargs['test_type'])
        )
```

---

## 🔍 ASSUMPTION VALIDATORS {#assumption-validators}

### Normality Validator

```python
from scipy import stats
import numpy as np

class NormalityValidator:
    """Validates normality assumption using multiple methods"""

    def __init__(self, alpha: float = 0.05):
        self.alpha = alpha
        self.methods = {
            'shapiro_wilk': self._shapiro_wilk,
            'anderson_darling': self._anderson_darling,
            'dagostino_pearson': self._dagostino_pearson,
            'jarque_bera': self._jarque_bera
        }

    def validate(self, data: np.ndarray, context: str) -> AssumptionResult:
        """
        Comprehensive normality check using consensus approach
        """

        # Flatten if needed
        if data.ndim > 1:
            data = data.flatten()

        # Remove NaN values
        data = data[~np.isnan(data)]

        # Check sample size
        n = len(data)
        if n < 3:
            return AssumptionResult(
                assumption_name="normality",
                passed=False,
                severity=ViolationSeverity.CRITICAL,
                p_value=None,
                test_statistic=None,
                visual_evidence={},
                explanation="Sample size too small for normality testing",
                recommendations=["Collect more data (n >= 30 recommended)"],
                educational_content="Normality tests require at least 3 observations"
            )

        # Run multiple tests
        results = {}
        for method_name, method in self.methods.items():
            try:
                if n <= 5000 or method_name == 'shapiro_wilk':  # Shapiro-Wilk for smaller samples
                    results[method_name] = method(data)
            except:
                continue

        # Consensus decision
        passed_count = sum(1 for r in results.values() if r['p_value'] > self.alpha)
        total_count = len(results)

        # Check for multimodality (more important than normality tests)
        modality = self._check_modality(data)

        if modality['n_modes'] > 1:
            return AssumptionResult(
                assumption_name="normality",
                passed=False,
                severity=ViolationSeverity.CRITICAL,
                p_value=min(r['p_value'] for r in results.values()),
                test_statistic=None,
                visual_evidence={'modality': modality},
                explanation=f"Data shows {modality['n_modes']} modes (peaks). "
                           f"Normal distribution has only one peak.",
                recommendations=[
                    "Use non-parametric tests (e.g., Mann-Whitney U instead of t-test)",
                    "Consider transformation (log, square root)",
                    "Investigate subgroups in your data"
                ],
                educational_content=self._get_multimodal_education()
            )

        # Regular normality decision
        consensus_passed = passed_count > total_count / 2

        if consensus_passed:
            severity = None
        elif n < 30:
            severity = ViolationSeverity.MAJOR
        else:
            severity = ViolationSeverity.CRITICAL

        return AssumptionResult(
            assumption_name="normality",
            passed=consensus_passed,
            severity=severity if not consensus_passed else None,
            p_value=np.mean([r['p_value'] for r in results.values()]),
            test_statistic=None,
            visual_evidence={'test_results': results},
            explanation=self._create_explanation(results, consensus_passed),
            recommendations=self._get_recommendations(consensus_passed, n),
            educational_content=self._get_education_content()
        )

    def _shapiro_wilk(self, data: np.ndarray) -> Dict:
        """Shapiro-Wilk test for normality"""
        statistic, p_value = stats.shapiro(data)
        return {
            'method': 'Shapiro-Wilk',
            'statistic': statistic,
            'p_value': p_value,
            'reject_normality': p_value < self.alpha
        }

    def _check_modality(self, data: np.ndarray) -> Dict:
        """Detect multimodality using kernel density estimation"""
        from scipy.signal import find_peaks
        from sklearn.neighbors import KernelDensity

        # Create KDE
        kde = KernelDensity(kernel='gaussian', bandwidth='scott')
        kde.fit(data.reshape(-1, 1))

        # Generate smooth curve
        x_range = np.linspace(data.min(), data.max(), 1000)
        log_density = kde.score_samples(x_range.reshape(-1, 1))
        density = np.exp(log_density)

        # Find peaks
        peaks, properties = find_peaks(density, height=0.01 * density.max())

        return {
            'n_modes': len(peaks),
            'peak_locations': x_range[peaks],
            'peak_heights': density[peaks],
            'kde_curve': (x_range, density)
        }

    def _get_multimodal_education(self) -> str:
        return """
        🎓 MULTIMODAL DISTRIBUTION DETECTED

        Your data shows multiple peaks (modes), which violates the normality assumption.
        This often indicates:

        1. **Mixed Populations**: Your sample may contain distinct subgroups
           Example: Measuring height in a mixed adult/child population

        2. **Measurement Issues**: Different measurement methods or instruments
           Example: Two different labs with systematic differences

        3. **Real Phenomenon**: The underlying process truly has multiple states
           Example: Gene expression with on/off states

        **Why This Matters for Statistics:**
        - T-tests assume a single, bell-shaped distribution
        - Mean and standard deviation don't represent multimodal data well
        - P-values will be unreliable

        **What To Do:**
        1. Investigate why you have multiple peaks
        2. Consider analyzing subgroups separately
        3. Use non-parametric alternatives
        4. Report the multimodality in your findings
        """
```

### Variance Homogeneity Validator

```python
class VarianceHomogeneityValidator:
    """Validates equal variance assumption"""

    def validate(self, groups: List[np.ndarray], context: str) -> AssumptionResult:
        """Check for equal variances across groups"""

        # Clean data
        clean_groups = [g[~np.isnan(g)] for g in groups]

        # Multiple tests for robustness
        results = {
            'levene': self._levene_test(clean_groups),
            'bartlett': self._bartlett_test(clean_groups),
            'fligner': self._fligner_test(clean_groups)
        }

        # Consensus approach
        passed = sum(r['p_value'] > 0.05 for r in results.values()) >= 2

        # Calculate variance ratio
        variances = [np.var(g, ddof=1) for g in clean_groups]
        max_var = max(variances)
        min_var = min(variances) if min(variances) > 0 else 1e-10
        var_ratio = max_var / min_var

        # Determine severity
        if not passed:
            if var_ratio > 4:  # Rule of thumb: ratio > 4 is problematic
                severity = ViolationSeverity.CRITICAL
            else:
                severity = ViolationSeverity.MAJOR
        else:
            severity = None

        return AssumptionResult(
            assumption_name="equal_variance",
            passed=passed,
            severity=severity,
            p_value=np.mean([r['p_value'] for r in results.values()]),
            test_statistic=var_ratio,
            visual_evidence={'variance_ratio': var_ratio, 'tests': results},
            explanation=self._create_explanation(var_ratio, results, passed),
            recommendations=self._get_recommendations(passed, var_ratio),
            educational_content=self._get_education()
        )

    def _levene_test(self, groups: List[np.ndarray]) -> Dict:
        """Levene's test - robust to non-normality"""
        statistic, p_value = stats.levene(*groups, center='median')
        return {
            'method': "Levene's Test",
            'statistic': statistic,
            'p_value': p_value
        }
```

---

## 🎯 VIOLATION DETECTION ALGORITHMS {#violation-detection}

### Multimodality Detection

```python
class ModalityDetector:
    """Detects uni/bi/multi-modal distributions"""

    def detect(self, data: np.ndarray) -> Dict:
        """
        Comprehensive modality detection using multiple methods
        """

        results = {
            'hartigan_dip': self._hartigan_dip_test(data),
            'silverman': self._silverman_test(data),
            'kde_peaks': self._kde_peak_detection(data),
            'em_clustering': self._em_clustering(data)
        }

        # Consensus on number of modes
        n_modes_estimates = [r['n_modes'] for r in results.values()]
        consensus_modes = int(np.median(n_modes_estimates))

        return {
            'n_modes': consensus_modes,
            'confidence': self._calculate_confidence(results),
            'methods': results,
            'interpretation': self._interpret_modality(consensus_modes)
        }

    def _hartigan_dip_test(self, data: np.ndarray) -> Dict:
        """
        Hartigan's dip test for unimodality
        Returns p-value; small p-value indicates multimodality
        """
        from diptest import diptest

        dip_statistic, p_value = diptest(data)

        return {
            'method': "Hartigan's Dip Test",
            'statistic': dip_statistic,
            'p_value': p_value,
            'n_modes': 1 if p_value > 0.05 else 2,  # Conservative estimate
            'interpretation': 'Unimodal' if p_value > 0.05 else 'Multimodal'
        }

    def _kde_peak_detection(self, data: np.ndarray) -> Dict:
        """Find peaks in kernel density estimate"""
        from scipy.signal import find_peaks
        from sklearn.neighbors import KernelDensity

        # Optimal bandwidth using Silverman's rule
        n = len(data)
        std = np.std(data)
        bandwidth = 1.06 * std * n**(-1/5)

        # Fit KDE
        kde = KernelDensity(kernel='gaussian', bandwidth=bandwidth)
        kde.fit(data.reshape(-1, 1))

        # Evaluate on fine grid
        x_grid = np.linspace(data.min(), data.max(), 1000)
        log_density = kde.score_samples(x_grid.reshape(-1, 1))
        density = np.exp(log_density)

        # Find peaks
        peaks, properties = find_peaks(
            density,
            height=0.01 * density.max(),  # At least 1% of max height
            distance=len(x_grid) // 20    # Minimum separation
        )

        return {
            'method': 'KDE Peak Detection',
            'n_modes': len(peaks),
            'peak_locations': x_grid[peaks],
            'peak_prominences': properties.get('peak_heights', []),
            'bandwidth_used': bandwidth
        }
```

### Outlier Detection System

```python
class OutlierDetector:
    """Comprehensive outlier detection"""

    def detect(self, data: np.ndarray, method: str = 'ensemble') -> Dict:
        """
        Detect outliers using multiple methods
        """

        methods = {
            'iqr': self._iqr_method(data),
            'zscore': self._zscore_method(data),
            'isolation_forest': self._isolation_forest(data),
            'local_outlier_factor': self._lof_method(data),
            'dbscan': self._dbscan_method(data)
        }

        if method == 'ensemble':
            # Ensemble approach - outlier if flagged by majority
            outlier_votes = np.zeros(len(data))
            for result in methods.values():
                outlier_votes += result['outlier_mask'].astype(int)

            consensus_outliers = outlier_votes > len(methods) / 2

            return {
                'outlier_mask': consensus_outliers,
                'n_outliers': consensus_outliers.sum(),
                'outlier_indices': np.where(consensus_outliers)[0],
                'methods_agree': outlier_votes / len(methods),
                'individual_methods': methods
            }
        else:
            return methods[method]

    def _iqr_method(self, data: np.ndarray, multiplier: float = 1.5) -> Dict:
        """Interquartile range method"""
        Q1 = np.percentile(data, 25)
        Q3 = np.percentile(data, 75)
        IQR = Q3 - Q1

        lower_bound = Q1 - multiplier * IQR
        upper_bound = Q3 + multiplier * IQR

        outliers = (data < lower_bound) | (data > upper_bound)

        return {
            'method': 'IQR',
            'outlier_mask': outliers,
            'bounds': (lower_bound, upper_bound),
            'n_outliers': outliers.sum()
        }
```

---

## 🔄 ALTERNATIVE RECOMMENDATION ENGINE {#recommendation-engine}

```python
class AlternativeRecommender:
    """Intelligent recommendation system for alternative tests"""

    def __init__(self):
        self.recommendation_map = self._build_recommendation_map()
        self.test_descriptions = self._load_test_descriptions()

    def recommend(self,
                  violations: List[AssumptionResult],
                  original_test: str,
                  data_characteristics: Dict) -> List[Dict]:
        """
        Recommend alternative tests based on violations
        """

        # Identify key violations
        violation_types = {v.assumption_name for v in violations}

        # Get base recommendations
        alternatives = self._get_base_alternatives(
            original_test,
            violation_types
        )

        # Rank by appropriateness
        ranked = self._rank_alternatives(
            alternatives,
            data_characteristics,
            violations
        )

        # Add explanations
        recommendations = []
        for alt in ranked[:3]:  # Top 3 recommendations
            recommendations.append({
                'test_name': alt['test'],
                'confidence': alt['score'],
                'why_suitable': self._explain_suitability(alt, violations),
                'how_to_interpret': self._interpretation_guide(alt['test']),
                'assumptions': self._list_assumptions(alt['test']),
                'r_code': self._generate_r_code(alt['test'], data_characteristics),
                'python_code': self._generate_python_code(alt['test'], data_characteristics)
            })

        return recommendations

    def _build_recommendation_map(self) -> Dict:
        """Map violations to alternative tests"""
        return {
            't_test_independent': {
                'normality': [
                    {'test': 'mann_whitney_u', 'robustness': 'high'},
                    {'test': 'permutation_test', 'robustness': 'high'},
                    {'test': 'bootstrap_t', 'robustness': 'medium'},
                    {'test': 'welch_t_test', 'robustness': 'medium'}
                ],
                'equal_variance': [
                    {'test': 'welch_t_test', 'robustness': 'high'},
                    {'test': 'mann_whitney_u', 'robustness': 'high'}
                ],
                'normality,equal_variance': [
                    {'test': 'mann_whitney_u', 'robustness': 'high'},
                    {'test': 'permutation_test', 'robustness': 'high'}
                ]
            },
            'anova_oneway': {
                'normality': [
                    {'test': 'kruskal_wallis', 'robustness': 'high'},
                    {'test': 'permutation_anova', 'robustness': 'high'},
                    {'test': 'welch_anova', 'robustness': 'medium'}
                ],
                'equal_variance': [
                    {'test': 'welch_anova', 'robustness': 'high'},
                    {'test': 'brown_forsythe', 'robustness': 'high'}
                ]
            },
            'pearson_correlation': {
                'normality': [
                    {'test': 'spearman_correlation', 'robustness': 'high'},
                    {'test': 'kendall_tau', 'robustness': 'high'},
                    {'test': 'distance_correlation', 'robustness': 'medium'}
                ],
                'linearity': [
                    {'test': 'spearman_correlation', 'robustness': 'high'},
                    {'test': 'mutual_information', 'robustness': 'medium'}
                ]
            }
        }

    def _explain_suitability(self, alternative: Dict, violations: List) -> str:
        """Explain why this alternative is suitable"""

        explanations = {
            'mann_whitney_u': """
            ✓ No normality assumption required
            ✓ Works with ordinal or continuous data
            ✓ Robust to outliers
            ✓ Tests whether distributions differ in location
            """,
            'kruskal_wallis': """
            ✓ Non-parametric alternative to one-way ANOVA
            ✓ No normality assumption
            ✓ Works with ordinal data
            ✓ Tests whether samples come from same distribution
            """,
            'spearman_correlation': """
            ✓ No normality required
            ✓ Measures monotonic relationships (not just linear)
            ✓ Robust to outliers
            ✓ Works with ordinal data
            """,
            'welch_t_test': """
            ✓ No equal variance assumption
            ✓ More robust than standard t-test
            ✓ Maintains good power
            ✓ Widely accepted alternative
            """
        }

        return explanations.get(alternative['test'], "Robust alternative")
```

---

## 📊 VISUAL EVIDENCE GENERATION {#visual-evidence}

```python
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64

class VisualEvidenceGenerator:
    """Generate visual evidence for assumption violations"""

    def __init__(self):
        self.style_config = {
            'figure.figsize': (10, 6),
            'font.size': 11,
            'axes.labelsize': 12,
            'axes.titlesize': 14
        }
        plt.rcParams.update(self.style_config)

    def generate(self,
                 assumption: str,
                 data: Any,
                 result: AssumptionResult) -> Dict:
        """Generate appropriate visualizations for the assumption"""

        generators = {
            'normality': self._normality_plots,
            'equal_variance': self._variance_plots,
            'linearity': self._linearity_plots,
            'outliers': self._outlier_plots,
            'independence': self._independence_plots
        }

        generator = generators.get(assumption)
        if not generator:
            return {}

        return generator(data, result)

    def _normality_plots(self, data: np.ndarray, result: AssumptionResult) -> Dict:
        """Generate normality diagnostic plots"""

        fig, axes = plt.subplots(2, 3, figsize=(15, 10))

        # 1. Histogram with normal overlay
        ax = axes[0, 0]
        ax.hist(data, bins=30, density=True, alpha=0.7, color='blue', edgecolor='black')

        # Add normal distribution overlay
        mu, sigma = np.mean(data), np.std(data)
        x = np.linspace(data.min(), data.max(), 100)
        ax.plot(x, stats.norm.pdf(x, mu, sigma), 'r-', linewidth=2, label='Normal fit')
        ax.set_title('Histogram with Normal Overlay')
        ax.set_xlabel('Value')
        ax.set_ylabel('Density')
        ax.legend()

        # 2. Q-Q plot
        ax = axes[0, 1]
        stats.probplot(data, dist="norm", plot=ax)
        ax.set_title('Q-Q Plot')
        ax.grid(True, alpha=0.3)

        # Add interpretation text
        if not result.passed:
            ax.text(0.05, 0.95, 'Deviates from diagonal\n→ Not normal',
                   transform=ax.transAxes,
                   bbox=dict(boxstyle='round', facecolor='red', alpha=0.2),
                   verticalalignment='top')

        # 3. KDE plot with potential multimodality
        ax = axes[0, 2]
        from sklearn.neighbors import KernelDensity

        kde = KernelDensity(kernel='gaussian', bandwidth='scott')
        kde.fit(data.reshape(-1, 1))
        x_range = np.linspace(data.min(), data.max(), 1000)
        density = np.exp(kde.score_samples(x_range.reshape(-1, 1)))

        ax.plot(x_range, density, 'b-', linewidth=2)
        ax.fill_between(x_range, density, alpha=0.3)
        ax.set_title('Kernel Density Estimate')
        ax.set_xlabel('Value')
        ax.set_ylabel('Density')

        # Mark peaks if multimodal
        if 'modality' in result.visual_evidence:
            modality = result.visual_evidence['modality']
            if modality['n_modes'] > 1:
                ax.scatter(modality['peak_locations'],
                          modality['peak_heights'],
                          color='red', s=100, zorder=5)
                ax.set_title(f'KDE - {modality["n_modes"]} Modes Detected!')

        # 4. Box plot
        ax = axes[1, 0]
        box = ax.boxplot(data, vert=True, patch_artist=True)
        box['boxes'][0].set_facecolor('lightblue')
        ax.set_title('Box Plot')
        ax.set_ylabel('Value')
        ax.grid(True, alpha=0.3)

        # 5. P-P plot
        ax = axes[1, 1]
        sorted_data = np.sort(data)
        n = len(sorted_data)
        theoretical_quantiles = stats.norm.cdf(sorted_data, mu, sigma)
        empirical_quantiles = np.arange(1, n+1) / n

        ax.plot(theoretical_quantiles, empirical_quantiles, 'bo', alpha=0.5)
        ax.plot([0, 1], [0, 1], 'r--', linewidth=2)
        ax.set_title('P-P Plot')
        ax.set_xlabel('Theoretical Cumulative Probability')
        ax.set_ylabel('Empirical Cumulative Probability')
        ax.grid(True, alpha=0.3)

        # 6. Statistical test results
        ax = axes[1, 2]
        ax.axis('off')

        # Create results table
        test_results = result.visual_evidence.get('test_results', {})
        table_data = []
        for test_name, test_result in test_results.items():
            table_data.append([
                test_result['method'],
                f"{test_result['statistic']:.4f}",
                f"{test_result['p_value']:.4f}",
                '✗' if test_result['reject_normality'] else '✓'
            ])

        table = ax.table(cellText=table_data,
                        colLabels=['Test', 'Statistic', 'P-value', 'Normal?'],
                        cellLoc='center',
                        loc='center',
                        colWidths=[0.3, 0.2, 0.2, 0.15])
        table.auto_set_font_size(False)
        table.set_fontsize(10)
        table.scale(1.2, 1.5)

        # Color cells based on results
        for i, row in enumerate(table_data):
            if row[3] == '✗':
                table[(i+1, 3)].set_facecolor('#ffcccc')
            else:
                table[(i+1, 3)].set_facecolor('#ccffcc')

        plt.suptitle('Normality Assumption Diagnostic Plots', fontsize=16, y=1.02)
        plt.tight_layout()

        # Convert to base64 for embedding
        buffer = BytesIO()
        plt.savefig(buffer, format='png', dpi=100, bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.getvalue()).decode()
        plt.close()

        return {
            'plot_base64': image_base64,
            'plot_type': 'normality_diagnostic',
            'interpretation': self._interpret_normality_plots(result)
        }
```

---

## 📚 EDUCATION SYSTEM {#education-system}

```python
class EducationEngine:
    """Provides educational content about violations and statistics"""

    def __init__(self):
        self.content_library = self._load_content_library()
        self.difficulty_levels = ['beginner', 'intermediate', 'advanced']

    def explain(self,
                assumption: str,
                result: AssumptionResult,
                test_type: str,
                user_level: str = 'intermediate') -> str:
        """
        Generate educational content about the assumption violation
        """

        content = {
            'what_is_assumption': self._explain_assumption(assumption, user_level),
            'why_it_matters': self._explain_importance(assumption, test_type),
            'what_went_wrong': self._explain_violation(result),
            'consequences': self._explain_consequences(assumption, test_type),
            'solutions': self._suggest_solutions(result),
            'learn_more': self._provide_resources(assumption, user_level)
        }

        return self._format_education_content(content, user_level)

    def _explain_assumption(self, assumption: str, level: str) -> str:
        """Explain what the assumption means"""

        explanations = {
            'normality': {
                'beginner': """
                📊 **What is Normality?**

                Normality means your data follows a "bell curve" shape - most values
                cluster around the middle, with fewer extreme values on both sides.

                Think of heights: Most people are average height, fewer are very short
                or very tall. That's a normal distribution!
                """,
                'intermediate': """
                📊 **Normality Assumption**

                The assumption that data follows a Gaussian (normal) distribution,
                characterized by:
                - Symmetric bell-shaped curve
                - Mean = Median = Mode
                - 68-95-99.7 rule for standard deviations
                - Defined by mean (μ) and standard deviation (σ)

                Many statistical tests assume normality because:
                - Mathematical properties are well-understood
                - Central Limit Theorem often applies
                - Simplifies probability calculations
                """,
                'advanced': """
                📊 **Normality Assumption in Statistical Inference**

                The assumption that observations are drawn from N(μ, σ²), where the
                probability density function is:

                f(x) = (1/√(2πσ²)) * e^(-(x-μ)²/(2σ²))

                Critical for parametric tests because:
                - Test statistics follow known distributions (t, F, χ²)
                - Maximum likelihood estimators have optimal properties
                - Confidence intervals have exact coverage probabilities
                - Type I and II error rates are controlled

                Violations affect:
                - Test statistic distribution
                - Power and efficiency
                - Robustness of inference
                """
            }
        }

        return explanations.get(assumption, {}).get(level, "")
```

---

## 📝 AUDIT TRAIL SYSTEM {#audit-trail}

```python
class AuditLogger:
    """Comprehensive audit trail for all Guardian decisions"""

    def __init__(self, database_connection=None):
        self.db = database_connection
        self.current_session = str(uuid.uuid4())

    def log_request(self, test_type: str, data: Any) -> str:
        """Log incoming analysis request"""

        request_id = str(uuid.uuid4())

        audit_entry = {
            'request_id': request_id,
            'session_id': self.current_session,
            'timestamp': datetime.now().isoformat(),
            'test_type': test_type,
            'data_shape': self._get_data_shape(data),
            'data_hash': self._hash_data(data),
            'user': self._get_current_user()
        }

        self._persist_log(audit_entry)
        return request_id

    def log_decision(self, request_id: str, decision: 'GuardianDecision'):
        """Log Guardian's decision"""

        decision_entry = {
            'request_id': request_id,
            'decision_timestamp': datetime.now().isoformat(),
            'allowed': decision.allowed,
            'violations': [self._serialize_violation(v) for v in decision.violations],
            'warnings': [self._serialize_violation(w) for w in decision.warnings],
            'alternatives_suggested': decision.alternatives,
            'override_used': decision.override_token is not None,
            'final_test_used': decision.final_test if decision.allowed else None,
            'prevented_error_type': self._classify_prevented_error(decision)
        }

        self._persist_log(decision_entry)

        # Generate compliance report if needed
        if self._requires_compliance_report(decision):
            self._generate_compliance_report(request_id, decision)

    def generate_report(self,
                       time_range: Tuple[datetime, datetime],
                       format: str = 'pdf') -> bytes:
        """Generate audit report for compliance/review"""

        # Fetch logs
        logs = self._fetch_logs(time_range)

        # Calculate statistics
        stats = {
            'total_requests': len(logs),
            'blocked_analyses': sum(1 for l in logs if not l['allowed']),
            'violations_by_type': self._count_violations(logs),
            'prevented_errors': self._estimate_prevented_errors(logs),
            'most_common_violations': self._get_top_violations(logs),
            'user_compliance': self._calculate_compliance_rate(logs)
        }

        # Generate report
        if format == 'pdf':
            return self._generate_pdf_report(logs, stats)
        elif format == 'json':
            return json.dumps({'logs': logs, 'statistics': stats}, indent=2)
        else:
            return self._generate_text_report(logs, stats)
```

---

## 💻 IMPLEMENTATION CODE {#implementation-code}

### Quick Start Implementation

```python
# guardian_implementation.py

from statistical_guardian import StatisticalGuardian
import numpy as np

# Initialize Guardian
guardian = StatisticalGuardian()

# Example: User wants to run t-test
def user_requests_ttest(group1_data, group2_data):
    """
    User's request to perform t-test - Guardian intervenes
    """

    # Guardian checks BEFORE analysis
    decision = guardian.guard_analysis(
        data={'group1': group1_data, 'group2': group2_data},
        test_type='t_test_independent'
    )

    if not decision.allowed:
        # Analysis blocked - show why
        print("❌ ANALYSIS BLOCKED")
        print(f"Violations found: {decision.violations}")

        # Show visual evidence
        for violation in decision.violations:
            display_visual_evidence(violation.visual_evidence)

        # Educate user
        print("\n📚 EDUCATION:")
        print(decision.education)

        # Suggest alternatives
        print("\n✅ RECOMMENDED ALTERNATIVES:")
        for alt in decision.alternatives:
            print(f"  - {alt['test_name']}: {alt['why_suitable']}")

        # User can choose alternative
        choice = get_user_choice(decision.alternatives)
        if choice:
            # Re-run with alternative test
            return run_alternative_test(choice, group1_data, group2_data)

    else:
        # Analysis approved - proceed
        print("✅ ANALYSIS APPROVED")
        print(f"Certification: {decision.certification}")

        # Run the actual test
        result = perform_ttest(group1_data, group2_data)

        # Attach Guardian certification
        result['guardian_certified'] = True
        result['audit_id'] = decision.audit_id

        return result

# Example with multimodal data (like your friend's case)
def demonstrate_guardian_protection():
    """
    Demonstrate how Guardian prevents the GraphPad problem
    """

    # Create bimodal data (like your friend had)
    np.random.seed(42)
    group1_mode1 = np.random.normal(10, 1, 30)
    group1_mode2 = np.random.normal(15, 1, 20)
    group1 = np.concatenate([group1_mode1, group1_mode2])

    # Create another multimodal group
    group2_mode1 = np.random.normal(11, 1, 25)
    group2_mode2 = np.random.normal(16, 1, 25)
    group2 = np.concatenate([group2_mode1, group2_mode2])

    print("=" * 60)
    print("DEMONSTRATION: Guardian Preventing Statistical Malpractice")
    print("=" * 60)

    # What GraphPad would do (WRONG)
    print("\n1️⃣ GRAPHPAD APPROACH (No Protection):")
    from scipy import stats
    t_stat, p_value = stats.ttest_ind(group1, group2)
    print(f"   T-test result: t={t_stat:.3f}, p={p_value:.3f}")
    if p_value < 0.05:
        print("   ❌ FALSE POSITIVE - Significant difference claimed!")

    # What StickForStats does (RIGHT)
    print("\n2️⃣ STICKFORSTATS APPROACH (Guardian Protected):")
    result = user_requests_ttest(group1, group2)

    print("\n" + "=" * 60)
    print("RESULT: Guardian prevented publication of false findings!")
    print("=" * 60)

if __name__ == "__main__":
    demonstrate_guardian_protection()
```

---

## 🧪 TESTING FRAMEWORK {#testing-framework}

### Guardian Test Suite

```python
import pytest
import numpy as np
from statistical_guardian import StatisticalGuardian

class TestStatisticalGuardian:
    """Comprehensive test suite for Guardian system"""

    @pytest.fixture
    def guardian(self):
        """Create Guardian instance for testing"""
        return StatisticalGuardian()

    def test_blocks_multimodal_ttest(self, guardian):
        """Test that Guardian blocks t-test on multimodal data"""

        # Create clearly bimodal data
        group1 = np.concatenate([
            np.random.normal(0, 1, 50),
            np.random.normal(5, 1, 50)
        ])
        group2 = np.random.normal(2.5, 1, 100)

        decision = guardian.guard_analysis(
            data={'group1': group1, 'group2': group2},
            test_type='t_test_independent'
        )

        assert not decision.allowed
        assert any(v.assumption_name == 'normality' for v in decision.violations)
        assert len(decision.alternatives) > 0
        assert 'mann_whitney_u' in [a['test_name'] for a in decision.alternatives]

    def test_allows_valid_ttest(self, guardian):
        """Test that Guardian allows valid t-test"""

        # Create normally distributed data
        np.random.seed(42)
        group1 = np.random.normal(100, 15, 50)
        group2 = np.random.normal(105, 15, 50)

        decision = guardian.guard_analysis(
            data={'group1': group1, 'group2': group2},
            test_type='t_test_independent'
        )

        assert decision.allowed
        assert decision.certification is not None
        assert len(decision.violations) == 0

    def test_detects_unequal_variance(self, guardian):
        """Test detection of heteroscedasticity"""

        group1 = np.random.normal(100, 5, 50)   # Small variance
        group2 = np.random.normal(100, 20, 50)  # Large variance

        decision = guardian.guard_analysis(
            data={'group1': group1, 'group2': group2},
            test_type='t_test_independent'
        )

        # Should suggest Welch's t-test
        if not decision.allowed:
            alternatives = [a['test_name'] for a in decision.alternatives]
            assert 'welch_t_test' in alternatives

    def test_education_content_provided(self, guardian):
        """Test that education content is provided for violations"""

        # Create problematic data
        group1 = np.concatenate([
            np.random.normal(0, 1, 30),
            np.random.normal(10, 1, 20)
        ])
        group2 = np.random.normal(5, 1, 50)

        decision = guardian.guard_analysis(
            data={'group1': group1, 'group2': group2},
            test_type='t_test_independent'
        )

        assert decision.education is not None
        assert len(decision.education) > 100  # Substantial content
        assert 'multimodal' in decision.education.lower()

    @pytest.mark.parametrize("test_type,data_problem,expected_alternative", [
        ('t_test_independent', 'non_normal', 'mann_whitney_u'),
        ('anova_oneway', 'non_normal', 'kruskal_wallis'),
        ('pearson_correlation', 'non_linear', 'spearman_correlation'),
    ])
    def test_appropriate_alternatives(self, guardian, test_type, data_problem, expected_alternative):
        """Test that appropriate alternatives are suggested"""

        # Create problematic data based on issue
        if data_problem == 'non_normal':
            data = self._create_skewed_data()
        elif data_problem == 'non_linear':
            data = self._create_nonlinear_data()

        decision = guardian.guard_analysis(
            data=data,
            test_type=test_type
        )

        if not decision.allowed:
            alternatives = [a['test_name'] for a in decision.alternatives]
            assert expected_alternative in alternatives
```

---

## 🎯 SUMMARY

The Statistical Guardian system represents a **paradigm shift** in statistical software:

1. **Mandatory Protection**: Cannot be bypassed
2. **Educational Focus**: Teaches why, not just what
3. **Visual Evidence**: Shows exactly what's wrong
4. **Smart Alternatives**: Always provides a path forward
5. **Complete Audit Trail**: For compliance and review

This system will **prevent the publication of false findings** and **educate researchers** on proper statistical methodology, making StickForStats not just a tool, but a **guardian of scientific integrity**.

---

**Next Steps:**
1. Implement core Guardian engine (Week 1)
2. Build assumption validators (Week 1)
3. Create visual evidence system (Week 2)
4. Develop recommendation engine (Week 2)
5. Test with real-world problematic datasets (Week 3)
6. Document and prepare for launch (Week 4)

**The Guardian is ready to protect science. Let's build it!** 🚀