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
from .verdicts import ClaimVerdict, ClaimVerificationRequest, Verdict

_ATTEMPTED = {Verdict.VERIFIED, Verdict.DISCREPANT, Verdict.ASSUMPTION_VIOLATED}

CERTIFY_NOTE = (
    "This report checks the internal consistency of the reported statistics and, where raw "
    "data were available, re-runs the authors' tests and audits their assumptions. It does NOT "
    "certify the scientific validity, design, or conclusions of the study. Claims marked "
    "INSUFFICIENT_DATA could not be verified because the underlying data were unavailable or "
    "not linkable."
)


@dataclass
class VerificationProfile:
    n_claims: int
    verdict_distribution: Dict[str, int]
    verifiability_rate: float           # fraction of claims we could actually attempt to verify
    coverage: Optional[float]           # extraction coverage (claims_with_p / p-mentions)
    low_coverage: bool
    n_inconsistent_reporting: int       # secondary statcheck signal
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
                      alpha: float = 0.05, linker=None) -> VerificationProfile:
    """Verify every extractable statistical claim in `text`.

    `dataframe` (optional): a single imported table to link claims against (tabular case). When
    omitted, claims with no data resolve to INSUFFICIENT_DATA — which is the expected, honest
    outcome for most papers (the data-availability pilot quantified this). `linker` defaults to
    the tabular linker; a genomics/other linker can be injected.
    """
    extractor = StatisticalClaimExtractor()
    all_claims = extractor.extract(text, section="Results")
    # coverage is computed on the FULL claim set (incl. standalone p-values) so recall is honest;
    # but we VERIFY only genuine statistical-test claims (precision — drop N/CI/ES/standalone-p noise).
    summary = extractor.summarize(all_claims, full_text=full_text or text)
    claims = [c for c in all_claims if is_test_claim(c)]
    for i, c in enumerate(claims, 1):
        if not getattr(c, "claim_id", ""):
            c.claim_id = f"C{i:03d}"

    if dataframe is not None and linker is None:
        from .claim_data_linker import link_claim_to_table as linker  # lazy (pandas)

    verdicts: List[ClaimVerdict] = []
    n_inconsistent = 0
    for claim in claims:
        # secondary statcheck signal (always available, no raw data needed)
        sig = evaluate_consistency(claim)

        spec = None
        if dataframe is not None:
            lr = linker(claim, dataframe, context_text=_context(text, getattr(claim, "position", 0)))
            spec = lr.data_spec if lr.status == "linked" else None

        cv = verify_claim(ClaimVerificationRequest(claim=claim, data_spec=spec, alpha=alpha))

        if sig.checkable and sig.is_consistent is False:
            n_inconsistent += 1
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
        claim_verdicts=verdicts,
    )
