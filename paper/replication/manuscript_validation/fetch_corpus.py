#!/usr/bin/env python3
"""Rebuild the 20-article validation corpus for the StickForStats
manuscript-verification accuracy study, **from a pinned PMCID list**.

Why this script changed
-----------------------
The first version of this script re-ran the E-utilities *search* that
originally discovered the corpus and kept whatever passed its filters. That is
not reproducible: the PMC Open Access subset grows daily and ``esearch``
ordering is not stable, so a rerun returns a different set of articles. The
corpus texts themselves are deliberately **not** committed (they carry their
own licences), so "re-derivable from the script" has to mean *exactly these
articles*.

This version therefore **reads the pinned PMCID list out of
``manifest.json``** and ``efetch``es those identifiers directly. No search is
issued in the default path, so the corpus is byte-reproducible as long as PMC
still serves the same JATS XML. ``manifest.json`` is treated as read-only
provenance: it records the original discovery query, the filter thresholds, and
the per-article statistic counts that this script re-verifies.

Usage
-----
Rebuild the pinned corpus (this is the command the README documents)::

    python paper/replication/manuscript_validation/fetch_corpus.py

Check an existing corpus without writing anything::

    python paper/replication/manuscript_validation/fetch_corpus.py --verify-only

Re-run the original *discovery* search (provenance / audit only -- this does
NOT reproduce the corpus and will not overwrite it)::

    python paper/replication/manuscript_validation/fetch_corpus.py \\
        --rediscover --retmax 300 --min-stats 3

The script never writes ``manifest.json``: the pinned list is the study's
record and must not drift.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
EFETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
UA = {"User-Agent": "stickforstats-validation/2.0 (research; mailto:noreply@stickforstats.com)"}

HERE = Path(__file__).resolve().parent

# Inline APA test patterns, used only to re-verify the manifest's per-article
# statistic counts after a fetch (the same regexes that built the manifest).
T_DF = re.compile(r"(?<![A-Za-z])t\s*\(\s*\d+(?:\.\d+)?\s*\)\s*=")
F_DF = re.compile(r"(?<![A-Za-z])F\s*\(\s*\d+\s*,\s*\d+(?:\.\d+)?\s*\)\s*=")
CHI_DF = re.compile(r"(?:χ2|χ²|chi-?square)\s*\(\s*\d+", re.IGNORECASE)


def _get(url: str) -> str:
    return (
        urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=45)
        .read()
        .decode("utf-8", "replace")
    )


def esearch(query: str, retmax: int) -> list:
    """Original discovery search. Kept for provenance only -- see --rediscover."""
    url = f"{ESEARCH}?db=pmc&retmode=json&retmax={retmax}&term=" + urllib.parse.quote(query)
    return json.loads(_get(url))["esearchresult"]["idlist"]


def to_text(xml: str) -> str:
    """JATS XML -> running narrative (tables and the reference list dropped)."""
    xml = re.sub(r"(?is)<(table-wrap|ref-list|back)\b.*?</\1>", " ", xml)
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", xml))).strip()


def fetch_text(pmcid: str) -> str:
    numeric = pmcid.upper().removeprefix("PMC")
    return to_text(_get(f"{EFETCH}?db=pmc&id={numeric}&rettype=xml&retmode=xml"))


def stat_counts(text: str) -> dict:
    return {
        "t_df": len(T_DF.findall(text)),
        "f_df": len(F_DF.findall(text)),
        "chi_df": len(CHI_DF.findall(text)),
        "chars": len(text),
    }


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def load_manifest(path: Path) -> dict:
    if not path.exists():
        sys.exit(f"manifest not found: {path}\nThe pinned PMCID list is required to rebuild the corpus.")
    manifest = json.loads(path.read_text(encoding="utf-8"))
    if not manifest.get("papers"):
        sys.exit(f"{path} records no 'papers' list -- cannot rebuild a pinned corpus.")
    return manifest


def stats_match(counts: dict, rec: dict) -> bool:
    """Inline-statistic counts match the manifest.

    ``chars`` is deliberately EXCLUDED. PMC keeps editing the journal front
    matter of already-archived articles (it has since added an NLM catalogue
    journal-ID token to every one of these 20), which changes ``chars`` by a
    handful of bytes without touching a single reported statistic. The
    statistic counts are what the study actually depends on.
    """
    return all(counts[k] == rec[k] for k in ("t_df", "f_df", "chi_df"))


def first_divergence(a: str, b: str) -> tuple:
    """(index of first differing char, length of the common suffix)."""
    i = 0
    while i < min(len(a), len(b)) and a[i] == b[i]:
        i += 1
    j = 0
    while j < min(len(a), len(b)) - i and a[len(a) - 1 - j] == b[len(b) - 1 - j]:
        j += 1
    return i, j


def cmd_verify_only(manifest: dict, corpus: Path) -> int:
    """Re-derive each shipped article's statistic counts and compare to the manifest."""
    ok = mismatched = missing = 0
    for rec in manifest["papers"]:
        p = corpus / f"{rec['pmcid']}.txt"
        if not p.exists():
            print(f"  MISSING  {rec['pmcid']}")
            missing += 1
            continue
        got = stat_counts(p.read_text(encoding="utf-8"))
        if stats_match(got, rec):
            delta = got["chars"] - rec["chars"]
            note = "" if delta == 0 else f"  (chars {delta:+d} vs manifest -- front-matter drift)"
            print(f"  ok       {rec['pmcid']}  t={got['t_df']} F={got['f_df']} chi={got['chi_df']}"
                  f" chars={got['chars']}{note}")
            ok += 1
        else:
            want = {k: rec[k] for k in ("t_df", "f_df", "chi_df")}
            have = {k: got[k] for k in ("t_df", "f_df", "chi_df")}
            print(f"  DIFFERS  {rec['pmcid']}  manifest={want}  on-disk={have}")
            mismatched += 1
    print(f"\nverify-only: {ok} match the manifest's statistic counts / {mismatched} differ / "
          f"{missing} missing (of {len(manifest['papers'])})")
    return 0 if (mismatched == 0 and missing == 0) else 1


