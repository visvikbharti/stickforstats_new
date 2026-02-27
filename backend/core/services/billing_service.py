"""
Billing Service
================

Manages subscription tiers, usage tracking, and Stripe integration.
Stripe integration uses stubs that work without Stripe installed —
replace with real calls when Stripe SDK is added.
"""

import logging
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.conf import settings
from django.db.models import Count, Avg, Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone

logger = logging.getLogger(__name__)

# Try importing Stripe — graceful fallback if not installed
try:
    import stripe

    stripe.api_key = getattr(settings, "STRIPE_SECRET_KEY", "")
    STRIPE_AVAILABLE = bool(stripe.api_key)
except ImportError:
    stripe = None
    STRIPE_AVAILABLE = False


@dataclass
class UsageSummary:
    """Summary of API usage for a time period."""

    total_requests: int = 0
    billable_requests: int = 0
    total_credits: int = 0
    avg_response_time_ms: float = 0.0
    by_category: Dict[str, int] = field(default_factory=dict)
    by_day: List[Dict[str, Any]] = field(default_factory=list)
    by_status: Dict[int, int] = field(default_factory=dict)
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    limit: int = 0
    usage_percent: float = 0.0

    def to_dict(self):
        return {
            "total_requests": self.total_requests,
            "billable_requests": self.billable_requests,
            "total_credits": self.total_credits,
            "avg_response_time_ms": round(self.avg_response_time_ms, 1),
            "by_category": self.by_category,
            "by_day": self.by_day,
            "by_status": self.by_status,
            "period_start": self.period_start,
            "period_end": self.period_end,
            "limit": self.limit,
            "usage_percent": round(self.usage_percent, 1),
        }


