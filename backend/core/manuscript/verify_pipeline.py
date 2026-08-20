"""
verification-core entry point — verify one manuscript end to end (Django-free).
================================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (§3 shared engine; §5 profile)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T22 orchestrate + T23 profile, as a
         standalone callable — the "verifier-core" the standalone surface/CLI will wrap)

`verify_manuscript(text, dataframe)` chains: extract claims (+coverage) -> per claim:
extraction-gate -> link to data (if provided) -> re-run the authors' test -> verdict, with the
statcheck consistency signal attached as a SECONDARY note. Returns a paper-level
VerificationProfile (verifiability rate, verdict distribution, coverage) plus the mandatory
"what this does / does NOT certify" statement.

Pure-Python orchestration over the manuscript package; cascade/scipy imported lazily via the
re-analysis engine. Not wired to Django persistence (T10) or the REST surface (T24) yet.
"""

from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .claim_extractor import StatisticalClaimExtractor, is_test_claim
from .consistency_adapter import evaluate_consistency
from .reanalysis_engine import verify_claim
from .reference_grammar import detect_references
from .reference_resolver import best_link, resolve_in_text
from .verdicts import ClaimVerdict, ClaimVerificationRequest, Verdict

_ATTEMPTED = {Verdict.VERIFIED, Verdict.DISCREPANT, Verdict.ASSUMPTION_VIOLATED}

CERTIFY_NOTE = (
    "This report checks the internal consistency of the reported statistics and, where raw "
    "data were available, re-runs the authors' tests and audits their assumptions. It does NOT "
    "certify the scientific validity, design, or conclusions of the study. Claims marked "
    "INSUFFICIENT_DATA could not be verified because the underlying data were unavailable or "
    "not linkable. "
    "ASSUMPTION_UNREPORTED means only that the manuscript does not state that a required "
    "assumption was checked — it is a statement about DISCLOSURE, not about the data: the "
    "assumption may well hold, and the result may well be correct. It is raised only when the "
    "paper names its test explicitly; where the design is not stated, no claim is made."
)


@dataclass
class VerificationProfile:
    n_claims: int
    verdict_distribution: Dict[str, int]
    verifiability_rate: float           # fraction of claims we could actually attempt to verify
    coverage: Optional[float]           # extraction coverage (claims_with_p / p-mentions)
    low_coverage: bool
    n_inconsistent_reporting: int       # secondary statcheck signal (checkable AND inconsistent)
    n_checkable: int = 0                 # claims whose p IS recomputable (statcheck denominator)
    n_decision_changing: int = 0         # inconsistencies that flip significance (gross_error)
    n_references_resolved: int = 0       # claims whose cited reference resolved to an artifact/data file
    n_citation_conflicts: int = 0        # claims flagged with a citation-content conflict
    claim_verdicts: List[ClaimVerdict] = field(default_factory=list)
    certify_note: str = CERTIFY_NOTE

    def to_dict(self) -> Dict[str, Any]:
        return {
            "n_claims": self.n_claims,
            "verdict_distribution": self.verdict_distribution,
            "verifiability_rate": self.verifiability_rate,
            "coverage": self.coverage,
            "low_coverage": self.low_coverage,
            "n_inconsistent_reporting": self.n_inconsistent_reporting,
            "n_checkable": self.n_checkable,
            "n_decision_changing": self.n_decision_changing,
            "n_references_resolved": self.n_references_resolved,
            "n_citation_conflicts": self.n_citation_conflicts,
            "certify_note": self.certify_note,
            "claims": [v.to_dict() for v in self.claim_verdicts],
        }


# split on sentence-final punctuation FOLLOWED BY whitespace, so decimal points
# ("p = 0.005") do not split a sentence.
_SENT_BREAK = re.compile(r"(?<=[.!?])\s+")


def _context(text: str, position: int, radius: int = 200) -> str:
    """The sentence containing `position` (so a claim links only to variables named in ITS
    own sentence, not a neighbouring claim's)."""
    start = 0
    for m in _SENT_BREAK.finditer(text):
        if m.start() >= position:
            return text[start:m.start()].strip()
        start = m.end()
    end = len(text)
    return text[start:end].strip() if start <= position < end else \
        text[max(0, position - radius): position + radius]


