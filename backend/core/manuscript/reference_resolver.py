"""
reference_resolver.py — resolve a claim's in-text references to artifacts.
==========================================================================

Given the references detected in a claim's sentence and the artifact index of a
bundle, decide which artifact each reference points to, with a method + confidence
("select by citation"). Tiered by fidelity (design §4):

  1. JATS-exact  — the reference's visible text equals an ``<xref>`` text whose
     ``rid`` names a known artifact -> exact, confidence 1.0.
  2. Label-match — the reference's canonical key uniquely matches an artifact
     label -> confidence 0.85; ambiguous (multiple matches) -> candidates only.

Phase 1 ships tiers 1-2 (driven by JATS + the grammar). Phases 2-3 add the
PDF/DOCX label index and data-file (filename) mapping.

Design: docs/manuscript_verifier/XREF_RESOLUTION_DESIGN.md §4.
"""

from __future__ import annotations

from typing import Dict, List, Optional

from .reference_grammar import detect_references
from .reference_types import Artifact, ArtifactRef, ResolutionMethod, ResolvedLink


def _by_id(artifacts: List[Artifact], aid: str) -> Optional[Artifact]:
    for a in artifacts:
        if a.artifact_id == aid:
            return a
    return None


def resolve_one(ref: ArtifactRef, artifacts: List[Artifact],
                xref_text_map: Optional[Dict[str, str]] = None) -> ResolvedLink:
    """Resolve a single detected reference to an artifact (or leave it unresolved)."""
    norm = ref.raw.strip().lower()

    # 1. JATS-exact: the visible <xref> text identifies the target rid directly.
    if xref_text_map and norm in xref_text_map:
        aid = xref_text_map[norm]
        art = _by_id(artifacts, aid)
        return ResolvedLink(reference=ref, artifact_id=aid,
                            home_file=art.home_file if art else "",
                            method=ResolutionMethod.JATS_XREF, confidence=1.0,
                            note="matched JATS <xref> visible text")

    # 2. label-key match against the artifact index.
    matches = [a for a in artifacts if a.key is not None and a.key.matches(ref.key)]
    if len(matches) == 1:
        a = matches[0]
        return ResolvedLink(reference=ref, artifact_id=a.artifact_id, home_file=a.home_file,
                            method=ResolutionMethod.LABEL, confidence=0.85,
                            note="matched artifact label key")
    if len(matches) > 1:
        return ResolvedLink(reference=ref, method=ResolutionMethod.LABEL, confidence=0.4,
                            alternatives=[a.artifact_id for a in matches],
                            note="ambiguous: multiple artifacts match the label")

    return ResolvedLink(reference=ref, method=ResolutionMethod.NONE, confidence=0.0,
                        note="no artifact matched")


def resolve_in_text(text: str, artifacts: List[Artifact],
                    xref_text_map: Optional[Dict[str, str]] = None) -> List[ResolvedLink]:
    """Detect references in `text` (a claim's sentence) and resolve each against the index."""
    return [resolve_one(ref, artifacts, xref_text_map) for ref in detect_references(text)]


def best_link(links: List[ResolvedLink]) -> Optional[ResolvedLink]:
    """The highest-confidence resolved link (an artifact was identified), or None."""
    resolved = [link for link in links if link.resolved]
    if not resolved:
        return None
    return max(resolved, key=lambda link: link.confidence)
