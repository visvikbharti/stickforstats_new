#!/usr/bin/env python3
"""
prepare_osf_deposit.py — bundle the census paper's DERIVED data + scripts for OSF.
==================================================================================

The census paper needs a citable data archive (the journal's Data-Availability
requirement). You do NOT need to upload the ~3.2 GB raw JATS corpus — it is
re-fetchable from PMC by ``fetch_corpus``. This script collects only the small
DERIVED artifacts that reproduce every number in the paper, plus the analysis
scripts and reports, into ``paper/census_paper/osf_deposit/`` with a MANIFEST.md
(file list, sizes, MD5s, provenance). Drag that folder into the SAME OSF project
as the pre-registration; cite the OSF DOI in the paper.

Run:  python paper/census_paper/prepare_osf_deposit.py
(Mount /Volumes/My_Passport first to include the ledger; without it, the script
still bundles the in-repo scripts/reports/figures and tells you what is missing.)
"""
from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRIVE = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
VERIF = ROOT / "paper/replication/verification"
OUT = ROOT / "paper/census_paper/osf_deposit"

# DERIVED data (small) that reproduces the paper's numbers. Re-fetchable raw corpus is excluded.
DERIVED = [
    DRIVE / "census_census_corpus_v2_2026-06-25.jsonl",     # per-paper ledger (10,103 rows)
    DRIVE / "flagged_inconsistencies.jsonl",                # the 333 flagged claims
    Path("/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25/fetch_stats.json"),
]
SCRIPTS = ["census_jats.py", "census_ipw.py", "oa_pilot.py", "large_census.py",
           "adjudicate_inconsistencies.py", "inspect_inconsistencies.py", "make_census_figures.py",
           "eval_vs_statcheck.py", "REPRODUCTION.md"]
REPORTS = ["CENSUS_REPORT_LARGE_2026-06-25.md", "FP_VALIDATION_REPORT_2026-06-25.md",
           "CENSUS_IPW_REPORT_2026-06-26.md", "CENSUS_OA_PILOT_REPORT_2026-06-26.md",
           "SCALE_REPORT_2026-06-25.md", "GEO_AUTOLINK_REPORT_2026-06-25.md"]


def _md5(p: Path) -> str:
    h = hashlib.md5()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _copy(src: Path, dst_dir: Path, rows: list, missing: list):
    if not src.exists():
        missing.append(str(src))
        return
    dst_dir.mkdir(parents=True, exist_ok=True)
    dst = dst_dir / src.name
    shutil.copy2(src, dst)
    rows.append((dst.relative_to(OUT).as_posix(), src.stat().st_size, _md5(dst)))


def main() -> int:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    rows: list = []
    missing: list = []

    for src in DERIVED:
        _copy(src, OUT / "data", rows, missing)
    for name in SCRIPTS:
        _copy(VERIF / name, OUT / "scripts", rows, missing)
    for name in REPORTS:
        _copy(VERIF / name, OUT / "reports", rows, missing)
    figdir = VERIF / "figures"
    if figdir.exists():
        for fig in sorted(figdir.glob("*.png")) + sorted(figdir.glob("*.svg")):
            _copy(fig, OUT / "figures", rows, missing)

    total_mb = sum(s for _, s, _ in rows) / (1024 * 1024)
    lines = [
        "# OSF deposit — census paper derived data + code",
        "",
        "Derived data, analysis scripts, reports, and figures that reproduce every number in the",
        "census manuscript. The raw ~3.2 GB JATS corpus is intentionally NOT included — it is",
        "re-fetchable from PMC by `fetch_corpus` using the recorded query. Upload this whole folder",
        "to the OSF project that holds the pre-registration, then cite the OSF DOI in the paper.",
        "",
        f"Total deposit size: **{total_mb:.1f} MB** across {len(rows)} files.",
        "",
        "| file | bytes | md5 |",
        "|---|---|---|",
        *[f"| `{rel}` | {sz:,} | `{md5}` |" for rel, sz, md5 in rows],
        "",
    ]
    if missing:
        lines += ["## Missing at bundle time (mount the drive and re-run to include)", ""]
        lines += [f"- `{m}`" for m in missing]
        lines += [""]
    (OUT / "MANIFEST.md").write_text("\n".join(lines))

    print(f"Wrote {len(rows)} files ({total_mb:.1f} MB) to {OUT}")
    if missing:
        print(f"\n!! {len(missing)} item(s) missing (drive not mounted?):")
        for m in missing:
            print("   -", m)
        print("   Mount /Volumes/My_Passport and re-run to include the per-paper ledger.")
    print("\nNext: upload the osf_deposit/ folder to your OSF project (with the pre-registration),")
    print("then cite the OSF DOI in the manuscript's Data and code availability section.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
