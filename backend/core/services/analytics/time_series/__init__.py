# stickforstats/core/services/analytics/time_series/__init__.py

try:
    from .time_series_service import TimeSeriesService, get_time_series_service
except ImportError:
    pass

__all__ = ['TimeSeriesService', 'get_time_series_service']