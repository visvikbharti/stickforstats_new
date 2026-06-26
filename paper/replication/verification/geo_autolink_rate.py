#!/usr/bin/env python3
"""
MEASURED AUTO-LINK RATE across the cached GEO datasets (Phase-B automation funnel).
===================================================================================

The genome-scale proof (scale_genomics_verify.py) showed the auto-linker works on ONE dataset
(GSE271517). This measures how far the AUTOMATIC pipeline generalises across the heterogeneous
real GEO datasets in the local cache — the honest "measured auto-link rate" the plan calls for.

For each cached accession it walks a funnel and records WHERE it falls:
  A. loadable expression matrix?         (csv/xlsx; gene index = Ensembl / symbol / transcript+Gene_ID)
  B. series-matrix metadata fetchable?   (geo_metadata)
  C. grouping that ALIGNS to the matrix's sample columns?  (series-matrix titles/GSM overlap, OR
     column-name prefixes like nGD/WT when the grouping is encoded in the column headers)
  D. do gene-level claims AUTO-LINK?     (gene + the two group levels resolve, no hand-wiring)

The per-stage drop-offs ARE the finding (most published datasets are not turn-key auto-linkable).
Auto-link rate at stage D is measured on uniform synthetic phrasing that names the dataset's own
group vocabulary — it measures the LINKER given aligned metadata, not robustness to free-text prose.

Usage (full venv):
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/geo_autolink_rate.py
"""
from __future__ import annotations

import os
import sys
import warnings
from pathlib import Path

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
import django  # noqa: E402

django.setup()

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from core.manuscript.claim_extractor import StatisticalClaimExtractor  # noqa: E402
from core.manuscript.genomics_linker import GenomicsLinker  # noqa: E402
from core.manuscript.geo_metadata import fetch_geo_metadata, align_samples  # noqa: E402

CACHE = Path("/Volumes/My_Passport/stickforstats_corpus/geo_cache")
REPORT = ROOT / "paper/replication/verification/GEO_AUTOLINK_REPORT_2026-06-25.md"
MIN_GROUP = 3
K_CLAIMS = 60
_extractor = StatisticalClaimExtractor()


def _load_matrix(gse_dir: Path):
    """Find + load an expression matrix; return (expr genes×samples, symbol_map, note) or (None,..)."""
    files = [f for f in gse_dir.iterdir()
             if not f.name.startswith(".")           # skip macOS AppleDouble (._*) / .DS_Store sidecars
             and f.name != "filelist.txt" and "series_matrix" not in f.name
             and f.suffix.lower() in (".csv", ".tsv", ".txt", ".xlsx", ".xls")]
    if not files:
        return None, None, "no matrix file (filelist-only)"
    files.sort(key=lambda f: (0 if any(k in f.name.lower() for k in
               ("count", "matrix", "vsd", "expression", "fpkm", "tpm")) else 1, len(f.name)))
    f = files[0]
    try:
        if f.suffix.lower() in (".xlsx", ".xls"):
            df = pd.read_excel(f, index_col=0)
        else:
            df = pd.read_csv(f, index_col=0, sep=None, engine="python")
    except Exception as e:
        return None, None, f"matrix load failed: {str(e)[:60]}"
    df.columns = [str(c).strip() for c in df.columns]
    numeric = df.select_dtypes(include=[np.number]).columns.tolist()
    annot = [c for c in df.columns if c not in numeric]
    if len(numeric) < 2 * MIN_GROUP:
        return None, None, f"too few numeric sample columns ({len(numeric)})"
    expr = df[numeric]
    # gene-symbol map from the first annotation column (e.g. Gene_ID) -> matrix index label
    symbol_map = None
    if annot:
        symbol_map = {str(v): idx for idx, v in df[annot[0]].items() if pd.notna(v)}
    return expr, symbol_map, f"{f.name} ({expr.shape[0]}x{expr.shape[1]}; annot={annot[:2]})"


def _pick_binary(linker):
    """Pick a two-level grouping (level names) from real metadata, else column-name prefixes."""
    def top2(levels):
        ok = [(lvl, s) for lvl, s in levels.items() if len(s) >= MIN_GROUP]
        ok.sort(key=lambda x: -len(x[1]))
        return ok[:2] if len(ok) >= 2 else None
    best = None
    for var, levels in linker.groupings.items():
        t = top2(levels)
        if t and (best is None or len(levels) < best[2]):
            best = (var, [t[0][0], t[1][0]], len(levels))
    if best:
        return best[1], f"metadata var '{best[0]}'"
    t = top2(linker._prefix_groups)
    if t:
        return [t[0][0], t[1][0]], "column-name prefixes"
    return None, "no binary grouping"


def _autolink_rate(linker, gene_tokens, levels):
    la, lb = levels
    linked = 0
    for tok in gene_tokens:
        text = f"Gene {tok} differed between {la} and {lb} (t(20) = 2.00, p = 0.050)."
        claims = _extractor.extract(text, section="Results")
        if claims and linker.link(claims[0], None, context_text=text).status == "linked":
            linked += 1
    return linked / max(1, len(gene_tokens))


