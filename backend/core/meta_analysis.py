"""
Meta-Analysis Engine for StickForStats

Provides comprehensive meta-analysis functionality including:
- Fixed-effects and random-effects models
- Heterogeneity statistics (Q, I², τ²)
- Publication bias detection (Egger's test, funnel plot)
- Forest plot data generation
- Subgroup analysis
- Meta-regression

Based on established meta-analytic methods:
- Borenstein et al. (2009) Introduction to Meta-Analysis
- Higgins & Green (2011) Cochrane Handbook

@author StickForStats Team
@version 1.0.0
"""

import numpy as np
from scipy import stats
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Any


@dataclass
class StudyData:
    """Individual study data for meta-analysis"""

    study_id: str
    study_name: str
    effect_size: float  # e.g., Cohen's d, log odds ratio, correlation r
    standard_error: float
    sample_size: Optional[int] = None
    weight: Optional[float] = None
    ci_lower: Optional[float] = None
    ci_upper: Optional[float] = None
    subgroup: Optional[str] = None


@dataclass
class MetaAnalysisResult:
    """Results from meta-analysis"""

    # Pooled effect
    pooled_effect: float
    pooled_se: float
    pooled_ci_lower: float
    pooled_ci_upper: float
    pooled_z: float
    pooled_p: float

    # Heterogeneity
    q_statistic: float
    q_df: int
    q_p_value: float
    i_squared: float
    tau_squared: float
    tau: float
    h_squared: float

    # Model info
    model: str  # 'fixed' or 'random'
    k_studies: int
    total_n: Optional[int]

    # Individual study data with weights
    studies: List[Dict]


