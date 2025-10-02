"""
Time Series Analysis Service
=============================

Comprehensive time series analysis and forecasting capabilities.

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

import numpy as np
import pandas as pd
from typing import Dict, Any, List, Tuple, Optional, Union
from dataclasses import dataclass
import warnings
from scipy import stats
from statsmodels.tsa.stattools import adfuller, kpss, acf, pacf
from statsmodels.tsa.seasonal import seasonal_decompose, STL
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.statespace.sarimax import SARIMAX
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.api import VAR, VARMAX
from statsmodels.stats.diagnostic import acorr_ljungbox
from statsmodels.tsa.stattools import grangercausalitytests
import pmdarima as pm
from sklearn.metrics import mean_squared_error, mean_absolute_error, mean_absolute_percentage_error
from sklearn.model_selection import TimeSeriesSplit
import matplotlib.pyplot as plt
import seaborn as sns


@dataclass
class TimeSeriesResults:
    """Container for time series analysis results."""
    model_type: str
    fitted_values: np.ndarray
    residuals: np.ndarray
    forecasts: np.ndarray
    forecast_ci_lower: np.ndarray
    forecast_ci_upper: np.ndarray
    metrics: Dict[str, float]
    diagnostics: Dict[str, Any]
    parameters: Dict[str, Any]
    
    def summary(self) -> str:
        """Generate summary of time series results."""
        summary_lines = [
            f"Time Series Model: {self.model_type}",
            "=" * 50,
            "\nModel Parameters:",
        ]
        
        for key, value in self.parameters.items():
            if isinstance(value, float):
                summary_lines.append(f"  {key}: {value:.4f}")
            else:
                summary_lines.append(f"  {key}: {value}")
        
        summary_lines.extend([
            "\nFit Metrics:",
            f"  RMSE: {self.metrics['rmse']:.4f}",
            f"  MAE: {self.metrics['mae']:.4f}",
            f"  MAPE: {self.metrics.get('mape', np.nan):.2%}",
            f"  AIC: {self.metrics.get('aic', np.nan):.2f}",
            f"  BIC: {self.metrics.get('bic', np.nan):.2f}",
            "\nDiagnostics:"
        ])
        
        for test_name, result in self.diagnostics.items():
            if isinstance(result, dict) and 'p_value' in result:
                summary_lines.append(f"  {test_name}: p-value = {result['p_value']:.4f}")
        
        return "\n".join(summary_lines)


class TimeSeriesService:
    """
    Comprehensive time series analysis and forecasting service.
    
    Provides advanced time series modeling including:
    - ARIMA and SARIMA models
    - Exponential smoothing (Holt-Winters)
    - VAR and VARMAX models for multivariate series
    - Stationarity testing and transformation
    - Seasonal decomposition
    - Forecasting with confidence intervals
    """
    
    def __init__(self):
        """Initialize the time series service."""
        self.model = None
        self.data = None
        self.is_fitted = False
        self.model_type = None
        
    def test_stationarity(self, series: Union[pd.Series, np.ndarray],
                         test_type: str = 'both') -> Dict[str, Any]:
        """
        Test for stationarity using ADF and KPSS tests.
        
        Args:
            series: Time series data
            test_type: 'adf', 'kpss', or 'both'
            
        Returns:
            Dictionary containing test results
        """
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
        
        series = series.dropna()
        results = {}
        
        if test_type in ['adf', 'both']:
            adf_result = adfuller(series, autolag='AIC')
            results['adf'] = {
                'statistic': adf_result[0],
                'p_value': adf_result[1],
                'used_lag': adf_result[2],
                'n_obs': adf_result[3],
                'critical_values': adf_result[4],
                'is_stationary': adf_result[1] < 0.05
            }
        
        if test_type in ['kpss', 'both']:
            warnings.filterwarnings('ignore')
            kpss_result = kpss(series, regression='ct', nlags='auto')
            warnings.resetwarnings()
            
            results['kpss'] = {
                'statistic': kpss_result[0],
                'p_value': kpss_result[1],
                'used_lag': kpss_result[2],
                'critical_values': kpss_result[3],
                'is_stationary': kpss_result[1] > 0.05
            }
        
        # Combined interpretation
        if test_type == 'both':
            adf_stationary = results['adf']['is_stationary']
            kpss_stationary = results['kpss']['is_stationary']
            
            if adf_stationary and kpss_stationary:
                results['conclusion'] = "Series is stationary"
            elif not adf_stationary and not kpss_stationary:
                results['conclusion'] = "Series is non-stationary"
            elif adf_stationary and not kpss_stationary:
                results['conclusion'] = "Series is difference-stationary"
            else:
                results['conclusion'] = "Series is trend-stationary"
        
        return results
    
    def make_stationary(self, series: Union[pd.Series, np.ndarray],
                       method: str = 'difference',
                       difference_order: int = 1) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Transform series to achieve stationarity.
        
        Args:
            series: Time series data
            method: 'difference', 'log', 'sqrt', or 'box-cox'
            difference_order: Order of differencing
            
        Returns:
            Transformed series and transformation parameters
        """
        if isinstance(series, pd.Series):
            series = series.values
        
        series = series[~np.isnan(series)]
        transform_params = {'method': method}
        
        if method == 'difference':
            transformed = np.diff(series, n=difference_order)
            transform_params['order'] = difference_order
            transform_params['lost_obs'] = difference_order
            
        elif method == 'log':
            if np.any(series <= 0):
                raise ValueError("Log transformation requires positive values")
            transformed = np.log(series)
            
        elif method == 'sqrt':
            if np.any(series < 0):
                raise ValueError("Square root transformation requires non-negative values")
            transformed = np.sqrt(series)
            
        elif method == 'box-cox':
            if np.any(series <= 0):
                series = series - np.min(series) + 1
                transform_params['shift'] = -np.min(series) + 1
            
            transformed, lambda_param = stats.boxcox(series)
            transform_params['lambda'] = lambda_param
        
        else:
            raise ValueError(f"Unknown transformation method: {method}")
        
        # Test stationarity of transformed series
        stationarity = self.test_stationarity(transformed, 'adf')
        transform_params['is_stationary'] = stationarity['adf']['is_stationary']
        
        return transformed, transform_params
    
    def seasonal_decompose(self, series: Union[pd.Series, np.ndarray],
                          period: Optional[int] = None,
                          method: str = 'additive') -> Dict[str, Any]:
        """
        Perform seasonal decomposition of time series.
        
        Args:
            series: Time series data
            period: Seasonal period (auto-detected if None)
            method: 'additive' or 'multiplicative'
            
        Returns:
            Dictionary containing decomposition components
        """
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
        
        series = series.dropna()
        
        # Auto-detect period if not provided
        if period is None:
            # Simple periodogram-based detection
            from scipy.signal import periodogram
            freqs, power = periodogram(series.values)
            
            # Find dominant frequency (excluding DC component)
            dominant_freq_idx = np.argmax(power[1:]) + 1
            if dominant_freq_idx < len(freqs):
                period = int(1 / freqs[dominant_freq_idx])
                period = max(2, min(period, len(series) // 2))
            else:
                period = 12  # Default for monthly data
        
        if len(series) < 2 * period:
            raise ValueError(f"Series too short for decomposition with period {period}")
        
        # Perform decomposition
        if method in ['additive', 'multiplicative']:
            decomposition = seasonal_decompose(series, model=method, period=period)
        else:
            # Use STL for more robust decomposition
            stl = STL(series, period=period)
            decomposition = stl.fit()
        
        # Calculate strength of seasonality and trend
        var_detrended = np.var(series - decomposition.trend.dropna())
        var_deseasonalized = np.var(series - decomposition.seasonal)
        var_residual = np.var(decomposition.resid.dropna())
        
        trend_strength = max(0, 1 - var_residual / var_detrended) if var_detrended > 0 else 0
        seasonal_strength = max(0, 1 - var_residual / var_deseasonalized) if var_deseasonalized > 0 else 0
        
        return {
            'trend': decomposition.trend.values,
            'seasonal': decomposition.seasonal.values,
            'residual': decomposition.resid.values,
            'method': method,
            'period': period,
            'trend_strength': trend_strength,
            'seasonal_strength': seasonal_strength
        }
    
    def acf_pacf_analysis(self, series: Union[pd.Series, np.ndarray],
                         nlags: int = 40) -> Dict[str, Any]:
        """
        Compute and analyze ACF and PACF.
        
        Args:
            series: Time series data
            nlags: Number of lags to compute
            
        Returns:
            Dictionary containing ACF, PACF, and suggested orders
        """
        if isinstance(series, pd.Series):
            series = series.values
        
        series = series[~np.isnan(series)]
        nlags = min(nlags, len(series) // 2 - 1)
        
        # Compute ACF and PACF
        acf_values, acf_ci = acf(series, nlags=nlags, alpha=0.05)
        pacf_values, pacf_ci = pacf(series, nlags=nlags, alpha=0.05)
        
        # Find significant lags
        ci_width = 1.96 / np.sqrt(len(series))
        significant_acf = np.where(np.abs(acf_values[1:]) > ci_width)[0] + 1
        significant_pacf = np.where(np.abs(pacf_values[1:]) > ci_width)[0] + 1
        
        # Suggest ARIMA orders based on patterns
        suggested_orders = self._suggest_arima_order(acf_values, pacf_values, ci_width)
        
        return {
            'acf': acf_values,
            'acf_ci': acf_ci,
            'pacf': pacf_values,
            'pacf_ci': pacf_ci,
            'significant_acf_lags': significant_acf,
            'significant_pacf_lags': significant_pacf,
            'suggested_orders': suggested_orders,
            'nlags': nlags
        }
    
    def _suggest_arima_order(self, acf_vals: np.ndarray, pacf_vals: np.ndarray,
                            ci_width: float) -> Dict[str, int]:
        """Suggest ARIMA order based on ACF/PACF patterns."""
        # Simple heuristic for order selection
        p_order = 0
        q_order = 0
        
        # PACF cuts off -> AR(p)
        for i in range(1, min(5, len(pacf_vals))):
            if np.abs(pacf_vals[i]) > ci_width:
                p_order = i
            else:
                break
        
        # ACF cuts off -> MA(q)
        for i in range(1, min(5, len(acf_vals))):
            if np.abs(acf_vals[i]) > ci_width:
                q_order = i
            else:
                break
        
        return {'p': p_order, 'd': 1, 'q': q_order}
    
    def fit_arima(self, series: Union[pd.Series, np.ndarray],
                  order: Optional[Tuple[int, int, int]] = None,
                  seasonal_order: Optional[Tuple[int, int, int, int]] = None,
                  auto: bool = False,
                  **kwargs) -> TimeSeriesResults:
        """
        Fit ARIMA or SARIMA model.
        
        Args:
            series: Time series data
            order: (p, d, q) for ARIMA
            seasonal_order: (P, D, Q, m) for seasonal component
            auto: Use auto-ARIMA for order selection
            **kwargs: Additional arguments for model
            
        Returns:
            TimeSeriesResults object
        """
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
        
        series = series.dropna()
        self.data = series
        
        if auto:
            # Use auto-ARIMA for order selection
            self.model = pm.auto_arima(series, seasonal=seasonal_order is not None,
                                       m=seasonal_order[3] if seasonal_order else 1,
                                       suppress_warnings=True,
                                       stepwise=True,
                                       **kwargs)
            order = self.model.order
            seasonal_order = self.model.seasonal_order if hasattr(self.model, 'seasonal_order') else None
            fitted_model = self.model
        else:
            # Fit specified model
            if seasonal_order:
                self.model = SARIMAX(series, order=order, seasonal_order=seasonal_order,
                                     **kwargs)
            else:
                self.model = ARIMA(series, order=order, **kwargs)
            
            fitted_model = self.model.fit(disp=False)
        
        self.is_fitted = True
        self.model_type = 'SARIMA' if seasonal_order else 'ARIMA'
        
        # Get fitted values and residuals
        fitted_values = fitted_model.fittedvalues
        residuals = fitted_model.resid
        
        # Compute metrics
        metrics = self._compute_metrics(series.values[len(series) - len(fitted_values):],
                                       fitted_values, fitted_model)
        
        # Perform diagnostics
        diagnostics = self._perform_diagnostics(residuals)
        
        # Generate forecasts (default 12 periods ahead)
        forecast_result = fitted_model.forecast(steps=12)
        if hasattr(forecast_result, 'values'):
            forecasts = forecast_result.values
            forecast_ci = fitted_model.get_forecast(steps=12).conf_int()
        else:
            forecasts = forecast_result
            forecast_ci = fitted_model.get_forecast(steps=12).conf_int()
        
        # Store parameters
        parameters = {
            'order': order,
            'seasonal_order': seasonal_order
        }
        
        if hasattr(fitted_model, 'params'):
            for param_name, param_value in fitted_model.params.items():
                parameters[param_name] = param_value
        
        return TimeSeriesResults(
            model_type=self.model_type,
            fitted_values=fitted_values.values if hasattr(fitted_values, 'values') else fitted_values,
            residuals=residuals.values if hasattr(residuals, 'values') else residuals,
            forecasts=forecasts,
            forecast_ci_lower=forecast_ci.iloc[:, 0].values,
            forecast_ci_upper=forecast_ci.iloc[:, 1].values,
            metrics=metrics,
            diagnostics=diagnostics,
            parameters=parameters
        )
    
    def fit_exponential_smoothing(self, series: Union[pd.Series, np.ndarray],
                                  trend: Optional[str] = 'add',
                                  seasonal: Optional[str] = 'add',
                                  seasonal_periods: Optional[int] = None,
                                  **kwargs) -> TimeSeriesResults:
        """
        Fit Exponential Smoothing (Holt-Winters) model.
        
        Args:
            series: Time series data
            trend: Trend component ('add', 'mul', or None)
            seasonal: Seasonal component ('add', 'mul', or None)
            seasonal_periods: Length of seasonal period
            **kwargs: Additional arguments for model
            
        Returns:
            TimeSeriesResults object
        """
        if isinstance(series, np.ndarray):
            series = pd.Series(series)
        
        series = series.dropna()
        self.data = series
        
        # Handle zero/negative values for multiplicative models
        if (trend == 'mul' or seasonal == 'mul') and np.any(series <= 0):
            series = series - series.min() + 1
        
        # Fit model
        self.model = ExponentialSmoothing(series, trend=trend, seasonal=seasonal,
                                         seasonal_periods=seasonal_periods, **kwargs)
        fitted_model = self.model.fit(optimized=True)
        
        self.is_fitted = True
        self.model_type = 'Exponential Smoothing'
        
        # Get fitted values and residuals
        fitted_values = fitted_model.fittedvalues
        residuals = series - fitted_values
        
        # Compute metrics
        metrics = self._compute_metrics(series.values, fitted_values.values, fitted_model)
        
        # Perform diagnostics
        diagnostics = self._perform_diagnostics(residuals)
        
        # Generate forecasts
        forecasts = fitted_model.forecast(steps=12)
        
        # Compute prediction intervals using simulation
        sim_forecasts = []
        for _ in range(1000):
            sim = fitted_model.simulate(nsimulations=12, anchor='end',
                                       random_state=np.random.RandomState())
            sim_forecasts.append(sim)
        
        sim_forecasts = np.array(sim_forecasts)
        forecast_ci_lower = np.percentile(sim_forecasts, 2.5, axis=0)
        forecast_ci_upper = np.percentile(sim_forecasts, 97.5, axis=0)
        
        # Store parameters
        parameters = {
            'trend': trend,
            'seasonal': seasonal,
            'seasonal_periods': seasonal_periods,
            'smoothing_level': fitted_model.params.get('smoothing_level', np.nan),
            'smoothing_trend': fitted_model.params.get('smoothing_trend', np.nan),
            'smoothing_seasonal': fitted_model.params.get('smoothing_seasonal', np.nan)
        }
        
        return TimeSeriesResults(
            model_type=self.model_type,
            fitted_values=fitted_values.values,
            residuals=residuals.values,
            forecasts=forecasts.values if hasattr(forecasts, 'values') else forecasts,
            forecast_ci_lower=forecast_ci_lower,
            forecast_ci_upper=forecast_ci_upper,
            metrics=metrics,
            diagnostics=diagnostics,
            parameters=parameters
        )
    
    def fit_var(self, data: pd.DataFrame,
                maxlags: Optional[int] = None,
                ic: str = 'aic') -> Dict[str, Any]:
        """
        Fit Vector Autoregression (VAR) model for multivariate time series.
        
        Args:
            data: DataFrame with multiple time series columns
            maxlags: Maximum number of lags to consider
            ic: Information criterion for lag selection ('aic', 'bic', 'hqic', 'fpe')
            
        Returns:
            Dictionary containing VAR results
        """
        # Ensure data is stationary
        stationary_data = pd.DataFrame()
        transform_info = {}
        
        for col in data.columns:
            stationarity = self.test_stationarity(data[col])
            if not stationarity['adf']['is_stationary']:
                transformed, params = self.make_stationary(data[col], method='difference')
                stationary_data[col] = pd.Series(transformed)
                transform_info[col] = params
            else:
                stationary_data[col] = data[col]
                transform_info[col] = {'method': 'none'}
        
        # Fit VAR model
        var_model = VAR(stationary_data.dropna())
        
        if maxlags is None:
            maxlags = min(10, len(stationary_data) // 10)
        
        lag_selection = var_model.select_order(maxlags=maxlags)
        optimal_lag = lag_selection.selected_orders[ic]
        
        fitted_var = var_model.fit(optimal_lag)
        
        # Perform Granger causality tests
        granger_results = {}
        for col1 in data.columns:
            granger_results[col1] = {}
            for col2 in data.columns:
                if col1 != col2:
                    gc_test = grangercausalitytests(
                        stationary_data[[col1, col2]].dropna(),
                        maxlag=optimal_lag,
                        verbose=False
                    )
                    # Extract p-values for each lag
                    p_values = [gc_test[lag][0]['ssr_ftest'][1] for lag in range(1, optimal_lag + 1)]
                    granger_results[col1][col2] = {
                        'min_p_value': min(p_values),
                        'causes': min(p_values) < 0.05
                    }
        
        # Generate impulse response functions
        irf = fitted_var.irf(periods=20)
        
        # Forecasts
        forecast_input = stationary_data.values[-optimal_lag:]
        forecasts = fitted_var.forecast(forecast_input, steps=12)
        
        # Compute metrics
        residuals = fitted_var.resid
        metrics = {
            'aic': fitted_var.aic,
            'bic': fitted_var.bic,
            'hqic': fitted_var.hqic,
            'log_likelihood': fitted_var.llf
        }
        
        # Test for residual autocorrelation
        durbin_watson = {}
        for col in residuals.columns:
            from statsmodels.stats.stattools import durbin_watson as dw_test
            durbin_watson[col] = dw_test(residuals[col].dropna())
        
        return {
            'model': fitted_var,
            'optimal_lag': optimal_lag,
            'lag_selection': {
                'aic': lag_selection.aic,
                'bic': lag_selection.bic,
                'hqic': lag_selection.hqic,
                'fpe': lag_selection.fpe
            },
            'coefficients': fitted_var.params,
            'residuals': residuals,
            'granger_causality': granger_results,
            'impulse_response': {
                'irf': irf.irfs,
                'lower_ci': irf.ci()[0],
                'upper_ci': irf.ci()[1]
            },
            'forecasts': forecasts,
            'metrics': metrics,
            'durbin_watson': durbin_watson,
            'transform_info': transform_info
        }
    
    def cross_validate_time_series(self, series: Union[pd.Series, np.ndarray],
                                   model_type: str = 'arima',
                                   n_splits: int = 5,
                                   test_size: int = 12,
                                   **model_kwargs) -> Dict[str, Any]:
        """
        Perform time series cross-validation.
        
        Args:
            series: Time series data
            model_type: Type of model to validate
            n_splits: Number of cross-validation splits
            test_size: Size of test set in each split
            **model_kwargs: Arguments for model fitting
            
        Returns:
            Dictionary containing cross-validation results
        """
        if isinstance(series, pd.Series):
            series = series.values
        
        series = series[~np.isnan(series)]
        
        # Setup time series splits
        tscv = TimeSeriesSplit(n_splits=n_splits, test_size=test_size)
        
        cv_results = []
        
        for fold, (train_idx, test_idx) in enumerate(tscv.split(series)):
            train_data = series[train_idx]
            test_data = series[test_idx]
            
            # Fit model on training data
            if model_type == 'arima':
                if 'auto' in model_kwargs and model_kwargs['auto']:
                    model = pm.auto_arima(train_data, suppress_warnings=True, **model_kwargs)
                    forecasts = model.predict(n_periods=len(test_data))
                else:
                    order = model_kwargs.get('order', (1, 1, 1))
                    model = ARIMA(train_data, order=order)
                    fitted = model.fit(disp=False)
                    forecasts = fitted.forecast(steps=len(test_data))
            
            elif model_type == 'exp_smoothing':
                model = ExponentialSmoothing(train_data, **model_kwargs)
                fitted = model.fit(optimized=True)
                forecasts = fitted.forecast(steps=len(test_data))
            
            # Compute metrics
            mse = mean_squared_error(test_data, forecasts)
            mae = mean_absolute_error(test_data, forecasts)
            
            # MAPE only if no zeros
            if np.all(test_data != 0):
                mape = mean_absolute_percentage_error(test_data, forecasts)
            else:
                mape = np.nan
            
            cv_results.append({
                'fold': fold,
                'mse': mse,
                'rmse': np.sqrt(mse),
                'mae': mae,
                'mape': mape
            })
        
        # Aggregate results
        cv_df = pd.DataFrame(cv_results)
        
        return {
            'metrics_by_fold': cv_results,
            'mean_metrics': {
                'rmse': cv_df['rmse'].mean(),
                'rmse_std': cv_df['rmse'].std(),
                'mae': cv_df['mae'].mean(),
                'mae_std': cv_df['mae'].std(),
                'mape': cv_df['mape'].mean() if not cv_df['mape'].isna().all() else np.nan,
                'mape_std': cv_df['mape'].std() if not cv_df['mape'].isna().all() else np.nan
            },
            'n_splits': n_splits,
            'test_size': test_size
        }
    
    def _compute_metrics(self, actual: np.ndarray, predicted: np.ndarray,
                        model: Any) -> Dict[str, float]:
        """Compute model performance metrics."""
        # Ensure arrays have same length
        min_len = min(len(actual), len(predicted))
        actual = actual[-min_len:]
        predicted = predicted[-min_len:]
        
        mse = mean_squared_error(actual, predicted)
        mae = mean_absolute_error(actual, predicted)
        
        # MAPE only if no zeros
        if np.all(actual != 0):
            mape = mean_absolute_percentage_error(actual, predicted)
        else:
            mape = np.nan
        
        metrics = {
            'mse': mse,
            'rmse': np.sqrt(mse),
            'mae': mae,
            'mape': mape
        }
        
        # Add information criteria if available
        if hasattr(model, 'aic'):
            metrics['aic'] = model.aic
        if hasattr(model, 'bic'):
            metrics['bic'] = model.bic
        if hasattr(model, 'aicc'):
            metrics['aicc'] = model.aicc
        
        return metrics
    
    def _perform_diagnostics(self, residuals: Union[pd.Series, np.ndarray]) -> Dict[str, Any]:
        """Perform residual diagnostics."""
        if isinstance(residuals, pd.Series):
            residuals = residuals.values
        
        residuals = residuals[~np.isnan(residuals)]
        
        diagnostics = {}
        
        # Normality test (Jarque-Bera)
        jb_stat, jb_pvalue = stats.jarque_bera(residuals)
        diagnostics['jarque_bera'] = {
            'statistic': jb_stat,
            'p_value': jb_pvalue,
            'is_normal': jb_pvalue > 0.05
        }
        
        # Ljung-Box test for autocorrelation
        lb_result = acorr_ljungbox(residuals, lags=10, return_df=True)
        diagnostics['ljung_box'] = {
            'statistics': lb_result['lb_stat'].values,
            'p_values': lb_result['lb_pvalue'].values,
            'no_autocorrelation': np.all(lb_result['lb_pvalue'].values > 0.05)
        }
        
        # Durbin-Watson test
        from statsmodels.stats.stattools import durbin_watson
        dw_stat = durbin_watson(residuals)
        diagnostics['durbin_watson'] = {
            'statistic': dw_stat,
            'no_autocorrelation': 1.5 < dw_stat < 2.5
        }
        
        # ARCH test for heteroscedasticity
        from statsmodels.stats.diagnostic import het_arch
        arch_result = het_arch(residuals)
        diagnostics['arch_test'] = {
            'statistic': arch_result[0],
            'p_value': arch_result[1],
            'homoscedastic': arch_result[1] > 0.05
        }
        
        return diagnostics
    
    def forecast(self, steps: int = 12, confidence_level: float = 0.95) -> Dict[str, Any]:
        """
        Generate forecasts from fitted model.
        
        Args:
            steps: Number of periods to forecast
            confidence_level: Confidence level for prediction intervals
            
        Returns:
            Dictionary containing forecasts and intervals
        """
        if not self.is_fitted or self.model is None:
            raise ValueError("Model must be fitted before forecasting")
        
        alpha = 1 - confidence_level
        
        if self.model_type in ['ARIMA', 'SARIMA']:
            forecast_result = self.model.forecast(steps=steps, alpha=alpha)
            forecast_ci = self.model.get_forecast(steps=steps, alpha=alpha).conf_int()
            
            return {
                'forecasts': forecast_result.values if hasattr(forecast_result, 'values') else forecast_result,
                'lower_bound': forecast_ci.iloc[:, 0].values,
                'upper_bound': forecast_ci.iloc[:, 1].values,
                'confidence_level': confidence_level
            }
        
        elif self.model_type == 'Exponential Smoothing':
            forecasts = self.model.forecast(steps=steps)
            
            # Simulate for prediction intervals
            sim_forecasts = []
            for _ in range(1000):
                sim = self.model.simulate(nsimulations=steps, anchor='end',
                                        random_state=np.random.RandomState())
                sim_forecasts.append(sim)
            
            sim_forecasts = np.array(sim_forecasts)
            lower_percentile = (alpha / 2) * 100
            upper_percentile = (1 - alpha / 2) * 100
            
            return {
                'forecasts': forecasts.values if hasattr(forecasts, 'values') else forecasts,
                'lower_bound': np.percentile(sim_forecasts, lower_percentile, axis=0),
                'upper_bound': np.percentile(sim_forecasts, upper_percentile, axis=0),
                'confidence_level': confidence_level
            }
        
        else:
            raise ValueError(f"Forecasting not implemented for model type: {self.model_type}")