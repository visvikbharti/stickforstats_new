"""
LMS Integration Service
========================
LTI 1.3 integration for Canvas, Blackboard, and Moodle.
Handles launch requests, grade passback, and deep linking.
"""

import logging
import time
from datetime import datetime

logger = logging.getLogger(__name__)


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
    def validate_launch_request(cls, request_data, platform_config):
        """
        Validate an LTI 1.3 launch request.
        Returns decoded claims if valid, None otherwise.
        """
        required_claims = [
            "iss",  # Issuer (LMS platform)
            "sub",  # Subject (user ID)
            "aud",  # Audience (our client_id)
            "exp",  # Expiration
            "iat",  # Issued at
            "nonce",  # Replay prevention
            "https://purl.imsglobal.org/spec/lti/claim/message_type",
            "https://purl.imsglobal.org/spec/lti/claim/version",
            "https://purl.imsglobal.org/spec/lti/claim/resource_link",
        ]

        # In production, this would verify JWT signature against platform's JWKS
        # For now, extract and validate structure
        claims = request_data if isinstance(request_data, dict) else {}

        missing = [c for c in required_claims if c not in claims]
        if missing:
            logger.warning(f"LTI launch missing claims: {missing}")
            return None

        # Check expiration
        exp = claims.get("exp", 0)
        if time.time() > exp:
            logger.warning("LTI launch token expired")
            return None

        return claims

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
        """
        Build an LTI AGS (Assignment and Grade Services) score payload.
        """
        return {
            "userId": user_id,
            "scoreGiven": score,
            "scoreMaximum": max_score,
            "activityProgress": activity_progress,
            "gradingProgress": grading_progress,
            "timestamp": datetime.utcnow().isoformat() + "Z",
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
