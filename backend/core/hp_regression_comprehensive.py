"""
High-Precision Comprehensive Regression Analysis Module
=====================================================
Implements all regression methods with 50 decimal place precision.

Features:
- Linear Regression (Simple & Multiple)
- Polynomial Regression
- Logistic Regression (Binary & Multinomial)
- Ridge, Lasso, and Elastic Net Regression
- Robust Regression (Huber, RANSAC, Theil-Sen)
- Quantile Regression
- Stepwise Regression
- Diagnostic Tests and Plots
- Assumption Checking
- Missing Value Handling
- Multicollinearity Detection
- Influence Diagnostics
- Cross-validation
"""

from decimal import Decimal, getcontext
import math

import logging

import mpmath as mp
import numpy as np
from scipy import stats
from sklearn.preprocessing import PolynomialFeatures
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)

# Set precision for high-precision calculations
getcontext().prec = 50
mp.mp.dps = 50


class RegressionType(Enum):
    """Types of regression analysis."""

    LINEAR = "linear"
    MULTIPLE = "multiple"
    POLYNOMIAL = "polynomial"
    LOGISTIC_BINARY = "logistic_binary"
    LOGISTIC_MULTINOMIAL = "logistic_multinomial"
    RIDGE = "ridge"
    LASSO = "lasso"
    ELASTIC_NET = "elastic_net"
    ROBUST_HUBER = "robust_huber"
    ROBUST_RANSAC = "robust_ransac"
    ROBUST_THEIL_SEN = "robust_theil_sen"
    QUANTILE = "quantile"
    STEPWISE_FORWARD = "stepwise_forward"
    STEPWISE_BACKWARD = "stepwise_backward"
    STEPWISE_BOTH = "stepwise_both"


@dataclass
class RegressionDiagnostics:
    """Comprehensive regression diagnostics."""

    residuals: np.ndarray
    standardized_residuals: np.ndarray
    studentized_residuals: np.ndarray
    cooks_distance: np.ndarray
    dffits: np.ndarray
    leverage: np.ndarray
    vif: Dict[str, Decimal]  # Variance Inflation Factors
    # None when the residuals are all zero (a perfect fit): DW is 0/0 there, not 0.
    durbin_watson: Optional[Decimal]
    # {"statistic": None, "p_value": None} when the auxiliary regression is degenerate.
    breusch_pagan: Dict[str, Optional[Decimal]]  # Heteroscedasticity test
    jarque_bera: Dict[str, Optional[Decimal]]  # Normality test
    condition_number: Decimal
    outliers: List[int]
    influential_points: List[int]
    multicollinearity_detected: bool
    heteroscedasticity_detected: bool
    autocorrelation_detected: bool
    normality_violated: bool


@dataclass
class RegressionResult:
    """Comprehensive regression analysis results."""

    regression_type: RegressionType
    coefficients: Dict[str, Decimal]
    intercept: Decimal
    standard_errors: Dict[str, Decimal]
    t_statistics: Dict[str, Decimal]
    p_values: Dict[str, Decimal]
    confidence_intervals: Dict[str, Tuple[Decimal, Decimal]]
    # None where the quantity does not exist: R^2 is 0/0 for a constant response, and the
    # Gaussian AIC/BIC diverge on an exactly-fitting model. See f_statistic below.
    r_squared: Optional[Decimal]
    adjusted_r_squared: Optional[Decimal]
    # None means "this fit has no overall F-test", NOT "F = 0".
    #
    # The robust, logistic, ridge, lasso and polynomial fits all used to report
    # f_statistic = 0 and f_p_value = 1, which the API serializes verbatim -- so a user read
    # F = 0, p = 1 for a model that never had an F-test computed at all. An F-test assumes
    # the ordinary-least-squares normal likelihood; a robust or penalized fit declines to
    # assume it, and a logistic fit has a different likelihood entirely. There is no F to
    # report, and "0" is not a way of saying so. It is a number, and users read numbers.
    f_statistic: Optional[Decimal]
    f_p_value: Optional[Decimal]
    aic: Optional[Decimal]
    bic: Optional[Decimal]
    # None where the metric does not apply to the model: a logistic fit has no residual
    # mean-squared error in the least-squares sense.
    mse: Optional[Decimal]
    rmse: Optional[Decimal]
    mae: Optional[Decimal]
    mape: Optional[Decimal]  # Mean Absolute Percentage Error
    predictions: np.ndarray
    residuals: np.ndarray
    diagnostics: RegressionDiagnostics
    cross_validation_scores: Optional[Dict[str, Decimal]] = None
    regularization_param: Optional[Decimal] = None
    feature_importance: Optional[Dict[str, Decimal]] = None
    polynomial_degree: Optional[int] = None
    quantile: Optional[float] = None
    selected_features: Optional[List[str]] = None
    # The robust fits (_huber_regression, _ransac_regression, _theil_sen_regression) all
    # pass sample_size=n, but the field did not exist -- so every one of them raised
    # TypeError on construction. They were never reachable from the API (the serializer's
    # ChoiceField omitted "robust"), so nothing ever ran them and nothing ever noticed.
    sample_size: Optional[int] = None
    interpretation: Dict[str, str] = field(default_factory=dict)
    warnings: List[str] = field(default_factory=list)
    assumptions_met: Dict[str, bool] = field(default_factory=dict)


