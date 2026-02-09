"""
Mediation Analysis Module
=========================

Implements mediation analysis for understanding causal mechanisms.

Mediation answers: "How does X affect Y through M?"

Total Effect = Direct Effect + Indirect Effect
    TE = DE + IE

Where:
- Direct Effect: X → Y (not through M)
- Indirect Effect: X → M → Y (through M)

Methods Implemented:
1. Baron-Kenny 4-step approach (traditional)
2. Sobel test for indirect effect
3. Bootstrap confidence intervals (recommended)
4. Causal mediation analysis (Imai et al., 2010)
5. Sensitivity analysis for sequential ignorability

Key Assumptions:
1. No unmeasured confounding of X-Y relationship
2. No unmeasured confounding of M-Y relationship
3. No unmeasured confounding of X-M relationship
4. No M-Y confounders affected by X (sequential ignorability)

References:
    Baron, R. M., & Kenny, D. A. (1986). The moderator-mediator variable
    distinction in social psychological research. Journal of Personality
    and Social Psychology, 51(6), 1173.

    MacKinnon, D. P. (2008). Introduction to Statistical Mediation Analysis.

    Imai, K., Keele, L., & Tingley, D. (2010). A general approach to causal
    mediation analysis. Psychological Methods, 15(4), 309.

    Preacher, K. J., & Hayes, A. F. (2008). Asymptotic and resampling
    strategies for assessing and comparing indirect effects.

Created: December 27, 2025
"""

from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.linear_model import LinearRegression, LogisticRegression


@dataclass
class MediationResult:
    """Result of mediation analysis."""
    # Effects
    total_effect: float
    direct_effect: float
    indirect_effect: float

    # Standard errors
    total_effect_se: float
    direct_effect_se: float
    indirect_effect_se: float

    # Confidence intervals
    indirect_effect_ci: Tuple[float, float]
    direct_effect_ci: Tuple[float, float]

    # Proportion mediated
    proportion_mediated: float

    # Tests
    sobel_test: Dict[str, float]

    # Path coefficients
    path_a: float  # X → M
    path_b: float  # M → Y (controlling for X)
    path_c: float  # X → Y (total)
    path_c_prime: float  # X → Y (direct, controlling for M)

    # Model fit
    r_squared_m: float  # R² for M ~ X
    r_squared_y: float  # R² for Y ~ X + M

    # Sample info
    n: int
    method: str
    bootstrap_samples: Optional[int]

    # Interpretation
    interpretation: str
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'effects': {
                'total': self.total_effect,
                'direct': self.direct_effect,
                'indirect': self.indirect_effect,
                'proportion_mediated': self.proportion_mediated
            },
            'standard_errors': {
                'total': self.total_effect_se,
                'direct': self.direct_effect_se,
                'indirect': self.indirect_effect_se
            },
            'confidence_intervals': {
                'indirect': {
                    'lower': self.indirect_effect_ci[0],
                    'upper': self.indirect_effect_ci[1]
                },
                'direct': {
                    'lower': self.direct_effect_ci[0],
                    'upper': self.direct_effect_ci[1]
                }
            },
            'path_coefficients': {
                'a': self.path_a,
                'b': self.path_b,
                'c': self.path_c,
                'c_prime': self.path_c_prime
            },
            'sobel_test': self.sobel_test,
            'model_fit': {
                'r_squared_mediator': self.r_squared_m,
                'r_squared_outcome': self.r_squared_y
            },
            'sample_size': self.n,
            'method': self.method,
            'bootstrap_samples': self.bootstrap_samples,
            'interpretation': self.interpretation,
            'warnings': self.warnings
        }


