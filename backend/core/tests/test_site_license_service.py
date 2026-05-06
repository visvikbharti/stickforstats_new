"""
DB-backed site-license service contracts.

Pre-2026-05-06 the service:
  * minted a license key in ``create_license`` and logged it but
    never persisted to the DB
  * accepted any string starting with ``SFS-INST-`` as ``valid: True``
    in ``validate_license_key``
  * returned all-zero counters from ``get_license_usage`` and
    ``generate_usage_report`` regardless of what activity had occurred

These tests pin the new contracts (DB-backed SiteLicense +
SiteLicenseUsageRecord). See docs/CRITICAL_REVIEW_2026-05-06.md
§P1-12 and WORK_PLAN P3.10-P3.14.
"""

from __future__ import annotations

from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from django.utils import timezone

from core.models import SiteLicense
from core.services.site_license_service import SiteLicenseService

User = get_user_model()


def _make_user(username="lic_user"):
    return User.objects.create_user(username, f"{username}@test", "pw")


class TestTiers(TestCase):

    def test_tiers_listed(self):
        tiers = SiteLicenseService.get_tiers()
        ids = {t["id"] for t in tiers}
        self.assertEqual(ids, {"department", "school", "university"})


class TestCreateAndValidate(TestCase):

    def test_create_persists_to_db(self):
        result = SiteLicenseService.create_license(
            institution_name="Test University",
            tier_id="department",
            admin_email="admin@testu.edu",
            domain="testu.edu",
        )
        self.assertIn("license_key", result)
        self.assertTrue(result["license_key"].startswith("SFS-INST-"))
        self.assertEqual(
            SiteLicense.objects.filter(license_key=result["license_key"]).count(), 1
        )

    def test_create_unknown_tier_rejected(self):
        result = SiteLicenseService.create_license(
            institution_name="Test U",
            tier_id="phantom",
            admin_email="x@y.z",
            domain="y.z",
        )
        self.assertIn("error", result)

    def test_unique_keys_across_creates(self):
        a = SiteLicenseService.create_license("U1", "department", "a@u1.edu", "u1.edu")
        b = SiteLicenseService.create_license("U2", "department", "a@u2.edu", "u2.edu")
        self.assertNotEqual(a["license_key"], b["license_key"])

    def test_real_key_validates(self):
        result = SiteLicenseService.create_license(
            "Test U", "department", "admin@testu.edu", "testu.edu"
        )
        val = SiteLicenseService.validate_license_key(result["license_key"])
        self.assertTrue(val["valid"])
        self.assertEqual(val["license"]["institution_name"], "Test U")

    def test_phantom_sfs_inst_prefix_no_longer_validates(self):
        """Old bug: any SFS-INST- prefix returned valid=True."""
        val = SiteLicenseService.validate_license_key("SFS-INST-PHANTOM12345678")
        self.assertFalse(val["valid"])

    def test_random_string_rejected(self):
        self.assertFalse(SiteLicenseService.validate_license_key("not-a-key")["valid"])
        self.assertFalse(SiteLicenseService.validate_license_key("")["valid"])
        self.assertFalse(SiteLicenseService.validate_license_key(None)["valid"])

    def test_expired_license_rejected(self):
        result = SiteLicenseService.create_license(
            "Test U", "department", "admin@testu.edu", "testu.edu"
        )
        license_obj = SiteLicense.objects.get(license_key=result["license_key"])
        license_obj.end_date = timezone.now() - timedelta(days=1)
        license_obj.save(update_fields=["end_date"])
        val = SiteLicenseService.validate_license_key(result["license_key"])
        self.assertFalse(val["valid"])
        self.assertIn("expired", val["error"].lower())

    def test_suspended_license_rejected(self):
        result = SiteLicenseService.create_license(
            "Test U", "department", "admin@testu.edu", "testu.edu"
        )
        license_obj = SiteLicense.objects.get(license_key=result["license_key"])
        license_obj.status = "suspended"
        license_obj.save(update_fields=["status"])
        val = SiteLicenseService.validate_license_key(result["license_key"])
        self.assertFalse(val["valid"])