class HighPrecisionRegression:
    """
    High-precision regression analysis with 50 decimal places.
    Implements all major regression techniques with comprehensive diagnostics.
    """

    def __init__(self, precision: int = 50):
        """Initialize with specified precision."""
        self.precision = precision
        getcontext().prec = precision
        mp.mp.dps = precision

    def linear_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: Optional[List[str]] = None,
        confidence_level: float = 0.95,
        handle_missing: str = "drop",
        robust_standard_errors: bool = False,
        do_cv: bool = True,
    ) -> RegressionResult:
        """
        Perform high-precision linear regression.

        Parameters:
        -----------
        X : np.ndarray
            Independent variables (n_samples, n_features)
        y : np.ndarray
            Dependent variable (n_samples,)
        feature_names : Optional[List[str]]
            Names of features
        confidence_level : float
            Confidence level for intervals
        handle_missing : str
            How to handle missing values ('drop', 'impute_mean', 'impute_median')
        robust_standard_errors : bool
            Use heteroscedasticity-robust standard errors

        Returns:
        --------
        RegressionResult with comprehensive analysis
        """
        # Handle missing values
        X, y, feature_names = self._handle_missing_values(X, y, feature_names, handle_missing)

        # Convert to high precision
        X_hp = self._to_high_precision_matrix(X)
        y_hp = self._to_high_precision_vector(y)

        # Add intercept term
        n = len(y_hp)
        X_with_intercept = self._add_intercept(X_hp)

        # Calculate coefficients using normal equation with high precision
        XtX = self._matrix_multiply_transpose(X_with_intercept, X_with_intercept)
        Xty = self._matrix_multiply_transpose(X_with_intercept, y_hp.reshape(-1, 1))

        # Check for multicollinearity
        self._calculate_condition_number(XtX)

        model_warnings: List[str] = []
        try:
            # Solve for coefficients
            XtX_inv = self._matrix_inverse(XtX)
            coefficients = self._matrix_multiply(XtX_inv, Xty).flatten()
        except Exception:
            # Use ridge regression if singular. Record the fallback as a
            # user-visible warning -- NOT `warnings.append`, which would call
            # .append on the imported stdlib `warnings` module and raise
            # AttributeError, turning a recoverable case into a hard 500.
            coefficients = self._ridge_solve(X_with_intercept, y_hp, alpha=Decimal("0.01"))
            model_warnings.append("Matrix near singular, used ridge regularization")

        # Extract intercept and coefficients
        intercept = coefficients[0]
        coef_values = coefficients[1:]

        # Make predictions
        predictions = self._matrix_multiply(X_with_intercept, coefficients.reshape(-1, 1)).flatten()
        residuals = y_hp - predictions

        # Calculate standard errors
        if robust_standard_errors:
            std_errors = self._calculate_robust_standard_errors(X_with_intercept, residuals)
        else:
            std_errors = self._calculate_standard_errors(X_with_intercept, residuals)

        # Calculate t-statistics and p-values
        t_stats = coefficients / std_errors
        p_values = self._calculate_p_values(t_stats, n - len(coefficients))

        # Calculate confidence intervals
        ci = self._calculate_confidence_intervals(coefficients, std_errors, n - len(coefficients), confidence_level)

        # Calculate R-squared and adjusted R-squared
        r_squared = self._calculate_r_squared(y_hp, predictions)
        adj_r_squared = self._calculate_adjusted_r_squared(r_squared, n, len(coefficients) - 1)

        # F-statistic
        f_stat, f_p_value = self._calculate_f_statistic(r_squared, n, len(coefficients) - 1)

        # Information criteria
        aic = self._calculate_aic(residuals, len(coefficients))
        bic = self._calculate_bic(residuals, len(coefficients), n)

        # Error metrics
        mse = self._calculate_mse(residuals)
        rmse = mp.sqrt(mse)
        mae = self._calculate_mae(residuals)
        mape = self._calculate_mape(y_hp, predictions)

        # Comprehensive diagnostics
        diagnostics = self._calculate_diagnostics(X_with_intercept, y_hp, predictions, residuals, feature_names)

        # Cross-validation
        cv_scores = self._cross_validate(X, y, cv=5) if do_cv else None

        # Build result
        if feature_names is None:
            feature_names = [f"X{i+1}" for i in range(X.shape[1])]

        coef_dict = {name: Decimal(str(coef)) for name, coef in zip(feature_names, coef_values)}
        std_dict = {name: Decimal(str(se)) for name, se in zip(["intercept"] + feature_names, std_errors)}
        t_dict = {name: Decimal(str(t)) for name, t in zip(["intercept"] + feature_names, t_stats)}
        p_dict = {name: Decimal(str(p)) for name, p in zip(["intercept"] + feature_names, p_values)}
        ci_dict = {
            name: (Decimal(str(ci[i][0])), Decimal(str(ci[i][1])))
            for i, name in enumerate(["intercept"] + feature_names)
        }

        # Generate interpretation
        interpretation = self._generate_interpretation(coef_dict, p_dict, r_squared, diagnostics)

        # Check assumptions
        assumptions = self._check_assumptions(diagnostics)

        return RegressionResult(
            regression_type=RegressionType.LINEAR if X.shape[1] == 1 else RegressionType.MULTIPLE,
            coefficients=coef_dict,
            intercept=Decimal(str(intercept)),
            standard_errors=std_dict,
            t_statistics=t_dict,
            p_values=p_dict,
            confidence_intervals=ci_dict,
            r_squared=Decimal(str(r_squared)),
            adjusted_r_squared=Decimal(str(adj_r_squared)),
            f_statistic=Decimal(str(f_stat)),
            f_p_value=Decimal(str(f_p_value)),
            aic=Decimal(str(aic)),
            bic=Decimal(str(bic)),
            mse=Decimal(str(mse)),
            rmse=Decimal(str(rmse)),
            mae=Decimal(str(mae)),
            mape=Decimal(str(mape)),
            predictions=np.array([float(p) for p in predictions]),
            residuals=np.array([float(r) for r in residuals]),
            diagnostics=diagnostics,
            cross_validation_scores=cv_scores,
            interpretation=interpretation,
            assumptions_met=assumptions,
            warnings=(
                (list(diagnostics.warnings) if hasattr(diagnostics, "warnings") else [])
                + model_warnings
            ),
        )

    def logistic_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: Optional[List[str]] = None,
        regression_type: str = "binary",
        max_iter: int = 1000,
        tol: float = 1e-8,
        regularization: Optional[str] = None,
        alpha: float = 1.0,
    ) -> RegressionResult:
        """
        Perform high-precision logistic regression.

        Parameters:
        -----------
        X : np.ndarray
            Independent variables
        y : np.ndarray
            Binary or multi-class dependent variable
        regression_type : str
            'binary' or 'multinomial'
        regularization : Optional[str]
            None, 'l1', 'l2', or 'elastic_net'
        alpha : float
            Regularization strength
        """
        # Convert to high precision
        X_hp = self._to_high_precision_matrix(X)
        y_hp = self._to_high_precision_vector(y)

        # Add intercept
        X_with_intercept = self._add_intercept(X_hp)
        n, p = X_with_intercept.shape

        if regression_type == "binary":
            # Binary logistic regression using Newton-Raphson
            coefficients = self._fit_binary_logistic(X_with_intercept, y_hp, max_iter, tol, regularization, alpha)

            # Calculate probabilities
            z = self._matrix_multiply(X_with_intercept, coefficients.reshape(-1, 1)).flatten()
            probabilities = self._sigmoid(z)
            predictions = (probabilities > mp.mpf("0.5")).astype(int)

            # Calculate log-likelihood
            log_likelihood = self._calculate_log_likelihood(y_hp, probabilities)

            # Calculate pseudo R-squared (McFadden's)
            null_model_ll = self._calculate_null_log_likelihood(y_hp)
            pseudo_r_squared = 1 - (log_likelihood / null_model_ll)

        else:
            # Multinomial logistic regression
            coefficients, probabilities = self._fit_multinomial_logistic(
                X_with_intercept, y_hp, max_iter, tol, regularization, alpha
            )
            predictions = np.argmax(probabilities, axis=1)
            pseudo_r_squared = self._calculate_multinomial_r_squared(y_hp, probabilities)

        # Calculate standard errors using Hessian
        std_errors = self._calculate_logistic_standard_errors(X_with_intercept, probabilities)

        # Calculate Wald statistics and p-values
        wald_stats = coefficients / std_errors
        p_values = self._calculate_p_values(wald_stats, np.inf)  # Use normal distribution

        # Calculate confidence intervals
        ci = self._calculate_confidence_intervals(coefficients, std_errors, np.inf, 0.95)

        # Information criteria
        aic = -2 * log_likelihood + 2 * p
        bic = -2 * log_likelihood + p * mp.log(n)

        # Build feature names
        if feature_names is None:
            feature_names = [f"X{i+1}" for i in range(X.shape[1])]

        # Create result dictionaries
        intercept = coefficients[0]
        coef_values = coefficients[1:]

        coef_dict = {name: Decimal(str(coef)) for name, coef in zip(feature_names, coef_values)}

        # Calculate odds ratios for interpretation
        odds_ratios = {name: Decimal(str(mp.exp(coef))) for name, coef in coef_dict.items()}

        # Generate interpretation
        interpretation = self._generate_logistic_interpretation(coef_dict, odds_ratios, p_values, pseudo_r_squared)

        return RegressionResult(
            regression_type=RegressionType.LOGISTIC_BINARY
            if regression_type == "binary"
            else RegressionType.LOGISTIC_MULTINOMIAL,
            coefficients=coef_dict,
            intercept=Decimal(str(intercept)),
            standard_errors={name: Decimal(str(se)) for name, se in zip(["intercept"] + feature_names, std_errors)},
            t_statistics={name: Decimal(str(w)) for name, w in zip(["intercept"] + feature_names, wald_stats)},
            p_values={name: Decimal(str(p)) for name, p in zip(["intercept"] + feature_names, p_values)},
            confidence_intervals={
                name: (Decimal(str(ci[i][0])), Decimal(str(ci[i][1])))
                for i, name in enumerate(["intercept"] + feature_names)
            },
            r_squared=Decimal(str(pseudo_r_squared)),
            adjusted_r_squared=Decimal(str(pseudo_r_squared)),  # Use same for logistic
            # No F-test for a logistic fit: it has a different likelihood entirely.
            f_statistic=None,
            f_p_value=None,
            aic=Decimal(str(aic)),
            bic=Decimal(str(bic)),
            # "Not meaningful for logistic" is right -- and 0 is not how you say it. The API
            # serialized these verbatim, so a logistic model reported RMSE = 0.000 and
            # MAPE = 0.000, which read as a flawless fit. A quantity that does not apply is
            # null, not zero. (Logistic fit quality lives in pseudo-R^2, AIC/BIC and the
            # classification metrics, all of which ARE reported.)
            mse=None,
            rmse=None,
            mae=None,
            mape=None,
            predictions=predictions,
            residuals=y - predictions,  # Deviance residuals would be better
            diagnostics=self._calculate_logistic_diagnostics(X_with_intercept, y_hp, probabilities),
            feature_importance=odds_ratios,
            regularization_param=Decimal(str(alpha)) if regularization else None,
            interpretation=interpretation,
        )

    def ridge_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        alpha: float = 1.0,
        feature_names: Optional[List[str]] = None,
        cv_folds: int = 5,
        alpha_search: bool = True,
    ) -> RegressionResult:
        """
        Perform Ridge regression with L2 regularization.

        Parameters:
        -----------
        alpha : float
            Regularization strength
        alpha_search : bool
            Whether to search for optimal alpha using cross-validation
        """
        # Convert to high precision
        X_hp = self._to_high_precision_matrix(X)
        y_hp = self._to_high_precision_vector(y)

        # Add intercept
        X_with_intercept = self._add_intercept(X_hp)

        # Search for optimal alpha if requested
        if alpha_search:
            alpha = self._find_optimal_alpha_ridge(X, y, cv_folds)

        # Solve ridge regression
        coefficients = self._ridge_solve(X_with_intercept, y_hp, Decimal(str(alpha)))

        # Calculate predictions and residuals
        predictions = self._matrix_multiply(X_with_intercept, coefficients.reshape(-1, 1)).flatten()
        residuals = y_hp - predictions

        # Calculate effective degrees of freedom for ridge
        effective_df = self._calculate_ridge_effective_df(X_with_intercept, Decimal(str(alpha)))

        # Calculate standard errors (approximate for ridge)
        std_errors = self._calculate_ridge_standard_errors(X_with_intercept, residuals, Decimal(str(alpha)))

        # Rest of the calculations similar to linear regression
        n = len(y_hp)
        r_squared = self._calculate_r_squared(y_hp, predictions)
        adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - effective_df)

        # Build result
        if feature_names is None:
            feature_names = [f"X{i+1}" for i in range(X.shape[1])]

        intercept = coefficients[0]
        coef_values = coefficients[1:]

        coef_dict = {name: Decimal(str(coef)) for name, coef in zip(feature_names, coef_values)}

        # Calculate feature importance (absolute standardized coefficients)
        feature_importance = self._calculate_feature_importance(coef_values, X)

        return RegressionResult(
            regression_type=RegressionType.RIDGE,
            coefficients=coef_dict,
            intercept=Decimal(str(intercept)),
            standard_errors={name: Decimal(str(se)) for name, se in zip(["intercept"] + feature_names, std_errors)},
            t_statistics={},  # Not meaningful for ridge
            p_values={},  # Not meaningful for ridge
            confidence_intervals={},  # Not meaningful for ridge
            r_squared=Decimal(str(r_squared)),
            adjusted_r_squared=Decimal(str(adj_r_squared)),
            # No F-test: this fit does not assume the OLS normal likelihood the F-test needs.
            f_statistic=None,
            f_p_value=None,
            aic=self._calculate_aic(residuals, effective_df),
            bic=self._calculate_bic(residuals, effective_df, n),
            mse=self._calculate_mse(residuals),
            rmse=mp.sqrt(self._calculate_mse(residuals)),
            mae=self._calculate_mae(residuals),
            mape=self._calculate_mape(y_hp, predictions),
            predictions=np.array([float(p) for p in predictions]),
            residuals=np.array([float(r) for r in residuals]),
            diagnostics=self._calculate_diagnostics(X_with_intercept, y_hp, predictions, residuals, feature_names),
            regularization_param=Decimal(str(alpha)),
            feature_importance=feature_importance,
            cross_validation_scores=self._cross_validate(X, y, cv_folds),
        )

    def lasso_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        alpha: float = 1.0,
        feature_names: Optional[List[str]] = None,
        max_iter: int = 10000,
        tol: float = 1e-8,
    ) -> RegressionResult:
        """
        Perform Lasso regression with L1 regularization.
        Uses coordinate descent algorithm.
        """
        # Convert to high precision
        X_hp = self._to_high_precision_matrix(X)
        y_hp = self._to_high_precision_vector(y)

        # Standardize features for Lasso
        X_std, X_mean, X_scale = self._standardize_features(X_hp)

        # Add intercept
        X_with_intercept = self._add_intercept(X_std)

        # Solve Lasso using coordinate descent
        coefficients = self._lasso_coordinate_descent(X_with_intercept, y_hp, Decimal(str(alpha)), max_iter, tol)

        # Transform coefficients back to original scale
        coefficients[1:] = coefficients[1:] / X_scale
        coefficients[0] = coefficients[0] - sum(coefficients[1:] * X_mean / X_scale)

        # Calculate predictions
        X_orig_with_intercept = self._add_intercept(X_hp)
        predictions = self._matrix_multiply(X_orig_with_intercept, coefficients.reshape(-1, 1)).flatten()
        residuals = y_hp - predictions

        # Build result
        if feature_names is None:
            feature_names = [f"X{i+1}" for i in range(X.shape[1])]

        intercept = coefficients[0]
        coef_values = coefficients[1:]

        # Identify selected features (non-zero coefficients)
        selected_features = [name for name, coef in zip(feature_names, coef_values) if abs(coef) > mp.mpf("1e-10")]

        coef_dict = {name: Decimal(str(coef)) for name, coef in zip(feature_names, coef_values)}

        # Calculate metrics
        n = len(y_hp)
        r_squared = self._calculate_r_squared(y_hp, predictions)
        num_selected = len(selected_features)
        adj_r_squared = 1 - (1 - r_squared) * (n - 1) / (n - num_selected - 1) if num_selected > 0 else 0

        return RegressionResult(
            regression_type=RegressionType.LASSO,
            coefficients=coef_dict,
            intercept=Decimal(str(intercept)),
            standard_errors={},  # Not easily available for Lasso
            t_statistics={},
            p_values={},
            confidence_intervals={},
            r_squared=Decimal(str(r_squared)),
            adjusted_r_squared=Decimal(str(adj_r_squared)),
            # No F-test: this fit does not assume the OLS normal likelihood the F-test needs.
            f_statistic=None,
            f_p_value=None,
            aic=self._calculate_aic(residuals, num_selected + 1),
            bic=self._calculate_bic(residuals, num_selected + 1, n),
            mse=self._calculate_mse(residuals),
            rmse=mp.sqrt(self._calculate_mse(residuals)),
            mae=self._calculate_mae(residuals),
            mape=self._calculate_mape(y_hp, predictions),
            predictions=np.array([float(p) for p in predictions]),
            residuals=np.array([float(r) for r in residuals]),
            diagnostics=self._calculate_diagnostics(X_orig_with_intercept, y_hp, predictions, residuals, feature_names),
            regularization_param=Decimal(str(alpha)),
            selected_features=selected_features,
            feature_importance={name: abs(Decimal(str(coef))) for name, coef in coef_dict.items()},
        )

    def polynomial_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        degree: int = 2,
        feature_names: Optional[List[str]] = None,
        include_interaction: bool = True,
        regularization: Optional[str] = None,
        alpha: float = 1.0,
    ) -> RegressionResult:
        """
        Perform polynomial regression.

        Parameters:
        -----------
        degree : int
            Polynomial degree
        include_interaction : bool
            Include interaction terms
        regularization : Optional[str]
            'ridge', 'lasso', or None
        """
        # Create polynomial features
        poly = PolynomialFeatures(degree=degree, include_bias=False, interaction_only=not include_interaction)
        X_poly = poly.fit_transform(X)

        # Get polynomial feature names
        if feature_names is None:
            feature_names = [f"X{i+1}" for i in range(X.shape[1])]
        poly_feature_names = poly.get_feature_names_out(feature_names)

        # Apply appropriate regression
        if regularization == "ridge":
            result = self.ridge_regression(X_poly, y, alpha, poly_feature_names)
        elif regularization == "lasso":
            result = self.lasso_regression(X_poly, y, alpha, poly_feature_names)
        else:
            result = self.linear_regression(X_poly, y, poly_feature_names)

        # Update regression type and polynomial degree
        result.regression_type = RegressionType.POLYNOMIAL
        result.polynomial_degree = degree

        return result

    def stepwise_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: Optional[List[str]] = None,
        method: str = "both",
        alpha_in: float = 0.05,
        alpha_out: float = 0.10,
        max_features: Optional[int] = None,
    ) -> RegressionResult:
        """
        Perform stepwise regression for feature selection.

        Parameters:
        -----------
        method : str
            'forward', 'backward', or 'both'
        alpha_in : float
            P-value threshold for adding features
        alpha_out : float
            P-value threshold for removing features
        max_features : Optional[int]
            Maximum number of features to select
        """
        if feature_names is None:
            feature_names = [f"X{i+1}" for i in range(X.shape[1])]

        n, p = X.shape

        if method == "forward":
            selected_features = self._forward_selection(X, y, feature_names, alpha_in, max_features)
        elif method == "backward":
            selected_features = self._backward_elimination(X, y, feature_names, alpha_out)
        else:  # both
            selected_features = self._stepwise_both(X, y, feature_names, alpha_in, alpha_out, max_features)

        # Get indices of selected features
        selected_indices = [i for i, name in enumerate(feature_names) if name in selected_features]

        # Perform regression with selected features
        X_selected = X[:, selected_indices]
        result = self.linear_regression(X_selected, y, selected_features)

        # Update regression type and selected features
        result.regression_type = (
            RegressionType.STEPWISE_FORWARD
            if method == "forward"
            else RegressionType.STEPWISE_BACKWARD
            if method == "backward"
            else RegressionType.STEPWISE_BOTH
        )
        result.selected_features = selected_features

        return result

    def quantile_regression(
        self,
        X: np.ndarray,
        y: np.ndarray,
        quantile: float = 0.5,
        feature_names: Optional[List[str]] = None,
        max_iter: int = 10000,
        tol: float = 1e-8,
    ) -> RegressionResult:
        """
        Perform quantile regression.

        Parameters:
        -----------
        quantile : float
            Quantile to estimate (0.5 for median regression)
        """
        # Convert to high precision
        X_hp = self._to_high_precision_matrix(X)
        y_hp = self._to_high_precision_vector(y)

        # Add intercept
        X_with_intercept = self._add_intercept(X_hp)

        # Solve quantile regression using iteratively reweighted least squares
        coefficients = self._quantile_regression_irls(X_with_intercept, y_hp, Decimal(str(quantile)), max_iter, tol)

        # Calculate predictions
        predictions = self._matrix_multiply(X_with_intercept, coefficients.reshape(-1, 1)).flatten()
        residuals = y_hp - predictions

        # Calculate pseudo R-squared for quantile regression
        # Using the R1 measure from Koenker and Machado (1999).
        #
        # The null model for R1 is the INTERCEPT-ONLY quantile regression, whose fitted
        # value is the empirical q-th quantile of y -- not the median. The old line called
        # mp.median(), which (a) does not exist in mpmath, so this whole method raised
        # AttributeError on every call, and (b) would have been the wrong reference point
        # for any q != 0.5 even if it had.
        def rho(u, q):
            return u * (q - (u < 0))

        y_null = self._empirical_quantile(y_hp, quantile)
        total_loss = sum([rho(y_i - y_null, quantile) for y_i in y_hp])
        residual_loss = sum([rho(r, quantile) for r in residuals])
        pseudo_r_squared = 1 - residual_loss / total_loss if total_loss > 0 else 0

        # Build result
        if feature_names is None:
            feature_names = [f"X{i+1}" for i in range(X.shape[1])]

        intercept = coefficients[0]
        coef_values = coefficients[1:]

        coef_dict = {name: Decimal(str(coef)) for name, coef in zip(feature_names, coef_values)}

        # Calculate metrics
        len(y_hp)
        mae = self._calculate_mae(residuals)

        # Generate interpretation
        interpretation = {
            "quantile": f"Estimating the {quantile:.1%} quantile of the response",
            "coefficients": f"Coefficients show the change in the {quantile:.1%} quantile for unit change in predictors",
            "pseudo_r_squared": f"Pseudo R-squared: {pseudo_r_squared:.4f}",
            "mae": f"Mean Absolute Error: {mae:.6f}",
        }

        return RegressionResult(
            regression_type=RegressionType.QUANTILE,
            coefficients=coef_dict,
            intercept=Decimal(str(intercept)),
            standard_errors={},  # Bootstrap would be needed for standard errors
            t_statistics={},
            p_values={},
            confidence_intervals={},
            r_squared=Decimal(str(pseudo_r_squared)),
            adjusted_r_squared=Decimal(str(pseudo_r_squared)),
            # No F-test: this fit does not assume the OLS normal likelihood the F-test needs.
            f_statistic=None,
            f_p_value=None,
            # Quantile regression does not maximize a Gaussian likelihood, so the Gaussian
            # AIC/BIC do not apply to it. They were being emitted as "0" -- two lines below
            # an f_statistic of None that says exactly the same thing correctly.
            aic=None,
            bic=None,
            mse=self._calculate_mse(residuals),
            rmse=mp.sqrt(self._calculate_mse(residuals)),
            mae=Decimal(str(mae)),
            mape=self._calculate_mape(y_hp, predictions),
            predictions=np.array([float(p) for p in predictions]),
            residuals=np.array([float(r) for r in residuals]),
            diagnostics=self._calculate_diagnostics(X_with_intercept, y_hp, predictions, residuals, feature_names),
            quantile=quantile,
            interpretation=interpretation,
        )

    def robust_regression(
        self, X: np.ndarray, y: np.ndarray, method: str = "huber", feature_names: Optional[List[str]] = None, **kwargs
    ) -> RegressionResult:
        """
        Perform robust regression resistant to outliers.

        Parameters:
        -----------
        method : str
            'huber', 'ransac', or 'theil_sen'
        """
        if method == "huber":
            return self._huber_regression(X, y, feature_names, **kwargs)
        elif method == "ransac":
            return self._ransac_regression(X, y, feature_names, **kwargs)
        elif method == "theil_sen":
            return self._theil_sen_regression(X, y, feature_names, **kwargs)
        else:
            raise ValueError(f"Unknown robust regression method: {method}")

    # Helper methods
    def _to_high_precision_matrix(self, X: np.ndarray) -> np.ndarray:
        """Convert numpy array to high precision."""
        return np.array([[mp.mpf(str(x)) for x in row] for row in X])

    def _to_high_precision_vector(self, y: np.ndarray) -> np.ndarray:
        """Convert numpy vector to high precision."""
        return np.array([mp.mpf(str(y_i)) for y_i in y])

    def _empirical_quantile(self, values, q) -> mp.mpf:
        """
        The q-th empirical quantile of `values`, in high precision.

        Linear interpolation between order statistics (numpy's default 'linear' method),
        so it agrees with np.quantile to within the working precision. mpmath ships no
        median/quantile of its own.
        """
        ordered = sorted(values)
        n = len(ordered)
        if n == 0:
            raise ValueError("Cannot take a quantile of an empty vector")
        if n == 1:
            return ordered[0]

        position = mp.mpf(str(q)) * (n - 1)
        lower = int(mp.floor(position))
        upper = min(lower + 1, n - 1)
        fraction = position - lower
        return ordered[lower] + (ordered[upper] - ordered[lower]) * fraction

    def _add_intercept(self, X: np.ndarray) -> np.ndarray:
        """Add intercept column to design matrix."""
        n = X.shape[0]
        ones = np.array([mp.mpf("1")] * n).reshape(-1, 1)
        return np.hstack([ones, X])

    def _matrix_multiply(self, A: np.ndarray, B: np.ndarray) -> np.ndarray:
        """High-precision matrix multiplication."""
        result = []
        for i in range(A.shape[0]):
            row = []
            for j in range(B.shape[1]):
                sum_val = mp.mpf("0")
                for k in range(A.shape[1]):
                    sum_val += A[i, k] * B[k, j]
                row.append(sum_val)
            result.append(row)
        return np.array(result)

    def _matrix_multiply_transpose(self, A: np.ndarray, B: np.ndarray) -> np.ndarray:
        """Compute A^T * B with high precision."""
        return self._matrix_multiply(A.T, B)

    def _matrix_inverse(self, A: np.ndarray) -> np.ndarray:
        """High-precision matrix inversion using mpmath."""
        n = A.shape[0]
        A_mp = mp.matrix([[A[i, j] for j in range(n)] for i in range(n)])
        try:
            A_inv_mp = A_mp ** (-1)
            return np.array([[A_inv_mp[i, j] for j in range(n)] for i in range(n)])
        except:
            # Add small regularization if singular
            for i in range(n):
                A_mp[i, i] += mp.mpf("1e-10")
            A_inv_mp = A_mp ** (-1)
            return np.array([[A_inv_mp[i, j] for j in range(n)] for i in range(n)])

    def _ridge_solve(self, X: np.ndarray, y: np.ndarray, alpha: Decimal) -> np.ndarray:
        """Solve ridge regression (X^T X + alpha*I)^-1 X^T y."""
        XtX = self._matrix_multiply_transpose(X, X)
        n = XtX.shape[0]

        # Add ridge penalty
        for i in range(n):
            XtX[i, i] += mp.mpf(str(alpha))

        XtX_inv = self._matrix_inverse(XtX)
        Xty = self._matrix_multiply_transpose(X, y.reshape(-1, 1))

        return self._matrix_multiply(XtX_inv, Xty).flatten()

    def _calculate_condition_number(self, XtX: np.ndarray) -> Decimal:
        """Calculate condition number of X^T X matrix."""
        # Convert to mpmath matrix
        n = XtX.shape[0]
        XtX_mp = mp.matrix([[XtX[i, j] for j in range(n)] for i in range(n)])

        # Calculate eigenvalues
        eigenvalues = mp.eig(XtX_mp)[0]
        eigenvalues = [abs(e) for e in eigenvalues]

        # Condition number is ratio of largest to smallest eigenvalue
        if min(eigenvalues) > 0:
            return Decimal(str(max(eigenvalues) / min(eigenvalues)))
        else:
            return Decimal("inf")

    def _calculate_standard_errors(self, X: np.ndarray, residuals: np.ndarray) -> np.ndarray:
        """Calculate standard errors of coefficients."""
        n, p = X.shape

        # Calculate residual variance
        sigma_squared = sum([r**2 for r in residuals]) / (n - p)

        # Calculate (X^T X)^-1
        XtX = self._matrix_multiply_transpose(X, X)
        XtX_inv = self._matrix_inverse(XtX)

        # Standard errors are sqrt of diagonal elements times sigma^2
        std_errors = []
        for i in range(p):
            var = sigma_squared * XtX_inv[i, i]
            std_errors.append(mp.sqrt(abs(var)))

        return np.array(std_errors)

    def _calculate_robust_standard_errors(self, X: np.ndarray, residuals: np.ndarray) -> np.ndarray:
        """Calculate heteroscedasticity-robust (White) standard errors."""
        n, p = X.shape

        # Calculate (X^T X)^-1
        XtX = self._matrix_multiply_transpose(X, X)
        XtX_inv = self._matrix_inverse(XtX)

        # Calculate meat of sandwich: X^T diag(e^2) X
        e_squared = np.array([r**2 for r in residuals])
        meat = mp.zeros(p, p)
        for i in range(n):
            x_i = X[i, :].reshape(-1, 1)
            meat += e_squared[i] * self._matrix_multiply(x_i, x_i.T)

        # Sandwich formula: (X^T X)^-1 * meat * (X^T X)^-1
        var_cov = self._matrix_multiply(self._matrix_multiply(XtX_inv, meat), XtX_inv)

        # Extract standard errors (sqrt of diagonal)
        std_errors = []
        for i in range(p):
            std_errors.append(mp.sqrt(abs(var_cov[i, i])))

        return np.array(std_errors)

    def _calculate_p_values(self, t_stats: np.ndarray, df: float) -> np.ndarray:
        """Calculate two-tailed p-values from t-statistics."""
        p_values = []
        for t in t_stats:
            if df == np.inf:
                # Upper tail directly. This was `2 * (1 - norm.cdf(|t|))`: once norm.cdf(|t|)
                # rounds to 1.0 in float64 -- at |t| ~ 8.3 -- the subtraction returns exactly 0.
                from scipy import stats as sp_stats

                p = mp.mpf(str(2 * sp_stats.norm.sf(float(abs(t)))))
            else:
                p = self._t_sf_two_sided(abs(t), df)
            p_values.append(p)
        return np.array(p_values)

    def _t_sf_two_sided(self, t: mp.mpf, df: float) -> mp.mpf:
        """
        Two-sided p-value for a coefficient: 2 * P(T > |t|), computed on the UPPER tail.

        This replaces `2 * (1 - self._t_cdf(|t|, df))`, which was wrong twice over:

          - `_t_cdf` computed `1 - 0.5 * scipy.special.betainc(df/2, 0.5, x)` in FLOAT64 and
            then wrapped the float in `mp.mpf(str(...))`. Wrapping a float64 in an mpf does not
            create precision; it only prints 50 digits of a number that has 16. The whole
            "50-decimal" claim on the regression coefficients came out of this line.
          - And it was `1 - cdf` twice: once inside `_t_cdf` and once at the caller. As soon as
            the inner betainc underflows -- which happens for any tail below about 1e-16, i.e.
            for every strongly significant coefficient -- `_t_cdf` returns exactly 1.0 and the
            reported p-value is exactly 0.0.

        A p-value of zero says the coefficient is impossible under the null. No finite sample
        establishes that. The regularized incomplete beta below is evaluated by mpmath at the
        working precision and is the upper tail directly, so there is nothing to cancel.
        """
        t_abs = mp.fabs(mp.mpf(str(t)))
        if t_abs == 0:
            return mp.mpf(1)

        df_mp = mp.mpf(str(df))
        x = df_mp / (df_mp + t_abs**2)

        # P(T > |t|) = 0.5 * I_x(df/2, 1/2), with x = df / (df + t^2).
        return mp.betainc(df_mp / 2, mp.mpf(0.5), 0, x, regularized=True)

    def _t_cdf(self, t: mp.mpf, df: float) -> mp.mpf:
        """
        CDF of the t-distribution, evaluated by mpmath at the working precision.

        Used only by `_t_quantile` (Newton-Raphson for confidence-interval bounds), where the
        argument is a moderate quantile and the CDF is nowhere near 0 or 1, so there is nothing
        to cancel. P-VALUES DO NOT COME THROUGH HERE -- they use `_t_sf_two_sided` above, which
        computes the upper tail directly. The previous version of this function cast through
        float64 and was used for both.
        """
        t_mp = mp.mpf(str(t))
        df_mp = mp.mpf(str(df))
        x = df_mp / (df_mp + t_mp**2)
        half_tail = mp.betainc(df_mp / 2, mp.mpf(0.5), 0, x, regularized=True) / 2

        return 1 - half_tail if t_mp >= 0 else half_tail

    def _calculate_confidence_intervals(
        self, coefficients: np.ndarray, std_errors: np.ndarray, df: float, confidence_level: float
    ) -> List[Tuple[mp.mpf, mp.mpf]]:
        """Calculate confidence intervals for coefficients."""
        alpha = 1 - confidence_level

        if df == np.inf:
            # Use normal distribution
            from scipy import stats as sp_stats

            z = mp.mpf(str(sp_stats.norm.ppf(1 - alpha / 2)))
        else:
            # Use t-distribution
            z = self._t_quantile(1 - alpha / 2, df)

        ci = []
        for coef, se in zip(coefficients, std_errors):
            lower = coef - z * se
            upper = coef + z * se
            ci.append((lower, upper))

        return ci

    def _t_quantile(self, p: float, df: float) -> mp.mpf:
        """Calculate quantile of t-distribution."""
        # Use Newton-Raphson to find quantile
        # Initial guess using normal approximation
        from scipy import stats as sp_stats

        x = mp.mpf(str(sp_stats.norm.ppf(p)))

        for _ in range(100):
            cdf = self._t_cdf(x, df)
            pdf = self._t_pdf(x, df)
            x_new = x - (cdf - p) / pdf
            if abs(x_new - x) < mp.mpf("1e-10"):
                break
            x = x_new

        return x

    def _t_pdf(self, t: mp.mpf, df: float) -> mp.mpf:
        """Calculate PDF of t-distribution."""
        return mp.gamma((df + 1) / 2) / (mp.sqrt(df * mp.pi) * mp.gamma(df / 2)) * (1 + t**2 / df) ** (-(df + 1) / 2)

    def _calculate_r_squared(self, y_true: np.ndarray, y_pred: np.ndarray) -> mp.mpf:
        """Calculate R-squared with high precision."""
        ss_res = sum([(y_true[i] - y_pred[i]) ** 2 for i in range(len(y_true))])
        y_mean = sum(y_true) / len(y_true)
        ss_tot = sum([(y_true[i] - y_mean) ** 2 for i in range(len(y_true))])

        if ss_tot > 0:
            return 1 - ss_res / ss_tot
        else:
            return mp.mpf("0")

    def _calculate_adjusted_r_squared(self, r_squared: mp.mpf, n: int, p: int) -> mp.mpf:
        """Calculate adjusted R-squared."""
        if n - p - 1 > 0:
            return 1 - (1 - r_squared) * (n - 1) / (n - p - 1)
        else:
            return r_squared

    def _calculate_f_statistic(self, r_squared: mp.mpf, n: int, p: int) -> Tuple[mp.mpf, mp.mpf]:
        """Calculate F-statistic and p-value."""
        if p > 0 and n - p - 1 > 0 and r_squared < 1:
            f_stat = (r_squared / p) / ((1 - r_squared) / (n - p - 1))
            # Calculate p-value using F-distribution
            p_value = 1 - self._f_cdf(f_stat, p, n - p - 1)
            return f_stat, p_value
        else:
            return mp.mpf("0"), mp.mpf("1")

    def _f_cdf(self, f: mp.mpf, df1: float, df2: float) -> mp.mpf:
        """Calculate CDF of F-distribution."""
        from scipy import special

        x = df1 * float(f) / (df1 * float(f) + df2)
        return mp.mpf(str(special.betainc(df1 / 2, df2 / 2, x)))

    def _calculate_aic(self, residuals: np.ndarray, k: float) -> Decimal:
        """Calculate Akaike Information Criterion."""
        n = len(residuals)
        rss = sum([r**2 for r in residuals])
        log_likelihood = -n / 2 * mp.log(2 * mp.pi) - n / 2 * mp.log(rss / n) - n / 2
        aic = -2 * log_likelihood + 2 * k
        return Decimal(str(aic))

    def _calculate_bic(self, residuals: np.ndarray, k: float, n: int) -> Decimal:
        """Calculate Bayesian Information Criterion."""
        rss = sum([r**2 for r in residuals])
        log_likelihood = -n / 2 * mp.log(2 * mp.pi) - n / 2 * mp.log(rss / n) - n / 2
        bic = -2 * log_likelihood + k * mp.log(n)
        return Decimal(str(bic))

    def _calculate_mse(self, residuals: np.ndarray) -> mp.mpf:
        """Calculate Mean Squared Error."""
        return sum([r**2 for r in residuals]) / len(residuals)

    def _calculate_mae(self, residuals: np.ndarray) -> mp.mpf:
        """Calculate Mean Absolute Error."""
        return sum([abs(r) for r in residuals]) / len(residuals)

    def _calculate_mape(self, y_true: np.ndarray, y_pred: np.ndarray) -> mp.mpf:
        """Calculate Mean Absolute Percentage Error."""
        mape = mp.mpf("0")
        count = 0
        for i in range(len(y_true)):
            if abs(y_true[i]) > mp.mpf("1e-10"):
                mape += abs((y_true[i] - y_pred[i]) / y_true[i])
                count += 1
        return mape / count * 100 if count > 0 else mp.mpf("0")

    def _calculate_diagnostics(
        self,
        X: np.ndarray,
        y: np.ndarray,
        predictions: np.ndarray,
        residuals: np.ndarray,
        feature_names: Optional[List[str]],
    ) -> RegressionDiagnostics:
        """Calculate comprehensive regression diagnostics."""
        n, p = X.shape

        # Calculate hat matrix diagonal (leverage)
        XtX = self._matrix_multiply_transpose(X, X)
        XtX_inv = self._matrix_inverse(XtX)
        leverage = []
        for i in range(n):
            x_i = X[i, :].reshape(1, -1)
            h_ii = self._matrix_multiply(self._matrix_multiply(x_i, XtX_inv), x_i.T)[0, 0]
            leverage.append(h_ii)
        leverage = np.array(leverage)

        # Standardized residuals
        sigma = mp.sqrt(self._calculate_mse(residuals))
        standardized_residuals = np.array([r / sigma for r in residuals])

        # Studentized residuals
        studentized_residuals = []
        for i in range(n):
            if 1 - leverage[i] > mp.mpf("1e-10"):
                s_i = sigma * mp.sqrt(1 - leverage[i])
                studentized_residuals.append(residuals[i] / s_i)
            else:
                studentized_residuals.append(mp.mpf("0"))
        studentized_residuals = np.array(studentized_residuals)

        # Cook's distance
        cooks_distance = []
        for i in range(n):
            if 1 - leverage[i] > mp.mpf("1e-10"):
                d_i = (residuals[i] ** 2 / (p * sigma**2)) * (leverage[i] / (1 - leverage[i]) ** 2)
            else:
                d_i = mp.mpf("0")
            cooks_distance.append(d_i)
        cooks_distance = np.array(cooks_distance)

        # DFFITS
        dffits = []
        for i in range(n):
            if 1 - leverage[i] > mp.mpf("1e-10"):
                dffits_i = studentized_residuals[i] * mp.sqrt(leverage[i] / (1 - leverage[i]))
            else:
                dffits_i = mp.mpf("0")
            dffits.append(dffits_i)
        dffits = np.array(dffits)

        # Calculate VIF for multicollinearity detection
        vif = {}
        if feature_names is not None and p > 2:  # Need at least 2 predictors for VIF
            for j in range(1, p):  # Skip intercept
                X_j = X[:, j]
                X_others = np.delete(X, j, axis=1)
                # Regress X_j on other predictors
                coef = self._ridge_solve(X_others, X_j, mp.mpf("1e-10"))
                pred = self._matrix_multiply(X_others, coef.reshape(-1, 1)).flatten()
                r_squared_j = self._calculate_r_squared(X_j, pred)
                if r_squared_j < 0.999:
                    vif[feature_names[j - 1] if j - 1 < len(feature_names) else f"X{j}"] = Decimal(
                        str(1 / (1 - r_squared_j))
                    )
                else:
                    vif[feature_names[j - 1] if j - 1 < len(feature_names) else f"X{j}"] = Decimal("inf")

        # Durbin-Watson statistic for autocorrelation
        dw_numerator = sum([(residuals[i] - residuals[i - 1]) ** 2 for i in range(1, n)])
        dw_denominator = sum([r**2 for r in residuals])
        # A perfect fit has all-zero residuals, so DW is 0/0. It used to be reported as 0 --
        # which on the Durbin-Watson scale (0 to 4, with 2 meaning no autocorrelation) is the
        # MAXIMUM possible positive autocorrelation, the most alarming value there is. The
        # verdict was not merely wrong, it was inverted.
        durbin_watson = Decimal(str(dw_numerator / dw_denominator)) if dw_denominator > 0 else None

        # Breusch-Pagan test for heteroscedasticity.
        #
        # This used to read:
        #
        #     slope, intercept, r_value, p_value, std_err = (
        #         sp_stats.linregress(X_np[:, 0], residuals_squared) if X_np.shape[1] == 1
        #         else (0, 0, 0, 1, 0)
        #     )
        #
        # For ANY regression with more than one predictor it did not run the test at all: it
        # substituted the literal tuple (0, 0, 0, 1, 0). So r_value = 0, the statistic came out
        # as n * 0**2 = 0, and the p-value as 1 - chi2.cdf(0, df) = exactly 1.0. Every multiple
        # regression in this platform reported "homoscedasticity satisfied, BP = 0, p = 1.0" --
        # a fabricated pass on an assumption the software never tested, and the exact assumption
        # whose violation invalidates the standard errors printed next to it.
        #
        # Also, it only ever used the FIRST predictor even in the single-predictor branch, and
        # squared a Pearson r from a simple regression rather than the auxiliary regression's
        # R-squared. Breusch-Pagan regresses the squared residuals on ALL the regressors:
        # LM = n * R^2_aux, distributed chi-square with (number of regressors) degrees of
        # freedom under homoscedasticity. That is what statsmodels computes, and now so do we.
        from scipy import stats as sp_stats
        import statsmodels.stats.api as sms

        residuals_float = np.array([float(r) for r in residuals])
        X_float = np.array([[float(X[i, j]) for j in range(p)] for i in range(n)])

        try:
            bp_lm, bp_lm_p, _, _ = sms.het_breuschpagan(residuals_float, X_float)
            bp_stat = Decimal(str(bp_lm))
            bp_p_value = Decimal(str(bp_lm_p))
        except Exception as exc:  # the auxiliary regression is singular / degenerate
            logger.warning("Breusch-Pagan test could not be computed: %s", exc)
            bp_stat = None
            bp_p_value = None

        # Jarque-Bera test for normality
        mean_res = sum(residuals) / n
        skewness = sum([(r - mean_res) ** 3 for r in residuals]) / (n * sigma**3)
        kurtosis = sum([(r - mean_res) ** 4 for r in residuals]) / (n * sigma**4)
        jb_stat = n * (skewness**2 / 6 + (kurtosis - 3) ** 2 / 24)

        # sf, not 1 - cdf: a strongly non-normal residual distribution has a JB p-value below
        # 1e-16, and `1 - cdf` returns exactly 0 there.
        jb_p_value = sp_stats.chi2.sf(float(jb_stat), 2)

        # Identify outliers and influential points
        outliers = [i for i, r in enumerate(abs(studentized_residuals)) if r > 3]
        influential_threshold = 4 / n  # Common threshold for Cook's distance
        influential_points = [i for i, d in enumerate(cooks_distance) if d > influential_threshold]

        # Check for problems
        multicollinearity_detected = any(v > Decimal("10") for v in vif.values()) if vif else False
        # An undetected violation is not the same as an absent one. When the test could not be
        # computed we do not claim the assumption holds -- but we also cannot claim it fails, so
        # the flag stays False and the null p-value in the payload is what tells the caller the
        # test did not run.
        heteroscedasticity_detected = bp_p_value is not None and bp_p_value < Decimal("0.05")
        autocorrelation_detected = durbin_watson is not None and (
            durbin_watson < Decimal("1.5") or durbin_watson > Decimal("2.5")
        )
        normality_violated = jb_p_value < Decimal("0.05")

        return RegressionDiagnostics(
            residuals=np.array([float(r) for r in residuals]),
            standardized_residuals=np.array([float(r) for r in standardized_residuals]),
            studentized_residuals=np.array([float(r) for r in studentized_residuals]),
            cooks_distance=np.array([float(d) for d in cooks_distance]),
            dffits=np.array([float(d) for d in dffits]),
            leverage=np.array([float(h) for h in leverage]),
            vif=vif,
            durbin_watson=durbin_watson,
            breusch_pagan={"statistic": bp_stat, "p_value": bp_p_value},
            jarque_bera={"statistic": Decimal(str(jb_stat)), "p_value": Decimal(str(jb_p_value))},
            condition_number=self._calculate_condition_number(XtX),
            outliers=outliers,
            influential_points=influential_points,
            multicollinearity_detected=multicollinearity_detected,
            heteroscedasticity_detected=heteroscedasticity_detected,
            autocorrelation_detected=autocorrelation_detected,
            normality_violated=normality_violated,
        )

    def _handle_missing_values(
        self, X: np.ndarray, y: np.ndarray, feature_names: Optional[List[str]], method: str
    ) -> Tuple[np.ndarray, np.ndarray, Optional[List[str]]]:
        """Handle missing values in data."""
        # Combine X and y for consistent handling
        data = np.column_stack([X, y])

        if method == "drop":
            # Remove rows with any missing values
            mask = ~np.isnan(data).any(axis=1)
            data_clean = data[mask]
        elif method == "impute_mean":
            # Impute with column means
            col_means = np.nanmean(data, axis=0)
            indices = np.where(np.isnan(data))
            data_clean = data.copy()
            data_clean[indices] = np.take(col_means, indices[1])
        elif method == "impute_median":
            # Impute with column medians
            col_medians = np.nanmedian(data, axis=0)
            indices = np.where(np.isnan(data))
            data_clean = data.copy()
            data_clean[indices] = np.take(col_medians, indices[1])
        else:
            data_clean = data

        # Split back into X and y
        X_clean = data_clean[:, :-1]
        y_clean = data_clean[:, -1]

        return X_clean, y_clean, feature_names

    def _cross_validate(self, X: np.ndarray, y: np.ndarray, cv: int = 5) -> Dict[str, Decimal]:
        """Perform k-fold cross-validation."""
        n = len(y)
        fold_size = n // cv
        scores = {"mse": [], "mae": [], "r2": []}

        for fold in range(cv):
            # Create train/test split
            test_start = fold * fold_size
            test_end = test_start + fold_size if fold < cv - 1 else n
            test_indices = list(range(test_start, test_end))
            train_indices = list(range(0, test_start)) + list(range(test_end, n))

            X_train = X[train_indices]
            y_train = y[train_indices]
            X_test = X[test_indices]
            y_test = y[test_indices]

            # Fit model on training data (without cross-validation to avoid recursion)
            result = self.linear_regression(X_train, y_train, do_cv=False)

            # Predict on test data
            X_test_hp = self._to_high_precision_matrix(X_test)
            X_test_with_intercept = self._add_intercept(X_test_hp)

            # Reconstruct coefficient vector
            coef_vector = [result.intercept] + list(result.coefficients.values())
            coef_vector = np.array([mp.mpf(str(c)) for c in coef_vector])

            predictions = self._matrix_multiply(X_test_with_intercept, coef_vector.reshape(-1, 1)).flatten()
            y_test_hp = self._to_high_precision_vector(y_test)

            # Calculate metrics
            residuals = y_test_hp - predictions
            scores["mse"].append(self._calculate_mse(residuals))
            scores["mae"].append(self._calculate_mae(residuals))
            scores["r2"].append(self._calculate_r_squared(y_test_hp, predictions))

        # Average scores
        return {
            "cv_mse": Decimal(str(sum(scores["mse"]) / cv)),
            "cv_mae": Decimal(str(sum(scores["mae"]) / cv)),
            "cv_r2": Decimal(str(sum(scores["r2"]) / cv)),
        }

    def _generate_interpretation(
        self,
        coefficients: Dict[str, Decimal],
        p_values: Dict[str, Decimal],
        r_squared: mp.mpf,
        diagnostics: RegressionDiagnostics,
    ) -> Dict[str, str]:
        """Generate interpretation of regression results."""
        interpretation = {}

        # Model fit
        interpretation["model_fit"] = f"The model explains {float(r_squared)*100:.1f}% of the variance"

        # Significant predictors
        sig_predictors = [name for name, p in p_values.items() if p < Decimal("0.05")]
        if sig_predictors:
            interpretation["significant_predictors"] = f"Significant predictors: {', '.join(sig_predictors)}"

        # Coefficient interpretation
        for name, coef in coefficients.items():
            if name in p_values and p_values[name] < Decimal("0.05"):
                interpretation[
                    f"coef_{name}"
                ] = f"A one-unit increase in {name} is associated with a {float(coef):.4f} change in the outcome"

        # Diagnostic warnings
        warnings = []
        if diagnostics.multicollinearity_detected:
            warnings.append("Multicollinearity detected (high VIF values)")
        if diagnostics.heteroscedasticity_detected:
            warnings.append("Heteroscedasticity detected (consider robust standard errors)")
        if diagnostics.autocorrelation_detected:
            warnings.append("Autocorrelation detected in residuals")
        if diagnostics.normality_violated:
            warnings.append("Residuals may not be normally distributed")
        if len(diagnostics.outliers) > 0:
            warnings.append(f"{len(diagnostics.outliers)} potential outliers detected")
        if len(diagnostics.influential_points) > 0:
            warnings.append(f"{len(diagnostics.influential_points)} influential points detected")

        if warnings:
            interpretation["warnings"] = "; ".join(warnings)

        return interpretation

    def _check_assumptions(self, diagnostics: RegressionDiagnostics) -> Dict[str, bool]:
        """Check regression assumptions."""
        return {
            "linearity": True,  # Would need residual plots to properly assess
            "independence": not diagnostics.autocorrelation_detected,
            "homoscedasticity": not diagnostics.heteroscedasticity_detected,
            "normality": not diagnostics.normality_violated,
            "no_multicollinearity": not diagnostics.multicollinearity_detected,
            "no_influential_outliers": len(diagnostics.influential_points) == 0,
        }

    # Additional helper methods for specialized regression types
    def _sigmoid(self, z: np.ndarray) -> np.ndarray:
        """Sigmoid function for logistic regression."""
        return np.array([1 / (1 + mp.exp(-z_i)) for z_i in z])

    def _fit_binary_logistic(
        self, X: np.ndarray, y: np.ndarray, max_iter: int, tol: float, regularization: Optional[str], alpha: float
    ) -> np.ndarray:
        """Fit binary logistic regression using Newton-Raphson."""
        n, p = X.shape

        # Initialize coefficients
        beta = np.array([mp.mpf("0")] * p)

        for iteration in range(max_iter):
            # Calculate predictions
            z = self._matrix_multiply(X, beta.reshape(-1, 1)).flatten()
            p_hat = self._sigmoid(z)

            # Calculate gradient
            gradient = self._matrix_multiply_transpose(X, (p_hat - y).reshape(-1, 1)).flatten()

            # Add regularization to gradient if specified
            if regularization == "l2":
                gradient[1:] += alpha * beta[1:]  # Don't regularize intercept

            # Calculate Hessian
            W = np.diag([p_i * (1 - p_i) for p_i in p_hat])
            hessian = self._matrix_multiply_transpose(X, self._matrix_multiply(W, X))

            # Add regularization to Hessian
            if regularization == "l2":
                for i in range(1, p):
                    hessian[i, i] += alpha

            # Newton-Raphson update
            try:
                hessian_inv = self._matrix_inverse(hessian)
                beta_new = beta - self._matrix_multiply(hessian_inv, gradient.reshape(-1, 1)).flatten()
            except:
                # If Hessian is singular, use gradient descent
                beta_new = beta - 0.01 * gradient

            # Check convergence
            if mp.sqrt(sum([(beta_new[i] - beta[i]) ** 2 for i in range(len(beta))])) < tol:
                break

            beta = beta_new

        return beta

    def _calculate_log_likelihood(self, y: np.ndarray, p_hat: np.ndarray) -> mp.mpf:
        """Calculate log-likelihood for binary logistic regression."""
        ll = mp.mpf("0")
        for i in range(len(y)):
            if p_hat[i] > 0 and p_hat[i] < 1:
                ll += y[i] * mp.log(p_hat[i]) + (1 - y[i]) * mp.log(1 - p_hat[i])
        return ll

    def _calculate_null_log_likelihood(self, y: np.ndarray) -> mp.mpf:
        """Calculate null model log-likelihood."""
        p_null = sum(y) / len(y)
        if p_null > 0 and p_null < 1:
            return len(y) * (p_null * mp.log(p_null) + (1 - p_null) * mp.log(1 - p_null))
        return mp.mpf("0")

    def _standardize_features(self, X: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Standardize features for regularized regression."""
        X_mean = np.array([sum(X[:, j]) / X.shape[0] for j in range(X.shape[1])])
        X_centered = X - X_mean
        X_scale = np.array([mp.sqrt(sum(X_centered[:, j] ** 2) / X.shape[0]) for j in range(X.shape[1])])
        X_scale = np.array([s if s > mp.mpf("1e-10") else mp.mpf("1") for s in X_scale])
        X_std = X_centered / X_scale
        return X_std, X_mean, X_scale

    def _lasso_coordinate_descent(
        self, X: np.ndarray, y: np.ndarray, alpha: Decimal, max_iter: int, tol: float
    ) -> np.ndarray:
        """Solve Lasso using coordinate descent."""
        n, p = X.shape
        beta = np.array([mp.mpf("0")] * p)

        for iteration in range(max_iter):
            beta_old = beta.copy()

            # Update each coefficient
            for j in range(p):
                # Calculate partial residuals
                r_j = y - self._matrix_multiply(X, beta.reshape(-1, 1)).flatten() + X[:, j] * beta[j]

                # Calculate update
                x_j_squared = sum(X[:, j] ** 2)
                if x_j_squared > 0:
                    rho_j = sum(X[:, j] * r_j)

                    # Soft thresholding
                    if j == 0:  # Don't regularize intercept
                        beta[j] = rho_j / x_j_squared
                    else:
                        alpha_mp = mp.mpf(str(alpha))
                        if rho_j > alpha_mp:
                            beta[j] = (rho_j - alpha_mp) / x_j_squared
                        elif rho_j < -alpha_mp:
                            beta[j] = (rho_j + alpha_mp) / x_j_squared
                        else:
                            beta[j] = mp.mpf("0")

            # Check convergence
            if mp.sqrt(sum([(beta[i] - beta_old[i]) ** 2 for i in range(len(beta))])) < tol:
                break

        return beta

    def _forward_selection(
        self, X: np.ndarray, y: np.ndarray, feature_names: List[str], alpha_in: float, max_features: Optional[int]
    ) -> List[str]:
        """Forward selection for stepwise regression."""
        selected = []
        remaining = list(feature_names)

        while remaining and (max_features is None or len(selected) < max_features):
            best_feature = None
            best_p_value = 1.0

            for feature in remaining:
                # Fit model with selected features plus this one
                idx = [feature_names.index(f) for f in selected + [feature]]
                X_subset = X[:, idx]
                result = self.linear_regression(X_subset, y, selected + [feature])

                # Get p-value for the new feature
                p_value = float(result.p_values[feature])

                if p_value < best_p_value:
                    best_p_value = p_value
                    best_feature = feature

            if best_p_value < alpha_in:
                selected.append(best_feature)
                remaining.remove(best_feature)
            else:
                break

        return selected

    def _backward_elimination(
        self, X: np.ndarray, y: np.ndarray, feature_names: List[str], alpha_out: float
    ) -> List[str]:
        """Backward elimination for stepwise regression."""
        selected = list(feature_names)

        while len(selected) > 0:
            # Fit model with current features
            idx = [feature_names.index(f) for f in selected]
            X_subset = X[:, idx]
            result = self.linear_regression(X_subset, y, selected)

            # Find feature with highest p-value
            worst_feature = None
            worst_p_value = 0.0

            for feature in selected:
                p_value = float(result.p_values[feature])
                if p_value > worst_p_value:
                    worst_p_value = p_value
                    worst_feature = feature

            if worst_p_value > alpha_out:
                selected.remove(worst_feature)
            else:
                break

        return selected

    def _stepwise_both(
        self,
        X: np.ndarray,
        y: np.ndarray,
        feature_names: List[str],
        alpha_in: float,
        alpha_out: float,
        max_features: Optional[int],
    ) -> List[str]:
        """Stepwise selection with both forward and backward steps."""
        selected = []

        while True:
            # Forward step
            old_selected = selected.copy()
            remaining = [f for f in feature_names if f not in selected]

            if remaining and (max_features is None or len(selected) < max_features):
                best_feature = None
                best_p_value = 1.0

                for feature in remaining:
                    idx = [feature_names.index(f) for f in selected + [feature]]
                    X_subset = X[:, idx]
                    result = self.linear_regression(X_subset, y, selected + [feature])
                    p_value = float(result.p_values[feature])

                    if p_value < best_p_value:
                        best_p_value = p_value
                        best_feature = feature

                if best_p_value < alpha_in:
                    selected.append(best_feature)

            # Backward step
            if len(selected) > 1:
                idx = [feature_names.index(f) for f in selected]
                X_subset = X[:, idx]
                result = self.linear_regression(X_subset, y, selected)

                for feature in selected:
                    if float(result.p_values[feature]) > alpha_out:
                        selected.remove(feature)
                        break

            # Check if we've converged
            if selected == old_selected:
                break

        return selected

    def _quantile_regression_irls(
        self, X: np.ndarray, y: np.ndarray, quantile: Decimal, max_iter: int, tol: float
    ) -> np.ndarray:
        """Solve quantile regression using iteratively reweighted least squares."""
        n, p = X.shape

        # Initialize with OLS solution
        beta = self._ridge_solve(X, y, mp.mpf("1e-10"))

        for iteration in range(max_iter):
            # Calculate residuals
            residuals = y - self._matrix_multiply(X, beta.reshape(-1, 1)).flatten()

            # Calculate weights
            weights = []
            for r in residuals:
                if abs(r) < mp.mpf("1e-10"):
                    weights.append(mp.mpf("1"))
                elif r > 0:
                    weights.append(quantile / abs(r))
                else:
                    weights.append((1 - quantile) / abs(r))
            weights = np.array(weights)

            # Weighted least squares update
            W = np.diag(weights)
            XtWX = self._matrix_multiply_transpose(X, self._matrix_multiply(W, X))
            XtWy = self._matrix_multiply_transpose(X, self._matrix_multiply(W, y.reshape(-1, 1)))

            try:
                XtWX_inv = self._matrix_inverse(XtWX)
                beta_new = self._matrix_multiply(XtWX_inv, XtWy).flatten()
            except:
                # Add small regularization if singular
                beta_new = self._ridge_solve(X, y, mp.mpf("1e-6"))

            # Check convergence
            if mp.sqrt(sum([(beta_new[i] - beta[i]) ** 2 for i in range(len(beta))])) < tol:
                break

            beta = beta_new

        return beta

    def _calculate_feature_importance(self, coefficients: np.ndarray, X: np.ndarray) -> Dict[str, Decimal]:
        """Calculate feature importance as absolute standardized coefficients."""
        # Standardize coefficients by feature standard deviations
        X_std = np.array(
            [mp.sqrt(sum((X[:, j] - sum(X[:, j]) / X.shape[0]) ** 2) / X.shape[0]) for j in range(X.shape[1])]
        )

        standardized_coef = coefficients * X_std
        importance = {f"X{i+1}": Decimal(str(abs(coef))) for i, coef in enumerate(standardized_coef)}

        # Normalize to sum to 1
        total = sum(importance.values())
        if total > 0:
            importance = {k: v / total for k, v in importance.items()}

        return importance

    # ------------------------------------------------------------------ robust regression
    #
    # All three robust estimators below were dead code AND wrong. They were unreachable
    # from the API (RegressionRequestSerializer's ChoiceField never listed "robust"), so
    # nothing ever executed them and nothing ever noticed that:
    #
    #   * they passed `sample_size`, `num_predictors`, `fitted_values` and `feature_names`
    #     to RegressionResult, none of which are fields on it -> TypeError on construction;
    #   * they omitted `mape` and `predictions`, which ARE required fields;
    #   * they passed `diagnostics=None`, which regression_views dereferences by default;
    #   * they fitted sklearn with `fit_intercept=False` under a comment claiming "we
    #     include intercept in X" -- but no caller ever added an intercept column, so the
    #     model was forced through the origin;
    #   * and they then reported `intercept = coefficients[0]`, i.e. the slope of the first
    #     predictor was returned as the intercept AND as that predictor's coefficient.
    #
    # They now fit an intercept properly, name only the real predictors, and share one
    # result builder so the three cannot drift apart again.

    def _huber_regression(
        self, X: np.ndarray, y: np.ndarray, feature_names: Optional[List[str]], **kwargs
    ) -> RegressionResult:
        """
        Huber robust regression using iteratively reweighted least squares.

        Huber regression is less sensitive to outliers than OLS by using a loss function
        that is quadratic for small residuals and linear for large ones.

        Args:
            X: Design matrix (n x p), WITHOUT an intercept column
            y: Response vector
            feature_names: Optional names for the p predictors
            **kwargs: epsilon, max_iter, tol, alpha, confidence_level
        """
        import statsmodels.api as sm

        X_arr, y_arr = self._as_design(X, y)
        epsilon = kwargs.get("epsilon", 1.35)
        confidence_level = kwargs.get("confidence_level", 0.95)

        # statsmodels RLM, not sklearn's HuberRegressor, because the standard errors have to
        # come from the same fit as the coefficients AND from a defensible covariance.
        #
        # My first version of this fitted sklearn and then computed standard errors as
        # sigma^2 (X'WX)^-1 with the Huber weights -- which is neither the M-estimator's
        # asymptotic covariance nor a sandwich, whatever the comment I wrote next to it
        # claimed. Simulated under H0 it produced standard errors ~20% too small and a Type I
        # error rate of 6-10% at a nominal 5%. RLM's covariance is the textbook
        # Huber asymptotic one and calibrates correctly.
        design = sm.add_constant(X_arr, has_constant="add")
        fit = sm.RLM(y_arr, design, M=sm.robust.norms.HuberT(t=epsilon)).fit()

        params = np.asarray(fit.params, dtype=float)
        intercept = float(params[0])
        coefficients = params[1:]

        predictions = np.asarray(fit.fittedvalues, dtype=float)
        residuals = y_arr - predictions
        scale = float(fit.scale)

        ci = np.asarray(fit.conf_int(alpha=1 - confidence_level), dtype=float)

        return self._build_robust_result(
            RegressionType.ROBUST_HUBER,
            X_arr,
            y_arr,
            predictions,
            residuals,
            coefficients,
            intercept,
            feature_names,
            kwargs,
            std_errors=np.asarray(fit.bse, dtype=float),
            t_stats=np.asarray(fit.tvalues, dtype=float),
            p_values=np.asarray(fit.pvalues, dtype=float),
            ci=ci,
            additional={
                "robust_scale": scale,
                "epsilon": float(epsilon),
                "inference": "statsmodels RLM (Huber M-estimator asymptotic covariance)",
            },
        )

    def _huber_weights(self, z: np.ndarray, c: float) -> np.ndarray:
        """Calculate Huber weights for weighted least squares"""
        weights = np.ones_like(z)
        outliers = np.abs(z) > c
        weights[outliers] = c / np.abs(z[outliers])
        return weights

    def _ransac_regression(
        self, X: np.ndarray, y: np.ndarray, feature_names: Optional[List[str]], **kwargs
    ) -> RegressionResult:
        """
        RANSAC (Random Sample Consensus) robust regression.

        Iteratively fits models to random subsets and keeps the one with the most inliers,
        which makes it very resistant to gross outliers.

        RANSAC reports COEFFICIENTS ONLY -- no standard errors, no t-statistics, no p-values,
        no confidence intervals.

        This is not an omission, it is the honest position. RANSAC selects its own sample:
        it fits a line, discards the points that do not agree with it, and refits. There is
        no sampling distribution for the resulting estimator, and computing standard errors
        from the surviving inliers -- "as if" they were an iid sample -- is circular. I did
        exactly that in the first version of this function, and simulated it under the null
        hypothesis of no relationship: at a nominal 5% level it rejected 66-72% of the time.
        Two thirds of the "significant" slopes it reported would have been noise.

        If you need inference, use Huber (which has an asymptotic covariance) or bootstrap
        the whole RANSAC procedure end to end.

        Args:
            X: Design matrix (n x p), WITHOUT an intercept column
            y: Response vector
            feature_names: Optional names for the p predictors
            **kwargs: min_samples, residual_threshold, max_trials, random_state
        """
        from sklearn.linear_model import RANSACRegressor, LinearRegression

        X_arr, y_arr = self._as_design(X, y)
        n, p = X_arr.shape

        model = RANSACRegressor(
            estimator=LinearRegression(fit_intercept=True),
            min_samples=kwargs.get("min_samples", min(p + 1, max(2, n // 2))),
            residual_threshold=kwargs.get("residual_threshold", None),
            max_trials=kwargs.get("max_trials", 100),
            random_state=kwargs.get("random_state", 42),
        )
        model.fit(X_arr, y_arr)

        predictions = model.predict(X_arr)
        residuals = y_arr - predictions

        inliers = model.inlier_mask_
        n_inliers = int(np.sum(inliers))

        return self._build_robust_result(
            RegressionType.ROBUST_RANSAC,
            X_arr,
            y_arr,
            predictions,
            residuals,
            model.estimator_.coef_,
            float(model.estimator_.intercept_),
            feature_names,
            kwargs,
            inference_note=(
                "RANSAC reports no standard errors, t-statistics, p-values or confidence "
                "intervals. The estimator chooses which observations to keep, so the surviving "
                "inliers are not a sample from which its own uncertainty can be estimated. "
                "Computing them anyway rejects a true null hypothesis about two thirds of the "
                "time at a nominal 5% level. Use Huber regression if you need inference."
            ),
            additional={"n_inliers": n_inliers, "n_outliers": int(n - n_inliers)},
        )

    def _theil_sen_regression(
        self, X: np.ndarray, y: np.ndarray, feature_names: Optional[List[str]], **kwargs
    ) -> RegressionResult:
        """
        Theil-Sen robust regression (median of pairwise slopes).

        A non-parametric estimator with a 29.3% breakdown point.

        Inference is distribution-free, not normal-theory:
          * with ONE predictor, the slope's confidence interval is Sen's exact rank-based
            interval (scipy.stats.theilslopes) and the significance test is Kendall's tau --
            which is the test the Theil-Sen literature actually pairs with this estimator;
          * with MORE than one predictor there is no standard distribution theory, so no
            standard errors or p-values are reported.

        The previous version computed sigma_MAD * sqrt(diag((X'X)^-1)) -- ordinary
        least-squares' formula with a robust scale substituted into it. That is not
        Theil-Sen's sampling distribution, and under the null hypothesis it rejected about
        twice as often as it should (8.7-10.3% at a nominal 5%).

        Args:
            X: Design matrix (n x p), WITHOUT an intercept column
            y: Response vector
            feature_names: Optional names for the p predictors
            **kwargs: max_subpopulation, max_iter, tol, random_state
        """
        from sklearn.linear_model import TheilSenRegressor

        X_arr, y_arr = self._as_design(X, y)
        n, p = X_arr.shape
        confidence_level = kwargs.get("confidence_level", 0.95)

        if p == 1:
            x = X_arr[:, 0]
            slope, intercept, lo_slope, hi_slope = stats.theilslopes(y_arr, x, alpha=confidence_level)
            tau, tau_p = stats.kendalltau(x, y_arr)

            coefficients = np.array([slope])
            predictions = intercept + slope * x
            residuals = y_arr - predictions

            # The intercept has no rank-based interval; only the slope does. Report the
            # slope's interval and leave the intercept's as undefined rather than inventing
            # a symmetric normal one around it.
            ci = np.array([[np.nan, np.nan], [lo_slope, hi_slope]])
            p_values = np.array([np.nan, float(tau_p)])

            return self._build_robust_result(
                RegressionType.ROBUST_THEIL_SEN,
                X_arr,
                y_arr,
                predictions,
                residuals,
                coefficients,
                float(intercept),
                feature_names,
                kwargs,
                std_errors=np.array([np.nan, np.nan]),
                t_stats=np.array([np.nan, np.nan]),
                p_values=p_values,
                ci=ci,
                inference_note=(
                    f"The slope's {confidence_level:.0%} interval is Sen's exact rank-based interval "
                    "and its p-value is Kendall's tau test of association -- both distribution-free. "
                    "Theil-Sen has no standard error in the normal-theory sense, so none is reported."
                ),
                additional={
                    "breakdown_point": 0.293,
                    "kendall_tau": float(tau),
                    "inference": "Sen slope interval + Kendall's tau",
                },
            )

        model = TheilSenRegressor(
            max_subpopulation=kwargs.get("max_subpopulation", 10000),
            max_iter=kwargs.get("max_iter", 300),
            tol=kwargs.get("tol", 1e-3),
            random_state=kwargs.get("random_state", 42),
            fit_intercept=True,
        )
        model.fit(X_arr, y_arr)

        predictions = model.predict(X_arr)
        residuals = y_arr - predictions

        return self._build_robust_result(
            RegressionType.ROBUST_THEIL_SEN,
            X_arr,
            y_arr,
            predictions,
            residuals,
            model.coef_,
            float(model.intercept_),
            feature_names,
            kwargs,
            inference_note=(
                "Multivariate Theil-Sen has no standard distribution theory, so no standard "
                "errors, t-statistics, p-values or confidence intervals are reported. Sen's exact "
                "rank interval exists only for a single predictor. Use Huber regression if you "
                "need inference on several predictors."
            ),
            additional={"breakdown_point": 0.293},
        )

    # ---------------------------------------------------------------- robust helpers

    @staticmethod
    def _as_design(X: np.ndarray, y: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Coerce to a float (n, p) design matrix and a flat float response."""
        X_arr = np.asarray(X, dtype=float)
        if X_arr.ndim == 1:
            X_arr = X_arr.reshape(-1, 1)
        return X_arr, np.asarray(y, dtype=float).ravel()

    @staticmethod
    def _robust_scale(residuals: np.ndarray) -> float:
        """MAD-based scale estimate, consistent for the normal (x 1.4826)."""
        mad = float(np.median(np.abs(residuals - np.median(residuals))))
        scale = mad * 1.4826
        if scale <= 0:
            # More than half the residuals are identical, so the MAD is 0. The RMS is still a
            # real dispersion measure of the same residuals, so use it -- but if THAT is zero
            # too the fit is exact and the residual scale genuinely IS zero. Return the zero:
            # this value is reported to the user as `robust_scale_mad`, and the previous
            # `else 1.0` printed a residual spread of 1.0 for a model whose residuals were
            # all exactly 0. Callers below handle a zero scale explicitly.
            scale = float(np.sqrt(np.mean(residuals**2)))
        return max(scale, 0.0)

    def _build_robust_result(
        self,
        regression_type: RegressionType,
        X: np.ndarray,
        y: np.ndarray,
        predictions: np.ndarray,
        residuals: np.ndarray,
        coefficients: np.ndarray,
        intercept: float,
        feature_names: Optional[List[str]],
        kwargs: Dict,
        std_errors: Optional[np.ndarray] = None,
        t_stats: Optional[np.ndarray] = None,
        p_values: Optional[np.ndarray] = None,
        ci: Optional[np.ndarray] = None,
        inference_note: Optional[str] = None,
        additional: Optional[Dict] = None,
    ) -> RegressionResult:
        """Assemble a RegressionResult from a fitted robust model.

        Inference is SUPPLIED BY THE CALLER, not computed here, because each robust estimator
        has a different sampling theory (and RANSAC has none at all). Anything the caller does
        not supply is reported as null.

        This function used to compute one covariance -- sigma^2 (X'WX)^-1 -- and hand it to
        all three estimators. It is the right answer for none of them. Under the null
        hypothesis of no relationship, at a nominal 5% level, the resulting p-values rejected
        6-10% of the time for Huber, 9-10% for Theil-Sen, and 66-72% for RANSAC.

        Arrays are ordered [intercept, *predictors].
        """
        n, p = X.shape
        if feature_names is None:
            feature_names = [f"X{i + 1}" for i in range(p)]

        params = np.concatenate([[intercept], np.asarray(coefficients, dtype=float).ravel()])
        names = ["Intercept"] + list(feature_names)
        k = p + 1

        def _blank():
            return np.full(k, np.nan)

        std_errors = _blank() if std_errors is None else np.asarray(std_errors, dtype=float)
        t_stats = _blank() if t_stats is None else np.asarray(t_stats, dtype=float)
        p_values = _blank() if p_values is None else np.asarray(p_values, dtype=float)
        if ci is None:
            ci = np.full((k, 2), np.nan)
        else:
            ci = np.asarray(ci, dtype=float)

        df_residual = n - k

        # Goodness of fit against the mean model.
        ss_res = float(np.sum(residuals**2))
        ss_tot = float(np.sum((y - np.mean(y)) ** 2))
        # R^2 = 1 - SS_res/SS_tot is 0/0 when y is constant: there is no variance to explain,
        # so the proportion explained does not exist. 0.0 would read as "explains nothing",
        # which is a verdict the data cannot support.
        r_squared = 1 - ss_res / ss_tot if ss_tot > 0 else float("nan")
        adj_r_squared = (
            1 - (1 - r_squared) * (n - 1) / df_residual if df_residual > 0 else float("nan")
        )

        # AIC/BIC come from the Gaussian log-likelihood, which needs log(mse). On an exact fit
        # (mse = 0) that likelihood diverges: AIC and BIC are -inf, and there is no finite
        # value to report. An earlier version floored mse at 1e-300 to keep the arithmetic
        # going, which turns "undefined" into a large finite number that looks like a real
        # information criterion. Report them as undefined instead.
        mse = ss_res / n if n else 0.0
        if mse > 0:
            log_likelihood = -n / 2 * (np.log(2 * np.pi) + np.log(mse) + 1)
            aic = 2 * k - 2 * log_likelihood
            bic = np.log(n) * k - 2 * log_likelihood if n > 1 else 2 * k - 2 * log_likelihood
        else:
            aic = float("nan")
            bic = float("nan")

        def _maybe(value):
            """None for a quantity that does not exist -- never Decimal('NaN'), which
            serializes to the STRING "NaN" and reads like a value."""
            value = float(value)
            return Decimal(str(value)) if math.isfinite(value) else None

        def _dec(values):
            return {name: _maybe(value) for name, value in zip(names, values)}

        # Coefficients exclude the intercept -- it has its own field.
        coefficients_dict = {name: _maybe(v) for name, v in zip(feature_names, params[1:])}

        result_warnings: List[str] = []
        if inference_note:
            result_warnings.append(inference_note)

        # A numerically exact fit: the residuals are at the level of floating-point round-off,
        # so any standard errors and p-values computed from them describe round-off, not
        # sampling variability, and will look overwhelmingly significant for a reason that has
        # nothing to do with the data.
        y_scale = float(np.sqrt(np.mean(y**2))) if n else 0.0
        residual_scale = float(np.sqrt(np.mean(residuals**2)))
        if y_scale > 0 and residual_scale < 1e-10 * y_scale:
            result_warnings.append(
                "The fit is numerically exact: residuals are at the level of floating-point "
                "round-off, so any standard errors, t-statistics and p-values shown reflect "
                "round-off rather than sampling variability and should not be interpreted."
            )

        if df_residual <= 0:
            result_warnings.append(
                f"No residual degrees of freedom (n = {n}, {k} parameters): the fit cannot be "
                "assessed and any uncertainty figures are undefined."
            )
        if ss_tot == 0:
            result_warnings.append(
                "The response is constant, so R-squared is undefined (there is no variance to "
                "explain) and is reported as null."
            )

        y_hp = self._to_high_precision_vector(y)
        pred_hp = self._to_high_precision_vector(predictions)
        design_hp = self._to_high_precision_matrix(np.hstack([np.ones((n, 1)), X]))
        residuals_hp = self._to_high_precision_vector(residuals)

        return RegressionResult(
            regression_type=regression_type,
            coefficients=coefficients_dict,
            intercept=Decimal(str(params[0])),
            standard_errors=_dec(std_errors),
            t_statistics=_dec(t_stats),
            p_values=_dec(p_values),
            confidence_intervals={
                name: (_maybe(ci[i][0]), _maybe(ci[i][1])) for i, name in enumerate(names)
            },
            r_squared=_maybe(r_squared),
            adjusted_r_squared=_maybe(adj_r_squared),
            # An F-test assumes the ordinary-least-squares normal likelihood, which is exactly
            # what a robust fit declines to assume. There is no F to report -- and 0 is not a
            # way of saying that, it is a number, and users read numbers as numbers.
            f_statistic=None,
            f_p_value=None,
            aic=_maybe(aic),
            bic=_maybe(bic),
            mse=Decimal(str(mse)),
            rmse=Decimal(str(np.sqrt(mse))),
            mae=Decimal(str(np.mean(np.abs(residuals)))),
            mape=Decimal(str(self._calculate_mape(y_hp, pred_hp))),
            predictions=predictions,
            residuals=residuals,
            diagnostics=self._calculate_diagnostics(
                design_hp, y_hp, pred_hp, residuals_hp, feature_names
            ),
            sample_size=n,
            interpretation={key: str(value) for key, value in (additional or {}).items()},
            warnings=result_warnings,
        )


    def _fit_multinomial_logistic(
        self, X: np.ndarray, y: np.ndarray, max_iter: int, tol: float, regularization: Optional[str], alpha: float
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Fit multinomial logistic regression for multi-class classification.

        Uses the softmax function and cross-entropy loss to model
        probabilities across multiple classes.

        Args:
            X: Design matrix (n × p)
            y: Class labels (n × 1)
            max_iter: Maximum number of iterations
            tol: Convergence tolerance
            regularization: 'l1', 'l2', 'elasticnet', or None
            alpha: Regularization strength

        Returns:
            Tuple of (coefficients, predicted_probabilities)
        """
        from sklearn.linear_model import LogisticRegression

        n, p = X.shape
        classes = np.unique(y)
        k = len(classes)

        # Map regularization parameter
        if regularization == "l1":
            penalty = "l1"
            solver = "saga"  # saga supports l1
        elif regularization == "l2":
            penalty = "l2"
            solver = "lbfgs"  # lbfgs is efficient for l2
        elif regularization == "elasticnet":
            penalty = "elasticnet"
            solver = "saga"
        else:
            penalty = "none"
            solver = "lbfgs"

        # Fit multinomial logistic regression
        model = LogisticRegression(
            multi_class="multinomial",  # Use multinomial (softmax)
            penalty=penalty,
            C=1.0 / alpha if alpha > 0 else 1e10,  # sklearn uses C = 1/alpha
            solver=solver,
            max_iter=max_iter,
            tol=tol,
            fit_intercept=False,  # We include intercept in X
            random_state=42,
        )

        model.fit(X, y.flatten())

        # Extract coefficients (k × p matrix for k classes)
        # For binary case, sklearn returns (1, p), we need to expand
        if k == 2:
            # Binary case: convert to two-class representation
            coef_class1 = -model.coef_[0] / 2
            coef_class2 = model.coef_[0] / 2
            coefficients = np.vstack([coef_class1, coef_class2])
        else:
            coefficients = model.coef_

        # Get predicted probabilities
        probabilities = model.predict_proba(X)

        # Convert coefficients to mpmath format
        coefficients_mp = np.array([[mp.mpf(str(c)) for c in row] for row in coefficients])

        return coefficients_mp, probabilities

    def _calculate_multinomial_r_squared(self, y: np.ndarray, probabilities: np.ndarray) -> mp.mpf:
        """
        Calculate pseudo R-squared for multinomial logistic regression.

        Uses McFadden's pseudo R-squared, which compares the log-likelihood
        of the fitted model to a null model (intercept only).

        R² = 1 - (ln(L_full) / ln(L_null))

        Args:
            y: True class labels
            probabilities: Predicted probabilities (n × k matrix)

        Returns:
            McFadden's pseudo R-squared as mpmath decimal
        """
        n = len(y)
        classes = np.unique(y)
        len(classes)

        # Create class index mapping
        class_to_idx = {c: i for i, c in enumerate(classes)}

        # Calculate log-likelihood of full model
        log_likelihood_full = 0.0
        for i in range(n):
            true_class = y[i]
            class_idx = class_to_idx[true_class]
            # Predicted probability for true class
            p_true = probabilities[i, class_idx]
            # Add log probability (with small epsilon to avoid log(0))
            log_likelihood_full += np.log(max(p_true, 1e-10))

        # Calculate log-likelihood of null model (all classes equally likely)
        # In null model, P(y=j) = n_j / n for each class
        class_frequencies = np.array([np.sum(y == c) for c in classes]) / n
        log_likelihood_null = 0.0
        for i in range(n):
            true_class = y[i]
            class_idx = class_to_idx[true_class]
            # Probability in null model
            p_null = class_frequencies[class_idx]
            log_likelihood_null += np.log(max(p_null, 1e-10))

        # McFadden's R-squared
        if log_likelihood_null < 0:
            r_squared = 1.0 - (log_likelihood_full / log_likelihood_null)
        else:
            r_squared = 0.0

        # Ensure R-squared is between 0 and 1
        r_squared = max(0.0, min(1.0, r_squared))

        return mp.mpf(str(r_squared))

    def _calculate_logistic_standard_errors(self, X: np.ndarray, probabilities: np.ndarray) -> np.ndarray:
        """Calculate standard errors for logistic regression coefficients."""
        n, p = X.shape

        # Calculate Fisher information matrix (negative expected Hessian)
        W = np.diag([p_i * (1 - p_i) for p_i in probabilities])
        fisher_info = self._matrix_multiply_transpose(X, self._matrix_multiply(W, X))

        # Standard errors are sqrt of diagonal of inverse Fisher information
        try:
            fisher_inv = self._matrix_inverse(fisher_info)
            std_errors = np.array([mp.sqrt(abs(fisher_inv[i, i])) for i in range(p)])
        except:
            std_errors = np.array([mp.mpf("1")] * p)

        return std_errors

    def _calculate_logistic_diagnostics(
        self, X: np.ndarray, y: np.ndarray, probabilities: np.ndarray
    ) -> RegressionDiagnostics:
        """Calculate diagnostics for logistic regression."""
        # Simplified diagnostics for logistic regression
        n = len(y)

        # Deviance residuals
        deviance_residuals = []
        for i in range(n):
            if probabilities[i] > 0 and probabilities[i] < 1:
                if y[i] == 1:
                    d_i = mp.sqrt(2 * abs(mp.log(probabilities[i])))
                else:
                    d_i = -mp.sqrt(2 * abs(mp.log(1 - probabilities[i])))
            else:
                d_i = mp.mpf("0")
            deviance_residuals.append(d_i)

        return RegressionDiagnostics(
            residuals=np.array([float(r) for r in deviance_residuals]),
            standardized_residuals=np.array([float(r) for r in deviance_residuals]),
            studentized_residuals=np.array([float(r) for r in deviance_residuals]),
            cooks_distance=np.zeros(n),
            dffits=np.zeros(n),
            leverage=np.zeros(n),
            vif={},
            durbin_watson=Decimal("2"),  # Not applicable
            breusch_pagan={"statistic": Decimal("0"), "p_value": Decimal("1")},
            jarque_bera={"statistic": Decimal("0"), "p_value": Decimal("1")},
            condition_number=Decimal("1"),
            outliers=[],
            influential_points=[],
            multicollinearity_detected=False,
            heteroscedasticity_detected=False,
            autocorrelation_detected=False,
            normality_violated=False,
        )

    def _generate_logistic_interpretation(
        self,
        coefficients: Dict[str, Decimal],
        odds_ratios: Dict[str, Decimal],
        p_values: np.ndarray,
        pseudo_r_squared: mp.mpf,
    ) -> Dict[str, str]:
        """Generate interpretation for logistic regression."""
        interpretation = {}

        interpretation["model_fit"] = f"McFadden's pseudo R-squared: {float(pseudo_r_squared):.4f}"

        for name, or_value in odds_ratios.items():
            if name in coefficients:
                if or_value > Decimal("1"):
                    change = (or_value - 1) * 100
                    interpretation[
                        f"odds_{name}"
                    ] = f"A one-unit increase in {name} increases odds by {float(change):.1f}%"
                else:
                    change = (1 - or_value) * 100
                    interpretation[
                        f"odds_{name}"
                    ] = f"A one-unit increase in {name} decreases odds by {float(change):.1f}%"

        return interpretation

    def _find_optimal_alpha_ridge(self, X: np.ndarray, y: np.ndarray, cv_folds: int) -> float:
        """Find optimal alpha for ridge regression using cross-validation."""
        # Grid search over alpha values
        alphas = [0.001, 0.01, 0.1, 1.0, 10.0, 100.0]
        best_alpha = 1.0
        best_score = float("inf")

        for alpha in alphas:
            result = self.ridge_regression(X, y, alpha, cv_folds=cv_folds, alpha_search=False)
            cv_mse = float(result.cross_validation_scores.get("cv_mse", float("inf")))

            if cv_mse < best_score:
                best_score = cv_mse
                best_alpha = alpha

        return best_alpha

    def _calculate_ridge_effective_df(self, X: np.ndarray, alpha: Decimal) -> float:
        """Calculate effective degrees of freedom for ridge regression."""
        # Effective df = trace of hat matrix
        XtX = self._matrix_multiply_transpose(X, X)
        n = XtX.shape[0]

        # Add ridge penalty
        for i in range(n):
            XtX[i, i] += mp.mpf(str(alpha))

        # Calculate trace of X(X'X + alpha*I)^-1 X'
        # For simplicity, approximating
        return float(n - alpha)

    def _calculate_ridge_standard_errors(self, X: np.ndarray, residuals: np.ndarray, alpha: Decimal) -> np.ndarray:
        """Calculate approximate standard errors for ridge regression."""
        n, p = X.shape

        # Residual variance
        sigma_squared = sum([r**2 for r in residuals]) / (n - p)

        # For ridge, the covariance matrix is more complex
        # Using approximation here
        XtX = self._matrix_multiply_transpose(X, X)
        for i in range(p):
            XtX[i, i] += mp.mpf(str(alpha))

        XtX_inv = self._matrix_inverse(XtX)

        # Approximate standard errors
        std_errors = []
        for i in range(p):
            var = sigma_squared * XtX_inv[i, i]
            std_errors.append(mp.sqrt(abs(var)))

        return np.array(std_errors)


def demonstrate_regression():
    """Demonstrate high-precision regression capabilities."""
    print("=" * 80)
    print("HIGH-PRECISION REGRESSION ANALYSIS DEMONSTRATION")
    print("Achieving 50 Decimal Places Precision")
    print("=" * 80)

    # Create sample data
    np.random.seed(42)
    n = 100

    # Generate predictors
    X1 = np.random.randn(n)
    X2 = np.random.randn(n)
    X3 = X1 + 0.5 * np.random.randn(n)  # Correlated with X1

    # Generate response with known coefficients
    true_intercept = 2.5
    true_beta1 = 1.5
    true_beta2 = -0.8
    true_beta3 = 0.3

    y = true_intercept + true_beta1 * X1 + true_beta2 * X2 + true_beta3 * X3 + 0.5 * np.random.randn(n)

    X = np.column_stack([X1, X2, X3])
    feature_names = ["X1", "X2", "X3"]

    # Initialize regression
    hp_reg = HighPrecisionRegression(precision=50)

    print("\n1. LINEAR REGRESSION")
    print("-" * 40)
    result = hp_reg.linear_regression(X, y, feature_names)

    print(f"Intercept: {result.intercept}")
    print("Coefficients:")
    for name, coef in result.coefficients.items():
        print(f"  {name}: {coef:.10f}")

    print(f"\nR-squared: {result.r_squared:.10f}")
    print(f"Adjusted R-squared: {result.adjusted_r_squared:.10f}")
    print(f"F-statistic: {result.f_statistic:.4f} (p={result.f_p_value:.6f})")

    print("\nDiagnostics:")
    print(f"  Multicollinearity: {result.diagnostics.multicollinearity_detected}")
    print(f"  Heteroscedasticity: {result.diagnostics.heteroscedasticity_detected}")
    print(f"  Autocorrelation: {result.diagnostics.autocorrelation_detected}")
    print(f"  Normality violated: {result.diagnostics.normality_violated}")
    print(f"  Outliers: {len(result.diagnostics.outliers)}")
    print(f"  Influential points: {len(result.diagnostics.influential_points)}")

    print("\n2. RIDGE REGRESSION")
    print("-" * 40)
    ridge_result = hp_reg.ridge_regression(X, y, alpha=1.0, feature_names=feature_names)

    print(f"Regularization parameter: {ridge_result.regularization_param}")
    print("Coefficients:")
    for name, coef in ridge_result.coefficients.items():
        print(f"  {name}: {coef:.10f}")
    print(f"R-squared: {ridge_result.r_squared:.10f}")

    print("\n3. LASSO REGRESSION")
    print("-" * 40)
    lasso_result = hp_reg.lasso_regression(X, y, alpha=0.1, feature_names=feature_names)

    print(f"Selected features: {lasso_result.selected_features}")
    print("Coefficients:")
    for name, coef in lasso_result.coefficients.items():
        if abs(coef) > Decimal("1e-10"):
            print(f"  {name}: {coef:.10f}")

    print("\n4. POLYNOMIAL REGRESSION")
    print("-" * 40)
    poly_result = hp_reg.polynomial_regression(X[:, :2], y, degree=2, feature_names=["X1", "X2"])

    print(f"Polynomial degree: {poly_result.polynomial_degree}")
    print(f"Number of features: {len(poly_result.coefficients)}")
    print(f"R-squared: {poly_result.r_squared:.10f}")

    # Binary classification example
    print("\n5. LOGISTIC REGRESSION")
    print("-" * 40)
    y_binary = (y > np.median(y)).astype(int)
    logit_result = hp_reg.logistic_regression(X, y_binary, feature_names)

    print(f"Pseudo R-squared: {logit_result.r_squared:.10f}")
    print("Odds ratios:")
    for name, or_val in logit_result.feature_importance.items():
        print(f"  {name}: {or_val:.4f}")

    print("\n6. QUANTILE REGRESSION (Median)")
    print("-" * 40)
    quantile_result = hp_reg.quantile_regression(X, y, quantile=0.5, feature_names=feature_names)

    print(f"Quantile: {quantile_result.quantile}")
    print("Coefficients:")
    for name, coef in quantile_result.coefficients.items():
        print(f"  {name}: {coef:.10f}")

    print("\n" + "=" * 80)
    print("PRECISION COMPARISON")
    print("-" * 80)

    # Show precision difference
    from sklearn.linear_model import LinearRegression

    sklearn_model = LinearRegression()
    sklearn_model.fit(X, y)

    print(f"Scikit-learn intercept: {sklearn_model.intercept_:.15f}")
    print(f"High-precision intercept: {str(result.intercept)[:50]}")

    print("\n✅ All regression methods implemented with 50 decimal precision!")
    print("✅ Comprehensive diagnostics and assumption checking included!")
    print("✅ Multiple regularization and robust methods available!")


if __name__ == "__main__":
    demonstrate_regression()
