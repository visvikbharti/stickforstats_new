"""
Manuscript Verification API — raw-data re-analysis surface (T24-SURFACE).
=========================================================================

Endpoints:
- POST /api/v1/verify/analyze/             — verify claims against the authors' raw data
- GET  /api/v1/verify/report/<run_id>/     — retrieve a stored verification run (token-gated)

This is the "raw-data verification" surface from the 2026-06-15 lab steer: re-run each
extracted statistical claim through the Guardian/cascade engine on the authors' data and
return a per-claim verdict (VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED / ASSUMPTION_UNREPORTED
/ INSUFFICIENT_DATA / UNVERIFIABLE_EXTRACTION). It is DISTINCT from ``/manuscript/analyze``,
which remains the always-available, no-raw-data internal-consistency (statcheck-style) fallback.

Privacy / no-egress: this endpoint verifies only data the caller uploads. It does NOT fetch
external repository accessions (no network egress). Automatic accession fetch (GEO/Zenodo/...)
is a separate, opt-in follow-on built on ``core/manuscript/data_fetcher.py``.

Created: 2026-06-25 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md
"""

import hashlib
import io
import logging
import time
import zipfile

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from core.manuscript.parser import ManuscriptParser
from core.manuscript.verification_service import run_verification
from ._upload_utils import file_too_large_error, manuscript_file_type

try:
    from core.models import VerificationRun

    MODELS_AVAILABLE = True
except ImportError:
    MODELS_AVAILABLE = False

logger = logging.getLogger(__name__)

# Bounds for the uploaded data table. The upload-size cap (file_too_large_error) only bounds the
# COMPRESSED bytes; these bound what is actually materialized in the request thread, so a crafted
# small file cannot OOM the worker (e.g. an .xlsx is a zip — a ~MB workbook can inflate to GBs).
_MAX_DATA_ROWS = 1_000_000
_MAX_DATA_COLS = 10_000
_MAX_XLSX_UNCOMPRESSED = 200 * 1024 * 1024  # reject workbooks that decompress past 200 MB (zip-bomb guard)


def _load_dataframe(uploaded):
    """Read an uploaded tabular data file into a *bounded* pandas DataFrame (csv/tsv/txt/xlsx).

    Raises ValueError on a malformed/oversized table (surfaced as a 400 by the caller).
    """
    import pandas as pd  # lazy (pandas)

    name = (uploaded.name or "").lower()
    uploaded.seek(0)
    raw = uploaded.read()

    if name.endswith((".xlsx", ".xls")):
        if name.endswith(".xlsx"):
            # decompression-bomb guard: bound the uncompressed size BEFORE openpyxl materializes it
            try:
                with zipfile.ZipFile(io.BytesIO(raw)) as zf:
                    total = sum(zi.file_size for zi in zf.infolist())
            except zipfile.BadZipFile as exc:
                raise ValueError("Not a valid .xlsx workbook.") from exc
            if total > _MAX_XLSX_UNCOMPRESSED:
                raise ValueError(
                    f"Spreadsheet decompresses to {total // (1024 * 1024)} MB, exceeding the "
                    f"{_MAX_XLSX_UNCOMPRESSED // (1024 * 1024)} MB limit."
                )
        df = pd.read_excel(io.BytesIO(raw), nrows=_MAX_DATA_ROWS)
    else:
        sep = "\t" if name.endswith((".tsv", ".tab")) else None  # None -> sniff delimiter (python engine)
        df = pd.read_csv(io.BytesIO(raw), sep=sep, engine="python", nrows=_MAX_DATA_ROWS)

    if df.shape[1] > _MAX_DATA_COLS:
        raise ValueError(f"Too many columns ({df.shape[1]}); the limit is {_MAX_DATA_COLS}.")
    return df


