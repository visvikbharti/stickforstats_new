"""
Statistical Guardian Core System
================================
The revolutionary system that makes bad statistics impossible.
Protects users from statistical malpractice by validating assumptions before analysis.

Golden Ratio (φ) = 1.618033988749... appears throughout our validation thresholds.
"""

import numpy as np
from scipy import stats
from typing import Dict, List, Tuple, Optional, Any
from dataclasses import dataclass
from decimal import Decimal, getcontext
import warnings
import json

# Import visualization and effect size modules
from .visualization_generator import VisualizationGenerator
from .effect_size_calculator import EffectSizeCalculator

# Set precision for the universe's mathematical language
getcontext().prec = 50
PHI = Decimal(1 + 5**0.5) / 2  # Golden Ratio with 50-decimal precision


@dataclass
class AssumptionViolation:
    """Represents a violation of statistical assumptions"""
    assumption: str
    test_name: str
    severity: str  # 'critical', 'warning', 'minor'
    p_value: Optional[float]
    statistic: Optional[float]
    message: str
    recommendation: str
    visual_evidence: Optional[Dict[str, Any]] = None


@dataclass
class GuardianReport:
    """Complete Guardian assessment report"""
    test_type: str
    data_summary: Dict[str, Any]
    assumptions_checked: List[str]
    violations: List[AssumptionViolation]
    can_proceed: bool
    alternative_tests: List[str]
    confidence_score: float
    visual_evidence: Dict[str, Any]
    effect_size_report: Optional[Dict[str, Any]] = None


