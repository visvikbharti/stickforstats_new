"""
High-Precision Correlation Analysis Module
==========================================
Implements Pearson, Spearman, and Kendall's Tau correlations with 50 decimal precision.
Includes automatic test selection based on data distribution analysis.

Author: StickForStats Development Team
Date: September 2025
Version: 1.0.0
"""

from decimal import Decimal, getcontext
from typing import Dict, List, Tuple, Optional, Union, Any
from dataclasses import dataclass
from enum import Enum
import numpy as np
from scipy import stats
import warnings
import logging

# Configure high precision
getcontext().prec = 50

logger = logging.getLogger(__name__)


class CorrelationType(Enum):
    """Types of correlation tests"""
    PEARSON = "pearson"
    SPEARMAN = "spearman"
    KENDALL = "kendall"
    AUTO = "auto"  # Automatically select based on data


class DataDistribution(Enum):
    """Data distribution types"""
    NORMAL = "normal"
    NON_NORMAL = "non_normal"
    ORDINAL = "ordinal"
    CONTINUOUS = "continuous"
    MONOTONIC = "monotonic"
    LINEAR = "linear"


@dataclass
class CorrelationResult:
    """Comprehensive correlation analysis result"""
    correlation_coefficient: Decimal
    p_value: Decimal
    confidence_interval_lower: Decimal
    confidence_interval_upper: Decimal
    test_statistic: Decimal
    df: int
    sample_size: int
    correlation_type: str

    # Additional statistics
    r_squared: Optional[Decimal] = None
    standard_error: Optional[Decimal] = None

    # Distribution analysis
    x_distribution: Optional[str] = None
    y_distribution: Optional[str] = None
    relationship_type: Optional[str] = None

    # Recommendation
    recommended_test: Optional[str] = None
    alternative_tests: Optional[List[str]] = None
    interpretation: Optional[str] = None


@dataclass
class TestRecommendation:
    """Recommendation for which correlation test to use"""
    recommended_test: CorrelationType
    confidence: float
    reasoning: List[str]
    alternative_tests: List[CorrelationType]
    warnings: List[str]


