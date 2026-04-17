"""
SQSClient -- thin composable wrapper around StickForStats' SQS scorer.
======================================================================

Two backends are supported:

* ``in_process`` -- import ``core.sqs_scoring.SQSScorer`` directly from
  the StickForStats backend and call it in the same Python process. This
  is the default; it gives determinism, no network dependency, and full
  control over the blinded-metadata contract.

* ``http`` -- hit the deployed Django REST endpoint
  ``POST /api/v1/sqs/analyze-text/`` with a JSON body
  ``{"text": ..., "field": ...}``. Useful when we want to exercise the
  exact code path a real journal integration would use.

The client accepts ONLY the four whitelisted metadata keys from the
preregistered protocol (``pub_year``, ``journal``, ``issn``,
``mesh_top5``). Passing ``class``, ``retraction_is_statistical``, or any
other key raises ``BlindingViolation`` at the function-signature level.
This is the load-bearing guarantee that the scoring step is blind to
labels (see PROTOCOL.md section 10.1 acceptance test "blinding check").

The returned :class:`SQSResult` object is a small, serialisable record
that the driver can write directly into the CSV; no Django models, no
regex objects, no datetime.now() artefacts leak through.

Only stdlib + ``requests`` are required at runtime. ``numpy`` is NOT a
dependency.
"""

from __future__ import annotations

import json
import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

# ---------------------------------------------------------------------------
# Metadata whitelist -- the ONLY keys a blinded scorer is allowed to see.
# ---------------------------------------------------------------------------

ALLOWED_METADATA_KEYS: frozenset = frozenset(
    {"pub_year", "journal", "issn", "mesh_top5"}
)

# MeSH top-term to SQS field mapping (see PROTOCOL.md 10.1 step 3). Kept
# here rather than in score.py so that the client is the single source of
# truth for the field_mapping frozen artefact.
_MESH_TO_FIELD: Dict[str, str] = {
    "Psychology": "psychology",
    "Psychiatry": "psychology",
    "Mental Disorders": "psychology",
    "Behavior": "psychology",
    "Cognition": "psychology",
    # Medicine / clinical
    "Diseases": "medicine",
    "Clinical Medicine": "medicine",
    "Therapeutics": "medicine",
    "Diagnosis": "medicine",
    "Surgery": "medicine",
    "Neoplasms": "medicine",
    "Cardiovascular Diseases": "medicine",
    "Infections": "medicine",
    "Pharmacology": "medicine",
    # Basic biology
    "Biology": "biology",
    "Genetics": "biology",
    "Molecular Biology": "biology",
    "Cell Biology": "biology",
    "Microbiology": "biology",
    "Biochemistry": "biology",
    # Ecology / environment
    "Ecology": "ecology",
    "Environmental Sciences": "ecology",
    # Economics
    "Economics": "economics",
}


class BlindingViolation(ValueError):
    """Raised if the caller attempts to pass a non-whitelisted metadata key.

    This is the runtime enforcement of the preregistered blinding
    constraint. It is intentionally a subclass of ``ValueError`` so that
    top-level driver code that catches ``ValueError`` does not silently
    swallow it; the exception class name is recorded in the CSV error
    column to make any breach visible in an audit.
    """


@dataclass(frozen=True)
class SQSResult:
    """Structured per-paper SQS scoring output.

    Fields are exactly those the driver needs to write into
    ``scores_v1.csv``. Nothing else. In particular there is no direct
    reference to retraction labels, no Django request/response object,
    no full text echoed back.
    """

    sqs_score: float  # 0-100 percentage
    category_scores: Dict[str, float]  # category_id -> percentage (0-100)
    rules_hit: List[str]  # rule IDs that fired positively
    rules_missed: List[str]  # rule IDs that failed (should have fired)
    rules_not_applicable: List[str]  # rule IDs that are N/A (placeholder)
    violations_count: int  # len(rules_missed)
    field_used: str  # which FIELD_WEIGHTS profile was applied
    raw: Dict[str, Any] = field(default_factory=dict)
    # ``raw`` is kept for debugging only; driver does NOT serialise it.


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _validate_metadata(metadata: Optional[Mapping[str, Any]]) -> Dict[str, Any]:
    """Return a shallow copy of *metadata* after verifying its keys.

    Unknown keys raise :class:`BlindingViolation`. ``None`` is treated as
    the empty mapping (a blank metadata context, still blinded).
    """
    if metadata is None:
        return {}
    extra = set(metadata.keys()) - ALLOWED_METADATA_KEYS
    if extra:
        raise BlindingViolation(
            "Blinding violation: scorer received disallowed metadata keys "
            f"{sorted(extra)}. Allowed keys: {sorted(ALLOWED_METADATA_KEYS)}"
        )
    return dict(metadata)


