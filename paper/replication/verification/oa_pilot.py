#!/usr/bin/env python3
"""
PMC OA Web-Service equal-probability pilot — an INDEPENDENT sampling frame for the census.
==========================================================================================

The descriptive census sampled the design-query population (open access AND 2018:2025 AND a
quantitative-design term) by day clusters; its day-clustering is corrected same-population by
`census_ipw.py` (IPW). This script is the INDEPENDENT external replication: it samples from the
GENERAL PMC Open-Access population (no design-query enrichment) via the NCBI OA web service
(`oa.fcgi`, which enumerates OA records by date), then fetches the JATS and runs the same census.

NCBI retired `oa_file_list.csv` (404); `oa.fcgi?from=DATE&until=DATE` is the current enumeration
endpoint. It is date-based, so we sample random days and record each day's total-count as a
day-volume weight (so this frame is ALSO IPW-correctable, exactly like the main census).

What it tests: does the inconsistency-rate-among-checkable-claims generalize to general OA papers
(not just quantitative-design ones)? The recomputable-in-text PAPER rate will be LOWER here (no
design enrichment), so a bounded pilot yields fewer checkable claims and a wider CI -- this is a
directional generalizability check; the same-population robustness result is IPW.

Usage (time-bounded; resumable -- efetch caches by PMCID, re-run to add more):
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/oa_pilot.py [TARGET_N] [SEED]
"""
from __future__ import annotations

import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
import django  # noqa: E402

django.setup()

import json as _json  # noqa: E402

import numpy as np  # noqa: E402

from core.manuscript.pmc_fetcher import _get, efetch_by_id  # noqa: E402  (reuse polite client)

OA = "https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi"
DEST = Path("/Volumes/My_Passport/stickforstats_corpus/oa_pilot_2026-06-26")
_REC = re.compile(rb'<record[^>]*\bid="(PMC\d+)"')

TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 2000
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 0
PER_DAY = 18
YEARS = (2018, 2026)
DELAY = 0.34 if not os.environ.get("NCBI_API_KEY") else 0.12


def oa_day_ids(y: int, mo: int, da: int) -> tuple[list[str], int]:
    """OA records for one day -> (PMCIDs in the first page, total-count for the day)."""
    nd = da + 1
    url = f"{OA}?from={y}-{mo:02d}-{da:02d}&until={y}-{mo:02d}-{nd:02d}"
    try:
        raw = _get(url)
    except Exception:
        return [], 0
    ids = [m.group(1).decode() for m in _REC.finditer(raw)]
    m = re.search(rb'total-count="(\d+)"', raw)
    total = int(m.group(1)) if m else len(ids)
    return ids, total


def main() -> int:
    import calendar
    DEST.mkdir(parents=True, exist_ok=True)
    cached = {p.stem for p in DEST.glob("PMC*.xml")}
    rng = np.random.default_rng(SEED)
    print(f"[oa] target {TARGET} (cached {len(cached)}); general OA via oa.fcgi, "
          f"day-clustered, day-volume recorded for IPW")

    weights_fp = DEST / "oa_day_volume.json"
    weights = {}
    if weights_fp.exists():
        try:
            weights = _json.loads(weights_fp.read_text())
        except Exception:
            weights = {}

    fetched = len(cached)
    days = 0
    t0 = time.time()
    # time budget: stop well before the ~10-min background reaper so the flush below always runs
    while fetched < TARGET and (time.time() - t0) < 520:
        y = int(rng.integers(*YEARS))
        mo = int(rng.integers(1, 13))
        da = int(rng.integers(1, calendar.monthrange(y, mo)[1] + 1))
        ids, total = oa_day_ids(y, mo, da)
        time.sleep(DELAY)
        if not ids:
            continue
        days += 1
        rng.shuffle(ids)
        for pmcid in ids[:PER_DAY]:
            if pmcid in cached:
                continue
            uid = pmcid.replace("PMC", "")
            p = efetch_by_id(uid, DEST)
            time.sleep(DELAY)
            if p is not None:
                cached.add(p.stem)
                weights[p.stem] = total      # day-volume weight for IPW
                fetched = len(cached)
                if fetched % 25 == 0:
                    print(f"  [oa] fetched {fetched}/{TARGET} ({days} days)")
                    weights_fp.write_text(_json.dumps(weights))
            if fetched >= TARGET:
                break

    weights_fp.write_text(_json.dumps(weights))
    print(f"[oa] done: {fetched} OA papers cached in {DEST} ({days} days, {time.time()-t0:.0f}s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