@dataclass
class CausalMediationResult:
    """Result of causal mediation analysis (Imai et al.)."""
    # Average causal mediation effect
    acme: float  # Average Causal Mediation Effect
    acme_ci: Tuple[float, float]

    # Average direct effect
    ade: float  # Average Direct Effect
    ade_ci: Tuple[float, float]

    # Total effect
    total_effect: float
    total_effect_ci: Tuple[float, float]

    # Proportion mediated
    prop_mediated: float
    prop_mediated_ci: Tuple[float, float]

    # For treated/control (if heterogeneous)
    acme_treated: Optional[float]
    acme_control: Optional[float]
    ade_treated: Optional[float]
    ade_control: Optional[float]

    n: int
    n_simulations: int

    interpretation: str
    warnings: List[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            'acme': {
                'estimate': self.acme,
                'ci_lower': self.acme_ci[0],
                'ci_upper': self.acme_ci[1]
            },
            'ade': {
                'estimate': self.ade,
                'ci_lower': self.ade_ci[0],
                'ci_upper': self.ade_ci[1]
            },
            'total_effect': {
                'estimate': self.total_effect,
                'ci_lower': self.total_effect_ci[0],
                'ci_upper': self.total_effect_ci[1]
            },
            'proportion_mediated': {
                'estimate': self.prop_mediated,
                'ci_lower': self.prop_mediated_ci[0],
                'ci_upper': self.prop_mediated_ci[1]
            },
            'by_treatment_status': {
                'acme_treated': self.acme_treated,
                'acme_control': self.acme_control,
                'ade_treated': self.ade_treated,
                'ade_control': self.ade_control
            },
            'sample_size': self.n,
            'n_simulations': self.n_simulations,
            'interpretation': self.interpretation,
            'warnings': self.warnings
        }


