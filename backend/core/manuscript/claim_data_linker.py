"""
T21-A3LINK — link a statistical claim to columns/groups in an imported table.
==============================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (A3; the XL blocker A4 is gated on)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T21-A3LINK; deps T10/T11)

The genuinely hard, partly-manual step: turn a StatisticalClaim + a fetched dataset into the
concrete (test, group-arrays / x-y) spec the re-analysis engine needs. We match the claim's
*context text* (the sentence around it) against column names to choose the value and grouping
variables, then build a ClaimDataSpec. When the match is not confident we return ``ambiguous``
with candidate columns for a human-in-the-loop review — we NEVER fabricate a link (plan §8).
``auto_link_rate`` is meant to be MEASURED, not assumed.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import pandas as pd

from .test_resolver import resolve_test
from .verdicts import ClaimDataSpec


@dataclass
class LinkResult:
    status: str                       # 'linked' | 'ambiguous' | 'unlinkable'
    data_spec: Optional[ClaimDataSpec] = None
    confidence: float = 0.0
    reason: str = ""
    candidates: Dict[str, Any] = field(default_factory=dict)   # for human review when ambiguous


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def _mentions(text_norm: str, colname: str) -> bool:
    n = _norm(colname)
    return bool(n) and n in text_norm


def _numeric_cols(df: pd.DataFrame) -> List[str]:
    return [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]


def _level_cols(df: pd.DataFrame, lo: int, hi: int) -> List[str]:
    """Columns usable as a grouping factor with between `lo` and `hi` distinct levels."""
    out = []
    for c in df.columns:
        nun = df[c].nunique(dropna=True)
        if lo <= nun <= hi and not (pd.api.types.is_numeric_dtype(df[c]) and nun > 2):
            out.append(c)
    return out


def _pick(mentioned: List[str], fallback_pool: List[str]) -> Optional[str]:
    """A column is confidently chosen if exactly one is mentioned, or exactly one exists."""
    if len(mentioned) == 1:
        return mentioned[0]
    if not mentioned and len(fallback_pool) == 1:
        return fallback_pool[0]
    return None


def link_claim_to_table(claim, df: pd.DataFrame, context_text: Optional[str] = None) -> LinkResult:
    """Link `claim` to `df`. `context_text` is the sentence/paragraph around the claim
    (the orchestrator supplies it from the manuscript; defaults to the claim's raw_text)."""
    tr = resolve_test(claim)
    if not tr.resolved:
        return LinkResult("unlinkable", reason=f"no re-runnable test: {tr.reason}")

    text = _norm(context_text or getattr(claim, "raw_text", "") or "")
    numeric = _numeric_cols(df)

    # ---- two-group / nonparametric two-group ----
    if tr.intended_test in ("independent_t", "welch_t", "paired_t", "mann_whitney_u"):
        groups2 = _level_cols(df, 2, 2)
        val = _pick([c for c in numeric if _mentions(text, c)], numeric)
        grp = _pick([c for c in groups2 if _mentions(text, c)], groups2)
        if val and grp:
            levels = list(pd.Series(df[grp].dropna().unique()))[:2]
            arrays = [df.loc[df[grp] == lv, val].dropna().astype(float).tolist() for lv in levels]
            spec = ClaimDataSpec(intended_test=tr.intended_test, design_type="two_group",
                                 groups=arrays, variable_names=[val, grp, *map(str, levels)],
                                 n=int(df[val].notna().sum()), auto_linked=True)
            conf = 0.9 if (_mentions(text, val) and _mentions(text, grp)) else 0.55
            return LinkResult("linked", spec, conf,
                              f"value '{val}' x group '{grp}' levels {list(map(str, levels))}")
        return LinkResult("ambiguous", confidence=0.3,
                          reason="could not confidently pick one value + one 2-level group",
                          candidates={"numeric": numeric, "two_level_groups": groups2})

    # ---- correlation ----
    if tr.intended_test in ("pearson", "spearman", "kendall"):
        ment = [c for c in numeric if _mentions(text, c)]
        pair = ment[:2] if len(ment) >= 2 else (numeric[:2] if len(numeric) == 2 else None)
        if pair:
            x, y = pair
            spec = ClaimDataSpec(intended_test=tr.intended_test, design_type="correlation",
                                 x=df[x].dropna().astype(float).tolist(),
                                 y=df[y].dropna().astype(float).tolist(),
                                 variable_names=[x, y], auto_linked=True)
            return LinkResult("linked", spec, 0.9 if len(ment) >= 2 else 0.5,
                              f"correlation '{x}' x '{y}'")
        return LinkResult("ambiguous", confidence=0.3,
                          reason="need two mentioned numeric columns for a correlation",
                          candidates={"numeric": numeric})

    # ---- k-group (ANOVA / Kruskal) ----
    if tr.intended_test in ("one_way_anova", "kruskal_wallis"):
        kcols = _level_cols(df, 3, 12)
        val = _pick([c for c in numeric if _mentions(text, c)], numeric)
        grp = _pick([c for c in kcols if _mentions(text, c)], kcols)
        if val and grp:
            levels = list(pd.Series(df[grp].dropna().unique()))
            arrays = [df.loc[df[grp] == lv, val].dropna().astype(float).tolist() for lv in levels]
            spec = ClaimDataSpec(intended_test=tr.intended_test, design_type="k_group",
                                 groups=arrays, variable_names=[val, grp], auto_linked=True)
            return LinkResult("linked", spec, 0.8, f"ANOVA '{val}' x '{grp}' ({len(levels)} groups)")
        return LinkResult("ambiguous", confidence=0.3,
                          reason="could not confidently pick one value + one k-level group",
                          candidates={"numeric": numeric, "k_level_groups": kcols})

    return LinkResult("unlinkable", reason=f"linking for '{tr.intended_test}' not implemented yet")