class BillingService:
    """Manages tier enforcement, usage tracking, and billing."""

    @staticmethod
    def check_tier_limits(organization) -> Dict[str, Any]:
        """
        Check if an organization is within its tier limits.
        Returns a dict with limit status for each resource type.
        """
        tier = organization.tier
        if not tier:
            return {"within_limits": True, "checks": {}}

        usage_count = organization.get_usage_this_month()
        max_analyses = tier.max_analyses_per_month

        checks = {
            "analyses": {
                "used": usage_count,
                "limit": max_analyses,
                "within_limit": max_analyses == 0 or usage_count < max_analyses,
                "percent_used": (usage_count / max_analyses * 100) if max_analyses > 0 else 0,
            },
            "team_members": {
                "used": organization.memberships.filter(is_active=True).count(),
                "limit": tier.max_team_members,
                "within_limit": (
                    tier.max_team_members == 0
                    or organization.memberships.filter(is_active=True).count() <= tier.max_team_members
                ),
            },
            "api_keys": {
                "used": organization.api_keys.filter(is_active=True).count(),
                "limit": tier.max_api_keys,
                "within_limit": (
                    tier.max_api_keys == 0 or organization.api_keys.filter(is_active=True).count() <= tier.max_api_keys
                ),
            },
        }

        within_limits = all(c["within_limit"] for c in checks.values())

        return {
            "within_limits": within_limits,
            "tier": tier.slug,
            "tier_display": tier.display_name,
            "checks": checks,
        }

    @staticmethod
    def get_usage_summary(organization, days: int = 30) -> UsageSummary:
        """
        Get usage summary for an organization over the specified period.
        """
        from core.models import UsageRecord

        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)

        qs = UsageRecord.objects.filter(
            organization=organization,
            timestamp__gte=start_date,
            timestamp__lte=end_date,
        )

        # Aggregated stats
        stats = qs.aggregate(
            total=Count("id"),
            billable=Count("id", filter=Q(is_billable=True)),
            credits=Sum("credits_consumed"),
            avg_time=Avg("response_time_ms"),
        )

        # By category
        by_category = dict(
            qs.values_list("endpoint_category").annotate(count=Count("id")).values_list("endpoint_category", "count")
        )

        # By day
        by_day = list(
            qs.annotate(day=TruncDate("timestamp"))
            .values("day")
            .annotate(count=Count("id"), avg_time=Avg("response_time_ms"))
            .order_by("day")
            .values("day", "count", "avg_time")
        )
        # Convert dates to strings
        for entry in by_day:
            entry["day"] = entry["day"].isoformat() if entry["day"] else None
            entry["avg_time"] = round(entry["avg_time"] or 0, 1)

        # By status code
        by_status = dict(qs.values_list("status_code").annotate(count=Count("id")).values_list("status_code", "count"))

        tier = organization.tier
        limit = tier.max_analyses_per_month if tier else 0
        billable = stats["billable"] or 0

        return UsageSummary(
            total_requests=stats["total"] or 0,
            billable_requests=billable,
            total_credits=stats["credits"] or 0,
            avg_response_time_ms=stats["avg_time"] or 0.0,
            by_category=by_category,
            by_day=by_day,
            by_status=by_status,
            period_start=start_date.isoformat(),
            period_end=end_date.isoformat(),
            limit=limit,
            usage_percent=(billable / limit * 100) if limit > 0 else 0,
        )

    @staticmethod
    def get_tier_info_list() -> List[Dict[str, Any]]:
        """Get all active tiers for public display."""
        from core.models import SubscriptionTier

        tiers = SubscriptionTier.objects.filter(is_active=True).order_by("sort_order")

        if not tiers.exists():
            # Fallback to config-defined tiers
            from core.services.tier_config import ALL_TIERS

            return [
                {
                    "slug": t.slug,
                    "name": t.display_name,
                    "description": t.description,
                    "price_monthly": t.price_monthly_cents / 100,
                    "price_yearly": t.price_yearly_cents / 100,
                    "limits": {
                        "analyses_per_month": t.max_analyses_per_month or "Unlimited",
                        "upload_size_mb": t.max_upload_size_mb,
                        "projects": t.max_projects or "Unlimited",
                        "team_members": t.max_team_members or "Unlimited",
                        "api_keys": t.max_api_keys or "Unlimited",
                    },
                    "features": t.features,
                    "is_default": t.is_default,
                }
                for t in ALL_TIERS
            ]

        return [
            {
                "slug": t.slug,
                "name": t.display_name,
                "description": t.description,
                "price_monthly": t.price_monthly_cents / 100,
                "price_yearly": t.price_yearly_cents / 100,
                "limits": {
                    "analyses_per_month": t.max_analyses_per_month or "Unlimited",
                    "upload_size_mb": t.max_upload_size_mb,
                    "projects": t.max_projects or "Unlimited",
                    "team_members": t.max_team_members or "Unlimited",
                    "api_keys": t.max_api_keys or "Unlimited",
                },
                "features": t.features,
                "is_default": t.is_default,
            }
            for t in tiers
        ]

    # =========================================================================
    # Stripe Integration (stubs — replace with real calls when Stripe is added)
    # =========================================================================

    @staticmethod
    def create_checkout_session(organization, tier_slug: str, billing_period: str = "monthly") -> Dict[str, Any]:
        """
        Create a Stripe checkout session for upgrading to a new tier.
        Returns checkout URL or error.
        """
        from core.models import SubscriptionTier

        try:
            tier = SubscriptionTier.objects.get(slug=tier_slug, is_active=True)
        except SubscriptionTier.DoesNotExist:
            return {"error": f'Tier "{tier_slug}" not found'}

        if not STRIPE_AVAILABLE:
            logger.info(f"Stripe not configured. Simulating checkout for {organization.name} → {tier_slug}")
            return {
                "status": "simulated",
                "message": "Stripe is not configured. In production, this would redirect to Stripe Checkout.",
                "tier": tier_slug,
                "price": tier.price_monthly_cents / 100
                if billing_period == "monthly"
                else tier.price_yearly_cents / 100,
                "checkout_url": None,
            }

        # Real Stripe integration
        price_id = tier.stripe_price_id_monthly if billing_period == "monthly" else tier.stripe_price_id_yearly
        if not price_id:
            return {"error": f"No Stripe price configured for {tier_slug} ({billing_period})"}

        try:
            session = stripe.checkout.Session.create(
                customer=organization.stripe_customer_id or None,
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                mode="subscription",
                success_url=f"{settings.FRONTEND_URL}/platform/billing?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{settings.FRONTEND_URL}/platform/billing?canceled=true",
                metadata={
                    "organization_id": str(organization.id),
                    "tier_slug": tier_slug,
                },
            )
            return {
                "status": "created",
                "checkout_url": session.url,
                "session_id": session.id,
            }
        except Exception as e:
            logger.error(f"Stripe checkout error: {e}")
            return {"error": str(e)}

    @staticmethod
    def handle_stripe_webhook(payload: bytes, sig_header: str) -> Dict[str, Any]:
        """
        Process Stripe webhook events for subscription lifecycle management.
        """
        if not STRIPE_AVAILABLE:
            return {"error": "Stripe not configured"}

        webhook_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", "")
        try:
            event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
        except Exception as e:
            return {"error": f"Webhook verification failed: {e}"}

        event_type = event["type"]
        data = event["data"]["object"]

        if event_type == "checkout.session.completed":
            return BillingService._handle_checkout_completed(data)
        elif event_type == "customer.subscription.updated":
            return BillingService._handle_subscription_updated(data)
        elif event_type == "customer.subscription.deleted":
            return BillingService._handle_subscription_deleted(data)
        elif event_type == "invoice.payment_failed":
            return BillingService._handle_payment_failed(data)

        return {"status": "ignored", "event_type": event_type}

    @staticmethod
    def _handle_checkout_completed(session_data):
        """Handle successful checkout — upgrade organization tier."""
        from core.models import Organization, SubscriptionTier

        org_id = session_data.get("metadata", {}).get("organization_id")
        tier_slug = session_data.get("metadata", {}).get("tier_slug")

        if not org_id or not tier_slug:
            return {"error": "Missing metadata"}

        try:
            org = Organization.objects.get(id=org_id)
            tier = SubscriptionTier.objects.get(slug=tier_slug)
            org.tier = tier
            org.stripe_customer_id = session_data.get("customer", "")
            org.stripe_subscription_id = session_data.get("subscription", "")
            org.subscription_status = "active"
            org.save()
            return {"status": "upgraded", "org": str(org.id), "tier": tier_slug}
        except Exception as e:
            return {"error": str(e)}

    @staticmethod
    def _handle_subscription_updated(sub_data):
        from core.models import Organization

        try:
            org = Organization.objects.get(stripe_subscription_id=sub_data["id"])
            org.subscription_status = sub_data.get("status", "active")
            org.current_period_end = timezone.datetime.fromtimestamp(
                sub_data.get("current_period_end", 0), tz=timezone.utc
            )
            org.save()
            return {"status": "updated"}
        except Organization.DoesNotExist:
            return {"error": "Organization not found for subscription"}

    @staticmethod
    def _handle_subscription_deleted(sub_data):
        from core.models import Organization, SubscriptionTier

        try:
            org = Organization.objects.get(stripe_subscription_id=sub_data["id"])
            free_tier = SubscriptionTier.objects.filter(is_default=True).first()
            if free_tier:
                org.tier = free_tier
            org.subscription_status = "canceled"
            org.stripe_subscription_id = ""
            org.save()
            return {"status": "downgraded_to_free"}
        except Organization.DoesNotExist:
            return {"error": "Organization not found"}

    @staticmethod
    def _handle_payment_failed(invoice_data):
        from core.models import Organization

        sub_id = invoice_data.get("subscription")
        if sub_id:
            try:
                org = Organization.objects.get(stripe_subscription_id=sub_id)
                org.subscription_status = "past_due"
                org.save()
                return {"status": "marked_past_due"}
            except Organization.DoesNotExist:
                pass
        return {"status": "no_action"}

    @staticmethod
    def get_subscription_status(organization) -> Dict[str, Any]:
        """Get current subscription status for an organization."""
        tier = organization.tier
        return {
            "tier": {
                "slug": tier.slug if tier else "free",
                "name": tier.display_name if tier else "Free",
                "price_monthly": tier.price_monthly_cents / 100 if tier else 0,
            },
            "status": organization.subscription_status,
            "stripe_customer_id": organization.stripe_customer_id or None,
            "current_period_end": (
                organization.current_period_end.isoformat() if organization.current_period_end else None
            ),
            "usage": BillingService.check_tier_limits(organization),
        }
