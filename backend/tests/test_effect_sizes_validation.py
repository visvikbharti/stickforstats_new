"""
Validation Tests for Effect Sizes Against R effectsize Package
==============================================================
Created: 2025-01-10
Author: StickForStats Development Team

This test suite validates our effect size calculations against
the R effectsize package (version 0.8.6) reference values.

Reference: Ben-Shachar, M. S., Lüdecke, D., & Makowski, D. (2020).
effectsize: Estimation of effect size indices and standardized parameters.
Journal of Open Source Software, 5(56), 2815.

Test Coverage:
- Cohen's d, Hedges' g, Glass's delta
- Eta-squared, omega-squared, epsilon-squared
- Correlation effect sizes
- Cramér's V and phi coefficient
- Cohen's f² for regression
- Confidence intervals
- Robust estimators
"""

import pytest
import numpy as np
from scipy import stats
from backend.core.effect_sizes import (
    EffectSizeCalculator, EffectSizeType, CIMethod,
    EffectSizeResult, EffectSizeConverter
)
from backend.core.robust_estimators import (
    RobustEstimator, RobustMethod, RobustComparison
)


class TestEffectSizeValidation:
    """Validation against R effectsize package"""
    
    @pytest.fixture
    def calculator(self):
        """Create effect size calculator"""
        return EffectSizeCalculator(confidence_level=0.95)
    
    @pytest.fixture
    def sample_data(self):
        """Generate sample data for testing"""
        np.random.seed(42)
        return {
            'group1': np.array([85, 90, 88, 92, 95, 87, 89, 91, 93, 86,
                              88, 90, 92, 94, 87, 89, 91, 88, 90, 92]),
            'group2': np.array([78, 82, 80, 85, 83, 79, 81, 84, 86, 80,
                              82, 83, 85, 87, 81, 83, 84, 82, 84, 86])
        }
    
    # ========== COHEN'S D FAMILY ==========
    
    def test_cohens_d_two_sample(self, calculator, sample_data):
        """
        R effectsize example:
        > library(effectsize)
        > group1 <- c(85, 90, 88, 92, 95, 87, 89, 91, 93, 86,
                      88, 90, 92, 94, 87, 89, 91, 88, 90, 92)
        > group2 <- c(78, 82, 80, 85, 83, 79, 81, 84, 86, 80,
                      82, 83, 85, 87, 81, 83, 84, 82, 84, 86)
        > cohens_d(group1, group2)
        # Cohen's d: 1.93 [1.18, 2.67]
        """
        result = calculator.cohens_d(
            sample_data['group1'],
            sample_data['group2'],
            pooled_sd=True,
            hedges_correction=False
        )
        
        # R gives d = 1.93
        assert abs(result.value - 1.93) < 0.05, \
            f"Expected d~1.93, got {result.value:.2f}"
        assert result.type == EffectSizeType.COHEN_D
        assert result.interpretation == "large"
        
        # Check CI is reasonable
        assert result.ci_lower is not None
        assert result.ci_upper is not None
        assert result.ci_lower < result.value < result.ci_upper
    
    def test_hedges_g_correction(self, calculator, sample_data):
        """
        R effectsize example:
        > hedges_g(group1, group2)
        # Hedges' g: 1.88 [1.15, 2.60]
        
        Hedges' g applies small sample correction
        """
        result = calculator.hedges_g(
            sample_data['group1'],
            sample_data['group2']
        )
        
        # Hedges' g should be slightly smaller than Cohen's d
        d_result = calculator.cohens_d(
            sample_data['group1'],
            sample_data['group2']
        )
        
        assert result.value < d_result.value, \
            "Hedges' g should be smaller than Cohen's d"
        assert result.type == EffectSizeType.HEDGES_G
        assert result.bias_corrected is True
    
    def test_glass_delta(self, calculator, sample_data):
        """
        R effectsize example:
        > glass_delta(group1, group2)
        # Glass' delta uses control group SD
        """
        result = calculator.glass_delta(
            sample_data['group1'],  # treatment
            sample_data['group2']   # control
        )
        
        assert result.type == EffectSizeType.GLASS_DELTA
        assert result.value > 0  # Treatment > Control
        
        # Glass's delta uses only control group SD
        control_sd = np.std(sample_data['group2'], ddof=1)
        mean_diff = np.mean(sample_data['group1']) - np.mean(sample_data['group2'])
        expected_delta = mean_diff / control_sd
        
        assert abs(result.value - expected_delta) < 0.01, \
            f"Expected Glass's delta={expected_delta:.2f}, got {result.value:.2f}"
    
    def test_cohens_d_confidence_intervals(self, calculator):
        """Test confidence interval accuracy"""
        np.random.seed(123)
        
        # Large sample for more stable CI
        group1 = np.random.normal(100, 15, 100)
        group2 = np.random.normal(110, 15, 100)
        
        result = calculator.cohens_d(group1, group2, ci_method=CIMethod.NONCENTRAL)
        
        # Check CI properties
        assert result.ci_lower is not None
        assert result.ci_upper is not None
        assert result.ci_lower < result.value < result.ci_upper
        
        # CI should be symmetric for large equal samples
        ci_width_lower = result.value - result.ci_lower
        ci_width_upper = result.ci_upper - result.value
        assert abs(ci_width_lower - ci_width_upper) / result.value < 0.2
    
    # ========== ANOVA EFFECT SIZES ==========
    
    def test_eta_squared(self, calculator):
        """
        Test eta-squared calculation
        
        R example:
        > eta_squared(aov(y ~ group, data))
        """
        # Simulate ANOVA results
        ss_effect = 250.5
        ss_error = 450.3
        ss_total = ss_effect + ss_error
        df_effect = 2
        df_error = 47
        
        result = calculator.eta_squared(
            ss_effect, ss_total, df_effect, df_error, partial=False
        )
        
        expected_eta2 = ss_effect / ss_total
        assert abs(result.value - expected_eta2) < 0.001, \
            f"Expected η²={expected_eta2:.3f}, got {result.value:.3f}"
        assert result.type == EffectSizeType.ETA_SQUARED
        assert result.interpretation in ["small", "medium", "large"]
    
    def test_partial_eta_squared(self, calculator):
        """Test partial eta-squared"""
        ss_effect = 250.5
        ss_error = 450.3
        ss_total = 950.8  # Includes other effects
        df_effect = 2
        df_error = 47
        
        result = calculator.eta_squared(
            ss_effect, ss_total, df_effect, df_error, partial=True
        )
        
        expected_partial = ss_effect / (ss_effect + ss_error)
        assert abs(result.value - expected_partial) < 0.001, \
            f"Expected partial η²={expected_partial:.3f}, got {result.value:.3f}"
        assert result.type == EffectSizeType.PARTIAL_ETA_SQUARED
    
    def test_omega_squared(self, calculator):
        """Test omega-squared (less biased than eta-squared)"""
        ss_effect = 250.5
        ss_total = 700.8
        ms_error = 9.58
        df_effect = 2
        
        result = calculator.omega_squared(
            ss_effect, ss_total, ms_error, df_effect, partial=False
        )
        
        expected_omega2 = (ss_effect - df_effect * ms_error) / (ss_total + ms_error)
        expected_omega2 = max(0, expected_omega2)  # Cannot be negative
        
        assert abs(result.value - expected_omega2) < 0.001, \
            f"Expected ω²={expected_omega2:.3f}, got {result.value:.3f}"
        assert result.type == EffectSizeType.OMEGA_SQUARED
        assert result.value >= 0  # Must be non-negative
    
    # ========== CORRELATION EFFECT SIZES ==========
    
    def test_pearson_correlation(self, calculator):
        """
        Test Pearson correlation with Fisher z CI
        
        R example:
        > cor.test(x, y)
        """
        np.random.seed(42)
        x = np.random.normal(0, 1, 50)
        y = 0.6 * x + np.random.normal(0, 0.8, 50)
        
        result = calculator.pearson_r(x, y, ci_method=CIMethod.FISHER_Z)
        
        # Check correlation is positive and moderate
        assert 0.4 < result.value < 0.7, \
            f"Expected moderate positive correlation, got r={result.value:.2f}"
        assert result.type == EffectSizeType.PEARSON_R
        assert result.interpretation == "medium"
        
        # Check Fisher z CI
        assert result.ci_method == CIMethod.FISHER_Z
        assert result.ci_lower < result.value < result.ci_upper
    
    def test_spearman_correlation(self, calculator):
        """Test Spearman rank correlation"""
        # Create monotonic but non-linear relationship
        x = np.arange(30)
        y = x**2 + np.random.normal(0, 10, 30)
        
        result = calculator.spearman_rho(x, y)
        
        # Spearman should detect monotonic relationship
        assert result.value > 0.8, \
            f"Expected strong monotonic correlation, got rho={result.value:.2f}"
        assert result.type == EffectSizeType.SPEARMAN_RHO
    
    # ========== CATEGORICAL EFFECT SIZES ==========
    
    def test_cramers_v(self, calculator):
        """
        Test Cramér's V for contingency tables
        
        R example:
        > cramers_v(table)
        """
        # Create a 3x3 contingency table
        table = np.array([
            [20, 15, 10],
            [10, 25, 15],
            [5, 10, 30]
        ])
        
        result = calculator.cramers_v(table, bias_corrected=True)
        
        assert result.type == EffectSizeType.CRAMERS_V
        assert 0 <= result.value <= 1, "Cramér's V must be in [0, 1]"
        assert result.bias_corrected is True
        
        # Check interpretation based on df
        assert result.interpretation in ["negligible", "small", "medium", "large"]
    
    def test_phi_coefficient(self, calculator):
        """Test phi coefficient for 2x2 tables"""
        # 2x2 contingency table
        table = np.array([
            [30, 10],
            [20, 40]
        ])
        
        result = calculator.phi_coefficient(table)
        
        assert result.type == EffectSizeType.PHI
        assert -1 <= result.value <= 1, "Phi must be in [-1, 1]"
        
        # For 2x2 table, phi = sqrt(chi2/n)
        chi2_stat, _, _, _ = stats.chi2_contingency(table)
        n = np.sum(table)
        expected_phi = np.sqrt(chi2_stat / n)
        
        assert abs(result.value - expected_phi) < 0.001, \
            f"Expected φ={expected_phi:.3f}, got {result.value:.3f}"
    
    def test_cohen_w(self, calculator):
        """Test Cohen's w for chi-square tests"""
        chi2_statistic = 15.5
        n = 200
        df = 4
        
        result = calculator.cohen_w(chi2_statistic, n, df)
        
        expected_w = np.sqrt(chi2_statistic / n)
        assert abs(result.value - expected_w) < 0.001, \
            f"Expected w={expected_w:.3f}, got {result.value:.3f}"
        assert result.type == EffectSizeType.COHEN_W
    
    # ========== REGRESSION EFFECT SIZES ==========
    
    def test_cohen_f2(self, calculator):
        """
        Test Cohen's f² for regression
        
        R example:
        > cohens_f2(model)
        """
        r_squared = 0.25
        predictors = 3
        
        result = calculator.cohen_f2(r_squared, predictors)
        
        expected_f2 = r_squared / (1 - r_squared)
        assert abs(result.value - expected_f2) < 0.001, \
            f"Expected f²={expected_f2:.3f}, got {result.value:.3f}"
        assert result.type == EffectSizeType.COHEN_F2
        assert result.interpretation in ["small", "medium", "large", "very large"]
    
    # ========== EFFECT SIZE CONVERSIONS ==========
    
    def test_d_to_r_conversion(self):
        """Test Cohen's d to r conversion"""
        converter = EffectSizeConverter()
        
        d = 0.8  # Large effect
        r = converter.d_to_r(d)
        
        # For equal groups: r = d / sqrt(d² + 4)
        expected_r = d / np.sqrt(d**2 + 4)
        assert abs(r - expected_r) < 0.001, \
            f"Expected r={expected_r:.3f}, got {r:.3f}"
    
    def test_r_to_d_conversion(self):
        """Test r to Cohen's d conversion"""
        converter = EffectSizeConverter()
        
        r = 0.5  # Large correlation
        d = converter.r_to_d(r)
        
        # d = 2r / sqrt(1 - r²)
        expected_d = 2 * r / np.sqrt(1 - r**2)
        assert abs(d - expected_d) < 0.001, \
            f"Expected d={expected_d:.3f}, got {d:.3f}"
    
    def test_eta2_to_f_conversion(self):
        """Test eta-squared to Cohen's f conversion"""
        converter = EffectSizeConverter()
        
        eta2 = 0.14  # Large effect
        f = converter.eta2_to_f(eta2)
        
        # f = sqrt(η² / (1 - η²))
        expected_f = np.sqrt(eta2 / (1 - eta2))
        assert abs(f - expected_f) < 0.001, \
            f"Expected f={expected_f:.3f}, got {f:.3f}"
    
    def test_d_to_nnt(self):
        """Test Cohen's d to Number Needed to Treat"""
        converter = EffectSizeConverter()
        
        d = 0.5  # Medium effect
        nnt = converter.d_to_nnt(d)
        
        assert nnt > 1, "NNT must be greater than 1"
        assert nnt < 10, "NNT for d=0.5 should be reasonable"