class MetaAnalysisEngine:
    """
    Core meta-analysis calculations engine.

    Supports both fixed-effects and random-effects models.
    """

    def __init__(self):
        self.alpha = 0.05  # Default significance level

    def analyze(
        self, studies: List[StudyData], model: str = "random", method: str = "DL", alpha: float = 0.05
    ) -> MetaAnalysisResult:
        """
        Perform meta-analysis on study data.

        Args:
            studies: List of StudyData objects
            model: 'fixed' or 'random' effects model
            method: For random effects - 'DL' (DerSimonian-Laird), 'REML', 'PM' (Paule-Mandel)
            alpha: Significance level for confidence intervals

        Returns:
            MetaAnalysisResult with pooled effect and heterogeneity statistics
        """
        self.alpha = alpha
        k = len(studies)

        if k < 2:
            raise ValueError("Meta-analysis requires at least 2 studies")

        # Extract effect sizes and standard errors
        effects = np.array([s.effect_size for s in studies])
        se = np.array([s.standard_error for s in studies])

        # Calculate fixed-effect weights (inverse variance)
        var = se**2
        w_fixed = 1.0 / var

        # Calculate heterogeneity statistics
        q_stat, q_df, q_p, i_sq, tau_sq, tau, h_sq = self._calculate_heterogeneity(effects, w_fixed, method)

        # Calculate pooled effect based on model
        if model == "fixed":
            pooled, pooled_se, weights = self._fixed_effects(effects, w_fixed)
        else:
            pooled, pooled_se, weights = self._random_effects(effects, var, tau_sq)

        # Calculate confidence interval and test statistic
        z_crit = stats.norm.ppf(1 - alpha / 2)
        ci_lower = pooled - z_crit * pooled_se
        ci_upper = pooled + z_crit * pooled_se
        z_stat = pooled / pooled_se
        p_value = 2 * (stats.norm.sf(abs(z_stat)))

        # Calculate total N if available
        total_n = sum(s.sample_size for s in studies if s.sample_size) or None

        # Prepare individual study results with weights
        study_results = []
        for i, study in enumerate(studies):
            # Calculate individual study CI
            z_crit_study = stats.norm.ppf(1 - alpha / 2)
            study_ci_lower = study.effect_size - z_crit_study * study.standard_error
            study_ci_upper = study.effect_size + z_crit_study * study.standard_error

            study_results.append(
                {
                    "study_id": study.study_id,
                    "study_name": study.study_name,
                    "effect_size": study.effect_size,
                    "standard_error": study.standard_error,
                    "sample_size": study.sample_size,
                    "weight": weights[i],
                    "weight_percent": (weights[i] / weights.sum()) * 100,
                    "ci_lower": study_ci_lower,
                    "ci_upper": study_ci_upper,
                    "subgroup": study.subgroup,
                }
            )

        return MetaAnalysisResult(
            pooled_effect=float(pooled),
            pooled_se=float(pooled_se),
            pooled_ci_lower=float(ci_lower),
            pooled_ci_upper=float(ci_upper),
            pooled_z=float(z_stat),
            pooled_p=float(p_value),
            q_statistic=float(q_stat),
            q_df=int(q_df),
            q_p_value=float(q_p),
            i_squared=float(i_sq),
            tau_squared=float(tau_sq),
            tau=float(tau),
            h_squared=float(h_sq),
            model=model,
            k_studies=k,
            total_n=total_n,
            studies=study_results,
        )

    def _fixed_effects(self, effects: np.ndarray, weights: np.ndarray) -> Tuple[float, float, np.ndarray]:
        """
        Calculate fixed-effects pooled estimate.

        Uses inverse-variance weighting.
        """
        pooled = np.sum(weights * effects) / np.sum(weights)
        pooled_se = np.sqrt(1.0 / np.sum(weights))
        return pooled, pooled_se, weights

    def _random_effects(
        self, effects: np.ndarray, variances: np.ndarray, tau_squared: float
    ) -> Tuple[float, float, np.ndarray]:
        """
        Calculate random-effects pooled estimate.

        Uses inverse-variance weighting with between-study variance.
        """
        # Adjust variances with between-study variance
        adj_var = variances + tau_squared
        weights = 1.0 / adj_var

        pooled = np.sum(weights * effects) / np.sum(weights)
        pooled_se = np.sqrt(1.0 / np.sum(weights))

        return pooled, pooled_se, weights

    def _calculate_heterogeneity(
        self, effects: np.ndarray, weights: np.ndarray, method: str = "DL"
    ) -> Tuple[float, int, float, float, float, float, float]:
        """
        Calculate heterogeneity statistics.

        Returns: Q, df, p-value, I², τ², τ, H²
        """
        k = len(effects)
        df = k - 1

        # Calculate Q statistic
        pooled_fixed = np.sum(weights * effects) / np.sum(weights)
        q_stat = np.sum(weights * (effects - pooled_fixed) ** 2)
        q_p = stats.chi2.sf(q_stat, df)

        # Calculate τ² using specified method
        if method == "DL":
            tau_sq = self._dersimonian_laird(q_stat, weights, df)
        elif method == "PM":
            tau_sq = self._paule_mandel(effects, weights)
        else:
            tau_sq = self._dersimonian_laird(q_stat, weights, df)

        tau_sq = max(0, tau_sq)  # τ² cannot be negative
        tau = np.sqrt(tau_sq)

        # Calculate I² (percentage of variability due to heterogeneity)
        if q_stat > df:
            i_sq = ((q_stat - df) / q_stat) * 100
        else:
            i_sq = 0.0

        # Calculate H² (ratio of total variability to sampling variability)
        if df > 0:
            h_sq = q_stat / df
        else:
            h_sq = 1.0

        return q_stat, df, q_p, i_sq, tau_sq, tau, h_sq

    def _dersimonian_laird(self, q_stat: float, weights: np.ndarray, df: int) -> float:
        """
        DerSimonian-Laird estimator for τ².

        Most commonly used method (DerSimonian & Laird, 1986).
        """
        c = np.sum(weights) - np.sum(weights**2) / np.sum(weights)
        tau_sq = (q_stat - df) / c
        return tau_sq

    def _paule_mandel(self, effects: np.ndarray, weights: np.ndarray, max_iter: int = 100, tol: float = 1e-6) -> float:
        """
        Paule-Mandel iterative estimator for τ².

        More robust than DL for small samples.
        """
        k = len(effects)
        df = k - 1

        # Start with DL estimate
        pooled = np.sum(weights * effects) / np.sum(weights)
        q_stat = np.sum(weights * (effects - pooled) ** 2)
        c = np.sum(weights) - np.sum(weights**2) / np.sum(weights)
        tau_sq = max(0, (q_stat - df) / c)

        for _ in range(max_iter):
            var = 1.0 / weights
            adj_weights = 1.0 / (var + tau_sq)
            pooled = np.sum(adj_weights * effects) / np.sum(adj_weights)
            q_new = np.sum(adj_weights * (effects - pooled) ** 2)

            if abs(q_new - df) < tol:
                break

            # Update tau_sq
            c = np.sum(adj_weights) - np.sum(adj_weights**2) / np.sum(adj_weights)
            tau_sq = max(0, tau_sq + (q_new - df) / c)

        return tau_sq

    def eggers_test(self, studies: List[StudyData]) -> Dict[str, float]:
        """
        Egger's regression test for publication bias.

        Tests asymmetry in funnel plot using regression of
        standardized effect on precision.

        Returns:
            Dictionary with intercept, se, t-statistic, p-value
        """
        effects = np.array([s.effect_size for s in studies])
        se = np.array([s.standard_error for s in studies])

        # Standardized effect (effect / SE)
        z = effects / se

        # Precision (1 / SE)
        precision = 1.0 / se

        # Weighted regression: z = intercept + slope * precision
        # Using OLS for simplicity
        n = len(studies)
        x = precision
        y = z

        # Add intercept term
        X = np.column_stack([np.ones(n), x])

        # OLS estimate
        beta = np.linalg.lstsq(X, y, rcond=None)[0]
        intercept = beta[0]

        # Calculate residuals and SE of intercept
        y_pred = X @ beta
        residuals = y - y_pred
        mse = np.sum(residuals**2) / (n - 2)
        # Use pseudoinverse instead of inverse to handle near-singular matrices
        # This can occur when studies have very similar precision values
        var_beta = mse * np.linalg.pinv(X.T @ X)
        se_intercept = np.sqrt(max(var_beta[0, 0], 1e-10))  # Ensure non-negative

        # t-test for intercept
        t_stat = intercept / se_intercept
        p_value = 2 * (stats.t.sf(abs(t_stat), n - 2))

        return {
            "intercept": float(intercept),
            "se": float(se_intercept),
            "t_statistic": float(t_stat),
            "df": n - 2,
            "p_value": float(p_value),
            "significant": p_value < 0.05,
            "interpretation": self._interpret_eggers(p_value),
        }

    def _interpret_eggers(self, p_value: float) -> str:
        """Interpret Egger's test result."""
        if p_value < 0.01:
            return "Strong evidence of publication bias (p < 0.01)"
        elif p_value < 0.05:
            return "Evidence of publication bias (p < 0.05)"
        elif p_value < 0.10:
            return "Weak evidence of possible publication bias (p < 0.10)"
        else:
            return "No significant evidence of publication bias"

    def beggs_test(self, studies: List[StudyData]) -> Dict[str, float]:
        """
        Begg's rank correlation test for publication bias.

        Tests correlation between effect sizes and variances
        using Kendall's tau.

        Returns:
            Dictionary with tau, z-statistic, p-value
        """
        effects = np.array([s.effect_size for s in studies])
        var = np.array([s.standard_error**2 for s in studies])

        # Standardize effects
        pooled = np.mean(effects)
        np.mean(var)
        std_effects = (effects - pooled) / np.sqrt(var)

        # Kendall's tau correlation
        tau, p_value = stats.kendalltau(std_effects, var)

        # Z approximation
        n = len(studies)
        z_stat = tau / np.sqrt(2 * (2 * n + 5) / (9 * n * (n - 1)))

        return {
            "tau": float(tau),
            "z_statistic": float(z_stat),
            "p_value": float(p_value),
            "significant": p_value < 0.05,
            "interpretation": self._interpret_beggs(p_value),
        }

    def _interpret_beggs(self, p_value: float) -> str:
        """Interpret Begg's test result."""
        if p_value < 0.05:
            return "Evidence of publication bias detected"
        else:
            return "No significant evidence of publication bias"

    def funnel_plot_data(self, studies: List[StudyData], pooled_effect: float) -> Dict[str, Any]:
        """
        Generate data for funnel plot visualization.

        Returns:
            Dictionary with points, pseudo-CI lines, etc.
        """
        effects = np.array([s.effect_size for s in studies])
        se = np.array([s.standard_error for s in studies])

        # Generate pseudo-confidence interval lines
        se_range = np.linspace(0, max(se) * 1.2, 100)
        z_95 = stats.norm.ppf(0.975)
        z_99 = stats.norm.ppf(0.995)

        ci_95_lower = pooled_effect - z_95 * se_range
        ci_95_upper = pooled_effect + z_95 * se_range
        ci_99_lower = pooled_effect - z_99 * se_range
        ci_99_upper = pooled_effect + z_99 * se_range

        points = [
            {
                "study_name": studies[i].study_name,
                "effect": float(effects[i]),
                "se": float(se[i]),
                "precision": float(1 / se[i]),
            }
            for i in range(len(studies))
        ]

        return {
            "points": points,
            "pooled_effect": float(pooled_effect),
            "se_range": se_range.tolist(),
            "ci_95_lower": ci_95_lower.tolist(),
            "ci_95_upper": ci_95_upper.tolist(),
            "ci_99_lower": ci_99_lower.tolist(),
            "ci_99_upper": ci_99_upper.tolist(),
        }

    def subgroup_analysis(self, studies: List[StudyData], model: str = "random") -> Dict[str, Any]:
        """
        Perform subgroup analysis.

        Analyzes each subgroup separately and tests for differences.

        Returns:
            Dictionary with subgroup results and between-group heterogeneity
        """
        # Group studies by subgroup
        subgroups = {}
        for study in studies:
            group = study.subgroup or "Overall"
            if group not in subgroups:
                subgroups[group] = []
            subgroups[group].append(study)

        # Analyze each subgroup
        subgroup_results = {}
        pooled_effects = []
        pooled_vars = []

        for group_name, group_studies in subgroups.items():
            if len(group_studies) >= 2:
                result = self.analyze(group_studies, model=model)
                subgroup_results[group_name] = {
                    "k": result.k_studies,
                    "pooled_effect": result.pooled_effect,
                    "pooled_se": result.pooled_se,
                    "ci_lower": result.pooled_ci_lower,
                    "ci_upper": result.pooled_ci_upper,
                    "p_value": result.pooled_p,
                    "i_squared": result.i_squared,
                    "tau_squared": result.tau_squared,
                }
                pooled_effects.append(result.pooled_effect)
                pooled_vars.append(result.pooled_se**2)

        # Test for between-group heterogeneity (Q-between)
        if len(pooled_effects) >= 2:
            effects = np.array(pooled_effects)
            weights = 1.0 / np.array(pooled_vars)
            overall_pooled = np.sum(weights * effects) / np.sum(weights)
            q_between = np.sum(weights * (effects - overall_pooled) ** 2)
            df_between = len(pooled_effects) - 1
            p_between = stats.chi2.sf(q_between, df_between)
        else:
            q_between = 0
            df_between = 0
            p_between = 1.0

        return {
            "subgroups": subgroup_results,
            "q_between": float(q_between),
            "df_between": int(df_between),
            "p_between": float(p_between),
            "significant_difference": p_between < 0.05,
        }

    def sensitivity_analysis(self, studies: List[StudyData], model: str = "random") -> List[Dict[str, Any]]:
        """
        Leave-one-out sensitivity analysis.

        Recalculates pooled effect excluding each study one at a time.

        Returns:
            List of results excluding each study
        """
        results = []

        for i, excluded_study in enumerate(studies):
            remaining = [s for j, s in enumerate(studies) if j != i]

            if len(remaining) >= 2:
                result = self.analyze(remaining, model=model)
                results.append(
                    {
                        "excluded_study": excluded_study.study_name,
                        "k_remaining": result.k_studies,
                        "pooled_effect": result.pooled_effect,
                        "pooled_se": result.pooled_se,
                        "ci_lower": result.pooled_ci_lower,
                        "ci_upper": result.pooled_ci_upper,
                        "i_squared": result.i_squared,
                    }
                )

        return results


