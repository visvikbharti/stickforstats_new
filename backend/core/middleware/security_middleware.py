"""
Security Headers Middleware
============================

Adds security headers to all responses that Django's SecurityMiddleware
doesn't cover (Content-Security-Policy, Permissions-Policy, Referrer-Policy).

These headers are only applied when DEBUG is False (production) so that
development workflows (hot-reload, inline scripts, etc.) are not disrupted.
"""

import logging

from django.conf import settings

logger = logging.getLogger(__name__)


class SecurityHeadersMiddleware:
    """Adds additional security headers beyond Django's SecurityMiddleware."""

    def __init__(self, get_response):
        self.get_response = get_response
        self.debug = getattr(settings, "DEBUG", False)

        # Build the connect-src directive once at startup.
        # Include CORS origins so the SPA can reach the API in production.
        connect_sources = ["'self'", "ws:", "wss:"]
        cors_origins = getattr(settings, "CORS_ALLOWED_ORIGINS", [])
        for origin in cors_origins:
            if origin and origin not in connect_sources:
                connect_sources.append(origin)
        self._connect_src = " ".join(connect_sources)

    def __call__(self, request):
        response = self.get_response(request)

        # Only add strict headers in production
        if not self.debug:
            # Content Security Policy — permissive enough for a React SPA
            # with MUI (needs unsafe-inline for styles) and data: URIs for
            # images/fonts.
            response["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: blob:; "
                "font-src 'self' data:; "
                f"connect-src {self._connect_src}; "
                "frame-ancestors 'none';"
            )
            # Permissions Policy (replaces Feature-Policy)
            response["Permissions-Policy"] = (
                "camera=(), microphone=(), geolocation=(), payment=()"
            )
            # Referrer Policy
            response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        return response