def main() -> int:
    accs = sorted([d.name for d in CACHE.iterdir() if d.is_dir()])
    rng = np.random.default_rng(0)
    rows = []
    print(f"measuring auto-link rate across {len(accs)} cached GEO datasets\n" + "=" * 92)
    for gse in accs:
        rec = {"gse": gse, "matrix": "no", "metadata": "no", "grouping": "no",
               "autolink_rate": None, "outcome": "", "detail": ""}
        expr, symbol_map, mnote = _load_matrix(CACHE / gse)
        rec["detail"] = mnote
        if expr is None:
            rec["outcome"] = "A: no usable matrix"
            rows.append(rec)
            print(f"{gse}: A-FAIL — {mnote}")
            continue
        rec["matrix"] = "yes"

        md = fetch_geo_metadata(gse, CACHE, max_bytes=60 * 1024 * 1024)
        rec["metadata"] = "yes" if md.ok else f"no({md.status})"
        if md.ok:
            aligned, ov, anote = align_samples(md.frame, expr.columns)
        else:
            aligned, ov, anote = None, 0.0, md.status

        if aligned is not None:
            linker = GenomicsLinker(expr, sample_metadata=aligned, symbol_map=symbol_map, min_group=MIN_GROUP)
            gsrc = f"series matrix ({anote}, {ov:.0%})"
        else:
            linker = GenomicsLinker(expr, symbol_map=symbol_map, min_group=MIN_GROUP)  # prefix-only fallback
            gsrc = f"no aligned metadata ({anote}); prefix fallback"
        levels, lnote = _pick_binary(linker)
        if levels is None:
            rec["outcome"] = "C: no binary grouping"
            rec["detail"] += f" | {gsrc}; {lnote}"
            rows.append(rec)
            print(f"{gse}: C-FAIL — {gsrc}; {lnote}")
            continue
        rec["grouping"] = f"{lnote}: {levels[0]}/{levels[1]}"

        # gene tokens: prefer symbol_map keys (realistic symbols), else matrix index labels
        pool = list(symbol_map.keys()) if symbol_map else [str(x) for x in expr.index]
        toks = list(rng.choice(pool, size=min(K_CLAIMS, len(pool)), replace=False))
        rate = _autolink_rate(linker, toks, levels)
        rec["autolink_rate"] = rate
        rec["outcome"] = "D: AUTO-LINKED" if rate >= 0.5 else "D: low link rate"
        rec["detail"] += f" | {gsrc}"
        rows.append(rec)
        print(f"{gse}: {rec['outcome']} — rate {rate:.0%} | grouping {rec['grouping']} | {gsrc}")

    # ---- funnel + report ----
    n = len(rows)
    n_mat = sum(r["matrix"] == "yes" for r in rows)
    n_meta = sum(r["metadata"] == "yes" for r in rows)
    n_grp = sum(r["grouping"] != "no" for r in rows)
    n_link = sum((r["autolink_rate"] or 0) >= 0.5 for r in rows)
    print("=" * 92)
    print(f"FUNNEL: cached={n}  loadable-matrix={n_mat}  metadata={n_meta}  aligned-grouping={n_grp}  "
          f"auto-linkable={n_link}")
    print(f"END-TO-END AUTO-LINK RATE (of all cached): {n_link}/{n} = {n_link / n:.0%}  |  "
          f"of datasets with a matrix: {n_link}/{n_mat} = {n_link / max(1, n_mat):.0%}")

    tbl = "\n".join(
        f"| {r['gse']} | {r['matrix']} | {r['metadata']} | {r['grouping']} | "
        f"{('%.0f%%' % (100 * r['autolink_rate'])) if r['autolink_rate'] is not None else '—'} | "
        f"{r['outcome']} |" for r in rows)
    REPORT.write_text(
        "# Measured auto-link rate across cached GEO datasets\n\n"
        "_Generated 2026-06-25 by `geo_autolink_rate.py`._\n\n"
        "How far the AUTOMATIC genomics pipeline (gene + group resolution, series-matrix grouping) "
        "generalises across heterogeneous real GEO datasets — the honest Phase-B automation funnel.\n\n"
        "## Funnel\n\n"
        f"- Cached accessions: **{n}**\n"
        f"- A. loadable expression matrix: **{n_mat}/{n}** ({n_mat / n:.0%})\n"
        f"- B. series-matrix metadata fetchable: **{n_meta}/{n}**\n"
        f"- C. grouping aligned to the matrix's sample columns: **{n_grp}/{n}**\n"
        f"- D. gene claims auto-link (>=50%): **{n_link}/{n}**\n\n"
        f"**End-to-end auto-link rate: {n_link}/{n} = {n_link / n:.0%}** of all cached accessions; "
        f"**{n_link}/{n_mat} = {n_link / max(1, n_mat):.0%}** of those with a usable matrix.\n\n"
        "## Per-dataset\n\n"
        "| GSE | matrix | metadata | grouping | link rate | outcome |\n"
        "|---|---|---|---|---|---|\n" + tbl + "\n\n"
        "## Interpretation (honest)\n\n"
        "The drop-offs are the finding. Most cached accessions are NOT turn-key auto-linkable: many\n"
        "deposit only a `filelist.txt` (raw archives, no processed matrix), a supplementary file can be\n"
        "unreadable, the processed matrix's sample-column names need not match the series-matrix sample\n"
        "ids (alignment gap), and the grouping is sometimes encoded only in column-name conventions\n"
        "(e.g. `nGD`/`WT`) rather than machine-readable characteristics. Where a matrix + an aligned\n"
        "(or column-encoded) binary grouping exist, gene-level claims auto-link reliably. This compound\n"
        "rarity is exactly why INSUFFICIENT_DATA dominates the literature-scale picture — and why the\n"
        "Phase-B headline is a MEASUREMENT of verifiability, not an assumption of it. (Link rate at D is\n"
        "measured on uniform synthetic phrasing that uses each dataset's own group vocabulary.)\n"
    )
    print(f"\nwrote {REPORT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