class TestEligibility(TestCase):

    def setUp(self):
        result = SiteLicenseService.create_license(
            "Big U", "school", "admin@big.edu", "big.edu"
        )
        self.license_data = SiteLicenseService.validate_license_key(
            result["license_key"]
        )["license"]

    def test_matching_domain_eligible(self):
        out = SiteLicenseService.verify_user_eligibility(
            "alice@big.edu", self.license_data
        )
        self.assertTrue(out["eligible"])

    def test_subdomain_eligible(self):
        out = SiteLicenseService.verify_user_eligibility(
            "bob@cs.big.edu", self.license_data
        )
        self.assertTrue(out["eligible"])

    def test_wrong_domain_rejected(self):
        out = SiteLicenseService.verify_user_eligibility(
            "alice@other.edu", self.license_data
        )
        self.assertFalse(out["eligible"])

    def test_invalid_email_rejected(self):
        out = SiteLicenseService.verify_user_eligibility(
            "no-at-sign", self.license_data
        )
        self.assertFalse(out["eligible"])

    def test_lookup_for_email_finds_active_license(self):
        found = SiteLicenseService.lookup_license_for_email("c@big.edu")
        self.assertIsNotNone(found)
        self.assertEqual(found["domain"], "big.edu")

    def test_lookup_for_email_returns_none_for_unknown(self):
        self.assertIsNone(SiteLicenseService.lookup_license_for_email("c@nowhere.org"))

    def test_lookup_for_email_skips_expired(self):
        # Expire the only license
        license_obj = SiteLicense.objects.first()
        license_obj.end_date = timezone.now() - timedelta(days=1)
        license_obj.save(update_fields=["end_date"])
        self.assertIsNone(SiteLicenseService.lookup_license_for_email("a@big.edu"))


class TestUsageAggregation(TestCase):

    def setUp(self):
        result = SiteLicenseService.create_license(
            "Big U", "school", "admin@big.edu", "big.edu"
        )
        self.license_key = result["license_key"]
        self.license_obj = SiteLicense.objects.get(license_key=self.license_key)

    def _record(self, email, feature, analysis_type=""):
        return SiteLicenseService.record_usage(
            self.license_key, email, feature, analysis_type
        )

    def test_empty_usage_returns_zeros(self):
        usage = SiteLicenseService.get_license_usage(self.license_key)
        self.assertEqual(usage["active_users"], 0)
        self.assertEqual(usage["total_analyses_this_month"], 0)
        self.assertEqual(usage["top_tests_used"], [])

    def test_distinct_users_counted(self):
        self._record("a@big.edu", "analysis", "ttest")
        self._record("a@big.edu", "analysis", "ttest")  # same user, counted once
        self._record("b@big.edu", "analysis", "anova")
        usage = SiteLicenseService.get_license_usage(self.license_key)
        self.assertEqual(usage["active_users"], 2)
        self.assertEqual(usage["total_analyses_this_month"], 3)

    def test_top_tests_aggregated(self):
        for _ in range(5):
            self._record("u@big.edu", "analysis", "ttest")
        for _ in range(3):
            self._record("u@big.edu", "analysis", "anova")
        usage = SiteLicenseService.get_license_usage(self.license_key)
        top = {t["analysis_type"]: t["count"] for t in usage["top_tests_used"]}
        self.assertEqual(top.get("ttest"), 5)
        self.assertEqual(top.get("anova"), 3)

    def test_departments_inferred_from_subdomain(self):
        self._record("alice@cs.big.edu", "analysis", "ttest")
        self._record("bob@math.big.edu", "analysis", "anova")
        self._record("carol@big.edu", "analysis", "anova")  # no department
        usage = SiteLicenseService.get_license_usage(self.license_key)
        self.assertEqual(set(usage["departments_active"]), {"cs", "math"})

    def test_unknown_license_key_yields_error(self):
        usage = SiteLicenseService.get_license_usage("SFS-INST-PHANTOMKEY1234")
        self.assertIn("error", usage)


