# stickforstats/core/services/analytics/machine_learning/__init__.py

try:
    from .ml_service import MLService, get_ml_service
except (ImportError, Exception):
    pass

__all__ = ['MLService', 'get_ml_service']