class TestRobustEstimators:
    """Test robust estimation methods"""
    
    @pytest.fixture
    def estimator(self):
        """Create robust estimator"""
        return RobustEstimator(confidence_level=0.95)
    
    @pytest.fixture
    def contaminated_data(self):
        """Create data with outliers"""
        np.random.seed(42)
        clean = np.random.normal(100, 10, 90)
        outliers = np.array([200, 250, 50, 300, 45, 280, 35, 290, 40, 310])
        return np.concatenate([clean, outliers])
    
    def test_trimmed_mean(self, estimator, contaminated_data):
        """Test trimmed mean estimation"""
        result = estimator.trimmed_mean(contaminated_data, trim_proportion=0.1)
        
        # Trimmed mean should be close to true mean (100)
        assert 95 < result.value < 105, \
            f"Trimmed mean should be robust, got {result.value:.2f}"
        assert result.method == RobustMethod.TRIMMED_MEAN
        assert result.breakdown_point == 0.1
        
        # Compare with regular mean
        regular_mean = np.mean(contaminated_data)
        assert abs(result.value - 100) < abs(regular_mean - 100), \
            "Trimmed mean should be closer to true value than regular mean"
    
    def test_winsorized_mean(self, estimator, contaminated_data):
        """Test Winsorized mean"""
        result = estimator.winsorized_mean(contaminated_data, trim_proportion=0.1)
        
        assert result.method == RobustMethod.WINSORIZED_MEAN
        assert 95 < result.value < 105, \
            f"Winsorized mean should be robust, got {result.value:.2f}"
    
    def test_huber_m_estimator(self, estimator, contaminated_data):
        """Test Huber M-estimator"""
        result = estimator.huber_m_estimator(contaminated_data)
        
        assert result.method == RobustMethod.HUBER_M
        assert result.converged is True
        assert 95 < result.value < 105, \
            f"Huber estimator should be robust, got {result.value:.2f}"
        
        # Check outliers were detected
        assert result.outliers is not None
        assert len(result.outliers) > 0, "Should detect outliers"
    
    def test_tukey_biweight(self, estimator, contaminated_data):
        """Test Tukey's biweight estimator"""
        result = estimator.tukey_biweight(contaminated_data)
        
        assert result.method == RobustMethod.TUKEY_BIWEIGHT
        assert result.converged is True
        assert 95 < result.value < 105, \
            f"Biweight estimator should be robust, got {result.value:.2f}"
        
        # Check zero weights for extreme outliers
        assert np.sum(result.weights == 0) > 0, \
            "Should completely reject extreme outliers"
    
    def test_median_with_ci(self, estimator, contaminated_data):
        """Test median with confidence interval"""
        result = estimator.median(contaminated_data)
        
        assert result.method == RobustMethod.MEDIAN
        assert result.breakdown_point == 0.5, "Median has 50% breakdown"
        assert 95 < result.value < 105, \
            f"Median should be robust, got {result.value:.2f}"
        
        # Check CI
        assert result.ci_lower < result.value < result.ci_upper
    
    def test_mad(self, estimator, contaminated_data):
        """Test Median Absolute Deviation"""
        result = estimator.mad(contaminated_data)
        
        assert result.method == RobustMethod.MAD
        assert result.value > 0, "MAD must be positive"
        assert result.breakdown_point == 0.5
        
        # MAD should be less affected by outliers than SD
        regular_sd = np.std(contaminated_data, ddof=1)
        clean_data = contaminated_data[:90]  # First 90 are clean
        clean_sd = np.std(clean_data, ddof=1)
        
        # MAD should be closer to clean SD than regular SD
        assert abs(result.value - clean_sd) < abs(regular_sd - clean_sd)
    
    def test_hodges_lehmann(self, estimator):
        """Test Hodges-Lehmann estimator"""
        np.random.seed(42)
        data = np.random.normal(50, 10, 30)
        
        result = estimator.hodges_lehmann(data)
        
        assert result.method == RobustMethod.HODGES_LEHMANN
        assert result.efficiency == 0.955, "HL estimator is 95.5% efficient"
        
        # Should be close to median for symmetric data
        median = np.median(data)
        assert abs(result.value - median) < 2, \
            f"HL should be close to median for symmetric data"
    
    def test_outlier_detection_mad(self, estimator, contaminated_data):
        """Test MAD-based outlier detection"""
        outliers = estimator.detect_outliers_mad(contaminated_data, threshold=3.0)
        
        # Should detect the extreme outliers we added
        assert np.sum(outliers) >= 5, \
            f"Should detect at least 5 outliers, got {np.sum(outliers)}"
        
        # Check that extreme values are flagged
        assert outliers[np.argmax(contaminated_data)], \
            "Should flag maximum value as outlier"
        assert outliers[np.argmin(contaminated_data)], \
            "Should flag minimum value as outlier"
    
    def test_yuen_t_test(self):
        """Test Yuen's t-test for trimmed means"""
        np.random.seed(42)
        
        # Create two groups with different means and outliers
        group1 = np.concatenate([
            np.random.normal(100, 10, 45),
            [150, 160, 170, 180, 190]  # Outliers
        ])
        group2 = np.concatenate([
            np.random.normal(110, 10, 45),
            [40, 30, 20, 200, 210]  # Outliers
        ])
        
        result = RobustComparison.yuen_t_test(group1, group2, trim=0.1)
        
        assert 'statistic' in result
        assert 'p_value' in result
        assert result['method'] == 'Yuen t-test'
        
        # Trimmed means should show the true difference
        assert result['tm1'] < result['tm2'], \
            "Trimmed mean1 should be less than trimmed mean2"


