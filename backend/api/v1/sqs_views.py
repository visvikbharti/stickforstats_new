"""
Statistical Quality Score (SQS) API Views

This module provides REST API endpoints for analyzing manuscripts
and generating Statistical Quality Score reports.

Endpoints:
- POST /api/v1/sqs/analyze/ - Analyze a PDF manuscript
- POST /api/v1/sqs/analyze-text/ - Analyze raw text
- GET /api/v1/sqs/report/{id}/ - Retrieve a report
- GET /api/v1/sqs/rules/ - List all detection rules
- GET /api/v1/sqs/fields/ - List available fields
"""

import re
import logging

from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny

# PDF text extraction
try:
    import PyPDF2

    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    import pdfplumber

    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False

from core.sqs_scoring import SQSReportGenerator, analyze_manuscript
from core.sqs_rules import ALL_RULES, CATEGORIES, FIELD_WEIGHTS, RULE_SUMMARY

logger = logging.getLogger(__name__)


def extract_text_from_pdf(pdf_file) -> str:
    """
    Extract text from a PDF file.

    Args:
        pdf_file: File-like object containing PDF data

    Returns:
        Extracted text as string
    """
    text = ""

    # Try pdfplumber first (better extraction)
    if PDFPLUMBER_AVAILABLE:
        try:
            pdf_file.seek(0)
            with pdfplumber.open(pdf_file) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
            if text.strip():
                return text
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {e}")

    # Fallback to PyPDF2
    if PDF_AVAILABLE:
        try:
            pdf_file.seek(0)
            reader = PyPDF2.PdfReader(pdf_file)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {e}")

    raise ValueError("No PDF extraction library available or extraction failed")


