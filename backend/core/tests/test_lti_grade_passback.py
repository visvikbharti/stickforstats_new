"""
LTI 1.3 grade-passback transport contracts.

Pre-2026-05-06 the grade-passback view built an AGS Score JSON
payload and returned it to the caller with the literal message
``"Grade passback payload ready. In production, this would be sent
to the LMS AGS endpoint."`` --- the LMS gradebook never received any
scores. See docs/CRITICAL_REVIEW_2026-05-06.md §P1-12 (LMS grade
passback).

These tests pin the new contracts: when the caller supplies AGS
endpoints (lineitem_url, token_url, client_id), the score is
actually POSTed to the LMS via the OAuth client-credentials JWT
grant; when those fields are absent, the legacy "build only" mode
is preserved so the React frontend can still preview payloads.
"""

from __future__ import annotations

import json
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from core.services.lms_service import LTIService

User = get_user_model()


def _make_user(username="lti_grade_user"):
    return User.objects.create_user(username, f"{username}@test", "pw")


# ---------------------------------------------------------------------------
# Service-level: client_credentials JWT + token fetch
# ---------------------------------------------------------------------------


class TestClientCredentialsJWT(TestCase):

    def test_jwt_has_three_parts_and_rs256_alg(self):
        jwt = LTIService._client_credentials_jwt(
            token_url="https://lms.example/token",
            client_id="client-abc",
        )
        parts = jwt.split(".")
        self.assertEqual(len(parts), 3)
        # Decode header to confirm alg
        import base64
        # Add padding
        header_b = parts[0] + "=" * ((4 - len(parts[0]) % 4) % 4)
        header = json.loads(base64.urlsafe_b64decode(header_b))
        self.assertEqual(header["alg"], "RS256")
        self.assertIn("kid", header)

    def test_jwt_claims_contain_iss_sub_aud_exp_jti(self):
        jwt = LTIService._client_credentials_jwt(
            token_url="https://lms.example/token",
            client_id="client-abc",
        )
        import base64
        payload_b = jwt.split(".")[1]
        payload_b += "=" * ((4 - len(payload_b) % 4) % 4)
        claims = json.loads(base64.urlsafe_b64decode(payload_b))
        self.assertEqual(claims["iss"], "client-abc")
        self.assertEqual(claims["sub"], "client-abc")
        self.assertEqual(claims["aud"], "https://lms.example/token")
        self.assertIn("exp", claims)
        self.assertIn("iat", claims)
        self.assertIn("jti", claims)


class TestFetchPlatformAccessToken(TestCase):

    @patch("core.services.lms_service.requests.post")
    def test_success_returns_access_token(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "access_token": "abc.def.ghi",
                "expires_in": 3600,
                "token_type": "Bearer",
                "scope": LTIService.AGS_SCORE_SCOPE,
            },
        )
        result = LTIService.fetch_platform_access_token(
            token_url="https://lms.example/token", client_id="c1"
        )
        self.assertTrue(result["ok"])
        self.assertEqual(result["access_token"], "abc.def.ghi")
        # Verify the POST body had the OAuth fields
        _, kwargs = mock_post.call_args
        data = kwargs["data"]
        self.assertEqual(data["grant_type"], "client_credentials")
        self.assertIn("client_assertion", data)
        self.assertEqual(
            data["client_assertion_type"],
            "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
        )

    @patch("core.services.lms_service.requests.post")
    def test_non_200_status_returns_error(self, mock_post):
        mock_post.return_value = MagicMock(status_code=401, text="invalid_client")
        result = LTIService.fetch_platform_access_token(
            "https://lms.example/token", "c1"
        )
        self.assertFalse(result["ok"])
        self.assertIn("token_endpoint_status_401", result["error"])

    @patch("core.services.lms_service.requests.post")
    def test_network_error_returns_error(self, mock_post):
        import requests
        mock_post.side_effect = requests.ConnectionError("dns lookup failed")
        result = LTIService.fetch_platform_access_token(
            "https://lms.example/token", "c1"
        )
        self.assertFalse(result["ok"])
        self.assertIn("token_endpoint_unreachable", result["error"])

    @patch("core.services.lms_service.requests.post")
    def test_missing_access_token_field_returns_error(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200, json=lambda: {"expires_in": 3600}
        )
        result = LTIService.fetch_platform_access_token(
            "https://lms.example/token", "c1"
        )
        self.assertFalse(result["ok"])

    @patch("core.services.lms_service.requests.post")
    def test_bad_json_returns_error(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=MagicMock(side_effect=ValueError("invalid json")),
        )
        result = LTIService.fetch_platform_access_token(
            "https://lms.example/token", "c1"
        )
        self.assertFalse(result["ok"])


