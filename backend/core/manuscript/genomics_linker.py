"""
genomics_linker.py — AUTOMATIC claim -> data linking for gene-level expression claims (T21, genomics leg).
=========================================================================================================

The tabular linker (``claim_data_linker``) matches a claim to value/group COLUMNS of one table.
Gene-level claims are different: the "value" is one ROW of a genes x samples matrix, and the two
groups are sets of SAMPLE COLUMNS defined by sample metadata (tumour type, condition, genotype, ...).
This module does that linking automatically — no per-claim hand-wiring.

A ``GenomicsLinker`` is constructed once from (expression matrix, sample metadata) and is then a
drop-in ``linker`` for ``verify_pipeline.verify_manuscript`` / ``verification_service.run_verification``
(callable with the ``(claim, dataframe, context_text=...)`` protocol, returns a ``LinkResult``).
It resolves, from the claim's own sentence:
  1. the GENE  — by Ensembl gene id (ENSG…), transcript id (ENST…), or gene symbol; auto-detecting
     whether the matrix is indexed by ids or symbols, and using any extra id column / symbol map.
  2. the two GROUPS — by matching the two group phrases named in the claim to the two levels of a
     sample-metadata variable, on WHOLE-WORD token sets (not arbitrary substrings) with light
     biomedical synonym/plural stemming and "subset absorption" so a level that is only part of a
     more specific level (e.g. ``Responder`` inside ``Non-responder``) is not double-counted; with a
     scoring-based disambiguation when several variables match, and a sample-column-name-prefix
     fallback consulted ONLY when no real metadata variable resolves.

It never fabricates a link: when the gene or the grouping is unresolved/ambiguous it returns
``unlinkable``/``ambiguous`` (→ INSUFFICIENT_DATA), and exposes candidates for review. ``link()``
ALWAYS returns a LinkResult (it never raises), so a bad row in a batch cannot abort the run.

IMPORTANT: the matrix must already be on the analysis SCALE the claim's statistic was computed on
(e.g. log2-CPM for RNA-seq). This module links; it does not normalise.

Created: 2026-06-25 IST  (TODO item T21-A3LINK, genomics follow-on; hardened after adversarial review)
"""

from __future__ import annotations

import re
from typing import Dict, List, Optional, Set

from .claim_data_linker import LinkResult
from .verdicts import ClaimDataSpec

_ENSG = re.compile(r"ENS[A-Z]*G\d{6,}(?:\.\d+)?", re.I)   # Ensembl gene id (optionally versioned)
_ENST = re.compile(r"ENS[A-Z]*T\d{6,}(?:\.\d+)?", re.I)   # Ensembl transcript id
_TOKEN = re.compile(r"[A-Za-z0-9][A-Za-z0-9\-.]{1,30}")   # candidate symbol tokens

# light biomedical normalisation so a claim phrase ("primary tumours", "metastases", "knockdown")
# matches a metadata level ("Primary_tumor", "Metastasis", "KO").
_SYNONYM = {
    "metastases": "metastasis", "metastatic": "metastasis", "mets": "metastasis",
    "tumours": "tumor", "tumour": "tumor", "tumors": "tumor", "tumoral": "tumor",
    "controls": "control", "ctrl": "control", "ctl": "control", "untreated": "control",
    "treated": "treatment", "treat": "treatment",
    "responders": "responder", "nonresponders": "nonresponder", "nonresponder": "nonresponder",
    "knockdown": "kd", "knockout": "ko", "wildtype": "wt", "wild": "wt",
    "primaries": "primary",
}

# common English / reporting words that are never a gene of interest (avoid hijacking gene resolution
# on a symbol-indexed matrix). Kept deliberately small to avoid masking real symbols.
_STOP = {"the", "and", "for", "was", "were", "with", "between", "than", "had", "did", "not",
         "all", "two", "one", "group", "groups", "vs", "versus", "higher", "lower", "expressed",
         "expression", "level", "levels", "significantly", "compared", "among", "across", "both",
         "differed", "different", "differentially", "increased", "decreased", "elevated", "reduced",
         "samples", "patients", "cohort", "control", "treatment", "primary", "metastasis"}


def _norm(s) -> str:
    return re.sub(r"[^a-z0-9]+", " ", str(s).lower()).strip()


