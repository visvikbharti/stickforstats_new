"""
Time Series Analysis Module
============================

Comprehensive time series analysis and forecasting.

Includes:
- ARIMA/SARIMA modeling
- Exponential smoothing (Holt-Winters)
- VAR/VARMAX for multivariate series
- Stationarity testing and transformation
- Seasonal decomposition
- Cross-validation for time series

Author: StickForStats Development Team
Date: 2025-08-26
Version: 1.0.0
"""

from .time_series_service import TimeSeriesService, TimeSeriesResults

__all__ = ['TimeSeriesService', 'TimeSeriesResults']