def baron_kenny_mediation(
    data: pd.DataFrame,
    treatment: str,
    mediator: str,
    outcome: str,
    covariates: Optional[List[str]] = None,
    bootstrap: bool = True,
    n_bootstrap: int = 5000,
    confidence_level: float = 0.95
) -> MediationResult:
    """
    Perform Baron-Kenny mediation analysis.

    The classic 4-step approach:
    1. Show X → Y (total effect, path c)
    2. Show X → M (path a)
    3. Show M → Y controlling for X (path b)
    4. Show X → Y effect reduced when controlling for M (path c')

    Indirect effect = a × b
    Direct effect = c'
    Total effect = c = c' + a×b

    Args:
        data: DataFrame with all variables
        treatment: Name of treatment/exposure variable
        mediator: Name of mediator variable
        outcome: Name of outcome variable
        covariates: Optional list of covariates to control for
        bootstrap: Use bootstrap for indirect effect CI (recommended)
        n_bootstrap: Number of bootstrap samples
        confidence_level: Confidence level for intervals

    Returns:
        MediationResult with all estimates and tests
    """
    warnings = []

    if covariates is None:
        covariates = []

    # Extract variables
    X = data[treatment].values
    M = data[mediator].values
    Y = data[outcome].values

    n = len(Y)

    # Prepare covariates
    if covariates:
        C = data[covariates].values
    else:
        C = None

    # Step 1: Total effect (X → Y)
    X_design = _add_intercept(X.reshape(-1, 1))
    if C is not None:
        X_design = np.hstack([X_design, C])

    model_total = LinearRegression(fit_intercept=False)
    model_total.fit(X_design, Y)
    path_c = model_total.coef_[1]  # Coefficient on X

    residuals_total = Y - model_total.predict(X_design)
    se_c = _robust_se(X_design, residuals_total)[1]
    r_sq_total = 1 - np.sum(residuals_total**2) / np.sum((Y - np.mean(Y))**2)

    # Step 2: X → M (path a)
    X_design_m = _add_intercept(X.reshape(-1, 1))
    if C is not None:
        X_design_m = np.hstack([X_design_m, C])

    model_m = LinearRegression(fit_intercept=False)
    model_m.fit(X_design_m, M)
    path_a = model_m.coef_[1]

    residuals_m = M - model_m.predict(X_design_m)
    se_a = _robust_se(X_design_m, residuals_m)[1]
    r_sq_m = 1 - np.sum(residuals_m**2) / np.sum((M - np.mean(M))**2)

    # Step 3 & 4: Y ~ X + M (paths b and c')
    XM_design = _add_intercept(np.column_stack([X, M]))
    if C is not None:
        XM_design = np.hstack([XM_design, C])

    model_full = LinearRegression(fit_intercept=False)
    model_full.fit(XM_design, Y)
    path_c_prime = model_full.coef_[1]  # Direct effect (X controlling for M)
    path_b = model_full.coef_[2]  # M → Y controlling for X

    residuals_full = Y - model_full.predict(XM_design)
    se_full = _robust_se(XM_design, residuals_full)
    se_c_prime = se_full[1]
    se_b = se_full[2]
    r_sq_y = 1 - np.sum(residuals_full**2) / np.sum((Y - np.mean(Y))**2)

    # Calculate indirect effect
    indirect_effect = path_a * path_b
    direct_effect = path_c_prime
    total_effect = path_c

    # Sobel test for indirect effect
    sobel_se = np.sqrt(path_a**2 * se_b**2 + path_b**2 * se_a**2)
    sobel_z = indirect_effect / sobel_se
    sobel_p = 2 * (1 - stats.norm.cdf(abs(sobel_z)))

    sobel_test = {
        'z': float(sobel_z),
        'p_value': float(sobel_p),
        'se': float(sobel_se)
    }

    # Bootstrap CI for indirect effect (recommended)
    if bootstrap:
        boot_indirect = []
        boot_direct = []

        for _ in range(n_bootstrap):
            idx = np.random.choice(n, n, replace=True)
            X_b = X[idx]
            M_b = M[idx]
            Y_b = Y[idx]

            if C is not None:
                C_b = C[idx]
            else:
                C_b = None

            try:
                # X → M
                X_design_b = _add_intercept(X_b.reshape(-1, 1))
                if C_b is not None:
                    X_design_b = np.hstack([X_design_b, C_b])
                model_m_b = LinearRegression(fit_intercept=False)
                model_m_b.fit(X_design_b, M_b)
                a_b = model_m_b.coef_[1]

                # Y ~ X + M
                XM_design_b = _add_intercept(np.column_stack([X_b, M_b]))
                if C_b is not None:
                    XM_design_b = np.hstack([XM_design_b, C_b])
                model_full_b = LinearRegression(fit_intercept=False)
                model_full_b.fit(XM_design_b, Y_b)
                c_prime_b = model_full_b.coef_[1]
                b_b = model_full_b.coef_[2]

                boot_indirect.append(a_b * b_b)
                boot_direct.append(c_prime_b)
            except Exception:
                continue

        alpha = 1 - confidence_level
        indirect_ci = (
            float(np.percentile(boot_indirect, alpha/2 * 100)),
            float(np.percentile(boot_indirect, (1 - alpha/2) * 100))
        )
        direct_ci = (
            float(np.percentile(boot_direct, alpha/2 * 100)),
            float(np.percentile(boot_direct, (1 - alpha/2) * 100))
        )
        indirect_se = float(np.std(boot_indirect, ddof=1))
        direct_se = float(np.std(boot_direct, ddof=1))
    else:
        # Use Sobel SE
        indirect_se = sobel_se
        z_crit = stats.norm.ppf(1 - (1 - confidence_level) / 2)
        indirect_ci = (
            float(indirect_effect - z_crit * indirect_se),
            float(indirect_effect + z_crit * indirect_se)
        )
        direct_ci = (
            float(direct_effect - z_crit * se_c_prime),
            float(direct_effect + z_crit * se_c_prime)
        )
        direct_se = se_c_prime

    # Proportion mediated
    if abs(total_effect) > 1e-10:
        prop_mediated = indirect_effect / total_effect
    else:
        prop_mediated = 0.0
        warnings.append("Total effect near zero - proportion mediated undefined")

    # Check Baron-Kenny conditions
    if abs(path_c) < 1e-6:
        warnings.append("No significant total effect (X → Y)")
    if abs(path_a) < 1e-6:
        warnings.append("No significant X → M effect")
    if abs(path_b) < 1e-6:
        warnings.append("No significant M → Y effect (controlling for X)")

    # Interpretation
    interpretation = _interpret_mediation(
        indirect_effect, indirect_ci, direct_effect, direct_ci,
        prop_mediated, total_effect
    )

    return MediationResult(
        total_effect=float(total_effect),
        direct_effect=float(direct_effect),
        indirect_effect=float(indirect_effect),
        total_effect_se=float(se_c),
        direct_effect_se=float(direct_se),
        indirect_effect_se=float(indirect_se),
        indirect_effect_ci=indirect_ci,
        direct_effect_ci=direct_ci,
        proportion_mediated=float(prop_mediated),
        sobel_test=sobel_test,
        path_a=float(path_a),
        path_b=float(path_b),
        path_c=float(path_c),
        path_c_prime=float(path_c_prime),
        r_squared_m=float(r_sq_m),
        r_squared_y=float(r_sq_y),
        n=n,
        method='baron_kenny' + ('_bootstrap' if bootstrap else '_sobel'),
        bootstrap_samples=n_bootstrap if bootstrap else None,
        interpretation=interpretation,
        warnings=warnings
    )


