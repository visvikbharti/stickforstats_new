"""
Cache utilities for performance optimization
Phase 2 - Performance Enhancement
"""

import hashlib
import json
from functools import wraps
from django.core.cache import cache
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


# Bump whenever a cached endpoint's *result* changes for an unchanged request
# body. The key is derived from the request alone, so without this salt a fix
# that changes what a request computes keeps serving the old, wrong answer from
# Redis until the entry expires. v2: `equal_variance` now reaches the t-test.
# v3 (2026-07-13): `alternative` now reaches the t-test (one-tailed tests were
# silently two-tailed) and the non-parametric tests (Mann-Whitney 500'd on any
# request that supplied one); Jonckheere's statistic and variance were corrected,
# and Page's trend variance was corrected. Every one of those changes the answer
# for a request body that has not changed.
# v5 (2026-07-14): the rank tests no longer truncate the ARE-adjusted sample size.
# `int(n * ARE)` threw away the fractional subject, understating the power of every
# non-parametric design (n = 30 under a normal parent returned 0.451351 where it is
# 0.460036) and, because the normal ARE is 0.955 < 1, sometimes not advancing at all
# when a subject was added. Same request body, different -- and now correct -- answer.
# v6 (2026-08-04): the t-test response changed for unchanged request bodies in three
# ways. (a) It now carries `ci_lower`/`ci_upper`/`ci_level` and Cohen's d at all.
# (b) On degenerate input (zero within-group variance) it no longer carries a
# zero-width "95% CI" of [mean_diff, mean_diff] -- an interval excluding 0 for a
# test whose statistic is None -- and instead carries `ci_error`. (c) A
# `confidence_level` given as a percentage produced ci_lower = ci_upper = "NaN"
# and now produces the correct interval, so 99 and 0.99 finally agree. Without
# this bump, a cached pre-fix entry would keep serving the fabricated interval.
CACHE_SCHEMA_VERSION = 6


def generate_cache_key(prefix, data_dict, version=CACHE_SCHEMA_VERSION):
    """
    Generate a consistent cache key from request data.
    Uses SHA256 hash of sorted JSON for consistency.

    `prefix` must identify the endpoint, not merely the method: every decorated
    handler is called `post`, so a bare method name lets two different endpoints
    that receive the same body read each other's cached responses.
    """
    try:
        # Sort keys for consistent ordering
        sorted_data = json.dumps(data_dict, sort_keys=True)
        # Create hash
        data_hash = hashlib.sha256(sorted_data.encode()).hexdigest()[:16]
        # Return prefixed key
        return f"{prefix}:v{version}:{data_hash}"
    except Exception as e:
        logger.warning(f"Cache key generation failed: {e}")
        return None


def cache_statistical_result(timeout=3600, cache_name="default"):
    """
    Decorator to cache statistical calculation results.
    Works with both function and class methods.

    Args:
        timeout: Cache timeout in seconds (default 1 hour)
        cache_name: Name of cache backend to use
    """

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Handle both function calls and method calls
            # For methods, args[0] is self, args[1] is request
            # For functions, args[0] is request
            if hasattr(args[0], "data"):
                request = args[0]
            elif len(args) > 1 and hasattr(args[1], "data"):
                request = args[1]
            else:
                # No request object found, execute without caching
                return func(*args, **kwargs)

            # Qualname, not name: every decorated handler here is called `post`.
            cache_key = generate_cache_key(func.__qualname__, dict(request.data))

            if cache_key:
                from rest_framework.response import Response

                # Try to get cached result
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    logger.info(f"Cache hit for {func.__name__}: {cache_key}")
                    # New cache entries store {"payload", "status_code"} so the
                    # original HTTP status is preserved on a hit. Legacy entries
                    # (a raw data dict) are treated as a 200 result.
                    if isinstance(cached_result, dict) and "payload" in cached_result and "status_code" in cached_result:
                        data = cached_result["payload"]
                        status_code = cached_result["status_code"]
                    else:
                        data, status_code = cached_result, 200
                    if isinstance(data, dict):
                        data = {**data, "_cache_hit": True}
                    return Response(data, status=status_code)

                # Calculate result
                result = func(*args, **kwargs)

                # Only cache SUCCESSFUL (2xx) responses. Caching error responses
                # (and, previously, re-serving them as a misleading HTTP 200) would
                # mask honest 4xx/5xx statuses such as the 501 for unimplemented
                # ANOVA types. (audit 2026-06-04, F-04 follow-up.)
                status_code = getattr(result, "status_code", None)
                if hasattr(result, "data") and status_code is not None and 200 <= status_code < 300:
                    try:
                        cache.set(
                            cache_key,
                            {"payload": dict(result.data), "status_code": status_code},
                            timeout,
                        )
                        logger.info(f"Cached result for {func.__name__}: {cache_key}")
                        # Add cache metadata to response
                        if isinstance(result.data, dict):
                            result.data["_cache_hit"] = False
                    except Exception as e:
                        logger.warning(f"Failed to cache result: {e}")

                return result

            # Fall back to uncached execution
            return func(*args, **kwargs)

        return wrapper

    return decorator


def invalidate_cache_pattern(pattern):
    """
    Invalidate all cache keys matching a pattern.
    Useful for clearing related cached results.
    """
    try:
        if hasattr(cache, "delete_pattern"):
            deleted = cache.delete_pattern(f"*{pattern}*")
            logger.info(f"Invalidated {deleted} cache entries matching {pattern}")
            return deleted
        else:
            logger.warning("Cache backend doesn't support pattern deletion")
            return 0
    except Exception as e:
        logger.error(f"Cache invalidation failed: {e}")
        return 0


def get_cache_stats():
    """
    Get cache statistics for monitoring.
    """
    try:
        if hasattr(cache, "get_stats"):
            return cache.get_stats()
        else:
            # Basic stats for backends without built-in stats
            return {
                "backend": settings.CACHES["default"]["BACKEND"],
                "key_prefix": settings.CACHES["default"].get("KEY_PREFIX", ""),
                "timeout": settings.CACHES["default"].get("TIMEOUT", 0),
            }
    except Exception as e:
        logger.error(f"Failed to get cache stats: {e}")
        return {}


class CachedCalculation:
    """
    Context manager for cached calculations with performance tracking.
    """

    def __init__(self, cache_key, timeout=3600):
        self.cache_key = cache_key
        self.timeout = timeout
        self.cache_hit = False
        self.result = None

    def __enter__(self):
        # Try to get cached result
        self.result = cache.get(self.cache_key)
        if self.result is not None:
            self.cache_hit = True
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Cache the result if it was calculated
        if not self.cache_hit and self.result is not None:
            try:
                cache.set(self.cache_key, self.result, self.timeout)
            except Exception as e:
                logger.warning(f"Failed to cache result: {e}")

    def set_result(self, result):
        """Set the calculation result."""
        self.result = result
        return result