class SQSAnalyzeView(APIView):
    """
    Analyze a PDF manuscript for Statistical Quality Score.

    POST /api/v1/sqs/analyze/

    Request:
        - file: PDF file (multipart/form-data)
        - field: Research field (optional, default: 'general')

    Response:
        - Full SQS report as JSON
    """

    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [AllowAny]  # Allow public access for paper analysis

    def post(self, request):
        try:
            # Get uploaded file
            pdf_file = request.FILES.get("file")
            if not pdf_file:
                return Response(
                    {"error": "No file provided. Please upload a PDF file."}, status=status.HTTP_400_BAD_REQUEST
                )

            # Validate file type
            if not pdf_file.name.lower().endswith(".pdf"):
                return Response(
                    {"error": "Invalid file type. Please upload a PDF file."}, status=status.HTTP_400_BAD_REQUEST
                )

            # Get field parameter
            field = request.data.get("field", "general")
            if field not in FIELD_WEIGHTS:
                field = "general"

            # Extract text from PDF
            try:
                text = extract_text_from_pdf(pdf_file)
            except ValueError as e:
                return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            if not text or len(text.strip()) < 100:
                return Response(
                    {"error": "Could not extract sufficient text from PDF. The file may be image-based or corrupted."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Run SQS analysis
            report = analyze_manuscript(text, field=field)

            # Generate response
            response_data = report.to_dict()
            response_data["text_report"] = SQSReportGenerator.generate_text_report(report)
            response_data["journal_summary"] = SQSReportGenerator.generate_journal_summary(report)

            return Response(response_data)

        except Exception as e:
            logger.exception("Error analyzing manuscript")
            return Response({"error": f"Analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SQSAnalyzeTextView(APIView):
    """
    Analyze raw text for Statistical Quality Score.

    POST /api/v1/sqs/analyze-text/

    Request (JSON):
        - text: Manuscript text
        - field: Research field (optional)

    Response:
        - Full SQS report as JSON
    """

    parser_classes = [JSONParser]
    permission_classes = [AllowAny]  # Allow public access

    def post(self, request):
        try:
            # Get text from request
            text = request.data.get("text", "")
            if not text or len(text.strip()) < 100:
                return Response(
                    {"error": "Please provide manuscript text (minimum 100 characters)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get field parameter
            field = request.data.get("field", "general")
            if field not in FIELD_WEIGHTS:
                field = "general"

            # Run SQS analysis
            report = analyze_manuscript(text, field=field)

            # Generate response
            response_data = report.to_dict()
            response_data["text_report"] = SQSReportGenerator.generate_text_report(report)
            response_data["journal_summary"] = SQSReportGenerator.generate_journal_summary(report)

            return Response(response_data)

        except Exception as e:
            logger.exception("Error analyzing text")
            return Response({"error": f"Analysis failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SQSRulesView(APIView):
    """
    List all SQS detection rules.

    GET /api/v1/sqs/rules/

    Query Parameters:
        - category: Filter by category (optional)
        - severity: Filter by severity (optional)

    Response:
        - List of rules with metadata
    """

    permission_classes = [AllowAny]  # Public endpoint

    @method_decorator(cache_page(3600))  # Cache for 1 hour — rules are static
    def get(self, request):
        category = request.query_params.get("category")
        severity = request.query_params.get("severity")

        rules = ALL_RULES

        if category:
            rules = [r for r in rules if r["category"] == category]

        if severity:
            rules = [r for r in rules if r.get("severity") == severity]

        # Format rules for response (exclude regex patterns for security)
        formatted_rules = []
        for rule in rules:
            formatted_rules.append(
                {
                    "id": rule["id"],
                    "name": rule["name"],
                    "description": rule.get("description", ""),
                    "category": rule["category"],
                    "points": rule["points"],
                    "severity": rule["severity"],
                    "recommendation": rule["recommendation"],
                    "examples": rule.get("examples", []),
                }
            )

        return Response({"rules": formatted_rules, "total_rules": len(formatted_rules), "summary": RULE_SUMMARY})


class SQSFieldsView(APIView):
    """
    List available research fields and their weight configurations.

    GET /api/v1/sqs/fields/

    Response:
        - List of fields with weight configurations
    """

    permission_classes = [AllowAny]  # Public endpoint

    @method_decorator(cache_page(3600))  # Cache for 1 hour — fields are static
    def get(self, request):
        fields = []
        for field_name, weights in FIELD_WEIGHTS.items():
            fields.append(
                {
                    "id": field_name,
                    "name": field_name.title(),
                    "weights": weights,
                    "description": self._get_field_description(field_name),
                }
            )

        return Response({"fields": fields, "default_field": "general"})

    def _get_field_description(self, field: str) -> str:
        descriptions = {
            "psychology": "Psychology and behavioral sciences (APA/JARS-Quant emphasis)",
            "medicine": "Medical and clinical research (CONSORT/STROBE emphasis)",
            "biology": "Biological sciences (reproducibility emphasis)",
            "ecology": "Ecology and environmental sciences (assumption checking emphasis)",
            "economics": "Economics and econometrics (robustness emphasis)",
            "general": "General research (balanced weights)",
        }
        return descriptions.get(field, "Custom field configuration")


class SQSCategoriesView(APIView):
    """
    List SQS scoring categories.

    GET /api/v1/sqs/categories/

    Response:
        - List of categories with descriptions and max points
    """

    permission_classes = [AllowAny]  # Public endpoint

    @method_decorator(cache_page(3600))  # Cache for 1 hour — categories are static
    def get(self, request):
        categories = []
        for cat_id, cat_info in CATEGORIES.items():
            categories.append(
                {
                    "id": cat_id,
                    "name": cat_info["name"],
                    "max_points": cat_info["max_points"],
                    "description": cat_info["description"],
                }
            )

        return Response(
            {"categories": categories, "total_max_points": sum(c["max_points"] for c in CATEGORIES.values())}
        )


class SQSQuickCheckView(APIView):
    """
    Quick check for specific statistical elements.

    POST /api/v1/sqs/quick-check/

    Request (JSON):
        - text: Text to check
        - elements: List of elements to check (e.g., ['effect_size', 'power_analysis'])

    Response:
        - Quick check results for specified elements
    """

    parser_classes = [JSONParser]
    permission_classes = [AllowAny]  # Allow public access

    QUICK_CHECK_PATTERNS = {
        "effect_size": r"Cohen'?s?\s*d|η[²2]|Hedges'?\s*g|[Rr][²2]|(?:OR|odds\s*ratio)",
        "power_analysis": r"power\s+analysis|G\*?Power|a\s*priori\s+power",
        "sample_size": r"[Nn]\s*[=:]\s*\d+|\d+\s+participants",
        "exact_p_value": r"p\s*[=]\s*[01]?\.\d{2,}",
        "confidence_interval": r"(?:95%?\s*)?CI\s*[=:\[]",
        "normality_test": r"Shapiro|Kolmogorov|normality\s+(?:test|was)",
        "data_availability": r"data\s+(?:are|is)\s+available|OSF|Zenodo|GitHub",
    }

    def post(self, request):
        text = request.data.get("text", "")
        elements = request.data.get("elements", list(self.QUICK_CHECK_PATTERNS.keys()))

        if not text:
            return Response({"error": "No text provided"}, status=status.HTTP_400_BAD_REQUEST)

        results = {}
        for element in elements:
            if element in self.QUICK_CHECK_PATTERNS:
                pattern = self.QUICK_CHECK_PATTERNS[element]
                matches = re.findall(pattern, text, re.IGNORECASE)
                results[element] = {
                    "found": len(matches) > 0,
                    "count": len(matches),
                    "examples": matches[:3] if matches else [],
                }

        return Response({"results": results, "elements_checked": len(results)})


class SQSHealthView(APIView):
    """
    Health check for SQS service.

    GET /api/v1/sqs/health/
    """

    permission_classes = [AllowAny]  # Public endpoint

    def get(self, request):
        return Response(
            {
                "status": "healthy",
                "pdf_extraction": {"pdfplumber": PDFPLUMBER_AVAILABLE, "pypdf2": PDF_AVAILABLE},
                "rules_loaded": len(ALL_RULES),
                "categories": len(CATEGORIES),
                "fields_available": list(FIELD_WEIGHTS.keys()),
            }
        )