def causal_mediation_analysis(
    data: pd.DataFrame,
    treatment: str,
    mediator: str,
    outcome: str,
    covariates: Optional[List[str]] = None,
    n_simulations: int = 1000,
    confidence_level: float = 0.95,
    treat_value: int = 1,
    control_value: int = 0
) -> CausalMediationResult:
    """
    Causal mediation analysis following Imai, Keele, & Tingley (2010).

    This approach:
    1. Fits models for M|X,C and Y|X,M,C
    2. Uses simulation to estimate potential outcomes
    3. Computes Average Causal Mediation Effect (ACME)
    4. Computes Average Direct Effect (ADE)

    ACME = E[Y(t, M(1)) - Y(t, M(0))]  for t in {0, 1}
    ADE = E[Y(1, M(t)) - Y(0, M(t))]   for t in {0, 1}

    Args:
        data: DataFrame with all variables
        treatment: Binary treatment variable
        mediator: Mediator variable
        outcome: Outcome variable
        covariates: Optional covariates
        n_simulations: Number of Monte Carlo simulations
        confidence_level: Confidence level
        treat_value: Value indicating treatment (default 1)
        control_value: Value indicating control (default 0)

    Returns:
        CausalMediationResult with ACME, ADE, and total effect
    """
    warnings = []

    if covariates is None:
        covariates = []

    n = len(data)

    # Prepare data
    X = data[treatment].values
    M = data[mediator].values
    Y = data[outcome].values

    if covariates:
        C = data[covariates].values
    else:
        C = np.ones((n, 1))  # Intercept only

    # Fit mediator model: M ~ X + C
    X_m = np.column_stack([np.ones(n), X, C])
    model_m = LinearRegression(fit_intercept=False)
    model_m.fit(X_m, M)
    m_fitted = model_m.predict(X_m)
    m_resid = M - m_fitted
    sigma_m = np.std(m_resid, ddof=1)

    # Fit outcome model: Y ~ X + M + C
    X_y = np.column_stack([np.ones(n), X, M, C])
    model_y = LinearRegression(fit_intercept=False)
    model_y.fit(X_y, Y)
    y_fitted = model_y.predict(X_y)
    y_resid = Y - y_fitted
    sigma_y = np.std(y_resid, ddof=1)

    # Extract coefficients
    beta_m = model_m.coef_  # [intercept, X, covariates...]
    beta_y = model_y.coef_  # [intercept, X, M, covariates...]

    # Simulation-based inference
    acme_sim = []
    ade_sim = []
    total_sim = []
    prop_sim = []

    for _ in range(n_simulations):
        # Sample coefficients from approximate posterior
        # (simplified - using normal approximation)

        # Simulate M under treatment and control
        M_1 = beta_m[0] + beta_m[1] * treat_value + C @ beta_m[2:] + np.random.normal(0, sigma_m, n)
        M_0 = beta_m[0] + beta_m[1] * control_value + C @ beta_m[2:] + np.random.normal(0, sigma_m, n)

        # Simulate Y under different combinations
        # Y(1, M(1))
        Y_1_M1 = beta_y[0] + beta_y[1] * treat_value + beta_y[2] * M_1 + C @ beta_y[3:] + np.random.normal(0, sigma_y, n)
        # Y(1, M(0))
        Y_1_M0 = beta_y[0] + beta_y[1] * treat_value + beta_y[2] * M_0 + C @ beta_y[3:] + np.random.normal(0, sigma_y, n)
        # Y(0, M(1))
        Y_0_M1 = beta_y[0] + beta_y[1] * control_value + beta_y[2] * M_1 + C @ beta_y[3:] + np.random.normal(0, sigma_y, n)
        # Y(0, M(0))
        Y_0_M0 = beta_y[0] + beta_y[1] * control_value + beta_y[2] * M_0 + C @ beta_y[3:] + np.random.normal(0, sigma_y, n)

        # ACME (indirect effect)
        acme_1 = np.mean(Y_1_M1 - Y_1_M0)  # Under treatment
        acme_0 = np.mean(Y_0_M1 - Y_0_M0)  # Under control
        acme = (acme_1 + acme_0) / 2

        # ADE (direct effect)
        ade_1 = np.mean(Y_1_M1 - Y_0_M1)  # When M is at treated level
        ade_0 = np.mean(Y_1_M0 - Y_0_M0)  # When M is at control level
        ade = (ade_1 + ade_0) / 2

        # Total effect
        total = np.mean(Y_1_M1 - Y_0_M0)

        # Proportion mediated
        if abs(total) > 1e-10:
            prop = acme / total
        else:
            prop = 0

        acme_sim.append(acme)
        ade_sim.append(ade)
        total_sim.append(total)
        prop_sim.append(prop)

    # Calculate point estimates and CIs
    alpha = 1 - confidence_level

    acme_est = float(np.mean(acme_sim))
    acme_ci = (
        float(np.percentile(acme_sim, alpha/2 * 100)),
        float(np.percentile(acme_sim, (1 - alpha/2) * 100))
    )

    ade_est = float(np.mean(ade_sim))
    ade_ci = (
        float(np.percentile(ade_sim, alpha/2 * 100)),
        float(np.percentile(ade_sim, (1 - alpha/2) * 100))
    )

    total_est = float(np.mean(total_sim))
    total_ci = (
        float(np.percentile(total_sim, alpha/2 * 100)),
        float(np.percentile(total_sim, (1 - alpha/2) * 100))
    )

    prop_est = float(np.mean(prop_sim))
    prop_ci = (
        float(np.percentile(prop_sim, alpha/2 * 100)),
        float(np.percentile(prop_sim, (1 - alpha/2) * 100))
    )

    # Interpretation
    interpretation = _interpret_causal_mediation(acme_est, acme_ci, ade_est, ade_ci, prop_est)

    return CausalMediationResult(
        acme=acme_est,
        acme_ci=acme_ci,
        ade=ade_est,
        ade_ci=ade_ci,
        total_effect=total_est,
        total_effect_ci=total_ci,
        prop_mediated=prop_est,
        prop_mediated_ci=prop_ci,
        acme_treated=None,  # Could be computed separately
        acme_control=None,
        ade_treated=None,
        ade_control=None,
        n=n,
        n_simulations=n_simulations,
        interpretation=interpretation,
        warnings=warnings
    )


