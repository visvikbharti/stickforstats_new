"""
University Site License Service
================================
Manages institutional site licenses that provide platform access to
all members of a university or research institution.

History (2026-05-06)
--------------------
The previous implementation never persisted licenses to the database:
``create_license`` minted a key and logged it; ``validate_license_key``
accepted any string starting with ``SFS-INST-``; ``get_license_usage``
returned all-zero counters; ``generate_usage_report`` returned a
fixed-shape stub. See docs/CRITICAL_REVIEW_2026-05-06.md §P1-12.

This rewrite moves all flows to the DB-backed ``SiteLicense`` and
``SiteLicenseUsageRecord`` models defined in ``core.models``. License
keys are now namespaced + cryptographically random (``SFS-INST-`` +
12 hex chars from ``secrets.token_hex``); validation is a real DB
lookup; usage queries aggregate from real ``SiteLicenseUsageRecord``
rows.
"""

from __future__ import annotations

import logging
import secrets
from collections import Counter
from datetime import timedelta
from typing import Any, Dict, List, Optional

from django.utils import timezone

logger = logging.getLogger(__name__)


INSTITUTION_TIERS = {
    "department": {
        "name": "Department License",
        "max_users": 50,
        "max_analyses_per_month": 10000,
        "features": ["guardian", "sqs", "autonomous", "education", "certification"],
        "price_yearly": 2000,
    },
    "school": {
        "name": "School/College License",
        "max_users": 500,
        "max_analyses_per_month": 100000,
        "features": [
            "guardian",
            "sqs",
            "autonomous",
            "education",
            "certification",
            "ai_advisor",
            "manuscript_review",
        ],
        "price_yearly": 10000,
    },
    "university": {
        "name": "University-Wide License",
        "max_users": -1,
        "max_analyses_per_month": -1,
        "features": [
            "guardian",
            "sqs",
            "autonomous",
            "education",
            "certification",
            "ai_advisor",
            "manuscript_review",
            "api_access",
            "custom_branding",
        ],
        "price_yearly": 50000,
    },
}

VERIFICATION_METHODS = ["email_domain", "ip_range", "saml_sso", "manual"]


def _generate_license_key() -> str:
    """Generate a fresh institutional license key.

    Format: ``SFS-INST-{16-char-hex}``. The hex is 64 random bits
    drawn from ``secrets.token_hex`` (cryptographically secure), so
    keys cannot be guessed by sequential enumeration.
    """
    return f"SFS-INST-{secrets.token_hex(8).upper()}"


