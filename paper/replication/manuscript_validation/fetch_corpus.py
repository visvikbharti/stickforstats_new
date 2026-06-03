#!/usr/bin/env python3
"""Build a reproducible validation corpus of open-access papers for the
StickForStats manuscript-verification accuracy study.

It queries the PMC Open Access subset (NCBI E-utilities), downloads each
article's JATS XML, strips it to plain text (dropping tables and the
reference list so only the running narrative is analysed), and keeps the
papers that report enough INLINE, recomputable APA statistics --
t(df)=v, F(df,df)=v, chi-square(df)=v -- to exercise the consistency engine.

Reproducible: same query + same NCBI data -> same corpus. Writes the kept
texts to ``corpus/`` and a ``manifest.json`` recording the query, filter
criteria, and per-paper statistic counts.

Usage::

    python paper/replication/manuscript_validation/fetch_corpus.py \\
        --retmax 120 --min-stats 3 --out paper/replication/manuscript_validation
"""

from __future__ import annotations

import argparse
import html
import json
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path

ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
UA = {"User-Agent": "stickforstats-validation/1.0 (research; mailto:noreply@stickforstats.com)"}

# Documented query: open-access papers that use the classic APA inline tests,
# which are the ones the consistency engine can recompute.
DEFAULT_QUERY = (
    'open access[filter] AND ("repeated-measures ANOVA" OR "paired t-test" '
    'OR "one-way ANOVA" OR "independent samples t-test" OR "mixed ANOVA")'
)

T_DF = re.compile(r"(?<![A-Za-z])t\s*\(\s*\d+(?:\.\d+)?\s*\)\s*=")
F_DF = re.compile(r"(?<![A-Za-z])F\s*\(\s*\d+\s*,\s*\d+(?:\.\d+)?\s*\)\s*=")
CHI_DF = re.compile(r"(?:χ2|χ²|chi-?square)\s*\(\s*\d+", re.IGNORECASE)


def _get(url: str) -> str:
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45).read().decode("utf-8", "replace")


def esearch(query: str, retmax: int) -> list:
    url = f"{ESEARCH}?db=pmc&retmode=json&retmax={retmax}&term=" + urllib.parse.quote(query)
    return json.loads(_get(url))["esearchresult"]["idlist"]


def to_text(xml: str) -> str:
    xml = re.sub(r"(?is)<(table-wrap|ref-list|back)\b.*?</\1>", " ", xml)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", xml))).strip()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--query", default=DEFAULT_QUERY)
    ap.add_argument("--retmax", type=int, default=120)
    ap.add_argument("--min-stats", type=int, default=3, help="min inline recomputable stats to keep a paper")
    ap.add_argument("--min-chars", type=int, default=8000)
    ap.add_argument("--out", default="paper/replication/manuscript_validation")
    args = ap.parse_args()

    out = Path(args.out)
    corpus = out / "corpus"
    corpus.mkdir(parents=True, exist_ok=True)

    ids = esearch(args.query, args.retmax)
    print(f"candidates: {len(ids)}")
    kept = []
    for i, pmcid in enumerate(ids):
        try:
            text = to_text(_get(f"{EFETCH}?db=pmc&id={pmcid}&rettype=xml&retmode=xml"))
        except Exception as exc:  # noqa: BLE001
            print(f"  skip PMC{pmcid}: {exc!r}"[:80])
            time.sleep(0.4)
            continue
        nt, nf, nchi = len(T_DF.findall(text)), len(F_DF.findall(text)), len(CHI_DF.findall(text))
        if nt + nf + nchi >= args.min_stats and len(text) >= args.min_chars:
            (corpus / f"PMC{pmcid}.txt").write_text(text, encoding="utf-8")
            kept.append({"pmcid": f"PMC{pmcid}", "t_df": nt, "f_df": nf, "chi_df": nchi, "chars": len(text)})
            print(f"  keep PMC{pmcid}: t={nt} F={nf} chi={nchi}")
        time.sleep(0.4)

    manifest = {
        "query": args.query,
        "retmax": args.retmax,
        "min_stats": args.min_stats,
        "candidates": len(ids),
        "kept": len(kept),
        "papers": kept,
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"kept {len(kept)} papers -> {corpus}")
    print(f"manifest -> {out / 'manifest.json'}")


if __name__ == "__main__":
    main()
