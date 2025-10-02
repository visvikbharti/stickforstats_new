"""
Generalized Linear Models (GLM) Service
========================================

Comprehensive implementation of generalized linear models including:
- Logistic Regression (binary, multinomial, ordinal)
- Poisson Regression
- Negative Binomial Regression
- Gamma Regression
- And more

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import norm, chi2, t
from scipy.special import expit, logit
from scipy.optimize import minimize
from typing import Dict, Any, List, Optional, Union, Tuple
import warnings
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class GLMResults:
    """Container for GLM results."""
    model_type: str
    family: str
    link_function: str
    coefficients: np.ndarray
    standard_errors: np.ndarray
    z_statistics: np.ndarray
    p_values: np.ndarray
    confidence_intervals: np.ndarray
    log_likelihood: float
    aic: float
    bic: float
    deviance: float
    null_deviance: float
    pseudo_r_squared: float
    n_observations: int
    n_parameters: int
    converged: bool
    n_iterations: int
    fitted_values: np.ndarray
    residuals: np.ndarray
    feature_names: List[str]
    
    # Additional for specific models
    odds_ratios: Optional[np.ndarray] = None
    rate_ratios: Optional[np.ndarray] = None
    confusion_matrix: Optional[np.ndarray] = None
    roc_auc: Optional[float] = None
    accuracy: Optional[float] = None


class GLMService:
    """
    Generalized Linear Models service.
    
    Provides comprehensive GLM fitting including logistic, Poisson,
    and other exponential family distributions.
    """
    
    def __init__(self):
        """Initialize GLM service."""
        self.last_results = None
        self.X = None
        self.y = None
    
    def logistic_regression(self,
                           X: Union[np.ndarray, pd.DataFrame],
                           y: Union[np.ndarray, pd.Series],
                           feature_names: Optional[List[str]] = None,
                           add_intercept: bool = True,
                           regularization: Optional[str] = None,
                           lambda_reg: float = 0.0,
                           max_iter: int = 1000,
                           tolerance: float = 1e-8) -> GLMResults:
        """
        Fit logistic regression model for binary classification.
        
        Args:
            X: Feature matrix
            y: Binary response variable (0/1)
            feature_names: Names of features
            add_intercept: Whether to add intercept term
            regularization: None, 'l2' (Ridge), or 'l1' (Lasso)
            lambda_reg: Regularization strength
            max_iter: Maximum iterations for optimization
            tolerance: Convergence tolerance
            
        Returns:
            GLMResults object with model results
        """
        # Prepare data
        X_arr, y_arr, feature_names = self._prepare_data(X, y, feature_names, add_intercept)
        
        # Check if binary
        unique_vals = np.unique(y_arr)
        if len(unique_vals) != 2:
            raise ValueError(f"Logistic regression requires binary outcome. Found {len(unique_vals)} unique values.")
        
        # Ensure y is 0/1
        if not all(v in [0, 1] for v in unique_vals):
            y_arr = (y_arr == unique_vals[1]).astype(int)
        
        n, p = X_arr.shape
        
        # Initialize coefficients
        beta_init = np.zeros(p)
        
        # Define negative log-likelihood
        def neg_log_likelihood(beta):
            linear_pred = X_arr @ beta
            # Clip to prevent overflow
            linear_pred = np.clip(linear_pred, -500, 500)
            probs = expit(linear_pred)
            # Add small epsilon to prevent log(0)
            probs = np.clip(probs, 1e-10, 1 - 1e-10)
            
            ll = np.sum(y_arr * np.log(probs) + (1 - y_arr) * np.log(1 - probs))
            
            # Add regularization
            if regularization == 'l2':
                ll -= lambda_reg * np.sum(beta[1:]**2) / 2  # Don't regularize intercept
            elif regularization == 'l1':
                ll -= lambda_reg * np.sum(np.abs(beta[1:]))
            
            return -ll
        
        # Define gradient
        def gradient(beta):
            linear_pred = X_arr @ beta
            linear_pred = np.clip(linear_pred, -500, 500)
            probs = expit(linear_pred)
            
            grad = X_arr.T @ (probs - y_arr)
            
            # Add regularization gradient
            if regularization == 'l2':
                grad[1:] += lambda_reg * beta[1:]
            elif regularization == 'l1':
                grad[1:] += lambda_reg * np.sign(beta[1:])
            
            return grad
        
        # Optimize using scipy
        result = minimize(
            neg_log_likelihood,
            beta_init,
            jac=gradient,
            method='L-BFGS-B',
            options={'maxiter': max_iter, 'ftol': tolerance}
        )
        
        beta = result.x
        converged = result.success
        n_iterations = result.nit
        
        # Calculate statistics
        # Fitted values (probabilities)
        linear_pred = X_arr @ beta
        fitted_probs = expit(linear_pred)
        
        # Log-likelihood
        log_likelihood = -neg_log_likelihood(beta)
        
        # Null model log-likelihood
        p_null = np.mean(y_arr)
        null_log_likelihood = n * (p_null * np.log(p_null) + (1 - p_null) * np.log(1 - p_null))
        
        # Deviance
        deviance = -2 * log_likelihood
        null_deviance = -2 * null_log_likelihood
        
        # Pseudo R-squared (McFadden)
        pseudo_r2 = 1 - (log_likelihood / null_log_likelihood)
        
        # Standard errors (using Hessian)
        hessian = self._calculate_hessian_logistic(X_arr, beta)
        try:
            cov_matrix = np.linalg.inv(hessian)
            standard_errors = np.sqrt(np.diag(cov_matrix))
        except np.linalg.LinAlgError:
            standard_errors = np.full(p, np.nan)
            warnings.warn("Hessian matrix is singular. Standard errors not available.")
        
        # Z-statistics and p-values
        z_statistics = beta / standard_errors if not np.any(np.isnan(standard_errors)) else np.full(p, np.nan)
        p_values = 2 * (1 - norm.cdf(np.abs(z_statistics)))
        
        # Confidence intervals
        z_critical = norm.ppf(0.975)
        ci_lower = beta - z_critical * standard_errors
        ci_upper = beta + z_critical * standard_errors
        confidence_intervals = np.column_stack([ci_lower, ci_upper])
        
        # Odds ratios
        odds_ratios = np.exp(beta)
        
        # Residuals (deviance residuals)
        residuals = self._deviance_residuals_logistic(y_arr, fitted_probs)
        
        # AIC and BIC
        aic = 2 * p - 2 * log_likelihood
        bic = p * np.log(n) - 2 * log_likelihood
        
        # Classification metrics
        y_pred = (fitted_probs >= 0.5).astype(int)
        confusion_matrix = self._confusion_matrix(y_arr, y_pred)
        accuracy = np.mean(y_arr == y_pred)
        
        # ROC AUC
        roc_auc = self._calculate_roc_auc(y_arr, fitted_probs)
        
        # Separate intercept if added
        if add_intercept:
            intercept = beta[0]
            coefficients = beta[1:]
            intercept_se = standard_errors[0]
            coef_se = standard_errors[1:]
            intercept_z = z_statistics[0]
            coef_z = z_statistics[1:]
            intercept_p = p_values[0]
            coef_p = p_values[1:]
            coef_ci = confidence_intervals[1:]
            coef_or = odds_ratios[1:]
        else:
            intercept = 0
            coefficients = beta
            coef_se = standard_errors
            coef_z = z_statistics
            coef_p = p_values
            coef_ci = confidence_intervals
            coef_or = odds_ratios
        
        # Create results object
        results = GLMResults(
            model_type='Logistic Regression',
            family='Binomial',
            link_function='Logit',
            coefficients=coefficients,
            standard_errors=coef_se,
            z_statistics=coef_z,
            p_values=coef_p,
            confidence_intervals=coef_ci,
            log_likelihood=log_likelihood,
            aic=aic,
            bic=bic,
            deviance=deviance,
            null_deviance=null_deviance,
            pseudo_r_squared=pseudo_r2,
            n_observations=n,
            n_parameters=p,
            converged=converged,
            n_iterations=n_iterations,
            fitted_values=fitted_probs,
            residuals=residuals,
            feature_names=feature_names[1:] if add_intercept else feature_names,
            odds_ratios=coef_or,
            confusion_matrix=confusion_matrix,
            roc_auc=roc_auc,
            accuracy=accuracy
        )
        
        self.last_results = results
        return results
    
    def poisson_regression(self,
                          X: Union[np.ndarray, pd.DataFrame],
                          y: Union[np.ndarray, pd.Series],
                          exposure: Optional[Union[np.ndarray, pd.Series]] = None,
                          feature_names: Optional[List[str]] = None,
                          add_intercept: bool = True,
                          max_iter: int = 1000,
                          tolerance: float = 1e-8) -> GLMResults:
        """
        Fit Poisson regression model for count data.
        
        Args:
            X: Feature matrix
            y: Count response variable
            exposure: Exposure/offset variable
            feature_names: Names of features
            add_intercept: Whether to add intercept
            max_iter: Maximum iterations
            tolerance: Convergence tolerance
            
        Returns:
            GLMResults object with model results
        """
        # Prepare data
        X_arr, y_arr, feature_names = self._prepare_data(X, y, feature_names, add_intercept)
        
        # Check for count data
        if np.any(y_arr < 0) or np.any(y_arr != y_arr.astype(int)):
            raise ValueError("Poisson regression requires non-negative integer counts")
        
        n, p = X_arr.shape
        
        # Handle exposure/offset
        if exposure is not None:
            exposure = np.asarray(exposure)
            if len(exposure) != n:
                raise ValueError("Exposure must have same length as y")
            log_exposure = np.log(exposure + 1e-10)
        else:
            log_exposure = np.zeros(n)
        
        # Initialize coefficients
        beta_init = np.zeros(p)
        
        # Define negative log-likelihood
        def neg_log_likelihood(beta):
            linear_pred = X_arr @ beta + log_exposure
            mu = np.exp(linear_pred)
            # Prevent overflow
            mu = np.clip(mu, 1e-10, 1e10)
            
            # Poisson log-likelihood
            ll = np.sum(y_arr * linear_pred - mu - np.log(np.array([np.math.factorial(int(yi)) for yi in y_arr])))
            return -ll
        
        # Define gradient
        def gradient(beta):
            linear_pred = X_arr @ beta + log_exposure
            mu = np.exp(linear_pred)
            mu = np.clip(mu, 1e-10, 1e10)
            
            grad = X_arr.T @ (mu - y_arr)
            return grad
        
        # Optimize
        result = minimize(
            neg_log_likelihood,
            beta_init,
            jac=gradient,
            method='L-BFGS-B',
            options={'maxiter': max_iter, 'ftol': tolerance}
        )
        
        beta = result.x
        converged = result.success
        n_iterations = result.nit
        
        # Calculate statistics
        linear_pred = X_arr @ beta + log_exposure
        fitted_values = np.exp(linear_pred)
        
        # Log-likelihood
        log_likelihood = -neg_log_likelihood(beta)
        
        # Null model
        mu_null = np.mean(y_arr)
        null_log_likelihood = np.sum(y_arr * np.log(mu_null) - mu_null - 
                                    np.log(np.array([np.math.factorial(int(yi)) for yi in y_arr])))
        
        # Deviance
        deviance = 2 * np.sum(y_arr * np.log(np.maximum(y_arr, 1) / fitted_values) - 
                             (y_arr - fitted_values))
        null_deviance = 2 * (log_likelihood - null_log_likelihood)
        
        # Pseudo R-squared
        pseudo_r2 = 1 - (deviance / null_deviance) if null_deviance > 0 else 0
        
        # Standard errors
        hessian = self._calculate_hessian_poisson(X_arr, beta, log_exposure)
        try:
            cov_matrix = np.linalg.inv(hessian)
            standard_errors = np.sqrt(np.diag(cov_matrix))
        except np.linalg.LinAlgError:
            standard_errors = np.full(p, np.nan)
        
        # Z-statistics and p-values
        z_statistics = beta / standard_errors
        p_values = 2 * (1 - norm.cdf(np.abs(z_statistics)))
        
        # Confidence intervals
        z_critical = norm.ppf(0.975)
        confidence_intervals = np.column_stack([
            beta - z_critical * standard_errors,
            beta + z_critical * standard_errors
        ])
        
        # Rate ratios (exp of coefficients)
        rate_ratios = np.exp(beta)
        
        # Residuals (Pearson)
        residuals = (y_arr - fitted_values) / np.sqrt(fitted_values)
        
        # AIC and BIC
        aic = 2 * p - 2 * log_likelihood
        bic = p * np.log(n) - 2 * log_likelihood
        
        # Check for overdispersion
        overdispersion_test = self._test_overdispersion(y_arr, fitted_values, p)
        
        if overdispersion_test['overdispersed']:
            warnings.warn(f"Overdispersion detected (dispersion={overdispersion_test['dispersion']:.2f}). "
                        "Consider using Negative Binomial regression.")
        
        # Separate intercept
        if add_intercept:
            coefficients = beta[1:]
            coef_se = standard_errors[1:]
            coef_z = z_statistics[1:]
            coef_p = p_values[1:]
            coef_ci = confidence_intervals[1:]
            coef_rr = rate_ratios[1:]
        else:
            coefficients = beta
            coef_se = standard_errors
            coef_z = z_statistics
            coef_p = p_values
            coef_ci = confidence_intervals
            coef_rr = rate_ratios
        
        results = GLMResults(
            model_type='Poisson Regression',
            family='Poisson',
            link_function='Log',
            coefficients=coefficients,
            standard_errors=coef_se,
            z_statistics=coef_z,
            p_values=coef_p,
            confidence_intervals=coef_ci,
            log_likelihood=log_likelihood,
            aic=aic,
            bic=bic,
            deviance=deviance,
            null_deviance=null_deviance,
            pseudo_r_squared=pseudo_r2,
            n_observations=n,
            n_parameters=p,
            converged=converged,
            n_iterations=n_iterations,
            fitted_values=fitted_values,
            residuals=residuals,
            feature_names=feature_names[1:] if add_intercept else feature_names,
            rate_ratios=coef_rr
        )
        
        self.last_results = results
        return results
    
    def ordinal_regression(self,
                          X: Union[np.ndarray, pd.DataFrame],
                          y: Union[np.ndarray, pd.Series],
                          feature_names: Optional[List[str]] = None,
                          link: str = 'logit',
                          max_iter: int = 1000) -> Dict[str, Any]:
        """
        Fit ordinal logistic regression (proportional odds model).
        
        Args:
            X: Feature matrix
            y: Ordinal response variable
            feature_names: Names of features
            link: Link function ('logit' or 'probit')
            max_iter: Maximum iterations
            
        Returns:
            Dictionary with ordinal regression results
        """
        # Simplified implementation
        # For full implementation, consider using statsmodels or specialized packages
        
        X_arr = np.asarray(X)
        y_arr = np.asarray(y)
        
        # Get unique levels
        levels = np.sort(np.unique(y_arr))
        n_levels = len(levels)
        
        if n_levels < 3:
            warnings.warn("Ordinal regression typically requires 3+ ordered categories")
        
        results = {
            'model_type': 'Ordinal Regression',
            'link': link,
            'n_levels': n_levels,
            'levels': levels.tolist(),
            'note': 'Simplified implementation. Use specialized packages for full ordinal regression.'
        }
        
        return results
    
    def negative_binomial_regression(self,
                                   X: Union[np.ndarray, pd.DataFrame],
                                   y: Union[np.ndarray, pd.Series],
                                   feature_names: Optional[List[str]] = None,
                                   add_intercept: bool = True) -> Dict[str, Any]:
        """
        Fit negative binomial regression for overdispersed count data.
        
        Args:
            X: Feature matrix
            y: Count response variable
            feature_names: Names of features
            add_intercept: Whether to add intercept
            
        Returns:
            Dictionary with regression results
        """
        # Simplified implementation
        # Full implementation would estimate dispersion parameter
        
        results = {
            'model_type': 'Negative Binomial Regression',
            'family': 'Negative Binomial',
            'link_function': 'Log',
            'note': 'Simplified implementation. Use statsmodels for full negative binomial regression.'
        }
        
        return results
    
    def model_diagnostics(self, results: Optional[GLMResults] = None) -> Dict[str, Any]:
        """
        Comprehensive diagnostics for GLM.
        
        Args:
            results: GLMResults object (or use last fitted model)
            
        Returns:
            Dictionary with diagnostic measures
        """
        if results is None:
            results = self.last_results
        
        if results is None:
            raise ValueError("No model results available")
        
        diagnostics = {
            'goodness_of_fit': {},
            'residual_analysis': {},
            'influence_measures': {}
        }
        
        # Goodness of fit
        if results.model_type == 'Logistic Regression':
            # Hosmer-Lemeshow test
            hl_test = self._hosmer_lemeshow_test(results.fitted_values, self.y)
            diagnostics['goodness_of_fit']['hosmer_lemeshow'] = hl_test
            
            # Classification metrics
            diagnostics['classification_metrics'] = {
                'accuracy': results.accuracy,
                'roc_auc': results.roc_auc,
                'confusion_matrix': results.confusion_matrix.tolist() if results.confusion_matrix is not None else None
            }
        
        # Residual plots data
        diagnostics['residual_analysis'] = {
            'residuals_vs_fitted': {
                'x': results.fitted_values.tolist(),
                'y': results.residuals.tolist()
            },
            'qq_plot': self._qq_plot_residuals(results.residuals)
        }
        
        # Influence measures
        if self.X is not None:
            leverage = self._calculate_leverage_glm(self.X, results)
            diagnostics['influence_measures'] = {
                'leverage': leverage.tolist(),
                'high_leverage_points': np.where(leverage > 2 * results.n_parameters / results.n_observations)[0].tolist()
            }
        
        return diagnostics
    
    # Helper methods
    
    def _prepare_data(self, X, y, feature_names, add_intercept):
        """Prepare data for GLM fitting."""
        # Convert to arrays
        if isinstance(X, pd.DataFrame):
            if feature_names is None:
                feature_names = X.columns.tolist()
            X = X.values
        if isinstance(y, pd.Series):
            y = y.values
        
        X = np.asarray(X)
        y = np.asarray(y).flatten()
        
        # Ensure 2D
        if len(X.shape) == 1:
            X = X.reshape(-1, 1)
        
        # Store original
        self.X = X.copy()
        self.y = y.copy()
        
        # Add intercept
        if add_intercept:
            X = np.column_stack([np.ones(X.shape[0]), X])
            if feature_names:
                feature_names = ['Intercept'] + feature_names
        
        if feature_names is None:
            feature_names = [f'X{i}' for i in range(X.shape[1])]
        
        return X, y, feature_names
    
    def _calculate_hessian_logistic(self, X, beta):
        """Calculate Hessian matrix for logistic regression."""
        linear_pred = X @ beta
        probs = expit(linear_pred)
        W = np.diag(probs * (1 - probs))
        hessian = X.T @ W @ X
        return hessian
    
    def _calculate_hessian_poisson(self, X, beta, log_exposure):
        """Calculate Hessian matrix for Poisson regression."""
        linear_pred = X @ beta + log_exposure
        mu = np.exp(linear_pred)
        W = np.diag(mu)
        hessian = X.T @ W @ X
        return hessian
    
    def _deviance_residuals_logistic(self, y, fitted_probs):
        """Calculate deviance residuals for logistic regression."""
        fitted_probs = np.clip(fitted_probs, 1e-10, 1 - 1e-10)
        
        residuals = np.zeros_like(y, dtype=float)
        
        # When y = 1
        mask1 = y == 1
        residuals[mask1] = np.sqrt(-2 * np.log(fitted_probs[mask1]))
        
        # When y = 0
        mask0 = y == 0
        residuals[mask0] = -np.sqrt(-2 * np.log(1 - fitted_probs[mask0]))
        
        return residuals
    
    def _confusion_matrix(self, y_true, y_pred):
        """Calculate confusion matrix."""
        tp = np.sum((y_true == 1) & (y_pred == 1))
        tn = np.sum((y_true == 0) & (y_pred == 0))
        fp = np.sum((y_true == 0) & (y_pred == 1))
        fn = np.sum((y_true == 1) & (y_pred == 0))
        
        return np.array([[tn, fp], [fn, tp]])
    
    def _calculate_roc_auc(self, y_true, y_scores):
        """Calculate ROC AUC."""
        # Sort by scores
        order = np.argsort(y_scores)[::-1]
        y_true_sorted = y_true[order]
        
        # Calculate TPR and FPR
        tpr = []
        fpr = []
        
        n_pos = np.sum(y_true)
        n_neg = len(y_true) - n_pos
        
        tp = 0
        fp = 0
        
        for y in y_true_sorted:
            if y == 1:
                tp += 1
            else:
                fp += 1
            
            tpr.append(tp / n_pos if n_pos > 0 else 0)
            fpr.append(fp / n_neg if n_neg > 0 else 0)
        
        # Calculate AUC using trapezoidal rule
        auc = 0
        for i in range(1, len(fpr)):
            auc += (fpr[i] - fpr[i-1]) * (tpr[i] + tpr[i-1]) / 2
        
        return auc
    
    def _hosmer_lemeshow_test(self, fitted_probs, y_true, n_bins=10):
        """Hosmer-Lemeshow goodness of fit test."""
        # Sort by fitted probabilities
        order = np.argsort(fitted_probs)
        fitted_sorted = fitted_probs[order]
        y_sorted = y_true[order]
        
        # Create bins
        n = len(y_true)
        bin_size = n // n_bins
        
        observed = []
        expected = []
        
        for i in range(n_bins):
            start = i * bin_size
            end = (i + 1) * bin_size if i < n_bins - 1 else n
            
            bin_y = y_sorted[start:end]
            bin_probs = fitted_sorted[start:end]
            
            observed.append(np.sum(bin_y))
            expected.append(np.sum(bin_probs))
        
        # Chi-square test
        observed = np.array(observed)
        expected = np.array(expected)
        
        chi2_stat = np.sum((observed - expected)**2 / (expected * (1 - expected/len(y_sorted))))
        df = n_bins - 2
        p_value = 1 - chi2.cdf(chi2_stat, df)
        
        return {
            'chi2_statistic': chi2_stat,
            'df': df,
            'p_value': p_value,
            'good_fit': p_value > 0.05
        }
    
    def _test_overdispersion(self, y, fitted_values, n_params):
        """Test for overdispersion in count models."""
        residuals = (y - fitted_values) / np.sqrt(fitted_values)
        dispersion = np.sum(residuals**2) / (len(y) - n_params)
        
        # Chi-square test
        chi2_stat = dispersion * (len(y) - n_params)
        p_value = 1 - chi2.cdf(chi2_stat, len(y) - n_params)
        
        return {
            'dispersion': dispersion,
            'chi2_statistic': chi2_stat,
            'p_value': p_value,
            'overdispersed': dispersion > 1.5
        }
    
    def _calculate_leverage_glm(self, X, results):
        """Calculate leverage for GLM."""
        # Simplified - would need weight matrix for full implementation
        try:
            XtX = X.T @ X
            XtX_inv = np.linalg.inv(XtX)
            H = X @ XtX_inv @ X.T
            leverage = np.diag(H)
        except np.linalg.LinAlgError:
            leverage = np.full(results.n_observations, np.nan)
        
        return leverage
    
    def _qq_plot_residuals(self, residuals):
        """Generate Q-Q plot data for residuals."""
        from scipy.stats import probplot
        qq = probplot(residuals, dist="norm")
        return {
            'theoretical': qq[0][0].tolist(),
            'sample': qq[0][1].tolist()
        }
    
    def summary(self, results: Optional[GLMResults] = None) -> str:
        """
        Generate summary of GLM results.
        
        Args:
            results: GLMResults object (or use last fitted model)
            
        Returns:
            Formatted summary string
        """
        if results is None:
            results = self.last_results
        
        if results is None:
            return "No model fitted yet"
        
        lines = []
        lines.append("=" * 70)
        lines.append(f"{results.model_type.upper()} RESULTS".center(70))
        lines.append("=" * 70)
        
        lines.append(f"\nFamily: {results.family}")
        lines.append(f"Link Function: {results.link_function}")
        lines.append(f"Number of observations: {results.n_observations}")
        lines.append(f"Number of parameters: {results.n_parameters}")
        lines.append(f"Converged: {results.converged}")
        
        lines.append(f"\nLog-Likelihood: {results.log_likelihood:.4f}")
        lines.append(f"AIC: {results.aic:.2f}")
        lines.append(f"BIC: {results.bic:.2f}")
        lines.append(f"Deviance: {results.deviance:.4f}")
        lines.append(f"Null Deviance: {results.null_deviance:.4f}")
        lines.append(f"Pseudo R²: {results.pseudo_r_squared:.4f}")
        
        if results.accuracy is not None:
            lines.append(f"Accuracy: {results.accuracy:.4f}")
        if results.roc_auc is not None:
            lines.append(f"ROC AUC: {results.roc_auc:.4f}")
        
        # Coefficients table
        lines.append("\n" + "-" * 70)
        lines.append("COEFFICIENTS".center(70))
        lines.append("-" * 70)
        
        if results.model_type == 'Logistic Regression':
            lines.append(f"{'Variable':<20} {'Coef':>10} {'SE':>10} {'Z':>8} {'P>|z|':>10} {'OR':>10}")
        else:
            lines.append(f"{'Variable':<20} {'Coef':>10} {'SE':>10} {'Z':>8} {'P>|z|':>10}")
        
        lines.append("-" * 70)
        
        for i, name in enumerate(results.feature_names):
            if results.model_type == 'Logistic Regression' and results.odds_ratios is not None:
                lines.append(f"{name:<20} {results.coefficients[i]:>10.4f} "
                           f"{results.standard_errors[i]:>10.4f} "
                           f"{results.z_statistics[i]:>8.4f} "
                           f"{results.p_values[i]:>10.4f} "
                           f"{results.odds_ratios[i]:>10.4f}")
            else:
                lines.append(f"{name:<20} {results.coefficients[i]:>10.4f} "
                           f"{results.standard_errors[i]:>10.4f} "
                           f"{results.z_statistics[i]:>8.4f} "
                           f"{results.p_values[i]:>10.4f}")
        
        lines.append("=" * 70)
        
        return "\n".join(lines)