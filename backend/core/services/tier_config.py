"""
Subscription Tier Configuration
================================

Defines the default tier configurations that get seeded into the database.
These are also used as fallback definitions when the DB hasn't been seeded.

Tiers:
- Free:       100 analyses/mo, 10MB uploads, 5 projects, 1 member
- Pro:        5,000 analyses/mo, 100MB uploads, unlimited projects, 10 members
- Enterprise: Unlimited analyses, 1GB uploads, unlimited everything, SSO+RBAC
"""

from dataclasses import dataclass, field
from typing import Dict


@dataclass
class TierDefinition:
    """Defines a subscription tier's limits and features."""
    name: str
    slug: str
    display_name: str
    description: str

    # Pricing (cents)
    price_monthly_cents: int = 0
    price_yearly_cents: int = 0

    # Usage limits
    max_analyses_per_month: int = 100
    max_upload_size_mb: int = 10
    max_projects: int = 5
    max_team_members: int = 1
    max_api_keys: int = 1
    max_stored_datasets: int = 10

    # Feature flags
    features: Dict[str, bool] = field(default_factory=dict)

    # Display
    sort_order: int = 0
    is_default: bool = False


FREE_TIER = TierDefinition(
    name='free',
    slug='free',
    display_name='Free',
    description='For students and individual researchers. Get started with basic statistical analysis.',
    price_monthly_cents=0,
    price_yearly_cents=0,
    max_analyses_per_month=100,
    max_upload_size_mb=10,
    max_projects=5,
    max_team_members=1,
    max_api_keys=1,
    max_stored_datasets=10,
    features={
        'guardian': True,
        'autonomous': True,
        'manuscript_review': False,
        'ai_advisor': False,
        'export_pdf': True,
        'export_csv': True,
        'priority_support': False,
        'sso': False,
        'rbac': False,
        'audit_log': False,
        'api_access': False,
        'custom_branding': False,
        'dedicated_support': False,
        'advanced_stats': True,
        'education_hub': True,
    },
    sort_order=0,
    is_default=True,
)

PRO_TIER = TierDefinition(
    name='pro',
    slug='pro',
    display_name='Pro',
    description='For professional researchers and consultants. Full platform access with AI assistance.',
    price_monthly_cents=1900,  # $19/mo
    price_yearly_cents=19000,  # $190/yr ($15.83/mo — 2 months free)
    max_analyses_per_month=5000,
    max_upload_size_mb=100,
    max_projects=0,  # 0 = unlimited
    max_team_members=10,
    max_api_keys=5,
    max_stored_datasets=100,
    features={
        'guardian': True,
        'autonomous': True,
        'manuscript_review': True,
        'ai_advisor': True,
        'export_pdf': True,
        'export_csv': True,
        'priority_support': True,
        'sso': False,
        'rbac': False,
        'audit_log': True,
        'api_access': True,
        'custom_branding': False,
        'dedicated_support': False,
        'advanced_stats': True,
        'education_hub': True,
    },
    sort_order=1,
    is_default=False,
)

ENTERPRISE_TIER = TierDefinition(
    name='enterprise',
    slug='enterprise',
    display_name='Enterprise',
    description='For institutions and organizations. Unlimited access with SSO, RBAC, and dedicated support.',
    price_monthly_cents=9900,  # $99/user/mo
    price_yearly_cents=99000,  # $990/user/yr
    max_analyses_per_month=0,  # 0 = unlimited
    max_upload_size_mb=1024,  # 1GB
    max_projects=0,
    max_team_members=0,
    max_api_keys=0,
    max_stored_datasets=0,
    features={
        'guardian': True,
        'autonomous': True,
        'manuscript_review': True,
        'ai_advisor': True,
        'export_pdf': True,
        'export_csv': True,
        'priority_support': True,
        'sso': True,
        'rbac': True,
        'audit_log': True,
        'api_access': True,
        'custom_branding': True,
        'dedicated_support': True,
        'advanced_stats': True,
        'education_hub': True,
        'data_residency': True,
        'compliance_reports': True,
    },
    sort_order=2,
    is_default=False,
)

JOURNAL_TIER = TierDefinition(
    name='journal',
    slug='journal',
    display_name='Journal',
    description='For academic publishers. Automated manuscript statistical quality review.',
    price_monthly_cents=50000,  # $500/mo/journal
    price_yearly_cents=500000,
    max_analyses_per_month=0,  # unlimited
    max_upload_size_mb=500,
    max_projects=0,
    max_team_members=0,
    max_api_keys=10,
    max_stored_datasets=0,
    features={
        'guardian': True,
        'autonomous': False,
        'manuscript_review': True,
        'ai_advisor': True,
        'export_pdf': True,
        'export_csv': True,
        'priority_support': True,
        'sso': True,
        'rbac': True,
        'audit_log': True,
        'api_access': True,
        'custom_branding': True,
        'dedicated_support': True,
        'webhook_delivery': True,
        'batch_submission': True,
        'journal_analytics': True,
    },
    sort_order=3,
    is_default=False,
)

# All tier definitions
ALL_TIERS = [FREE_TIER, PRO_TIER, ENTERPRISE_TIER, JOURNAL_TIER]


def get_tier_by_slug(slug: str) -> TierDefinition:
    """Get a tier definition by slug."""
    for tier in ALL_TIERS:
        if tier.slug == slug:
            return tier
    return FREE_TIER


def seed_tiers():
    """
    Seed the database with default tier definitions.
    Called from a management command or migration.
    Safe to run multiple times (uses update_or_create).
    """
    from core.models import SubscriptionTier

    created_count = 0
    for tier_def in ALL_TIERS:
        _, created = SubscriptionTier.objects.update_or_create(
            slug=tier_def.slug,
            defaults={
                'name': tier_def.name,
                'display_name': tier_def.display_name,
                'description': tier_def.description,
                'price_monthly_cents': tier_def.price_monthly_cents,
                'price_yearly_cents': tier_def.price_yearly_cents,
                'max_analyses_per_month': tier_def.max_analyses_per_month,
                'max_upload_size_mb': tier_def.max_upload_size_mb,
                'max_projects': tier_def.max_projects,
                'max_team_members': tier_def.max_team_members,
                'max_api_keys': tier_def.max_api_keys,
                'max_stored_datasets': tier_def.max_stored_datasets,
                'features': tier_def.features,
                'sort_order': tier_def.sort_order,
                'is_default': tier_def.is_default,
            }
        )
        if created:
            created_count += 1

    return created_count
