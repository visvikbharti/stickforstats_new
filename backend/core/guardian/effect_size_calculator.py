"""
Effect Size Calculator
======================
Calculates and interprets effect sizes for various statistical tests.
Provides publication-ready effect size reporting with interpretations.

Author: StickForStats Development Team
Date: October 2025
"""

import numpy as np
from scipy import stats
from typing import Dict, Any, List, Optional, Tuple


class EffectSizeCalculator:
    """
    Calculates effect sizes for statistical tests with interpretations
    following Cohen's (1988) and other standard guidelines.
    """

    # Standard interpretation thresholds (Cohen, 1988)
    COHEN_D_THRESHOLDS = {
        'negligible': 0.0,
        'small': 0.2,
        'medium': 0.5,
        'large': 0.8,
        'very_large': 1.2
    }

    CORRELATION_THRESHOLDS = {
        'negligible': 0.0,
        'small': 0.1,
        'medium': 0.3,
        'large': 0.5,
        'very_large': 0.7
    }

    ETA_SQUARED_THRESHOLDS = {
        'negligible': 0.0,
        'small': 0.01,
        'medium': 0.06,
        'large': 0.14
    }

    def calculate_cohens_d(self, group1: np.ndarray, group2: np.ndarray,
                          pooled: bool = True) -> Dict[str, Any]:
        """
        Calculate Cohen's d effect size for two groups

        Cohen's d measures the standardized difference between two means.
        It expresses the difference in standard deviation units.

        Parameters:
        -----------
        group1 : np.ndarray
            First group data
        group2 : np.ndarray
            Second group data
        pooled : bool
            Whether to use pooled standard deviation (default True)

        Returns:
        --------
        Dict with keys:
            - value: Cohen's d value
            - interpretation: Textual interpretation
            - magnitude: Category (negligible, small, medium, large, very_large)
            - ci_lower: Lower 95% confidence interval
            - ci_upper: Upper 95% confidence interval
        """
        # Clean data
        g1 = group1[~np.isnan(group1)]
        g2 = group2[~np.isnan(group2)]

        if len(g1) < 2 or len(g2) < 2:
            return {
                'value': None,
                'interpretation': 'Insufficient data',
                'magnitude': 'unknown',
                'ci_lower': None,
                'ci_upper': None
            }

        # Calculate means
        mean1 = np.mean(g1)
        mean2 = np.mean(g2)
        mean_diff = mean1 - mean2

        # Calculate standard deviations
        n1, n2 = len(g1), len(g2)
        var1, var2 = np.var(g1, ddof=1), np.var(g2, ddof=1)

        if pooled:
            # Pooled standard deviation
            pooled_var = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2)
            pooled_sd = np.sqrt(pooled_var)
            d = mean_diff / pooled_sd
        else:
            # Use control group SD (if group2 is control)
            d = mean_diff / np.sqrt(var2)

        # Calculate 95% confidence interval
        # Using Hedges and Olkin (1985) formula
        se_d = np.sqrt((n1 + n2) / (n1 * n2) + (d ** 2) / (2 * (n1 + n2)))
        ci_lower = d - 1.96 * se_d
        ci_upper = d + 1.96 * se_d

        # Interpret magnitude
        abs_d = abs(d)
        if abs_d < self.COHEN_D_THRESHOLDS['small']:
            magnitude = 'negligible'
            interpretation = f"Negligible effect (|d| = {abs_d:.3f})"
        elif abs_d < self.COHEN_D_THRESHOLDS['medium']:
            magnitude = 'small'
            interpretation = f"Small effect (|d| = {abs_d:.3f})"
        elif abs_d < self.COHEN_D_THRESHOLDS['large']:
            magnitude = 'medium'
            interpretation = f"Medium effect (|d| = {abs_d:.3f})"
        elif abs_d < self.COHEN_D_THRESHOLDS['very_large']:
            magnitude = 'large'
            interpretation = f"Large effect (|d| = {abs_d:.3f})"
        else:
            magnitude = 'very_large'
            interpretation = f"Very large effect (|d| = {abs_d:.3f})"

        return {
            'value': d,
            'interpretation': interpretation,
            'magnitude': magnitude,
            'ci_lower': ci_lower,
            'ci_upper': ci_upper,
            'formula': 'Cohen\'s d (pooled SD)' if pooled else 'Cohen\'s d (control SD)'
        }

    def calculate_correlation_effect_size(self, r: float, n: int) -> Dict[str, Any]:
        """
        Interpret correlation coefficient as effect size

        Parameters:
        -----------
        r : float
            Correlation coefficient
        n : int
            Sample size

        Returns:
        --------
        Dict with interpretation details
        """
        if r is None or np.isnan(r):
            return {
                'value': None,
                'interpretation': 'Invalid correlation',
                'magnitude': 'unknown',
                'ci_lower': None,
                'ci_upper': None
            }

        # Calculate 95% confidence interval using Fisher's z-transformation
        z = np.arctanh(r)  # Fisher's z
        se_z = 1 / np.sqrt(n - 3)
        z_lower = z - 1.96 * se_z
        z_upper = z + 1.96 * se_z
        ci_lower = np.tanh(z_lower)
        ci_upper = np.tanh(z_upper)

        # Interpret magnitude
        abs_r = abs(r)
        if abs_r < self.CORRELATION_THRESHOLDS['small']:
            magnitude = 'negligible'
            interpretation = f"Negligible correlation (|r| = {abs_r:.3f})"
        elif abs_r < self.CORRELATION_THRESHOLDS['medium']:
            magnitude = 'small'
            interpretation = f"Small correlation (|r| = {abs_r:.3f})"
        elif abs_r < self.CORRELATION_THRESHOLDS['large']:
            magnitude = 'medium'
            interpretation = f"Medium correlation (|r| = {abs_r:.3f})"
        elif abs_r < self.CORRELATION_THRESHOLDS['very_large']:
            magnitude = 'large'
            interpretation = f"Large correlation (|r| = {abs_r:.3f})"
        else:
            magnitude = 'very_large'
            interpretation = f"Very large correlation (|r| = {abs_r:.3f})"

        # Calculate coefficient of determination
        r_squared = r ** 2
        variance_explained = f"{r_squared * 100:.1f}% of variance explained"

        return {
            'value': r,
            'r_squared': r_squared,
            'interpretation': interpretation,
            'magnitude': magnitude,
            'ci_lower': ci_lower,
            'ci_upper': ci_upper,
            'variance_explained': variance_explained
        }

    def calculate_eta_squared(self, groups: List[np.ndarray]) -> Dict[str, Any]:
        """
        Calculate eta-squared (η²) effect size for ANOVA

        η² represents the proportion of total variance attributable
        to the factor (between-group differences).

        Parameters:
        -----------
        groups : List[np.ndarray]
            List of group arrays

        Returns:
        --------
        Dict with interpretation details
        """
        # Clean data
        cleaned_groups = []
        for group in groups:
            g = group[~np.isnan(group)]
            if len(g) > 0:
                cleaned_groups.append(g)

        if len(cleaned_groups) < 2:
            return {
                'value': None,
                'interpretation': 'Insufficient groups',
                'magnitude': 'unknown'
            }

        # Calculate between-group and within-group variance
        all_data = np.concatenate(cleaned_groups)
        grand_mean = np.mean(all_data)
        n_total = len(all_data)

        # Between-group sum of squares (SSB)
        ssb = sum(len(g) * (np.mean(g) - grand_mean) ** 2 for g in cleaned_groups)

        # Within-group sum of squares (SSW)
        ssw = sum(np.sum((g - np.mean(g)) ** 2) for g in cleaned_groups)

        # Total sum of squares (SST)
        sst = ssb + ssw

        # Eta-squared
        eta_squared = ssb / sst if sst > 0 else 0

        # Interpret magnitude
        if eta_squared < self.ETA_SQUARED_THRESHOLDS['small']:
            magnitude = 'negligible'
            interpretation = f"Negligible effect (η² = {eta_squared:.3f})"
        elif eta_squared < self.ETA_SQUARED_THRESHOLDS['medium']:
            magnitude = 'small'
            interpretation = f"Small effect (η² = {eta_squared:.3f})"
        elif eta_squared < self.ETA_SQUARED_THRESHOLDS['large']:
            magnitude = 'medium'
            interpretation = f"Medium effect (η² = {eta_squared:.3f})"
        else:
            magnitude = 'large'
            interpretation = f"Large effect (η² = {eta_squared:.3f})"

        variance_explained = f"{eta_squared * 100:.1f}% of variance explained by groups"

        return {
            'value': eta_squared,
            'interpretation': interpretation,
            'magnitude': magnitude,
            'variance_explained': variance_explained,
            'ssb': ssb,
            'ssw': ssw,
            'sst': sst
        }

    def calculate_cramers_v(self, chi2: float, n: int, min_dim: int) -> Dict[str, Any]:
        """
        Calculate Cramér's V effect size for chi-square tests

        Parameters:
        -----------
        chi2 : float
            Chi-square statistic
        n : int
            Total sample size
        min_dim : int
            min(rows-1, cols-1) for the contingency table

        Returns:
        --------
        Dict with interpretation details
        """
        if chi2 is None or n <= 0 or min_dim <= 0:
            return {
                'value': None,
                'interpretation': 'Invalid parameters',
                'magnitude': 'unknown'
            }

        # Calculate Cramér's V
        v = np.sqrt(chi2 / (n * min_dim))

        # Interpret magnitude (varies by df)
        if v < 0.1:
            magnitude = 'negligible'
            interpretation = f"Negligible association (V = {v:.3f})"
        elif v < 0.3:
            magnitude = 'small'
            interpretation = f"Small association (V = {v:.3f})"
        elif v < 0.5:
            magnitude = 'medium'
            interpretation = f"Medium association (V = {v:.3f})"
        else:
            magnitude = 'large'
            interpretation = f"Large association (V = {v:.3f})"

        return {
            'value': v,
            'interpretation': interpretation,
            'magnitude': magnitude
        }

    def generate_effect_size_report(self, test_type: str, data: Any,
                                   test_results: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Generate comprehensive effect size report for a given test

        Parameters:
        -----------
        test_type : str
            Type of statistical test
        data : Any
            Data used in the test
        test_results : Dict, optional
            Results from the statistical test

        Returns:
        --------
        Dict : Comprehensive effect size information
        """
        report = {
            'test_type': test_type,
            'effect_sizes': {},
            'interpretations': [],
            'recommendations': []
        }

        # Calculate appropriate effect sizes based on test type
        if test_type == 't_test' and isinstance(data, list) and len(data) == 2:
            cohens_d = self.calculate_cohens_d(data[0], data[1])
            report['effect_sizes']['cohens_d'] = cohens_d
            report['interpretations'].append(cohens_d['interpretation'])

            # Add reporting template
            d_val = cohens_d['value']
            if d_val is not None:
                report['recommendations'].append(
                    f"Report as: Cohen's d = {d_val:.3f}, "
                    f"95% CI [{cohens_d['ci_lower']:.3f}, {cohens_d['ci_upper']:.3f}], "
                    f"indicating a {cohens_d['magnitude']} effect size."
                )

        elif test_type == 'anova' and isinstance(data, list):
            eta_sq = self.calculate_eta_squared(data)
            report['effect_sizes']['eta_squared'] = eta_sq
            report['interpretations'].append(eta_sq['interpretation'])

            if eta_sq['value'] is not None:
                report['recommendations'].append(
                    f"Report as: η² = {eta_sq['value']:.3f}, "
                    f"{eta_sq['variance_explained']}, "
                    f"indicating a {eta_sq['magnitude']} effect size."
                )

        elif test_type in ['pearson', 'spearman'] and test_results:
            r = test_results.get('correlation')
            n = test_results.get('sample_size')
            if r is not None and n is not None:
                corr_effect = self.calculate_correlation_effect_size(r, n)
                report['effect_sizes']['correlation'] = corr_effect
                report['interpretations'].append(corr_effect['interpretation'])

                report['recommendations'].append(
                    f"Report as: r = {r:.3f}, "
                    f"95% CI [{corr_effect['ci_lower']:.3f}, {corr_effect['ci_upper']:.3f}], "
                    f"r² = {corr_effect['r_squared']:.3f} ({corr_effect['variance_explained']}), "
                    f"indicating a {corr_effect['magnitude']} effect size."
                )

        return report
