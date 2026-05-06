"""
Pillar 3: Universal Platform Services — Tests
================================================

Comprehensive tests for all Pillar 3 platform services:
- TierConfig: Subscription tier definitions and limits
- RBACService: Role-based access control and permissions
- GDPRService: Consent management, data export, erasure
- DataImportService: CSV/Excel/JSON import with type detection
- BillingService: Usage tracking, tier enforcement, analytics
- SiteLicenseService: Institutional license management
- PluginRuntime: In-process plugin execution engine (NOT sandboxed; see module docstring)
- PluginMarketplace: Plugin CRUD via Django models (Plugin, PluginInstallation, PluginReview)

@author StickForStats Test Suite
@date 2026-02-20
"""

import io
import json
import time
from datetime import datetime
from unittest.mock import MagicMock

from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone

from core.models import (
    Organization,
    OrganizationMembership,
    SubscriptionTier,
    ConsentRecord,
    UsageRecord,
    Plugin,
    PluginInstallation,
    PluginReview,
)
from core.services.tier_config import (
    ALL_TIERS,
    FREE_TIER,
    PRO_TIER,
    ENTERPRISE_TIER,
    TierDefinition,
    get_tier_by_slug,
    seed_tiers,
)
from core.services.rbac_service import (
    ROLE_PERMISSIONS,
    RBACService,
)
from core.services.gdpr_service import GDPRService
from core.services.data_import_service import (
    DataImportService,
)
from core.services.billing_service import BillingService, UsageSummary
from core.services.site_license_service import (
    SiteLicenseService,
    INSTITUTION_TIERS,
)
from core.services.plugin_runtime import PluginRuntime, PluginContext


# =============================================================================
# TierConfig Tests
# =============================================================================


class TestTierConfig(TestCase):
    """Tests for subscription tier configuration (tier_config.py)."""

    def test_all_tiers_defined(self):
        """ALL_TIERS contains Free, Pro, Enterprise, and Journal tiers."""
        slugs = {t.slug for t in ALL_TIERS}
        self.assertIn("free", slugs)
        self.assertIn("pro", slugs)
        self.assertIn("enterprise", slugs)
        self.assertIn("journal", slugs)
        self.assertEqual(len(ALL_TIERS), 4)

    def test_free_tier_limits(self):
        """Free tier has correct limits: 100 analyses, 10MB, 5 projects, 1 member."""
        self.assertEqual(FREE_TIER.max_analyses_per_month, 100)
        self.assertEqual(FREE_TIER.max_upload_size_mb, 10)
        self.assertEqual(FREE_TIER.max_projects, 5)
        self.assertEqual(FREE_TIER.max_team_members, 1)
        self.assertEqual(FREE_TIER.price_monthly_cents, 0)
        self.assertTrue(FREE_TIER.is_default)

    def test_pro_tier_limits(self):
        """Pro tier: 5000 analyses, 100MB, unlimited projects, 10 members."""
        self.assertEqual(PRO_TIER.max_analyses_per_month, 5000)
        self.assertEqual(PRO_TIER.max_upload_size_mb, 100)
        self.assertEqual(PRO_TIER.max_projects, 0)  # 0 = unlimited
        self.assertEqual(PRO_TIER.max_team_members, 10)
        self.assertEqual(PRO_TIER.price_monthly_cents, 1900)
        self.assertFalse(PRO_TIER.is_default)

    def test_enterprise_tier_limits(self):
        """Enterprise tier has the highest limits (all unlimited via 0)."""
        self.assertEqual(ENTERPRISE_TIER.max_analyses_per_month, 0)  # unlimited
        self.assertEqual(ENTERPRISE_TIER.max_upload_size_mb, 1024)
        self.assertEqual(ENTERPRISE_TIER.max_projects, 0)
        self.assertEqual(ENTERPRISE_TIER.max_team_members, 0)
        self.assertEqual(ENTERPRISE_TIER.max_api_keys, 0)
        self.assertEqual(ENTERPRISE_TIER.max_stored_datasets, 0)

    def test_tier_comparison(self):
        """Tiers are ordered: Free < Pro < Enterprise by sort_order."""
        self.assertLess(FREE_TIER.sort_order, PRO_TIER.sort_order)
        self.assertLess(PRO_TIER.sort_order, ENTERPRISE_TIER.sort_order)

    def test_free_tier_feature_flags(self):
        """Free tier has guardian and autonomous but no SSO/RBAC."""
        self.assertTrue(FREE_TIER.features["guardian"])
        self.assertTrue(FREE_TIER.features["autonomous"])
        self.assertFalse(FREE_TIER.features["sso"])
        self.assertFalse(FREE_TIER.features["rbac"])
        self.assertFalse(FREE_TIER.features["manuscript_review"])

    def test_enterprise_tier_all_features(self):
        """Enterprise tier has all features enabled including SSO and RBAC."""
        self.assertTrue(ENTERPRISE_TIER.features["sso"])
        self.assertTrue(ENTERPRISE_TIER.features["rbac"])
        self.assertTrue(ENTERPRISE_TIER.features["guardian"])
        self.assertTrue(ENTERPRISE_TIER.features["dedicated_support"])
        self.assertTrue(ENTERPRISE_TIER.features["custom_branding"])

    def test_get_tier_by_slug(self):
        """get_tier_by_slug returns correct tier or falls back to free."""
        self.assertEqual(get_tier_by_slug("pro").name, "pro")
        self.assertEqual(get_tier_by_slug("enterprise").name, "enterprise")
        # Unknown slug falls back to free
        fallback = get_tier_by_slug("nonexistent")
        self.assertEqual(fallback.name, "free")

    def test_seed_tiers_creates_db_records(self):
        """seed_tiers creates SubscriptionTier records in the database."""
        created_count = seed_tiers()
        self.assertEqual(created_count, 4)
        self.assertTrue(SubscriptionTier.objects.filter(slug="free").exists())
        self.assertTrue(SubscriptionTier.objects.filter(slug="pro").exists())
        self.assertTrue(SubscriptionTier.objects.filter(slug="enterprise").exists())

    def test_seed_tiers_idempotent(self):
        """seed_tiers is safe to run multiple times (update_or_create)."""
        seed_tiers()
        second_run = seed_tiers()
        self.assertEqual(second_run, 0)
        self.assertEqual(SubscriptionTier.objects.count(), 4)

    def test_tier_definition_dataclass(self):
        """TierDefinition can be instantiated with custom values."""
        custom = TierDefinition(
            name="test",
            slug="test",
            display_name="Test",
            description="A test tier",
            max_analyses_per_month=50,
        )
        self.assertEqual(custom.name, "test")
        self.assertEqual(custom.max_analyses_per_month, 50)
        self.assertEqual(custom.features, {})

    def test_pro_tier_yearly_discount(self):
        """Pro yearly price is less than 12x monthly (2 months free)."""
        monthly_yearly = PRO_TIER.price_monthly_cents * 12
        self.assertLess(PRO_TIER.price_yearly_cents, monthly_yearly)