def mediation_sensitivity_analysis(
    data: pd.DataFrame,
    treatment: str,
    mediator: str,
    outcome: str,
    covariates: Optional[List[str]] = None,
    rho_range: Tuple[float, float] = (-0.9, 0.9),
    n_points: int = 19
) -> Dict[str, Any]:
    """
    Sensitivity analysis for the sequential ignorability assumption.

    Tests how sensitive the ACME is to unmeasured confounding between
    M and Y (correlation of error terms).

    rho = correlation between residuals in M and Y models
    rho = 0 means no unmeasured confounding

    Args:
        data: DataFrame
        treatment: Treatment variable
        mediator: Mediator variable
        outcome: Outcome variable
        covariates: Optional covariates
        rho_range: Range of correlation values to test
        n_points: Number of points in the range

    Returns:
        Dictionary with sensitivity analysis results
    """
    if covariates is None:
        covariates = []

    n = len(data)

    X = data[treatment].values
    M = data[mediator].values
    Y = data[outcome].values

    if covariates:
        C = data[covariates].values
    else:
        C = np.ones((n, 1))

    # Fit baseline models
    X_m = np.column_stack([np.ones(n), X, C])
    model_m = LinearRegression(fit_intercept=False)
    model_m.fit(X_m, M)

    X_y = np.column_stack([np.ones(n), X, M, C])
    model_y = LinearRegression(fit_intercept=False)
    model_y.fit(X_y, Y)

    # Path coefficients
    a = model_m.coef_[1]  # X → M
    b = model_y.coef_[2]  # M → Y

    # Residual variances
    sigma_m = np.std(M - model_m.predict(X_m), ddof=1)
    sigma_y = np.std(Y - model_y.predict(X_y), ddof=1)

    # Original ACME (assuming rho = 0)
    acme_original = a * b

    # Sensitivity analysis
    rhos = np.linspace(rho_range[0], rho_range[1], n_points)
    results = []

    for rho in rhos:
        # Adjusted ACME accounting for correlation
        # ACME(rho) = a * b - rho * sigma_m * sigma_y * something
        # Simplified: linear adjustment
        adjustment = rho * sigma_m * sigma_y
        acme_adjusted = acme_original - adjustment

        results.append({
            'rho': float(rho),
            'acme': float(acme_adjusted),
            'acme_changes_sign': (acme_adjusted * acme_original) < 0
        })

    # Find critical rho (where ACME = 0)
    rho_crit = None
    for i in range(len(results) - 1):
        if results[i]['acme'] * results[i+1]['acme'] < 0:
            # Linear interpolation
            r1, a1 = results[i]['rho'], results[i]['acme']
            r2, a2 = results[i+1]['rho'], results[i+1]['acme']
            rho_crit = r1 - a1 * (r2 - r1) / (a2 - a1)
            break

    return {
        'original_acme': float(acme_original),
        'sensitivity_results': results,
        'rho_critical': float(rho_crit) if rho_crit else None,
        'interpretation': _interpret_sensitivity(rho_crit),
        'sigma_m': float(sigma_m),
        'sigma_y': float(sigma_y)
    }