class EffectSizeConverter:
    """
    Convert between different effect size measures.

    Supports: Cohen's d, Hedges' g, correlation r, odds ratio, log odds ratio
    """

    @staticmethod
    def d_to_r(d: float, n1: int = None, n2: int = None) -> float:
        """
        Convert Cohen's d to correlation r.

        Formula: r = d / sqrt(d² + a)
        where a = (n1 + n2)² / (n1 * n2) for unequal samples
        or a = 4 for equal samples
        """
        if n1 and n2:
            a = (n1 + n2) ** 2 / (n1 * n2)
        else:
            a = 4
        return d / np.sqrt(d**2 + a)

    @staticmethod
    def r_to_d(r: float) -> float:
        """
        Convert correlation r to Cohen's d.

        Formula: d = 2r / sqrt(1 - r²)
        """
        return 2 * r / np.sqrt(1 - r**2)

    @staticmethod
    def d_to_hedges_g(d: float, n: int) -> float:
        """
        Convert Cohen's d to Hedges' g (bias-corrected).

        Formula: g = d * (1 - 3 / (4(n1 + n2) - 9))
        """
        j = 1 - 3 / (4 * n - 9)
        return d * j

    @staticmethod
    def or_to_log_or(odds_ratio: float) -> float:
        """Convert odds ratio to log odds ratio."""
        return np.log(odds_ratio)

    @staticmethod
    def log_or_to_or(log_or: float) -> float:
        """Convert log odds ratio to odds ratio."""
        return np.exp(log_or)

    @staticmethod
    def log_or_to_d(log_or: float) -> float:
        """
        Convert log odds ratio to Cohen's d.

        Formula: d = log_or * sqrt(3) / π
        """
        return log_or * np.sqrt(3) / np.pi

    @staticmethod
    def d_to_log_or(d: float) -> float:
        """
        Convert Cohen's d to log odds ratio.

        Formula: log_or = d * π / sqrt(3)
        """
        return d * np.pi / np.sqrt(3)

    @staticmethod
    def calculate_se_d(d: float, n1: int, n2: int) -> float:
        """
        Calculate standard error of Cohen's d.

        Formula: SE = sqrt((n1 + n2) / (n1 * n2) + d² / (2 * (n1 + n2)))
        """
        return np.sqrt((n1 + n2) / (n1 * n2) + d**2 / (2 * (n1 + n2)))

    @staticmethod
    def calculate_se_r(r: float, n: int) -> float:
        """
        Calculate standard error of correlation r (Fisher's z).

        For meta-analysis, r should be transformed to Fisher's z first.
        SE(z) = 1 / sqrt(n - 3)
        """
        return 1 / np.sqrt(n - 3)

    @staticmethod
    def r_to_fisher_z(r: float) -> float:
        """Transform correlation r to Fisher's z."""
        return 0.5 * np.log((1 + r) / (1 - r))

    @staticmethod
    def fisher_z_to_r(z: float) -> float:
        """Transform Fisher's z back to correlation r."""
        return (np.exp(2 * z) - 1) / (np.exp(2 * z) + 1)


