"""
LMS Integration Views
=====================
LTI 1.3 endpoints for Canvas, Blackboard, and Moodle integration.
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

logger = logging.getLogger(__name__)


class LTIConfigView(APIView):
    """
    GET /api/v1/lti/config/
    Returns LTI 1.3 tool configuration JSON for LMS registration.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.lms_service import LTIConfiguration

        base_url = request.build_absolute_uri("/").rstrip("/")
        config = LTIConfiguration.get_tool_config(base_url)
        return Response(config)


class LTILoginView(APIView):
    """
    GET/POST /api/v1/lti/login/
    OIDC login initiation (step 1 of LTI 1.3 launch).
    """

    permission_classes = [AllowAny]

    def post(self, request):
        iss = request.data.get("iss", "")
        login_hint = request.data.get("login_hint", "")
        target_link_uri = request.data.get("target_link_uri", "")

        if not iss or not login_hint:
            return Response({"error": "Missing iss or login_hint"}, status=400)

        import uuid

        nonce = str(uuid.uuid4())
        state = str(uuid.uuid4())

        return Response(
            {
                "redirect_url": target_link_uri,
                "state": state,
                "nonce": nonce,
                "message": "OIDC login initiated — redirect to platform auth",
            }
        )

    def get(self, request):
        return self.post(request)


class LTILaunchView(APIView):
    """
    POST /api/v1/lti/launch/
    Main LTI 1.3 resource link launch (step 3).
    Validates JWT, extracts user/context, redirects to app.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        from core.services.lms_service import LTIService

        id_token = request.data.get("id_token", request.data)

        claims = LTIService.validate_launch_request(id_token, {})
        if claims is None:
            return Response(
                {
                    "error": "Invalid LTI launch request",
                    "hint": "Token validation failed or required claims missing",
                },
                status=400,
            )

        user_info = LTIService.extract_user_info(claims)
        context = LTIService.extract_context(claims)
        is_instructor = LTIService.is_instructor(user_info.get("roles", []))

        assignment_type = request.query_params.get("assignment_type", "")

        return Response(
            {
                "launch_valid": True,
                "user": user_info,
                "context": context,
                "is_instructor": is_instructor,
                "assignment_type": assignment_type,
                "redirect_to": "/smart-analysis" if not assignment_type else f"/lti/assignment/{assignment_type}",
                "available_features": [
                    "statistical_tests",
                    "guardian_protection",
                    "sqs_scoring",
                    "education_modules",
                    "data_profiling",
                    "autonomous_analysis",
                ],
            }
        )


class LTIDeepLinkView(APIView):
    """
    POST /api/v1/lti/deep-link/
    Deep linking response — instructor selects assignment type.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.lms_service import LTIService

        base_url = request.build_absolute_uri("/").rstrip("/")

        return Response(
            {
                "assignment_types": LTIService.ASSIGNMENT_TYPES,
                "deep_linking": LTIService.get_deep_linking_response(LTIService.ASSIGNMENT_TYPES, base_url),
            }
        )


class LTIGradePassbackView(APIView):
    """
    POST /api/v1/lti/grade/
    Submit a grade back to the LMS.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        if not request.user.is_authenticated:
            return Response({"error": "Authentication required"}, status=401)

        from core.services.lms_service import LTIService

        assignment_type = request.data.get("assignment_type")
        result_data = request.data.get("result_data", {})
        lti_user_id = request.data.get("lti_user_id", "")

        if not assignment_type or not lti_user_id:
            return Response({"error": "assignment_type and lti_user_id are required"}, status=400)

        score = LTIService.compute_assignment_score(assignment_type, result_data)

        grade_payload = LTIService.build_grade_passback(
            score=score,
            max_score=100,
            user_id=lti_user_id,
        )

        return Response(
            {
                "status": "grade_computed",
                "score": score,
                "max_score": 100,
                "grade_payload": grade_payload,
                "message": "Grade passback payload ready. In production, this would be sent to the LMS AGS endpoint.",
            }
        )


class LTIPlatformsView(APIView):
    """
    GET /api/v1/lti/platforms/
    List supported LMS platforms.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.lms_service import LMSPlatformRegistry

        return Response(
            {
                "platforms": LMSPlatformRegistry.list_platforms(),
                "lti_version": "1.3",
                "supported_messages": [
                    "LtiResourceLinkRequest",
                    "LtiDeepLinkingRequest",
                ],
                "supported_services": [
                    "Assignment and Grade Services (AGS)",
                    "Names and Role Provisioning Services (NRPS)",
                ],
            }
        )


class LTIJWKSView(APIView):
    """
    GET /api/v1/lti/jwks/
    Public JWKS endpoint for tool signature verification.

    Serves the tool's RSA public key in JWKS form so LMS platforms
    can verify our outgoing LTI service requests (e.g. AGS grade
    passback). The private key is loaded from the
    ``LTI_RSA_PRIVATE_KEY`` env var; in dev environments without the
    env var set, an ephemeral keypair is generated on first use and a
    warning is logged. See ``backend/core/services/lti_keys.py``.

    Previously returned a hardcoded ``"n": "placeholder_modulus"`` —
    fixed per docs/CRITICAL_REVIEW_2026-05-06.md §P0-2.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        from core.services.lti_keys import get_public_jwks

        return Response(get_public_jwks())
