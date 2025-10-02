import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Any, List, Optional, Tuple
import logging
from django.conf import settings

from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)

class StatisticalUtilsService:
    """Service for common statistical utility functions."""
    
    @staticmethod
    @safe_operation
    def compute_descriptive_stats(data: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        Compute comprehensive descriptive statistics for numerical columns.
        
        Args:
            data: Input DataFrame
            
        Returns:
            Dictionary with column names as keys and statistics as values
        """
        stats_dict = {}
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            col_data = data[col].dropna()
            stats_dict[col] = {
                'mean': float(col_data.mean()),
                'median': float(col_data.median()),
                'std': float(col_data.std()),
                'min': float(col_data.min()),
                'max': float(col_data.max()),
                'q1': float(col_data.quantile(0.25)),
                'q3': float(col_data.quantile(0.75)),
                'iqr': float(col_data.quantile(0.75) - col_data.quantile(0.25)),
                'skewness': float(stats.skew(col_data)),
                'kurtosis': float(stats.kurtosis(col_data)),
                'range': float(col_data.max() - col_data.min()),
                'count': int(col_data.count()),
                'missing': int(data[col].isna().sum())
            }
        
        return stats_dict
    
    @staticmethod
    @safe_operation
    def perform_inferential_tests(data: pd.DataFrame) -> Dict[str, Dict[str, Any]]:
        """
        Perform relevant inferential statistical tests.
        
        Args:
            data: Input DataFrame
            
        Returns:
            Dictionary with test results for each numerical column
        """
        results = {}
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            col_data = data[col].dropna()
            
            # Only perform tests if we have enough data
            if len(col_data) < 3:
                continue
                
            # Normality tests
            shapiro_test = try_except(
                lambda: stats.shapiro(col_data[:5000]),  # Shapiro limited to 5000 samples
                {'statistic': None, 'p_value': None}
            )
            
            ks_test = try_except(
                lambda: stats.kstest(
                    (col_data - col_data.mean()) / col_data.std(), 
                    'norm'
                ),
                {'statistic': None, 'p_value': None}
            )
            
            # Add results
            results[col] = {
                'normality_tests': {
                    'shapiro': {
                        'statistic': float(shapiro_test['statistic']) if shapiro_test['statistic'] is not None else None,
                        'p_value': float(shapiro_test['p_value']) if shapiro_test['p_value'] is not None else None,
                        'is_normal': float(shapiro_test['p_value']) > 0.05 if shapiro_test['p_value'] is not None else None
                    },
                    'kolmogorov_smirnov': {
                        'statistic': float(ks_test['statistic']) if ks_test['statistic'] is not None else None,
                        'p_value': float(ks_test['p_value']) if ks_test['p_value'] is not None else None,
                        'is_normal': float(ks_test['p_value']) > 0.05 if ks_test['p_value'] is not None else None
                    }
                }
            }
            
        return results
    
    @staticmethod
    @safe_operation
    def analyze_distributions(data: pd.DataFrame, bins: str = 'auto') -> Dict[str, Dict[str, Any]]:
        """
        Analyze distributions of numerical variables.
        
        Args:
            data: Input DataFrame
            bins: Bin specification for histogram (default: 'auto')
            
        Returns:
            Dictionary with distribution analysis for each numerical column
        """
        distribution_info = {}
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            col_data = data[col].dropna()
            
            if len(col_data) < 2:  # Need at least 2 points for distribution analysis
                continue
                
            # Compute histogram
            hist_result = try_except(
                lambda: np.histogram(col_data, bins=bins),
                (np.array([]), np.array([]))
            )
            
            # Compute KDE (Kernel Density Estimation)
            x_points = np.linspace(col_data.min(), col_data.max(), 100)
            kde_result = try_except(
                lambda: stats.gaussian_kde(col_data)(x_points),
                np.array([])
            )
            
            distribution_info[col] = {
                'histogram_data': {
                    'counts': hist_result[0].tolist(),
                    'bins': hist_result[1].tolist()
                },
                'kde_data': {
                    'x': x_points.tolist(),
                    'y': kde_result.tolist()
                }
            }
        
        return distribution_info
    
    @staticmethod
    @safe_operation
    def check_outliers(data: pd.DataFrame, method: str = 'iqr') -> Dict[str, Dict[str, Any]]:
        """
        Check for outliers in numerical columns.
        
        Args:
            data: Input DataFrame
            method: Outlier detection method ('iqr' or 'zscore')
            
        Returns:
            Dictionary with outlier information for each numerical column
        """
        outlier_info = {}
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            col_data = data[col].dropna()
            
            if method == 'iqr':
                q1 = col_data.quantile(0.25)
                q3 = col_data.quantile(0.75)
                iqr = q3 - q1
                
                lower_bound = q1 - 1.5 * iqr
                upper_bound = q3 + 1.5 * iqr
                
                outliers = col_data[(col_data < lower_bound) | (col_data > upper_bound)]
                
                outlier_info[col] = {
                    'method': 'IQR',
                    'bounds': {
                        'lower': float(lower_bound),
                        'upper': float(upper_bound)
                    },
                    'outlier_count': int(len(outliers)),
                    'outlier_indices': outliers.index.tolist(),
                    'outlier_percentage': float(len(outliers) / len(col_data) * 100)
                }
            
            elif method == 'zscore':
                z_scores = np.abs(stats.zscore(col_data))
                outliers = col_data[z_scores > 3]  # Z-score > 3 standard deviations
                
                outlier_info[col] = {
                    'method': 'Z-Score',
                    'threshold': 3.0,
                    'outlier_count': int(len(outliers)),
                    'outlier_indices': outliers.index.tolist(),
                    'outlier_percentage': float(len(outliers) / len(col_data) * 100)
                }
        
        return outlier_info
    
    @staticmethod
    @safe_operation
    def compute_correlation_matrix(data: pd.DataFrame, method: str = 'pearson') -> Dict[str, Any]:
        """
        Compute correlation matrix for numerical variables.
        
        Args:
            data: Input DataFrame
            method: Correlation method ('pearson', 'spearman', or 'kendall')
            
        Returns:
            Dictionary with correlation matrix and related information
        """
        numeric_data = data.select_dtypes(include=[np.number])
        
        if numeric_data.empty or numeric_data.shape[1] < 2:
            return {
                'error': 'Not enough numerical columns for correlation analysis',
                'matrix': {},
                'columns': []
            }
        
        corr_matrix = numeric_data.corr(method=method)
        
        # Convert to Python native types for JSON serialization
        result = {
            'method': method,
            'matrix': corr_matrix.to_dict(),
            'columns': numeric_data.columns.tolist()
        }
        
        return result