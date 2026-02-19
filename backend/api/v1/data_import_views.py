"""
Universal Data Import — API Views
==================================
REST API endpoint for importing data files in all major statistical formats.

Endpoints:
- POST /api/v1/data/universal-import/   — Upload and import a data file
- GET  /api/v1/data/supported-formats/  — List supported file formats

Supported formats: CSV, Excel (.xlsx/.xls), SPSS (.sav), SAS (.sas7bdat),
                   Stata (.dta), JSON

Author: StickForStats Development Team
Created: February 2026
Version: 1.0.0
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser
import logging

from core.services.data_import_service import DataImportService, SUPPORTED_FORMATS

logger = logging.getLogger(__name__)

# Maximum upload size: 100 MB
MAX_UPLOAD_SIZE_BYTES = 100 * 1024 * 1024  # 104,857,600 bytes

# Number of preview rows returned in the response
PREVIEW_ROWS = 100


class UniversalDataImportView(APIView):
    """
    POST /api/v1/data/universal-import/

    Upload a data file for import. Supports CSV, Excel, SPSS, SAS, Stata, and JSON.

    Request:
        Content-Type: multipart/form-data
        Body:
            file (required): The data file to import.
            file_type (optional): Explicit format override
                                  ('csv', 'excel', 'spss', 'sas', 'stata', 'json').
                                  If omitted, format is auto-detected from extension.
            encoding (optional): Character encoding for CSV/JSON files. Default: 'utf-8'.
            preview_rows (optional): Number of data rows to include in the response.
                                     Default: 100. Max: 1000.

    Response (200):
        {
            "success": true,
            "data": [ ... ],           // First N rows as list of dicts
            "columns": [               // Column metadata
                {
                    "name": "age",
                    "dtype": "integer",
                    "n_unique": 45,
                    "n_missing": 2,
                    "sample_values": [25, 30, 35, 40, 45]
                }, ...
            ],
            "n_rows": 500,
            "n_cols": 12,
            "n_preview_rows": 100,
            "variable_metadata": {     // From SPSS/SAS/Stata files
                "variable_labels": {"age": "Age of participant"},
                "value_labels": {"gender": {"1": "Male", "2": "Female"}},
                "missing_ranges": {}
            },
            "file_info": {
                "format": "spss",
                "original_name": "survey_data.sav",
                "size_bytes": 245760,
                "encoding": null
            },
            "warnings": []
        }

    Error responses:
        400: Missing file, unsupported format, or file too large
        422: File could not be parsed
        500: Unexpected server error
    """
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        """Handle multipart file upload and import."""
        # --- Validate file presence ---
        if 'file' not in request.FILES:
            return Response(
                {
                    'success': False,
                    'error': 'No file provided.',
                    'detail': (
                        'Send a multipart/form-data request with a "file" field. '
                        'Supported formats: ' +
                        ', '.join(sorted(SUPPORTED_FORMATS.keys()))
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uploaded_file = request.FILES['file']

        # --- Validate file size ---
        file_size = uploaded_file.size
        if file_size > MAX_UPLOAD_SIZE_BYTES:
            max_mb = MAX_UPLOAD_SIZE_BYTES / (1024 * 1024)
            actual_mb = file_size / (1024 * 1024)
            return Response(
                {
                    'success': False,
                    'error': f'File too large ({actual_mb:.1f} MB). Maximum allowed: {max_mb:.0f} MB.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Validate file extension ---
        import os
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        explicit_type = request.data.get('file_type', None)

        if explicit_type is None and ext not in SUPPORTED_FORMATS:
            return Response(
                {
                    'success': False,
                    'error': f"Unsupported file extension '{ext}'.",
                    'supported_formats': list(sorted(SUPPORTED_FORMATS.keys())),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Parse optional parameters ---
        encoding = request.data.get('encoding', 'utf-8')
        try:
            preview_rows = int(request.data.get('preview_rows', PREVIEW_ROWS))
            preview_rows = max(1, min(preview_rows, 1000))
        except (ValueError, TypeError):
            preview_rows = PREVIEW_ROWS

        # --- Run import ---
        service = DataImportService()
        try:
            result = service.import_file(
                file_obj=uploaded_file,
                file_type=explicit_type,
                encoding=encoding,
            )
        except Exception as e:
            logger.exception("Unexpected error during data import: %s", str(e))
            return Response(
                {
                    'success': False,
                    'error': 'An unexpected error occurred during file import.',
                    'detail': str(e),
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # --- Handle import failure ---
        if not result.success:
            return Response(
                {
                    'success': False,
                    'errors': result.errors,
                    'warnings': result.warnings,
                    'file_info': result.file_info,
                },
                status=status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        # --- Return success response ---
        response_data = result.to_dict(preview_rows=preview_rows)
        return Response(response_data, status=status.HTTP_200_OK)


class SupportedFormatsView(APIView):
    """
    GET /api/v1/data/supported-formats/

    Returns a list of supported data file formats with their descriptions
    and required Python packages.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        """Return supported formats."""
        formats = DataImportService.get_supported_formats()

        # Check which optional packages are actually installed
        for fmt in formats:
            fmt['installed'] = _check_package_installed(fmt['requires'])

        return Response({
            'formats': formats,
            'max_upload_size_bytes': MAX_UPLOAD_SIZE_BYTES,
            'max_upload_size_mb': MAX_UPLOAD_SIZE_BYTES / (1024 * 1024),
        })


def _check_package_installed(requires: str) -> bool:
    """Check whether a required package is installed."""
    if 'built-in' in requires:
        return True
    package_name = requires.strip()
    try:
        __import__(package_name)
        return True
    except ImportError:
        return False
