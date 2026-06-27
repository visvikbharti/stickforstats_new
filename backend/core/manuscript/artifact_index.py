"""
artifact_index.py — build the per-file index of addressable artifacts.
======================================================================

For each ingested file, produce the list of ``Artifact``s the manuscript text
can point to (tables, figures, supplementary items, datasets), each with a
canonical ``ReferenceKey`` so an in-text reference can be matched to it.

Phase 1: the JATS path (structured, exact). Phase 2 adds caption-based detection
for PDF/DOCX and data-file (sheet/column) artifacts.

Design: docs/manuscript_verifier/XREF_RESOLUTION_DESIGN.md §6.2.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List

from .reference_grammar import parse_reference
from .reference_types import Artifact, ArtifactKind, ReferenceKey

_KIND_VALUES = {k.value for k in ArtifactKind}

# A caption / artifact DEFINITION (not an in-text reference): a Table/Figure label at the START
# of a line, followed by a "." or ":" separator and caption text. Line-anchored + the separator
# requirement is what distinguishes "Table 3. Baseline characteristics" (a caption) from
# "as shown in Table 3" (a reference, which has no leading line break + separator).
_CAPTION_RE = re.compile(
    r"(?m)^[\s>|]*"
    r"(?P<prefix>(?:supplementary|supplemental|additional)\s+)?"
    r"(?P<kind>tables?|figures?|fig\.?)\s+"
    r"(?P<num>S?-?\d+[A-Za-z]?)"
    r"\s*[.:]\s+\S",
    re.IGNORECASE,
)


@dataclass
class ReferenceContext:
    """A file's resolvable artifacts + its JATS xref text map, handed to the resolver."""

    artifacts: List[Artifact] = field(default_factory=list)
    xref_text_map: Dict[str, str] = field(default_factory=dict)


def from_jats(doc, home_file: str = "") -> List[Artifact]:
    """Build Artifacts from a parsed JatsDoc's ``artifacts`` map (id -> {kind,label,caption,href})."""
    out: List[Artifact] = []
    for aid, a in (getattr(doc, "artifacts", None) or {}).items():
        kind_str = a.get("kind", "unknown")
        kind = ArtifactKind(kind_str) if kind_str in _KIND_VALUES else ArtifactKind.UNKNOWN
        label = a.get("label", "") or ""
        key = parse_reference(label) or ReferenceKey(kind=kind)
        out.append(Artifact(
            artifact_id=aid, kind=kind, label=label, caption=a.get("caption", "") or "",
            key=key, home_file=home_file, jats_id=aid, href=a.get("href", "") or "",
        ))
    return out


def jats_xref_text_map(doc) -> Dict[str, str]:
    """Map an xref's normalized visible text (e.g. "table 3") -> the target artifact id.

    Lets the resolver upgrade a text match to an EXACT one: if the author's in-text reference
    string equals an ``<xref>``'s visible text, we know its ``rid`` and hence the exact artifact.
    Only xrefs whose rid is a known artifact are included.
    """
    artifacts = getattr(doc, "artifacts", None) or {}
    out: Dict[str, str] = {}
    for x in getattr(doc, "xrefs", None) or []:
        rid = x.get("rid", "")
        text = (x.get("text", "") or "").strip().lower()
        if rid and rid in artifacts and text:
            out.setdefault(text, rid)
    return out


def context_from_jats(doc, home_file: str = "") -> ReferenceContext:
    """Build the full resolver context (artifacts + xref text map) for a JATS document."""
    return ReferenceContext(artifacts=from_jats(doc, home_file), xref_text_map=jats_xref_text_map(doc))


def build_index_from_text(text: str, home_file: str = "") -> List[Artifact]:
    """Detect Table/Figure captions in flattened PDF/DOCX/LaTeX text -> Artifacts.

    The non-JATS target index: each line-anchored "Table 3. <caption>" /
    "Supplementary Figure S1: <caption>" becomes an addressable Artifact with a normalized
    ``ReferenceKey``, so an in-text reference can be matched to it by the label tier.
    Deduplicated by canonical key (a caption may be detected once per page).
    """
    out: List[Artifact] = []
    seen = set()
    for m in _CAPTION_RE.finditer(text or ""):
        label = re.sub(r"\s+", " ", f"{m.group('prefix') or ''}{m.group('kind')} {m.group('num')}").strip()
        key = parse_reference(label)
        if key is None:
            continue
        end = m.end() - 1  # the \S we required is the first caption char
        nl = text.find("\n", end)
        caption = text[end: nl if nl != -1 else len(text)].strip()[:300]
        aid = f"{home_file}:{key.kind.value}:{'S' if key.supplementary else ''}{key.number}{key.sub}"
        if aid in seen:
            continue
        seen.add(aid)
        out.append(Artifact(artifact_id=aid, kind=key.kind, label=label, caption=caption,
                            key=key, home_file=home_file, label_confidence=0.9))
    return out


def context_from_text(text: str, home_file: str = "") -> ReferenceContext:
    """Build a resolver context for a non-JATS file (caption-derived artifacts; no xref map)."""
    return ReferenceContext(artifacts=build_index_from_text(text, home_file))