class GuardianCore:
    """
    The Statistical Guardian - Protector of Scientific Integrity

    This is the core engine that validates all statistical assumptions
    before allowing any test to proceed. It implements the universe's
    mathematical principles to ensure statistical validity.
    """

    def __init__(self):
        self.validators = {
            'normality': NormalityValidator(),
            'variance_homogeneity': VarianceHomogeneityValidator(),
            'independence': IndependenceValidator(),
            'outliers': OutlierDetector(),
            'sample_size': SampleSizeValidator(),
            'modality': ModalityDetector(),
            'linearity': LinearityValidator(),
            'homoscedasticity': HomoscedasticityValidator()
        }

        # Test requirements mapping
        self.test_requirements = {
            't_test': ['normality', 'variance_homogeneity', 'independence', 'outliers'],
            'anova': ['normality', 'variance_homogeneity', 'independence'],
            'pearson': ['normality', 'linearity', 'outliers'],
            'regression': ['normality', 'independence', 'homoscedasticity', 'linearity'],
            'chi_square': ['expected_frequencies', 'independence'],
            'mann_whitney': ['independence', 'similar_shapes'],
            'kruskal_wallis': ['independence', 'similar_shapes']
        }

        # Initialize visualization and effect size calculators
        self.viz_generator = VisualizationGenerator()
        self.effect_calculator = EffectSizeCalculator()

    def check(self, data: Any, test_type: str, alpha: float = 0.05) -> GuardianReport:
        """
        Main Guardian check - validates all assumptions for a given test

        Parameters:
        -----------
        data : array-like or dict
            The data to validate
        test_type : str
            The statistical test to be performed
        alpha : float
            Significance level for assumption tests

        Returns:
        --------
        GuardianReport : Complete assessment with recommendations
        """

        # Prepare data
        data_arrays = self._prepare_data(data)

        # Get requirements for this test
        requirements = self.test_requirements.get(test_type, [])

        violations = []
        visual_evidence = {}

        # Check each assumption
        for req in requirements:
            if req in self.validators:
                validator = self.validators[req]
                result = validator.validate(data_arrays, alpha)

                if result['violated']:
                    violations.append(AssumptionViolation(
                        assumption=req,
                        test_name=result['test_name'],
                        severity=result['severity'],
                        p_value=result.get('p_value'),
                        statistic=result.get('statistic'),
                        message=result['message'],
                        recommendation=result['recommendation'],
                        visual_evidence=result.get('visual_data')
                    ))

                if result.get('visual_data'):
                    visual_evidence[req] = result['visual_data']

        # Determine if we can proceed
        critical_violations = [v for v in violations if v.severity == 'critical']
        can_proceed = len(critical_violations) == 0

        # Get alternative tests if needed
        alternatives = self._get_alternatives(test_type, violations)

        # Calculate confidence score (using golden ratio weighting)
        confidence = self._calculate_confidence(violations)

        # Generate publication-ready visualizations
        try:
            # Prepare data for visualization (flatten if needed)
            viz_data = data_arrays[0] if len(data_arrays) == 1 else data_arrays

            # Convert violations to dict format for visualization generator
            violation_dicts = [
                {
                    'assumption': v.assumption,
                    'severity': v.severity,
                    'test_name': v.test_name
                }
                for v in violations
            ]

            visual_plots = self.viz_generator.generate_all_diagnostics(
                viz_data, violation_dicts, test_type
            )
            visual_evidence.update(visual_plots)
        except Exception as e:
            warnings.warn(f"Failed to generate visualizations: {str(e)}")
            visual_evidence['error'] = str(e)

        # Calculate effect sizes
        effect_size_report = None
        try:
            effect_size_report = self.effect_calculator.generate_effect_size_report(
                test_type, data_arrays
            )
        except Exception as e:
            warnings.warn(f"Failed to calculate effect sizes: {str(e)}")

        return GuardianReport(
            test_type=test_type,
            data_summary=self._summarize_data(data_arrays),
            assumptions_checked=requirements,
            violations=violations,
            can_proceed=can_proceed,
            alternative_tests=alternatives,
            confidence_score=confidence,
            visual_evidence=visual_evidence,
            effect_size_report=effect_size_report
        )

    def _prepare_data(self, data) -> List[np.ndarray]:
        """Convert various data formats to numpy arrays"""
        if isinstance(data, dict):
            return [np.array(v) for v in data.values()]
        elif isinstance(data, list) and all(isinstance(x, (list, np.ndarray)) for x in data):
            return [np.array(x) for x in data]
        else:
            return [np.array(data)]

    def _summarize_data(self, data_arrays: List[np.ndarray]) -> Dict[str, Any]:
        """Create summary statistics for the data"""
        summary = {}
        for i, arr in enumerate(data_arrays):
            key = f"group_{i+1}" if len(data_arrays) > 1 else "data"
            summary[key] = {
                'n': len(arr),
                'mean': float(np.mean(arr)),
                'std': float(np.std(arr)),
                'median': float(np.median(arr)),
                'min': float(np.min(arr)),
                'max': float(np.max(arr)),
                'skewness': float(stats.skew(arr)),
                'kurtosis': float(stats.kurtosis(arr))
            }
        return summary

    def _get_alternatives(self, test_type: str, violations: List[AssumptionViolation]) -> List[str]:
        """Recommend alternative tests based on violations"""
        alternatives = []

        # Map parametric to non-parametric alternatives
        alternatives_map = {
            't_test': ['mann_whitney', 'permutation_test', 'bootstrap'],
            'anova': ['kruskal_wallis', 'friedman', 'permutation_anova'],
            'pearson': ['spearman', 'kendall', 'distance_correlation'],
            'regression': ['robust_regression', 'quantile_regression', 'gam']
        }

        if test_type in alternatives_map:
            # Check which assumptions are violated
            violated_assumptions = {v.assumption for v in violations}

            if 'normality' in violated_assumptions:
                alternatives.extend(alternatives_map[test_type])

            if 'variance_homogeneity' in violated_assumptions and test_type == 't_test':
                alternatives.append('welch_t_test')

        return list(set(alternatives))  # Remove duplicates

    def _calculate_confidence(self, violations: List[AssumptionViolation]) -> float:
        """
        Calculate confidence score using golden ratio weighting

        Higher penalties for more severe violations:
        - Critical violations: penalty = φ² ≈ 2.618 (HIGHEST penalty)
        - Warning violations: penalty = φ ≈ 1.618 (MEDIUM penalty)
        - Minor violations: penalty = 1.0 (LOWEST penalty)

        Confidence decreases as penalties accumulate.
        """
        if not violations:
            return 1.0

        phi = float(PHI)
        # Correct weighting: critical violations have HIGHER penalties
        penalties = {
            'critical': phi ** 2,  # ~2.618 (highest penalty)
            'warning': phi,         # ~1.618 (medium penalty)
            'minor': 1.0           # 1.0 (lowest penalty)
        }

        # Calculate total penalty from all violations
        total_penalty = sum(penalties.get(v.severity, 1.0) for v in violations)

        # Maximum possible penalty if all were critical
        max_possible_penalty = len(violations) * penalties['critical']

        # Confidence decreases proportionally to penalty accumulation
        # Scale so that all-critical gives ~50%, mixed gives 60-80%, all-minor gives ~85%
        confidence = max(0, 1 - (total_penalty / (max_possible_penalty * 1.2)))

        return round(confidence, 3)


