#!/usr/bin/env python3
"""
LARGE consistency census — fetch a random PMC-OA sample, then run the no-data tier at scale.
============================================================================================

Orchestrates the thousands-scale descriptive census: ``esearch`` a broad OA biomedical corpus ->
fetch a DAY-CLUSTERED random sample of full-text JATS (uniform over days, NOT over papers; see
pmc_fetcher) -> parse -> consistency tier -> aggregate. This is the scalable, non-pre-reg-gated layer
(the descriptive measurement of verifiability / internal consistency); the confirmatory hypotheses +
human double-coding for kappa stay OSF-pre-reg-gated.

Usage (full venv; runs for minutes — background it):
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/large_census.py [TARGET=2000] [SEED=0]

Set NCBI_API_KEY to fetch at 10/sec instead of 3/sec.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
sys.path.insert(0, str(Path(__file__).resolve().parent))  # for census_jats
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")

import census_jats  # noqa: E402  (its import performs django.setup())
from core.manuscript.pmc_fetcher import fetch_corpus_sample  # noqa: E402

TARGET = int(sys.argv[1]) if len(sys.argv) > 1 else 2000
SEED = int(sys.argv[2]) if len(sys.argv) > 2 else 0
# broad OA biomedical research with a quantitative-design bias (so in-text statistics are present);
# the "% with an in-text checkable claim" is reported honestly as part of the funnel.
TERM = ('"open access"[filter] AND 2018:2025[pdat] AND '
        '(randomized OR cohort OR "case-control" OR regression OR ANOVA OR correlation OR "t-test")')
FETCH_DIR = Path("/Volumes/My_Passport/stickforstats_corpus/census_corpus_2026-06-25")
SUMMARY = ROOT / "paper/replication/verification/CENSUS_REPORT_LARGE_2026-06-25.md"


def main() -> int:
    print(f"LARGE CENSUS — target {TARGET} OA papers, seed {SEED}")
    print(f"term: {TERM}")
    paths = fetch_corpus_sample(TERM, TARGET, FETCH_DIR, seed=SEED)
    if not paths:
        print("no papers fetched")
        return 1
    print(f"\nfetched {len(paths)} papers -> running consistency census")
    return census_jats.run_census(FETCH_DIR, summary_path=SUMMARY)


if __name__ == "__main__":
    raise SystemExit(main())
