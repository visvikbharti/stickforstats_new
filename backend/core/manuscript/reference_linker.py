"""
reference_linker.py — reference-directed data-file selection (Phase 3).
=======================================================================

The payoff of cross-reference resolution: when a claim cites "Supplementary
Table S3" / "Additional File 2", use that pointer to choose WHICH uploaded data
table to re-run against — instead of guessing by column content alone. Then:

  - reference-directed: the cited data file links and re-runs -> high trust.
  - content fallback: no cited file matched -> try every table by content, but
    if the author DID cite a data file and it didn't match while another did,
    that is a citation-content CONFLICT (surfaced, never silently overridden — D4).

This wraps the column-matching ``claim_data_linker.link_claim_to_table`` with
file selection; it never fabricates a link (the underlying linker still returns
``ambiguous``/``unlinkable`` honestly).

Design: docs/manuscript_verifier/XREF_RESOLUTION_DESIGN.md §4; workplan Phase 3.
"""

from __future__ import annotations

from typing import Any, List, Optional, Tuple

from .reference_grammar import parse_reference, parse_supplement_filename


def _basename(name: str) -> str:
    return (name or "").rsplit("/", 1)[-1].lower()


def make_reference_aware_linker(dataframes: List[Tuple[str, Any]], artifacts: Optional[List[Any]] = None):
    """Build a claim->data linker that prefers the data file the author cites.

    Args:
        dataframes: ``[(filename, DataFrame), ...]`` — every uploaded data table.
        artifacts: pooled ``Artifact``s (e.g. from JATS) so a cited reference that resolved to an
            artifact with an external ``href`` (``<media href="mmc1.xlsx">``) can select that file.

    Returns a callable ``linker(claim, _ignored_df, context_text="")`` matching the contract
    ``verify_pipeline`` expects (the second arg is ignored — this linker owns all the tables).
    Returns None if there are no data files.
    """
    if not dataframes:
        return None
    from .claim_data_linker import link_claim_to_table  # lazy (pandas)

    artifacts = artifacts or []
    files = [(name, df, parse_supplement_filename(name)) for name, df in dataframes]

    def _target_files(claim) -> List[Tuple[str, Any, str]]:
        """The data files the claim's references point to, with the cited reference (raw string)
        that pointed there. Ordered, de-duped by filename."""
        cited_pairs = [(raw, parse_reference(raw)) for raw in (getattr(claim, "cited_references", []) or [])]
        cited_pairs = [(raw, k) for raw, k in cited_pairs if k is not None]
        if not cited_pairs:
            return []
        targets: List[Tuple[str, Any, str]] = []

        def add(name, df, raw):
            if all(name != n for n, _, _ in targets):
                targets.append((name, df, raw))

        # (a) strongest: a cited reference resolved to an artifact whose href names a data file.
        for raw, ck in cited_pairs:
            for a in artifacts:
                akey = getattr(a, "key", None)
                href = getattr(a, "href", "")
                if akey is not None and href and akey.matches(ck):
                    hb = _basename(href)
                    for name, df, _ in files:
                        if _basename(name) == hb:
                            add(name, df, raw)
        # (b) a cited reference key matches a data file's filename convention.
        for name, df, fkey in files:
            if fkey is None:
                continue
            for raw, ck in cited_pairs:
                if fkey.matches(ck):
                    add(name, df, raw)
                    break
        return targets

    def linker(claim, _ignored_single_df, context_text: str = ""):
        def _try_link(df):
            # a malformed/degenerate table must not sink the whole run (matches make_multitable_linker).
            try:
                return link_claim_to_table(claim, df, context_text=context_text)
            except Exception:
                return None

        targets = _target_files(claim)
        target_names = {n for n, _, _ in targets}

        # 1. reference-directed: try the cited data file(s) first.
        for name, df, matched_ref in targets:
            lr = _try_link(df)
            if lr is not None and lr.status == "linked" and lr.data_spec is not None:
                lr.data_spec.source_file = name
                lr.data_spec.linked_dataset_id = name
                # carry the citation that directed this link, even when selection was by filename
                # convention (so verdict.resolved_reference isn't blank for a citation-directed link).
                lr.data_spec.resolved_reference = getattr(claim, "resolved_reference", "") or matched_ref
                lr.reason = f"reference-directed: the author's citation '{matched_ref}' selected '{name}'"
                return lr

        # 2. content fallback: try every table by column content (skip already-tried targets).
        fallback = None
        for name, df, _ in files:
            if name in target_names:
                continue
            lr = _try_link(df)
            if lr is not None and lr.status == "linked" and lr.data_spec is not None:
                lr.data_spec.source_file = name
                lr.data_spec.linked_dataset_id = name
                if target_names:
                    lr.reason = (f"citation-content conflict: the author cites a data file that did "
                                 f"not match this claim; it reproduces from '{name}' instead")
                else:
                    lr.reason = f"content match: '{name}'"
                return lr
            fallback = fallback or lr
        return fallback

    return linker