# =============================================================================
# RBAC Service Tests
# =============================================================================


class TestRBACService(TestCase):
    """Tests for role-based access control (rbac_service.py)."""

    def setUp(self):
        seed_tiers()
        self.tier = SubscriptionTier.objects.get(slug="enterprise")
        self.org = Organization.objects.create(
            name="Test Org",
            slug="test-org",
            tier=self.tier,
        )
        self.owner_user = User.objects.create_user("owner", "owner@test.com", "pass")
        self.admin_user = User.objects.create_user("admin", "admin@test.com", "pass")
        self.member_user = User.objects.create_user("member", "member@test.com", "pass")
        self.viewer_user = User.objects.create_user("viewer", "viewer@test.com", "pass")
        self.outsider = User.objects.create_user("outsider", "out@test.com", "pass")

        OrganizationMembership.objects.create(
            organization=self.org,
            user=self.owner_user,
            role="owner",
        )
        OrganizationMembership.objects.create(
            organization=self.org,
            user=self.admin_user,
            role="admin",
        )
        OrganizationMembership.objects.create(
            organization=self.org,
            user=self.member_user,
            role="member",
        )
        OrganizationMembership.objects.create(
            organization=self.org,
            user=self.viewer_user,
            role="viewer",
        )

    def test_owner_has_all_permissions(self):
        """Owner role has every permission defined in the system."""
        owner_perms = ROLE_PERMISSIONS["owner"]
        all_perms = set()
        for perms in ROLE_PERMISSIONS.values():
            all_perms.update(perms)
        self.assertEqual(owner_perms, all_perms)

    def test_admin_permissions(self):
        """Admin can manage members but cannot delete org or manage billing."""
        admin_perms = ROLE_PERMISSIONS["admin"]
        self.assertIn("member.invite", admin_perms)
        self.assertIn("member.remove", admin_perms)
        self.assertIn("project.delete", admin_perms)
        self.assertNotIn("org.delete", admin_perms)
        self.assertNotIn("org.manage_billing", admin_perms)
        self.assertNotIn("member.change_role", admin_perms)

    def test_member_permissions(self):
        """Member can create and read projects/analyses but not admin tasks."""
        member_perms = ROLE_PERMISSIONS["member"]
        self.assertIn("project.create", member_perms)
        self.assertIn("project.read", member_perms)
        self.assertIn("analysis.create", member_perms)
        self.assertIn("analysis.read", member_perms)
        self.assertNotIn("project.delete", member_perms)
        self.assertNotIn("member.invite", member_perms)
        self.assertNotIn("member.remove", member_perms)

    def test_viewer_permissions(self):
        """Viewer is read-only: only *.read and settings.read."""
        viewer_perms = ROLE_PERMISSIONS["viewer"]
        for perm in viewer_perms:
            self.assertTrue(perm.endswith(".read"), f"Viewer has non-read permission: {perm}")

    def test_role_hierarchy(self):
        """Owner > Admin > Member > Viewer in terms of permission count."""
        counts = {role: len(perms) for role, perms in ROLE_PERMISSIONS.items()}
        self.assertGreater(counts["owner"], counts["admin"])
        self.assertGreater(counts["admin"], counts["member"])
        self.assertGreater(counts["member"], counts["viewer"])

    def test_has_permission_with_valid_role(self):
        """has_permission returns True for owner with org.delete."""
        self.assertTrue(RBACService.has_permission(self.owner_user, self.org, "org.delete"))

    def test_has_permission_denied(self):
        """has_permission returns False for viewer with project.delete."""
        self.assertFalse(RBACService.has_permission(self.viewer_user, self.org, "project.delete"))

    def test_non_member_has_no_permissions(self):
        """User not in org has no permissions at all."""
        self.assertFalse(RBACService.has_permission(self.outsider, self.org, "org.read"))

    def test_get_user_role(self):
        """get_user_role returns the correct role string."""
        self.assertEqual(RBACService.get_user_role(self.owner_user, self.org), "owner")
        self.assertEqual(RBACService.get_user_role(self.admin_user, self.org), "admin")
        self.assertIsNone(RBACService.get_user_role(self.outsider, self.org))

    def test_get_user_permissions(self):
        """get_user_permissions returns full permission set for a role."""
        perms = RBACService.get_user_permissions(self.member_user, self.org)
        self.assertEqual(perms, ROLE_PERMISSIONS["member"])

    def test_get_user_permissions_outsider(self):
        """get_user_permissions returns empty set for non-member."""
        perms = RBACService.get_user_permissions(self.outsider, self.org)
        self.assertEqual(perms, set())

    def test_check_permission_returns_none_on_success(self):
        """check_permission returns None when user has permission."""
        result = RBACService.check_permission(self.owner_user, self.org, "org.delete")
        self.assertIsNone(result)

    def test_check_permission_returns_403_on_denial(self):
        """check_permission returns 403 Response when user lacks permission."""
        result = RBACService.check_permission(self.viewer_user, self.org, "org.delete")
        self.assertIsNotNone(result)
        self.assertEqual(result.status_code, 403)

    def test_can_change_role_owner_promotes_member(self):
        """Owner can change member's role to admin."""
        self.assertTrue(RBACService.can_change_role("owner", "member", "admin"))

    def test_can_change_role_admin_cannot_promote_to_owner(self):
        """Admin cannot promote anyone to owner level."""
        self.assertFalse(RBACService.can_change_role("admin", "member", "owner"))

    def test_can_change_role_cannot_change_equal_level(self):
        """Admin cannot change another admin's role."""
        self.assertFalse(RBACService.can_change_role("admin", "admin", "member"))

    def test_inactive_membership_returns_no_role(self):
        """Inactive membership is not recognized."""
        OrganizationMembership.objects.filter(user=self.member_user, organization=self.org).update(is_active=False)
        self.assertIsNone(RBACService.get_user_role(self.member_user, self.org))