class TestUsageReport(TestCase):

    def setUp(self):
        result = SiteLicenseService.create_license(
            "Big U", "school", "admin@big.edu", "big.edu"
        )
        self.license_key = result["license_key"]

    def test_empty_report_zero_counts(self):
        report = SiteLicenseService.generate_usage_report(self.license_key)
        self.assertEqual(report["report"]["total_analyses"], 0)
        self.assertEqual(report["report"]["active_users"], 0)
        self.assertEqual(report["report"]["analyses_by_test_type"], {})

    def test_report_aggregates_features(self):
        SiteLicenseService.record_usage(
            self.license_key, "a@big.edu", "analysis", "ttest"
        )
        SiteLicenseService.record_usage(
            self.license_key, "b@big.edu", "manuscript_review", ""
        )
        SiteLicenseService.record_usage(
            self.license_key, "a@big.edu", "guardian_block", ""
        )
        SiteLicenseService.record_usage(
            self.license_key, "a@big.edu", "certification_pass", ""
        )
        report = SiteLicenseService.generate_usage_report(self.license_key)
        r = report["report"]
        self.assertEqual(r["total_analyses"], 4)
        self.assertEqual(r["manuscripts_analyzed"], 1)
        self.assertEqual(r["guardian_violations_prevented"], 1)
        self.assertEqual(r["certifications_earned"], 1)

    def test_unknown_period_falls_back_monthly(self):
        report = SiteLicenseService.generate_usage_report(self.license_key, period="phantom")
        self.assertIn("window_start", report)


@override_settings(SECURE_SSL_REDIRECT=False)
class TestSiteLicenseViewsEndToEnd(TestCase):

    def setUp(self):
        self.user = _make_user("view_user")
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_tiers_endpoint(self):
        resp = self.client.get("/api/v1/licensing/tiers/")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(len(body["tiers"]), 3)

    def test_create_then_verify_round_trip(self):
        # 1. Create
        resp = self.client.post(
            "/api/v1/licensing/create/",
            {
                "institution_name": "Test U",
                "tier": "school",
                "admin_email": "admin@testu.edu",
                "domain": "testu.edu",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        license_key = resp.json()["license_key"]

        # 2. Verify eligibility — matching domain
        resp = self.client.post(
            "/api/v1/licensing/verify/",
            {"email": "alice@testu.edu", "license_key": license_key},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.json()["eligible"])

        # 3. Verify eligibility — mismatching domain
        resp = self.client.post(
            "/api/v1/licensing/verify/",
            {"email": "bob@other.edu", "license_key": license_key},
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(resp.json()["eligible"])

    def test_unknown_license_returns_404(self):
        resp = self.client.post(
            "/api/v1/licensing/verify/",
            {"email": "a@x.edu", "license_key": "SFS-INST-PHANTOMKEY1234"},
            format="json",
        )
        self.assertEqual(resp.status_code, 404)

    def test_usage_endpoint_returns_real_zeros_for_new_license(self):
        # Create license
        resp = self.client.post(
            "/api/v1/licensing/create/",
            {
                "institution_name": "Test U",
                "tier": "department",
                "admin_email": "a@testu.edu",
                "domain": "testu.edu",
            },
            format="json",
        )
        license_key = resp.json()["license_key"]
        # Get usage (will be all zeros, but for a real license)
        resp = self.client.get(f"/api/v1/licensing/usage/{license_key}/")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["license_key"], license_key)
        self.assertEqual(body["active_users"], 0)

    def test_usage_endpoint_unknown_key_404(self):
        resp = self.client.get("/api/v1/licensing/usage/SFS-INST-PHANTOMKEY1234/")
        self.assertEqual(resp.status_code, 404)
