"""
StickForStats Python SDK
========================

Python client for the StickForStats statistical analysis platform.

Quick start::

    from stickforstats import StickForStats

    client = StickForStats(api_key="your-api-key")
    result = client.stats.ttest(
        data={"group1": [1, 2, 3], "group2": [4, 5, 6]}
    )
    print(result)
"""

from stickforstats import quick
from stickforstats.client import StickForStats
from stickforstats.exceptions import (
    APIError,
    AuthenticationError,
    StickForStatsError,
    TimeoutError,
    ValidationError,
)

__version__ = "0.2.0"
__all__ = [
    "StickForStats",
    "StickForStatsError",
    "APIError",
    "AuthenticationError",
    "ValidationError",
    "TimeoutError",
    "quick",
    "__version__",
]
