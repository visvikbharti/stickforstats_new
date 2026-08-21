"""
Manuscript verification — verdict taxonomy + contracts (Phase A, item T02-SPINE).
====================================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (§2 verdict taxonomy)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T02-SPINE)

This is the *spine* of the raw-data verification module: the per-claim verdict
record and the request/data contracts that every downstream item (T04 consistency
adapter, T13 re-analysis engine, T19 decision function, T23 scoring) plugs into.

Design notes:
- Pure module: stdlib only (dataclasses, enum, typing). NO scipy / numpy / Django
  imports, so it loads anywhere (the local scipy build is ABI-broken) and is unit-
  testable in isolation.
- The per-claim record is modelled on the genomics ``GeneResult``
  (backend/core/services/genomics/differential_expression.py:31), including its
  conservative ``test_failed`` / ``test_failure_reason`` discipline: a failed
  re-analysis must surface explicitly, never silently pass as "not significant".
- ``calibrated_confidence`` is RESERVED and must stay ``None`` until the B3 manual
  double-coding produces calibration constants. Only the engine's own (explicitly
  uncalibrated) score may be carried, as ``uncalibrated_engine_confidence``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, TYPE_CHECKING

if TYPE_CHECKING:  # avoid runtime coupling to the (pure) extractor module
    from .claim_extractor import StatisticalClaim


class Verdict(str, Enum):
    """Per-claim verification verdict (plan §2).

    Exactly one is assigned per extracted statistical claim by the decision
    function (T19). ``str`` mixin so values JSON-serialize as their names.
    """

    #: data found + re-analysis reproduces the claimed stat/p/effect within
    #: tolerance, with an appropriate test whose assumptions hold.
    VERIFIED = "VERIFIED"
    #: data found, re-analysis materially disagrees with the claimed numbers.
    DISCREPANT = "DISCREPANT"
    #: data found; the used test's assumptions fail (regardless of p-match).
    ASSUMPTION_VIOLATED = "ASSUMPTION_VIOLATED"
    #: a test requiring assumption checks was used, but no check is reported
    #: in the text (A5(i); decidable without raw data).
    ASSUMPTION_UNREPORTED = "ASSUMPTION_UNREPORTED"
    #: raw/supplementary data unavailable or not linkable -> cannot verify.
    #: First-class output, NOT a failure (most papers will land here).
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
    #: the claim could not be reliably extracted (low coverage) -> do not
    #: assert anything about it.
    UNVERIFIABLE_EXTRACTION = "UNVERIFIABLE_EXTRACTION"
    #: SECONDARY signal only (the no-raw-data fallback): statcheck-style
    #: internal inconsistency between reported stat/df/p. Never the headline.
    INCONSISTENT_REPORTING = "INCONSISTENT_REPORTING"

    @property
    def needs_raw_data(self) -> bool:
        return self in (Verdict.VERIFIED, Verdict.DISCREPANT, Verdict.ASSUMPTION_VIOLATED)


# Tests whose assumptions can actually hold/fail on data (drive A5(ii)).
PARAMETRIC_ENGINE_TESTS = frozenset(
    {"independent_t", "welch_t", "paired_t", "one_sample_t", "one_way_anova",
     "pearson", "linear_regression"}
)


@dataclass
class ClaimDataSpec:
    """Resolved (claim -> dataset) spec produced by the A3 linker (T21).

    The concrete input the re-analysis engine (T13) needs to re-run a claim.
    A ``None``/empty spec means the claim could not be linked to data and the
    verdict is ``INSUFFICIENT_DATA``. ``as_engine_data()`` yields the exact
    structure ``AutonomousCascadeEngine.execute_with_cascade`` consumes
    (dict/list of arrays; see cascade_engine._prepare_data).
    """

    #: cascade_engine intended_test key, e.g. 'independent_t','one_way_anova',
    #: 'pearson','linear_regression','chi_square_independence'. (Resolved by T12.)
    intended_test: Optional[str] = None
    #: coarse design family: 'two_group','k_group','paired','correlation',
    #: 'regression','contingency'. Used for sanity-gating.
    design_type: Optional[str] = None

    #: group comparisons (t / ANOVA / Mann-Whitney / Kruskal): list of samples.
    groups: Optional[List[List[float]]] = None
    #: correlation / regression: the two paired variables.
    x: Optional[List[float]] = None
    y: Optional[List[float]] = None
    #: contingency (chi-square / Fisher): an r x c table OR two label arrays.
    table: Optional[List[List[float]]] = None

    variable_names: List[str] = field(default_factory=list)
    n: Optional[int] = None
    #: T14 gate: only honour order-dependent checks (independence/autocorr) when
    #: rows are genuinely sequential/time-ordered/repeated-measures.
    rows_sequential: bool = False

    #: provenance of the link (T21): which dataset, and whether a human confirmed it.
    linked_dataset_id: Optional[str] = None
    auto_linked: bool = False

    #: cross-reference provenance (Phase 0, docs/manuscript_verifier/): which uploaded file the
    #: data came from, which in-text reference (e.g. "Table S3") this link satisfied, and the
    #: linker's confidence in the link (distinct from the re-analysis confidence).
    source_file: Optional[str] = None
    resolved_reference: Optional[str] = None
    link_confidence: Optional[float] = None
    link_method: Optional[str] = None       # how the data file was chosen (reference_linker)

    def has_data(self) -> bool:
        return bool(self.groups) or (self.x is not None and self.y is not None) or bool(self.table)

    def as_engine_data(self) -> Any:
        """Structure consumed by execute_with_cascade(data, ...)."""
        if self.groups:
            return [list(g) for g in self.groups]
        if self.x is not None and self.y is not None:
            return [list(self.x), list(self.y)]
        if self.table:
            return [self.table]
        return None


@dataclass
class ClaimVerificationRequest:
    """One claim + its resolved data, handed to the re-analysis engine (T13)."""

    claim: "StatisticalClaim"          # duck-typed; see claim_extractor.StatisticalClaim
    data_spec: Optional[ClaimDataSpec] = None
    alpha: float = 0.05
    #: source text for the T17 assumption-DISCLOSURE audit, which needs no raw data. Optional:
    #: when both are empty the audit reports "not evaluable" and no finding is produced.
    manuscript_text: str = ""
    methods_text: str = ""
    #: the claim's OWN sentence, supplied by the caller that extracted it. Sentence-local
    #: appropriateness rules read this and nothing else; an empty string means "no context",
    #: on which every such rule stays SILENT. It is deliberately not derived here from
    #: ``claim.position``: that offset is relative to the string the claim was extracted from
    #: (one file of a bundle), while ``manuscript_text`` may be the whole submission — indexing
    #: one with the other quotes an unrelated sentence as evidence.
    sentence: str = ""

    def data_available(self) -> bool:
        return self.data_spec is not None and self.data_spec.has_data()


@dataclass
class ClaimVerdict:
    """The per-claim verification record (the module's core output unit)."""

    claim_id: str
    verdict: Verdict
    claim_text: str = ""          # the originating claim's raw text (for the persisted report)

    # --- re-analysis (recomputed from the authors' raw data) ---
    recomputed_test: Optional[str] = None
    recomputed_statistic: Optional[float] = None
    recomputed_p_value: Optional[float] = None
    recomputed_effect_size: Optional[float] = None
    recomputed_effect_name: Optional[str] = None

    # --- claimed (from extraction) ---
    claimed_statistic: Optional[float] = None
    claimed_p_value: Optional[float] = None
    claimed_effect_size: Optional[float] = None

    # --- comparison (T15/T16; rounding-aware) ---
    statistic_match: Optional[bool] = None
    p_match: Optional[bool] = None
    effect_match: Optional[bool] = None
    deltas: Dict[str, Any] = field(default_factory=dict)

    # --- assumptions ---
    assumptions_checked: bool = False           # did Guardian actually evaluate anything?
    #: fraction of the test's required assumptions Guardian actually EVALUATED (None when no
    #: re-analysis ran). `assumptions_satisfied` says whether what we looked at was clean;
    #: this says how much we looked at. Reporting the first without the second is how a claim
    #: came to read "assumptions checked: yes, satisfied: yes" on an evaluation of nothing.
    assumption_coverage: Optional[float] = None
    assumptions_satisfied: Optional[bool] = None
    assumption_violations: List[str] = field(default_factory=list)
    assumptions_reported_in_text: Optional[bool] = None   # A5(i) text detection

    # --- methodological appropriateness (claim-level rule engine) ---
    #: findings from ``core.manuscript.appropriateness``, as ``ClaimFinding.to_dict()`` payloads.
    #: SEPARATE from the verdict on purpose: a verdict answers "do these numbers reproduce", a
    #: finding answers "was this test the right one to run". Folding an appropriateness rule into
    #: the verdict would let a heuristic about methodology overturn an arithmetic result.
    appropriateness_findings: List[Dict[str, Any]] = field(default_factory=list)

    # --- data availability ---
    data_available: bool = False
    linked_dataset_id: Optional[str] = None

    # --- confidence ---
    #: the engine's OWN score — explicitly uncalibrated (guardian_core anchors
    #: 0.167/0.444/0.722). Never surface this as "verification confidence".
    uncalibrated_engine_confidence: Optional[float] = None
    #: RESERVED: stays None until B3 manual double-coding yields calibration.
    calibrated_confidence: Optional[float] = None

    # --- failure discipline (ported from genomics GeneResult) ---
    test_failed: bool = False
    test_failure_reason: str = ""

    # --- provenance ---
    section: Optional[str] = None
    page: Optional[int] = None
    position: Optional[int] = None
    # cross-reference provenance (Phase 0): the file this claim came from, the in-text references
    # in its sentence, the reference its data link satisfied, and the resolution confidence.
    source_file: Optional[str] = None
    cited_references: List[str] = field(default_factory=list)
    resolved_reference: Optional[str] = None
    resolution_confidence: Optional[float] = None
    link_method: Optional[str] = None       # reference-directed | conflict | content (data-file selection)
    extraction_method: str = "text"         # text | ocr | vision — where the claim's text came from

    notes: List[str] = field(default_factory=list)

    # ---- convenience constructors for the terminal (no-engine) verdicts ----
    @classmethod
    def insufficient_data(cls, claim_id: str, reason: str = "", **prov: Any) -> "ClaimVerdict":
        return cls(claim_id=claim_id, verdict=Verdict.INSUFFICIENT_DATA,
                   data_available=False, notes=[reason] if reason else [], **prov)

    @classmethod
    def unverifiable_extraction(cls, claim_id: str, reason: str = "", **prov: Any) -> "ClaimVerdict":
        return cls(claim_id=claim_id, verdict=Verdict.UNVERIFIABLE_EXTRACTION,
                   notes=[reason] if reason else [], **prov)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "claim_id": self.claim_id,
            "verdict": self.verdict.value,
            "claim_text": self.claim_text,
            "recomputed": {
                "test": self.recomputed_test,
                "statistic": self.recomputed_statistic,
                "p_value": self.recomputed_p_value,
                "effect_size": self.recomputed_effect_size,
                "effect_name": self.recomputed_effect_name,
            },
            "claimed": {
                "statistic": self.claimed_statistic,
                "p_value": self.claimed_p_value,
                "effect_size": self.claimed_effect_size,
            },
            "match": {
                "statistic": self.statistic_match,
                "p_value": self.p_match,
                "effect_size": self.effect_match,
                "deltas": self.deltas,
            },
            "assumptions": {
                "checked": self.assumptions_checked,
                "coverage": self.assumption_coverage,
                "satisfied": self.assumptions_satisfied,
                "violations": self.assumption_violations,
                "reported_in_text": self.assumptions_reported_in_text,
            },
            "appropriateness": list(self.appropriateness_findings),
            "data_available": self.data_available,
            "linked_dataset_id": self.linked_dataset_id,
            "confidence": {
                "uncalibrated_engine": self.uncalibrated_engine_confidence,
                "calibrated": self.calibrated_confidence,   # None until B3
            },
            "test_failed": self.test_failed,
            "test_failure_reason": self.test_failure_reason,
            "provenance": {
                "section": self.section, "page": self.page, "position": self.position,
                "source_file": self.source_file, "cited_references": self.cited_references,
                "resolved_reference": self.resolved_reference,
                "resolution_confidence": self.resolution_confidence,
                "link_method": self.link_method,
                "extraction_method": self.extraction_method,
            },
            "notes": self.notes,
        }
