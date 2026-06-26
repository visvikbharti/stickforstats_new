"""
pmc_fetcher.py — bulk fetch PMC Open-Access JATS XML for the Phase-B corpus census.
===================================================================================

A thin, polite NCBI E-utilities client: ``esearch`` to enumerate IDs, then ``efetch`` (db=pmc) to
pull each article's full JATS XML by ID.

Sampling: NCBI rejects large ``retstart`` (HTTP 400) even with a history WebEnv, so a uniform offset
into the whole corpus is impossible. Instead we sample by RANDOM PUBLICATION DAYS across the window
(each day's match count is well under the retstart cap), collect IDs per day, then efetch each by ID.
This spreads the sample across the corpus's time span without hitting the cap.

Politeness: <=3 requests/sec without an API key (set ``NCBI_API_KEY`` to go to 10/sec); retries on
transient/5xx errors only. No-egress note: fetches FROM the public NCBI archive only. Caching by
PMCID makes runs resumable.

Created: 2026-06-25 IST. (Rewritten from a history-offset approach after the retstart cap surfaced.)
"""

from __future__ import annotations

import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import List, Optional

_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
_UA = {"User-Agent": "stickforstats-census/1.0 (research; mailto:vishalvikashbharti@gmail.com)"}
_API_KEY = os.environ.get("NCBI_API_KEY", "")
_PMCID = re.compile(rb'<article-id pub-id-type="pmcid">(PMC\d+)</article-id>')


def _get(url: str, timeout: int = 120, retries: int = 3) -> bytes:
    """GET with retry on transient/5xx errors; 4xx raises immediately (won't fix on retry)."""
    last = None
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=_UA), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code < 500:
                raise
            last = e
        except (urllib.error.URLError, TimeoutError) as e:
            last = e
        time.sleep(1.5 * (attempt + 1))
    raise last  # type: ignore[misc]


def _key(params: dict) -> dict:
    if _API_KEY:
        params["api_key"] = _API_KEY
    return params


def esearch_ids(term: str, retmax: int = 150, datespec: Optional[str] = None) -> List[str]:
    """Return up to ``retmax`` PMC UIDs for ``term`` (optionally restricted to a [pdat] day/range)."""
    t = f"{term} AND {datespec}[pdat]" if datespec else term
    params = _key({"db": "pmc", "term": t, "retmax": retmax, "retmode": "json"})
    try:
        d = json.loads(_get(_BASE + "esearch.fcgi?" + urllib.parse.urlencode(params)))["esearchresult"]
        return list(d.get("idlist", []))
    except Exception:
        return []


def efetch_by_id(uid: str, dest_dir: Path) -> Optional[Path]:
    """Fetch one PMC article's full JATS XML by UID; cache as ``PMC<id>.xml`` (skip if cached)."""
    params = _key({"db": "pmc", "id": uid, "rettype": "xml", "retmode": "xml"})
    try:
        raw = _get(_BASE + "efetch.fcgi?" + urllib.parse.urlencode(params))
    except Exception:
        return None
    m = _PMCID.search(raw)
    if not m or b"<body" not in raw:   # require a real OA full-text body
        return None
    dest_dir.mkdir(parents=True, exist_ok=True)
    path = dest_dir / (m.group(1).decode() + ".xml")
    if not path.exists():
        path.write_bytes(raw)
    return path


def fetch_corpus_sample(term: str, n: int, dest_dir: Path, seed: int = 0,
                        delay: float = 0.34, per_day: int = 18, log_every: int = 50,
                        years=(2018, 2026)) -> List[Path]:
    """Fetch ~``n`` papers by DAY-CLUSTERED random sampling (NOT a uniform random sample of papers).

    For each randomly chosen publication day we retrieve the FULL day's ID pool (retmax 9999, so the
    within-day pick is genuinely random rather than the N most-recently-indexed), then take up to
    ``per_day`` at random. Equal per-day allocation over a variable day-volume means low-volume days
    are over-represented (cluster sampling) — the day count is recorded per fetched paper so the
    analysis can inverse-probability-weight, and the limitation is disclosed in the census report.
    Writes ``fetch_stats.json`` (attrition funnel) into ``dest_dir``.
    """
    import calendar
    import json as _json

    import numpy as np  # lazy

    rng = np.random.default_rng(seed)
    polite = delay if _API_KEY else max(delay, 0.34)
    print(f"[pmc] day-clustered sample ~{n} across {years[0]}-{years[1] - 1} "
          f"(per-day {per_day}, delay {polite}s, key={'yes' if _API_KEY else 'no'})")

    # 1) enumerate candidate IDs by random days (real month lengths; full day pool) until surplus
    pairs = []          # (uid, day_count)  -- day_count enables inverse-probability weighting
    seen = set()
    days_used = 0
    max_days = max(60, (n // per_day) * 5)
    for _ in range(max_days):
        if len(pairs) >= int(n * 1.3):
            break
        y = int(rng.integers(years[0], years[1]))
        mo = int(rng.integers(1, 13))
        da = int(rng.integers(1, calendar.monthrange(y, mo)[1] + 1))
        batch = esearch_ids(term, retmax=9999, datespec=f"{y}/{mo:02d}/{da:02d}")
        if not batch:
            time.sleep(polite)
            continue
        days_used += 1
        day_count = len(batch)
        rng.shuffle(batch)
        for uid in batch[:per_day]:
            if uid not in seen:
                seen.add(uid)
                pairs.append((uid, day_count))
        time.sleep(polite)
    rng.shuffle(pairs)
    pairs = pairs[:n]
    print(f"[pmc] enumerated {len(pairs)} candidate IDs from {days_used} days; fetching full text")

    # 2) efetch each by ID
    paths: List[Path] = []
    weights = {}
    dropped_no_body = 0
    for uid, day_count in pairs:
        p = efetch_by_id(uid, dest_dir)
        if p is not None:
            paths.append(p)
            weights[p.stem] = day_count        # day-volume per paper (for IPW)
        else:
            dropped_no_body += 1
        if len(paths) and len(paths) % log_every == 0:
            print(f"  [pmc] fetched {len(paths)}/{len(pairs)}")
        time.sleep(polite)

    # accumulate across chunks (a fresh fetch into the same dir adds to the prior totals)
    fp = dest_dir / "fetch_stats.json"
    prev = {}
    if fp.exists():
        try:
            prev = _json.loads(fp.read_text())
        except Exception:
            prev = {}
    merged_weights = {**prev.get("day_volume_per_paper", {}), **weights}
    stats = {"requested": prev.get("requested", 0) + n,
             "days_used": prev.get("days_used", 0) + days_used,
             "enumerated_ids": prev.get("enumerated_ids", 0) + len(pairs),
             "fetched": len(merged_weights),
             "dropped_no_full_text_body": prev.get("dropped_no_full_text_body", 0) + dropped_no_body,
             "chunks": prev.get("chunks", 0) + 1,
             "sampling": "day-clustered (uniform day, full-day pool, up to per_day/day) — NOT uniform "
                         "over papers; low-volume days over-represented", "day_volume_per_paper": merged_weights}
    try:
        fp.write_text(_json.dumps(stats, indent=0))
    except Exception:
        pass
    print(f"[pmc] done: {len(paths)} papers cached in {dest_dir} "
          f"(dropped {dropped_no_body} without full-text body)")
    return paths


# backwards-compatible alias (the name 'random' was a misnomer — kept so old callers don't break)
fetch_random_sample = fetch_corpus_sample