def _field_from_metadata(metadata: Mapping[str, Any]) -> str:
    """Derive the SQS ``field`` profile from a blinded metadata dict.

    Returns one of the keys of ``FIELD_WEIGHTS`` (``general``,
    ``psychology``, ``medicine``, ``biology``, ``ecology``,
    ``economics``). Uses the first MeSH term that maps to a known
    field; falls back to ``"general"``.
    """
    mesh = metadata.get("mesh_top5") or []
    if isinstance(mesh, str):
        mesh = [m.strip() for m in mesh.split("|") if m.strip()]
    for term in mesh:
        if term in _MESH_TO_FIELD:
            return _MESH_TO_FIELD[term]
        # Fuzzy: try the first comma-separated segment (MeSH headings
        # often come like "Psychology, Clinical").
        head = term.split(",")[0].strip()
        if head in _MESH_TO_FIELD:
            return _MESH_TO_FIELD[head]
    return "general"


def _ensure_backend_on_path() -> None:
    """Make ``core.sqs_scoring`` importable without requiring Django setup.

    The StickForStats backend lives at ``<repo>/backend/``; this helper
    prepends it to ``sys.path`` exactly once (idempotent).
    """
    here = Path(__file__).resolve()
    backend_dir = here.parents[3] / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))


# ---------------------------------------------------------------------------
# Main client
# ---------------------------------------------------------------------------


