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

The SDK is a thin client: it talks to a running StickForStats backend (a local
Docker deployment or a hosted instance) over its REST API. Configure the target
with ``base_url`` / ``api_key`` arguments or the ``STICKFORSTATS_BASE_URL`` /
``STICKFORSTATS_API_KEY`` environment variables.
"""

from stickforstats import quick
from stickforstats._version import __version__
from stickforstats.client import StickForStats
from stickforstats.exceptions import (
    APIError,
    AuthenticationError,
    ConfigurationError,
    ConnectionError,
    NotFoundError,
    RateLimitError,
    ServerError,
    StickForStatsError,
    TimeoutError,
    ValidationError,
)

__all__ = [
    "StickForStats",
    "StickForStatsError",
    "ConfigurationError",
    "ConnectionError",
    "TimeoutError",
    "ValidationError",
    "APIError",
    "AuthenticationError",
    "NotFoundError",
    "RateLimitError",
    "ServerError",
    "quick",
    "__version__",
]