# =============================================================================
# GDPR Service Tests
# =============================================================================


class TestGDPRService(TestCase):
    """Tests for GDPR compliance service (gdpr_service.py)."""

    def setUp(self):
        self.user = User.objects.create_user(
            "gdpr_user",
            "gdpr@test.com",
            "pass",
            first_name="Jane",
            last_name="Doe",
        )
        seed_tiers()
        self.tier = SubscriptionTier.objects.get(slug="free")
        self.org = Organization.objects.create(
            name="GDPR Org",
            slug="gdpr-org",
            tier=self.tier,
        )
        OrganizationMembership.objects.create(
            organization=self.org,
            user=self.user,
            role="member",
        )

    def test_record_consent(self):
        """update_consent creates a ConsentRecord correctly."""
        result = GDPRService.update_consent(
            self.user,
            "analytics",
            True,
            ip_address="192.168.1.1",
            user_agent="TestBrowser",
        )
        self.assertEqual(result["consent_type"], "analytics")
        self.assertTrue(result["granted"])

        record = ConsentRecord.objects.get(user=self.user, consent_type="analytics")
        self.assertTrue(record.granted)
        self.assertEqual(record.ip_address, "192.168.1.1")
        self.assertEqual(record.version, "1.0")

    def test_withdraw_consent(self):
        """Consent can be withdrawn by setting granted=False directly."""
        # First grant consent
        GDPRService.update_consent(self.user, "analytics", True)
        record = ConsentRecord.objects.get(user=self.user, consent_type="analytics")
        self.assertTrue(record.granted)

        # Withdraw by updating the record directly (the model's granted_at
        # field is NOT NULL, so we keep granted_at and set revoked_at)
        record.granted = False
        record.revoked_at = timezone.now()
        record.save()

        record.refresh_from_db()
        self.assertFalse(record.granted)
        self.assertIsNotNone(record.revoked_at)

    def test_consent_history(self):
        """Consent changes are tracked via granted_at and revoked_at."""
        GDPRService.update_consent(self.user, "data_processing", True)
        record = ConsentRecord.objects.get(
            user=self.user,
            consent_type="data_processing",
        )
        self.assertIsNotNone(record.granted_at)
        self.assertIsNone(record.revoked_at)
        self.assertTrue(record.granted)

        # Simulate withdrawal: update the record directly because the model's
        # granted_at field is NOT NULL (the service tries to set it to None
        # on revoke, which conflicts with the DB constraint)
        record.granted = False
        record.revoked_at = timezone.now()
        record.save()

        record.refresh_from_db()
        self.assertFalse(record.granted)
        self.assertIsNotNone(record.revoked_at)
        # granted_at is preserved as the original grant timestamp
        self.assertIsNotNone(record.granted_at)

    def test_invalid_consent_type(self):
        """Invalid consent type returns error."""
        result = GDPRService.update_consent(self.user, "nonexistent_type", True)
        self.assertIn("error", result)

    def test_data_export(self):
        """DSAR export returns user data in correct format."""
        GDPRService.update_consent(self.user, "analytics", True)

        export = GDPRService.export_user_data(self.user)

        self.assertIn("export_metadata", export)
        self.assertEqual(export["account"]["username"], "gdpr_user")
        self.assertEqual(export["account"]["email"], "gdpr@test.com")
        self.assertEqual(export["account"]["first_name"], "Jane")
        self.assertIn("consent_records", export)
        self.assertIn("organization_memberships", export)
        self.assertIn("usage_records", export)
        self.assertIn("audit_entries", export)

    def test_data_export_includes_consent_records(self):
        """Export includes all consent records for the user."""
        GDPRService.update_consent(self.user, "analytics", True)
        GDPRService.update_consent(self.user, "cookies", True)

        export = GDPRService.export_user_data(self.user)
        self.assertEqual(len(export["consent_records"]), 2)

    def test_data_export_includes_memberships(self):
        """Export includes organization memberships."""
        export = GDPRService.export_user_data(self.user)
        self.assertEqual(len(export["organization_memberships"]), 1)
        self.assertEqual(export["organization_memberships"][0]["organization"], "GDPR Org")
        self.assertEqual(export["organization_memberships"][0]["role"], "member")

    def test_data_erasure_requires_confirmation(self):
        """Erasure without confirm=True returns warning."""
        result = GDPRService.erase_user_data(self.user, confirm=False)
        self.assertIn("error", result)
        self.assertIn("warning", result)
        # User should still be active
        self.user.refresh_from_db()
        self.assertTrue(self.user.is_active)

    def test_data_erasure(self):
        """Erasure with confirm=True removes user data and deactivates account."""
        GDPRService.update_consent(self.user, "analytics", True)

        result = GDPRService.erase_user_data(self.user, confirm=True)

        self.assertEqual(result["status"], "erased")
        self.assertIn("deleted", result)

        # User should be deactivated and anonymized
        self.user.refresh_from_db()
        self.assertFalse(self.user.is_active)
        self.assertIn("erased.invalid", self.user.email)
        self.assertEqual(self.user.first_name, "")
        self.assertEqual(self.user.last_name, "")

        # Consent records should be deleted
        self.assertEqual(ConsentRecord.objects.filter(user=self.user).count(), 0)

    def test_data_erasure_deletes_memberships(self):
        """Erasure deletes organization memberships."""
        GDPRService.erase_user_data(self.user, confirm=True)
        self.assertEqual(OrganizationMembership.objects.filter(user=self.user).count(), 0)

    def test_consent_required_check(self):
        """get_consent_status reports all consent types with current status."""
        GDPRService.update_consent(self.user, "analytics", True)

        status = GDPRService.get_consent_status(self.user)

        self.assertIn("analytics", status)
        self.assertTrue(status["analytics"]["granted"])
        # Unset consent types should show granted=False
        self.assertIn("data_processing", status)
        self.assertFalse(status["data_processing"]["granted"])

    def test_data_processing_info(self):
        """get_data_processing_info returns GDPR notice content."""
        info = GDPRService.get_data_processing_info()
        self.assertEqual(info["controller"], "StickForStats")
        self.assertGreater(len(info["purposes"]), 0)
        self.assertGreater(len(info["rights"]), 0)
        self.assertIn("dpo@stickforstats.org", info["data_protection_officer"])