def cmd_rebuild(manifest: dict, corpus: Path, out_dir: Path, delay: float, front_matter: int) -> int:
    """efetch the pinned PMCIDs and compare against ``corpus``.

    Three tiers are reported, because "reproducible" has to be stated honestly:
      * ``identical``     -- byte-for-byte equal to the shipped text;
      * ``front-matter``  -- differs ONLY inside the first ``front_matter``
        characters (journal/article metadata that precedes the abstract), with
        identical inline-statistic counts, so every analysed claim is unchanged;
      * ``body-differs``  -- diverges in the running narrative. This is the only
        tier that invalidates a replication.
    """
    corpus.mkdir(parents=True, exist_ok=True)
    identical = front = body = failed = new = 0
    report = []
    total = len(manifest["papers"])
    for i, rec in enumerate(manifest["papers"], 1):
        pmcid = rec["pmcid"]
        dest = corpus / f"{pmcid}.txt"
        try:
            text = fetch_text(pmcid)
        except Exception as exc:  # noqa: BLE001
            print(f"  [{i:2d}/{total}] FETCH FAILED {pmcid}: {exc!r}"[:140])
            failed += 1
            report.append({"pmcid": pmcid, "status": "fetch_failed", "error": repr(exc)[:200]})
            time.sleep(delay)
            continue
        new_bytes = text.encode("utf-8")
        counts = stat_counts(text)
        counts_ok = stats_match(counts, rec)
        entry = {
            "pmcid": pmcid,
            "sha256_fetched": sha256(new_bytes),
            "manifest_statistic_counts_match": counts_ok,
            "counts_fetched": counts,
            "counts_manifest": {k: rec[k] for k in ("t_df", "f_df", "chi_df", "chars")},
        }
        if not dest.exists():
            dest.write_bytes(new_bytes)
            entry["status"] = "written"
            new += 1
            print(f"  [{i:2d}/{total}] written      {pmcid}  sha256={sha256(new_bytes)[:12]}"
                  f"  manifest-statistic-counts={'ok' if counts_ok else 'DIFFER'}")
        else:
            old = dest.read_text(encoding="utf-8")
            if old == text:
                entry["status"] = "identical"
                identical += 1
                print(f"  [{i:2d}/{total}] identical    {pmcid}  sha256={sha256(new_bytes)[:12]}")
            else:
                idx, suffix = first_divergence(old, text)
                tail_start_old = len(old) - suffix
                confined = idx < front_matter and tail_start_old < front_matter and counts_ok
                entry.update({
                    "status": "front-matter" if confined else "body-differs",
                    "sha256_shipped": sha256(old.encode("utf-8")),
                    "first_divergence_char": idx,
                    "last_divergence_char": tail_start_old,
                    "chars_delta": len(text) - len(old),
                })
                if confined:
                    front += 1
                    print(f"  [{i:2d}/{total}] front-matter {pmcid}  differs only in chars "
                          f"{idx}-{tail_start_old} ({len(text)-len(old):+d} chars); "
                          f"statistic counts identical")
                else:
                    body += 1
                    print(f"  [{i:2d}/{total}] BODY DIFFERS {pmcid}  divergent region chars "
                          f"{idx}-{tail_start_old} extends past the front-matter cutoff "
                          f"({front_matter}); statistic-counts={'ok' if counts_ok else 'DIFFER'}")
        report.append(entry)
        time.sleep(delay)

    print(f"\nrebuild over {total} pinned PMCIDs:")
    print(f"  byte-identical to the shipped text          : {identical}")
    print(f"  differ only in the first {front_matter} chars of metadata : {front}")
    print(f"  differ in the article BODY (replication risk): {body}")
    print(f"  newly written (no shipped copy to compare)   : {new}")
    print(f"  fetch failures                              : {failed}")
    out_path = out_dir / "refetch_report.json"
    out_path.write_text(json.dumps({"total": total, "identical": identical, "front_matter_only": front,
                                    "body_differs": body, "written": new, "failed": failed,
                                    "front_matter_chars": front_matter, "papers": report}, indent=2),
                        encoding="utf-8")
    print(f"per-article report -> {out_path}")
    print("NOTE: manifest.json is read-only provenance and was not modified.")
    return 0 if (failed == 0 and body == 0) else 1