class TestPostScoreToLMS(TestCase):

    @patch("core.services.lms_service.requests.post")
    def test_full_round_trip_success(self, mock_post):
        # First call: token endpoint returns access_token
        # Second call: lineitem endpoint returns 200
        mock_post.side_effect = [
            MagicMock(
                status_code=200,
                json=lambda: {"access_token": "tok", "expires_in": 3600},
            ),
            MagicMock(status_code=204, text=""),
        ]
        result = LTIService.post_score_to_lms(
            lineitem_url="https://lms.example/lineitem/123",
            token_url="https://lms.example/token",
            client_id="c1",
            score_payload={"userId": "u1", "scoreGiven": 80, "scoreMaximum": 100},
        )
        self.assertTrue(result["posted"])
        self.assertEqual(result["status_code"], 204)
        # Verify we hit the .../scores subpath with the AGS content type
        ags_call = mock_post.call_args_list[1]
        url_arg = ags_call.args[0]
        self.assertEqual(url_arg, "https://lms.example/lineitem/123/scores")
        headers = ags_call.kwargs["headers"]
        self.assertEqual(headers["Content-Type"], "application/vnd.ims.lis.v1.score+json")
        self.assertEqual(headers["Authorization"], "Bearer tok")

    @patch("core.services.lms_service.requests.post")
    def test_token_failure_skips_post(self, mock_post):
        mock_post.return_value = MagicMock(status_code=401, text="invalid")
        result = LTIService.post_score_to_lms(
            lineitem_url="https://lms.example/lineitem/123",
            token_url="https://lms.example/token",
            client_id="c1",
            score_payload={"userId": "u1", "scoreGiven": 80, "scoreMaximum": 100},
        )
        self.assertFalse(result["posted"])
        # Only ONE call (the failed token call); the lineitem post never fires
        self.assertEqual(mock_post.call_count, 1)

    @patch("core.services.lms_service.requests.post")
    def test_lineitem_4xx_reported_as_failure(self, mock_post):
        mock_post.side_effect = [
            MagicMock(status_code=200, json=lambda: {"access_token": "tok"}),
            MagicMock(status_code=403, text="forbidden"),
        ]
        result = LTIService.post_score_to_lms(
            lineitem_url="https://lms.example/lineitem/123",
            token_url="https://lms.example/token",
            client_id="c1",
            score_payload={"userId": "u1", "scoreGiven": 80, "scoreMaximum": 100},
        )
        self.assertFalse(result["posted"])
        self.assertEqual(result["status_code"], 403)
        self.assertIn("ags_post_status_403", result["error"])

    @patch("core.services.lms_service.requests.post")
    def test_lineitem_network_error_reported(self, mock_post):
        import requests
        mock_post.side_effect = [
            MagicMock(status_code=200, json=lambda: {"access_token": "tok"}),
            requests.ConnectionError("dns lookup failed"),
        ]
        result = LTIService.post_score_to_lms(
            lineitem_url="https://lms.example/lineitem/123",
            token_url="https://lms.example/token",
            client_id="c1",
            score_payload={"userId": "u1", "scoreGiven": 80, "scoreMaximum": 100},
        )
        self.assertFalse(result["posted"])
        self.assertIn("lineitem_unreachable", result["error"])


# ---------------------------------------------------------------------------
# View end-to-end
# ---------------------------------------------------------------------------