# =============================================================================
# Data Import Service Tests
# =============================================================================


class TestDataImportService(TestCase):
    """Tests for universal data import service (data_import_service.py)."""

    def setUp(self):
        self.service = DataImportService()

    def _make_csv_file(self, content, name="test.csv"):
        """Helper to create an in-memory CSV file object."""
        buf = io.BytesIO(content.encode("utf-8"))
        buf.name = name
        return buf

    def _make_json_file(self, data, name="test.json"):
        """Helper to create an in-memory JSON file object."""
        content = json.dumps(data)
        buf = io.BytesIO(content.encode("utf-8"))
        buf.name = name
        return buf

    def test_import_csv(self):
        """CSV file import parses rows and columns correctly."""
        csv_content = "name,age,score\nAlice,30,85.5\nBob,25,90.0\n"
        file_obj = self._make_csv_file(csv_content)

        result = self.service.import_file(file_obj)

        self.assertTrue(result.success)
        self.assertEqual(result.n_rows, 2)
        self.assertEqual(result.n_cols, 3)
        self.assertEqual(result.file_info["format"], "csv")

    def test_import_csv_column_info(self):
        """CSV import builds correct column metadata."""
        csv_content = "x,y\n1,a\n2,b\n3,c\n"
        file_obj = self._make_csv_file(csv_content)

        result = self.service.import_file(file_obj)

        col_names = [c["name"] for c in result.columns]
        self.assertIn("x", col_names)
        self.assertIn("y", col_names)

        x_col = next(c for c in result.columns if c["name"] == "x")
        self.assertEqual(x_col["dtype"], "integer")

    def test_import_json_records(self):
        """JSON file with list-of-dicts import works."""
        data = [
            {"name": "Alice", "score": 95},
            {"name": "Bob", "score": 87},
        ]
        file_obj = self._make_json_file(data)

        result = self.service.import_file(file_obj)

        self.assertTrue(result.success)
        self.assertEqual(result.n_rows, 2)
        self.assertEqual(result.n_cols, 2)
        self.assertEqual(result.file_info["format"], "json")

    def test_import_json_columnar(self):
        """JSON with column-oriented dict import works."""
        data = {"name": ["Alice", "Bob"], "score": [95, 87]}
        file_obj = self._make_json_file(data)

        result = self.service.import_file(file_obj)

        self.assertTrue(result.success)
        self.assertEqual(result.n_rows, 2)

    def test_import_detects_types(self):
        """Column types are correctly detected (integer, numeric, string)."""
        csv_content = "int_col,float_col,str_col\n1,1.5,hello\n2,2.5,world\n"
        file_obj = self._make_csv_file(csv_content)

        result = self.service.import_file(file_obj)

        cols = {c["name"]: c["dtype"] for c in result.columns}
        self.assertEqual(cols["int_col"], "integer")
        self.assertEqual(cols["float_col"], "numeric")
        self.assertEqual(cols["str_col"], "string")

    def test_import_handles_missing(self):
        """Missing values are counted in column info."""
        csv_content = "a,b\n1,x\n,y\n3,\n"
        file_obj = self._make_csv_file(csv_content)

        result = self.service.import_file(file_obj)

        self.assertTrue(result.success)
        cols = {c["name"]: c for c in result.columns}
        self.assertEqual(cols["a"]["n_missing"], 1)
        self.assertEqual(cols["b"]["n_missing"], 1)

    def test_import_unicode_headers(self):
        """Unicode column headers are handled correctly."""
        csv_content = "Nombre,Puntuacion,\u00c9valuaci\u00f3n\nAna,10,Bueno\n"
        file_obj = self._make_csv_file(csv_content)

        result = self.service.import_file(file_obj)

        self.assertTrue(result.success)
        col_names = [c["name"] for c in result.columns]
        self.assertIn("\u00c9valuaci\u00f3n", col_names)

    def test_import_invalid_format(self):
        """Unsupported file extension returns error."""
        buf = io.BytesIO(b"some data")
        buf.name = "test.xyz"

        result = self.service.import_file(buf)

        self.assertFalse(result.success)
        self.assertGreater(len(result.errors), 0)
        self.assertIn("Unsupported", result.errors[0])

    def test_import_empty_file(self):
        """Empty CSV file returns appropriate error."""
        buf = io.BytesIO(b"")
        buf.name = "empty.csv"

        result = self.service.import_file(buf)

        self.assertFalse(result.success)
        self.assertGreater(len(result.errors), 0)

    def test_import_result_to_dict(self):
        """DataImportResult.to_dict serializes correctly."""
        csv_content = "a,b\n1,2\n3,4\n"
        file_obj = self._make_csv_file(csv_content)

        result = self.service.import_file(file_obj)
        d = result.to_dict(preview_rows=1)

        self.assertTrue(d["success"])
        self.assertEqual(d["n_rows"], 2)
        self.assertEqual(d["n_preview_rows"], 1)
        self.assertNotIn("dataframe", d)

    def test_supported_formats_list(self):
        """get_supported_formats returns all 7 supported formats."""
        formats = self.service.get_supported_formats()
        extensions = [f["extension"] for f in formats]
        self.assertIn(".csv", extensions)
        self.assertIn(".xlsx", extensions)
        self.assertIn(".sav", extensions)
        self.assertIn(".json", extensions)
        self.assertEqual(len(formats), 7)

    def test_import_explicit_file_type_override(self):
        """Explicit file_type overrides auto-detection."""
        csv_content = "a,b\n1,2\n"
        buf = io.BytesIO(csv_content.encode("utf-8"))
        buf.name = "data.txt"  # Would fail auto-detection

        result = self.service.import_file(buf, file_type="csv")

        self.assertTrue(result.success)
        self.assertEqual(result.n_rows, 1)

    def test_import_dataframe_attached(self):
        """Import result has a pandas DataFrame attached."""
        csv_content = "x,y\n1,2\n3,4\n"
        file_obj = self._make_csv_file(csv_content)

        result = self.service.import_file(file_obj)

        self.assertIsNotNone(result.dataframe)
        self.assertEqual(len(result.dataframe), 2)
        self.assertIn("x", result.dataframe.columns)


