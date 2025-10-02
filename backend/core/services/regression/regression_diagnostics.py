"""
Regression Diagnostics Module
==============================

Comprehensive diagnostic tools for regression analysis including
residual plots, influence measures, and assumption testing.

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
import pandas as pd
from scipy import stats
from typing import Dict, Any, List, Tuple, Optional
import warnings


class RegressionDiagnostics:
    """
    Comprehensive regression diagnostics for model validation.
    
    Provides tools for:
    - Residual analysis
    - Influence diagnostics
    - Outlier detection
    - Assumption testing
    - Model validation
    """
    
    @staticmethod
    def residual_analysis(residuals: np.ndarray, fitted: np.ndarray,
                          predictors: Optional[np.ndarray] = None) -> Dict[str, Any]:
        """
        Comprehensive residual analysis.
        
        Args:
            residuals: Model residuals
            fitted: Fitted values
            predictors: Predictor values for partial regression plots
            
        Returns:
            Dictionary containing residual analysis results
        """
        results = {}
        
        # Basic residual statistics
        results['statistics'] = {
            'mean': float(np.mean(residuals)),
            'std': float(np.std(residuals)),
            'min': float(np.min(residuals)),
            'max': float(np.max(residuals)),
            'q1': float(np.percentile(residuals, 25)),
            'median': float(np.median(residuals)),
            'q3': float(np.percentile(residuals, 75))
        }
        
        # Residual plots data
        results['plot_data'] = {
            'residuals_vs_fitted': {
                'x': fitted.tolist(),
                'y': residuals.tolist(),
                'lowess': RegressionDiagnostics._calculate_lowess(fitted, residuals)
            },
            'qq_plot': RegressionDiagnostics._qq_plot_data(residuals),
            'scale_location': {
                'x': fitted.tolist(),
                'y': np.sqrt(np.abs(residuals / np.std(residuals))).tolist()
            },
            'histogram': {
                'bins': np.histogram(residuals, bins=30)[1].tolist(),
                'counts': np.histogram(residuals, bins=30)[0].tolist()
            }
        }
        
        # Partial residual plots if predictors provided
        if predictors is not None:
            results['partial_residuals'] = RegressionDiagnostics._partial_residual_plots(
                residuals, predictors
            )
        
        # Test for patterns in residuals
        results['tests'] = {
            'runs_test': RegressionDiagnostics._runs_test(residuals),
            'heteroscedasticity': RegressionDiagnostics._goldfeld_quandt_test(
                residuals, fitted
            )
        }
        
        return results
    
    @staticmethod
    def influence_measures(X: np.ndarray, y: np.ndarray, 
                          residuals: np.ndarray,
                          leverage: np.ndarray) -> Dict[str, Any]:
        """
        Calculate comprehensive influence measures.
        
        Args:
            X: Design matrix
            y: Response variable
            residuals: Model residuals
            leverage: Leverage values
            
        Returns:
            Dictionary containing influence measures
        """
        n, p = X.shape
        
        # Standardized residuals
        mse = np.sum(residuals**2) / (n - p)
        standardized_residuals = residuals / np.sqrt(mse * (1 - leverage))
        
        # DFBETAS - influence on each coefficient
        XtX_inv = np.linalg.inv(X.T @ X)
        dfbetas = np.zeros((n, p))
        
        for i in range(n):
            # Leave-one-out coefficients
            X_i = np.delete(X, i, axis=0)
            y_i = np.delete(y, i, axis=0)
            
            try:
                beta_full = XtX_inv @ X.T @ y
                beta_i = np.linalg.inv(X_i.T @ X_i) @ X_i.T @ y_i
                
                # DFBETAS
                se_beta = np.sqrt(np.diag(XtX_inv) * mse)
                dfbetas[i] = (beta_full - beta_i) / se_beta
            except np.linalg.LinAlgError:
                dfbetas[i] = np.nan
        
        # COVRATIO - influence on covariance matrix
        covratio = np.zeros(n)
        for i in range(n):
            covratio[i] = ((n - p - 1 + standardized_residuals[i]**2) / (n - p))**p \
                         * (1 / (1 - leverage[i]))
        
        # Identify influential points
        influential_points = {
            'high_leverage': np.where(leverage > 2 * p / n)[0].tolist(),
            'outliers': np.where(np.abs(standardized_residuals) > 3)[0].tolist(),
            'high_cooks_d': [],  # Will be filled by main regression service
            'high_dfbetas': np.where(np.abs(dfbetas).max(axis=1) > 2/np.sqrt(n))[0].tolist(),
            'unusual_covratio': np.where(np.abs(covratio - 1) > 3 * p / n)[0].tolist()
        }
        
        return {
            'dfbetas': dfbetas,
            'covratio': covratio,
            'influential_points': influential_points,
            'influence_summary': {
                'n_high_leverage': len(influential_points['high_leverage']),
                'n_outliers': len(influential_points['outliers']),
                'n_high_dfbetas': len(influential_points['high_dfbetas'])
            }
        }
    
    @staticmethod
    def collinearity_diagnostics(X: np.ndarray) -> Dict[str, Any]:
        """
        Comprehensive collinearity diagnostics.
        
        Args:
            X: Design matrix (without intercept)
            
        Returns:
            Dictionary containing collinearity diagnostics
        """
        # Correlation matrix
        if X.shape[1] > 1:
            corr_matrix = np.corrcoef(X.T)
        else:
            corr_matrix = np.array([[1.0]])
        
        # Eigenvalues and condition indices
        XtX = X.T @ X
        eigenvalues = np.linalg.eigvals(XtX)
        eigenvalues = np.sort(eigenvalues)[::-1]
        
        # Condition number
        condition_number = np.sqrt(eigenvalues[0] / eigenvalues[-1]) if eigenvalues[-1] > 0 else np.inf
        
        # Condition indices
        condition_indices = np.sqrt(eigenvalues[0] / eigenvalues)
        
        # Variance decomposition proportions
        eigenvectors = np.linalg.eig(XtX)[1]
        variance_proportions = eigenvectors**2 / np.sum(eigenvectors**2, axis=0)
        
        return {
            'correlation_matrix': corr_matrix,
            'eigenvalues': eigenvalues,
            'condition_number': float(condition_number),
            'condition_indices': condition_indices,
            'variance_proportions': variance_proportions,
            'collinearity_detected': condition_number > 30,
            'severe_collinearity': condition_number > 100
        }
    
    @staticmethod
    def outlier_detection(residuals: np.ndarray, 
                         leverage: np.ndarray,
                         cooks_distance: np.ndarray,
                         n_predictors: int) -> Dict[str, Any]:
        """
        Comprehensive outlier detection.
        
        Args:
            residuals: Standardized residuals
            leverage: Leverage values
            cooks_distance: Cook's distance values
            n_predictors: Number of predictors
            
        Returns:
            Dictionary containing outlier detection results
        """
        n = len(residuals)
        p = n_predictors
        
        # Various outlier detection criteria
        outliers = {
            'standardized_residuals': {
                'indices': np.where(np.abs(residuals) > 3)[0].tolist(),
                'threshold': 3,
                'description': 'Observations with |standardized residual| > 3'
            },
            'leverage': {
                'indices': np.where(leverage > 3 * p / n)[0].tolist(),
                'threshold': 3 * p / n,
                'description': f'Observations with leverage > {3 * p / n:.3f}'
            },
            'cooks_distance': {
                'indices': np.where(cooks_distance > 4 / n)[0].tolist(),
                'threshold': 4 / n,
                'description': f"Observations with Cook's D > {4 / n:.4f}"
            },
            'combined': {
                'indices': [],  # Will be filled with observations flagged by multiple criteria
                'description': 'Observations flagged by multiple criteria'
            }
        }
        
        # Find observations flagged by multiple criteria
        all_outliers = set()
        for key in ['standardized_residuals', 'leverage', 'cooks_distance']:
            all_outliers.update(outliers[key]['indices'])
        
        combined = []
        for idx in all_outliers:
            count = sum([
                idx in outliers['standardized_residuals']['indices'],
                idx in outliers['leverage']['indices'],
                idx in outliers['cooks_distance']['indices']
            ])
            if count >= 2:
                combined.append(idx)
        
        outliers['combined']['indices'] = combined
        
        # Summary statistics
        summary = {
            'total_outliers': len(all_outliers),
            'multiple_criteria_outliers': len(combined),
            'percentage_outliers': 100 * len(all_outliers) / n
        }
        
        return {
            'outliers': outliers,
            'summary': summary
        }
    
    @staticmethod
    def model_comparison(models: List[Dict[str, Any]]) -> pd.DataFrame:
        """
        Compare multiple regression models.
        
        Args:
            models: List of model dictionaries with statistics
            
        Returns:
            DataFrame comparing models
        """
        comparison_data = []
        
        for i, model in enumerate(models):
            comparison_data.append({
                'Model': model.get('name', f'Model {i+1}'),
                'R²': model['r_squared'],
                'Adj_R²': model['adjusted_r_squared'],
                'AIC': model['aic'],
                'BIC': model['bic'],
                'RMSE': model.get('rmse', np.nan),
                'F_statistic': model['f_statistic'],
                'p_value': model['f_p_value']
            })
        
        df = pd.DataFrame(comparison_data)
        
        # Add rankings
        df['R²_rank'] = df['R²'].rank(ascending=False)
        df['AIC_rank'] = df['AIC'].rank()
        df['BIC_rank'] = df['BIC'].rank()
        
        # Overall score (lower is better)
        df['Overall_Score'] = df[['R²_rank', 'AIC_rank', 'BIC_rank']].mean(axis=1)
        df = df.sort_values('Overall_Score')
        
        return df
    
    @staticmethod
    def cross_validation_diagnostics(cv_results: Dict[str, List[float]]) -> Dict[str, Any]:
        """
        Analyze cross-validation results.
        
        Args:
            cv_results: Dictionary with CV scores
            
        Returns:
            Dictionary with CV diagnostics
        """
        scores = cv_results.get('scores', [])
        
        return {
            'mean_score': np.mean(scores),
            'std_score': np.std(scores),
            'min_score': np.min(scores),
            'max_score': np.max(scores),
            'cv_coefficient': np.std(scores) / np.mean(scores) if np.mean(scores) != 0 else np.inf,
            'n_folds': len(scores)
        }
    
    # Helper methods
    
    @staticmethod
    def _calculate_lowess(x: np.ndarray, y: np.ndarray, 
                         frac: float = 0.3) -> Dict[str, List[float]]:
        """Calculate LOWESS smoothing for residual plots."""
        try:
            from statsmodels.nonparametric.smoothers_lowess import lowess
            smoothed = lowess(y, x, frac=frac)
            return {'x': smoothed[:, 0].tolist(), 'y': smoothed[:, 1].tolist()}
        except ImportError:
            # Simple moving average as fallback
            order = np.argsort(x)
            x_sorted = x[order]
            y_sorted = y[order]
            window = max(3, int(len(x) * frac))
            
            smoothed_y = np.convolve(y_sorted, np.ones(window)/window, mode='valid')
            smoothed_x = x_sorted[window//2:-(window//2-1)]
            
            return {'x': smoothed_x.tolist(), 'y': smoothed_y.tolist()}
    
    @staticmethod
    def _qq_plot_data(residuals: np.ndarray) -> Dict[str, List[float]]:
        """Generate Q-Q plot data."""
        qq = stats.probplot(residuals, dist="norm")
        return {
            'theoretical_quantiles': qq[0][0].tolist(),
            'sample_quantiles': qq[0][1].tolist(),
            'slope': float(qq[1][0]),
            'intercept': float(qq[1][1])
        }
    
    @staticmethod
    def _partial_residual_plots(residuals: np.ndarray, 
                               X: np.ndarray) -> List[Dict[str, Any]]:
        """Generate partial residual plot data."""
        plots = []
        
        for j in range(X.shape[1]):
            # Partial residuals = residuals + beta_j * X_j
            # (simplified version without coefficient)
            partial_res = residuals + X[:, j] * np.mean(residuals) / np.std(X[:, j])
            
            plots.append({
                'predictor_index': j,
                'x': X[:, j].tolist(),
                'y': partial_res.tolist()
            })
        
        return plots
    
    @staticmethod
    def _runs_test(residuals: np.ndarray) -> Dict[str, Any]:
        """
        Runs test for randomness of residuals.
        
        Tests whether residuals are randomly distributed.
        """
        # Convert to binary (above/below median)
        median = np.median(residuals)
        binary = residuals > median
        
        # Count runs
        runs = 1
        for i in range(1, len(binary)):
            if binary[i] != binary[i-1]:
                runs += 1
        
        # Expected runs and variance
        n1 = np.sum(binary)
        n2 = len(binary) - n1
        
        expected_runs = (2 * n1 * n2) / (n1 + n2) + 1
        variance = (2 * n1 * n2 * (2 * n1 * n2 - n1 - n2)) / \
                   ((n1 + n2)**2 * (n1 + n2 - 1))
        
        # Z-statistic
        if variance > 0:
            z_stat = (runs - expected_runs) / np.sqrt(variance)
            p_value = 2 * (1 - stats.norm.cdf(np.abs(z_stat)))
        else:
            z_stat = 0
            p_value = 1
        
        return {
            'runs': runs,
            'expected_runs': expected_runs,
            'z_statistic': z_stat,
            'p_value': p_value,
            'random': p_value > 0.05
        }
    
    @staticmethod
    def _goldfeld_quandt_test(residuals: np.ndarray, 
                             fitted: np.ndarray) -> Dict[str, Any]:
        """
        Goldfeld-Quandt test for heteroscedasticity.
        
        Tests whether variance changes across fitted values.
        """
        n = len(residuals)
        
        # Sort by fitted values
        order = np.argsort(fitted)
        residuals_sorted = residuals[order]
        
        # Remove middle portion (typically 20%)
        omit = int(n * 0.2)
        n_group = (n - omit) // 2
        
        # Calculate RSS for each group
        rss1 = np.sum(residuals_sorted[:n_group]**2)
        rss2 = np.sum(residuals_sorted[-n_group:]**2)
        
        # F-statistic
        f_stat = rss2 / rss1 if rss1 > 0 else np.inf
        
        # Degrees of freedom
        df = n_group - 1
        
        # P-value
        p_value = 1 - stats.f.cdf(f_stat, df, df)
        
        return {
            'f_statistic': f_stat,
            'p_value': p_value,
            'df': df,
            'homoscedastic': p_value > 0.05
        }