"""
Survival Analysis Service for StickForStats Platform
=====================================================

Comprehensive survival analysis including Kaplan-Meier estimation,
Cox proportional hazards regression, and log-rank testing.

Features:
- Kaplan-Meier survival curves with confidence intervals
- Cox proportional hazards regression with hazard ratios
- Log-rank test for comparing survival curves
- Survival probability estimation
- Median survival time calculation
- Risk table generation
- Visualization data preparation

Author: StickForStats Development Team
Created: October 23, 2025
"""

import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Tuple, Optional, Union
import uuid
import json
import os
import pickle
import base64
from pathlib import Path
from datetime import datetime

from django.conf import settings

# Check if lifelines is available
try:
    from lifelines import KaplanMeierFitter, CoxPHFitter
    from lifelines.statistics import logrank_test, multivariate_logrank_test
    from lifelines.utils import median_survival_times, concordance_index
    LIFELINES_AVAILABLE = True
except ImportError:
    LIFELINES_AVAILABLE = False

from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)


class SurvivalService:
    """
    Service for survival analysis and time-to-event modeling.

    This service provides methods for:
    - Kaplan-Meier survival estimation
    - Cox proportional hazards regression
    - Log-rank testing for group comparisons
    - Survival probability and median survival calculations
    - Risk table generation
    - Visualization data preparation

    Attributes:
        lifelines_available (bool): Whether lifelines library is installed
        models_dir (str): Directory for storing fitted models
    """

    def __init__(self):
        """Initialize survival analysis service."""
        self.lifelines_available = LIFELINES_AVAILABLE

        # Ensure model storage directory exists
        self.models_dir = os.path.join(settings.BASE_DIR, "data", "survival_models")
        os.makedirs(self.models_dir, exist_ok=True)

        if not LIFELINES_AVAILABLE:
            logger.warning(
                "lifelines library not available. Survival analysis will not function. "
                "Install lifelines: pip install lifelines"
            )

    @safe_operation
    def check_availability(self) -> Dict[str, Any]:
        """
        Check if survival analysis is available.

        Returns:
            Dictionary with availability information
        """
        return {
            'lifelines_available': self.lifelines_available,
            'status': 'available' if self.lifelines_available else 'unavailable',
            'recommendation': (
                "Survival analysis is fully available." if self.lifelines_available else
                "Install lifelines library for survival analysis. "
                "Run: pip install lifelines"
            )
        }

    @safe_operation
    def kaplan_meier_analysis(self,
                             data: pd.DataFrame,
                             duration_col: str,
                             event_col: str,
                             group_col: Optional[str] = None,
                             confidence_level: float = 0.95,
                             timeline: Optional[List[float]] = None) -> Dict[str, Any]:
        """
        Perform Kaplan-Meier survival analysis.

        The Kaplan-Meier estimator is a non-parametric statistic used to estimate
        the survival function from lifetime data. It handles censored observations
        (subjects who did not experience the event during the study period).

        Args:
            data: Input DataFrame containing survival data
            duration_col: Column name containing time durations (time to event or censoring)
            event_col: Column name containing event indicator (1 = event occurred, 0 = censored)
            group_col: Optional column name for grouping (e.g., treatment groups)
            confidence_level: Confidence level for confidence intervals (default: 0.95)
            timeline: Optional list of time points for survival probability estimation

        Returns:
            Dictionary containing:
                - survival_function: Time points and survival probabilities
                - confidence_intervals: Lower and upper bounds
                - median_survival: Median survival time with CI
                - survival_table: Risk table with events and censored counts
                - statistics: Summary statistics
                - groups: Results by group if group_col provided

        Raises:
            ValueError: If required columns not found or data invalid
            RuntimeError: If lifelines library not available
        """
        if not self.lifelines_available:
            raise RuntimeError("lifelines library not available. Install with: pip install lifelines")

        # Validate inputs
        if duration_col not in data.columns:
            raise ValueError(f"Duration column '{duration_col}' not found in data")
        if event_col not in data.columns:
            raise ValueError(f"Event column '{event_col}' not found in data")

        # Extract duration and event data
        durations = data[duration_col].values
        events = data[event_col].values

        # Validate duration and event data
        if np.any(durations < 0):
            raise ValueError("Duration values must be non-negative")
        if not np.all(np.isin(events, [0, 1])):
            raise ValueError("Event column must contain only 0 (censored) or 1 (event occurred)")

        results = {
            'analysis_type': 'kaplan_meier',
            'n_subjects': len(data),
            'n_events': int(np.sum(events)),
            'n_censored': int(np.sum(1 - events)),
            'confidence_level': confidence_level,
            'timestamp': datetime.now().isoformat()
        }

        # If no grouping, perform single analysis
        if group_col is None:
            km_results = self._fit_kaplan_meier(
                durations, events,
                confidence_level=confidence_level,
                timeline=timeline,
                label='All Subjects'
            )
            results.update(km_results)

        # If grouping specified, analyze each group
        else:
            if group_col not in data.columns:
                raise ValueError(f"Group column '{group_col}' not found in data")

            groups = data[group_col].unique()
            results['groups'] = {}
            results['group_names'] = [str(g) for g in groups]

            all_survival_functions = []

            for group in groups:
                group_mask = data[group_col] == group
                group_durations = data.loc[group_mask, duration_col].values
                group_events = data.loc[group_mask, event_col].values

                group_label = str(group)
                km_results = self._fit_kaplan_meier(
                    group_durations, group_events,
                    confidence_level=confidence_level,
                    timeline=timeline,
                    label=group_label
                )

                results['groups'][group_label] = km_results
                all_survival_functions.append(km_results['survival_function'])

            # Perform log-rank test to compare groups
            if len(groups) == 2:
                results['logrank_test'] = self._perform_logrank_test_two_groups(
                    data, duration_col, event_col, group_col
                )
            elif len(groups) > 2:
                results['logrank_test'] = self._perform_logrank_test_multi_groups(
                    data, duration_col, event_col, group_col
                )

        # Add interpretation
        results['interpretation'] = self._interpret_kaplan_meier(results)

        return results

    def _fit_kaplan_meier(self,
                         durations: np.ndarray,
                         events: np.ndarray,
                         confidence_level: float = 0.95,
                         timeline: Optional[List[float]] = None,
                         label: str = 'KM_estimate') -> Dict[str, Any]:
        """
        Fit Kaplan-Meier estimator to survival data.

        Args:
            durations: Array of time durations
            events: Array of event indicators (1 = event, 0 = censored)
            confidence_level: Confidence level for intervals
            timeline: Optional time points for estimation
            label: Label for this analysis

        Returns:
            Dictionary with survival function, confidence intervals, and statistics
        """
        kmf = KaplanMeierFitter(alpha=1 - confidence_level)
        kmf.fit(durations, events, label=label)

        # Get survival function
        if timeline is not None:
            survival_func = kmf.survival_function_at_times(timeline)
            time_points = timeline
        else:
            survival_func = kmf.survival_function_
            time_points = survival_func.index.tolist()

        # Confidence intervals
        ci = kmf.confidence_interval_survival_function_

        # Median survival time
        median_survival = kmf.median_survival_time_
        median_ci = median_survival_times(kmf.confidence_interval_survival_function_)

        # Event table (risk table)
        event_table = kmf.event_table

        results = {
            'label': label,
            'n_subjects': len(durations),
            'n_events': int(np.sum(events)),
            'n_censored': int(np.sum(1 - events)),
            'survival_function': {
                'time': time_points,
                'survival_probability': survival_func.values.flatten().tolist() if hasattr(survival_func, 'values') else [survival_func] if isinstance(survival_func, (int, float)) else survival_func.tolist(),
                'confidence_lower': ci.iloc[:, 0].tolist() if len(ci.columns) > 0 else None,
                'confidence_upper': ci.iloc[:, 1].tolist() if len(ci.columns) > 1 else None
            },
            'median_survival': {
                'time': float(median_survival) if not np.isnan(median_survival) else None,
                'confidence_lower': float(median_ci.iloc[0, 0]) if median_ci is not None and len(median_ci) > 0 else None,
                'confidence_upper': float(median_ci.iloc[0, 1]) if median_ci is not None and len(median_ci.columns) > 1 else None
            },
            'event_table': {
                'time': event_table.index.tolist(),
                'at_risk': event_table['at_risk'].tolist(),
                'events': event_table['observed'].tolist(),
                'censored': event_table['censored'].tolist()
            }
        }

        return results

    def _perform_logrank_test_two_groups(self,
                                        data: pd.DataFrame,
                                        duration_col: str,
                                        event_col: str,
                                        group_col: str) -> Dict[str, Any]:
        """
        Perform log-rank test for two groups.

        The log-rank test is a hypothesis test to compare survival distributions
        of two groups. Null hypothesis: survival curves are identical.

        Args:
            data: DataFrame with survival data
            duration_col: Column with durations
            event_col: Column with event indicators
            group_col: Column with group labels

        Returns:
            Dictionary with test statistics and p-value
        """
        groups = data[group_col].unique()
        group1_data = data[data[group_col] == groups[0]]
        group2_data = data[data[group_col] == groups[1]]

        result = logrank_test(
            durations_A=group1_data[duration_col],
            durations_B=group2_data[duration_col],
            event_observed_A=group1_data[event_col],
            event_observed_B=group2_data[event_col]
        )

        return {
            'test_name': 'Log-Rank Test',
            'groups_compared': [str(groups[0]), str(groups[1])],
            'test_statistic': float(result.test_statistic),
            'p_value': float(result.p_value),
            'degrees_of_freedom': 1,
            'is_significant': result.p_value < 0.05,
            'interpretation': (
                f"The survival curves are {'significantly different' if result.p_value < 0.05 else 'not significantly different'} "
                f"between groups (p = {result.p_value:.4f})."
            )
        }

    def _perform_logrank_test_multi_groups(self,
                                          data: pd.DataFrame,
                                          duration_col: str,
                                          event_col: str,
                                          group_col: str) -> Dict[str, Any]:
        """
        Perform multivariate log-rank test for multiple groups.

        Args:
            data: DataFrame with survival data
            duration_col: Column with durations
            event_col: Column with event indicators
            group_col: Column with group labels

        Returns:
            Dictionary with test statistics and p-value
        """
        result = multivariate_logrank_test(
            durations=data[duration_col],
            groups=data[group_col],
            event_observed=data[event_col]
        )

        groups = data[group_col].unique()

        return {
            'test_name': 'Multivariate Log-Rank Test',
            'groups_compared': [str(g) for g in groups],
            'test_statistic': float(result.test_statistic),
            'p_value': float(result.p_value),
            'degrees_of_freedom': len(groups) - 1,
            'is_significant': result.p_value < 0.05,
            'interpretation': (
                f"The survival curves are {'significantly different' if result.p_value < 0.05 else 'not significantly different'} "
                f"across the {len(groups)} groups (p = {result.p_value:.4f})."
            )
        }

    @safe_operation
    def cox_proportional_hazards(self,
                                 data: pd.DataFrame,
                                 duration_col: str,
                                 event_col: str,
                                 covariate_cols: List[str],
                                 confidence_level: float = 0.95,
                                 penalizer: float = 0.0) -> Dict[str, Any]:
        """
        Perform Cox proportional hazards regression.

        Cox regression models the hazard (instantaneous risk of event) as a function
        of covariates. It estimates hazard ratios showing how each covariate affects
        the risk of the event.

        Args:
            data: Input DataFrame
            duration_col: Column with time durations
            event_col: Column with event indicators (1 = event, 0 = censored)
            covariate_cols: List of column names to use as covariates/predictors
            confidence_level: Confidence level for hazard ratio CIs (default: 0.95)
            penalizer: L2 penalty for regularization (default: 0.0, no penalty)

        Returns:
            Dictionary containing:
                - coefficients: Regression coefficients (log hazard ratios)
                - hazard_ratios: Exponentiated coefficients (HR)
                - confidence_intervals: CIs for hazard ratios
                - p_values: Statistical significance for each covariate
                - concordance_index: Model discrimination ability (C-index)
                - log_likelihood: Model fit statistic
                - aic: Akaike Information Criterion
                - partial_aic: Partial AIC

        Raises:
            ValueError: If required columns not found
            RuntimeError: If lifelines not available
        """
        if not self.lifelines_available:
            raise RuntimeError("lifelines library not available. Install with: pip install lifelines")

        # Validate inputs
        required_cols = [duration_col, event_col] + covariate_cols
        missing_cols = [col for col in required_cols if col not in data.columns]
        if missing_cols:
            raise ValueError(f"Columns not found in data: {missing_cols}")

        # Prepare data
        analysis_data = data[[duration_col, event_col] + covariate_cols].copy()
        analysis_data = analysis_data.dropna()

        if len(analysis_data) < 10:
            raise ValueError("Insufficient data after removing missing values (need at least 10 observations)")

        # Fit Cox model
        cph = CoxPHFitter(alpha=1 - confidence_level, penalizer=penalizer)
        cph.fit(analysis_data, duration_col=duration_col, event_col=event_col)

        # Extract results
        summary = cph.summary

        results = {
            'analysis_type': 'cox_proportional_hazards',
            'n_subjects': len(analysis_data),
            'n_events': int(analysis_data[event_col].sum()),
            'n_censored': int(len(analysis_data) - analysis_data[event_col].sum()),
            'n_covariates': len(covariate_cols),
            'confidence_level': confidence_level,
            'penalizer': penalizer,
            'covariates': {}
        }

        # Organize results by covariate
        for covariate in covariate_cols:
            if covariate in summary.index:
                row = summary.loc[covariate]
                results['covariates'][covariate] = {
                    'coefficient': float(row['coef']),
                    'hazard_ratio': float(row['exp(coef)']),
                    'se_coef': float(row['se(coef)']),
                    'confidence_lower': float(row[f'exp(coef) lower {confidence_level:.2f}']),
                    'confidence_upper': float(row[f'exp(coef) upper {confidence_level:.2f}']),
                    'z_score': float(row['z']),
                    'p_value': float(row['p']),
                    'is_significant': row['p'] < 0.05
                }

        # Model fit statistics
        results['model_fit'] = {
            'concordance_index': float(cph.concordance_index_),
            'log_likelihood': float(cph.log_likelihood_),
            'aic': float(cph.AIC_),
            'partial_aic': float(cph.AIC_partial_)
        }

        # Add interpretation
        results['interpretation'] = self._interpret_cox_model(results)

        # Store model for future predictions
        model_id = str(uuid.uuid4())
        model_path = os.path.join(self.models_dir, f"cox_model_{model_id}.pkl")
        with open(model_path, 'wb') as f:
            pickle.dump(cph, f)
        results['model_id'] = model_id

        return results

    def _interpret_kaplan_meier(self, results: Dict[str, Any]) -> str:
        """
        Generate interpretation text for Kaplan-Meier analysis.

        Args:
            results: Results dictionary from KM analysis

        Returns:
            Human-readable interpretation string
        """
        interpretation = []

        # Basic summary
        n_subjects = results['n_subjects']
        n_events = results['n_events']
        n_censored = results['n_censored']
        event_rate = (n_events / n_subjects) * 100

        interpretation.append(
            f"Analyzed {n_subjects} subjects: {n_events} events ({event_rate:.1f}%) "
            f"and {n_censored} censored ({100-event_rate:.1f}%)."
        )

        # Median survival
        if 'median_survival' in results and results['median_survival']['time'] is not None:
            median = results['median_survival']['time']
            interpretation.append(
                f"Median survival time: {median:.2f} time units."
            )
        else:
            interpretation.append(
                "Median survival time: Not reached (more than 50% of subjects remain event-free)."
            )

        # Group comparisons if present
        if 'logrank_test' in results:
            lr = results['logrank_test']
            interpretation.append(
                f"Log-rank test: {lr['interpretation']}"
            )

        return " ".join(interpretation)

    def _interpret_cox_model(self, results: Dict[str, Any]) -> str:
        """
        Generate interpretation text for Cox regression.

        Args:
            results: Results dictionary from Cox regression

        Returns:
            Human-readable interpretation string
        """
        interpretation = []

        # Model fit
        c_index = results['model_fit']['concordance_index']
        interpretation.append(
            f"Model concordance index: {c_index:.3f} "
            f"({'good' if c_index > 0.7 else 'moderate' if c_index > 0.6 else 'poor'} discrimination)."
        )

        # Significant covariates
        sig_covariates = [
            name for name, data in results['covariates'].items()
            if data['is_significant']
        ]

        if sig_covariates:
            interpretation.append(
                f"Significant predictors (p < 0.05): {', '.join(sig_covariates)}."
            )

            # Describe hazard ratios
            for cov in sig_covariates[:3]:  # Limit to top 3
                data = results['covariates'][cov]
                hr = data['hazard_ratio']
                if hr > 1:
                    interpretation.append(
                        f"{cov}: HR = {hr:.2f}, indicating {(hr-1)*100:.0f}% increased hazard."
                    )
                else:
                    interpretation.append(
                        f"{cov}: HR = {hr:.2f}, indicating {(1-hr)*100:.0f}% decreased hazard."
                    )
        else:
            interpretation.append(
                "No covariates reached statistical significance at α = 0.05."
            )

        return " ".join(interpretation)

    @safe_operation
    def predict_survival(self,
                        model_id: str,
                        new_data: pd.DataFrame,
                        times: Optional[List[float]] = None) -> Dict[str, Any]:
        """
        Predict survival probabilities for new subjects using a fitted Cox model.

        Args:
            model_id: ID of previously fitted Cox model
            new_data: DataFrame with covariate values for new subjects
            times: Optional list of time points for prediction

        Returns:
            Dictionary with predicted survival functions

        Raises:
            FileNotFoundError: If model not found
            ValueError: If covariates don't match
        """
        model_path = os.path.join(self.models_dir, f"cox_model_{model_id}.pkl")

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model with ID {model_id} not found")

        # Load model
        with open(model_path, 'rb') as f:
            cph = pickle.load(f)

        # Make predictions
        survival_funcs = cph.predict_survival_function(new_data, times=times)

        results = {
            'model_id': model_id,
            'n_subjects': len(new_data),
            'predictions': []
        }

        for idx, subject_id in enumerate(new_data.index):
            if times is not None:
                survival_probs = survival_funcs.iloc[:, idx].tolist()
                time_points = times
            else:
                survival_probs = survival_funcs.iloc[:, idx].tolist()
                time_points = survival_funcs.index.tolist()

            results['predictions'].append({
                'subject_id': str(subject_id),
                'survival_function': {
                    'time': time_points,
                    'survival_probability': survival_probs
                }
            })

        return results


# Singleton instance
_survival_service = None

def get_survival_service() -> SurvivalService:
    """
    Get singleton instance of SurvivalService.

    Returns:
        SurvivalService instance
    """
    global _survival_service
    if _survival_service is None:
        _survival_service = SurvivalService()
    return _survival_service