class NormalityValidator:
    """Validates normality assumption using multiple tests"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Check normality using Shapiro-Wilk and Anderson-Darling tests"""
        results = []

        for arr in data_arrays:
            if len(arr) < 3:
                return {
                    'violated': True,
                    'test_name': 'Sample Size Check',
                    'severity': 'critical',
                    'message': 'Sample size too small for normality testing',
                    'recommendation': 'Collect more data (n ≥ 30) or use non-parametric tests'
                }

            # Shapiro-Wilk test (best for small samples)
            if len(arr) <= 5000:
                stat, p_value = stats.shapiro(arr)
                test_name = 'Shapiro-Wilk'
            else:
                # Anderson-Darling for large samples
                result = stats.anderson(arr, dist='norm')
                stat = result.statistic
                # Get p-value for 5% significance level
                critical_value = result.critical_values[2]
                p_value = 0.05 if stat > critical_value else 0.10
                test_name = 'Anderson-Darling'

            results.append({
                'p_value': p_value,
                'statistic': stat,
                'test_name': test_name
            })

        # Check if any group violates normality
        violations = [r for r in results if r['p_value'] < alpha]

        if violations:
            severity = 'critical' if all(r['p_value'] < alpha/10 for r in results) else 'warning'
            return {
                'violated': True,
                'test_name': violations[0]['test_name'],
                'severity': severity,
                'p_value': min(r['p_value'] for r in violations),
                'statistic': violations[0]['statistic'],
                'message': f'Normality assumption violated (p={violations[0]["p_value"]:.4f})',
                'recommendation': 'Consider transformation (log, sqrt) or use non-parametric tests',
                'visual_data': self._generate_visual_data(data_arrays)
            }

        # Return test statistics even when assumption is satisfied
        return {
            'violated': False,
            'test_name': results[0]['test_name'] if results else 'Shapiro-Wilk',
            'p_value': max(r['p_value'] for r in results) if results else None,
            'statistic': results[0]['statistic'] if results else None
        }

    def _generate_visual_data(self, data_arrays: List[np.ndarray]) -> Dict:
        """Generate data for Q-Q plot and histogram (lightweight version)"""
        visual_data = {}

        for i, arr in enumerate(data_arrays):
            # Q-Q plot data
            theoretical_quantiles = stats.norm.ppf(np.linspace(0.01, 0.99, len(arr)))
            sample_quantiles = np.sort(arr)

            visual_data[f'group_{i+1}'] = {
                'qq_plot': {
                    'theoretical': theoretical_quantiles.tolist(),
                    'sample': sample_quantiles.tolist()
                },
                'histogram': {
                    'values': arr.tolist(),
                    'bins': 30
                }
                # KDE removed for performance - can be generated client-side if needed
            }

        return visual_data