def verify_manuscript(text: str, dataframe=None, full_text: Optional[str] = None,
                      alpha: float = 0.05, linker=None,
                      methods_text: str = "") -> VerificationProfile:
    """Verify every extractable statistical claim in `text` (single-source case).

    `dataframe` (optional): a single imported table to link claims against (tabular case). When
    omitted, claims with no data resolve to INSUFFICIENT_DATA — which is the expected, honest
    outcome for most papers (the data-availability pilot quantified this). `linker` defaults to
    the tabular linker; a genomics/other linker can be injected.
    """
    return verify_segments([("", text)], dataframe=dataframe, full_text=full_text,
                           alpha=alpha, linker=linker, methods_text=methods_text)


def verify_segments(segments, dataframe=None, full_text: Optional[str] = None,
                    alpha: float = 0.05, linker=None,
                    methods_text: str = "") -> VerificationProfile:
    """Verify claims across MULTIPLE source files, tagging each claim with its home file.

    `segments`: a list of ``(source_file, text)`` — or ``(source_file, text, reference_context)``
    — pairs, e.g. the main manuscript and each supplementary document in an uploaded bundle.
    Claims are extracted per file (so each claim carries its true `source_file` and a file-relative
    position for sentence context), their in-text references are detected and (where an
    artifact_index.ReferenceContext is supplied, e.g. for JATS) resolved to the artifact the author
    points to, then they are verified together and merged into ONE VerificationProfile. This
    replaces concatenate-then-extract, which lost a claim's home-file provenance.
    """
    extractor = StatisticalClaimExtractor()

    # 1. extract per file, tagging home file; keep each claim's own segment text + its file's
    #    reference context (artifacts/xrefs) for cross-reference resolution.
    per_claim_text: List[str] = []           # parallel to `test_claims`: the seg text for _context
    per_claim_ctx: List[Any] = []            # parallel: the claim's file ReferenceContext (or None)
    test_claims: List[Any] = []
    all_claims: List[Any] = []
    full_parts: List[str] = []
    pooled_artifacts: List[Any] = []         # every file's artifacts (a claim may cite another file)
    for seg in segments:
        source_file, seg_text = seg[0], (seg[1] or "")
        ref_ctx = seg[2] if len(seg) > 2 else None
        extraction_method = seg[3] if len(seg) > 3 else "text"   # text | ocr | vision
        if ref_ctx is not None and getattr(ref_ctx, "artifacts", None):
            pooled_artifacts.extend(ref_ctx.artifacts)
        full_parts.append(seg_text)
        seg_claims = extractor.extract(seg_text, section="Results")
        for c in seg_claims:
            c.source_file = source_file or ""
            c.extraction_method = extraction_method
        all_claims.extend(seg_claims)
        for c in seg_claims:
            if is_test_claim(c):
                test_claims.append(c)
                per_claim_text.append(seg_text)
                per_claim_ctx.append(ref_ctx)

    # coverage on the FULL claim set (incl. standalone p) for honest recall; verify only test claims.
    coverage_text = full_text if full_text is not None else "\n\n".join(full_parts)
    summary = extractor.summarize(all_claims, full_text=coverage_text)

    # Renumber sequentially across ALL files: each segment's extractor numbers from C001
    # independently, so without this the same claim_id would collide across files in a bundle.
    for i, c in enumerate(test_claims, 1):
        c.claim_id = f"C{i:03d}"

    if dataframe is not None and linker is None:
        from .claim_data_linker import link_claim_to_table as linker  # lazy (pandas)

    verdicts: List[ClaimVerdict] = []
    n_inconsistent = n_checkable = n_decision_changing = 0
    n_references_resolved = n_citation_conflicts = 0
    for claim, seg_text, ref_ctx in zip(test_claims, per_claim_text, per_claim_ctx):
        sentence = _context(seg_text, getattr(claim, "position", 0))

        # cross-reference resolution: detect the references the author cites in this claim's
        # sentence, and (when an artifact index is available) resolve to the cited artifact.
        ref_notes: List[str] = []
        refs = detect_references(sentence)
        if refs:
            claim.cited_references = [r.raw for r in refs]
            if pooled_artifacts:
                xmap = getattr(ref_ctx, "xref_text_map", None) if ref_ctx is not None else None
                links = resolve_in_text(sentence, pooled_artifacts, xmap)
                resolved = best_link(links)
                resolved_artifacts = sorted({link.artifact_id for link in links if link.resolved})
                if resolved is not None and resolved.reference is not None:
                    claim.resolved_reference = resolved.reference.raw
                    claim.resolution_confidence = resolved.confidence
                    ref_notes.append(
                        f"reference: cited '{resolved.reference.raw}' -> artifact "
                        f"{resolved.artifact_id} in {resolved.home_file or 'this file'} "
                        f"({resolved.method.value}, conf {resolved.confidence:.2f})")
                    if len(resolved_artifacts) > 1:
                        ref_notes.append(
                            f"note: this sentence cites multiple artifacts "
                            f"({', '.join(resolved_artifacts)}); which one backs the data is "
                            f"resolved at linking time")
                else:
                    # no confident resolution — surface ambiguous candidates rather than guess (D4)
                    cands = sorted({a for link in links for a in link.alternatives})
                    if cands:
                        ref_notes.append(
                            f"ambiguous reference {[r.raw for r in refs]}: candidate artifacts "
                            f"{cands} — needs disambiguation")

        # secondary statcheck signal (always available, no raw data needed)
        sig = evaluate_consistency(claim)

        spec = None
        link_reason = ""
        if dataframe is not None:
            lr = linker(claim, dataframe, context_text=sentence)
            if lr is not None and lr.status == "linked":
                spec = lr.data_spec
                if spec is not None:
                    spec.link_confidence = getattr(lr, "confidence", None)
                    link_reason = getattr(lr, "reason", "") or ""

        cv = verify_claim(ClaimVerificationRequest(
            claim=claim, data_spec=spec, alpha=alpha,
            # T17: the assumption-DISCLOSURE audit needs the paper's own text. `seg_text` is this
            # claim's home file, so a claim from a supplement is audited against the supplement.
            manuscript_text=seg_text, methods_text=methods_text or ""))
        cv.claim_text = getattr(claim, "raw_text", "") or cv.claim_text
        cv.notes.extend(ref_notes)

        # surface how the data file was chosen, and citation-content conflicts (D4).
        if "reference-directed" in link_reason or "conflict" in link_reason:
            cv.notes.append(f"data link: {link_reason}")
        conflict_b = link_reason.startswith("reference-directed") and cv.verdict == Verdict.DISCREPANT
        if conflict_b:
            cv.notes.append("citation-content conflict: the data the author cites does NOT "
                            "reproduce the claimed result")

        if cv.resolved_reference:
            n_references_resolved += 1
        if "conflict" in link_reason or conflict_b:
            n_citation_conflicts += 1

        if sig.checkable:
            n_checkable += 1                    # the statcheck-recomputable denominator
            if sig.is_consistent is False:
                n_inconsistent += 1
                if sig.severity == "gross_error":
                    n_decision_changing += 1
                cv.notes.append(f"secondary: reported statistics are internally INCONSISTENT "
                                f"({sig.severity}; recomputed p={sig.computed_p:.3g})")
        verdicts.append(cv)

    dist = Counter(v.verdict.value for v in verdicts)
    attempted = sum(1 for v in verdicts if v.verdict in _ATTEMPTED)
    rate = round(attempted / len(verdicts), 3) if verdicts else 0.0

    return VerificationProfile(
        n_claims=len(verdicts),
        verdict_distribution=dict(dist),
        verifiability_rate=rate,
        coverage=summary.coverage,
        low_coverage=summary.low_coverage,
        n_inconsistent_reporting=n_inconsistent,
        n_checkable=n_checkable,
        n_decision_changing=n_decision_changing,
        n_references_resolved=n_references_resolved,
        n_citation_conflicts=n_citation_conflicts,
        claim_verdicts=verdicts,
    )