def _stem(s) -> str:
    return " ".join(_SYNONYM.get(w, w) for w in _norm(s).split())


def _words(s) -> Set[str]:
    return set(_stem(s).split())


def _strip_version(gene_id: str) -> str:
    return gene_id.split(".")[0]


class GenomicsLinker:
    """Automatic gene-level claim linker. Callable as ``linker(claim, dataframe, context_text=...)``."""

    def __init__(self, expr, sample_metadata=None, gene_id_columns: Optional[List[str]] = None,
                 symbol_map: Optional[Dict[str, str]] = None, min_group: int = 3):
        import pandas as pd  # lazy

        self._pd = pd
        self.min_group = min_group

        # ---- gene lookup: normalised id/symbol -> row label in expr.index ----
        self.expr = expr
        self._gene_lookup: Dict[str, object] = {}
        for label in expr.index:
            self._index_gene_key(label, label)
        for col in (gene_id_columns or []):
            if col in expr.columns:
                for label, alt in expr[col].items():
                    self._index_gene_key(alt, label)
        index_set = set(expr.index)
        for sym, gid in (symbol_map or {}).items():
            if gid in index_set:
                self._index_gene_key(sym, gid)

        # is the matrix indexed by symbols (vs Ensembl/transcript ids)? -> only then (or when a
        # symbol_map/id-column was supplied) do we attempt bare-symbol token resolution, which keeps
        # us from hijacking gene resolution off common English words on an id-indexed matrix.
        self._index_is_symbol = not any(_ENSG.fullmatch(str(g)) or _ENST.fullmatch(str(g))
                                        for g in list(expr.index)[:50])
        self._has_symbols = self._index_is_symbol or bool(symbol_map) or bool(gene_id_columns)

        # ---- grouping variables: {var_name: {level: [sample_cols present in expr]}} ----
        self.groupings: Dict[str, Dict[str, List[str]]] = {}
        cols = set(expr.columns)
        if sample_metadata is not None:
            meta = sample_metadata.loc[[i for i in sample_metadata.index if i in cols]]
            for var in meta.columns:
                levels: Dict[str, List[str]] = {}
                for lvl, sub in meta.groupby(meta[var].astype(str)):
                    samples = [s for s in sub.index if s in cols]
                    if str(lvl).strip() and str(lvl) not in ("<?>", "nan", "NaN") and len(samples) >= min_group:
                        levels[str(lvl)] = samples
                if len(levels) >= 2:
                    self.groupings[var] = levels
        # column-name-prefix grouping (e.g. WT1/WT2 vs KO1/KO2) — kept SEPARATE and consulted only
        # as a fallback, so it cannot collide with a correct metadata variable.
        self._prefix_groups = self._prefix_grouping(list(expr.columns))

    # -- gene indexing --------------------------------------------------------
    def _index_gene_key(self, key, row_label) -> None:
        if key is None:
            return
        k = str(key).strip()
        if not k:
            return
        self._gene_lookup[_norm(k)] = row_label
        self._gene_lookup[_norm(_strip_version(k))] = row_label

    def _prefix_grouping(self, columns: List[str]) -> Dict[str, List[str]]:
        groups: Dict[str, List[str]] = {}
        for c in columns:
            m = re.match(r"^([A-Za-z][A-Za-z_]*?)[ _-]*\d+\s*$", str(c))
            if m:
                groups.setdefault(_norm(m.group(1)), []).append(c)
        # require a discriminating prefix of >=2 chars (so single-letter prefixes don't match words)
        return {lvl: s for lvl, s in groups.items() if len(s) >= self.min_group and len(lvl) >= 2}

    # -- resolution -----------------------------------------------------------
    def _resolve_gene(self, context: str):
        # Ensembl gene / transcript id first (unambiguous)
        for rx in (_ENSG, _ENST):
            for m in rx.findall(context or ""):
                row = self._gene_lookup.get(_norm(m)) or self._gene_lookup.get(_norm(_strip_version(m)))
                if row is not None:
                    return row, m
        # bare gene symbols — only attempt when the matrix can actually carry symbols
        if self._has_symbols:
            for tok in _TOKEN.findall(context or ""):
                if tok.lower() in _STOP:
                    continue
                row = self._gene_lookup.get(_norm(tok))
                if row is not None:
                    return row, tok
        return None, None

    def _match_levels(self, levels, ctx_words: Set[str]):
        """Levels whose whole-word stemmed token set is present in ctx, with subset absorption
        (a level whose tokens are a strict subset of another matched level's tokens is dropped —
        it only matched as part of the more specific level, e.g. 'responder' within 'non responder')."""
        cand = []
        for lvl, samples in levels.items():
            toks = {t for t in _stem(lvl).split() if len(t) >= 2}
            if toks and toks <= ctx_words:
                cand.append((lvl, samples, toks))
        kept = [(lvl, s) for lvl, s, toks in cand
                if not any(toks < other for _, _, other in cand)]
        return kept

    def _resolve_groups(self, context: str):
        """Return (var, levelA, levelB, samplesA, samplesB) or None; or ('AMBIGUOUS', candidates).

        Prefers a real metadata variable; the column-prefix fallback is consulted ONLY if no real
        variable yields a clean two-level match. Among real matches, scores by coverage then fewest
        levels, calling it ambiguous only when the top two are genuinely tied.
        """
        ctx_words = _words(context)

        scored = []
        for var, levels in self.groupings.items():
            kept = self._match_levels(levels, ctx_words)
            if len(kept) == 2:
                coverage = len(kept[0][1]) + len(kept[1][1])
                scored.append((coverage, -len(levels), var, kept))

        if not scored:  # fallback: column-name prefixes, only when no metadata variable resolved
            kept = self._match_levels(self._prefix_groups, ctx_words)
            if len(kept) == 2:
                (la, sa), (lb, sb) = kept
                return ("_column_prefix", la, lb, sa, sb)
            return None

        scored.sort(key=lambda s: (s[0], s[1]), reverse=True)
        best = scored[0]
        tied = [s for s in scored if (s[0], s[1]) == (best[0], best[1])]
        if len(tied) > 1:
            # candidates that induce the SAME sample partition are the same grouping under different
            # names (e.g. a title-derived group duplicating a characteristic) -> not ambiguous.
            partitions = {frozenset(frozenset(samples) for _, samples in s[3]) for s in tied}
            if len(partitions) > 1:
                return ("AMBIGUOUS", [f"{s[2]}:{s[3][0][0]}/{s[3][1][0]}" for s in tied])
        var, kept = best[2], best[3]
        (la, sa), (lb, sb) = kept
        return (var, la, lb, sa, sb)

    # -- the linker protocol --------------------------------------------------
    def link(self, claim, dataframe=None, context_text: str = "") -> LinkResult:
        ctx = context_text or getattr(claim, "raw_text", "") or ""
        row, gene_tok = self._resolve_gene(ctx)
        if row is None:
            return LinkResult("unlinkable", reason="no gene id/symbol from the matrix found in the claim")

        grp = self._resolve_groups(ctx)
        if grp is None:
            avail = {v: list(lv.keys()) for v, lv in self.groupings.items()}
            return LinkResult("ambiguous", confidence=0.3,
                              reason="could not match the claim's two groups to a metadata variable",
                              candidates={"available_groupings": avail})
        if grp[0] == "AMBIGUOUS":
            return LinkResult("ambiguous", confidence=0.3,
                              reason="multiple grouping variables match the claim",
                              candidates={"matching_variables": grp[1]})

        var, la, lb, sa, sb = grp

        # guard against a gene symbol that maps to MULTIPLE rows (duplicate index) — never crash
        try:
            values = self.expr.loc[row]
        except KeyError:
            return LinkResult("unlinkable", reason=f"gene row '{row}' not found in matrix")
        if isinstance(values, self._pd.DataFrame):
            return LinkResult("ambiguous", confidence=0.3,
                              reason=f"gene '{gene_tok}' maps to {len(values)} rows (symbol collision)",
                              candidates={"rows": [str(r) for r in values.index[:8]]})

        ga = [float(values[s]) for s in sa]
        gb = [float(values[s]) for s in sb]
        spec = ClaimDataSpec(
            intended_test="independent_t", design_type="two_group",
            groups=[ga, gb], variable_names=[str(gene_tok), var],
            n=len(ga) + len(gb), auto_linked=True, linked_dataset_id=None,
        )
        return LinkResult("linked", spec, 0.9,
                          f"gene {gene_tok} -> row {row}; groups {var}: {la}(n={len(sa)}) vs {lb}(n={len(sb)})")

    __call__ = link