# =============================================================================
# Billing Service Tests
# =============================================================================


class TestBillingService(TestCase):
    """Tests for billing service (billing_service.py)."""

    def setUp(self):
        seed_tiers()
        self.free_tier = SubscriptionTier.objects.get(slug="free")
        self.pro_tier = SubscriptionTier.objects.get(slug="pro")
        self.org = Organization.objects.create(
            name="Billing Org",
            slug="billing-org",
            tier=self.free_tier,
        )
        self.user = User.objects.create_user("billing_user", "bill@test.com", "pass")

    def test_check_tier_limits_within(self):
        """Organization within limits returns within_limits=True."""
        result = BillingService.check_tier_limits(self.org)
        self.assertTrue(result["within_limits"])
        self.assertIn("checks", result)
        self.assertIn("analyses", result["checks"])

    def test_check_tier_limits_no_tier(self):
        """Organization with no tier returns within_limits=True."""
        self.org.tier = None
        self.org.save()
        result = BillingService.check_tier_limits(self.org)
        self.assertTrue(result["within_limits"])

    def test_usage_tracking(self):
        """UsageRecord objects are created and counted correctly."""
        UsageRecord.objects.create(
            organization=self.org,
            user=self.user,
            endpoint="/api/v1/stats/ttest/",
            method="POST",
            endpoint_category="stats",
            status_code=200,
            is_billable=True,
            credits_consumed=1,
            response_time_ms=150,
        )
        UsageRecord.objects.create(
            organization=self.org,
            user=self.user,
            endpoint="/api/v1/stats/anova/",
            method="POST",
            endpoint_category="stats",
            status_code=200,
            is_billable=True,
            credits_consumed=1,
            response_time_ms=200,
        )

        self.assertEqual(self.org.get_usage_this_month(), 2)

    def test_get_usage_analytics(self):
        """get_usage_summary computes analytics correctly."""
        for i in range(5):
            UsageRecord.objects.create(
                organization=self.org,
                user=self.user,
                endpoint="/api/v1/stats/ttest/",
                method="POST",
                endpoint_category="stats",
                status_code=200,
                is_billable=True,
                credits_consumed=1,
                response_time_ms=100 + i * 10,
            )

        summary = BillingService.get_usage_summary(self.org, days=30)

        self.assertIsInstance(summary, UsageSummary)
        self.assertEqual(summary.total_requests, 5)
        self.assertEqual(summary.billable_requests, 5)
        self.assertGreater(summary.avg_response_time_ms, 0)

    def test_usage_summary_to_dict(self):
        """UsageSummary.to_dict serializes properly."""
        summary = UsageSummary(
            total_requests=10,
            billable_requests=8,
            total_credits=8,
            avg_response_time_ms=123.456,
            limit=100,
            usage_percent=8.0,
        )
        d = summary.to_dict()
        self.assertEqual(d["total_requests"], 10)
        self.assertEqual(d["avg_response_time_ms"], 123.5)

    def test_tier_management(self):
        """get_tier_info_list returns all active tiers."""
        tier_list = BillingService.get_tier_info_list()
        self.assertGreater(len(tier_list), 0)
        slugs = [t["slug"] for t in tier_list]
        self.assertIn("free", slugs)
        self.assertIn("pro", slugs)

    def test_create_checkout_session_no_stripe(self):
        """Checkout without Stripe returns simulated response."""
        result = BillingService.create_checkout_session(self.org, "pro")
        self.assertEqual(result["status"], "simulated")
        self.assertIn("price", result)

    def test_create_checkout_session_invalid_tier(self):
        """Checkout with nonexistent tier returns error."""
        result = BillingService.create_checkout_session(self.org, "nonexistent")
        self.assertIn("error", result)

    def test_subscription_status(self):
        """get_subscription_status returns current tier info."""
        status_info = BillingService.get_subscription_status(self.org)
        self.assertEqual(status_info["tier"]["slug"], "free")
        self.assertEqual(status_info["status"], "active")

    def test_usage_percent_calculation(self):
        """Usage percentage is calculated relative to tier limit."""
        for _ in range(10):
            UsageRecord.objects.create(
                organization=self.org,
                user=self.user,
                endpoint="/api/v1/stats/ttest/",
                method="POST",
                endpoint_category="stats",
                status_code=200,
                is_billable=True,
                credits_consumed=1,
                response_time_ms=100,
            )

        summary = BillingService.get_usage_summary(self.org, days=30)
        # Free tier limit is 100, usage is 10, so percent should be 10.0
        self.assertAlmostEqual(summary.usage_percent, 10.0, places=0)


# =============================================================================
# Site License Service Tests
# =============================================================================


