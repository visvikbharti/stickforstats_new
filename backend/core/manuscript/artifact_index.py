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

from dataclasses import dataclass, field
from typing import Dict, List

from .reference_grammar import parse_reference
from .reference_types import Artifact, ArtifactKind, ReferenceKey

_KIND_VALUES = {k.value for k in ArtifactKind}


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
