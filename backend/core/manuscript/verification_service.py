"""
verification_service.py — Django adapter for the raw-data verification pipeline (T22).
=======================================================================================

Bridges the Django-FREE verification core (``core/manuscript/verify_pipeline``) to Django
persistence (``core/models``: VerificationRun + ClaimVerdictRecord + LinkedDataset). The REST
surface (``api/v1/verify_views``) and any future Celery batch worker call ``run_verification()``;
the core pipeline itself stays import-clean of Django so it remains unit-testable in the pure
``.venv-verify`` environment ("shared engine, separate surface", plan §3).

Persistence is best-effort: a failure to write the DB is logged and downgraded to a
non-persisted result — a verification is *always* returned to the caller.

Created: 2026-06-25 IST  (TODO item T22-ORCHESTRATE, Django leg)
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from .verify_pipeline import VerificationProfile, verify_manuscript

logger = logging.getLogger(__name__)


def _json_safe(obj: Any) -> Any:
    """Recursively coerce numpy scalars and non-finite floats to JSON-serializable values.

    A re-analysis can legitimately produce ``inf``/``nan`` (e.g. a perfectly separated effect
    size) and numpy scalar types; either would make DRF's ``JSONRenderer`` raise. We map
    non-finite floats to ``None`` and unwrap numpy scalars via ``.item()``.
    """
    if isinstance(obj, dict):
        return {k: _json_safe(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_json_safe(v) for v in obj]
    if isinstance(obj, bool):
        return obj
    if isinstance(obj, float):
        return obj if math.isfinite(obj) else None
    # numpy scalar -> python scalar (duck-typed; no hard numpy import in this module)
    item = getattr(obj, "item", None)
    if callable(item) and type(obj).__module__ == "numpy":
        return _json_safe(obj.item())
    return obj


def _safe_float(v: Any) -> Optional[float]:
    """Coerce to a finite python float, or ``None`` (for nullable model columns)."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return f if math.isfinite(f) else None


@dataclass
class VerificationRunResult:
    """The verification profile plus its persistence handle (if it was stored)."""

    profile: VerificationProfile
    run_id: Optional[str] = None         # VerificationRun UUID (None if not persisted)
    report_token: Optional[str] = None   # raw share token, returned to the caller exactly once

    def to_response(self) -> Dict[str, Any]:
        """JSON-safe API payload: the profile, plus the run id + one-time retrieval token."""
        payload = _json_safe(self.profile.to_dict())
        if self.run_id:
            payload["run_id"] = self.run_id
            payload["report_token"] = self.report_token
            payload["report_url"] = f"/api/v1/verify/report/{self.run_id}/?token={self.report_token}"
        return payload


def run_verification(
    manuscript_text: str,
    *,
    dataframe=None,
    linker=None,
    alpha: float = 0.05,
    file_name: str = "",
    file_hash: str = "",
    title: str = "",
    data_source: str = "none",
    linked_datasets: Optional[List[Dict[str, Any]]] = None,
    processing_time_ms: Optional[int] = None,
    persist: bool = True,
) -> VerificationRunResult:
    """Verify a manuscript end to end and (optionally) persist the result.

    Args:
        manuscript_text: the manuscript's text (results/full text).
        dataframe: an optional single imported table to link claims against (tabular case).
            When omitted, unlinkable claims resolve to ``INSUFFICIENT_DATA`` — the honest,
            expected outcome for most papers (the data-availability pilot quantified this).
        linker: optional custom claim->data linker (e.g. a genomics gene linker); defaults to
            the tabular linker inside ``verify_manuscript``.
        linked_datasets: optional dataset-provenance dicts persisted as ``LinkedDataset`` rows.
        persist: when False (or models unavailable) the result is returned without a DB row.
    """
    profile = verify_manuscript(manuscript_text, dataframe=dataframe, linker=linker, alpha=alpha)

    if not persist:
        return VerificationRunResult(profile=profile)

    try:
        from django.db import transaction

        from core.models import ClaimVerdictRecord, LinkedDataset, VerificationRun
    except Exception as exc:  # models unavailable (pure-core env) -> still return the verdicts
        logger.warning("Verification persistence unavailable: %s", exc)
        return VerificationRunResult(profile=profile)

    try:
        with transaction.atomic():
            run = VerificationRun.objects.create(
                title=title or "",
                file_name=file_name or "",
                file_hash=file_hash or "",
                status="completed",
                n_claims=profile.n_claims,
                verifiability_rate=_safe_float(profile.verifiability_rate),
                coverage=_safe_float(profile.coverage),
                low_coverage=bool(profile.low_coverage),
                n_inconsistent_reporting=profile.n_inconsistent_reporting,
                verdict_distribution=_json_safe(profile.verdict_distribution),
                certify_note=profile.certify_note,
                profile_data=_json_safe(profile.to_dict()),
                data_source=data_source or "none",
                processing_time_ms=processing_time_ms,
            )
            raw_token = run.set_report_token()
            run.save(update_fields=["report_token_hash"])

            ClaimVerdictRecord.objects.bulk_create(
                [
                    ClaimVerdictRecord(
                        run=run,
                        claim_id=cv.claim_id,
                        verdict=cv.verdict.value,
                        claim_text=(cv.claim_text or "")[:4000],
                        test_name=cv.recomputed_test or "",
                        claimed_statistic=_safe_float(cv.claimed_statistic),
                        claimed_p_value=_safe_float(cv.claimed_p_value),
                        recomputed_statistic=_safe_float(cv.recomputed_statistic),
                        recomputed_p_value=_safe_float(cv.recomputed_p_value),
                        data_available=bool(cv.data_available),
                        assumptions_satisfied=cv.assumptions_satisfied,
                        position=cv.position,
                        detail=_json_safe(cv.to_dict()),
                    )
                    for cv in profile.claim_verdicts
                ]
            )

            for ds in linked_datasets or []:
                LinkedDataset.objects.create(
                    run=run,
                    source_type=ds.get("source_type", "uploaded"),
                    accession=ds.get("accession", "") or "",
                    file_name=ds.get("file_name", "") or "",
                    n_rows=ds.get("n_rows"),
                    n_cols=ds.get("n_cols"),
                    link_status=ds.get("link_status", "linked"),
                    notes=ds.get("notes", "") or "",
                )

        return VerificationRunResult(profile=profile, run_id=str(run.id), report_token=raw_token)
    except Exception:
        logger.exception("Failed to persist verification run")
        return VerificationRunResult(profile=profile)