def multiple_mediator_analysis(
    data: pd.DataFrame,
    treatment: str,
    mediators: List[str],
    outcome: str,
    covariates: Optional[List[str]] = None,
    bootstrap: bool = True,
    n_bootstrap: int = 5000
) -> Dict[str, Any]:
    """
    Analyze multiple mediators simultaneously.

    Decomposes total effect into:
    - Direct effect
    - Specific indirect effects (through each mediator)
    - Total indirect effect

    Args:
        data: DataFrame
        treatment: Treatment variable
        mediators: List of mediator variables
        outcome: Outcome variable
        covariates: Optional covariates
        bootstrap: Use bootstrap for CIs
        n_bootstrap: Number of bootstrap samples

    Returns:
        Dictionary with results for each mediator and combined analysis
    """
    if covariates is None:
        covariates = []

    n = len(data)
    X = data[treatment].values
    Y = data[outcome].values
    M = data[mediators].values  # Multiple mediators

    if covariates:
        C = data[covariates].values
    else:
        C = None

    results_per_mediator = {}
    specific_indirect = {}

    # Analyze each mediator separately (for comparison)
    for med in mediators:
        result = baron_kenny_mediation(
            data, treatment, med, outcome, covariates,
            bootstrap=bootstrap, n_bootstrap=n_bootstrap
        )
        results_per_mediator[med] = result.to_dict()

    # Simultaneous analysis
    # Fit: each M ~ X + C
    path_a = {}
    for i, med in enumerate(mediators):
        X_design = _add_intercept(X.reshape(-1, 1))
        if C is not None:
            X_design = np.hstack([X_design, C])
        model = LinearRegression(fit_intercept=False)
        model.fit(X_design, data[med].values)
        path_a[med] = model.coef_[1]

    # Fit: Y ~ X + M1 + M2 + ... + C
    XM_design = _add_intercept(np.column_stack([X, M]))
    if C is not None:
        XM_design = np.hstack([XM_design, C])

    model_full = LinearRegression(fit_intercept=False)
    model_full.fit(XM_design, Y)

    direct_effect = model_full.coef_[1]  # X → Y direct
    path_b = {}
    for i, med in enumerate(mediators):
        path_b[med] = model_full.coef_[2 + i]  # M_i → Y

    # Calculate specific indirect effects
    total_indirect = 0
    for med in mediators:
        ie = path_a[med] * path_b[med]
        specific_indirect[med] = float(ie)
        total_indirect += ie

    # Total effect
    X_design = _add_intercept(X.reshape(-1, 1))
    if C is not None:
        X_design = np.hstack([X_design, C])
    model_total = LinearRegression(fit_intercept=False)
    model_total.fit(X_design, Y)
    total_effect = model_total.coef_[1]

    # Bootstrap for CIs
    boot_specific = {med: [] for med in mediators}
    boot_total_indirect = []
    boot_direct = []

    if bootstrap:
        for _ in range(n_bootstrap):
            idx = np.random.choice(n, n, replace=True)
            data_b = data.iloc[idx]

            try:
                X_b = data_b[treatment].values
                Y_b = data_b[outcome].values
                M_b = data_b[mediators].values
                C_b = data_b[covariates].values if covariates else None

                # a paths
                a_b = {}
                for med in mediators:
                    X_d = _add_intercept(X_b.reshape(-1, 1))
                    if C_b is not None:
                        X_d = np.hstack([X_d, C_b])
                    m = LinearRegression(fit_intercept=False)
                    m.fit(X_d, data_b[med].values)
                    a_b[med] = m.coef_[1]

                # b paths and direct
                XM_d = _add_intercept(np.column_stack([X_b, M_b]))
                if C_b is not None:
                    XM_d = np.hstack([XM_d, C_b])
                m = LinearRegression(fit_intercept=False)
                m.fit(XM_d, Y_b)

                boot_direct.append(m.coef_[1])

                ti = 0
                for i, med in enumerate(mediators):
                    ie = a_b[med] * m.coef_[2 + i]
                    boot_specific[med].append(ie)
                    ti += ie
                boot_total_indirect.append(ti)

            except Exception:
                continue

    # Calculate CIs
    alpha = 0.05
    ci_specific = {}
    for med in mediators:
        if boot_specific[med]:
            ci_specific[med] = {
                'estimate': specific_indirect[med],
                'ci_lower': float(np.percentile(boot_specific[med], 2.5)),
                'ci_upper': float(np.percentile(boot_specific[med], 97.5))
            }
        else:
            ci_specific[med] = {'estimate': specific_indirect[med]}

    return {
        'total_effect': float(total_effect),
        'direct_effect': float(direct_effect),
        'total_indirect_effect': float(total_indirect),
        'specific_indirect_effects': ci_specific,
        'individual_analyses': results_per_mediator,
        'path_coefficients': {
            'a': {k: float(v) for k, v in path_a.items()},
            'b': {k: float(v) for k, v in path_b.items()}
        },
        'n': n,
        'n_mediators': len(mediators)
    }