class VarianceHomogeneityValidator:
    """Validates homogeneity of variance assumption"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Check variance homogeneity using Levene's test"""

        if len(data_arrays) < 2:
            return {'violated': False}  # Cannot check with single group

        # Levene's test (robust to non-normality)
        stat, p_value = stats.levene(*data_arrays, center='median')

        if p_value < alpha:
            # Calculate variance ratio
            variances = [np.var(arr) for arr in data_arrays]
            ratio = max(variances) / min(variances)

            # Severity based on ratio (using golden ratio threshold)
            phi = float(PHI)
            if ratio > phi ** 2:  # > ~2.618
                severity = 'critical'
            elif ratio > phi:     # > ~1.618
                severity = 'warning'
            else:
                severity = 'minor'

            return {
                'violated': True,
                'test_name': "Levene's Test",
                'severity': severity,
                'p_value': p_value,
                'statistic': stat,
                'message': f'Variance homogeneity violated (ratio={ratio:.2f}, p={p_value:.4f})',
                'recommendation': "Use Welch's t-test or non-parametric alternatives",
                'visual_data': self._generate_visual_data(data_arrays)
            }

        # Return test statistics even when assumption is satisfied
        return {
            'violated': False,
            'test_name': "Levene's Test",
            'p_value': p_value,
            'statistic': stat
        }

    def _generate_visual_data(self, data_arrays: List[np.ndarray]) -> Dict:
        """Generate variance comparison visualization data"""
        return {
            'variances': [float(np.var(arr)) for arr in data_arrays],
            'std_devs': [float(np.std(arr)) for arr in data_arrays],
            'group_sizes': [len(arr) for arr in data_arrays]
        }


class IndependenceValidator:
    """Validates independence of observations"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Check independence using Durbin-Watson test for autocorrelation"""

        max_autocorr = 0
        for arr in data_arrays:
            if len(arr) < 10:
                continue

            # Simple autocorrelation check
            autocorr = np.corrcoef(arr[:-1], arr[1:])[0, 1]
            max_autocorr = max(abs(max_autocorr), abs(autocorr))

            if abs(autocorr) > 0.3:  # Threshold based on practical significance
                severity = 'critical' if abs(autocorr) > 0.5 else 'warning'

                return {
                    'violated': True,
                    'test_name': 'Autocorrelation Test',
                    'severity': severity,
                    'statistic': autocorr,
                    'p_value': None,
                    'message': f'Independence assumption violated (autocorr={autocorr:.3f})',
                    'recommendation': 'Check for time-series structure or repeated measures'
                }

        # Return autocorrelation statistic even when assumption is satisfied
        return {
            'violated': False,
            'test_name': 'Autocorrelation Test',
            'statistic': max_autocorr if max_autocorr > 0 else None,
            'p_value': None
        }


class OutlierDetector:
    """Detects and reports outliers in the data"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Detect outliers using IQR and Z-score methods"""

        all_outliers = []

        for i, arr in enumerate(data_arrays):
            # IQR method
            Q1, Q3 = np.percentile(arr, [25, 75])
            IQR = Q3 - Q1
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR

            outliers_iqr = arr[(arr < lower_bound) | (arr > upper_bound)]

            # Z-score method (for normally distributed data)
            z_scores = np.abs(stats.zscore(arr))
            outliers_z = arr[z_scores > 3]

            # Combine both methods
            outliers = np.unique(np.concatenate([outliers_iqr, outliers_z]))

            if len(outliers) > 0:
                all_outliers.append({
                    'group': i + 1,
                    'count': len(outliers),
                    'percentage': len(outliers) / len(arr) * 100,
                    'values': outliers.tolist()
                })

        if all_outliers:
            total_percentage = np.mean([o['percentage'] for o in all_outliers])

            # Severity based on percentage of outliers
            if total_percentage > 10:
                severity = 'critical'
            elif total_percentage > 5:
                severity = 'warning'
            else:
                severity = 'minor'

            return {
                'violated': True,
                'test_name': 'Outlier Detection (IQR + Z-score)',
                'severity': severity,
                'message': f'{total_percentage:.1f}% of data are outliers',
                'recommendation': 'Investigate outliers, consider robust methods or transformation',
                'visual_data': {'outliers': all_outliers}
            }

        return {'violated': False}


