"""
reference_grammar.py — normalize in-text references to a canonical key.
=======================================================================

Maps the wildly inconsistent surface forms an author uses ("Table 3",
"Supplementary Table S3", "Suppl. Table 3", "Fig. 2B", "Additional File 1",
"Extended Data Figure 2") to a comparable ``ReferenceKey`` so an in-text
reference and an artifact label can be matched regardless of spelling.

Phase 1 covers the common biomedical forms (enough to drive exact JATS
resolution); Phase 2 hardens it against a labeled corpus and adds publisher
supplement-filename heuristics. Deterministic, no LLM (privacy + reproducibility,
decision D5).

Design: docs/manuscript_verifier/XREF_RESOLUTION_DESIGN.md §5.
"""

from __future__ import annotations

import re
from typing import List, Optional

from .reference_types import ArtifactKind, ArtifactRef, ReferenceKey

# kind word (singular/abbreviated/plural) -> canonical kind
_KIND = {
    "table": ArtifactKind.TABLE, "tab": ArtifactKind.TABLE,
    "figure": ArtifactKind.FIGURE, "fig": ArtifactKind.FIGURE,
    "dataset": ArtifactKind.DATASET, "data": ArtifactKind.DATASET,
    "file": ArtifactKind.SUPPLEMENTARY,
    "equation": ArtifactKind.EQUATION, "eq": ArtifactKind.EQUATION,
}

# supplementary / online-only prefixes
_SUPP_PREFIX = re.compile(r"^(supplementary|supplemental|suppl|supp|additional)$", re.I)
_EXTENDED_PREFIX = re.compile(r"^(extended\s+data|source\s+data)$", re.I)

# one reference token. The prefix and the "S" before the number BOTH signal supplementary.
_REF = re.compile(
    r"\b(?P<prefix>supplementary|supplemental|suppl\.?|supp\.?|additional|extended\s+data|source\s+data)?\s*"
    r"(?P<kind>tables?|tab\.?|figures?|figs?\.?|fig\.?|datasets?|data|files?|equations?|eqs?\.?|eq\.?)\s*"
    r"(?P<sprefix>S-?)?(?P<num>\d+)(?P<sub>[A-Za-z])?\b",
    re.IGNORECASE,
)


def _kind_of(word: str) -> ArtifactKind:
    w = word.lower().rstrip(".").rstrip("s")  # "figures" -> "figure", "figs" -> "fig"
    if w in ("fig", "figs"):
        w = "fig"
    return _KIND.get(w, _KIND.get(w.rstrip("s"), ArtifactKind.UNKNOWN))


def _key_from_match(m: "re.Match") -> Optional[ReferenceKey]:
    kind = _kind_of(m.group("kind"))
    if kind is ArtifactKind.UNKNOWN:
        return None
    prefix = (m.group("prefix") or "").strip()
    supplementary = bool(_SUPP_PREFIX.match(prefix)) or bool(m.group("sprefix")) \
        or kind is ArtifactKind.SUPPLEMENTARY
    extended = bool(_EXTENDED_PREFIX.match(prefix))
    try:
        number = int(m.group("num"))
    except (TypeError, ValueError):
        return None
    sub = (m.group("sub") or "").strip()
    return ReferenceKey(kind=kind, number=number, sub=sub,
                        supplementary=supplementary, extended=extended)


def parse_reference(text: str) -> Optional[ReferenceKey]:
    """Parse a single reference/label string (e.g. an artifact's ``<label>`` or a detected
    token) into a canonical ``ReferenceKey``. Returns None if it isn't a recognizable reference."""
    if not text:
        return None
    m = _REF.search(text)
    return _key_from_match(m) if m else None


def detect_references(text: str) -> List[ArtifactRef]:
    """Find every in-text reference token in a span of text (e.g. a claim's sentence).

    Returns one ``ArtifactRef`` per match, with its canonical key and character span.
    """
    out: List[ArtifactRef] = []
    if not text:
        return out
    for m in _REF.finditer(text):
        key = _key_from_match(m)
        if key is None:
            continue
        out.append(ArtifactRef(raw=m.group(0).strip(), key=key,
                               char_start=m.start(), char_end=m.end()))
    return out
