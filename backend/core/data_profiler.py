"""
Data Profiling System for StickForStats
========================================
Created: 2025-08-06 10:51:00 UTC
Author: StickForStats Development Team
Version: 1.0.0

This module implements the intelligent data exploration system that automatically
profiles datasets and provides comprehensive analysis for statistical test selection.

Scientific Rigor Level: MAXIMUM
Validation: Required against R and Python scipy
Coverage Target: 95%
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import warnings
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VariableType(Enum):
    """Enumeration of variable types with scientific precision"""
    CONTINUOUS = "continuous"
    ORDINAL = "ordinal"
    NOMINAL = "nominal"
    BINARY = "binary"
    DATE_TIME = "datetime"
    TEXT = "text"
    UNKNOWN = "unknown"


class DistributionType(Enum):
    """Enumeration of statistical distributions"""
    NORMAL = "normal"
    EXPONENTIAL = "exponential"
    POISSON = "poisson"
    BINOMIAL = "binomial"
    UNIFORM = "uniform"
    LOGNORMAL = "lognormal"
    GAMMA = "gamma"
    BETA = "beta"
    WEIBULL = "weibull"
    UNKNOWN = "unknown"


@dataclass
class VariableProfile:
    """Complete profile of a single variable"""
    name: str
    type: VariableType
    n_observations: int
    n_missing: int
    missing_percentage: float
    n_unique: int
    
    # Descriptive statistics (for continuous/ordinal)
    mean: Optional[float] = None
    median: Optional[float] = None
    mode: Optional[float] = None
    std: Optional[float] = None
    variance: Optional[float] = None
    min: Optional[float] = None
    max: Optional[float] = None
    q1: Optional[float] = None
    q3: Optional[float] = None
    iqr: Optional[float] = None
    skewness: Optional[float] = None
    kurtosis: Optional[float] = None
    
    # Distribution analysis
    distribution: Optional[DistributionType] = None
    distribution_params: Dict[str, float] = field(default_factory=dict)
    normality_test_statistic: Optional[float] = None
    normality_p_value: Optional[float] = None
    
    # Outlier analysis
    n_outliers_iqr: int = 0
    n_outliers_zscore: int = 0
    outlier_indices_iqr: List[int] = field(default_factory=list)
    outlier_indices_zscore: List[int] = field(default_factory=list)
    
    # Categorical analysis (for nominal/ordinal)
    categories: List[Any] = field(default_factory=list)
    category_counts: Dict[Any, int] = field(default_factory=dict)
    category_proportions: Dict[Any, float] = field(default_factory=dict)
    chi_square_statistic: Optional[float] = None
    chi_square_p_value: Optional[float] = None
    
    # Quality indicators
    has_negative_values: bool = False
    has_zero_values: bool = False
    has_infinite_values: bool = False
    is_constant: bool = False
    
    # Recommendations
    suggested_transformations: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class DatasetProfile:
    """Complete profile of an entire dataset"""
    n_rows: int
    n_columns: int
    total_missing: int
    missing_pattern: str  # MCAR, MAR, MNAR
    memory_usage_mb: float
    
    # Variable profiles
    variables: Dict[str, VariableProfile] = field(default_factory=dict)
    
    # Correlation analysis
    correlation_matrix: Optional[pd.DataFrame] = None
    high_correlations: List[Tuple[str, str, float]] = field(default_factory=list)
    multicollinearity_detected: bool = False
    vif_scores: Dict[str, float] = field(default_factory=dict)
    
    # Dataset characteristics
    is_balanced: bool = True
    has_temporal_component: bool = False
    has_hierarchical_structure: bool = False
    
    # Statistical test recommendations
    recommended_tests: List[str] = field(default_factory=list)
    test_assumptions_met: Dict[str, bool] = field(default_factory=dict)
    
    # Metadata
    profiling_timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    profiling_duration_seconds: float = 0.0
    validation_status: str = "pending"


class DataProfiler:
    """
    Intelligent Data Profiling System
    
    This class provides comprehensive data profiling capabilities with
    scientific rigor and statistical validation at every step.
    """
    
    def __init__(self, validate_against_r: bool = True):
        """
        Initialize the Data Profiler
        
        Args:
            validate_against_r: Whether to validate results against R
        """
        self.validate_against_r = validate_against_r
        logger.info(f"Data Profiler initialized at {datetime.now().isoformat()}")
        
    def profile_dataset(self, 
                       data: Union[pd.DataFrame, np.ndarray],
                       target_variable: Optional[str] = None) -> DatasetProfile:
        """
        Perform comprehensive profiling of a dataset
        
        Args:
            data: Input dataset
            target_variable: Optional target variable for supervised learning context
            
        Returns:
            DatasetProfile: Complete profile of the dataset
        """
        start_time = datetime.now()
        logger.info(f"Starting dataset profiling with shape {data.shape}")
        
        # Convert to DataFrame if necessary
        if isinstance(data, np.ndarray):
            data = pd.DataFrame(data)
            
        # Initialize profile
        profile = DatasetProfile(
            n_rows=len(data),
            n_columns=len(data.columns),
            total_missing=data.isnull().sum().sum(),
            memory_usage_mb=data.memory_usage(deep=True).sum() / 1e6
        )
        
        # Profile each variable
        for column in data.columns:
            profile.variables[column] = self._profile_variable(data[column], column)
            
        # Analyze missing data patterns
        profile.missing_pattern = self._analyze_missing_pattern(data)
        
        # Correlation analysis for continuous variables
        continuous_vars = [col for col, var_profile in profile.variables.items() 
                          if var_profile.type == VariableType.CONTINUOUS]
        
        if len(continuous_vars) >= 2:
            profile.correlation_matrix = data[continuous_vars].corr()
            profile.high_correlations = self._find_high_correlations(
                profile.correlation_matrix
            )
            profile.multicollinearity_detected = len(profile.high_correlations) > 0
            
            # Calculate VIF for multicollinearity
            if len(continuous_vars) >= 3:
                profile.vif_scores = self._calculate_vif(data[continuous_vars])
        
        # Generate test recommendations
        profile.recommended_tests = self._recommend_statistical_tests(
            profile, target_variable
        )
        
        # Check test assumptions
        profile.test_assumptions_met = self._check_test_assumptions(
            data, profile, target_variable
        )
        
        # Calculate profiling duration
        profile.profiling_duration_seconds = (
            datetime.now() - start_time
        ).total_seconds()
        
        logger.info(f"Profiling completed in {profile.profiling_duration_seconds:.2f} seconds")
        
        # Validate if requested
        if self.validate_against_r:
            profile.validation_status = self._validate_profile(profile)
            
        return profile
    
    def _profile_variable(self, series: pd.Series, name: str) -> VariableProfile:
        """
        Profile a single variable with comprehensive statistical analysis
        
        Args:
            series: Variable data
            name: Variable name
            
        Returns:
            VariableProfile: Complete profile of the variable
        """
        profile = VariableProfile(
            name=name,
            type=self._detect_variable_type(series),
            n_observations=len(series),
            n_missing=series.isnull().sum(),
            missing_percentage=series.isnull().sum() / len(series) * 100,
            n_unique=series.nunique()
        )
        
        # Remove missing values for analysis
        clean_series = series.dropna()
        
        if len(clean_series) == 0:
            profile.warnings.append("Variable contains only missing values")
            return profile
            
        # Check if constant
        profile.is_constant = profile.n_unique == 1
        if profile.is_constant:
            profile.warnings.append("Variable is constant (no variation)")
            
        # Profile based on variable type
        if profile.type in [VariableType.CONTINUOUS, VariableType.ORDINAL]:
            self._profile_continuous(clean_series, profile)
        elif profile.type in [VariableType.NOMINAL, VariableType.BINARY]:
            self._profile_categorical(clean_series, profile)
            
        return profile
    
    def _detect_variable_type(self, series: pd.Series) -> VariableType:
        """
        Intelligently detect the type of a variable
        
        Args:
            series: Variable data
            
        Returns:
            VariableType: Detected variable type
        """
        # Remove missing values
        clean_series = series.dropna()
        
        if len(clean_series) == 0:
            return VariableType.UNKNOWN
            
        # Check for datetime
        if pd.api.types.is_datetime64_any_dtype(series):
            return VariableType.DATE_TIME
            
        # Check for text
        if series.dtype == object:
            try:
                pd.to_numeric(clean_series)
            except (ValueError, TypeError):
                # Check if binary
                if clean_series.nunique() == 2:
                    return VariableType.BINARY
                # Likely categorical text
                return VariableType.NOMINAL
                
        # Numeric types
        n_unique = clean_series.nunique()
        n_total = len(clean_series)
        
        # Binary check
        if n_unique == 2:
            return VariableType.BINARY
            
        # Check if integer values only
        if all(clean_series == clean_series.astype(int)):
            # Likely ordinal or nominal if few unique values
            if n_unique < 10 or n_unique / n_total < 0.05:
                # Check if values have natural ordering
                if self._has_natural_ordering(clean_series):
                    return VariableType.ORDINAL
                else:
                    return VariableType.NOMINAL
                    
        # Default to continuous for numeric data
        return VariableType.CONTINUOUS
    
    def _has_natural_ordering(self, series: pd.Series) -> bool:
        """
        Check if categorical values have natural ordering
        
        Args:
            series: Variable data
            
        Returns:
            bool: True if natural ordering detected
        """
        unique_vals = sorted(series.unique())
        
        # Check for sequential integers
        if all(isinstance(v, (int, np.integer)) for v in unique_vals):
            expected = list(range(min(unique_vals), max(unique_vals) + 1))
            return unique_vals == expected
            
        return False
    
    def _profile_continuous(self, series: pd.Series, profile: VariableProfile) -> None:
        """
        Profile a continuous variable
        
        Args:
            series: Clean variable data
            profile: Variable profile to update
        """
        # Basic statistics
        profile.mean = float(series.mean())
        profile.median = float(series.median())
        profile.mode = float(series.mode()[0]) if len(series.mode()) > 0 else None
        profile.std = float(series.std())
        profile.variance = float(series.var())
        profile.min = float(series.min())
        profile.max = float(series.max())
        
        # Quartiles
        profile.q1 = float(series.quantile(0.25))
        profile.q3 = float(series.quantile(0.75))
        profile.iqr = profile.q3 - profile.q1
        
        # Shape statistics
        profile.skewness = float(stats.skew(series))
        profile.kurtosis = float(stats.kurtosis(series))
        
        # Distribution fitting
        profile.distribution, profile.distribution_params = self._fit_distribution(series)
        
        # Normality testing (Shapiro-Wilk for n < 5000, Anderson-Darling otherwise)
        if len(series) < 5000:
            stat, p_value = stats.shapiro(series)
        else:
            result = stats.anderson(series, dist='norm')
            stat = result.statistic
            # Use 5% significance level
            p_value = 0.05 if stat > result.critical_values[2] else 0.10
            
        profile.normality_test_statistic = float(stat)
        profile.normality_p_value = float(p_value)
        
        # Outlier detection
        self._detect_outliers(series, profile)
        
        # Quality checks
        profile.has_negative_values = (series < 0).any()
        profile.has_zero_values = (series == 0).any()
        profile.has_infinite_values = np.isinf(series).any()
        
        # Transformation suggestions
        if profile.skewness > 1:
            profile.suggested_transformations.append("log_transform")
            profile.suggested_transformations.append("sqrt_transform")
        elif profile.skewness < -1:
            profile.suggested_transformations.append("square_transform")
            profile.suggested_transformations.append("exp_transform")
            
        if profile.normality_p_value < 0.05:
            profile.warnings.append("Variable is not normally distributed (p < 0.05)")
            
    def _profile_categorical(self, series: pd.Series, profile: VariableProfile) -> None:
        """
        Profile a categorical variable
        
        Args:
            series: Clean variable data
            profile: Variable profile to update
        """
        # Category analysis
        profile.categories = series.unique().tolist()
        profile.category_counts = series.value_counts().to_dict()
        profile.category_proportions = series.value_counts(normalize=True).to_dict()
        
        # Chi-square test for uniformity
        observed = list(profile.category_counts.values())
        expected = [len(series) / len(profile.categories)] * len(profile.categories)
        
        if len(profile.categories) > 1:
            chi2, p_value = stats.chisquare(observed, expected)
            profile.chi_square_statistic = float(chi2)
            profile.chi_square_p_value = float(p_value)
            
        # Check for imbalance
        max_prop = max(profile.category_proportions.values())
        if max_prop > 0.9:
            profile.warnings.append(f"Highly imbalanced categories (max proportion: {max_prop:.2%})")
            
    def _fit_distribution(self, series: pd.Series) -> Tuple[DistributionType, Dict[str, float]]:
        """
        Fit various distributions and select the best one
        
        Args:
            series: Variable data
            
        Returns:
            Tuple of best distribution and its parameters
        """
        # Distributions to test
        distributions = {
            DistributionType.NORMAL: stats.norm,
            DistributionType.EXPONENTIAL: stats.expon,
            DistributionType.LOGNORMAL: stats.lognorm,
            DistributionType.GAMMA: stats.gamma,
            DistributionType.WEIBULL: stats.weibull_min,
            DistributionType.UNIFORM: stats.uniform,
            DistributionType.BETA: stats.beta
        }
        
        best_dist = DistributionType.UNKNOWN
        best_params = {}
        best_ks_statistic = np.inf
        
        for dist_name, dist_func in distributions.items():
            try:
                # Fit distribution
                params = dist_func.fit(series)
                
                # Kolmogorov-Smirnov test
                ks_statistic, ks_p_value = stats.kstest(series, 
                                                        lambda x: dist_func.cdf(x, *params))
                
                # Track best fit
                if ks_statistic < best_ks_statistic:
                    best_ks_statistic = ks_statistic
                    best_dist = dist_name
                    best_params = {f"param_{i}": float(p) for i, p in enumerate(params)}
                    best_params["ks_statistic"] = float(ks_statistic)
                    best_params["ks_p_value"] = float(ks_p_value)
                    
            except Exception as e:
                logger.debug(f"Failed to fit {dist_name}: {e}")
                continue
                
        return best_dist, best_params
    
    def _detect_outliers(self, series: pd.Series, profile: VariableProfile) -> None:
        """
        Detect outliers using multiple methods
        
        Args:
            series: Variable data
            profile: Variable profile to update
        """
        # IQR method
        q1 = series.quantile(0.25)
        q3 = series.quantile(0.75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outliers_iqr = (series < lower_bound) | (series > upper_bound)
        profile.n_outliers_iqr = outliers_iqr.sum()
        profile.outlier_indices_iqr = series[outliers_iqr].index.tolist()
        
        # Z-score method (for normally distributed data)
        z_scores = np.abs(stats.zscore(series))
        outliers_zscore = z_scores > 3
        profile.n_outliers_zscore = outliers_zscore.sum()
        profile.outlier_indices_zscore = series[outliers_zscore].index.tolist()
        
        # Add warnings for high outlier percentage
        outlier_pct = profile.n_outliers_iqr / len(series) * 100
        if outlier_pct > 10:
            profile.warnings.append(f"High outlier percentage: {outlier_pct:.1f}%")
            
    def _analyze_missing_pattern(self, data: pd.DataFrame) -> str:
        """
        Analyze the pattern of missing data
        
        Args:
            data: Dataset
            
        Returns:
            str: Missing data pattern (MCAR, MAR, MNAR)
        """
        # This is a simplified heuristic - true missing data analysis is complex
        missing_mask = data.isnull()
        
        # Check if missingness is related to other variables
        correlations = []
        for col in missing_mask.columns:
            for other_col in data.columns:
                if col != other_col and data[other_col].dtype in [np.float64, np.int64]:
                    # Check correlation between missingness and other variable
                    try:
                        corr = missing_mask[col].astype(int).corr(data[other_col])
                        if not np.isnan(corr):
                            correlations.append(abs(corr))
                    except:
                        continue
                        
        if not correlations:
            return "MCAR"  # Missing Completely At Random (assumed)
            
        max_corr = max(correlations)
        if max_corr > 0.3:
            return "MAR"  # Missing At Random
        elif max_corr > 0.1:
            return "MNAR"  # Missing Not At Random (potential)
        else:
            return "MCAR"  # Missing Completely At Random
            
    def _find_high_correlations(self, 
                               corr_matrix: pd.DataFrame,
                               threshold: float = 0.8) -> List[Tuple[str, str, float]]:
        """
        Find pairs of variables with high correlation
        
        Args:
            corr_matrix: Correlation matrix
            threshold: Correlation threshold
            
        Returns:
            List of (var1, var2, correlation) tuples
        """
        high_corr = []
        
        # Get upper triangle of correlation matrix
        upper_tri = corr_matrix.where(
            np.triu(np.ones(corr_matrix.shape), k=1).astype(bool)
        )
        
        # Find high correlations
        for column in upper_tri.columns:
            for index in upper_tri.index:
                value = upper_tri.loc[index, column]
                if abs(value) >= threshold:
                    high_corr.append((index, column, float(value)))
                    
        return high_corr
    
    def _calculate_vif(self, data: pd.DataFrame) -> Dict[str, float]:
        """
        Calculate Variance Inflation Factor for multicollinearity detection
        
        Args:
            data: Dataset with continuous variables
            
        Returns:
            Dictionary of VIF scores
        """
        vif_scores = {}
        
        for col in data.columns:
            # Prepare data
            X = data.drop(columns=[col])
            y = data[col]
            
            # Skip if not enough data
            if len(X) < len(X.columns) + 1:
                continue
                
            try:
                # Calculate R-squared
                from sklearn.linear_model import LinearRegression
                model = LinearRegression()
                model.fit(X, y)
                r_squared = model.score(X, y)
                
                # Calculate VIF
                vif = 1 / (1 - r_squared) if r_squared < 1 else np.inf
                vif_scores[col] = float(vif)
            except Exception as e:
                logger.debug(f"VIF calculation failed for {col}: {e}")
                
        return vif_scores
    
    def _recommend_statistical_tests(self,
                                    profile: DatasetProfile,
                                    target_variable: Optional[str] = None) -> List[str]:
        """
        Recommend appropriate statistical tests based on data profile
        
        Args:
            profile: Dataset profile
            target_variable: Optional target variable
            
        Returns:
            List of recommended test names
        """
        recommendations = []
        
        # Count variable types
        continuous_vars = [v for v in profile.variables.values() 
                          if v.type == VariableType.CONTINUOUS]
        categorical_vars = [v for v in profile.variables.values() 
                           if v.type in [VariableType.NOMINAL, VariableType.BINARY]]
        
        n_continuous = len(continuous_vars)
        n_categorical = len(categorical_vars)
        
        # Recommendations based on data characteristics
        if n_continuous >= 2:
            recommendations.append("correlation_analysis")
            recommendations.append("linear_regression")
            
            if n_continuous >= 3:
                recommendations.append("multiple_regression")
                recommendations.append("pca_analysis")
                
        if n_categorical >= 2:
            recommendations.append("chi_square_test")
            recommendations.append("contingency_analysis")
            
        if n_continuous >= 1 and n_categorical >= 1:
            recommendations.append("anova")
            recommendations.append("t_test")
            recommendations.append("ancova")
            
        # Check for normality
        normal_vars = [v for v in continuous_vars if v.normality_p_value 
                      and v.normality_p_value > 0.05]
        non_normal_vars = [v for v in continuous_vars if v.normality_p_value 
                          and v.normality_p_value <= 0.05]
        
        if non_normal_vars:
            recommendations.append("mann_whitney_u")
            recommendations.append("kruskal_wallis")
            recommendations.append("spearman_correlation")
            
        # Time series detection
        if any(v.type == VariableType.DATE_TIME for v in profile.variables.values()):
            recommendations.append("time_series_analysis")
            recommendations.append("arima")
            
        return recommendations
    
    def _check_test_assumptions(self,
                               data: pd.DataFrame,
                               profile: DatasetProfile,
                               target_variable: Optional[str] = None) -> Dict[str, bool]:
        """
        Check assumptions for common statistical tests
        
        Args:
            data: Dataset
            profile: Dataset profile
            target_variable: Optional target variable
            
        Returns:
            Dictionary of test assumptions met
        """
        assumptions = {}
        
        # T-test assumptions
        continuous_vars = [name for name, v in profile.variables.items() 
                          if v.type == VariableType.CONTINUOUS]
        
        if len(continuous_vars) >= 1:
            # Normality check
            assumptions["t_test_normality"] = any(
                profile.variables[v].normality_p_value > 0.05 
                for v in continuous_vars 
                if profile.variables[v].normality_p_value is not None
            )
            
            # Sample size check
            assumptions["t_test_sample_size"] = profile.n_rows >= 30
            
        # ANOVA assumptions
        if len(continuous_vars) >= 1:
            # Homogeneity of variance (simplified check)
            assumptions["anova_homogeneity"] = True  # Would need groups to properly test
            
            # Normality
            assumptions["anova_normality"] = assumptions.get("t_test_normality", False)
            
        # Regression assumptions
        if len(continuous_vars) >= 2:
            # Linearity (simplified - would need to check residuals)
            assumptions["regression_linearity"] = True
            
            # No multicollinearity
            assumptions["regression_no_multicollinearity"] = not profile.multicollinearity_detected
            
            # Independence (simplified - would need to check residuals)
            assumptions["regression_independence"] = True
            
        return assumptions
    
    def _validate_profile(self, profile: DatasetProfile) -> str:
        """
        Validate profile against R calculations (placeholder for actual R integration)
        
        Args:
            profile: Dataset profile
            
        Returns:
            str: Validation status
        """
        # This would integrate with R for validation
        # For now, return pending
        logger.info("R validation would be performed here")
        return "validation_pending"
    
    def generate_report(self, profile: DatasetProfile) -> str:
        """
        Generate a human-readable report from the profile
        
        Args:
            profile: Dataset profile
            
        Returns:
            str: Formatted report
        """
        report = []
        report.append("=" * 80)
        report.append("DATA PROFILING REPORT")
        report.append("=" * 80)
        report.append(f"Generated: {profile.profiling_timestamp}")
        report.append(f"Duration: {profile.profiling_duration_seconds:.2f} seconds")
        report.append("")
        
        # Dataset overview
        report.append("DATASET OVERVIEW")
        report.append("-" * 40)
        report.append(f"Rows: {profile.n_rows:,}")
        report.append(f"Columns: {profile.n_columns}")
        report.append(f"Missing Values: {profile.total_missing:,} ({profile.total_missing/profile.n_rows/profile.n_columns*100:.1f}%)")
        report.append(f"Missing Pattern: {profile.missing_pattern}")
        report.append(f"Memory Usage: {profile.memory_usage_mb:.2f} MB")
        report.append("")
        
        # Variable summaries
        report.append("VARIABLE PROFILES")
        report.append("-" * 40)
        
        for var_name, var_profile in profile.variables.items():
            report.append(f"\n{var_name} ({var_profile.type.value})")
            report.append(f"  Missing: {var_profile.missing_percentage:.1f}%")
            report.append(f"  Unique: {var_profile.n_unique}")
            
            if var_profile.type == VariableType.CONTINUOUS:
                report.append(f"  Mean: {var_profile.mean:.4f}")
                report.append(f"  Std: {var_profile.std:.4f}")
                report.append(f"  Distribution: {var_profile.distribution.value}")
                report.append(f"  Normality p-value: {var_profile.normality_p_value:.4f}")
                report.append(f"  Outliers (IQR): {var_profile.n_outliers_iqr}")
                
            if var_profile.warnings:
                report.append(f"  ⚠️ Warnings: {', '.join(var_profile.warnings)}")
                
        # Recommendations
        report.append("")
        report.append("STATISTICAL TEST RECOMMENDATIONS")
        report.append("-" * 40)
        for test in profile.recommended_tests:
            report.append(f"• {test}")
            
        # Assumptions
        report.append("")
        report.append("TEST ASSUMPTIONS")
        report.append("-" * 40)
        for test, met in profile.test_assumptions_met.items():
            status = "✓" if met else "✗"
            report.append(f"{status} {test}: {'Met' if met else 'Not Met'}")
            
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)