class VerifyAnalyzeView(APIView):
    """POST /api/v1/verify/analyze/

    Body (multipart/form-data, or JSON for the text-only case):
        - file:  manuscript (PDF / LaTeX / DOCX / TXT)   OR   text: raw manuscript text
        - data:  (optional) a tabular data file (CSV / TSV / XLSX) to link claims against
        - alpha: (optional) significance level (default 0.05)
        - title: (optional) used when posting raw text

    Returns: a paper-level VerificationProfile (verdict distribution, verifiability rate,
    coverage, certify note) + per-claim verdicts, plus a run id and one-time retrieval token.
    """

    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request):
        t0 = time.time()

        # ---- 1. resolve the manuscript text ----
        manuscript_text = ""
        title = ""
        file_name = ""
        file_hash = ""

        uploaded = request.FILES.get("file")
        if uploaded is not None:
            err = file_too_large_error(uploaded)
            if err:
                return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)
            file_type = manuscript_file_type(uploaded.name)
            if file_type is None:
                return Response(
                    {"error": f"Unsupported manuscript type: {uploaded.name}. Accepted: .pdf, .tex, .docx, .txt"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            try:
                uploaded.seek(0)
                file_hash = hashlib.sha256(uploaded.read()).hexdigest()
                uploaded.seek(0)
                parsed = ManuscriptParser().parse(uploaded, file_type=file_type)
                manuscript_text = parsed.full_text or parsed.results_text or ""
                title = parsed.metadata.title or ""
                file_name = uploaded.name
            except Exception:
                logger.exception("verify: manuscript parse failed")
                return Response(
                    {"error": "Failed to parse the manuscript (unsupported or corrupt file)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            manuscript_text = request.data.get("text", "") or ""
            title = request.data.get("title", "") or ""

        if not manuscript_text.strip():
            return Response(
                {"error": "No manuscript provided. Send a `file` upload or a `text` field."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ---- 2. optional data table ----
        dataframe = None
        data_source = "none"
        linked_datasets = None
        data_file = request.FILES.get("data")
        if data_file is not None:
            err = file_too_large_error(data_file)
            if err:
                return Response({"error": err}, status=status.HTTP_400_BAD_REQUEST)
            try:
                dataframe = _load_dataframe(data_file)
                data_source = "uploaded_table"
                linked_datasets = [
                    {
                        "source_type": "uploaded",
                        "file_name": data_file.name,
                        "n_rows": int(dataframe.shape[0]),
                        "n_cols": int(dataframe.shape[1]),
                        "link_status": "linked",
                    }
                ]
            except ValueError as exc:
                # bounded/format errors from _load_dataframe are user-actionable
                return Response({"error": f"Could not read the data file: {exc}"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception:
                logger.exception("verify: data-file read failed")
                return Response(
                    {"error": "Could not read the data file (unsupported or corrupt format)."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        # ---- 3. alpha ----
        try:
            alpha = float(request.data.get("alpha", 0.05))
        except (TypeError, ValueError):
            alpha = 0.05

        # ---- 4. run + (best-effort) persist ----
        try:
            result = run_verification(
                manuscript_text,
                dataframe=dataframe,
                alpha=alpha,
                file_name=file_name,
                file_hash=file_hash,
                title=title,
                data_source=data_source,
                linked_datasets=linked_datasets,
                processing_time_ms=int((time.time() - t0) * 1000),
            )
        except Exception:
            logger.exception("verify: analysis failed")
            return Response({"error": "Verification failed."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response(result.to_response(), status=status.HTTP_200_OK)


class VerifyReportView(APIView):
    """GET /api/v1/verify/report/<run_id>/?token=...

    Retrieve a previously stored verification run. Access is gated by the one-time share token
    returned at analysis time (or the ``X-Report-Token`` header): a missing/incorrect token
    returns 404 (it never confirms whether the id exists), mirroring the manuscript report IDOR
    protection (audit 2026-05-31, SEC-3).
    """

    permission_classes = [AllowAny]

    def get(self, request, run_id):
        if not MODELS_AVAILABLE:
            return Response({"error": "Database models not available"}, status=status.HTTP_501_NOT_IMPLEMENTED)
        try:
            run = VerificationRun.objects.get(id=run_id)
        except VerificationRun.DoesNotExist:
            return Response({"error": "Verification run not found"}, status=status.HTTP_404_NOT_FOUND)

        # Fail CLOSED: a valid token is always required. (VerificationRun is a brand-new model
        # with no legacy un-tokenized rows, so — unlike the manuscript report — there is no
        # backward-compat case for allowing access when report_token_hash is empty.)
        supplied = request.query_params.get("token") or request.META.get("HTTP_X_REPORT_TOKEN", "")
        if not run.report_token_hash or not run.verify_report_token(supplied):
            return Response({"error": "Verification run not found"}, status=status.HTTP_404_NOT_FOUND)

        payload = dict(run.profile_data or {})
        payload.update(
            {
                "run_id": str(run.id),
                "title": run.title,
                "file_name": run.file_name,
                "status": run.status,
                "data_source": run.data_source,
                "created_at": run.created_at.isoformat(),
                "processing_time_ms": run.processing_time_ms,
            }
        )
        return Response(payload, status=status.HTTP_200_OK)
