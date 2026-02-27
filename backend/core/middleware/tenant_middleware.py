"""
Tenant Context Middleware
=========================

Resolves the current organization (tenant) from request headers or API keys,
attaches it to the request, and enforces tier-based usage limits.

Flow:
1. Check X-Organization header (slug) or X-API-Key header (platform API key)
2. Resolve organization and tier
3. Check usage limits against tier
4. Attach request.organization, request.tier, request.org_membership
"""

import logging
from django.conf import settings
from django.http import JsonResponse
from django.utils import timezone

logger = logging.getLogger(__name__)


class TenantContextMiddleware:
    """
    Resolves tenant context from request headers.
    Attaches request.organization, request.tier, request.org_membership.
    """

    # Endpoints that don't require tenant context
    EXEMPT_PREFIXES = (
        "/api/v1/health/",
        "/api/v1/platform/tiers/",
        "/admin/",
        "/static/",
        "/media/",
    )

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, "STICKFORSTATS_TIER_ENFORCEMENT", False)

    def __call__(self, request):
        # Always set defaults
        request.organization = None
        request.tier = None
        request.org_membership = None
        request.platform_api_key = None

        if not self.enabled:
            return self.get_response(request)

        # Skip exempt endpoints
        if any(request.path.startswith(p) for p in self.EXEMPT_PREFIXES):
            return self.get_response(request)

        # Try to resolve tenant
        resolved = self._resolve_from_api_key(request) or self._resolve_from_header(request)

        if resolved and self.enabled:
            # Check tier limits
            limit_response = self._check_tier_limits(request)
            if limit_response:
                return limit_response

        response = self.get_response(request)
        return response

    def _resolve_from_api_key(self, request):
        """Resolve organization from X-API-Key header."""
        api_key = request.META.get("HTTP_X_API_KEY", "")
        if not api_key or not api_key.startswith("sk_sfs_"):
            return False

        try:
            from core.models import PlatformAPIKey

            prefix = api_key[:8]
            key_candidates = PlatformAPIKey.objects.filter(key_prefix=prefix, is_active=True).select_related(
                "organization", "organization__tier"
            )

            for key_obj in key_candidates:
                if key_obj.verify_key(api_key):
                    if key_obj.is_expired():
                        return False

                    request.organization = key_obj.organization
                    request.tier = key_obj.organization.tier
                    request.platform_api_key = key_obj

                    # Update last used
                    PlatformAPIKey.objects.filter(pk=key_obj.pk).update(
                        last_used_at=timezone.now(),
                        last_used_ip=self._get_client_ip(request),
                    )
                    return True
        except Exception as e:
            logger.warning(f"Error resolving API key: {e}")

        return False

    def _resolve_from_header(self, request):
        """Resolve organization from X-Organization header (slug)."""
        org_slug = request.META.get("HTTP_X_ORGANIZATION", "")
        if not org_slug:
            return False

        try:
            from core.models import Organization, OrganizationMembership

            org = Organization.objects.select_related("tier").get(slug=org_slug, is_active=True)
            request.organization = org
            request.tier = org.tier

            # Try to resolve membership if user is authenticated
            if hasattr(request, "user") and request.user.is_authenticated:
                try:
                    membership = OrganizationMembership.objects.get(organization=org, user=request.user, is_active=True)
                    request.org_membership = membership
                except OrganizationMembership.DoesNotExist:
                    pass

            return True
        except Exception:
            return False

    def _check_tier_limits(self, request):
        """Check if the organization is within its tier usage limits."""
        if not request.organization or not request.tier:
            return None

        # Only check POST requests (actual analyses)
        if request.method != "POST":
            return None

        # Skip non-analysis endpoints
        if not request.path.startswith("/api/v1/"):
            return None

        if not request.organization.is_within_limits():
            return JsonResponse(
                {
                    "error": "usage_limit_exceeded",
                    "message": (
                        f"Monthly usage limit reached ({request.tier.max_analyses_per_month} analyses). "
                        f"Upgrade your plan for more capacity."
                    ),
                    "tier": request.tier.slug,
                    "limit": request.tier.max_analyses_per_month,
                    "upgrade_url": "/platform/billing",
                },
                status=429,
            )

        return None

    def _get_client_ip(self, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")


class UsageMeteringMiddleware:
    """
    Records every API call to UsageRecord for metering and analytics.
    Runs after the response is generated to capture status codes and timing.
    """

    # Only meter API endpoints
    API_PREFIX = "/api/v1/"

    # Category mapping from URL path segments
    CATEGORY_MAP = {
        "stats": "stats",
        "power": "power",
        "categorical": "categorical",
        "nonparametric": "nonparametric",
        "missing-data": "missing_data",
        "survival": "survival",
        "factor": "factor",
        "regression": "regression",
        "meta-analysis": "meta_analysis",
        "ai-advisor": "ai_advisor",
        "sqs": "sqs",
        "audit": "audit",
        "autonomous": "autonomous",
        "manuscript": "manuscript",
        "platform": "platform",
        "reports": "reports",
        "data": "data",
        "core": "core",
    }

    def __init__(self, get_response):
        self.get_response = get_response
        self.enabled = getattr(settings, "STICKFORSTATS_USAGE_METERING", False)

    def __call__(self, request):
        if not self.enabled or not request.path.startswith(self.API_PREFIX):
            return self.get_response(request)

        import time

        start_time = time.monotonic()

        response = self.get_response(request)

        elapsed_ms = int((time.monotonic() - start_time) * 1000)

        # Record usage asynchronously (best-effort)
        try:
            self._record_usage(request, response, elapsed_ms)
        except Exception as e:
            logger.warning(f"Failed to record usage: {e}")

        return response

    def _record_usage(self, request, response, elapsed_ms):
        """Create a UsageRecord entry."""
        from core.models import UsageRecord

        category = self._detect_category(request.path)
        client_type = self._detect_client_type(request)

        UsageRecord.objects.create(
            organization=getattr(request, "organization", None),
            user=request.user if hasattr(request, "user") and request.user.is_authenticated else None,
            api_key=getattr(request, "platform_api_key", None),
            endpoint=request.path[:255],
            method=request.method,
            endpoint_category=category,
            status_code=response.status_code,
            response_time_ms=elapsed_ms,
            response_size_bytes=len(response.content) if hasattr(response, "content") else None,
            client_type=client_type,
            client_ip=self._get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            is_billable=request.method == "POST" and response.status_code < 400,
            credits_consumed=1 if request.method == "POST" and response.status_code < 400 else 0,
        )

    def _detect_category(self, path):
        """Detect endpoint category from URL path."""
        # Remove /api/v1/ prefix and get first segment
        remainder = path.replace(self.API_PREFIX, "", 1)
        first_segment = remainder.split("/")[0] if remainder else ""
        return self.CATEGORY_MAP.get(first_segment, "other")

    def _detect_client_type(self, request):
        """Detect client type from User-Agent header."""
        ua = request.META.get("HTTP_USER_AGENT", "").lower()
        if "stickforstats-python" in ua:
            return "sdk_python"
        elif "stickforstats-r" in ua:
            return "sdk_r"
        elif "stickforstats-cli" in ua:
            return "cli"
        elif "mozilla" in ua or "chrome" in ua or "safari" in ua:
            return "web"
        return "api"

    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR")
