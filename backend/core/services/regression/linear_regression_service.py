"""
Linear Regression Service
=========================

Comprehensive linear and multiple regression analysis with full diagnostics.
Implements OLS (Ordinary Least Squares) regression with all standard outputs.

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import t, f, norm, shapiro, jarque_bera
from scipy.stats import probplot
from typing import Dict, Any, List, Tuple, Optional, Union
import warnings
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class RegressionResults:
    """Container for regression analysis results."""
    
    # Coefficients and statistics
    coefficients: np.ndarray
    intercept: float
    standard_errors: np.ndarray
    t_statistics: np.ndarray
    p_values: np.ndarray
    confidence_intervals: np.ndarray
    
    # Model fit statistics
    r_squared: float
    adjusted_r_squared: float
    f_statistic: float
    f_p_value: float
    aic: float
    bic: float
    log_likelihood: float
    
    # Residual analysis
    residuals: np.ndarray
    standardized_residuals: np.ndarray
    studentized_residuals: np.ndarray
    fitted_values: np.ndarray
    
    # Diagnostics
    cooks_distance: np.ndarray
    leverage: np.ndarray
    dffits: np.ndarray
    vif: Optional[np.ndarray] = None
    
    # ANOVA table
    anova_table: Optional[pd.DataFrame] = None
    
    # Additional info
    n_observations: int
    n_predictors: int
    degrees_of_freedom: int
    feature_names: List[str]


class LinearRegressionService:
    """
    Comprehensive linear regression analysis service.
    
    Provides simple and multiple linear regression with full diagnostics,
    assumption testing, and model validation.
    """
    
    def __init__(self):
        """Initialize the linear regression service."""
        self.results = None
        self.X = None
        self.y = None
        self.feature_names = None
    
    def fit(self, X: Union[np.ndarray, pd.DataFrame], 
            y: Union[np.ndarray, pd.Series],
            feature_names: Optional[List[str]] = None,
            add_intercept: bool = True) -> RegressionResults:
        """
        Fit linear regression model using Ordinary Least Squares.
        
        Args:
            X: Feature matrix (n_samples, n_features)
            y: Target variable (n_samples,)
            feature_names: Names of features for reporting
            add_intercept: Whether to add intercept term
            
        Returns:
            RegressionResults object containing all statistics
        """
        # Convert to numpy arrays
        if isinstance(X, pd.DataFrame):
            if feature_names is None:
                feature_names = X.columns.tolist()
            X = X.values
        if isinstance(y, pd.Series):
            y = y.values
        
        # Ensure 2D array for X
        if len(X.shape) == 1:
            X = X.reshape(-1, 1)
        
        # Store original data
        self.X_original = X.copy()
        self.y = y.copy()
        
        # Add intercept if requested
        if add_intercept:
            X = np.column_stack([np.ones(X.shape[0]), X])
            if feature_names:
                feature_names = ['Intercept'] + feature_names
        
        self.X = X
        self.feature_names = feature_names or [f'X{i}' for i in range(X.shape[1])]
        
        # Calculate regression coefficients using normal equation
        # β = (X'X)^(-1)X'y
        XtX = X.T @ X
        Xty = X.T @ y
        
        try:
            # Check for multicollinearity
            XtX_inv = np.linalg.inv(XtX)
        except np.linalg.LinAlgError:
            raise ValueError("Matrix is singular. Check for perfect multicollinearity.")
        
        # Calculate coefficients
        beta = XtX_inv @ Xty
        
        # Separate intercept and coefficients
        if add_intercept:
            intercept = beta[0]
            coefficients = beta[1:]
        else:
            intercept = 0.0
            coefficients = beta
        
        # Calculate fitted values and residuals
        fitted_values = X @ beta
        residuals = y - fitted_values
        
        # Degrees of freedom
        n = len(y)
        k = X.shape[1]  # Number of parameters (including intercept)
        df_model = k - 1 if add_intercept else k
        df_resid = n - k
        df_total = n - 1
        
        # Sum of squares
        ss_total = np.sum((y - np.mean(y))**2)
        ss_resid = np.sum(residuals**2)
        ss_model = ss_total - ss_resid
        
        # Mean squares
        ms_model = ss_model / df_model if df_model > 0 else 0
        ms_resid = ss_resid / df_resid if df_resid > 0 else 0
        
        # R-squared and adjusted R-squared
        r_squared = 1 - (ss_resid / ss_total) if ss_total > 0 else 0
        adjusted_r_squared = 1 - ((n - 1) / df_resid) * (1 - r_squared) if df_resid > 0 else 0
        
        # F-statistic for overall model significance
        if ms_resid > 0 and df_model > 0:
            f_statistic = ms_model / ms_resid
            f_p_value = 1 - stats.f.cdf(f_statistic, df_model, df_resid)
        else:
            f_statistic = 0
            f_p_value = 1
        
        # Standard errors of coefficients
        # SE(β) = sqrt(diag((X'X)^(-1) * σ²))
        sigma_squared = ss_resid / df_resid if df_resid > 0 else 0
        cov_matrix = sigma_squared * XtX_inv
        standard_errors = np.sqrt(np.diag(cov_matrix))
        
        # T-statistics and p-values for coefficients
        t_statistics = beta / standard_errors if np.any(standard_errors > 0) else np.zeros_like(beta)
        p_values = 2 * (1 - stats.t.cdf(np.abs(t_statistics), df_resid))
        
        # Confidence intervals (95% by default)
        t_critical = stats.t.ppf(0.975, df_resid)
        confidence_intervals = np.column_stack([
            beta - t_critical * standard_errors,
            beta + t_critical * standard_errors
        ])
        
        # Separate intercept statistics if needed
        if add_intercept:
            intercept_se = standard_errors[0]
            intercept_t = t_statistics[0]
            intercept_p = p_values[0]
            intercept_ci = confidence_intervals[0]
            
            coef_se = standard_errors[1:]
            coef_t = t_statistics[1:]
            coef_p = p_values[1:]
            coef_ci = confidence_intervals[1:]
        else:
            coef_se = standard_errors
            coef_t = t_statistics
            coef_p = p_values
            coef_ci = confidence_intervals
        
        # Calculate diagnostics
        diagnostics = self._calculate_diagnostics(
            X, y, beta, fitted_values, residuals, 
            XtX_inv, sigma_squared, df_resid
        )
        
        # Calculate information criteria
        log_likelihood = self._calculate_log_likelihood(n, ss_resid)
        aic = self._calculate_aic(log_likelihood, k)
        bic = self._calculate_bic(log_likelihood, k, n)
        
        # Create ANOVA table
        anova_table = self._create_anova_table(
            ss_model, ss_resid, ss_total,
            df_model, df_resid, df_total,
            ms_model, ms_resid,
            f_statistic, f_p_value
        )
        
        # Calculate VIF for multicollinearity check
        vif = None
        if X.shape[1] > 2:  # Only for multiple regression
            vif = self._calculate_vif(self.X_original)
        
        # Store results
        self.results = RegressionResults(
            coefficients=coefficients,
            intercept=intercept,
            standard_errors=coef_se,
            t_statistics=coef_t,
            p_values=coef_p,
            confidence_intervals=coef_ci,
            r_squared=r_squared,
            adjusted_r_squared=adjusted_r_squared,
            f_statistic=f_statistic,
            f_p_value=f_p_value,
            aic=aic,
            bic=bic,
            log_likelihood=log_likelihood,
            residuals=residuals,
            standardized_residuals=diagnostics['standardized_residuals'],
            studentized_residuals=diagnostics['studentized_residuals'],
            fitted_values=fitted_values,
            cooks_distance=diagnostics['cooks_distance'],
            leverage=diagnostics['leverage'],
            dffits=diagnostics['dffits'],
            vif=vif,
            anova_table=anova_table,
            n_observations=n,
            n_predictors=df_model,
            degrees_of_freedom=df_resid,
            feature_names=self.feature_names[1:] if add_intercept else self.feature_names
        )
        
        return self.results
    
    def _calculate_diagnostics(self, X: np.ndarray, y: np.ndarray, 
                              beta: np.ndarray, fitted: np.ndarray, 
                              residuals: np.ndarray, XtX_inv: np.ndarray,
                              sigma_squared: float, df_resid: int) -> Dict[str, np.ndarray]:
        """
        Calculate regression diagnostics for outlier and influence detection.
        
        Returns:
            Dictionary containing diagnostic measures
        """
        n = len(y)
        k = X.shape[1]
        
        # Hat matrix (projection matrix)
        # H = X(X'X)^(-1)X'
        H = X @ XtX_inv @ X.T
        leverage = np.diag(H)
        
        # Standardized residuals
        # r_i = e_i / (σ * sqrt(1 - h_ii))
        residual_std = np.sqrt(sigma_squared * (1 - leverage))
        standardized_residuals = residuals / residual_std
        
        # Studentized residuals (externally studentized)
        # Calculate leave-one-out residuals
        studentized_residuals = np.zeros(n)
        for i in range(n):
            # Leave out observation i
            X_i = np.delete(X, i, axis=0)
            y_i = np.delete(y, i, axis=0)
            
            # Fit model without observation i
            XtX_i = X_i.T @ X_i
            try:
                XtX_inv_i = np.linalg.inv(XtX_i)
                beta_i = XtX_inv_i @ X_i.T @ y_i
                
                # Predict for observation i
                y_pred_i = X[i] @ beta_i
                
                # Calculate residual
                e_i = y[i] - y_pred_i
                
                # Calculate standard error
                resid_i = y_i - X_i @ beta_i
                s_i = np.sqrt(np.sum(resid_i**2) / (n - k - 1))
                se_pred = s_i * np.sqrt(1 + X[i] @ XtX_inv_i @ X[i].T)
                
                studentized_residuals[i] = e_i / se_pred
            except np.linalg.LinAlgError:
                studentized_residuals[i] = np.nan
        
        # Cook's distance
        # D_i = (r_i^2 / k) * (h_ii / (1 - h_ii))
        cooks_distance = (standardized_residuals**2 / k) * (leverage / (1 - leverage))
        
        # DFFITS
        # DFFITS_i = r_i * sqrt(h_ii / (1 - h_ii))
        dffits = standardized_residuals * np.sqrt(leverage / (1 - leverage))
        
        return {
            'standardized_residuals': standardized_residuals,
            'studentized_residuals': studentized_residuals,
            'leverage': leverage,
            'cooks_distance': cooks_distance,
            'dffits': dffits
        }
    
    def _calculate_vif(self, X: np.ndarray) -> np.ndarray:
        """
        Calculate Variance Inflation Factor for multicollinearity detection.
        
        VIF_j = 1 / (1 - R_j^2)
        where R_j^2 is R-squared from regressing X_j on all other X variables
        """
        n_features = X.shape[1]
        vif = np.zeros(n_features)
        
        for i in range(n_features):
            # Use all features except i as predictors
            X_others = np.delete(X, i, axis=1)
            y_i = X[:, i]
            
            # Add intercept for VIF regression
            X_vif = np.column_stack([np.ones(X.shape[0]), X_others])
            
            # Calculate R-squared for this regression
            try:
                XtX = X_vif.T @ X_vif
                XtX_inv = np.linalg.inv(XtX)
                beta_vif = XtX_inv @ X_vif.T @ y_i
                fitted_vif = X_vif @ beta_vif
                residuals_vif = y_i - fitted_vif
                
                ss_total_vif = np.sum((y_i - np.mean(y_i))**2)
                ss_resid_vif = np.sum(residuals_vif**2)
                r_squared_vif = 1 - (ss_resid_vif / ss_total_vif)
                
                # Calculate VIF
                if r_squared_vif < 0.9999:  # Avoid division by very small numbers
                    vif[i] = 1 / (1 - r_squared_vif)
                else:
                    vif[i] = np.inf
            except np.linalg.LinAlgError:
                vif[i] = np.inf
        
        return vif
    
    def _calculate_log_likelihood(self, n: int, ss_resid: float) -> float:
        """Calculate log-likelihood for the model."""
        sigma_squared = ss_resid / n
        log_likelihood = -n/2 * (np.log(2*np.pi) + np.log(sigma_squared) + 1)
        return log_likelihood
    
    def _calculate_aic(self, log_likelihood: float, k: int) -> float:
        """Calculate Akaike Information Criterion."""
        return 2 * k - 2 * log_likelihood
    
    def _calculate_bic(self, log_likelihood: float, k: int, n: int) -> float:
        """Calculate Bayesian Information Criterion."""
        return k * np.log(n) - 2 * log_likelihood
    
    def _create_anova_table(self, ss_model: float, ss_resid: float, ss_total: float,
                           df_model: int, df_resid: int, df_total: int,
                           ms_model: float, ms_resid: float,
                           f_stat: float, f_p_value: float) -> pd.DataFrame:
        """Create ANOVA table for regression."""
        anova_data = {
            'Source': ['Model', 'Residual', 'Total'],
            'Sum_of_Squares': [ss_model, ss_resid, ss_total],
            'DF': [df_model, df_resid, df_total],
            'Mean_Square': [ms_model, ms_resid, np.nan],
            'F_Statistic': [f_stat, np.nan, np.nan],
            'P_Value': [f_p_value, np.nan, np.nan]
        }
        return pd.DataFrame(anova_data)
    
    def test_assumptions(self) -> Dict[str, Any]:
        """
        Test regression assumptions.
        
        Returns:
            Dictionary containing assumption test results
        """
        if self.results is None:
            raise ValueError("Must fit model before testing assumptions")
        
        results = {}
        residuals = self.results.residuals
        fitted = self.results.fitted_values
        
        # 1. Normality of residuals
        # Shapiro-Wilk test
        shapiro_stat, shapiro_p = shapiro(residuals)
        results['normality_shapiro'] = {
            'statistic': shapiro_stat,
            'p_value': shapiro_p,
            'normal': shapiro_p > 0.05
        }
        
        # Jarque-Bera test
        jb_stat, jb_p = jarque_bera(residuals)
        results['normality_jarque_bera'] = {
            'statistic': jb_stat,
            'p_value': jb_p,
            'normal': jb_p > 0.05
        }
        
        # 2. Homoscedasticity (constant variance)
        # Breusch-Pagan test
        bp_results = self._breusch_pagan_test(residuals, self.X)
        results['homoscedasticity_breusch_pagan'] = bp_results
        
        # White test
        white_results = self._white_test(residuals, self.X)
        results['homoscedasticity_white'] = white_results
        
        # 3. Autocorrelation
        # Durbin-Watson test
        dw_stat = self._durbin_watson(residuals)
        results['autocorrelation_durbin_watson'] = {
            'statistic': dw_stat,
            'interpretation': self._interpret_durbin_watson(dw_stat)
        }
        
        # 4. Linearity
        # Rainbow test
        rainbow_results = self._rainbow_test(self.X, self.y)
        results['linearity_rainbow'] = rainbow_results
        
        # 5. Multicollinearity (for multiple regression)
        if self.results.vif is not None:
            results['multicollinearity_vif'] = {
                'vif_values': dict(zip(self.results.feature_names, self.results.vif)),
                'high_vif_features': [
                    name for name, vif in zip(self.results.feature_names, self.results.vif) 
                    if vif > 10
                ]
            }
        
        return results
    
    def _breusch_pagan_test(self, residuals: np.ndarray, X: np.ndarray) -> Dict[str, Any]:
        """
        Breusch-Pagan test for heteroscedasticity.
        
        Tests whether variance of residuals depends on values of X.
        """
        n = len(residuals)
        
        # Square the residuals
        residuals_squared = residuals**2
        
        # Regress squared residuals on X
        XtX = X.T @ X
        try:
            XtX_inv = np.linalg.inv(XtX)
            beta_aux = XtX_inv @ X.T @ residuals_squared
            fitted_aux = X @ beta_aux
            
            # Calculate R-squared for auxiliary regression
            ss_total_aux = np.sum((residuals_squared - np.mean(residuals_squared))**2)
            ss_resid_aux = np.sum((residuals_squared - fitted_aux)**2)
            r_squared_aux = 1 - (ss_resid_aux / ss_total_aux)
            
            # LM statistic = n * R²
            lm_statistic = n * r_squared_aux
            
            # Under null hypothesis, LM ~ Chi-square(k-1)
            df = X.shape[1] - 1
            p_value = 1 - stats.chi2.cdf(lm_statistic, df)
            
            return {
                'statistic': lm_statistic,
                'p_value': p_value,
                'df': df,
                'homoscedastic': p_value > 0.05
            }
        except np.linalg.LinAlgError:
            return {
                'statistic': np.nan,
                'p_value': np.nan,
                'df': X.shape[1] - 1,
                'homoscedastic': None
            }
    
    def _white_test(self, residuals: np.ndarray, X: np.ndarray) -> Dict[str, Any]:
        """
        White test for heteroscedasticity.
        
        More general test that includes cross-products and squares of regressors.
        """
        n = len(residuals)
        k = X.shape[1]
        
        # Create auxiliary regressors (X, X², and cross products)
        aux_X = [X]
        
        # Add squared terms
        aux_X.append(X**2)
        
        # Add cross-products (for multiple regression)
        if k > 2:
            for i in range(1, k):
                for j in range(i+1, k):
                    aux_X.append((X[:, i] * X[:, j]).reshape(-1, 1))
        
        # Combine all auxiliary regressors
        X_white = np.hstack(aux_X)
        
        # Remove duplicate columns (e.g., intercept squared)
        X_white = np.unique(X_white, axis=1)
        
        # Regress squared residuals on auxiliary regressors
        residuals_squared = residuals**2
        
        try:
            XtX = X_white.T @ X_white
            XtX_inv = np.linalg.inv(XtX)
            beta_white = XtX_inv @ X_white.T @ residuals_squared
            fitted_white = X_white @ beta_white
            
            # Calculate R-squared
            ss_total = np.sum((residuals_squared - np.mean(residuals_squared))**2)
            ss_resid = np.sum((residuals_squared - fitted_white)**2)
            r_squared = 1 - (ss_resid / ss_total)
            
            # Test statistic = n * R²
            test_stat = n * r_squared
            df = X_white.shape[1] - 1
            p_value = 1 - stats.chi2.cdf(test_stat, df)
            
            return {
                'statistic': test_stat,
                'p_value': p_value,
                'df': df,
                'homoscedastic': p_value > 0.05
            }
        except np.linalg.LinAlgError:
            return {
                'statistic': np.nan,
                'p_value': np.nan,
                'df': X_white.shape[1] - 1,
                'homoscedastic': None
            }
    
    def _durbin_watson(self, residuals: np.ndarray) -> float:
        """
        Calculate Durbin-Watson statistic for autocorrelation.
        
        DW = Σ(e_t - e_{t-1})² / Σe_t²
        """
        diff = np.diff(residuals)
        dw = np.sum(diff**2) / np.sum(residuals**2)
        return dw
    
    def _interpret_durbin_watson(self, dw: float) -> str:
        """Interpret Durbin-Watson statistic."""
        if dw < 1.5:
            return "Positive autocorrelation likely"
        elif dw > 2.5:
            return "Negative autocorrelation likely"
        else:
            return "No significant autocorrelation"
    
    def _rainbow_test(self, X: np.ndarray, y: np.ndarray) -> Dict[str, Any]:
        """
        Rainbow test for linearity.
        
        Tests whether a nonlinear model fits better than linear.
        """
        n = len(y)
        
        # Sort data by fitted values
        fitted = X @ np.linalg.inv(X.T @ X) @ X.T @ y
        sort_idx = np.argsort(fitted)
        
        # Split data into two halves
        n_half = n // 2
        
        # Fit model to each half
        X1 = X[sort_idx[:n_half]]
        y1 = y[sort_idx[:n_half]]
        X2 = X[sort_idx[-n_half:]]
        y2 = y[sort_idx[-n_half:]]
        
        try:
            # Calculate RSS for each half
            beta1 = np.linalg.inv(X1.T @ X1) @ X1.T @ y1
            rss1 = np.sum((y1 - X1 @ beta1)**2)
            
            beta2 = np.linalg.inv(X2.T @ X2) @ X2.T @ y2
            rss2 = np.sum((y2 - X2 @ beta2)**2)
            
            # F-statistic
            k = X.shape[1]
            f_stat = (rss2 / (n_half - k)) / (rss1 / (n_half - k))
            
            # P-value
            p_value = 1 - stats.f.cdf(f_stat, n_half - k, n_half - k)
            
            return {
                'statistic': f_stat,
                'p_value': p_value,
                'linear': p_value > 0.05
            }
        except np.linalg.LinAlgError:
            return {
                'statistic': np.nan,
                'p_value': np.nan,
                'linear': None
            }
    
    def predict(self, X_new: Union[np.ndarray, pd.DataFrame],
                confidence_level: float = 0.95,
                prediction_interval: bool = False) -> Dict[str, np.ndarray]:
        """
        Make predictions with confidence/prediction intervals.
        
        Args:
            X_new: New data for prediction
            confidence_level: Confidence level for intervals
            prediction_interval: If True, compute prediction intervals
            
        Returns:
            Dictionary with predictions and intervals
        """
        if self.results is None:
            raise ValueError("Must fit model before making predictions")
        
        # Convert to numpy
        if isinstance(X_new, pd.DataFrame):
            X_new = X_new.values
        
        # Ensure 2D
        if len(X_new.shape) == 1:
            X_new = X_new.reshape(-1, 1)
        
        # Add intercept if model has one
        if self.X.shape[1] > self.X_original.shape[1]:
            X_new = np.column_stack([np.ones(X_new.shape[0]), X_new])
        
        # Reconstruct beta (intercept + coefficients)
        beta = np.concatenate([[self.results.intercept], self.results.coefficients])
        
        # Make predictions
        predictions = X_new @ beta
        
        # Calculate standard errors for predictions
        XtX_inv = np.linalg.inv(self.X.T @ self.X)
        
        # Residual standard error
        n = self.results.n_observations
        k = len(beta)
        sigma = np.sqrt(np.sum(self.results.residuals**2) / (n - k))
        
        # Standard error of prediction
        se_fit = np.zeros(len(predictions))
        for i in range(len(predictions)):
            se_fit[i] = sigma * np.sqrt(X_new[i] @ XtX_inv @ X_new[i].T)
        
        # Critical value
        alpha = 1 - confidence_level
        t_critical = stats.t.ppf(1 - alpha/2, n - k)
        
        # Confidence intervals (for mean response)
        ci_lower = predictions - t_critical * se_fit
        ci_upper = predictions + t_critical * se_fit
        
        results = {
            'predictions': predictions,
            'confidence_interval_lower': ci_lower,
            'confidence_interval_upper': ci_upper,
            'standard_error': se_fit
        }
        
        # Prediction intervals (for individual response)
        if prediction_interval:
            se_pred = sigma * np.sqrt(1 + X_new @ XtX_inv @ X_new.T)
            if len(se_pred.shape) > 1:
                se_pred = np.diag(se_pred)
            
            pi_lower = predictions - t_critical * se_pred
            pi_upper = predictions + t_critical * se_pred
            
            results['prediction_interval_lower'] = pi_lower
            results['prediction_interval_upper'] = pi_upper
        
        return results
    
    def summary(self) -> str:
        """
        Generate comprehensive regression summary.
        
        Returns:
            Formatted summary string
        """
        if self.results is None:
            raise ValueError("Must fit model before generating summary")
        
        r = self.results
        lines = []
        lines.append("=" * 70)
        lines.append("LINEAR REGRESSION RESULTS".center(70))
        lines.append("=" * 70)
        
        # Model info
        lines.append(f"\nObservations: {r.n_observations}")
        lines.append(f"Variables: {r.n_predictors}")
        lines.append(f"Degrees of Freedom: {r.degrees_of_freedom}")
        
        # Model fit
        lines.append(f"\nR-squared: {r.r_squared:.4f}")
        lines.append(f"Adjusted R-squared: {r.adjusted_r_squared:.4f}")
        lines.append(f"F-statistic: {r.f_statistic:.4f} (p-value: {r.f_p_value:.4e})")
        lines.append(f"AIC: {r.aic:.2f}")
        lines.append(f"BIC: {r.bic:.2f}")
        
        # Coefficients table
        lines.append("\n" + "-" * 70)
        lines.append("COEFFICIENTS".center(70))
        lines.append("-" * 70)
        
        # Header
        lines.append(f"{'Variable':<20} {'Coefficient':>12} {'Std Error':>12} "
                    f"{'t-stat':>8} {'P>|t|':>10}")
        lines.append("-" * 70)
        
        # Intercept
        lines.append(f"{'Intercept':<20} {r.intercept:>12.4f} "
                    f"{np.sqrt(self.results.anova_table.iloc[0]['Mean_Square']):>12.4f} "
                    f"{'':>8} {'':>10}")
        
        # Coefficients
        for i, name in enumerate(r.feature_names):
            lines.append(f"{name:<20} {r.coefficients[i]:>12.4f} "
                        f"{r.standard_errors[i]:>12.4f} "
                        f"{r.t_statistics[i]:>8.4f} "
                        f"{r.p_values[i]:>10.4f}")
        
        # VIF if available
        if r.vif is not None:
            lines.append("\n" + "-" * 70)
            lines.append("VARIANCE INFLATION FACTORS".center(70))
            lines.append("-" * 70)
            for i, name in enumerate(r.feature_names):
                lines.append(f"{name:<20} VIF: {r.vif[i]:>8.2f}")
        
        # ANOVA table
        lines.append("\n" + "-" * 70)
        lines.append("ANOVA TABLE".center(70))
        lines.append("-" * 70)
        lines.append(r.anova_table.to_string(index=False))
        
        lines.append("=" * 70)
        
        return "\n".join(lines)
    
    def to_dict(self) -> Dict[str, Any]:
        """
        Convert results to dictionary for serialization.
        
        Returns:
            Dictionary containing all regression results
        """
        if self.results is None:
            raise ValueError("Must fit model before converting to dictionary")
        
        r = self.results
        return {
            'coefficients': {name: float(coef) for name, coef in 
                           zip(r.feature_names, r.coefficients)},
            'intercept': float(r.intercept),
            'statistics': {
                'r_squared': float(r.r_squared),
                'adjusted_r_squared': float(r.adjusted_r_squared),
                'f_statistic': float(r.f_statistic),
                'f_p_value': float(r.f_p_value),
                'aic': float(r.aic),
                'bic': float(r.bic),
                'log_likelihood': float(r.log_likelihood)
            },
            'coefficient_statistics': {
                name: {
                    'coefficient': float(r.coefficients[i]),
                    'std_error': float(r.standard_errors[i]),
                    't_statistic': float(r.t_statistics[i]),
                    'p_value': float(r.p_values[i]),
                    'ci_lower': float(r.confidence_intervals[i][0]),
                    'ci_upper': float(r.confidence_intervals[i][1])
                } for i, name in enumerate(r.feature_names)
            },
            'diagnostics': {
                'vif': {name: float(vif) for name, vif in 
                       zip(r.feature_names, r.vif)} if r.vif is not None else None,
                'max_cooks_distance': float(np.max(r.cooks_distance)),
                'max_leverage': float(np.max(r.leverage))
            },
            'model_info': {
                'n_observations': r.n_observations,
                'n_predictors': r.n_predictors,
                'degrees_of_freedom': r.degrees_of_freedom
            },
            'anova_table': r.anova_table.to_dict() if r.anova_table is not None else None
        }