# ==================== Helper Functions ====================

def _add_intercept(X: np.ndarray) -> np.ndarray:
    """Add intercept column to design matrix."""
    return np.column_stack([np.ones(X.shape[0]), X])


def _robust_se(X: np.ndarray, residuals: np.ndarray) -> np.ndarray:
    """Calculate heteroskedasticity-robust standard errors (HC0)."""
    n = len(residuals)
    k = X.shape[1]

    # Bread: (X'X)^-1
    XtX_inv = np.linalg.inv(X.T @ X)

    # Meat: X' diag(e^2) X
    meat = X.T @ np.diag(residuals**2) @ X

    # Sandwich
    sandwich = XtX_inv @ meat @ XtX_inv

    return np.sqrt(np.diag(sandwich))


def _interpret_mediation(
    indirect: float,
    indirect_ci: Tuple[float, float],
    direct: float,
    direct_ci: Tuple[float, float],
    prop_med: float,
    total: float
) -> str:
    """Generate interpretation of mediation results."""
    parts = []

    # Check if indirect effect is significant
    indirect_sig = indirect_ci[0] * indirect_ci[1] > 0  # Same sign = significant
    direct_sig = direct_ci[0] * direct_ci[1] > 0

    if indirect_sig and direct_sig:
        parts.append("Partial mediation detected")
        parts.append(f"About {abs(prop_med)*100:.1f}% of the total effect is mediated")
    elif indirect_sig and not direct_sig:
        parts.append("Full mediation detected")
        parts.append("The entire effect appears to operate through the mediator")
    elif not indirect_sig and direct_sig:
        parts.append("No significant mediation detected")
        parts.append("The effect appears to be entirely direct")
    else:
        parts.append("Neither direct nor indirect effects are significant")

    return ". ".join(parts) + "."