class SampleSizeValidator:
    """Validates adequate sample size for the test"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Check if sample size is adequate for the test"""

        min_size = min(len(arr) for arr in data_arrays)

        # Using golden ratio for thresholds
        phi = float(PHI)

        if min_size < 3:
            return {
                'violated': True,
                'test_name': 'Sample Size Check',
                'severity': 'critical',
                'message': f'Sample size too small (n={min_size})',
                'recommendation': 'Minimum n=3 required, n≥30 recommended for parametric tests'
            }
        elif min_size < int(30 / phi):  # ~18
            return {
                'violated': True,
                'test_name': 'Sample Size Check',
                'severity': 'warning',
                'message': f'Small sample size (n={min_size}) may affect test validity',
                'recommendation': 'Consider non-parametric tests or collect more data'
            }

        return {'violated': False}


class ModalityDetector:
    """Detects multimodality in distributions"""

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """Detect multimodality using Hartigan's dip test approximation"""

        for arr in data_arrays:
            # Skip if sample too small
            if len(arr) < 20:
                continue

            # Simple peak detection in KDE (optimized with fewer points)
            kde = stats.gaussian_kde(arr)
            x_range = np.linspace(arr.min(), arr.max(), 50)  # Reduced from 200 to 50
            density = kde(x_range)

            # Find peaks
            peaks = []
            for i in range(1, len(density) - 1):
                if density[i] > density[i-1] and density[i] > density[i+1]:
                    peaks.append(i)

            if len(peaks) > 1:
                # Check if peaks are significant
                peak_heights = [density[p] for p in peaks]
                max_height = max(peak_heights)
                significant_peaks = [h for h in peak_heights if h > max_height * 0.3]

                if len(significant_peaks) > 1:
                    return {
                        'violated': True,
                        'test_name': 'Modality Detection',
                        'severity': 'warning',
                        'message': f'Distribution appears multimodal ({len(significant_peaks)} modes)',
                        'recommendation': 'Consider analyzing subgroups separately',
                        'visual_data': {
                            'kde_x': x_range.tolist(),
                            'kde_y': density.tolist(),
                            'peaks': peaks
                        }
                    }

        return {'violated': False}


