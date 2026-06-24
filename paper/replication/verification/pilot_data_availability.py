#!/usr/bin/env python3
"""
Data-availability pilot — size the verifiable fraction (the product's bottleneck).
===================================================================================

Created: 2026-06-24 IST
Plan:    docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md  (§1/§8: raw-data availability is the bottleneck)
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (~50-paper data-availability pilot)

Fetches a PMC Open-Access sample (NCBI E-utilities; reuses fetch_corpus.py's pattern),
runs T09 (data_availability_extractor) on each, and reports how many papers expose a
STRUCTURED, fetchable data accession vs only "on request" / supplementary / nothing —
i.e. the fraction for which raw-data verification is even possible.

Pure stdlib (urllib + the pure T09 module); no scipy. Stores raw XML on the external
drive when --corpus-dir points there.

Usage:
    python3 paper/replication/verification/pilot_data_availability.py \
        --query '<PMC query>' --retmax 60 \
        --corpus-dir /Volumes/My_Passport/stickforstats_corpus/pilot_biomed_2026-06-24 \
        --label biomed --out paper/replication/verification/pilot_out
    # or run on an existing local corpus of .txt/.xml files:
    python3 ... --existing-dir paper/replication/manuscript_validation/corpus --label psych
"""
from __future__ import annotations

import argparse
import html
import importlib
import json
import re
import sys
import time
import types
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m
da = importlib.import_module("core.manuscript.data_availability_extractor")

ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
UA = {"User-Agent": "stickforstats-pilot/1.0 (research; mailto:vishalvikashbharti@gmail.com)"}
TOOL = "&tool=stickforstats-pilot&email=vishalvikashbharti@gmail.com"

# Biomedical / comp-bio sample: where data deposition (GEO/SRA/...) is common — the
# domain our verification tool actually targets.
DEFAULT_QUERY = (
    'open access[filter] AND ("RNA-seq" OR "RNA sequencing" OR "differential expression" '
    'OR "single-cell" OR "transcriptome" OR "genome-wide")'
)


def _get(url: str) -> str:
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45).read().decode("utf-8", "replace")


def esearch(query: str, retmax: int) -> list:
    url = f"{ESEARCH}?db=pmc&retmode=json&retmax={retmax}&term=" + urllib.parse.quote(query) + TOOL
    return json.loads(_get(url))["esearchresult"]["idlist"]


def to_text(xml: str) -> str:
    # keep tables here (accessions sometimes live in availability tables); drop ref-list/back
    xml = re.sub(r"(?is)<(ref-list)\b.*?</\1>", " ", xml)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", xml))).strip()


def fetch_corpus(query: str, retmax: int, corpus_dir: Path) -> list:
    corpus_dir.mkdir(parents=True, exist_ok=True)
    ids = esearch(query, retmax)
    print(f"  esearch -> {len(ids)} candidate PMCIDs")
    saved = []
    for i, pmcid in enumerate(ids):
        dest = corpus_dir / f"PMC{pmcid}.xml"
        if dest.exists() and dest.stat().st_size > 2000:
            saved.append(dest)
            continue
        try:
            xml = _get(f"{EFETCH}?db=pmc&id={pmcid}&rettype=xml&retmode=xml" + TOOL)
        except Exception as exc:  # noqa: BLE001
            print(f"    skip PMC{pmcid}: {exc!r}"[:90]); time.sleep(0.4); continue
        # Only keep genuine full text (OA subset) — metadata-only stubs are tiny
        if len(xml) < 4000 or "<body" not in xml:
            time.sleep(0.4); continue
        dest.write_text(xml, encoding="utf-8")
        saved.append(dest)
        if (i + 1) % 10 == 0:
            print(f"    fetched {len(saved)} ...")
        time.sleep(0.4)  # NCBI etiquette (<3 req/s)
    print(f"  saved {len(saved)} full-text XML -> {corpus_dir}")
    return saved


def analyse(files: list, label: str, out_dir: Path) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    cls = Counter(); repos = Counter(); verifiable = 0; rows = []
    for f in files:
        raw = f.read_text(errors="ignore")
        text = to_text(raw) if f.suffix == ".xml" else raw
        r = da.extract_data_availability(text)
        cls[r.availability_class] += 1
        for a in r.accessions:
            repos[a.repository] += 1
        if r.is_verifiable_candidate:
            verifiable += 1
        rows.append({"paper": f.stem, "class": r.availability_class,
                     "accessions": [a.repository + ":" + a.accession for a in r.accessions]})
    n = len(files)
    summary = {
        "label": label, "n_papers": n,
        "availability_class": dict(cls),
        "repositories": dict(repos),
        "papers_with_any_accession": sum(1 for row in rows if row["accessions"]),
        "verifiable_candidate_papers": verifiable,
        "verifiable_pct": round(100 * verifiable / n, 1) if n else 0,
        "accession_pct": round(100 * sum(1 for row in rows if row["accessions"]) / n, 1) if n else 0,
        "rows": rows,
    }
    (out_dir / f"pilot_{label}.json").write_text(json.dumps(summary, indent=2))
    print("\n" + "=" * 64)
    print(f"PILOT [{label}] — n={n}")
    print(f"  availability class : {dict(cls)}")
    print(f"  repositories       : {dict(repos)}")
    print(f"  >=1 accession      : {summary['papers_with_any_accession']}/{n} ({summary['accession_pct']}%)")
    print(f"  verifiable candidate: {verifiable}/{n} ({summary['verifiable_pct']}%)")
    print("=" * 64)
    return summary


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", default=DEFAULT_QUERY)
    ap.add_argument("--retmax", type=int, default=70)
    ap.add_argument("--corpus-dir", default="/Volumes/My_Passport/stickforstats_corpus/pilot_biomed_2026-06-24")
    ap.add_argument("--existing-dir", default=None, help="analyse an existing dir of .txt/.xml instead of fetching")
    ap.add_argument("--label", default="biomed")
    ap.add_argument("--out", default=str(Path(__file__).parent / "pilot_out"))
    args = ap.parse_args()

    if args.existing_dir:
        files = sorted(p for p in Path(args.existing_dir).iterdir() if p.suffix in (".txt", ".xml"))
        print(f"[{args.label}] analysing {len(files)} existing files in {args.existing_dir}")
    else:
        print(f"[{args.label}] fetching PMC-OA sample (retmax={args.retmax}) ...")
        files = fetch_corpus(args.query, args.retmax, Path(args.corpus_dir))
    analyse(files, args.label, Path(args.out))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
