"""
Manuscript verification module — wraps ``/api/v1/verify/*`` endpoints.

This is the *raw-data re-analysis* surface: it re-runs the authors' reported
tests on their own data and returns per-claim verdicts (VERIFIED / DISCREPANT /
ASSUMPTION_VIOLATED / INSUFFICIENT_DATA / ...), citation–content conflicts, and a
per-file ingestion report.

It is DISTINCT from ``client.manuscript`` (``/manuscript/*``), which does an
internal-consistency review of the reported numbers without re-running anything.
Most claims resolve to ``INSUFFICIENT_DATA`` unless the underlying data are
attached — that is the honest, expected default.

Privacy: only the files you upload are sent; the endpoints fetch no external data.
"""

from __future__ import annotations

import os
from typing import TYPE_CHECKING, Any, Sequence

from stickforstats.models import VerificationReport

if TYPE_CHECKING:
    from stickforstats.client import StickForStats

_MIME_MAP = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".doc": "application/msword",
    ".tex": "application/x-tex",
    ".latex": "application/x-tex",
    ".txt": "text/plain",
    ".xml": "application/xml",
    ".nxml": "application/xml",
    ".csv": "text/csv",
    ".tsv": "text/tab-separated-values",
    ".tab": "text/tab-separated-values",
    ".json": "application/json",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".xls": "application/vnd.ms-excel",
    ".sav": "application/x-spss-sav",
    ".sas7bdat": "application/x-sas-data",
    ".dta": "application/x-stata-dta",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".webp": "image/webp",
}


def _guess_mime(filename: str) -> str:
    return _MIME_MAP.get(os.path.splitext(filename)[1].lower(), "application/octet-stream")


class VerifyModule:
    """
    Raw-data manuscript verification.

    Accessed via ``client.verify``.

    Examples
    --------
    >>> report = client.verify.bundle(["paper.pdf", "data.csv", "fig1.png"])
    >>> report.n_claims, report.verdict_distribution
    >>> [c.claim_id for c in report.conflicts]   # citation-content conflicts
    """

    def __init__(self, client: StickForStats) -> None:
        self._client = client

    def bundle(
        self,
        file_paths: Sequence[str],
        *,
        alpha: float = 0.05,
        title: str | None = None,
        **kwargs: Any,
    ) -> VerificationReport:
        """
        Verify a whole submission *bundle* (the editor / publisher case).

        Upload the manuscript plus any supplementary documents, raw-data tables,
        and figure images in one call. Each extracted claim is re-run against the
        uploaded data where it links; the response carries per-claim verdicts,
        citation–content conflicts, and a per-file ingestion report.

        Parameters
        ----------
        file_paths : sequence of str
            Paths to every file in the bundle (manuscript + supplements + data +
            figure images). Limits: <= 50 files, <= 25 MB each (server-enforced).
        alpha : float
            Significance level.
        title : str, optional
            Manuscript title.

        Returns
        -------
        VerificationReport
        """
        if not file_paths:
            raise ValueError("bundle() requires at least one file path.")

        handles = []
        files: list[tuple[str, tuple[str, Any, str]]] = []
        try:
            for path in file_paths:
                fh = open(path, "rb")
                handles.append(fh)
                # repeated "files" field — every file is routed by type server-side
                files.append(("files", (os.path.basename(path), fh, _guess_mime(path))))
            data: dict[str, Any] = {"alpha": str(alpha), **kwargs}
            if title:
                data["title"] = title
            resp = self._client.post("verify/bundle/", files=files, data=data)
        finally:
            for fh in handles:
                fh.close()
        return VerificationReport.model_validate(resp)

    def analyze(
        self,
        file_path: str | None = None,
        *,
        text: str | None = None,
        data_path: str | None = None,
        alpha: float = 0.05,
        title: str | None = None,
        **kwargs: Any,
    ) -> VerificationReport:
        """
        Verify a single manuscript, optionally against one data table.

        Provide either ``file_path`` (a manuscript file) **or** ``text`` (raw
        manuscript text). Attach an optional tabular ``data_path`` to enable
        raw-data re-analysis; without data, checkable claims resolve to
        ``INSUFFICIENT_DATA`` (the honest default).

        Parameters
        ----------
        file_path : str, optional
            Path to the manuscript (PDF / DOCX / LaTeX / TXT / XML).
        text : str, optional
            Raw manuscript text (use instead of ``file_path``).
        data_path : str, optional
            Path to one tabular data file (CSV / TSV / XLSX) to link claims against.
        alpha : float
            Significance level.
        title : str, optional
            Manuscript title (used when posting ``text``).

        Returns
        -------
        VerificationReport
        """
        if not file_path and not text:
            raise ValueError("analyze() requires either file_path or text.")
        if file_path and text:
            raise ValueError("Pass only one of file_path or text, not both.")

        handles = []
        files: dict[str, Any] = {}
        form: dict[str, Any] = {"alpha": str(alpha), **kwargs}
        if title:
            form["title"] = title
        try:
            if file_path:
                fh = open(file_path, "rb")
                handles.append(fh)
                files["file"] = (os.path.basename(file_path), fh, _guess_mime(file_path))
            else:
                form["text"] = text
            if data_path:
                dfh = open(data_path, "rb")
                handles.append(dfh)
                files["data"] = (os.path.basename(data_path), dfh, _guess_mime(data_path))
            resp = self._client.post("verify/analyze/", files=files or None, data=form)
        finally:
            for fh in handles:
                fh.close()
        return VerificationReport.model_validate(resp)

    def report(self, run_id: str, token: str) -> VerificationReport:
        """
        Retrieve a previously stored verification run (token-gated).

        Parameters
        ----------
        run_id : str
            The ``run_id`` returned by :meth:`bundle` / :meth:`analyze`.
        token : str
            The one-time ``report_token`` returned at analysis time. A missing or
            wrong token returns 404 (it never reveals whether the id exists).

        Returns
        -------
        VerificationReport
        """
        resp = self._client.get(f"verify/report/{run_id}/", params={"token": token})
        return VerificationReport.model_validate(resp)