class SQSClient:
    """Composable client around the SQS scorer.

    Parameters
    ----------
    backend : str, optional
        Either ``"in_process"`` (default) or ``"http"``.
    base_url : str, optional
        Used only for the HTTP backend. Defaults to
        ``http://localhost:8000``.
    timeout : float, optional
        HTTP timeout in seconds (ignored in in-process mode).
    """

    def __init__(
        self,
        backend: str = "in_process",
        base_url: str = "http://localhost:8000",
        timeout: float = 60.0,
    ) -> None:
        if backend not in {"in_process", "http"}:
            raise ValueError(
                f"Unknown backend {backend!r}; expected 'in_process' or 'http'."
            )
        self.backend = backend
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

        # In-process: lazy import so the library is usable even when the
        # Django backend is not installed (HTTP mode works from any env).
        self._scorer_cls = None
        self._field_weights = None
        self._all_rules = None
        self._categories = None

        if backend == "in_process":
            self._load_inprocess()

    @classmethod
    def from_env(cls) -> "SQSClient":
        """Convenience factory reading ``STICKFORSTATS_API_URL`` et al.

        If ``STICKFORSTATS_BACKEND`` is set to ``"http"`` the client is
        built in HTTP mode pointing at ``STICKFORSTATS_API_URL``;
        otherwise in-process mode is used.
        """
        backend = os.environ.get("STICKFORSTATS_BACKEND", "in_process").strip()
        url = os.environ.get(
            "STICKFORSTATS_API_URL", "http://localhost:8000"
        ).strip()
        timeout = float(os.environ.get("STICKFORSTATS_TIMEOUT", "60"))
        return cls(backend=backend, base_url=url, timeout=timeout)

    # ------------------------------------------------------------------
    # Internal loader
    # ------------------------------------------------------------------

    def _load_inprocess(self) -> None:
        """Import the backend SQS modules and cache their handles."""
        _ensure_backend_on_path()
        try:
            from core.sqs_scoring import SQSScorer  # noqa: WPS433
            from core.sqs_rules import ALL_RULES, CATEGORIES, FIELD_WEIGHTS  # noqa: WPS433
        except ImportError as exc:  # pragma: no cover -- exercised by test
            raise RuntimeError(
                "In-process SQS backend could not be loaded. "
                "Ensure the repo's backend/ is on PYTHONPATH and that "
                "core.sqs_scoring is importable. Root cause: %s" % exc
            ) from exc
        self._scorer_cls = SQSScorer
        self._field_weights = dict(FIELD_WEIGHTS)
        self._all_rules = list(ALL_RULES)
        self._categories = dict(CATEGORIES)

    # ------------------------------------------------------------------
    # Public scoring API
    # ------------------------------------------------------------------

    def score(
        self,
        text: str,
        metadata: Optional[Mapping[str, Any]] = None,
    ) -> SQSResult:
        """Score a single manuscript's plain-text body.

        Parameters
        ----------
        text : str
            Preprocessed plain-text manuscript body. Must be non-empty
            (at least 100 chars) or the backend will refuse it.
        metadata : Mapping[str, Any], optional
            Blinded metadata. Only keys listed in
            :data:`ALLOWED_METADATA_KEYS` are permitted; any other key
            raises :class:`BlindingViolation`.

        Returns
        -------
        SQSResult
            Structured scoring output ready for CSV serialisation.
        """
        meta = _validate_metadata(metadata)
        if not isinstance(text, str):
            raise TypeError("text must be str")
        if len(text.strip()) < 100:
            raise ValueError(
                "Manuscript text is too short (<100 chars) to score."
            )
        sqs_field = _field_from_metadata(meta)

        if self.backend == "in_process":
            return self._score_in_process(text, sqs_field)
        return self._score_http(text, sqs_field)

    # ------------------------------------------------------------------
    # Backends
    # ------------------------------------------------------------------

    def _score_in_process(self, text: str, sqs_field: str) -> SQSResult:
        if self._scorer_cls is None:
            self._load_inprocess()
        scorer = self._scorer_cls(field=sqs_field)
        report = scorer.analyze(text)
        # ``report.percentage`` is the 0-100 SQS (field-weighted)
        percentage = float(report.percentage)

        category_scores: Dict[str, float] = {}
        for cat_id, cscore in report.category_scores.items():
            category_scores[cat_id] = float(cscore.percentage)

        rules_hit: List[str] = []
        rules_missed: List[str] = []
        for finding in report.all_findings:
            if finding.is_penalty:
                # Penalty rules (PR002): fired means "hit" in the sense
                # that the penalty was applied. We represent them as
                # missed-quality so the signed violation count reflects
                # paper fragility. A penalty that fired is a quality
                # problem.
                if finding.found:
                    rules_missed.append(finding.rule_id)
                else:
                    rules_hit.append(finding.rule_id)
            else:
                if finding.found:
                    rules_hit.append(finding.rule_id)
                else:
                    rules_missed.append(finding.rule_id)

        return SQSResult(
            sqs_score=round(percentage, 4),
            category_scores={k: round(v, 4) for k, v in category_scores.items()},
            rules_hit=sorted(rules_hit),
            rules_missed=sorted(rules_missed),
            rules_not_applicable=[],
            violations_count=len(rules_missed),
            field_used=sqs_field,
            raw={
                "total_score": float(report.total_score),
                "max_score": float(report.max_score),
                "grade": report.grade,
            },
        )

    def _score_http(self, text: str, sqs_field: str) -> SQSResult:
        import requests  # local import -- stdlib not enough

        url = f"{self.base_url}/api/v1/sqs/analyze-text/"
        payload = {"text": text, "field": sqs_field}
        resp = requests.post(
            url,
            data=json.dumps(payload),
            headers={"Content-Type": "application/json"},
            timeout=self.timeout,
        )
        resp.raise_for_status()
        body = resp.json()

        percentage = float(body.get("percentage", 0.0))
        cat_scores_raw = body.get("category_scores", {}) or {}
        category_scores: Dict[str, float] = {
            cat_id: float(info.get("percentage", 0.0))
            for cat_id, info in cat_scores_raw.items()
        }
        # HTTP response does not include the full per-rule breakdown in
        # analyze-text today (see SCORE_NOTES.md). We therefore record
        # only the aggregate category scores and derive no rule list.
        # The driver treats this as a known gap.
        return SQSResult(
            sqs_score=round(percentage, 4),
            category_scores={k: round(v, 4) for k, v in category_scores.items()},
            rules_hit=[],
            rules_missed=[],
            rules_not_applicable=sorted(r["id"] for r in (self._all_rules or [])),
            violations_count=0,
            field_used=sqs_field,
            raw=body,
        )

    # ------------------------------------------------------------------
    # Introspection
    # ------------------------------------------------------------------

    def rule_ids(self) -> Sequence[str]:
        """Return all 45 SQS rule IDs (stable order)."""
        if self._all_rules is None:
            # Force load -- rule set is needed for driver cross-checks.
            self._load_inprocess()
        return sorted(r["id"] for r in self._all_rules)

    def category_ids(self) -> Sequence[str]:
        """Return the 6 category IDs."""
        if self._categories is None:
            self._load_inprocess()
        return sorted(self._categories.keys())


__all__ = [
    "ALLOWED_METADATA_KEYS",
    "BlindingViolation",
    "SQSClient",
    "SQSResult",
]