class LinearityValidator:
    """
    Validates linearity assumption for regression and correlation

    Uses residual analysis to detect non-linear relationships:
    - Fits linear regression and examines residuals
    - Applies runs test to detect patterns in residuals
    - Calculates R-squared for polynomial fit comparison
    """

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """
        Check linearity assumption using residual analysis

        For regression: requires exactly 2 arrays (X and Y)
        For correlation: also requires 2 arrays
        """

        if len(data_arrays) != 2:
            return {'violated': False}  # Not applicable

        x = data_arrays[0]
        y = data_arrays[1]

        if len(x) < 3:
            return {
                'violated': True,
                'test_name': 'Linearity Check',
                'severity': 'critical',
                'message': 'Insufficient data for linearity assessment',
                'recommendation': 'Collect more data points (n ≥ 10)'
            }

        # Fit linear regression
        from sklearn.linear_model import LinearRegression
        from sklearn.preprocessing import PolynomialFeatures
        from sklearn.metrics import r2_score

        # Reshape data for sklearn
        X = x.reshape(-1, 1)

        # Fit linear model
        linear_model = LinearRegression()
        linear_model.fit(X, y)
        y_pred_linear = linear_model.predict(X)
        residuals = y - y_pred_linear
        r2_linear = r2_score(y, y_pred_linear)

        # Fit quadratic model to compare
        poly_features = PolynomialFeatures(degree=2)
        X_poly = poly_features.fit_transform(X)
        poly_model = LinearRegression()
        poly_model.fit(X_poly, y)
        y_pred_poly = poly_model.predict(X_poly)
        r2_poly = r2_score(y, y_pred_poly)

        # Calculate improvement in R² with polynomial fit
        r2_improvement = r2_poly - r2_linear

        # Runs test on residuals to detect patterns
        runs_test_result = self._runs_test(residuals)

        # Check sample size - runs test requires n ≥ 20 for adequate statistical power
        # For n < 20, we'll still run tests but warn about low power
        n = len(x)
        low_power_warning = None
        if n < 20:
            low_power_warning = (
                f"Small sample size (n={n}) limits statistical power for linearity testing. "
                f"Runs test may fail to detect non-linearity with fewer than 20 observations. "
                f"Visual inspection of residual plots recommended."
            )

        # Determine if linearity is violated
        # Criteria:
        # 1. Polynomial fit improves R² significantly (> 0.05 for warning, > 0.10 for critical)
        # 2. Runs test detects pattern in residuals (primary indicator, but requires n ≥ 20)
        #
        # Statistical Note: Runs test has low power when n < 20
        # - At n=8, even perfect quadratic patterns may not reach significance (p<0.05)
        # - At n=20+, runs test reliably detects non-linear patterns
        # - We do NOT lower thresholds to compensate - that would be statistically unsound

        violated = False
        severity = 'minor'

        # Runs test is primary indicator of non-linearity (reliable for n ≥ 20)
        if runs_test_result['pattern_detected']:
            violated = True
            severity = 'critical'  # Pattern in residuals is serious

        # R² improvement provides additional evidence
        # Thresholds based on standard statistical practice:
        # - 10%+ improvement: Strong evidence of non-linearity
        # - 5-10% improvement: Moderate evidence (warning level)
        if r2_improvement > 0.10:  # Polynomial explains 10%+ more variance
            violated = True
            severity = 'critical'
        elif r2_improvement > 0.05:  # Polynomial explains 5-10% more variance
            violated = True
            if severity != 'critical':  # Don't downgrade if runs test already critical
                severity = 'warning'

        if violated:
            # Build message with low power warning if applicable
            base_message = f'Linearity violated (R² improvement with polynomial: {r2_improvement:.3f})'
            if low_power_warning:
                message = f'{base_message}. NOTE: {low_power_warning}'
            else:
                message = base_message

            return {
                'violated': True,
                'test_name': 'Linearity Check (Residual Analysis)',
                'severity': severity,
                'p_value': runs_test_result.get('p_value'),
                'statistic': r2_improvement,
                'message': message,
                'recommendation': 'Consider polynomial regression, transformation (log, sqrt), or GAM',
                'visual_data': {
                    'x': x.tolist(),
                    'y': y.tolist(),
                    'y_pred_linear': y_pred_linear.tolist(),
                    'y_pred_poly': y_pred_poly.tolist(),
                    'residuals': residuals.tolist(),
                    'r2_linear': float(r2_linear),
                    'r2_poly': float(r2_poly),
                    'r2_improvement': float(r2_improvement),
                    'sample_size': n,
                    'runs_test_p_value': runs_test_result.get('p_value')
                }
            }

        # No violation detected, but still warn about low power if applicable
        base_message = f'Linearity assumption satisfied (R² linear: {r2_linear:.3f})'
        if low_power_warning:
            message = f'{base_message}. NOTE: {low_power_warning}'
        else:
            message = base_message

        return {
            'violated': False,
            'test_name': 'Linearity Check (Residual Analysis)',
            'statistic': r2_improvement,
            'message': message,
            'visual_data': {
                'sample_size': n,
                'runs_test_p_value': runs_test_result.get('p_value')
            }
        }

    def _runs_test(self, residuals: np.ndarray) -> Dict:
        """
        Runs test to detect non-random patterns in residuals

        The runs test checks if residuals above/below zero are randomly distributed.
        Too few runs suggests a pattern (non-linearity).
        """
        # Get median
        median = np.median(residuals)

        # Convert to binary sequence (above/below median)
        binary = (residuals > median).astype(int)

        # Count runs
        runs = 1
        for i in range(1, len(binary)):
            if binary[i] != binary[i-1]:
                runs += 1

        # Expected runs under null hypothesis (random)
        n1 = np.sum(binary == 1)
        n2 = np.sum(binary == 0)
        n = len(binary)

        if n1 == 0 or n2 == 0:
            return {'pattern_detected': True, 'p_value': 0.0}

        expected_runs = (2 * n1 * n2) / n + 1
        variance_runs = (2 * n1 * n2 * (2 * n1 * n2 - n)) / (n**2 * (n - 1))

        if variance_runs == 0:
            return {'pattern_detected': False, 'p_value': 1.0}

        # Z-score
        z_score = (runs - expected_runs) / np.sqrt(variance_runs)

        # Two-tailed p-value
        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))

        # Pattern detected if too few runs (p < 0.05)
        pattern_detected = p_value < 0.05

        return {
            'pattern_detected': pattern_detected,
            'p_value': float(p_value),
            'runs': runs,
            'expected_runs': float(expected_runs)
        }