class SiteLicenseService:
    """Manages university/institutional site licenses (DB-backed)."""

    @classmethod
    def get_tiers(cls) -> List[Dict[str, Any]]:
        """Return available institutional license tiers."""
        return [{"id": tid, **tinfo} for tid, tinfo in INSTITUTION_TIERS.items()]

    @classmethod
    def create_license(
        cls,
        institution_name: str,
        tier_id: str,
        admin_email: str,
        domain: str,
        verification_method: str = "email_domain",
        start_date=None,
        duration_years: int = 1,
        notes: str = "",
    ) -> Dict[str, Any]:
        """Create a new institutional site license and persist it."""
        tier = INSTITUTION_TIERS.get(tier_id)
        if not tier:
            return {"error": f"Unknown tier: {tier_id}"}
        if verification_method not in VERIFICATION_METHODS:
            return {"error": f"Unknown verification method: {verification_method}"}
        if duration_years < 1:
            return {"error": "duration_years must be at least 1"}

        from core.models import SiteLicense

        start = start_date or timezone.now()
        end = start + timedelta(days=365 * duration_years)
        license_key = _generate_license_key()

        license_obj = SiteLicense.objects.create(
            license_key=license_key,
            institution_name=institution_name,
            tier=tier_id,
            admin_email=admin_email,
            domain=domain,
            verification_method=verification_method,
            max_users=tier["max_users"],
            max_analyses_per_month=tier["max_analyses_per_month"],
            features=list(tier["features"]),
            price_yearly=tier["price_yearly"],
            duration_years=duration_years,
            start_date=start,
            end_date=end,
            status="active",
            notes=notes,
        )
        logger.info(
            "Site license created: %s for %s (tier=%s, expires=%s)",
            license_key, institution_name, tier_id, end.isoformat(),
        )
        return cls._serialize(license_obj)

    @classmethod
    def _serialize(cls, license_obj) -> Dict[str, Any]:
        """Convert a SiteLicense row to the public response dict."""
        tier_info = INSTITUTION_TIERS.get(license_obj.tier, {})
        return {
            "license_key": license_obj.license_key,
            "institution_name": license_obj.institution_name,
            "tier": license_obj.tier,
            "tier_name": tier_info.get("name", license_obj.tier),
            "admin_email": license_obj.admin_email,
            "domain": license_obj.domain,
            "verification_method": license_obj.verification_method,
            "max_users": license_obj.max_users,
            "max_analyses_per_month": license_obj.max_analyses_per_month,
            "features": license_obj.features,
            "start_date": license_obj.start_date.isoformat(),
            "end_date": license_obj.end_date.isoformat(),
            "duration_years": license_obj.duration_years,
            "price_yearly": license_obj.price_yearly,
            "total_price": license_obj.price_yearly * license_obj.duration_years,
            "status": license_obj.status,
        }

    @classmethod
    def validate_license_key(cls, license_key: str) -> Dict[str, Any]:
        """Validate a license key by DB lookup.

        The previous implementation accepted any string starting with
        ``SFS-INST-`` and returned ``valid: True``. This version
        actually queries the ``SiteLicense`` table, checks the status,
        and rejects expired or non-active licenses.
        """
        if not license_key or not isinstance(license_key, str):
            return {"valid": False, "error": "Invalid license key format"}
        if not license_key.startswith("SFS-INST-"):
            return {"valid": False, "error": "Invalid license key format"}

        from core.models import SiteLicense

        try:
            license_obj = SiteLicense.objects.get(license_key=license_key)
        except SiteLicense.DoesNotExist:
            return {"valid": False, "license_key": license_key, "error": "License not found"}

        if license_obj.status != "active":
            return {
                "valid": False,
                "license_key": license_key,
                "status": license_obj.status,
                "error": f"License status is {license_obj.status}",
            }
        if license_obj.end_date <= timezone.now():
            return {
                "valid": False,
                "license_key": license_key,
                "expired_at": license_obj.end_date.isoformat(),
                "error": "License expired",
            }

        return {
            "valid": True,
            "license_key": license_key,
            "license": cls._serialize(license_obj),
        }

    @classmethod
    def lookup_license_for_email(cls, email: str) -> Optional[Dict[str, Any]]:
        """Find an active license whose configured domain matches the
        email's domain (case-insensitive). Used for unauthenticated
        signup flows where the user types their email and we want to
        auto-attach them to the institutional license."""
        if not email or "@" not in email:
            return None
        from core.models import SiteLicense

        user_domain = email.split("@", 1)[1].lower().strip()
        # Pull all active, non-expired licenses then match.
        # (Domains can be subdomains of the configured domain — e.g.
        # configured "uni.edu" should match "cs.uni.edu" — so we use
        # endswith rather than direct equality.)
        candidates = SiteLicense.objects.filter(
            status="active", end_date__gt=timezone.now()
        )
        for license_obj in candidates:
            cfg_domain = license_obj.domain.lower().strip()
            if user_domain == cfg_domain or user_domain.endswith("." + cfg_domain):
                return cls._serialize(license_obj)
        return None

    @classmethod
    def verify_user_eligibility(cls, email: str, license_data: Dict[str, Any]) -> Dict[str, Any]:
        """Check if a user's email matches the institution's domain."""
        domain = (license_data.get("domain") or "").lower().strip()
        method = license_data.get("verification_method", "email_domain")

        if method == "email_domain":
            if not email or "@" not in email:
                return {"eligible": False, "reason": "No email or invalid format"}
            user_domain = email.split("@", 1)[-1].lower().strip()
            if user_domain == domain or user_domain.endswith("." + domain):
                return {"eligible": True, "method": "email_domain", "domain": domain}
            return {"eligible": False, "reason": f"Email domain does not match {domain}"}
        elif method == "manual":
            return {"eligible": True, "method": "manual", "note": "Manual verification required"}
        elif method == "saml_sso":
            return {"eligible": True, "method": "saml_sso", "note": "Verified via SSO"}
        elif method == "ip_range":
            return {
                "eligible": False,
                "reason": "IP-range verification requires request-side check",
            }
        return {"eligible": False, "reason": "Unknown verification method"}

    @classmethod
    def record_usage(
        cls,
        license_key: str,
        user_email: str,
        feature: str,
        analysis_type: str = "",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Record a single platform-usage event under a license."""
        from core.models import SiteLicense, SiteLicenseUsageRecord

        try:
            license_obj = SiteLicense.objects.get(license_key=license_key)
        except SiteLicense.DoesNotExist:
            return {"ok": False, "error": "License not found"}
        SiteLicenseUsageRecord.objects.create(
            license=license_obj,
            user_email=user_email,
            feature=feature,
            analysis_type=analysis_type,
            metadata=metadata or {},
        )
        return {"ok": True}

    @classmethod
    def get_license_usage(cls, license_key: str) -> Dict[str, Any]:
        """Aggregate real usage statistics from ``SiteLicenseUsageRecord``."""
        from core.models import SiteLicense, SiteLicenseUsageRecord

        try:
            license_obj = SiteLicense.objects.get(license_key=license_key)
        except SiteLicense.DoesNotExist:
            return {"license_key": license_key, "error": "License not found"}

        # Window: last 30 days for "this month"
        now = timezone.now()
        month_start = now - timedelta(days=30)
        records = SiteLicenseUsageRecord.objects.filter(license=license_obj)
        this_month = records.filter(occurred_at__gte=month_start)

        active_users = (
            this_month.values_list("user_email", flat=True).distinct().count()
        )
        analyses_this_month = this_month.count()

        # Top tests (analysis_type) used this month, top 5
        type_counts = Counter(this_month.values_list("analysis_type", flat=True))
        top_tests = [
            {"analysis_type": t or "(unknown)", "count": c}
            for t, c in type_counts.most_common(5)
        ]

        # Active "departments" approximated as distinct sub-domains of
        # the configured domain in user_email values this month.
        cfg_domain = license_obj.domain.lower().strip()
        departments = set()
        for email in this_month.values_list("user_email", flat=True):
            if not email or "@" not in email:
                continue
            user_domain = email.split("@", 1)[1].lower()
            if user_domain.endswith("." + cfg_domain):
                # Take the leftmost sub-component as the "department"
                sub = user_domain[: -len("." + cfg_domain)]
                if sub:
                    departments.add(sub.split(".")[0])

        return {
            "license_key": license_key,
            "active_users": active_users,
            "total_analyses_this_month": analyses_this_month,
            "top_tests_used": top_tests,
            "departments_active": sorted(departments),
            "window_days": 30,
            "max_users": license_obj.max_users,
            "max_analyses_per_month": license_obj.max_analyses_per_month,
            "license_status": license_obj.status,
        }

    @classmethod
    def generate_usage_report(cls, license_key: str, period: str = "monthly") -> Dict[str, Any]:
        """Generate a real usage report aggregated from
        ``SiteLicenseUsageRecord`` rows."""
        from core.models import SiteLicense, SiteLicenseUsageRecord

        try:
            license_obj = SiteLicense.objects.get(license_key=license_key)
        except SiteLicense.DoesNotExist:
            return {"license_key": license_key, "error": "License not found"}

        now = timezone.now()
        if period == "daily":
            window_start = now - timedelta(days=1)
        elif period == "weekly":
            window_start = now - timedelta(days=7)
        elif period == "yearly":
            window_start = now - timedelta(days=365)
        else:  # monthly default
            window_start = now - timedelta(days=30)

        records = SiteLicenseUsageRecord.objects.filter(
            license=license_obj, occurred_at__gte=window_start
        )

        users = set(records.values_list("user_email", flat=True))
        active_users = len(users)
        total_analyses = records.count()

        type_counts = Counter(records.values_list("analysis_type", flat=True))
        analyses_by_test_type = {t or "(unknown)": c for t, c in type_counts.items()}

        feature_counts = Counter(records.values_list("feature", flat=True))
        most_used_features = [
            {"feature": f, "count": c} for f, c in feature_counts.most_common(10)
        ]

        guardian_violations_prevented = records.filter(
            feature="guardian_block"
        ).count()
        manuscripts_analyzed = records.filter(feature="manuscript_review").count()
        certifications_earned = records.filter(feature="certification_pass").count()

        return {
            "license_key": license_key,
            "period": period,
            "window_start": window_start.isoformat(),
            "window_end": now.isoformat(),
            "report": {
                "total_users": active_users,
                "active_users": active_users,
                "total_analyses": total_analyses,
                "analyses_by_test_type": analyses_by_test_type,
                "guardian_violations_prevented": guardian_violations_prevented,
                "manuscripts_analyzed": manuscripts_analyzed,
                "certifications_earned": certifications_earned,
                "most_used_features": most_used_features,
            },
            "generated_at": now.isoformat(),
        }
