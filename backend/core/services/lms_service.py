"""
LMS Integration Service
========================
LTI 1.3 integration for Canvas, Blackboard, and Moodle.
Handles launch requests, grade passback, and deep linking.
"""

import ipaddress
import logging
import socket
import time
from datetime import datetime
from typing import Any, Dict
from urllib.parse import urlparse

import requests  # module-level so unittest.mock.patch can locate it

logger = logging.getLogger(__name__)


class LMSSecurityError(Exception):
    """Raised when an LMS endpoint URL fails SSRF validation."""


def assert_safe_outbound_url(url: str, field: str = "url") -> None:
    """Validate a caller-supplied LMS endpoint URL before the server fetches it.

    Grade-passback accepts ``token_url`` / ``lineitem_url`` from the request body
    (the AGS endpoints from a verified LTI launch), and the server then POSTs a
    tool-signed assertion to them. Without validation that is a server-side
    request forgery (SSRF) vector — an authenticated caller could point the
    server at internal services or the cloud metadata endpoint
    (audit 2026-05-31, SEC-1 / lms grade SSRF).

    Policy:
      - scheme MUST be https;
      - the host must not resolve to a private, loopback, link-local, reserved,
        or multicast address (blocks 127.0.0.0/8, 10/8, 192.168/16, 172.16/12,
        169.254.0.0/16 incl. 169.254.169.254 cloud metadata, etc.);
      - a host that does not resolve is allowed through (it is not a reachable
        SSRF target, and DNS-less unit tests using reserved domains like
        ``*.example`` must still exercise the mocked transport).

    Raises ``LMSSecurityError`` on a disallowed URL.
    """
    parsed = urlparse(url or "")
    if parsed.scheme != "https":
        raise LMSSecurityError(f"{field} must use https (got {parsed.scheme or 'no scheme'})")
    host = parsed.hostname
    if not host:
        raise LMSSecurityError(f"{field} has no host")

    try:
        addrinfos = socket.getaddrinfo(host, parsed.port or 443, proto=socket.IPPROTO_TCP)
    except socket.gaierror:
        # Host does not resolve -> not a reachable internal target. Allow.
        return

    for info in addrinfos:
        ip = ipaddress.ip_address(info[4][0])
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_reserved
            or ip.is_multicast
            or ip.is_unspecified
        ):
            raise LMSSecurityError(f"{field} resolves to a non-public address ({ip})")


class LTIConfiguration:
    """LTI 1.3 tool configuration for registration with LMS platforms."""

    TOOL_NAME = "StickForStats"
    TOOL_DESCRIPTION = "Statistical Analysis Platform with Guardian Protection"

    @classmethod
    def get_tool_config(cls, base_url):
        """Generate LTI 1.3 tool configuration JSON for LMS registration."""
        return {
            "title": cls.TOOL_NAME,
            "description": cls.TOOL_DESCRIPTION,
            "oidc_initiation_url": f"{base_url}/api/v1/lti/login/",
            "target_link_uri": f"{base_url}/api/v1/lti/launch/",
            "scopes": [
                "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
                "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
                "https://purl.imsglobal.org/spec/lti-ags/scope/score",
                "https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly",
            ],
            "extensions": [
                {
                    "platform": "canvas.instructure.com",
                    "settings": {
                        "placements": [
                            {
                                "placement": "course_navigation",
                                "message_type": "LtiResourceLinkRequest",
                                "target_link_uri": f"{base_url}/api/v1/lti/launch/",
                                "text": "StickForStats",
                                "icon_url": f"{base_url}/static/icons/sfs-lti-icon.png",
                            },
                            {
                                "placement": "assignment_selection",
                                "message_type": "LtiDeepLinkingRequest",
                                "target_link_uri": f"{base_url}/api/v1/lti/deep-link/",
                                "text": "StickForStats Assignment",
                            },
                        ]
                    },
                }
            ],
            "public_jwk_url": f"{base_url}/api/v1/lti/jwks/",
            "custom_fields": {
                "canvas_course_id": "$Canvas.course.id",
                "canvas_user_id": "$Canvas.user.id",
                "canvas_assignment_id": "$Canvas.assignment.id",
            },
        }