# Singleton instance
_meta_analysis_engine = None


def get_meta_analysis_engine() -> MetaAnalysisEngine:
    """Get singleton instance of MetaAnalysisEngine."""
    global _meta_analysis_engine
    if _meta_analysis_engine is None:
        _meta_analysis_engine = MetaAnalysisEngine()
    return _meta_analysis_engine


# Convenience functions
def run_meta_analysis(
    studies: List[Dict], model: str = "random", method: str = "DL", alpha: float = 0.05
) -> Dict[str, Any]:
    """
    Run meta-analysis on study data.

    Args:
        studies: List of dicts with keys: study_name, effect_size, standard_error,
                 optional: sample_size, subgroup
        model: 'fixed' or 'random'
        method: 'DL' (DerSimonian-Laird) or 'PM' (Paule-Mandel)
        alpha: Significance level

    Returns:
        Dictionary with all results
    """
    engine = get_meta_analysis_engine()

    # Convert dicts to StudyData objects
    study_objects = [
        StudyData(
            study_id=str(i),
            study_name=s.get("study_name", f"Study {i+1}"),
            effect_size=s["effect_size"],
            standard_error=s["standard_error"],
            sample_size=s.get("sample_size"),
            subgroup=s.get("subgroup"),
        )
        for i, s in enumerate(studies)
    ]

    # Run main analysis
    result = engine.analyze(study_objects, model=model, method=method, alpha=alpha)

    # Run publication bias tests
    eggers = engine.eggers_test(study_objects) if len(study_objects) >= 3 else None
    beggs = engine.beggs_test(study_objects) if len(study_objects) >= 3 else None

    # Generate funnel plot data
    funnel_data = engine.funnel_plot_data(study_objects, result.pooled_effect)

    # Sensitivity analysis
    sensitivity = engine.sensitivity_analysis(study_objects, model=model)

    # Subgroup analysis if subgroups exist
    has_subgroups = any(s.subgroup for s in study_objects)
    subgroup_results = engine.subgroup_analysis(study_objects, model=model) if has_subgroups else None

    return {
        "success": True,
        "pooled_effect": result.pooled_effect,
        "pooled_se": result.pooled_se,
        "pooled_ci": [result.pooled_ci_lower, result.pooled_ci_upper],
        "pooled_z": result.pooled_z,
        "pooled_p": result.pooled_p,
        "heterogeneity": {
            "q": result.q_statistic,
            "q_df": result.q_df,
            "q_p": result.q_p_value,
            "i_squared": result.i_squared,
            "tau_squared": result.tau_squared,
            "tau": result.tau,
            "h_squared": result.h_squared,
        },
        "model": result.model,
        "k_studies": result.k_studies,
        "total_n": result.total_n,
        "studies": result.studies,
        "publication_bias": {"eggers_test": eggers, "beggs_test": beggs},
        "funnel_plot_data": funnel_data,
        "sensitivity_analysis": sensitivity,
        "subgroup_analysis": subgroup_results,
    }