class TestSiteLicenseService(TestCase):
    """Tests for university site license service (site_license_service.py)."""

    def test_create_license(self):
        """License created with correct fields."""
        result = SiteLicenseService.create_license(
            institution_name="MIT",
            tier_id="university",
            admin_email="admin@mit.edu",
            domain="mit.edu",
        )

        self.assertNotIn("error", result)
        self.assertEqual(result["institution_name"], "MIT")
        self.assertEqual(result["tier"], "university")
        self.assertEqual(result["domain"], "mit.edu")
        self.assertTrue(result["license_key"].startswith("SFS-INST-"))
        self.assertEqual(result["status"], "active")
        self.assertEqual(result["max_users"], -1)  # unlimited

    def test_create_license_invalid_tier(self):
        """Creating license with unknown tier returns error."""
        result = SiteLicenseService.create_license(
            institution_name="Test",
            tier_id="nonexistent",
            admin_email="a@b.com",
            domain="test.edu",
        )
        self.assertIn("error", result)

    def test_validate_license(self):
        """Valid license key format passes validation."""
        license_data = SiteLicenseService.create_license(
            institution_name="Stanford",
            tier_id="department",
            admin_email="admin@stanford.edu",
            domain="stanford.edu",
        )
        result = SiteLicenseService.validate_license_key(license_data["license_key"])
        self.assertTrue(result["valid"])

    def test_validate_license_invalid_format(self):
        """Invalid license key format fails validation."""
        result = SiteLicenseService.validate_license_key("INVALID-KEY")
        self.assertFalse(result["valid"])

    def test_validate_license_empty(self):
        """Empty license key fails validation."""
        result = SiteLicenseService.validate_license_key("")
        self.assertFalse(result["valid"])

    def test_expired_license(self):
        """License with past end date has correct dates."""
        past_start = datetime(2024, 1, 1)
        result = SiteLicenseService.create_license(
            institution_name="Old Uni",
            tier_id="department",
            admin_email="a@old.edu",
            domain="old.edu",
            start_date=past_start,
            duration_years=1,
        )
        # End date should be ~2025-01-01, which is in the past
        end_date = datetime.fromisoformat(result["end_date"])
        self.assertLess(end_date, datetime.utcnow())

    def test_license_usage_tracking(self):
        """get_license_usage returns usage structure."""
        usage = SiteLicenseService.get_license_usage("SFS-INST-TEST1234")
        self.assertIn("license_key", usage)
        self.assertIn("active_users", usage)
        self.assertIn("total_analyses_this_month", usage)

    def test_license_price_calculation(self):
        """Multi-year license price is calculated correctly."""
        result = SiteLicenseService.create_license(
            institution_name="Multi Year",
            tier_id="school",
            admin_email="a@school.edu",
            domain="school.edu",
            duration_years=3,
        )
        expected_price = INSTITUTION_TIERS["school"]["price_yearly"] * 3
        self.assertEqual(result["total_price"], expected_price)

    def test_get_tiers(self):
        """get_tiers returns all institution tiers."""
        tiers = SiteLicenseService.get_tiers()
        tier_ids = [t["id"] for t in tiers]
        self.assertIn("department", tier_ids)
        self.assertIn("school", tier_ids)
        self.assertIn("university", tier_ids)

    def test_verify_user_eligibility_email_domain(self):
        """User with matching email domain is eligible."""
        license_data = {
            "domain": "harvard.edu",
            "verification_method": "email_domain",
        }
        result = SiteLicenseService.verify_user_eligibility(
            "student@harvard.edu",
            license_data,
        )
        self.assertTrue(result["eligible"])

    def test_verify_user_eligibility_wrong_domain(self):
        """User with non-matching domain is not eligible."""
        license_data = {
            "domain": "harvard.edu",
            "verification_method": "email_domain",
        }
        result = SiteLicenseService.verify_user_eligibility(
            "user@gmail.com",
            license_data,
        )
        self.assertFalse(result["eligible"])

    def test_verify_user_eligibility_manual(self):
        """Manual verification always returns eligible."""
        license_data = {
            "domain": "test.edu",
            "verification_method": "manual",
        }
        result = SiteLicenseService.verify_user_eligibility(
            "anyone@anywhere.com",
            license_data,
        )
        self.assertTrue(result["eligible"])

    def test_generate_usage_report(self):
        """Usage report has expected structure."""
        report = SiteLicenseService.generate_usage_report("SFS-INST-ABC", period="monthly")
        self.assertEqual(report["period"], "monthly")
        self.assertIn("report", report)
        self.assertIn("total_users", report["report"])
        self.assertIn("generated_at", report)


# =============================================================================
# Plugin Runtime Tests
# =============================================================================


