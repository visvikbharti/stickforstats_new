"""
Guardian API Views
==================
RESTful API endpoints for the Statistical Guardian system.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator
from django.http import HttpResponse
import numpy as np
from typing import Dict, Any
import traceback

from .guardian_core import (
    GuardianCore,
    GuardianInputError,
    GuardianReport,
    UnknownTestTypeError,
)
from .report_generator import GuardianReportGenerator
from .transformation_engine import TransformationEngine


class GuardianCheckView(APIView):
    """
    Main Guardian endpoint for checking statistical assumptions

    POST /api/guardian/check/
    """

    permission_classes = [AllowAny]  # Public endpoint - Guardian is freely accessible

    def post(self, request):
        """
        Check statistical assumptions for given data and test type

        Expected JSON payload:
        {
            "data": [...] or {"group1": [...], "group2": [...]},
            "test_type": "t_test" | "anova" | "pearson" | etc.,
            "alpha": 0.05 (optional)
        }
        """
        try:
            # Extract parameters
            data = request.data.get("data")
            test_type = request.data.get("test_type", "t_test")
            alpha = request.data.get("alpha", 0.05)
            observation_order = request.data.get("observation_order")
            # design distinguishes one-sample / paired / independent (t-test)
            # and between / repeated (ANOVA) so recommendations and the
            # normality check are design-correct.
            design = request.data.get("design")

            # Validate input
            if not data:
                return Response({"error": "Data is required"}, status=status.HTTP_400_BAD_REQUEST)

            if not isinstance(data, (list, dict)):
                return Response(
                    {"error": "Data must be a list or dictionary of lists"}, status=status.HTTP_400_BAD_REQUEST
                )

            # Initialize Guardian
            guardian = GuardianCore()

            # Perform check
            report = guardian.check(
                data, test_type, alpha,
                observation_order=observation_order,
                design=design,
            )

            # Convert report to JSON-serializable format
            response_data = self._serialize_report(report)

            return Response(response_data, status=status.HTTP_200_OK)

        except (GuardianInputError, UnknownTestTypeError) as e:
            # These two mean the REQUEST was unusable -- data no validator can
            # compute on, or a test_type Guardian does not know. That is a 400,
            # not a 500: a 500 tells the caller the server is broken and tells
            # the client developer nothing about what to change, and it puts
            # avoidable noise into error monitoring. Both messages are written
            # to be actionable, so they are passed through verbatim; the
            # unknown-test-type message enumerates the accepted values.
            return Response(
                {"error": str(e), "error_type": type(e).__name__},
                status=status.HTTP_400_BAD_REQUEST,
            )

        except Exception as e:
            print(f"Guardian error: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": f"Guardian check failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _serialize_report(self, report: GuardianReport) -> Dict[str, Any]:
        """Convert GuardianReport to JSON-serializable dictionary.

        The shared core comes from the canonical `GuardianReport.to_dict()`; this endpoint adds
        the three things only an interactive UI needs. Previously the whole shape was written
        out here, and it drifted from the other two surfaces every time a field was added.
        """
        return {
            **report.to_dict(),
            "data_summary": report.data_summary,
            "visual_evidence": report.visual_evidence,
            # Per-violation plots are heavy and only this surface renders them, so they are
            # re-attached here rather than carried in the canonical shape.
            "violations": [
                {**v, "visual_evidence": original.visual_evidence}
                for v, original in zip(report.to_dict()["violations"], report.violations)
            ],
            "guardian_status": self._get_status_message(report),
        }

    def _get_status_message(self, report: GuardianReport) -> Dict[str, str]:
        """Generate user-friendly status message"""
        # A refusal must be reported as a refusal. This is the most user-visible string in the
        # payload, and without this branch an unvalidated report falls into the `can_proceed`
        # arm below and reads "Minor violations detected but analysis can proceed with caution"
        # -- describing an assessment that never happened as a mild one that did.
        if not report.validated:
            return {
                "level": "warning",
                "message": ("ℹ️ Assumptions were NOT checked for this test — Guardian has no "
                            "validators for it. This is not a clean result; it is an absence "
                            "of evidence."),
                "emoji": "❔",
            }
        if report.can_proceed:
            if not report.violations:
                return {
                    "level": "success",
                    "message": "✅ All assumptions satisfied. Safe to proceed with analysis.",
                    "emoji": "🛡️",
                }
            else:
                return {
                    "level": "warning",
                    "message": "⚠️ Minor violations detected but analysis can proceed with caution.",
                    "emoji": "🔍",
                }
        else:
            return {
                "level": "danger",
                "message": "🚫 Critical assumption violations detected. Analysis results may be invalid.",
                "emoji": "⛔",
            }


class GuardianValidateNormalityView(APIView):
    """Dedicated endpoint for normality checking"""

    permission_classes = [AllowAny]  # ✅ FIXED: Allow public access like other Guardian endpoints

    def post(self, request):
        """
        Check normality for given data

        POST /api/guardian/validate/normality/
        """
        try:
            data = request.data.get("data", [])
            alpha = request.data.get("alpha", 0.05)

            if not data:
                return Response({"error": "Data is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Convert to numpy array
            arr = np.array(data)

            # Check normality
            from .guardian_core import NormalityValidator

            validator = NormalityValidator()
            result = validator.validate([arr], alpha)

            return Response({"is_normal": not result["violated"], "details": result}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GuardianDetectOutliersView(APIView):
    """Dedicated endpoint for outlier detection"""

    permission_classes = [AllowAny]  # ✅ FIXED: Allow public access like other Guardian endpoints

    def post(self, request):
        """
        Detect outliers in given data

        POST /api/guardian/detect/outliers/
        """
        try:
            data = request.data.get("data", [])

            if not data:
                return Response({"error": "Data is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Convert to numpy array
            arr = np.array(data)

            # Detect outliers
            from .guardian_core import OutlierDetector

            detector = OutlierDetector()
            result = detector.validate([arr])

            return Response({"has_outliers": result["violated"], "details": result}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GuardianTestRequirementsView(APIView):
    """Get requirements for a specific statistical test"""

    @method_decorator(cache_page(60 * 60))  # Cache for 1 hour
    def get(self, request, test_type=None):
        """
        Get assumption requirements for a test

        GET /api/guardian/requirements/{test_type}/
        """
        guardian = GuardianCore()

        if test_type:
            # Canonicalise first. Reading test_requirements directly made this
            # endpoint 404 for every alias that check() itself accepts -- so
            # `welch_t` or `students_t` would report "unknown test type" here
            # while running perfectly well through the check endpoint. The two
            # must agree on what a valid test_type is.
            try:
                canonical = guardian._canonical_test_type(test_type)
            except UnknownTestTypeError as e:
                return Response(
                    {"error": str(e), "error_type": type(e).__name__},
                    status=status.HTTP_404_NOT_FOUND,
                )

            requirements = guardian.test_requirements.get(canonical)
            if requirements is None:
                # A canonical contingency-table test: its assumptions are
                # evaluated by a dedicated path rather than the registry, so
                # report them rather than claiming the test is unknown.
                if canonical in guardian._CONTINGENCY_TESTS:
                    requirements = ["expected_frequencies", "independence"]
                else:
                    return Response(
                        {"error": f"Unknown test type: {test_type}"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

            return Response(
                {
                    "test_type": test_type,
                    "canonical_test_type": canonical,
                    "requirements": requirements,
                    "description": self._get_test_description(canonical),
                },
                status=status.HTTP_200_OK,
            )
        else:
            # Return all test requirements
            return Response(
                {
                    "available_tests": list(guardian.test_requirements.keys()),
                    "requirements": guardian.test_requirements,
                },
                status=status.HTTP_200_OK,
            )

    def _get_test_description(self, test_type: str) -> str:
        """Get human-readable description of test"""
        descriptions = {
            "t_test": "Compare means between two groups",
            "anova": "Compare means across multiple groups",
            "pearson": "Measure linear correlation between variables",
            "regression": "Model relationship between variables",
            "chi_square": "Test independence of categorical variables",
            "mann_whitney": "Non-parametric alternative to t-test",
            "kruskal_wallis": "Non-parametric alternative to ANOVA",
        }
        return descriptions.get(test_type, "Statistical test")


class GuardianHealthCheckView(APIView):
    """Health check endpoint for Guardian system"""

    permission_classes = [AllowAny]  # Allow public access to health check

    def get(self, request):
        """
        Check if Guardian system is operational

        GET /api/guardian/health/
        """
        try:
            # Test Guardian with sample data
            guardian = GuardianCore()
            test_data = [1, 2, 3, 4, 5]
            guardian.check(test_data, "t_test")

            return Response(
                {
                    "status": "operational",
                    "message": "Guardian system is protecting your statistics",
                    "golden_ratio": "1.618033988749895",
                    "validators_available": list(guardian.validators.keys()),
                    "tests_supported": list(guardian.test_requirements.keys()),
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response({"status": "error", "message": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)


class GuardianExportPDFView(APIView):
    """
    Export Guardian validation report as PDF

    POST /api/guardian/export/pdf/
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        Generate PDF validation report from Guardian check results

        Expected JSON payload:
        {
            "data": [...] or {"group1": [...], "group2": [...]},
            "test_type": "t_test" | "anova" | "pearson" | etc.,
            "alpha": 0.05 (optional)
        }

        Returns: PDF file as binary response
        """
        try:
            # Extract parameters
            data = request.data.get("data")
            test_type = request.data.get("test_type", "t_test")
            alpha = request.data.get("alpha", 0.05)
            observation_order = request.data.get("observation_order")
            design = request.data.get("design")

            # Validate input
            if not data:
                return Response({"error": "Data is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Initialize Guardian and perform check
            guardian = GuardianCore()
            report = guardian.check(
                data, test_type, alpha,
                observation_order=observation_order,
                design=design,
            )

            # Generate PDF report
            report_generator = GuardianReportGenerator()
            pdf_bytes = report_generator.generate_pdf(report)

            # Create HTTP response with PDF
            response = HttpResponse(pdf_bytes, content_type="application/pdf")
            response["Content-Disposition"] = f'attachment; filename="guardian_validation_report_{test_type}.pdf"'
            response["Content-Length"] = len(pdf_bytes)

            return response

        except Exception as e:
            print(f"PDF export error: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": f"PDF generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GuardianExportJSONView(APIView):
    """
    Export Guardian validation report as JSON

    POST /api/guardian/export/json/
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        Generate JSON validation report from Guardian check results

        Expected JSON payload:
        {
            "data": [...] or {"group1": [...], "group2": [...]},
            "test_type": "t_test" | "anova" | "pearson" | etc.,
            "alpha": 0.05 (optional)
        }

        Returns: JSON response with complete validation report
        """
        try:
            # Extract parameters
            data = request.data.get("data")
            test_type = request.data.get("test_type", "t_test")
            alpha = request.data.get("alpha", 0.05)
            observation_order = request.data.get("observation_order")
            design = request.data.get("design")

            # Validate input
            if not data:
                return Response({"error": "Data is required"}, status=status.HTTP_400_BAD_REQUEST)

            # Initialize Guardian and perform check
            guardian = GuardianCore()
            report = guardian.check(
                data, test_type, alpha,
                observation_order=observation_order,
                design=design,
            )

            # Generate JSON report
            report_generator = GuardianReportGenerator()
            json_report = report_generator.generate_json(report)

            return Response(json_report, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"JSON export error: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"JSON generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================================================
# TRANSFORMATION WIZARD ENDPOINTS
# ============================================================================


class TransformationSuggestView(APIView):
    """
    Suggest best transformation for data with assumption violations

    POST /api/guardian/transformation/suggest/
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        Analyze data and suggest transformation

        Expected JSON:
        {
            "data": [...],
            "violation_type": "normality"
        }

        Returns:
        {
            "recommended": "log",
            "alternatives": ["sqrt", "boxcox"],
            "reason": "...",
            "expected_improvement": 85.0,
            ...
        }
        """
        try:
            data = request.data.get("data")
            violation_type = request.data.get("violation_type", "normality")

            if not data:
                return Response({"error": "No data provided"}, status=status.HTTP_400_BAD_REQUEST)

            # Convert to numpy array
            data_array = np.array(data, dtype=float)

            # Get transformation suggestion
            engine = TransformationEngine()
            suggestion = engine.suggest_transformation(data_array, violation_type)

            return Response(suggestion, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Transformation suggestion error: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": f"Suggestion failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TransformationApplyView(APIView):
    """
    Apply transformation to data

    POST /api/guardian/transformation/apply/
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        Apply specified transformation

        Expected JSON:
        {
            "data": [...],
            "transformation": "log",
            "parameters": {"add_constant": 1.0}
        }

        Returns:
        {
            "transformed_data": [...],
            "transformation": "log",
            "parameters": {...},
            "inverse_formula": "exp(y) - 1",
            "success": true
        }
        """
        try:
            data = request.data.get("data")
            transformation = request.data.get("transformation")
            parameters = request.data.get("parameters", {})

            if not data or not transformation:
                return Response({"error": "Missing data or transformation type"}, status=status.HTTP_400_BAD_REQUEST)

            # Convert to numpy array
            data_array = np.array(data, dtype=float)

            # Apply transformation
            engine = TransformationEngine()
            result = engine.apply_transformation(data_array, transformation, **parameters)

            # Convert numpy array to list for JSON serialization
            if result["success"]:
                result["transformed_data"] = result["transformed_data"].tolist()

            return Response(result, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Transformation apply error: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": f"Transformation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TransformationValidateView(APIView):
    """
    Validate transformation effectiveness

    POST /api/guardian/transformation/validate/
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        Check if transformation improved normality

        Expected JSON:
        {
            "original_data": [...],
            "transformed_data": [...]
        }

        Returns:
        {
            "original_p_value": 0.001,
            "transformed_p_value": 0.15,
            "improvement": true,
            "improvement_score": 92.5,
            ...
        }
        """
        try:
            original_data = request.data.get("original_data")
            transformed_data = request.data.get("transformed_data")

            if not original_data or not transformed_data:
                return Response({"error": "Missing original or transformed data"}, status=status.HTTP_400_BAD_REQUEST)

            # Convert to numpy arrays
            original_array = np.array(original_data, dtype=float)
            transformed_array = np.array(transformed_data, dtype=float)

            # Validate transformation
            engine = TransformationEngine()
            validation = engine.validate_transformation(original_array, transformed_array)

            return Response(validation, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Transformation validation error: {str(e)}")
            print(traceback.format_exc())
            return Response({"error": f"Validation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class TransformationCodeExportView(APIView):
    """
    Export transformation code (Python or R)

    POST /api/guardian/transformation/export-code/
    """

    permission_classes = [AllowAny]

    def post(self, request):
        """
        Generate code for transformation

        Expected JSON:
        {
            "transformation": "log",
            "parameters": {"constant": 1.0},
            "language": "python"
        }

        Returns:
        {
            "code": "import numpy as np\n...",
            "language": "python"
        }
        """
        try:
            transformation = request.data.get("transformation")
            parameters = request.data.get("parameters", {})
            language = request.data.get("language", "python")

            if not transformation:
                return Response({"error": "No transformation specified"}, status=status.HTTP_400_BAD_REQUEST)

            # Generate code
            engine = TransformationEngine()
            code = engine.generate_code(transformation, parameters, language)

            return Response({"code": code, "language": language}, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"Code export error: {str(e)}")
            print(traceback.format_exc())
            return Response(
                {"error": f"Code generation failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