class HighPrecisionCorrelation:
    """
    High-precision correlation calculator with automatic test selection.
    Implements Pearson, Spearman, and Kendall's Tau with 50 decimal precision.
    """

    def __init__(self, precision: int = 50):
        """Initialize with specified decimal precision"""
        getcontext().prec = precision
        self.precision = precision

    def _to_decimal(self, value: Union[float, int, str]) -> Decimal:
        """Convert to high-precision Decimal"""
        return Decimal(str(value))

    def _to_decimal_array(self, arr: Union[List, np.ndarray]) -> List[Decimal]:
        """Convert array to Decimal array"""
        return [self._to_decimal(x) for x in arr]

    def analyze_distribution(self, data: Union[List, np.ndarray]) -> Dict[str, Any]:
        """
        Analyze data distribution to recommend appropriate correlation test.

        Returns:
            Dictionary with distribution characteristics
        """
        arr = np.array(data)
        n = len(arr)

        analysis = {
            'sample_size': n,
            'mean': float(np.mean(arr)),
            'median': float(np.median(arr)),
            'std': float(np.std(arr)),
            'skewness': float(stats.skew(arr)),
            'kurtosis': float(stats.kurtosis(arr)),
            'outliers': self._detect_outliers(arr),
            'normality': self._test_normality(arr),
            'monotonicity': self._test_monotonicity(arr),
            'linearity_score': 0.0,  # Will be calculated with both variables
            'data_type': self._infer_data_type(arr)
        }

        # Determine distribution type
        if analysis['normality']['is_normal']:
            analysis['distribution'] = DataDistribution.NORMAL
        else:
            analysis['distribution'] = DataDistribution.NON_NORMAL

        return analysis

    def _test_normality(self, data: np.ndarray) -> Dict[str, Any]:
        """Test for normality using multiple methods"""
        n = len(data)

        results = {
            'is_normal': False,
            'tests': {}
        }

        # Shapiro-Wilk test (best for small samples)
        if n <= 5000:
            stat, p_value = stats.shapiro(data)
            results['tests']['shapiro_wilk'] = {
                'statistic': float(stat),
                'p_value': float(p_value),
                'normal': p_value > 0.05
            }

        # Anderson-Darling test
        result = stats.anderson(data)
        results['tests']['anderson_darling'] = {
            'statistic': float(result.statistic),
            'critical_values': result.critical_values.tolist(),
            'normal': result.statistic < result.critical_values[2]  # 5% level
        }

        # Kolmogorov-Smirnov test
        stat, p_value = stats.kstest(data, 'norm', args=(np.mean(data), np.std(data)))
        results['tests']['kolmogorov_smirnov'] = {
            'statistic': float(stat),
            'p_value': float(p_value),
            'normal': p_value > 0.05
        }

        # Overall decision (majority vote)
        normal_votes = sum(1 for test in results['tests'].values() if test.get('normal', False))
        results['is_normal'] = normal_votes >= len(results['tests']) / 2

        return results

    def _detect_outliers(self, data: np.ndarray) -> Dict[str, Any]:
        """Detect outliers using IQR and Z-score methods"""
        # IQR method
        Q1 = np.percentile(data, 25)
        Q3 = np.percentile(data, 75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR

        iqr_outliers = np.where((data < lower_bound) | (data > upper_bound))[0]

        # Z-score method
        z_scores = np.abs(stats.zscore(data))
        z_outliers = np.where(z_scores > 3)[0]

        return {
            'has_outliers': len(iqr_outliers) > 0 or len(z_outliers) > 0,
            'iqr_count': len(iqr_outliers),
            'z_score_count': len(z_outliers),
            'outlier_percentage': max(len(iqr_outliers), len(z_outliers)) / len(data) * 100
        }

    def _test_monotonicity(self, data: np.ndarray) -> Dict[str, Any]:
        """Test if data shows monotonic relationship"""
        diffs = np.diff(data)
        increasing = np.sum(diffs > 0)
        decreasing = np.sum(diffs < 0)
        total = len(diffs)

        monotonic_score = max(increasing, decreasing) / total if total > 0 else 0

        return {
            'is_monotonic': monotonic_score > 0.8,
            'monotonic_score': float(monotonic_score),
            'direction': 'increasing' if increasing > decreasing else 'decreasing'
        }

    def _infer_data_type(self, data: np.ndarray) -> str:
        """Infer the type of data (continuous, ordinal, etc.)"""
        unique_values = len(np.unique(data))
        n = len(data)

        # Check if data appears to be ordinal (limited unique values)
        if unique_values < 10 and unique_values < n / 3:
            return 'ordinal'

        # Check if data is likely continuous
        if unique_values > n / 2:
            return 'continuous'

        return 'mixed'

    def recommend_correlation_test(self, x: Union[List, np.ndarray],
                                  y: Union[List, np.ndarray]) -> TestRecommendation:
        """
        Recommend the most appropriate correlation test based on data characteristics.

        Returns:
            TestRecommendation with detailed reasoning
        """
        # Analyze both variables
        x_analysis = self.analyze_distribution(x)
        y_analysis = self.analyze_distribution(y)

        # Check linearity between variables
        linearity_score = self._assess_linearity(np.array(x), np.array(y))

        reasoning = []
        warnings = []
        alternatives = []

        # Decision logic
        both_normal = x_analysis['normality']['is_normal'] and y_analysis['normality']['is_normal']
        has_outliers = x_analysis['outliers']['has_outliers'] or y_analysis['outliers']['has_outliers']
        both_continuous = x_analysis['data_type'] == 'continuous' and y_analysis['data_type'] == 'continuous'
        either_ordinal = x_analysis['data_type'] == 'ordinal' or y_analysis['data_type'] == 'ordinal'
        small_sample = x_analysis['sample_size'] < 30

        # Recommendation logic
        if both_normal and both_continuous and linearity_score > 0.7 and not has_outliers:
            recommended = CorrelationType.PEARSON
            reasoning.append("Both variables are normally distributed")
            reasoning.append("Linear relationship detected")
            reasoning.append("No significant outliers present")
            alternatives = [CorrelationType.SPEARMAN]

        elif either_ordinal or not both_continuous:
            recommended = CorrelationType.SPEARMAN
            reasoning.append("At least one variable appears to be ordinal")
            reasoning.append("Spearman is appropriate for ranked data")
            alternatives = [CorrelationType.KENDALL]

        elif has_outliers and both_continuous:
            recommended = CorrelationType.SPEARMAN
            reasoning.append(f"Outliers detected ({x_analysis['outliers']['outlier_percentage']:.1f}% of data)")
            reasoning.append("Spearman is more robust to outliers than Pearson")
            alternatives = [CorrelationType.KENDALL, CorrelationType.PEARSON]
            warnings.append("Consider removing outliers for Pearson correlation")

        elif not both_normal and both_continuous:
            recommended = CorrelationType.SPEARMAN
            reasoning.append("At least one variable is not normally distributed")
            reasoning.append("Non-parametric test recommended")
            alternatives = [CorrelationType.KENDALL]

        elif small_sample:
            recommended = CorrelationType.KENDALL
            reasoning.append(f"Small sample size (n={x_analysis['sample_size']})")
            reasoning.append("Kendall's Tau is more reliable for small samples")
            alternatives = [CorrelationType.SPEARMAN]

        else:
            # Default to Spearman as it's most versatile
            recommended = CorrelationType.SPEARMAN
            reasoning.append("Mixed data characteristics detected")
            reasoning.append("Spearman is a safe, versatile choice")
            alternatives = [CorrelationType.PEARSON, CorrelationType.KENDALL]

        # Calculate confidence in recommendation
        confidence = self._calculate_recommendation_confidence(
            x_analysis, y_analysis, linearity_score, recommended
        )

        return TestRecommendation(
            recommended_test=recommended,
            confidence=confidence,
            reasoning=reasoning,
            alternative_tests=alternatives,
            warnings=warnings
        )

    def _assess_linearity(self, x: np.ndarray, y: np.ndarray) -> float:
        """Assess the linearity of relationship between two variables"""
        # Simple R-squared from linear regression
        from scipy import stats
        slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
        return abs(r_value)  # Return absolute correlation as linearity measure

    def _calculate_recommendation_confidence(self, x_analysis: Dict, y_analysis: Dict,
                                            linearity_score: float,
                                            recommended: CorrelationType) -> float:
        """Calculate confidence in test recommendation"""
        confidence = 0.5  # Base confidence

        if recommended == CorrelationType.PEARSON:
            if x_analysis['normality']['is_normal'] and y_analysis['normality']['is_normal']:
                confidence += 0.2
            if linearity_score > 0.8:
                confidence += 0.2
            if not x_analysis['outliers']['has_outliers']:
                confidence += 0.1

        elif recommended == CorrelationType.SPEARMAN:
            if x_analysis['distribution'] == DataDistribution.NON_NORMAL:
                confidence += 0.2
            if x_analysis['outliers']['has_outliers']:
                confidence += 0.15
            confidence += 0.15  # Spearman is generally safe

        elif recommended == CorrelationType.KENDALL:
            if x_analysis['sample_size'] < 30:
                confidence += 0.3
            if x_analysis['data_type'] == 'ordinal':
                confidence += 0.2

        return min(confidence, 1.0)

    def pearson_correlation(self, x: Union[List, np.ndarray],
                           y: Union[List, np.ndarray],
                           confidence_level: float = 0.95) -> CorrelationResult:
        """
        Calculate Pearson correlation coefficient with high precision.

        Args:
            x, y: Input arrays
            confidence_level: Confidence level for interval estimation

        Returns:
            CorrelationResult with detailed statistics
        """
        # Convert to Decimal arrays
        x_dec = self._to_decimal_array(x)
        y_dec = self._to_decimal_array(y)
        n = Decimal(len(x_dec))

        # Calculate means
        mean_x = sum(x_dec) / n
        mean_y = sum(y_dec) / n

        # Calculate correlation components
        numerator = Decimal(0)
        sum_x_sq = Decimal(0)
        sum_y_sq = Decimal(0)

        for xi, yi in zip(x_dec, y_dec):
            x_diff = xi - mean_x
            y_diff = yi - mean_y
            numerator += x_diff * y_diff
            sum_x_sq += x_diff ** 2
            sum_y_sq += y_diff ** 2

        # Calculate correlation coefficient
        denominator = (sum_x_sq * sum_y_sq).sqrt()

        if denominator == 0:
            r = Decimal(0)
        else:
            r = numerator / denominator

        # Calculate t-statistic for significance test
        df = int(n - 2)
        if abs(r) == 1:
            t_stat = Decimal('Infinity') if r > 0 else Decimal('-Infinity')
            p_value = Decimal(0)
        else:
            t_stat = r * ((n - 2) / (1 - r**2)).sqrt()

            # Calculate p-value using scipy for now (can implement high-precision later)
            p_value = Decimal(str(2 * (1 - stats.t.cdf(abs(float(t_stat)), df))))

        # Calculate confidence interval using Fisher's z-transformation
        z = self._fisher_z_transform(r)
        se_z = Decimal(1) / (n - 3).sqrt()
        z_critical = Decimal(str(stats.norm.ppf((1 + confidence_level) / 2)))

        ci_lower_z = z - z_critical * se_z
        ci_upper_z = z + z_critical * se_z

        ci_lower = self._inverse_fisher_z(ci_lower_z)
        ci_upper = self._inverse_fisher_z(ci_upper_z)

        # Standard error of r
        se_r = ((1 - r**2) / (n - 2)).sqrt()

        # Create result
        result = CorrelationResult(
            correlation_coefficient=r,
            p_value=p_value,
            confidence_interval_lower=ci_lower,
            confidence_interval_upper=ci_upper,
            test_statistic=t_stat,
            df=df,
            sample_size=int(n),
            correlation_type="Pearson",
            r_squared=r**2,
            standard_error=se_r,
            interpretation=self._interpret_correlation(r, p_value)
        )

        return result

    def spearman_correlation(self, x: Union[List, np.ndarray],
                           y: Union[List, np.ndarray],
                           confidence_level: float = 0.95) -> CorrelationResult:
        """
        Calculate Spearman's rank correlation coefficient with high precision.

        Returns:
            CorrelationResult with detailed statistics
        """
        # Convert to numpy arrays for ranking
        x_arr = np.array(x)
        y_arr = np.array(y)

        # Calculate ranks
        x_ranks = self._calculate_ranks(x_arr)
        y_ranks = self._calculate_ranks(y_arr)

        # Now calculate Pearson correlation on the ranks
        result = self.pearson_correlation(x_ranks, y_ranks, confidence_level)

        # Update the correlation type
        result.correlation_type = "Spearman"

        # For Spearman, we use different formulas for large samples
        n = len(x)
        if n > 20:
            # Large sample approximation for p-value
            z_stat = result.correlation_coefficient * Decimal(n - 1).sqrt()
            p_value = Decimal(str(2 * (1 - stats.norm.cdf(abs(float(z_stat))))))
            result.p_value = p_value

        return result

    def kendall_tau(self, x: Union[List, np.ndarray],
                   y: Union[List, np.ndarray],
                   confidence_level: float = 0.95) -> CorrelationResult:
        """
        Calculate Kendall's Tau correlation coefficient with high precision.

        Returns:
            CorrelationResult with detailed statistics
        """
        x_arr = np.array(x)
        y_arr = np.array(y)
        n = len(x_arr)

        # Count concordant and discordant pairs
        concordant = Decimal(0)
        discordant = Decimal(0)
        ties_x = Decimal(0)
        ties_y = Decimal(0)
        ties_xy = Decimal(0)

        for i in range(n):
            for j in range(i + 1, n):
                x_diff = self._to_decimal(x_arr[j] - x_arr[i])
                y_diff = self._to_decimal(y_arr[j] - y_arr[i])

                if x_diff == 0 and y_diff == 0:
                    ties_xy += 1
                elif x_diff == 0:
                    ties_x += 1
                elif y_diff == 0:
                    ties_y += 1
                elif x_diff * y_diff > 0:
                    concordant += 1
                else:
                    discordant += 1

        # Calculate Tau-b (handles ties)
        total_pairs = Decimal(n * (n - 1) / 2)
        denominator = ((total_pairs - ties_x) * (total_pairs - ties_y)).sqrt()

        if denominator == 0:
            tau = Decimal(0)
        else:
            tau = (concordant - discordant) / denominator

        # Calculate standard error and z-statistic
        v0 = total_pairs * (total_pairs - Decimal(1)) / Decimal(2)
        v1 = ties_x * (ties_x - Decimal(1)) / Decimal(2) + ties_y * (ties_y - Decimal(1)) / Decimal(2)
        v2 = ties_x * (ties_x - Decimal(1)) * (ties_x - Decimal(2)) / Decimal(6) + \
             ties_y * (ties_y - Decimal(1)) * (ties_y - Decimal(2)) / Decimal(6)

        var = Decimal(4 * n + 10) / Decimal(9 * n * (n - 1))
        se = var.sqrt()

        # Z-statistic for significance test
        z_stat = tau / se if se > 0 else Decimal(0)
        p_value = Decimal(str(2 * (1 - stats.norm.cdf(abs(float(z_stat))))))

        # Confidence interval
        z_critical = Decimal(str(stats.norm.ppf((1 + confidence_level) / 2)))
        ci_lower = tau - z_critical * se
        ci_upper = tau + z_critical * se

        result = CorrelationResult(
            correlation_coefficient=tau,
            p_value=p_value,
            confidence_interval_lower=ci_lower,
            confidence_interval_upper=ci_upper,
            test_statistic=z_stat,
            df=n - 2,  # Approximate df
            sample_size=n,
            correlation_type="Kendall's Tau",
            standard_error=se,
            interpretation=self._interpret_correlation(tau, p_value)
        )

        return result

    def auto_correlation(self, x: Union[List, np.ndarray],
                        y: Union[List, np.ndarray],
                        confidence_level: float = 0.95) -> Dict[str, Any]:
        """
        Automatically select and perform the most appropriate correlation test.

        Returns:
            Dictionary containing recommendation, all results, and guidance
        """
        # Get recommendation
        recommendation = self.recommend_correlation_test(x, y)

        # Perform all three correlations for comparison
        results = {}

        # Pearson
        try:
            results['pearson'] = self.pearson_correlation(x, y, confidence_level)
        except Exception as e:
            logger.warning(f"Pearson correlation failed: {e}")
            results['pearson'] = None

        # Spearman
        try:
            results['spearman'] = self.spearman_correlation(x, y, confidence_level)
        except Exception as e:
            logger.warning(f"Spearman correlation failed: {e}")
            results['spearman'] = None

        # Kendall
        try:
            results['kendall'] = self.kendall_tau(x, y, confidence_level)
        except Exception as e:
            logger.warning(f"Kendall correlation failed: {e}")
            results['kendall'] = None

        # Get the recommended result
        recommended_result = results.get(recommendation.recommended_test.value)

        # Prepare comprehensive output
        output = {
            'recommendation': {
                'test': recommendation.recommended_test.value,
                'confidence': recommendation.confidence,
                'reasoning': recommendation.reasoning,
                'alternatives': [t.value for t in recommendation.alternative_tests],
                'warnings': recommendation.warnings
            },
            'primary_result': recommended_result,
            'all_results': results,
            'comparison': self._compare_correlations(results),
            'interpretation_guide': self._generate_interpretation_guide(recommended_result),
            'visualization_data': self._prepare_visualization_data(x, y, results)
        }

        return output

    def _calculate_ranks(self, data: np.ndarray) -> np.ndarray:
        """Calculate ranks for Spearman correlation, handling ties"""
        n = len(data)
        sorted_indices = np.argsort(data)
        ranks = np.empty(n)

        i = 0
        while i < n:
            j = i
            # Find all tied values
            while j < n - 1 and data[sorted_indices[j]] == data[sorted_indices[j + 1]]:
                j += 1

            # Assign average rank to all tied values
            avg_rank = (i + j + 2) / 2  # +1 for 1-based ranking, +1 for inclusive range
            for k in range(i, j + 1):
                ranks[sorted_indices[k]] = avg_rank

            i = j + 1

        return ranks

    def _fisher_z_transform(self, r: Decimal) -> Decimal:
        """Fisher's z-transformation for correlation coefficient"""
        if abs(r) >= 1:
            return Decimal('Infinity') if r > 0 else Decimal('-Infinity')

        # z = 0.5 * ln((1 + r) / (1 - r))
        return (((1 + r) / (1 - r)).ln()) / 2

    def _inverse_fisher_z(self, z: Decimal) -> Decimal:
        """Inverse Fisher's z-transformation"""
        try:
            # r = (exp(2z) - 1) / (exp(2z) + 1)
            # Handle extreme values
            if abs(z) > 10:
                return Decimal('1') if z > 0 else Decimal('-1')

            exp_2z = (2 * z).exp()
            return (exp_2z - 1) / (exp_2z + 1)
        except:
            # Return bounded value for extreme cases
            return Decimal('0.999') if z > 0 else Decimal('-0.999')

    def _interpret_correlation(self, r: Decimal, p_value: Decimal) -> str:
        """Provide interpretation of correlation strength and significance"""
        abs_r = abs(r)

        # Determine strength
        if abs_r < Decimal('0.1'):
            strength = "negligible"
        elif abs_r < Decimal('0.3'):
            strength = "weak"
        elif abs_r < Decimal('0.5'):
            strength = "moderate"
        elif abs_r < Decimal('0.7'):
            strength = "strong"
        else:
            strength = "very strong"

        # Determine direction
        direction = "positive" if r > 0 else "negative"

        # Determine significance
        if p_value < Decimal('0.001'):
            significance = "highly significant (p < 0.001)"
        elif p_value < Decimal('0.01'):
            significance = "very significant (p < 0.01)"
        elif p_value < Decimal('0.05'):
            significance = "significant (p < 0.05)"
        else:
            significance = "not significant (p ≥ 0.05)"

        return f"A {strength} {direction} correlation that is {significance}"

    def _compare_correlations(self, results: Dict[str, CorrelationResult]) -> Dict[str, Any]:
        """Compare results from different correlation methods"""
        comparison = {
            'agreement': None,
            'max_difference': None,
            'consistent_significance': None,
            'details': {}
        }

        valid_results = {k: v for k, v in results.items() if v is not None}

        if len(valid_results) < 2:
            return comparison

        coefficients = {k: float(v.correlation_coefficient) for k, v in valid_results.items()}
        p_values = {k: float(v.p_value) for k, v in valid_results.items()}

        # Check agreement
        all_positive = all(c > 0 for c in coefficients.values())
        all_negative = all(c < 0 for c in coefficients.values())
        comparison['agreement'] = 'strong' if (all_positive or all_negative) else 'weak'

        # Maximum difference
        if len(coefficients) > 1:
            comparison['max_difference'] = max(coefficients.values()) - min(coefficients.values())

        # Consistent significance
        all_significant = all(p < 0.05 for p in p_values.values())
        none_significant = all(p >= 0.05 for p in p_values.values())
        comparison['consistent_significance'] = all_significant or none_significant

        # Detailed comparison
        for method, result in valid_results.items():
            comparison['details'][method] = {
                'coefficient': str(result.correlation_coefficient)[:20],
                'p_value': str(result.p_value)[:20],
                'significant': float(result.p_value) < 0.05
            }

        return comparison

    def _generate_interpretation_guide(self, result: Optional[CorrelationResult]) -> Dict[str, str]:
        """Generate user-friendly interpretation guide"""
        if result is None:
            return {"error": "No result available for interpretation"}

        guide = {
            'what_it_means': "",
            'strength_interpretation': "",
            'practical_significance': "",
            'next_steps': "",
            'cautions': []
        }

        r = float(result.correlation_coefficient)
        p = float(result.p_value)

        # What it means
        if result.correlation_type == "Pearson":
            guide['what_it_means'] = "Measures linear relationship between continuous variables"
        elif result.correlation_type == "Spearman":
            guide['what_it_means'] = "Measures monotonic relationship, robust to outliers"
        else:  # Kendall
            guide['what_it_means'] = "Measures ordinal association, good for small samples"

        # Strength interpretation
        abs_r = abs(r)
        if abs_r < 0.1:
            guide['strength_interpretation'] = "Variables are essentially uncorrelated"
        elif abs_r < 0.3:
            guide['strength_interpretation'] = "Weak correlation - minimal practical relationship"
        elif abs_r < 0.5:
            guide['strength_interpretation'] = "Moderate correlation - noticeable relationship"
        elif abs_r < 0.7:
            guide['strength_interpretation'] = "Strong correlation - substantial relationship"
        else:
            guide['strength_interpretation'] = "Very strong correlation - variables highly related"

        # Practical significance
        r_squared = r ** 2
        guide['practical_significance'] = f"{r_squared*100:.1f}% of variance in one variable is explained by the other"

        # Next steps
        if p < 0.05:
            if abs_r > 0.5:
                guide['next_steps'] = "Consider regression analysis to model the relationship"
            else:
                guide['next_steps'] = "Relationship exists but is weak - investigate other factors"
        else:
            guide['next_steps'] = "No significant relationship found - consider different variables or non-linear methods"

        # Cautions
        guide['cautions'] = [
            "Correlation does not imply causation",
            "Check for confounding variables",
            "Verify assumptions are met for the test used"
        ]

        return guide

    def _prepare_visualization_data(self, x: Union[List, np.ndarray],
                                   y: Union[List, np.ndarray],
                                   results: Dict[str, CorrelationResult]) -> Dict[str, Any]:
        """Prepare data for visualization"""
        x_arr = np.array(x)
        y_arr = np.array(y)

        viz_data = {
            'scatter_plot': {
                'x': x_arr.tolist(),
                'y': y_arr.tolist(),
                'x_label': 'Variable X',
                'y_label': 'Variable Y'
            },
            'regression_line': None,
            'confidence_bands': None,
            'distribution_plots': {
                'x_histogram': np.histogram(x_arr, bins='auto'),
                'y_histogram': np.histogram(y_arr, bins='auto')
            },
            'correlation_matrix': None,
            'qq_plots': {
                'x': stats.probplot(x_arr),
                'y': stats.probplot(y_arr)
            }
        }

        # Add regression line for Pearson correlation
        if 'pearson' in results and results['pearson'] is not None:
            slope, intercept, _, _, _ = stats.linregress(x_arr, y_arr)
            x_line = np.array([x_arr.min(), x_arr.max()])
            y_line = slope * x_line + intercept

            viz_data['regression_line'] = {
                'x': x_line.tolist(),
                'y': y_line.tolist(),
                'equation': f"y = {slope:.3f}x + {intercept:.3f}"
            }

        return viz_data


def create_correlation_comparison_table(results: Dict[str, CorrelationResult]) -> str:
    """Create a formatted comparison table of correlation results"""
    table = "\n" + "="*80 + "\n"
    table += "CORRELATION COMPARISON TABLE\n"
    table += "="*80 + "\n"
    table += f"{'Method':<15} {'Coefficient':<20} {'P-value':<15} {'95% CI':<30}\n"
    table += "-"*80 + "\n"

    for method, result in results.items():
        if result is not None:
            coef = str(result.correlation_coefficient)[:18]
            p_val = str(result.p_value)[:13]
            ci = f"[{str(result.confidence_interval_lower)[:12]}, {str(result.confidence_interval_upper)[:12]}]"
            table += f"{method:<15} {coef:<20} {p_val:<15} {ci:<30}\n"

    table += "="*80 + "\n"
    return table