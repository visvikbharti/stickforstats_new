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
    DRIVE / "flagged_inconsistencies.jsonl",                # the 333 flagged claims (v1.2.0 reader)
    Path("/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25/fetch_stats.json"),
    # The 355-row re-score under the corrected p-reader (f979b89). Sourced from the tracked
    # copy in the repo, NOT from the drive -- the drive holds only the superseded 333-row file,
    # and this frame is the input whose sha256 gold_set_provenance.json records.
    ROOT / "paper/census_paper/data/flagged_inconsistencies_corrected.jsonl",
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


def _expected_filenames() -> set:
    """Every basename a run of this script will write into OUT."""
    names = {src.name for src in DERIVED} | set(SCRIPTS) | set(REPORTS) | {"MANIFEST.md"}
    figdir = VERIF / "figures"
    if figdir.exists():
        names |= {f.name for f in figdir.glob("*.png")} | {f.name for f in figdir.glob("*.svg")}
    return names


def _refuse_to_destroy_what_we_cannot_rebuild() -> list:
    """Abort the rebuild if OUT holds a file this script would not put back.

    `main` used to open with an unconditional `shutil.rmtree(OUT)`. OUT is gitignored, so
    anything in it that is NOT in DERIVED/SCRIPTS/REPORTS/figures exists in exactly one place
    on disk and in no commit -- and the rmtree deletes it with nothing to restore it from.

    This is not hypothetical. `flagged_inconsistencies_corrected.jsonl` -- the 355-row frame
    produced by the 2026-08-21 corpus re-score, the input whose sha256 `gold_set_provenance.json`
    records, and the frame the committed gold set was drawn from -- lived only here. DERIVED
    names the superseded 333-row file from the drive, so a rebuild would have destroyed the
    corrected one and replaced it with its predecessor. It is now tracked in git as well, but
    the trap that let it happen is what this guard closes.
    """
    if not OUT.exists():
        return []
    expected = _expected_filenames()
    # Genuinely disposable bytes are excluded, so the guard does not cry wolf. A guard that
    # fires on __pycache__ every run is a guard people learn to bypass.
    return sorted(
        str(f.relative_to(OUT)) for f in OUT.rglob("*")
        if f.is_file()
        and f.name not in expected
        and "__pycache__" not in f.parts
        and f.name != ".DS_Store"
    )


def _would_trade_a_present_file_for_a_missing_source() -> list:
    """Files OUT already holds whose SOURCE is currently unreadable.

    The first version of this guard checked only whether the script KNEW a file's name, and
    that is not the same as being able to get it back. Executed with the drive unmounted, it
    passed -- every file in OUT was named in DERIVED -- and the rebuild then deleted the
    ledger, fetch_stats.json and the 333-row frame and could restore none of them, because
    every DERIVED path points at /Volumes/My_Passport. The run reported "3 item(s) missing"
    AFTER destroying them.

    So the real question is not "do I know this file?" but "can I actually obtain it?".
    """
    if not OUT.exists():
        return []
    lost = []
    for src in DERIVED:
        if not src.exists() and (OUT / "data" / src.name).exists():
            lost.append(f"data/{src.name}  (source unreadable: {src})")
    for name in SCRIPTS:
        if not (VERIF / name).exists() and (OUT / "scripts" / name).exists():
            lost.append(f"scripts/{name}  (source unreadable: {VERIF / name})")
    for name in REPORTS:
        if not (VERIF / name).exists() and (OUT / "reports" / name).exists():
            lost.append(f"reports/{name}  (source unreadable: {VERIF / name})")
    return sorted(lost)


def main() -> int:
    unrebuildable = _refuse_to_destroy_what_we_cannot_rebuild()
    if unrebuildable:
        print(f"REFUSING to rebuild {OUT}: it holds {len(unrebuildable)} file(s) this script "
              f"does not know how to put back.\n")
        for rel in unrebuildable:
            print(f"  {rel}")
        print("\nMove them somewhere durable (or add them to DERIVED) and re-run. Nothing was "
              "deleted.")
        return 1

    would_lose = _would_trade_a_present_file_for_a_missing_source()
    if would_lose:
        print(f"REFUSING to rebuild {OUT}: {len(would_lose)} file(s) are present now and their "
              f"sources are not readable, so the rebuild would DELETE them and put nothing "
              f"back.\n")
        for rel in would_lose:
            print(f"  {rel}")
        print("\nMount the drive (or fix the paths) and re-run. Nothing was deleted.")
        return 1

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