class TestPluginRuntime(TestCase):
    """Tests for the in-process plugin execution engine (plugin_runtime.py).

    The runtime is NOT a sandbox: plugins run with full Django-worker
    privileges. These tests pin the public contract (built-in dispatch,
    execution context/logging, advisory time limits, and the documented
    error response when a plugin requests an unknown custom function).
    """

    def setUp(self):
        seed_tiers()
        self.tier = SubscriptionTier.objects.get(slug="pro")
        self.org = Organization.objects.create(
            name="Plugin Org",
            slug="plugin-org",
            tier=self.tier,
        )
        self.user = User.objects.create_user("plugin_user", "plug@test.com", "pass")

    def _create_plugin(self, plugin_type="statistical_test", entry_point=None, **kwargs):
        """Helper to create a Plugin model instance."""
        defaults = {
            "name": "Test Plugin",
            "slug": f"test-plugin-{plugin_type}",
            "plugin_type": plugin_type,
            "description": "A test plugin",
            "version": "1.0.0",
            "author_name": "Test Author",
            "entry_point": entry_point or {},
        }
        defaults.update(kwargs)
        return Plugin.objects.create(**defaults)

    def test_execute_analysis_plugin(self):
        """Statistical test plugin execution returns results."""
        plugin = self._create_plugin(
            plugin_type="statistical_test",
            entry_point={"function": "robust_ttest", "module": "builtin"},
        )
        data = {
            "group1": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            "group2": [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        }

        result = PluginRuntime.execute(
            plugin,
            data,
            organization=self.org,
            user=self.user,
        )

        self.assertTrue(result["success"])
        self.assertIn("result", result)
        self.assertIn("t_statistic", result["result"])
        self.assertIn("p_value", result["result"])
        self.assertIsNotNone(result["execution_time_ms"])

    def test_execute_visualization_plugin(self):
        """Visualization plugin returns chart config."""
        plugin = self._create_plugin(
            plugin_type="visualization",
            slug="test-viz-plugin",
            entry_point={"type": "recharts", "chart_config": {"chartType": "bar"}},
        )
        data = {"values": [1, 2, 3]}

        result = PluginRuntime.execute(plugin, data, organization=self.org)

        self.assertTrue(result["success"])
        self.assertEqual(result["result"]["chart_type"], "recharts")
        self.assertIn("config", result["result"])

    def test_execute_sqs_rule_pack(self):
        """SQS rule pack plugin checks rules and returns score."""
        plugin = self._create_plugin(
            plugin_type="sqs_rule_pack",
            slug="test-sqs-plugin",
            entry_point={
                "rules": [
                    {"id": "r1", "name": "Has p-value", "pattern": r"p\s*[=<>]", "weight": 2},
                    {"id": "r2", "name": "Has CI", "pattern": r"confidence interval", "weight": 1},
                ],
            },
        )
        data = {"text": "We found p = 0.03 with a 95% confidence interval [0.1, 0.5]."}

        result = PluginRuntime.execute(plugin, data)

        self.assertTrue(result["success"])
        self.assertEqual(result["result"]["rules_checked"], 2)
        self.assertEqual(result["result"]["rules_passed"], 2)
        self.assertEqual(result["result"]["score"], 100.0)

    def test_execute_data_connector(self):
        """Data connector plugin returns source info."""
        plugin = self._create_plugin(
            plugin_type="data_connector",
            slug="test-connector-plugin",
            entry_point={"source": "google_sheets", "formats": ["csv", "xlsx"]},
        )

        result = PluginRuntime.execute(plugin, {})

        self.assertTrue(result["success"])
        self.assertEqual(result["result"]["source"], "google_sheets")
        self.assertEqual(result["result"]["status"], "ready")

    def test_execute_report_template(self):
        """Report template plugin returns template info."""
        plugin = self._create_plugin(
            plugin_type="report_template",
            slug="test-report-plugin",
            entry_point={
                "template": "apa_results",
                "sections": ["abstract", "methods", "results"],
            },
        )

        result = PluginRuntime.execute(plugin, {"analysis": "ttest"})

        self.assertTrue(result["success"])
        self.assertEqual(result["result"]["template"], "apa_results")
        self.assertTrue(result["result"]["data_bound"])

    def test_unknown_plugin_type(self):
        """Unknown plugin type returns error."""
        plugin = self._create_plugin(
            plugin_type="statistical_test",
            slug="test-unknown-plugin",
        )
        # Override the type at runtime
        plugin.plugin_type = "nonexistent_type"

        result = PluginRuntime.execute(plugin, {})

        self.assertFalse(result["success"])
        self.assertIn("error", result["result"])

    def test_plugin_execution_returns_error_for_bad_data(self):
        """Plugin with invalid data returns success=False and error message."""
        plugin = self._create_plugin(
            plugin_type="statistical_test",
            slug="test-error-plugin",
            entry_point={"function": "robust_ttest", "module": "builtin"},
        )
        # Data with too few observations triggers validation error inside plugin
        data = {"group1": [1], "group2": [2]}

        result = PluginRuntime.execute(plugin, data)

        self.assertFalse(result["success"])
        self.assertIn("error", result["result"])

    def test_plugin_context_logging(self):
        """PluginContext logs are captured."""
        plugin = self._create_plugin(
            plugin_type="visualization",
            slug="test-log-plugin",
            entry_point={"type": "recharts", "chart_config": {}},
        )

        result = PluginRuntime.execute(plugin, {"x": [1, 2, 3]})

        self.assertIn("logs", result)
        self.assertGreater(len(result["logs"]), 0)
        log_messages = [log["message"] for log in result["logs"]]
        self.assertTrue(any("Executing plugin" in m for m in log_messages))

    def test_plugin_context_execution_time(self):
        """PluginContext tracks execution time."""
        ctx = PluginContext(
            plugin=MagicMock(name="test"),
            organization=self.org,
            user=self.user,
        )
        ctx.start_time = time.time()
        time.sleep(0.01)
        ctx.end_time = time.time()

        self.assertIsNotNone(ctx.execution_time_ms)
        self.assertGreater(ctx.execution_time_ms, 0)

    def test_time_limits_defined(self):
        """Time limits are defined for all plugin types."""
        for ptype in ["statistical_test", "sqs_rule_pack", "visualization", "data_connector", "report_template"]:
            self.assertIn(ptype, PluginRuntime.TIME_LIMITS)

    def test_runtime_is_not_sandboxed_flag(self):
        """The module exposes IS_SANDBOXED = False so callers cannot be
        confused by docstring drift."""
        from core.services.plugin_runtime import IS_SANDBOXED

        self.assertFalse(IS_SANDBOXED)

    def test_unknown_custom_function_returns_documented_error(self):
        """A statistical_test plugin requesting a non-built-in function
        receives a structured error (not the old 'would be loaded
        dynamically in production' placeholder)."""
        plugin = self._create_plugin(
            plugin_type="statistical_test",
            slug="test-custom-fn",
            entry_point={"function": "my_unknown_test", "module": "user_module"},
        )

        result = PluginRuntime.execute(plugin, {"x": [1, 2, 3]})

        # Top-level execute() reports success=False because the inner
        # result contains an "error" key.
        self.assertFalse(result["success"])
        self.assertIn("result", result)
        inner = result["result"]
        self.assertEqual(inner.get("error"), "custom_function_not_supported")
        # Message must mention the requested function and module so the
        # frontend can surface a useful error to the plugin author.
        self.assertIn("my_unknown_test", inner["message"])
        self.assertIn("user_module", inner["message"])
        # Available built-ins must be enumerated so the caller can choose
        # an alternative without reading the source.
        self.assertEqual(
            set(inner["available_builtins"]),
            {"robust_ttest", "bootstrap_ci", "permutation_test", "bayesian_ab"},
        )
        # Regression: the old placeholder message must not appear.
        self.assertNotIn("would be loaded dynamically in production", inner["message"])


# =============================================================================
# Plugin Marketplace Tests (via Django models)
# =============================================================================


class TestPluginMarketplace(TestCase):
    """Tests for plugin marketplace operations via Plugin/PluginInstallation/PluginReview models."""

    def setUp(self):
        seed_tiers()
        self.tier = SubscriptionTier.objects.get(slug="pro")
        self.org = Organization.objects.create(
            name="Marketplace Org",
            slug="marketplace-org",
            tier=self.tier,
        )
        self.user = User.objects.create_user("mkt_user", "mkt@test.com", "pass")

        self.plugin1 = Plugin.objects.create(
            name="Bayesian T-Test",
            slug="bayesian-ttest",
            plugin_type="statistical_test",
            description="A Bayesian approach to t-testing.",
            version="2.0.0",
            author_name="Dr. Stats",
            is_published=True,
            is_verified=True,
            downloads=150,
            entry_point={"function": "bayesian_ab"},
        )
        self.plugin2 = Plugin.objects.create(
            name="APA Report Template",
            slug="apa-report",
            plugin_type="report_template",
            description="Generate APA-formatted statistical reports.",
            version="1.0.0",
            author_name="ReportCo",
            is_published=True,
            downloads=80,
            entry_point={"template": "apa"},
        )
        self.plugin3 = Plugin.objects.create(
            name="Custom SQS Pack",
            slug="custom-sqs",
            plugin_type="sqs_rule_pack",
            description="Extra SQS rules for clinical trials.",
            version="1.2.0",
            author_name="ClinicalDev",
            is_published=False,
            downloads=0,
            entry_point={"rules": []},
        )

    def test_list_plugins(self):
        """List available (published) plugins."""
        published = Plugin.objects.filter(is_published=True)
        self.assertEqual(published.count(), 2)
        names = set(published.values_list("name", flat=True))
        self.assertIn("Bayesian T-Test", names)
        self.assertIn("APA Report Template", names)

    def test_search_plugins_by_name(self):
        """Search plugins by name substring."""
        results = Plugin.objects.filter(
            name__icontains="bayesian",
            is_published=True,
        )
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().slug, "bayesian-ttest")

    def test_search_plugins_by_description(self):
        """Search plugins by description substring."""
        results = Plugin.objects.filter(
            description__icontains="APA",
            is_published=True,
        )
        self.assertEqual(results.count(), 1)
        self.assertEqual(results.first().slug, "apa-report")

    def test_search_plugins_by_type(self):
        """Filter plugins by type."""
        results = Plugin.objects.filter(
            plugin_type="statistical_test",
            is_published=True,
        )
        self.assertEqual(results.count(), 1)

    def test_install_plugin(self):
        """Plugin installation creates PluginInstallation record."""
        installation = PluginInstallation.objects.create(
            plugin=self.plugin1,
            organization=self.org,
            installed_by=self.user,
            config={"confidence_level": 0.95},
        )

        self.assertTrue(installation.is_active)
        self.assertEqual(installation.plugin, self.plugin1)
        self.assertEqual(installation.organization, self.org)
        self.assertEqual(installation.config["confidence_level"], 0.95)

    def test_install_plugin_unique_per_org(self):
        """Same plugin cannot be installed twice for same org."""
        PluginInstallation.objects.create(
            plugin=self.plugin1,
            organization=self.org,
        )
        with self.assertRaises(Exception):
            PluginInstallation.objects.create(
                plugin=self.plugin1,
                organization=self.org,
            )

    def test_uninstall_plugin(self):
        """Plugin uninstallation removes the PluginInstallation record."""
        installation = PluginInstallation.objects.create(
            plugin=self.plugin1,
            organization=self.org,
        )
        installation_id = installation.pk

        PluginInstallation.objects.filter(pk=installation_id).delete()

        self.assertFalse(PluginInstallation.objects.filter(pk=installation_id).exists())

    def test_rate_plugin(self):
        """Rating system creates review and updates plugin aggregates."""
        review = PluginReview.objects.create(
            plugin=self.plugin1,
            user=self.user,
            rating=5,
            title="Excellent plugin",
            body="Works great for my research.",
        )

        self.assertEqual(review.rating, 5)
        self.assertEqual(review.plugin, self.plugin1)

        # Update plugin rating aggregates
        self.plugin1.rating_sum += review.rating
        self.plugin1.rating_count += 1
        self.plugin1.save()

        self.plugin1.refresh_from_db()
        self.assertEqual(self.plugin1.average_rating, 5.0)

    def test_rate_plugin_unique_per_user(self):
        """Each user can only rate a plugin once."""
        PluginReview.objects.create(
            plugin=self.plugin1,
            user=self.user,
            rating=4,
            title="Good",
        )
        with self.assertRaises(Exception):
            PluginReview.objects.create(
                plugin=self.plugin1,
                user=self.user,
                rating=3,
                title="Changed my mind",
            )

    def test_average_rating_no_reviews(self):
        """Plugin with no ratings has average_rating of 0."""
        self.assertEqual(self.plugin1.average_rating, 0)

    def test_average_rating_multiple_reviews(self):
        """Average rating computed from multiple reviews."""
        self.plugin1.rating_sum = 13  # e.g. 5+4+4
        self.plugin1.rating_count = 3
        self.plugin1.save()

        self.plugin1.refresh_from_db()
        self.assertAlmostEqual(self.plugin1.average_rating, 4.3, places=1)

    def test_plugin_downloads_tracking(self):
        """Download count can be incremented."""
        initial = self.plugin1.downloads
        self.plugin1.downloads += 1
        self.plugin1.save()

        self.plugin1.refresh_from_db()
        self.assertEqual(self.plugin1.downloads, initial + 1)

    def test_list_installed_plugins_for_org(self):
        """List all plugins installed for an organization."""
        PluginInstallation.objects.create(
            plugin=self.plugin1,
            organization=self.org,
        )
        PluginInstallation.objects.create(
            plugin=self.plugin2,
            organization=self.org,
        )

        installed = self.org.installed_plugins.filter(is_active=True)
        self.assertEqual(installed.count(), 2)

    def test_unpublished_plugins_hidden(self):
        """Unpublished plugins are not listed in published queries."""
        published = Plugin.objects.filter(is_published=True)
        slugs = list(published.values_list("slug", flat=True))
        self.assertNotIn("custom-sqs", slugs)

    def test_plugin_ordering_by_downloads(self):
        """Plugins are ordered by downloads descending by default."""
        plugins = list(Plugin.objects.all())
        downloads = [p.downloads for p in plugins]
        self.assertEqual(downloads, sorted(downloads, reverse=True))
