"""
Rate Limiting Middleware
========================

Enforces rate limits for API requests based on:
- API key limits (per PlatformAPIKey model fields: rate_limit_per_minute, rate_limit_per_day)
- IP-based limits for regular/anonymous requests

Uses Django cache framework (Redis when available, LocMemCache fallback).

Disabled by default when DEBUG=True. Set RATE_LIMIT_ENABLED=True in settings
or ENABLE_RATE_LIMITING=true in environment to override.
"""

import logging
import os
import time

from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger(__name__)


def _safe_cache_ttl(cache_key, fallback):
    """
    Get TTL from cache backend. django-redis supports cache.ttl(),
    but LocMemCache does not. Return fallback when unavailable.
    """
    try:
        ttl = cache.ttl(cache_key)
        # django-redis returns 0 for keys that exist but have no expiry,
        # and None for missing keys. Treat both as fallback.
        if ttl is None or ttl == 0:
            return fallback
        return ttl
    except (AttributeError, Exception):
        return fallback


class RateLimitMiddleware:
    """
    Rate limiting middleware using Django cache (Redis-backed when available).

    Supports two modes:
    1. API key-based: reads limits from PlatformAPIKey model fields
       (rate_limit_per_minute, rate_limit_per_day)
    2. IP-based: default limits for authenticated and anonymous users

    Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining,
    X-RateLimit-Reset) are added to every non-exempt response.
    """

    EXEMPT_PREFIXES = (
        "/admin/",
        "/static/",
        "/media/",
        "/api/v1/health/",
        "/api/v1/schema/",
    )

    def __init__(self, get_response):
        self.get_response = get_response

    def _is_enabled(self):
        """Check if rate limiting is enabled (respects settings + env override)."""
        return getattr(
            settings,
            "RATE_LIMIT_ENABLED",
            not getattr(settings, "DEBUG", False)
            or os.environ.get("ENABLE_RATE_LIMITING", "false").lower() == "true",
        )

    def __call__(self, request):
        if not self._is_enabled() or self._is_exempt(request):
            return self.get_response(request)

        # Determine rate limit parameters
        limit, window, cache_key, window_label = self._get_rate_params(request)

        # Check current count
        current_count = cache.get(cache_key, 0)

        if current_count >= limit:
            retry_after = _safe_cache_ttl(cache_key, window)
            retry_after = max(1, retry_after)
            response = JsonResponse(
                {
                    "error": "Rate limit exceeded",
                    "detail": (
                        f"You have exceeded the rate limit of {limit} "
                        f"requests per {window_label}."
                    ),
                    "retry_after": retry_after,
                },
                status=429,
            )
            response["Retry-After"] = str(retry_after)
            response["X-RateLimit-Limit"] = str(limit)
            response["X-RateLimit-Remaining"] = "0"
            response["X-RateLimit-Reset"] = str(retry_after)
            return response

        # Increment counter (atomic when Redis is available)
        try:
            new_count = cache.incr(cache_key)
        except ValueError:
            # Key does not exist yet — initialize it
            cache.set(cache_key, 1, timeout=window)
            new_count = 1

        # Process the actual request
        response = self.get_response(request)

        # Add rate limit headers to every response
        remaining = max(0, limit - new_count)
        reset = _safe_cache_ttl(cache_key, window)
        response["X-RateLimit-Limit"] = str(limit)
        response["X-RateLimit-Remaining"] = str(remaining)
        response["X-RateLimit-Reset"] = str(max(1, reset))

        return response

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _is_exempt(self, request):
        """Return True if the request path is exempt from rate limiting."""
        return any(
            request.path.startswith(prefix) for prefix in self.EXEMPT_PREFIXES
        )

    def _get_client_ip(self, request):
        """Extract the real client IP, respecting X-Forwarded-For."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR", "unknown")

    def _get_rate_params(self, request):
        """
        Determine (limit, window_seconds, cache_key, window_label) for this
        request.

        Priority:
        1. PlatformAPIKey per-minute limit
        2. PlatformAPIKey per-day limit (checked as a second layer)
        3. IP-based limit (authenticated vs anonymous defaults)

        For API-key requests we enforce the *tighter* constraint: if the
        per-minute limit is already reached we block immediately; otherwise
        we also check the per-day limit so both ceilings are respected.
        """
        current_minute = int(time.time()) // 60
        current_day = time.strftime("%Y-%m-%d", time.gmtime())

        # --- API key rate limiting (highest priority) ---
        api_key = getattr(request, "platform_api_key", None)
        if api_key:
            per_min = getattr(api_key, "rate_limit_per_minute", 60)
            per_day = getattr(api_key, "rate_limit_per_day", 10000)

            minute_key = (
                f"ratelimit:apikey:{api_key.id}:minute:{current_minute}"
            )
            day_key = f"ratelimit:apikey:{api_key.id}:day:{current_day}"

            # Check per-day first — if that's exceeded it doesn't matter
            # how many per-minute remain.
            day_count = cache.get(day_key, 0)
            if day_count >= per_day:
                return per_day, 86400, day_key, "day"

            # Ensure the day counter exists and increment it
            try:
                cache.incr(day_key)
            except ValueError:
                cache.set(day_key, 1, timeout=86400)

            # Per-minute is the primary constraint returned for header math
            return per_min, 60, minute_key, "minute"

        # --- IP-based rate limiting ---
        client_ip = self._get_client_ip(request)
        is_authenticated = (
            hasattr(request, "user") and request.user.is_authenticated
        )

        default_auth = getattr(
            settings, "RATE_LIMIT_DEFAULT_AUTHENTICATED", 60
        )
        default_anon = getattr(settings, "RATE_LIMIT_DEFAULT_ANONYMOUS", 20)
        limit = default_auth if is_authenticated else default_anon

        cache_key = f"ratelimit:ip:{client_ip}:minute:{current_minute}"
        return limit, 60, cache_key, "minute"