class LTIService:
    """
    Handles LTI 1.3 protocol operations.
    """

    # Assignment types that StickForStats supports
    ASSIGNMENT_TYPES = [
        {
            "id": "run_analysis",
            "name": "Run a Statistical Analysis",
            "description": "Student must upload data and run a specified statistical test",
            "grading": "auto",
            "max_score": 100,
        },
        {
            "id": "guardian_check",
            "name": "Guardian Assumption Validation",
            "description": "Student must check assumptions before running a test",
            "grading": "auto",
            "max_score": 100,
        },
        {
            "id": "sqs_manuscript",
            "name": "Manuscript Quality Check",
            "description": "Student submits a paper for SQS scoring",
            "grading": "auto",
            "max_score": 100,
        },
        {
            "id": "complete_lesson",
            "name": "Complete Education Module",
            "description": "Student must complete an interactive statistics lesson",
            "grading": "completion",
            "max_score": 100,
        },
        {
            "id": "data_profiling",
            "name": "Data Profiling Exercise",
            "description": "Student uploads data and reviews the automated profile",
            "grading": "auto",
            "max_score": 100,
        },
    ]

    @classmethod
    def validate_launch_request(cls, id_token, platform_config):
        """Validate an LTI 1.3 launch request via full JWT signature
        verification against the platform's published JWKS, and reject
        nonce-replay attempts.

        Parameters
        ----------
        id_token
            The LTI launch ``id_token`` (compact-serialized JWT). For
            backward compatibility this method also accepts an already-
            decoded claims dict --- but in that mode it ONLY checks the
            structural claim presence, not the signature; this should
            be used only by tests and is rejected at runtime if the
            ``LTI_REQUIRE_JWT_SIGNATURE`` setting (default True) is on.
        platform_config
            Dict describing the LTI platform. Must include:
              - ``jwks_url``   : platform's JWKS endpoint
              - ``client_id``  : tool's audience for this platform
              - ``issuer``     : platform's iss value (or omit for any)

        Returns
        -------
        dict or None
            Verified claims on success; None on any verification or
            replay-detection failure.

        Notes
        -----
        Earlier implementation accepted an already-decoded claims dict
        with NO signature check --- so any caller who could POST a JSON
        blob with valid claim names was treated as a launched LTI user.
        Fixed here per docs/CRITICAL_REVIEW_2026-05-06.md §P0-2.
        """
        from django.conf import settings

        require_jwt = getattr(settings, "LTI_REQUIRE_JWT_SIGNATURE", True)
        platform_config = platform_config or {}

        # Backward-compat: a dict was passed in (legacy callers + tests).
        # If we require signatures (default), reject this path.
        if isinstance(id_token, dict):
            if require_jwt:
                logger.warning(
                    "LTI launch: pre-decoded claims dict rejected — set "
                    "LTI_REQUIRE_JWT_SIGNATURE=False to re-enable for tests"
                )
                return None
            return cls._validate_claims_structure(id_token)

        if not isinstance(id_token, str) or not id_token:
            logger.warning("LTI launch: id_token must be a non-empty JWT string")
            return None

        from jose import jwt as jose_jwt
        from jose.exceptions import (
            ExpiredSignatureError,
            JWSError,
            JWTClaimsError,
            JWTError,
        )

        from core.services.jwks_cache import (
            JWKSError,
            find_signing_key,
            get_jwks,
            invalidate_cache,
        )

        jwks_url = platform_config.get("jwks_url")
        if not jwks_url:
            logger.error("LTI launch: platform_config missing jwks_url")
            return None

        try:
            header = jose_jwt.get_unverified_header(id_token)
        except JWTError as exc:
            logger.warning("LTI launch: invalid JWT header: %s", exc)
            return None

        kid = header.get("kid")
        alg = header.get("alg") or "RS256"
        if alg.lower().startswith(("hs", "none")):
            logger.warning("LTI launch: unsupported alg %s; rejecting", alg)
            return None

        try:
            jwks = get_jwks(jwks_url)
            signing_key = find_signing_key(jwks, kid)
            if signing_key is None:
                invalidate_cache(jwks_url)
                jwks = get_jwks(jwks_url, force_refresh=True)
                signing_key = find_signing_key(jwks, kid)
        except JWKSError as exc:
            logger.error("LTI launch: JWKS lookup failed: %s", exc)
            return None

        if signing_key is None:
            logger.warning(
                "LTI launch: kid=%r not found in JWKS at %s", kid, jwks_url
            )
            return None

        expected_audience = platform_config.get("client_id")
        expected_issuer = platform_config.get("issuer")
        try:
            claims = jose_jwt.decode(
                id_token,
                signing_key,
                algorithms=[alg],
                audience=expected_audience,
                issuer=expected_issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_iat": True,
                    "verify_aud": expected_audience is not None,
                    "verify_iss": expected_issuer is not None,
                },
            )
        except ExpiredSignatureError:
            logger.warning("LTI launch: token expired")
            return None
        except JWTClaimsError as exc:
            logger.warning("LTI launch: claim validation failed: %s", exc)
            return None
        except (JWSError, JWTError) as exc:
            logger.warning("LTI launch: signature verification failed: %s", exc)
            return None

        # Required LTI structural claims.
        structural = cls._validate_claims_structure(claims)
        if structural is None:
            return None

        # Replay protection: refuse to accept the same (issuer, nonce)
        # pair twice within the JWT exp window.
        if not cls._record_nonce(claims):
            return None

        return claims

    @staticmethod
    def _validate_claims_structure(claims):
        """Check the LTI 1.3 required-claim set is present (and that
        ``exp`` hasn't passed). Used by both the JWT and dict paths."""
        required_claims = [
            "iss",
            "sub",
            "aud",
            "exp",
            "iat",
            "nonce",
            "https://purl.imsglobal.org/spec/lti/claim/message_type",
            "https://purl.imsglobal.org/spec/lti/claim/version",
            "https://purl.imsglobal.org/spec/lti/claim/resource_link",
        ]
        if not isinstance(claims, dict):
            return None
        missing = [c for c in required_claims if c not in claims]
        if missing:
            logger.warning(f"LTI launch missing claims: {missing}")
            return None
        if time.time() > claims.get("exp", 0):
            logger.warning("LTI launch token expired (structural check)")
            return None
        return claims

    @staticmethod
    def _record_nonce(claims):
        """Record (issuer, nonce) so the same JWT cannot be replayed.

        Returns True if the nonce was novel (proceed), False if it has
        already been seen (reject).
        """
        issuer = claims.get("iss") or ""
        nonce = claims.get("nonce") or ""
        exp = claims.get("exp") or 0
        if not issuer or not nonce or not exp:
            # Already caught by _validate_claims_structure; defensive.
            return False
        from datetime import datetime, timezone

        from django.db import IntegrityError

        from core.models import LTINonceUsed

        expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
        try:
            LTINonceUsed.objects.create(
                issuer=issuer, nonce=nonce, expires_at=expires_at
            )
        except IntegrityError:
            logger.warning(
                "LTI launch: nonce replay detected for issuer=%s nonce=%s",
                issuer[:60], nonce[:32],
            )
            return False
        return True

    @classmethod
    def extract_user_info(cls, claims):
        """Extract user info from LTI claims."""
        return {
            "lti_user_id": claims.get("sub"),
            "email": claims.get("email", ""),
            "name": claims.get("name", ""),
            "given_name": claims.get("given_name", ""),
            "family_name": claims.get("family_name", ""),
            "picture": claims.get("picture", ""),
            "roles": claims.get("https://purl.imsglobal.org/spec/lti/claim/roles", []),
            "platform": claims.get("iss", ""),
        }

    @classmethod
    def extract_context(cls, claims):
        """Extract course context from LTI claims."""
        context = claims.get("https://purl.imsglobal.org/spec/lti/claim/context", {})
        resource = claims.get("https://purl.imsglobal.org/spec/lti/claim/resource_link", {})
        custom = claims.get("https://purl.imsglobal.org/spec/lti/claim/custom", {})
        return {
            "course_id": context.get("id", ""),
            "course_title": context.get("title", ""),
            "course_label": context.get("label", ""),
            "resource_link_id": resource.get("id", ""),
            "resource_title": resource.get("title", ""),
            "canvas_course_id": custom.get("canvas_course_id", ""),
            "canvas_user_id": custom.get("canvas_user_id", ""),
            "canvas_assignment_id": custom.get("canvas_assignment_id", ""),
        }

    @classmethod
    def is_instructor(cls, roles):
        """Check if user has instructor role."""
        instructor_roles = [
            "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
            "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Instructor",
            "http://purl.imsglobal.org/vocab/lis/v2/membership#ContentDeveloper",
        ]
        return any(r in roles for r in instructor_roles)

    @classmethod
    def build_grade_passback(
        cls, score, max_score, user_id, activity_progress="Completed", grading_progress="FullyGraded"
    ):
        """Build an LTI AGS (Assignment and Grade Services) score payload."""
        return {
            "userId": user_id,
            "scoreGiven": score,
            "scoreMaximum": max_score,
            "activityProgress": activity_progress,
            "gradingProgress": grading_progress,
            "timestamp": datetime.utcnow().isoformat() + "Z",
        }

    # ---- LMS AGS grade-passback transport ------------------------------

    AGS_SCORE_SCOPE = "https://purl.imsglobal.org/spec/lti-ags/scope/score"

    @classmethod
    def _client_credentials_jwt(cls, token_url: str, client_id: str) -> str:
        """Build the client-credentials JWT used to obtain an LMS
        access token.

        LTI 1.3 platforms accept ``client_assertion_type=...:jwt-bearer``
        flow: the tool signs a short-lived JWT with its private key
        (the same key the platform fetches from our /api/v1/lti/jwks/
        endpoint) and posts it to the platform's token endpoint to
        receive an access_token.
        """
        import time as _time
        import uuid as _uuid

        from jose import jwt as jose_jwt

        from core.services.lti_keys import get_keypair, get_private_pem

        _, _, kid = get_keypair()
        pem = get_private_pem()
        now = int(_time.time())
        claims = {
            "iss": client_id,
            "sub": client_id,
            "aud": token_url,
            "iat": now,
            "exp": now + 300,  # 5-minute window
            "jti": str(_uuid.uuid4()),
        }
        return jose_jwt.encode(
            claims, pem.decode("utf-8") if isinstance(pem, bytes) else pem,
            algorithm="RS256", headers={"kid": kid},
        )

    @classmethod
    def fetch_platform_access_token(
        cls,
        token_url: str,
        client_id: str,
        scope: str = AGS_SCORE_SCOPE,
        timeout: float = 10.0,
    ) -> Dict[str, Any]:
        """Exchange a client-credentials JWT for an LMS access token.

        Returns ``{"ok": True, "access_token": "...", "expires_in": ...}``
        on success, or ``{"ok": False, "error": "..."}`` on failure.
        """
        try:
            assert_safe_outbound_url(token_url, field="token_url")
        except LMSSecurityError as exc:
            logger.warning("Blocked unsafe token_url: %s", exc)
            return {"ok": False, "error": f"unsafe_token_url: {exc}"}

        try:
            assertion = cls._client_credentials_jwt(token_url, client_id)
        except Exception as exc:
            logger.exception("Failed to build client-credentials JWT")
            return {"ok": False, "error": f"client_assertion_build_failed: {exc}"}

        try:
            resp = requests.post(
                token_url,
                data={
                    "grant_type": "client_credentials",
                    "client_assertion_type": "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
                    "client_assertion": assertion,
                    "scope": scope,
                },
                timeout=timeout,
            )
        except requests.RequestException as exc:
            logger.warning("LMS token endpoint unreachable: %s", exc)
            return {"ok": False, "error": f"token_endpoint_unreachable: {exc}"}

        if resp.status_code != 200:
            return {
                "ok": False,
                "error": f"token_endpoint_status_{resp.status_code}",
                "body": resp.text[:512],
            }
        try:
            data = resp.json()
        except ValueError as exc:
            return {"ok": False, "error": f"token_endpoint_bad_json: {exc}"}
        if "access_token" not in data:
            return {"ok": False, "error": "token_endpoint_missing_access_token", "body": data}
        return {
            "ok": True,
            "access_token": data["access_token"],
            "expires_in": data.get("expires_in"),
            "token_type": data.get("token_type", "Bearer"),
            "scope": data.get("scope"),
        }

    @classmethod
    def post_score_to_lms(
        cls,
        lineitem_url: str,
        token_url: str,
        client_id: str,
        score_payload: Dict[str, Any],
        timeout: float = 10.0,
    ) -> Dict[str, Any]:
        """POST an AGS Score payload to the LMS lineitem URL.

        End-to-end: fetch a fresh access token via client-credentials,
        then POST the JSON to ``{lineitem_url}/scores`` with the
        AGS-specified content type.

        Replaces the previous behaviour where the view built the
        payload but never sent it (LMS gradebooks therefore never
        received scores). See docs/CRITICAL_REVIEW_2026-05-06.md
        §P1-12 (LMS grade passback).
        """
        # SSRF guard: both the token endpoint and the lineitem endpoint are
        # caller-supplied and are fetched server-side (audit 2026-05-31).
        try:
            assert_safe_outbound_url(token_url, field="token_url")
            assert_safe_outbound_url(lineitem_url, field="lineitem_url")
        except LMSSecurityError as exc:
            logger.warning("Blocked unsafe AGS URL: %s", exc)
            return {"posted": False, "error": f"unsafe_url: {exc}"}

        token_resp = cls.fetch_platform_access_token(token_url, client_id)
        if not token_resp.get("ok"):
            return {"posted": False, **token_resp}

        access_token = token_resp["access_token"]
        # AGS spec: scores are POSTed to {lineitem_url}/scores with
        # the application/vnd.ims.lis.v1.score+json content type.
        url = lineitem_url.rstrip("/") + "/scores"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/vnd.ims.lis.v1.score+json",
            "Accept": "application/json",
        }
        try:
            resp = requests.post(url, json=score_payload, headers=headers, timeout=timeout)
        except requests.RequestException as exc:
            logger.warning("AGS lineitem unreachable: %s", exc)
            return {"posted": False, "error": f"lineitem_unreachable: {exc}"}

        if 200 <= resp.status_code < 300:
            return {
                "posted": True,
                "status_code": resp.status_code,
                "lineitem_url": lineitem_url,
            }
        return {
            "posted": False,
            "status_code": resp.status_code,
            "error": f"ags_post_status_{resp.status_code}",
            "body": resp.text[:512] if hasattr(resp, "text") else "",
        }

    @classmethod
    def compute_assignment_score(cls, assignment_type, result_data):
        """
        Compute a score for an LMS assignment based on analysis results.
        """
        if assignment_type == "run_analysis":
            # Score based on: correct test selection + Guardian compliance
            score = 0
            if result_data.get("test_executed"):
                score += 40
            if result_data.get("guardian_passed"):
                score += 30
            if result_data.get("effect_size_reported"):
                score += 15
            if result_data.get("assumptions_checked"):
                score += 15
            return min(100, score)

        elif assignment_type == "guardian_check":
            # Score based on assumption checks performed
            checks = result_data.get("checks_performed", 0)
            total = result_data.get("total_required", 1)
            return min(100, int((checks / max(total, 1)) * 100))

        elif assignment_type == "sqs_manuscript":
            # Score is the SQS score directly
            return min(100, max(0, result_data.get("sqs_score", 0)))

        elif assignment_type == "complete_lesson":
            # Completion-based scoring
            return 100 if result_data.get("completed") else 0

        elif assignment_type == "data_profiling":
            score = 0
            if result_data.get("data_uploaded"):
                score += 30
            if result_data.get("profile_reviewed"):
                score += 30
            if result_data.get("variables_identified"):
                score += 20
            if result_data.get("distribution_checked"):
                score += 20
            return min(100, score)

        return 0

    @classmethod
    def get_deep_linking_response(cls, assignments, base_url):
        """
        Build deep linking response with available assignment types.
        """
        items = []
        for a in assignments:
            items.append(
                {
                    "type": "ltiResourceLink",
                    "title": a["name"],
                    "text": a["description"],
                    "url": f"{base_url}/api/v1/lti/launch/?assignment_type={a['id']}",
                    "lineItem": {
                        "scoreMaximum": a["max_score"],
                        "label": a["name"],
                    },
                }
            )
        return {"content_items": items}


