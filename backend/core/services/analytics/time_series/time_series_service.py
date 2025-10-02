import numpy as np
import pandas as pd
import logging
from typing import Dict, Any, List, Tuple, Optional, Union
import uuid
import json
import os
from pathlib import Path
from datetime import datetime

from django.conf import settings
import statsmodels.api as sm
from statsmodels.tsa.stattools import adfuller, acf, pacf
from statsmodels.tsa.seasonal import seasonal_decompose
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf
import matplotlib.pyplot as plt
import io
import base64

from core.services.error_handler import safe_operation, try_except

logger = logging.getLogger(__name__)

class TimeSeriesService:
    """
    Service for time series analysis and forecasting.
    
    This service provides methods for:
    - Time series preprocessing and stationarity testing
    - Time series decomposition and pattern analysis
    - Autocorrelation analysis
    - Model selection, training, and forecasting
    - Time series visualization
    """
    
    def __init__(self):
        """Initialize time series service."""
        # Ensure model storage directory exists
        self.models_dir = os.path.join(settings.BASE_DIR, "data", "ts_models")
        os.makedirs(self.models_dir, exist_ok=True)
    
    @safe_operation
    def check_stationarity(self, series: pd.Series) -> Dict[str, Any]:
        """
        Perform stationarity test using Augmented Dickey-Fuller test.
        
        Args:
            series: Time series data
            
        Returns:
            Dictionary with stationarity test results
        """
        # Handle missing values
        series = series.dropna()
        
        # Perform ADF test
        result = adfuller(series)
        
        # Interpret results
        p_value = result[1]
        critical_values = result[4]
        is_stationary = p_value < 0.05
        
        # Create interpretation
        if is_stationary:
            interpretation = (
                "The time series is stationary (p-value < 0.05). "
                "This suggests that the mean and variance do not change over time."
            )
        else:
            interpretation = (
                "The time series is not stationary (p-value >= 0.05). "
                "This suggests that the mean or variance change over time. "
                "Consider differencing or transforming the data."
            )
        
        # Create informative recommendations
        recommendations = []
        
        if not is_stationary:
            recommendations.append("Try differencing the time series to remove trends")
            recommendations.append("Apply a log transformation if variance increases with level")
            recommendations.append("Try a Box-Cox transformation to stabilize variance")
            recommendations.append("Detrend the series by subtracting a fitted trend line")
            recommendations.append("Remove seasonality through seasonal differencing")
        
        # Return results
        return {
            'test_statistic': float(result[0]),
            'p_value': float(p_value),
            'critical_values': {k: float(v) for k, v in critical_values.items()},
            'is_stationary': is_stationary,
            'interpretation': interpretation,
            'recommendations': recommendations
        }
    
    @safe_operation
    def perform_decomposition(self, series: pd.Series, period: Optional[int] = None, 
                            model: str = 'additive') -> Dict[str, Any]:
        """
        Perform seasonal decomposition of time series.
        
        Args:
            series: Time series data
            period: Number of time points in a seasonal cycle (optional)
            model: Type of decomposition ('additive' or 'multiplicative')
            
        Returns:
            Dictionary with decomposition results
        """
        # Handle missing values
        series = series.interpolate()
        
        # Try to determine period if not provided
        if period is None:
            # Check if index has frequency information
            if hasattr(series.index, 'freq') and series.index.freq is not None:
                freq = series.index.freq.name
                
                # Map frequency to period
                if freq == 'D':
                    period = 7  # Weekly seasonality
                elif freq == 'B':
                    period = 5  # Business week
                elif freq == 'M':
                    period = 12  # Monthly data, annual cycle
                elif freq == 'Q':
                    period = 4  # Quarterly data
                elif freq == 'H':
                    period = 24  # Hourly data, daily cycle
                elif freq == 'T' or freq == 'min':
                    period = 60  # Minute data, hourly cycle
                else:
                    period = min(len(series) // 2, 12)  # Default to 12 or half length
            else:
                # Guess based on data characteristics
                if len(series) >= 24:
                    period = min(len(series) // 2, 12)  # Default to 12 or half length
                else:
                    period = len(series) // 2  # Last resort
        
        # Ensure period is at least 2
        period = max(period, 2)
        
        # Check if we have enough data points
        if len(series) < period * 2:
            return {
                'error': (
                    f"Insufficient data points for decomposition with period {period}. "
                    f"Need at least {period * 2} points, but have only {len(series)}."
                )
            }
        
        # Perform decomposition
        decomposition = seasonal_decompose(
            series, 
            model=model,
            period=period,
            extrapolate_trend='freq'
        )
        
        # Calculate component strengths
        trend = decomposition.trend.dropna()
        seasonal = decomposition.seasonal.dropna()
        resid = decomposition.resid.dropna()
        
        # Compute variances for each component
        var_trend = trend.var()
        var_seasonal = seasonal.var()
        var_resid = resid.var()
        var_total = var_trend + var_seasonal + var_resid
        
        strength_trend = var_trend / var_total if var_total > 0 else 0
        strength_seasonal = var_seasonal / var_total if var_total > 0 else 0
        strength_resid = var_resid / var_total if var_total > 0 else 0
        
        # Interpret results
        interpretation = self._interpret_decomposition(strength_trend, strength_seasonal, strength_resid)
        
        # Extract components as lists for serialization
        data_dict = {
            'original': series.values.tolist(),
            'trend': decomposition.trend.values.tolist(),
            'seasonal': decomposition.seasonal.values.tolist(),
            'residual': decomposition.resid.values.tolist(),
            'dates': [str(d) for d in series.index]
        }
        
        # Return results
        return {
            'decomposition': data_dict,
            'period': period,
            'model': model,
            'components': {
                'trend_strength': float(strength_trend),
                'seasonal_strength': float(strength_seasonal),
                'residual_strength': float(strength_resid)
            },
            'interpretation': interpretation
        }
    
    def _interpret_decomposition(self, trend: float, seasonal: float, 
                               residual: float) -> Dict[str, str]:
        """Create interpretations for decomposition results."""
        # Trend interpretation
        if trend > 0.5:
            trend_interp = (
                "Strong trend component (>50% of variance), indicating a "
                "significant long-term movement in the data."
            )
        elif trend > 0.3:
            trend_interp = (
                "Moderate trend component (30-50% of variance), indicating "
                "a noticeable long-term movement in the data."
            )
        elif trend > 0.1:
            trend_interp = (
                "Weak trend component (10-30% of variance), indicating "
                "a slight long-term movement in the data."
            )
        else:
            trend_interp = (
                "Minimal trend component (<10% of variance), indicating "
                "little to no long-term movement in the data."
            )
        
        # Seasonal interpretation
        if seasonal > 0.5:
            seasonal_interp = (
                "Strong seasonal component (>50% of variance), indicating "
                "significant cyclical patterns in the data."
            )
        elif seasonal > 0.3:
            seasonal_interp = (
                "Moderate seasonal component (30-50% of variance), indicating "
                "noticeable cyclical patterns in the data."
            )
        elif seasonal > 0.1:
            seasonal_interp = (
                "Weak seasonal component (10-30% of variance), indicating "
                "slight cyclical patterns in the data."
            )
        else:
            seasonal_interp = (
                "Minimal seasonal component (<10% of variance), indicating "
                "little to no cyclical patterns in the data."
            )
        
        # Residual interpretation
        if residual > 0.5:
            residual_interp = (
                "High residual component (>50% of variance), indicating "
                "that much of the variation is unpredictable or not captured "
                "by trend and seasonality."
            )
        elif residual > 0.3:
            residual_interp = (
                "Moderate residual component (30-50% of variance), indicating "
                "that some variation is not explained by trend and seasonality."
            )
        else:
            residual_interp = (
                "Low residual component (<30% of variance), indicating "
                "that most variation is explained by trend and seasonality."
            )
        
        # Model recommendation
        if trend > 0.3 and seasonal > 0.3:
            model_rec = (
                "Consider SARIMA or ETS models to capture both trend and "
                "seasonality. Differencing may be needed if non-stationary."
            )
        elif trend > 0.3:
            model_rec = (
                "Consider ARIMA models to capture trend component. "
                "Differencing may be needed if non-stationary."
            )
        elif seasonal > 0.3:
            model_rec = (
                "Consider seasonal models like SARIMA or ETS to capture "
                "the strong seasonal patterns."
            )
        else:
            model_rec = (
                "Consider simpler models like AR or MA, or try machine "
                "learning approaches if the data appears mostly random."
            )
        
        return {
            'trend': trend_interp,
            'seasonal': seasonal_interp,
            'residual': residual_interp,
            'model_recommendation': model_rec
        }
    
    @safe_operation
    def analyze_acf_pacf(self, series: pd.Series, nlags: int = 40, 
                       alpha: float = 0.05) -> Dict[str, Any]:
        """
        Calculate and analyze ACF and PACF.
        
        Args:
            series: Time series data
            nlags: Number of lags to calculate
            alpha: Significance level for confidence intervals
            
        Returns:
            Dictionary with ACF and PACF results
        """
        # Handle missing values
        series = series.dropna()
        
        # Limit lags to half the series length
        max_lags = min(nlags, len(series) // 2)
        
        # Calculate ACF and PACF
        acf_values, acf_confint = acf(series, nlags=max_lags, alpha=alpha, fft=True)
        pacf_values, pacf_confint = pacf(series, nlags=max_lags, alpha=alpha)
        
        # Prepare confidence intervals
        acf_lower = [ci[0] for ci in acf_confint]
        acf_upper = [ci[1] for ci in acf_confint]
        
        pacf_lower = [ci[0] for ci in pacf_confint]
        pacf_upper = [ci[1] for ci in pacf_confint]
        
        # Analyze significant lags
        sig_acf_lags = [i for i, (val, lower, upper) in 
                      enumerate(zip(acf_values, acf_lower, acf_upper)) 
                      if (val > upper or val < lower) and i > 0]
        
        sig_pacf_lags = [i for i, (val, lower, upper) in 
                       enumerate(zip(pacf_values, pacf_lower, pacf_upper)) 
                       if (val > upper or val < lower) and i > 0]
        
        # Generate model recommendations
        arima_p = max(sig_pacf_lags) if sig_pacf_lags else 0
        arima_q = max(sig_acf_lags) if sig_acf_lags else 0
        
        # Interpret ACF/PACF patterns
        interpretation = self._interpret_acf_pacf(acf_values, pacf_values, 
                                                sig_acf_lags, sig_pacf_lags)
        
        # Return results
        return {
            'acf': {
                'values': acf_values.tolist(),
                'lower': acf_lower,
                'upper': acf_upper,
                'significant_lags': sig_acf_lags
            },
            'pacf': {
                'values': pacf_values.tolist(),
                'lower': pacf_lower,
                'upper': pacf_upper,
                'significant_lags': sig_pacf_lags
            },
            'suggested_orders': {
                'p': arima_p,
                'q': arima_q
            },
            'interpretation': interpretation
        }
    
    def _interpret_acf_pacf(self, acf_values: np.ndarray, pacf_values: np.ndarray,
                          sig_acf_lags: List[int], sig_pacf_lags: List[int]) -> Dict[str, str]:
        """Interpret ACF and PACF patterns."""
        # Simplify data for interpretation
        acf_simple = acf_values[1:10]  # Skip lag 0
        pacf_simple = pacf_values[1:10]
        
        # Check for different patterns
        acf_decaying = all(abs(acf_simple[i]) >= abs(acf_simple[i+1]) 
                         for i in range(len(acf_simple)-1))
        
        pacf_decaying = all(abs(pacf_simple[i]) >= abs(pacf_simple[i+1]) 
                          for i in range(len(pacf_simple)-1))
        
        acf_cutoff = len(sig_acf_lags) < len(acf_simple) / 2
        pacf_cutoff = len(sig_pacf_lags) < len(pacf_simple) / 2
        
        acf_seasonal = any(acf_simple[i] > acf_simple[i-1] and 
                         acf_simple[i] > acf_simple[i+1] 
                         for i in range(1, len(acf_simple)-1))
        
        pacf_seasonal = any(pacf_simple[i] > pacf_simple[i-1] and 
                          pacf_simple[i] > pacf_simple[i+1] 
                          for i in range(1, len(pacf_simple)-1))
        
        # Interpret patterns
        model_suggestion = ""
        pattern_description = ""
        
        # AR process pattern: ACF decays, PACF cuts off
        if acf_decaying and pacf_cutoff:
            pattern_description = (
                "The ACF shows a gradual decay pattern, while the PACF shows "
                "a more abrupt cutoff after a few lags. "
            )
            model_suggestion = (
                "This pattern suggests an AR(p) process. Consider using an "
                f"ARIMA model with p={max(sig_pacf_lags) if sig_pacf_lags else 1}, d=0, q=0."
            )
        
        # MA process pattern: ACF cuts off, PACF decays
        elif acf_cutoff and pacf_decaying:
            pattern_description = (
                "The ACF shows an abrupt cutoff after a few lags, while the PACF "
                "shows a more gradual decay pattern. "
            )
            model_suggestion = (
                "This pattern suggests an MA(q) process. Consider using an "
                f"ARIMA model with p=0, d=0, q={max(sig_acf_lags) if sig_acf_lags else 1}."
            )
        
        # ARMA process pattern: Both ACF and PACF decay
        elif acf_decaying and pacf_decaying:
            pattern_description = (
                "Both the ACF and PACF show gradual decay patterns. "
            )
            model_suggestion = (
                "This pattern suggests an ARMA(p,q) process. Consider using an "
                f"ARIMA model with p={max(1, max(sig_pacf_lags) if sig_pacf_lags else 1)}, "
                f"d=0, q={max(1, max(sig_acf_lags) if sig_acf_lags else 1)}."
            )
        
        # White noise pattern: No significant lags
        elif not sig_acf_lags and not sig_pacf_lags:
            pattern_description = (
                "Neither the ACF nor PACF show significant lags, suggesting "
                "that the series may be white noise. "
            )
            model_suggestion = (
                "This pattern suggests that the series may not have a clear "
                "autoregressive or moving average structure. Consider using "
                "simpler models or exploring other features."
            )
        
        # Default interpretation
        else:
            pattern_description = (
                "The ACF and PACF show a complex pattern that doesn't clearly "
                "match standard time series structures. "
            )
            model_suggestion = (
                "Consider trying multiple ARIMA configurations and selecting "
                "the best model based on information criteria (AIC/BIC) or "
                "cross-validation performance. Try grid search to find optimal parameters."
            )
        
        # Add seasonal pattern commentary if detected
        seasonal_comment = ""
        if acf_seasonal or pacf_seasonal:
            seasonal_comment = (
                "There appear to be peaks in the autocorrelation function at "
                "regular intervals, suggesting seasonal patterns in the data. "
                "Consider using a seasonal ARIMA (SARIMA) model to capture "
                "these patterns."
            )
        
        return {
            'pattern_description': pattern_description,
            'model_suggestion': model_suggestion,
            'seasonal_pattern': seasonal_comment
        }
    
    @safe_operation
    def fit_arima_model(self, series: pd.Series, order: Tuple[int, int, int], 
                      seasonal_order: Optional[Tuple[int, int, int, int]] = None) -> Dict[str, Any]:
        """
        Fit an ARIMA model to time series data.
        
        Args:
            series: Time series data
            order: ARIMA order (p, d, q)
            seasonal_order: Seasonal order (P, D, Q, s) (optional)
            
        Returns:
            Dictionary with model results
        """
        # Handle missing values
        series = series.interpolate()
        
        # Fit model
        if seasonal_order:
            model = SARIMAX(
                series, 
                order=order, 
                seasonal_order=seasonal_order,
                enforce_stationarity=False,
                enforce_invertibility=False
            )
            model_type = "SARIMA"
            order_str = f"({order[0]}, {order[1]}, {order[2]})({seasonal_order[0]}, {seasonal_order[1]}, {seasonal_order[2]})_{seasonal_order[3]}"
        else:
            model = ARIMA(
                series, 
                order=order
            )
            model_type = "ARIMA"
            order_str = f"({order[0]}, {order[1]}, {order[2]})"
        
        # Fit the model
        results = model.fit()
        
        # Extract diagnostics
        aic = results.aic
        bic = results.bic
        
        # Create model ID
        model_id = str(uuid.uuid4())
        
        # Save the model
        model_path = os.path.join(self.models_dir, f"{model_id}.json")
        with open(model_path, 'w') as f:
            model_info = {
                'id': model_id,
                'type': model_type,
                'order': order,
                'seasonal_order': seasonal_order,
                'params': results.params.tolist(),
                'aic': aic,
                'bic': bic,
                'training_date': datetime.now().isoformat(),
                'model_summary': {
                    'nobs': int(results.nobs),
                    'df_model': int(results.df_model),
                    'df_resid': int(results.df_resid),
                }
            }
            json.dump(model_info, f)
        
        # Save pickle version of model for forecasting
        import pickle
        pickle_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        with open(pickle_path, 'wb') as f:
            pickle.dump(results, f)
        
        # Generate residual diagnostics
        residuals = results.resid
        residual_mean = float(residuals.mean())
        residual_std = float(residuals.std())
        
        # Perform Ljung-Box test on residuals
        from statsmodels.stats.diagnostic import acorr_ljungbox
        lb_test = acorr_ljungbox(residuals, lags=[10], return_df=True)
        
        lb_p_value = float(lb_test['lb_pvalue'].iloc[0])
        residuals_white_noise = lb_p_value > 0.05
        
        # Return model info
        return {
            'model_id': model_id,
            'model_type': model_type,
            'order': order_str,
            'metrics': {
                'aic': float(aic),
                'bic': float(bic)
            },
            'residuals': {
                'mean': residual_mean,
                'std': residual_std,
                'ljung_box_p_value': lb_p_value,
                'is_white_noise': residuals_white_noise
            },
            'interpretation': self._interpret_model_fit(
                model_type, aic, bic, residual_mean, 
                residual_std, residuals_white_noise
            )
        }
    
    def _interpret_model_fit(self, model_type: str, aic: float, bic: float, 
                           residual_mean: float, residual_std: float, 
                           is_white_noise: bool) -> Dict[str, str]:
        """Interpret model fit diagnostics."""
        # Basic model description
        model_desc = f"The {model_type} model has been fit to the time series data."
        
        # Interpret information criteria
        fit_quality = (
            "The model's fit quality can be compared with other models using "
            f"AIC ({aic:.2f}) and BIC ({bic:.2f}). Lower values indicate better fit."
        )
        
        # Interpret residuals
        if is_white_noise:
            residual_diag = (
                "The model residuals appear to be white noise (Ljung-Box p-value > 0.05), "
                "which is desirable and suggests that the model has captured the "
                "underlying patterns in the data well."
            )
        else:
            residual_diag = (
                "The model residuals do not appear to be white noise (Ljung-Box p-value <= 0.05), "
                "which suggests that there may be additional patterns in the data "
                "that the model has not captured. Consider trying a different model specification."
            )
        
        # Overall assessment
        if is_white_noise and abs(residual_mean) < 0.1 * residual_std:
            overall = (
                "Overall, this model appears to be a good fit for the data, with "
                "well-behaved residuals. It is suitable for forecasting if the "
                "underlying conditions remain stable."
            )
        else:
            overall = (
                "This model may not fully capture all patterns in the data. "
                "Consider exploring different model specifications or additional "
                "features if available."
            )
        
        return {
            'model_description': model_desc,
            'fit_quality': fit_quality,
            'residual_diagnostics': residual_diag,
            'overall_assessment': overall
        }
    
    @safe_operation
    def fit_exponential_smoothing(self, series: pd.Series, trend: Optional[str] = None,
                                seasonal: Optional[str] = None, 
                                seasonal_periods: Optional[int] = None) -> Dict[str, Any]:
        """
        Fit exponential smoothing model to time series data.
        
        Args:
            series: Time series data
            trend: Trend type ('add', 'mul', or None)
            seasonal: Seasonal type ('add', 'mul', or None)
            seasonal_periods: Number of periods in a seasonal cycle
            
        Returns:
            Dictionary with model results
        """
        # Handle missing values
        series = series.interpolate()
        
        # Determine seasonal periods if not provided
        if seasonal and not seasonal_periods:
            # Check if index has frequency information
            if hasattr(series.index, 'freq') and series.index.freq is not None:
                freq = series.index.freq.name
                
                # Map frequency to period
                if freq == 'D':
                    seasonal_periods = 7  # Weekly seasonality
                elif freq == 'B':
                    seasonal_periods = 5  # Business week
                elif freq == 'M':
                    seasonal_periods = 12  # Monthly data, annual cycle
                elif freq == 'Q':
                    seasonal_periods = 4  # Quarterly data
                elif freq == 'H':
                    seasonal_periods = 24  # Hourly data, daily cycle
                elif freq == 'T' or freq == 'min':
                    seasonal_periods = 60  # Minute data, hourly cycle
                else:
                    seasonal_periods = 12  # Default to 12
            else:
                seasonal_periods = 12  # Default to 12
        
        # Create model name
        model_name = "Exponential Smoothing"
        if trend:
            model_name += f" with {trend} trend"
        if seasonal:
            model_name += f" and {seasonal} seasonality"
        
        # Fit model
        model = ExponentialSmoothing(
            series,
            trend=trend,
            seasonal=seasonal,
            seasonal_periods=seasonal_periods
        )
        
        # Fit the model
        results = model.fit()
        
        # Extract diagnostics
        aic = results.aic
        bic = results.bic
        
        # Create model ID
        model_id = str(uuid.uuid4())
        
        # Save model info
        model_path = os.path.join(self.models_dir, f"{model_id}.json")
        with open(model_path, 'w') as f:
            model_info = {
                'id': model_id,
                'type': 'ExponentialSmoothing',
                'params': {
                    'trend': trend,
                    'seasonal': seasonal,
                    'seasonal_periods': seasonal_periods
                },
                'smoothing_params': results.params.tolist(),
                'aic': aic,
                'bic': bic,
                'training_date': datetime.now().isoformat(),
                'model_summary': {
                    'nobs': int(len(series)),
                }
            }
            json.dump(model_info, f)
        
        # Save pickle version of model for forecasting
        import pickle
        pickle_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        with open(pickle_path, 'wb') as f:
            pickle.dump(results, f)
        
        # Generate residual diagnostics
        residuals = results.resid
        residual_mean = float(residuals.mean())
        residual_std = float(residuals.std())
        
        # Return model info
        return {
            'model_id': model_id,
            'model_type': 'ExponentialSmoothing',
            'parameters': {
                'trend': trend,
                'seasonal': seasonal,
                'seasonal_periods': seasonal_periods
            },
            'metrics': {
                'aic': float(aic),
                'bic': float(bic)
            },
            'residuals': {
                'mean': residual_mean,
                'std': residual_std
            },
            'interpretation': {
                'model_description': f"The {model_name} model has been fit to the time series data.",
                'fit_quality': f"The model's fit quality can be assessed using AIC ({aic:.2f}) and BIC ({bic:.2f}).",
                'usage_guidance': (
                    "Exponential smoothing models are particularly useful for "
                    "forecasting data with trend and/or seasonal patterns. This model "
                    "gives more weight to recent observations, which is useful when "
                    "recent values are more relevant for prediction."
                )
            }
        }
    
    @safe_operation
    def forecast(self, model_id: str, steps: int, 
               confidence_level: float = 0.95) -> Dict[str, Any]:
        """
        Generate forecasts from a fitted time series model.
        
        Args:
            model_id: ID of the fitted model
            steps: Number of steps to forecast
            confidence_level: Confidence level for prediction intervals
            
        Returns:
            Dictionary with forecast results
        """
        # Check model files
        model_json_path = os.path.join(self.models_dir, f"{model_id}.json")
        model_pkl_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        
        if not os.path.exists(model_json_path) or not os.path.exists(model_pkl_path):
            raise ValueError(f"Model with ID {model_id} not found")
        
        # Load model info
        with open(model_json_path, 'r') as f:
            model_info = json.load(f)
        
        # Load model
        import pickle
        with open(model_pkl_path, 'rb') as f:
            model_results = pickle.load(f)
        
        # Generate forecast
        if model_info['type'] in ['ARIMA', 'SARIMA']:
            forecast_results = model_results.get_forecast(steps=steps)
            forecast_mean = forecast_results.predicted_mean
            
            alpha = 1 - confidence_level
            forecast_ci = forecast_results.conf_int(alpha=alpha)
            
            # Extract dates
            if hasattr(forecast_mean.index, 'strftime'):
                dates = [d.strftime('%Y-%m-%d %H:%M:%S') for d in forecast_mean.index]
            else:
                dates = [str(d) for d in forecast_mean.index]
            
            forecast_data = {
                'mean': forecast_mean.tolist(),
                'lower': forecast_ci.iloc[:, 0].tolist(),
                'upper': forecast_ci.iloc[:, 1].tolist(),
                'dates': dates
            }
        elif model_info['type'] == 'ExponentialSmoothing':
            forecast_mean = model_results.forecast(steps)
            
            # Calculate prediction intervals manually
            import scipy.stats as stats
            resid_std = np.std(model_results.resid)
            z_value = stats.norm.ppf(1 - (1 - confidence_level) / 2)
            
            forecast_lower = forecast_mean - z_value * resid_std
            forecast_upper = forecast_mean + z_value * resid_std
            
            # Extract dates
            if hasattr(forecast_mean.index, 'strftime'):
                dates = [d.strftime('%Y-%m-%d %H:%M:%S') for d in forecast_mean.index]
            else:
                dates = [str(d) for d in forecast_mean.index]
            
            forecast_data = {
                'mean': forecast_mean.tolist(),
                'lower': forecast_lower.tolist(),
                'upper': forecast_upper.tolist(),
                'dates': dates
            }
        else:
            raise ValueError(f"Unsupported model type: {model_info['type']}")
        
        # Return forecast results
        return {
            'model_id': model_id,
            'model_type': model_info['type'],
            'steps': steps,
            'confidence_level': confidence_level,
            'forecast': forecast_data,
            'interpretation': {
                'forecast_description': (
                    f"The {model_info['type']} model has generated forecasts for "
                    f"the next {steps} time periods, with {confidence_level * 100}% "
                    f"confidence intervals."
                ),
                'usage_guidance': (
                    "The confidence intervals represent the uncertainty in the forecast. "
                    "Wider intervals indicate greater uncertainty. Remember that "
                    "forecasts become less reliable as you project further into the future."
                )
            }
        }
    
    @safe_operation
    def get_model_info(self, model_id: str) -> Dict[str, Any]:
        """
        Get information about a time series model.
        
        Args:
            model_id: ID of the model
            
        Returns:
            Dictionary with model information
        """
        model_path = os.path.join(self.models_dir, f"{model_id}.json")
        if not os.path.exists(model_path):
            raise ValueError(f"Model with ID {model_id} not found")
            
        with open(model_path, 'r') as f:
            model_info = json.load(f)
            
        return model_info
    
    @safe_operation
    def list_models(self) -> List[Dict[str, Any]]:
        """
        List all time series models.
        
        Returns:
            List of dictionaries with model information
        """
        models = []
        
        for filename in os.listdir(self.models_dir):
            if filename.endswith('.json'):
                model_id = filename.split('.')[0]
                
                try:
                    model_info = self.get_model_info(model_id)
                    models.append({
                        'id': model_id,
                        'type': model_info['type'],
                        'training_date': model_info.get('training_date'),
                        'metrics': {
                            'aic': model_info.get('aic'),
                            'bic': model_info.get('bic')
                        }
                    })
                except Exception as e:
                    logger.warning(f"Error loading model {model_id}: {str(e)}")
        
        return models
    
    @safe_operation
    def delete_model(self, model_id: str) -> bool:
        """
        Delete a time series model.
        
        Args:
            model_id: ID of the model
            
        Returns:
            True if deletion was successful
        """
        json_path = os.path.join(self.models_dir, f"{model_id}.json")
        pkl_path = os.path.join(self.models_dir, f"{model_id}.pkl")
        
        if not os.path.exists(json_path):
            raise ValueError(f"Model with ID {model_id} not found")
            
        # Delete model files
        if os.path.exists(json_path):
            os.remove(json_path)
            
        if os.path.exists(pkl_path):
            os.remove(pkl_path)
            
        return True

# Initialize global time series service
time_series_service = TimeSeriesService()

def get_time_series_service() -> TimeSeriesService:
    """Get the global time series service instance."""
    return time_series_service