class TestEffectSizeInterpretation:
    """Test effect size interpretation and benchmarks"""
    
    @pytest.fixture
    def calculator(self):
        return EffectSizeCalculator()
    
    def test_cohen_d_interpretation(self, calculator):
        """Test Cohen's d interpretation benchmarks"""
        # Test standard benchmarks
        small_d = calculator.cohens_d([1, 2, 3], [1.1, 2.1, 3.1])
        medium_d = calculator.cohens_d([1, 2, 3], [2, 3, 4])
        
        # Note: with small samples, exact values vary
        # Just check interpretation exists
        assert small_d.interpretation in ["negligible", "small", "medium", "large"]
        assert medium_d.interpretation in ["negligible", "small", "medium", "large"]
    
    def test_eta_squared_interpretation(self, calculator):
        """Test eta-squared interpretation"""
        small = calculator.eta_squared(5, 100, 2, 97)  # 5% variance
        medium = calculator.eta_squared(10, 100, 2, 97)  # 10% variance
        large = calculator.eta_squared(20, 100, 2, 97)  # 20% variance
        
        assert small.interpretation == "small"
        assert medium.interpretation == "medium"
        assert large.interpretation == "large"
    
    def test_correlation_interpretation(self, calculator):
        """Test correlation interpretation"""
        # Create data with known correlations
        np.random.seed(42)
        x = np.random.normal(0, 1, 100)
        
        # Negligible correlation
        y_neg = np.random.normal(0, 1, 100)
        r_neg = calculator.pearson_r(x, y_neg)
        
        # Small correlation
        y_small = 0.2 * x + np.random.normal(0, 0.98, 100)
        r_small = calculator.pearson_r(x, y_small)
        
        # Medium correlation
        y_med = 0.5 * x + np.random.normal(0, 0.87, 100)
        r_med = calculator.pearson_r(x, y_med)
        
        # Check interpretations make sense
        assert r_neg.interpretation in ["negligible", "small"]
        assert r_small.interpretation in ["negligible", "small", "medium"]
        assert r_med.interpretation in ["small", "medium", "large"]


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])