class LMSPlatformRegistry:
    """
    Registry of supported LMS platforms and their configurations.
    """

    PLATFORMS = {
        "canvas": {
            "name": "Canvas by Instructure",
            "auth_url": "https://{domain}/api/lti/authorize_redirect",
            "token_url": "https://{domain}/login/oauth2/token",
            "jwks_url": "https://{domain}/api/lti/security/jwks",
            "deployment_id_required": True,
        },
        "blackboard": {
            "name": "Blackboard Learn",
            "auth_url": "https://{domain}/learn/api/public/v1/oauth2/authorizationcode",
            "token_url": "https://{domain}/learn/api/public/v1/oauth2/token",
            "jwks_url": "https://{domain}/learn/api/public/v1/lti/jwks",
            "deployment_id_required": True,
        },
        "moodle": {
            "name": "Moodle",
            "auth_url": "https://{domain}/mod/lti/auth.php",
            "token_url": "https://{domain}/mod/lti/token.php",
            "jwks_url": "https://{domain}/mod/lti/certs.php",
            "deployment_id_required": False,
        },
    }

    @classmethod
    def get_platform_config(cls, platform_type, domain):
        """Get platform-specific URLs with domain substituted."""
        template = cls.PLATFORMS.get(platform_type)
        if not template:
            return None
        config = {}
        for key, val in template.items():
            if isinstance(val, str) and "{domain}" in val:
                config[key] = val.format(domain=domain)
            else:
                config[key] = val
        return config

    @classmethod
    def list_platforms(cls):
        """List all supported LMS platforms."""
        return [{"id": pid, "name": p["name"]} for pid, p in cls.PLATFORMS.items()]
