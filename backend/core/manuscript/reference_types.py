"""
reference_types.py — shared vocabulary for cross-reference resolution.
======================================================================

The data model for mapping an author's in-text references ("Supplementary Table
S3", "Fig. 2B", "Additional File 1") to the actual artifact (table / figure /
dataset) across an uploaded bundle, so a statistical claim can be checked against
the data the author *points to* — "select by citation, verify by content".

Pure module: stdlib only (dataclasses, enum, typing). No Django / numpy / scipy,
so it loads anywhere and is unit-testable in isolation. These types are the
contract between the JATS parser, the reference grammar, the artifact index, the
resolver, and the verdict model.

Design: docs/manuscript_verifier/XREF_RESOLUTION_DESIGN.md (§3 graph, §6 model).
Status: Phase-0 foundations — defined now, populated by later phases.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional


class ArtifactKind(str, Enum):
    """What an in-text reference can point to. ``str`` mixin -> JSON-friendly."""

    TABLE = "table"
    FIGURE = "figure"
    SUPPLEMENTARY = "supplementary"   # supplementary-material / additional file
    DATASET = "dataset"               # a data file / source-data
    EQUATION = "equation"
    SECTION = "section"
    UNKNOWN = "unknown"


class ResolutionMethod(str, Enum):
    """How a claim->artifact link was established (descending confidence)."""

    JATS_XREF = "jats_xref"            # machine-readable <xref rid> -> <... id> (exact)
    LABEL = "label"                   # normalized in-text label matched an artifact label
    FILENAME = "filename"             # mapped to an uploaded data file by name/convention
    CONTENT_FALLBACK = "content_fallback"  # no reference resolved; matched by column content
    NONE = "none"                     # unresolved


@dataclass(frozen=True)
class ReferenceKey:
    """Canonical, comparable form of a reference label.

    "Supplementary Table S3", "Suppl. Table 3", "Table S3" all normalize to
    ``ReferenceKey(kind=TABLE, number=3, supplementary=True)`` so an in-text
    reference and an artifact label can be matched regardless of surface form.
    """

    kind: ArtifactKind = ArtifactKind.UNKNOWN
    number: Optional[int] = None        # the primary number (Table 3 -> 3); None if unnumbered
    sub: str = ""                       # subpanel/suffix, e.g. "B" in "Fig 2B", "a" in "Table 3a"
    supplementary: bool = False         # S/Supp/Supplementary/Additional
    extended: bool = False              # "Extended Data" (Nature family) etc.

    def matches(self, other: "ReferenceKey") -> bool:
        """True if two keys refer to the same artifact (sub is optional on either side)."""
        if self.kind != other.kind or self.number != other.number:
            return False
        if self.supplementary != other.supplementary:
            return False
        # "Extended Data Table 2" (extended) must not match a plain "Table 2" — the flag exists
        # precisely to distinguish these online-only artifacts.
        if self.extended != other.extended:
            return False
        # a bare "Table 3" reference matches "Table 3a" artifact and vice versa
        if self.sub and other.sub and self.sub.lower() != other.sub.lower():
            return False
        return True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "kind": self.kind.value, "number": self.number, "sub": self.sub,
            "supplementary": self.supplementary, "extended": self.extended,
        }


@dataclass
class ArtifactRef:
    """An in-text reference token detected in a claim's sentence (the *citing* side)."""

    raw: str                                  # the verbatim token, e.g. "Supplementary Table S3"
    key: ReferenceKey = field(default_factory=ReferenceKey)
    char_start: int = -1                      # offset within the source text (-1 if unknown)
    char_end: int = -1
    source_file: str = ""                     # the file the citing sentence lives in

    def to_dict(self) -> Dict[str, Any]:
        return {
            "raw": self.raw, "key": self.key.to_dict(),
            "char_start": self.char_start, "char_end": self.char_end,
            "source_file": self.source_file,
        }


@dataclass
class Artifact:
    """An addressable artifact the text can point to (the *target* side)."""

    artifact_id: str                          # stable id: jats id (e.g. "T3") or a synthesized key
    kind: ArtifactKind = ArtifactKind.UNKNOWN
    label: str = ""                           # human label, e.g. "Table 3"
    caption: str = ""
    key: ReferenceKey = field(default_factory=ReferenceKey)
    home_file: str = ""                       # which uploaded file this artifact lives in
    jats_id: str = ""                         # the JATS @id, if from XML (exact resolution)
    href: str = ""                            # xlink:href / external filename (supplementary/media)
    # for data artifacts:
    columns: List[str] = field(default_factory=list)
    sheet: str = ""
    label_confidence: float = 1.0             # how sure we are about the label (OCR/caption noise)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "artifact_id": self.artifact_id, "kind": self.kind.value, "label": self.label,
            "caption": self.caption[:200], "key": self.key.to_dict(), "home_file": self.home_file,
            "jats_id": self.jats_id, "href": self.href, "columns": self.columns,
            "sheet": self.sheet, "label_confidence": self.label_confidence,
        }


@dataclass
class ResolvedLink:
    """The resolver's output: a claim's reference resolved to an artifact (or not)."""

    claim_id: str = ""
    reference: Optional[ArtifactRef] = None
    artifact_id: str = ""                      # "" if unresolved
    home_file: str = ""                        # the resolved artifact's file
    method: ResolutionMethod = ResolutionMethod.NONE
    confidence: float = 0.0
    alternatives: List[str] = field(default_factory=list)  # other candidate artifact_ids (ambiguous)
    note: str = ""

    @property
    def resolved(self) -> bool:
        return bool(self.artifact_id)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "claim_id": self.claim_id,
            "reference": self.reference.to_dict() if self.reference else None,
            "artifact_id": self.artifact_id, "home_file": self.home_file,
            "method": self.method.value, "confidence": self.confidence,
            "alternatives": self.alternatives, "note": self.note,
        }