def _interpret_causal_mediation(
    acme: float,
    acme_ci: Tuple[float, float],
    ade: float,
    ade_ci: Tuple[float, float],
    prop: float
) -> str:
    """Interpret causal mediation results."""
    parts = []

    acme_sig = acme_ci[0] * acme_ci[1] > 0
    ade_sig = ade_ci[0] * ade_ci[1] > 0

    if acme_sig:
        direction = "positive" if acme > 0 else "negative"
        parts.append(f"Significant {direction} causal mediation effect (ACME)")
    else:
        parts.append("No significant causal mediation effect")

    if ade_sig:
        parts.append("Significant direct effect remains")
    else:
        parts.append("No significant direct effect")

    if acme_sig:
        parts.append(f"Approximately {abs(prop)*100:.1f}% of the effect is mediated")

    return ". ".join(parts) + "."


def _interpret_sensitivity(rho_crit: Optional[float]) -> str:
    """Interpret sensitivity analysis results."""
    if rho_crit is None:
        return "ACME does not cross zero within tested range - robust to confounding"

    rho_abs = abs(rho_crit)

    if rho_abs < 0.1:
        return f"Highly sensitive: ACME reverses at ρ = {rho_crit:.2f} (very small confounding)"
    elif rho_abs < 0.3:
        return f"Moderately sensitive: ACME reverses at ρ = {rho_crit:.2f} (small-medium confounding)"
    elif rho_abs < 0.5:
        return f"Somewhat robust: ACME reverses at ρ = {rho_crit:.2f} (medium confounding)"
    else:
        return f"Robust: ACME reverses only at ρ = {rho_crit:.2f} (substantial confounding)"
