#!/usr/bin/env python3
"""
GEO resolve->ingest funnel — the next stage after the data-availability pilot.
==============================================================================

Created: 2026-06-24 IST
TODO:    docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md  (T11-FETCH)

The data-availability pilot measured stage 1 (is an accession NAMED?). This measures
stage 2 for the GEO accessions it found: does the GSE series resolve to a downloadable,
decompressible, INGESTIBLE table? Each stage shrinks the verifiable fraction; this is the
honest funnel the pilot report promised to follow up.

Pure stdlib + pandas (no scipy). Downloads cached on the external drive.
"""
from __future__ import annotations

import argparse
import importlib
import json
import sys
import types
from collections import Counter
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.services", BACKEND / "core" / "services"),
               ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m
fetcher = importlib.import_module("core.manuscript.data_fetcher")
dis = importlib.import_module("core.services.data_import_service")


def _offline_sanity():
    assert fetcher._geo_suppl_url("GSE271517").endswith("GSE271nnn/GSE271517/suppl/")
    assert fetcher._geo_suppl_url("GSE999").endswith("GSEnnn/GSE999/suppl/")
    names = ["GSE1_RAW.tar", "GSE1_counts.csv.gz", "filelist.txt", "GSE1_image.png"]
    assert fetcher._pick_candidate(names) == "GSE1_counts.csv.gz"
    print("offline sanity (URL + candidate picking): PASS")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--pilot-json", default=str(Path(__file__).parent / "pilot_out" / "pilot_biomed.json"))
    ap.add_argument("--limit", type=int, default=12, help="max GSE accessions to fetch")
    ap.add_argument("--max-mb", type=int, default=40)
    ap.add_argument("--cache", default="/Volumes/My_Passport/stickforstats_corpus/geo_cache")
    ap.add_argument("--out", default=str(Path(__file__).parent / "pilot_out"))
    args = ap.parse_args()

    _offline_sanity()

    rows = json.loads(Path(args.pilot_json).read_text())["rows"]
    gse = []
    for r in rows:
        for a in r["accessions"]:
            if a.startswith("GEO:GSE") and a.split(":", 1)[1] not in gse:
                gse.append(a.split(":", 1)[1])
    sample = gse[: args.limit]
    print(f"GEO accessions in pilot: {len(gse)}; fetching {len(sample)} (cap {args.max_mb} MB each)\n")

    svc = dis.DataImportService()
    cache = Path(args.cache)
    results = []
    for i, acc in enumerate(sample, 1):
        r = fetcher.fetch_geo(acc, cache, max_bytes=args.max_mb * 1024 * 1024, import_service=svc)
        shape = f"{r.n_rows}x{r.n_cols}" if r.ingestible else "-"
        print(f"  [{i:2d}/{len(sample)}] {acc:14s} {r.status:26s} {r.file_name[:42]:42s} {shape}")
        results.append({"accession": acc, "status": r.status, "file": r.file_name,
                        "size_mb": round(r.size_bytes / 1e6, 1), "n_rows": r.n_rows, "n_cols": r.n_cols,
                        "note": r.note})

    funnel = Counter(r["status"] for r in results)
    n = len(results)
    ingested = funnel.get("ingested", 0)
    summary = {
        "n_geo_accessions_in_pilot": len(gse),
        "n_attempted": n,
        "funnel": dict(funnel),
        "ingested": ingested,
        "ingest_rate_of_attempted": round(100 * ingested / n, 1) if n else 0,
        "results": results,
    }
    out = Path(args.out); out.mkdir(parents=True, exist_ok=True)
    (out / "funnel_geo.json").write_text(json.dumps(summary, indent=2))
    print("\n" + "=" * 64)
    print(f"GEO funnel — attempted {n} of {len(gse)} GSE accessions")
    print(f"  stage outcomes: {dict(funnel)}")
    print(f"  INGESTED (resolved -> downloaded -> table): {ingested}/{n} ({summary['ingest_rate_of_attempted']}%)")
    print("=" * 64)
    print(f"json -> {out / 'funnel_geo.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