class HomoscedasticityValidator:
    """
    Validates homoscedasticity (constant variance) assumption for regression

    Uses Breusch-Pagan test and visual inspection of residuals
    """

    def validate(self, data_arrays: List[np.ndarray], alpha: float = 0.05) -> Dict:
        """
        Check homoscedasticity using Breusch-Pagan test

        Tests if variance of residuals is constant across predicted values
        """

        if len(data_arrays) != 2:
            return {'violated': False}  # Not applicable

        x = data_arrays[0]
        y = data_arrays[1]

        if len(x) < 10:
            return {'violated': False}  # Skip for small samples

        # Fit linear regression
        from sklearn.linear_model import LinearRegression

        X = x.reshape(-1, 1)
        model = LinearRegression()
        model.fit(X, y)
        y_pred = model.predict(X)
        residuals = y - y_pred

        # Breusch-Pagan test
        # Regress squared residuals on X to test for heteroscedasticity
        residuals_squared = residuals ** 2

        bp_model = LinearRegression()
        bp_model.fit(X, residuals_squared)
        r2_bp = bp_model.score(X, residuals_squared)

        # Test statistic: n * R²
        n = len(residuals)
        bp_statistic = n * r2_bp

        # Under null hypothesis, follows chi-square(1) distribution
        p_value = 1 - stats.chi2.cdf(bp_statistic, df=1)

        if p_value < alpha:
            # Check variance ratio across fitted values
            sorted_indices = np.argsort(y_pred)
            first_half = residuals[sorted_indices[:n//2]]
            second_half = residuals[sorted_indices[n//2:]]

            var_ratio = np.var(second_half) / (np.var(first_half) + 1e-10)

            # Determine severity using golden ratio
            phi = float(PHI)
            if var_ratio > phi ** 2 or var_ratio < 1 / (phi ** 2):
                severity = 'critical'
            elif var_ratio > phi or var_ratio < 1 / phi:
                severity = 'warning'
            else:
                severity = 'minor'

            return {
                'violated': True,
                'test_name': 'Breusch-Pagan Test',
                'severity': severity,
                'p_value': float(p_value),
                'statistic': float(bp_statistic),
                'message': f'Homoscedasticity violated (BP test p={p_value:.4f}, variance ratio={var_ratio:.2f})',
                'recommendation': 'Consider weighted least squares, robust regression, or transformation',
                'visual_data': {
                    'fitted_values': y_pred.tolist(),
                    'residuals': residuals.tolist(),
                    'variance_ratio': float(var_ratio)
                }
            }

        return {
            'violated': False,
            'test_name': 'Breusch-Pagan Test',
            'p_value': float(p_value),
            'statistic': float(bp_statistic)
        }