@override_settings(SECURE_SSL_REDIRECT=False)
class TestLTIGradePassbackView(TestCase):

    def setUp(self):
        self.user = _make_user()
        from rest_framework.test import APIClient
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_legacy_build_only_mode_when_endpoints_missing(self):
        """Without lineitem_url/token_url/client_id, the view returns
        the computed payload without posting (legacy preview mode)."""
        resp = self.client.post(
            "/api/v1/lti/grade/",
            {
                "assignment_type": "run_analysis",
                "lti_user_id": "lti-u-1",
                "result_data": {"test_executed": True, "guardian_passed": True},
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "grade_computed")
        self.assertIn("grade_payload", body)
        self.assertNotIn("lms_post", body)

    @patch("core.services.lms_service.requests.post")
    def test_full_post_to_lms_when_endpoints_supplied(self, mock_post):
        mock_post.side_effect = [
            MagicMock(status_code=200, json=lambda: {"access_token": "tok"}),
            MagicMock(status_code=204, text=""),
        ]
        resp = self.client.post(
            "/api/v1/lti/grade/",
            {
                "assignment_type": "run_analysis",
                "lti_user_id": "lti-u-1",
                "result_data": {"test_executed": True, "guardian_passed": True},
                "lineitem_url": "https://lms.example/lineitem/42",
                "token_url": "https://lms.example/token",
                "client_id": "tool-on-lms",
            },
            format="json",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "grade_posted")
        self.assertTrue(body["lms_post"]["posted"])

    def test_unauth_rejected(self):
        from rest_framework.test import APIClient
        anon = APIClient()  # unauthenticated
        resp = anon.post(
            "/api/v1/lti/grade/",
            {"assignment_type": "run_analysis", "lti_user_id": "u"},
            format="json",
        )
        self.assertEqual(resp.status_code, 401)

    def test_missing_required_fields_rejected(self):
        resp = self.client.post(
            "/api/v1/lti/grade/", {"assignment_type": "run_analysis"}, format="json"
        )
        self.assertEqual(resp.status_code, 400)


# ---------------------------------------------------------------------------
# SSRF guard on caller-supplied AGS endpoint URLs (audit 2026-05-31, SEC-1)
# ---------------------------------------------------------------------------


class TestAGSEndpointSSRFGuard(TestCase):
    """The grade-passback view accepts token_url/lineitem_url from the request
    body and the server POSTs to them. These must be validated so an
    authenticated caller cannot make the server reach internal hosts or the
    cloud metadata endpoint."""

    @patch("core.services.lms_service.requests.post")
    def test_token_url_to_metadata_endpoint_blocked(self, mock_post):
        result = LTIService.fetch_platform_access_token(
            token_url="https://169.254.169.254/latest/meta-data/", client_id="c1"
        )
        self.assertFalse(result["ok"])
        self.assertIn("unsafe_token_url", result["error"])
        mock_post.assert_not_called()  # never reached the network

    @patch("core.services.lms_service.requests.post")
    def test_loopback_token_url_blocked(self, mock_post):
        result = LTIService.fetch_platform_access_token(
            token_url="https://127.0.0.1/token", client_id="c1"
        )
        self.assertFalse(result["ok"])
        self.assertIn("unsafe_token_url", result["error"])
        mock_post.assert_not_called()

    @patch("core.services.lms_service.requests.post")
    def test_http_scheme_blocked(self, mock_post):
        result = LTIService.fetch_platform_access_token(
            token_url="http://lms.example/token", client_id="c1"
        )
        self.assertFalse(result["ok"])
        self.assertIn("unsafe_token_url", result["error"])
        mock_post.assert_not_called()

    @patch("core.services.lms_service.requests.post")
    def test_lineitem_private_ip_blocked_before_token_fetch(self, mock_post):
        result = LTIService.post_score_to_lms(
            lineitem_url="https://10.0.0.5/lineitem/1",
            token_url="https://lms.example/token",
            client_id="c1",
            score_payload={"userId": "u1", "scoreGiven": 80, "scoreMaximum": 100},
        )
        self.assertFalse(result["posted"])
        self.assertIn("unsafe_url", result["error"])
        mock_post.assert_not_called()

    @patch("core.services.lms_service.requests.post")
    def test_legitimate_public_url_allowed(self, mock_post):
        # lms.example does not resolve -> allowed through to the (mocked) transport
        mock_post.side_effect = [
            MagicMock(status_code=200, json=lambda: {"access_token": "tok"}),
            MagicMock(status_code=204, text=""),
        ]
        result = LTIService.post_score_to_lms(
            lineitem_url="https://lms.example/lineitem/9",
            token_url="https://lms.example/token",
            client_id="c1",
            score_payload={"userId": "u1", "scoreGiven": 80, "scoreMaximum": 100},
        )
        self.assertTrue(result["posted"])
        self.assertEqual(mock_post.call_count, 2)
