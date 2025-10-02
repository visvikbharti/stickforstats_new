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

def generate_cache_key(prefix, data_dict):
    """
    Generate a consistent cache key from request data.
    Uses SHA256 hash of sorted JSON for consistency.
    """
    try:
        # Sort keys for consistent ordering
        sorted_data = json.dumps(data_dict, sort_keys=True)
        # Create hash
        data_hash = hashlib.sha256(sorted_data.encode()).hexdigest()[:16]
        # Return prefixed key
        return f"{prefix}:{data_hash}"
    except Exception as e:
        logger.warning(f"Cache key generation failed: {e}")
        return None

def cache_statistical_result(timeout=3600, cache_name='default'):
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
            if hasattr(args[0], 'data'):
                request = args[0]
            elif len(args) > 1 and hasattr(args[1], 'data'):
                request = args[1]
            else:
                # No request object found, execute without caching
                return func(*args, **kwargs)

            # Generate cache key from endpoint name and request data
            cache_key = generate_cache_key(func.__name__, dict(request.data))

            if cache_key:
                # Try to get cached result
                cached_result = cache.get(cache_key)
                if cached_result is not None:
                    logger.info(f"Cache hit for {func.__name__}: {cache_key}")
                    # Return Response object with cache metadata
                    from rest_framework.response import Response
                    if isinstance(cached_result, dict):
                        cached_result['_cache_hit'] = True
                    return Response(cached_result)

                # Calculate result
                result = func(*args, **kwargs)

                # Extract data from Response object if needed
                if hasattr(result, 'data'):
                    data_to_cache = dict(result.data)
                    # Cache the data
                    try:
                        cache.set(cache_key, data_to_cache, timeout)
                        logger.info(f"Cached result for {func.__name__}: {cache_key}")
                        # Add cache metadata to response
                        result.data['_cache_hit'] = False
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
        if hasattr(cache, 'delete_pattern'):
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
        if hasattr(cache, 'get_stats'):
            return cache.get_stats()
        else:
            # Basic stats for backends without built-in stats
            return {
                'backend': settings.CACHES['default']['BACKEND'],
                'key_prefix': settings.CACHES['default'].get('KEY_PREFIX', ''),
                'timeout': settings.CACHES['default'].get('TIMEOUT', 0),
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