"""
Site License Views
==================
REST endpoints for university/institutional site license management.
"""

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

logger = logging.getLogger(__name__)


class SiteLicenseTiersView(APIView):
    """
    GET /api/v1/licensing/tiers/
    List available institutional license tiers.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        from core.services.site_license_service import SiteLicenseService

        return Response(
            {
                "tiers": SiteLicenseService.get_tiers(),
                "verification_methods": ["email_domain", "ip_range", "saml_sso", "manual"],
            }
        )


class SiteLicenseCreateView(APIView):
    """
    POST /api/v1/licensing/create/
    Create a new institutional site license.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from core.services.site_license_service import SiteLicenseService

        required = ["institution_name", "tier", "admin_email", "domain"]
        missing = [f for f in required if not request.data.get(f)]
        if missing:
            return Response({"error": f'Missing fields: {", ".join(missing)}'}, status=400)

        result = SiteLicenseService.create_license(
            institution_name=request.data["institution_name"],
            tier_id=request.data["tier"],
            admin_email=request.data["admin_email"],
            domain=request.data["domain"],
            verification_method=request.data.get("verification_method", "email_domain"),
            duration_years=int(request.data.get("duration_years", 1)),
        )

        if "error" in result:
            return Response(result, status=400)
        return Response(result, status=201)


class SiteLicenseVerifyView(APIView):
    """
    POST /api/v1/licensing/verify/
    Verify if a user is eligible under an institutional license.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        email = request.data.get("email", "")
        license_key = request.data.get("license_key", "")

        if not email or not license_key:
            return Response({"error": "email and license_key are required"}, status=400)

        from core.services.site_license_service import SiteLicenseService

        validation = SiteLicenseService.validate_license_key(license_key)
        if not validation.get("valid"):
            return Response(validation, status=404)

        # For demo purposes, create a mock license_data
        eligibility = SiteLicenseService.verify_user_eligibility(
            email,
            {
                "domain": email.split("@")[-1] if "@" in email else "",
                "verification_method": "email_domain",
            },
        )

        return Response(eligibility)


class SiteLicenseUsageView(APIView):
    """
    GET /api/v1/licensing/usage/<license_key>/
    Get usage statistics for a site license.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, license_key):
        from core.services.site_license_service import SiteLicenseService

        validation = SiteLicenseService.validate_license_key(license_key)
        if not validation.get("valid"):
            return Response(validation, status=404)

        usage = SiteLicenseService.get_license_usage(license_key)
        return Response(usage)


class SiteLicenseReportView(APIView):
    """
    GET /api/v1/licensing/report/<license_key>/
    Generate a usage report for institutional administrators.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, license_key):
        from core.services.site_license_service import SiteLicenseService

        period = request.query_params.get("period", "monthly")
        report = SiteLicenseService.generate_usage_report(license_key, period)
        return Response(report)
