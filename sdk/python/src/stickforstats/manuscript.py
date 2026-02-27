"""
Manuscript review module — wraps ``/api/v1/manuscript/*`` endpoints.
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any, Dict

from stickforstats.models import ConsistencyReport, ManuscriptReport, ParseResult

if TYPE_CHECKING:
    from stickforstats.client import StickForStats


def _open_file(file_path: str) -> Dict[str, Any]:
    """Prepare a file upload tuple for httpx."""
    filename = os.path.basename(file_path)
    # Determine MIME type from extension
    ext = os.path.splitext(filename)[1].lower()
    mime_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".doc": "application/msword",
        ".tex": "application/x-tex",
        ".txt": "text/plain",
        ".md": "text/markdown",
    }
    mime = mime_map.get(ext, "application/octet-stream")
    fh = open(file_path, "rb")
    return {"file": (filename, fh, mime)}


class ManuscriptModule:
    """
    Manuscript review and statistical claim verification.

    Accessed via ``client.manuscript``.
    """

    def __init__(self, client: StickForStats) -> None:
        self._client = client

    def analyze(
        self,
        file_path: str,
        *,
        field: str = "general",
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> ManuscriptReport:
        """
        Comprehensive manuscript analysis — extract, verify, and score
        statistical claims in an academic paper.

        Parameters
        ----------
        file_path : str
            Path to the manuscript file (PDF, DOCX, TeX, etc.).
        field : str
            Research field for domain-specific checks (e.g. ``"psychology"``,
            ``"medicine"``, ``"economics"``).
        alpha : float
            Significance level for verification.

        Returns
        -------
        ManuscriptReport
        """
        files = _open_file(file_path)
        try:
            resp = self._client.post(
                "manuscript/analyze/",
                files=files,
                data={"field": field, "alpha": str(alpha), **kwargs},
            )
        finally:
            files["file"][1].close()
        return ManuscriptReport.model_validate(resp)

    def parse(self, file_path: str, **kwargs: Any) -> ParseResult:
        """
        Parse a manuscript into structured sections, tables, and figures.

        Parameters
        ----------
        file_path : str
            Path to the manuscript file.

        Returns
        -------
        ParseResult
        """
        files = _open_file(file_path)
        try:
            resp = self._client.post("manuscript/parse/", files=files, data=kwargs)
        finally:
            files["file"][1].close()
        return ParseResult.model_validate(resp)

    def extract_claims(self, file_path: str, **kwargs: Any) -> ManuscriptReport:
        """
        Extract statistical claims from a manuscript.

        Parameters
        ----------
        file_path : str
            Path to the manuscript file.

        Returns
        -------
        ManuscriptReport
            Report with extracted claims.
        """
        files = _open_file(file_path)
        try:
            resp = self._client.post("manuscript/claims/", files=files, data=kwargs)
        finally:
            files["file"][1].close()
        return ManuscriptReport.model_validate(resp)

    def check_consistency(
        self,
        file_path: str,
        *,
        alpha: float = 0.05,
        **kwargs: Any,
    ) -> ConsistencyReport:
        """
        Check internal consistency of statistical claims within a manuscript.

        Parameters
        ----------
        file_path : str
            Path to the manuscript file.
        alpha : float
            Significance level.

        Returns
        -------
        ConsistencyReport
        """
        files = _open_file(file_path)
        try:
            resp = self._client.post(
                "manuscript/consistency/",
                files=files,
                data={"alpha": str(alpha), **kwargs},
            )
        finally:
            files["file"][1].close()
        return ConsistencyReport.model_validate(resp)