def cmd_rediscover(query: str, retmax: int, min_stats: int, min_chars: int, delay: float) -> int:
    """Re-run the original discovery search. Diagnostic only: writes nothing."""
    ids = esearch(query, retmax)
    print(f"candidates returned by esearch: {len(ids)}")
    kept = []
    for pmcid in ids:
        try:
            text = fetch_text(pmcid)
        except Exception as exc:  # noqa: BLE001
            time.sleep(delay)
            continue
        c = stat_counts(text)
        if c["t_df"] + c["f_df"] + c["chi_df"] >= min_stats and c["chars"] >= min_chars:
            kept.append(f"PMC{pmcid}")
        time.sleep(delay)
    print(f"would keep {len(kept)} papers: {kept}")
    print("NOTHING WAS WRITTEN. The PMC OA subset grows and esearch ordering is unstable,")
    print("so this path cannot reproduce the pinned corpus -- use the default path for that.")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--manifest", default=str(HERE / "manifest.json"),
                    help="pinned PMCID list + provenance (read-only; default: alongside this script)")
    ap.add_argument("--out", default=str(HERE),
                    help="package directory; the corpus is written to <out>/corpus (default: alongside this script)")
    ap.add_argument("--verify-only", action="store_true",
                    help="do not fetch: re-derive the shipped corpus's statistic counts and compare to the manifest")
    ap.add_argument("--rediscover", action="store_true",
                    help="re-run the ORIGINAL discovery search for provenance (writes nothing; cannot reproduce the corpus)")
    ap.add_argument("--query", default=None, help="override the manifest's recorded query (only with --rediscover)")
    ap.add_argument("--retmax", type=int, default=None, help="only with --rediscover (default: the manifest's value)")
    ap.add_argument("--min-stats", type=int, default=None, help="only with --rediscover (default: the manifest's value)")
    ap.add_argument("--min-chars", type=int, default=8000, help="only with --rediscover")
    ap.add_argument("--delay", type=float, default=0.4, help="seconds between NCBI requests")
    ap.add_argument("--front-matter-chars", type=int, default=2000,
                    help="characters of leading journal/article metadata within which a difference is "
                         "treated as PMC metadata drift rather than a body change (default: 2000)")
    args = ap.parse_args()

    manifest_path = Path(args.manifest)
    manifest = load_manifest(manifest_path)
    out_dir = Path(args.out)
    corpus = out_dir / "corpus"

    print(f"manifest      : {manifest_path}")
    print(f"pinned papers : {len(manifest['papers'])}")
    print(f"corpus dir    : {corpus}")
    print(f"recorded query: {manifest.get('query', '(none recorded)')}")
    print()

    if args.rediscover:
        return cmd_rediscover(
            args.query or manifest.get("query", ""),
            args.retmax if args.retmax is not None else int(manifest.get("retmax", 300)),
            args.min_stats if args.min_stats is not None else int(manifest.get("min_stats", 3)),
            args.min_chars,
            args.delay,
        )
    if args.verify_only:
        return cmd_verify_only(manifest, corpus)
    return cmd_rebuild(manifest, corpus, out_dir, args.delay, args.front_matter_chars)


if __name__ == "__main__":
    raise SystemExit(main())
