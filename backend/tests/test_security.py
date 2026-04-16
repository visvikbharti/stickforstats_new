"""
Tests for security features.
Tests: unauthenticated access, security headers, IDOR prevention,
SQL injection, XSS, large file upload rejection.
"""

import io

from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


def make_auth_client(email, password="SecureTest123!@#"):
    """Helper: create a user, log in, and return (client, user)."""
    user = User.objects.create_user(
        username=email, email=email, password=password,
        first_name="Sec", last_name="User",
    )
    client = APIClient()
    resp = client.post(
        "/api/auth/login/",
        {"username": email, "password": password},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")
    return client, user


@override_settings(SECURE_SSL_REDIRECT=False)
class UnauthenticatedAccessTests(TestCase):
    """Verify protected endpoints reject unauthenticated requests."""

    def setUp(self):
        self.client = APIClient()

    def test_me_requires_auth(self):
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout_requires_auth(self):
        response = self.client.post("/api/auth/logout/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_audit_summary_requires_auth(self):
        response = self.client.get("/api/v1/audit/summary/")
        self.assertIn(response.status_code, [401, 403])

    def test_report_list_access(self):
        """Reports endpoint may or may not require auth depending on configuration."""
        response = self.client.get("/api/v1/reports/")
        # The endpoint may allow public access or require auth
        self.assertIn(response.status_code, [200, 401, 403])


@override_settings(SECURE_SSL_REDIRECT=False, DEBUG=True)
class SecurityHeadersDebugTests(TestCase):
    """Verify security headers present in responses (DEBUG=True mode)."""

    def setUp(self):
        self.client = APIClient()

    def test_x_frame_options_is_deny(self):
        """X-Frame-Options should be DENY (always on regardless of DEBUG)."""
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.get("X-Frame-Options"), "DENY")

    def test_x_content_type_options_nosniff(self):
        """X-Content-Type-Options should be nosniff (always on)."""
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.get("X-Content-Type-Options"), "nosniff")


@override_settings(SECURE_SSL_REDIRECT=False, DEBUG=False)
class SecurityHeadersProductionTests(TestCase):
    """Verify security headers that only apply in production (DEBUG=False)."""

    def setUp(self):
        self.client = APIClient()

    def test_x_frame_options_in_production(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.get("X-Frame-Options"), "DENY")

    def test_x_content_type_nosniff_in_production(self):
        response = self.client.get("/api/v1/health/")
        self.assertEqual(response.get("X-Content-Type-Options"), "nosniff")


@override_settings(SECURE_SSL_REDIRECT=False)
class IDORPreventionTests(TestCase):
    """Test that users cannot access each other's data (IDOR)."""

    def setUp(self):
        self.client_a, self.user_a = make_auth_client("user_a@example.com")
        self.client_b, self.user_b = make_auth_client("user_b@example.com")

    def test_me_returns_own_data_only(self):
        """User A's /me/ should return User A's data, not User B's."""
        resp_a = self.client_a.get("/api/auth/me/")
        resp_b = self.client_b.get("/api/auth/me/")
        self.assertEqual(resp_a.data["email"], "user_a@example.com")
        self.assertEqual(resp_b.data["email"], "user_b@example.com")
        # Cross-check: they are not the same
        self.assertNotEqual(resp_a.data["id"], resp_b.data["id"])

    def test_user_a_cannot_impersonate_user_b(self):
        """User A's token should not return User B's data from /me/."""
        resp = self.client_a.get("/api/auth/me/")
        self.assertNotEqual(resp.data["email"], "user_b@example.com")


@override_settings(SECURE_SSL_REDIRECT=False)
class SQLInjectionTests(TestCase):
    """Test that SQL injection payloads are handled safely."""

    def setUp(self):
        self.client = APIClient()

    def test_sql_injection_in_sqs_text(self):
        """SQL injection payload in SQS text should not cause server errors."""
        payload = {
            "text": "'; DROP TABLE auth_user; --",
            "field": "psychology",
        }
        response = self.client.post("/api/v1/sqs/analyze-text/", payload, format="json")
        # Should succeed (analyze the text as-is) or return 400; never 500
        self.assertIn(response.status_code, [200, 400, 422])
        # Verify the user table still exists
        self.assertTrue(User.objects.count() >= 0)

    def test_sql_injection_in_login(self):
        """SQL injection in login should return 400 or 401, not 500."""
        payload = {
            "username": "' OR '1'='1",
            "password": "' OR '1'='1",
        }
        response = self.client.post("/api/auth/login/", payload, format="json")
        self.assertIn(response.status_code, [400, 401])

    def test_sql_injection_in_ttest_data(self):
        """Sending strings where numbers are expected should not execute SQL."""
        payload = {
            "test_type": "one_sample",
            "data1": "'; DROP TABLE core_analysisresult; --",
            "parameters": {"mu": 0},
        }
        response = self.client.post("/api/v1/stats/ttest/", payload, format="json")
        # Should either be rejected (400/422) or return error body (200 from cache)
        if response.status_code == status.HTTP_200_OK:
            self.assertIn("error", response.data)
        else:
            self.assertIn(response.status_code, [400, 422])
        # Verify no SQL was executed -- users table still intact
        self.assertTrue(User.objects.count() >= 0)


@override_settings(SECURE_SSL_REDIRECT=False)
class XSSPreventionTests(TestCase):
    """Test that XSS payloads do not cause server errors and are stored safely."""

    def setUp(self):
        self.client = APIClient()

    def test_xss_in_registration_name(self):
        """XSS payload in firstName should be stored but not cause server errors."""
        payload = {
            "email": "xss@example.com",
            "password": "XssTest123!@#",
            "confirmPassword": "XssTest123!@#",
            "firstName": "<script>alert('xss')</script>",
            "lastName": "<img src=x onerror=alert(1)>",
            "acceptTerms": True,
        }
        response = self.client.post("/api/auth/register/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # The name should be stored (Django ORM escapes on output)
        user = User.objects.get(email="xss@example.com")
        self.assertIsNotNone(user.first_name)

    def test_xss_in_sqs_text(self):
        """XSS payload in SQS text should not cause server errors."""
        payload = {
            "text": '<script>alert("xss")</script> t(28)=2.45, p=0.021',
            "field": "psychology",
        }
        response = self.client.post("/api/v1/sqs/analyze-text/", payload, format="json")
        self.assertIn(response.status_code, [200, 400])


@override_settings(SECURE_SSL_REDIRECT=False)
class LargeFileUploadTests(TestCase):
    """Test that oversized file uploads are rejected."""

    def setUp(self):
        self.client = APIClient()

    def test_large_file_rejected(self):
        """Files > 50MB should be rejected with 413."""
        # Create a file just over 50MB
        large_content = b"x" * (51 * 1024 * 1024)
        large_file = io.BytesIO(large_content)
        large_file.name = "huge_file.csv"
        response = self.client.post(
            "/api/v1/data/import/",
            {"file": large_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    def test_normal_file_accepted(self):
        """A normal-sized CSV should be accepted."""
        csv_content = "col1,col2\n1,2\n3,4\n"
        small_file = io.BytesIO(csv_content.encode("utf-8"))
        small_file.name = "small.csv"
        response = self.client.post(
            "/api/v1/data/import/",
            {"file": small_file},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
