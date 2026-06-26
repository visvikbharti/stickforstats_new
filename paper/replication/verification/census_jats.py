#!/usr/bin/env python3
"""
CONSISTENCY CENSUS over a JATS-XML corpus (the scalable no-data tier).
======================================================================

Parses every PMC JATS XML in a directory, runs the no-raw-data verification tier
(extract claims -> coverage -> statcheck-style internal-consistency), and aggregates the
meta-research headline: what fraction of papers / claims are internally inconsistent, and how
many inconsistencies are decision-changing. This is the layer that scales to thousands without
raw data or the OSF pre-registration (it is the descriptive measurement; the confirmatory
hypotheses + human double-coding remain pre-reg-gated).

Per-paper records -> JSONL on the corpus drive; a small summary -> the repo.

Usage (full venv):
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/census_jats.py [XML_DIR] [MAX]
"""
from __future__ import annotations

import json
import os
import sys
import time
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
import django  # noqa: E402

django.setup()

from core.manuscript.jats_parser import parse_jats  # noqa: E402
from core.manuscript.verify_pipeline import verify_manuscript  # noqa: E402

XML_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else \
    Path("/Volumes/My_Passport/stickforstats_corpus/pilot_biomed_2026-06-24")
MAX = int(sys.argv[2]) if len(sys.argv) > 2 else 100000
OUT_DIR = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
SUMMARY = ROOT / "paper/replication/verification/CENSUS_REPORT_2026-06-25.md"


def run_census(xml_dir: Path, max_n: int = 100000, summary_path: Path = SUMMARY) -> int:
    files = [f for f in sorted(xml_dir.glob("*.xml")) if not f.name.startswith(".")][:max_n]
    if not files:
        print(f"no XML files in {xml_dir}")
        return 1
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    jsonl = OUT_DIR / f"census_{xml_dir.name}.jsonl"
    n_files = len(files)
    fetch_stats = {}
    fs = xml_dir / "fetch_stats.json"
    if fs.exists():
        try:
            fetch_stats = json.loads(fs.read_text())
        except Exception:
            fetch_stats = {}

    # INCREMENTAL ledger: reuse per-paper records already in the JSONL, process only NEW files
    # (re-censusing a 5-10k corpus from scratch each chunk would exceed the run time limit).
    ledger = {}
    if jsonl.exists():
        for line in jsonl.read_text().splitlines():
            try:
                rec = json.loads(line)
                if rec.get("pmcid"):
                    ledger[rec["pmcid"]] = rec
            except Exception:
                pass

    def _flush():
        # Write the full ledger atomically (tmp + replace) so a mid-run kill
        # (background tasks are reaped at ~10 min) never truncates the JSONL and
        # a re-run resumes from the last flush instead of restarting from zero.
        tmp = jsonl.with_suffix(".jsonl.tmp")
        with open(tmp, "w") as fh:
            for rec in ledger.values():
                fh.write(json.dumps(rec) + "\n")
        tmp.replace(jsonl)

    new_done = 0
    t0 = time.time()
    for f in files:
        if f.stem in ledger:          # efetch_by_id saves as <PMCID>.xml -> stem is the PMCID
            continue
        doc = parse_jats(f)
        if doc is None:
            ledger[f.stem] = {"pmcid": f.stem, "status": "unparsed"}
            new_done += 1
            continue
        key = doc.pmcid or f.stem
        if not doc.has_body:
            ledger[key] = {"pmcid": key, "status": "no_body", "article_type": doc.article_type}
            new_done += 1
            continue
        try:
            # extract from BODY + TABLES only (NOT the abstract — a result restated in both the
            # abstract and Results would otherwise be double-counted).
            prof = verify_manuscript(doc.census_text, full_text=doc.census_text)
        except Exception as exc:
            ledger[key] = {"pmcid": key, "status": "error", "error": str(exc)[:160]}
            new_done += 1
            continue
        ledger[key] = {
            "pmcid": key, "status": "parsed_body", "article_type": doc.article_type,
            "n_test_claims": prof.n_claims, "n_checkable": prof.n_checkable,
            "n_inconsistent": prof.n_inconsistent_reporting,
            "n_decision_changing": prof.n_decision_changing, "coverage": prof.coverage,
        }
        new_done += 1
        if new_done % 25 == 0:
            print(f"  ...+{new_done} new (ledger {len(ledger)})")
        if new_done % 1000 == 0:
            _flush()  # kill-safe checkpoint for large (re)builds
    dt = time.time() - t0

    _flush()

    # aggregate from the FULL ledger (a body paper = one with a coverage field; older records that
    # predate the 'status' field always have coverage, so they aggregate correctly too).
    recs = list(ledger.values())
    body = [r for r in recs if r.get("status") == "parsed_body" or "coverage" in r]
    n_parsed = sum(1 for r in recs if r.get("status") != "unparsed")
    n_body = len(body)
    by_type = Counter(r.get("article_type", "unknown") for r in body)
    total_test = sum((r.get("n_test_claims") or 0) for r in body)
    total_checkable = sum((r.get("n_checkable") or 0) for r in body)
    total_incons = sum((r.get("n_inconsistent") or 0) for r in body)
    total_gross = sum((r.get("n_decision_changing") or 0) for r in body)
    n_with_test = sum(1 for r in body if (r.get("n_test_claims") or 0) > 0)
    n_with_checkable = sum(1 for r in body if (r.get("n_checkable") or 0) > 0)
    n_with_incons = sum(1 for r in body if (r.get("n_inconsistent") or 0) > 0)
    coverages = [r["coverage"] for r in body if r.get("coverage") is not None]
    print(f"  ({new_done} newly processed, {len(recs)} total in ledger, {dt:.0f}s)")

    # rates over the CHECKABLE (statcheck-recomputable) set — the apples-to-apples denominator
    rate_papers = n_with_incons / max(1, n_with_checkable)
    rate_claims = total_incons / max(1, total_checkable)
    rate_decision = total_gross / max(1, total_checkable)
    mean_cov = sum(coverages) / len(coverages) if coverages else 0.0

    fl = []
    if fetch_stats:
        fl = [
            "## Fetch attrition (from fetch_stats.json)",
            f"- requested: **{fetch_stats.get('requested', '?')}**  |  days sampled: "
            f"**{fetch_stats.get('days_used', '?')}**  |  IDs enumerated: "
            f"**{fetch_stats.get('enumerated_ids', '?')}**",
            f"- fetched with full-text body: **{fetch_stats.get('fetched', '?')}**  |  dropped "
            f"(no `<body>`): **{fetch_stats.get('dropped_no_full_text_body', '?')}**",
            f"- sampling: {fetch_stats.get('sampling', 'n/a')}",
            "",
        ]

    lines = [
        "# Consistency census (no-data tier) over a JATS-XML corpus",
        "",
        f"_Generated {time.strftime('%Y-%m-%d')} by `census_jats.py` over `{xml_dir.name}` ({dt:.0f}s)._",
        "",
        *fl,
        "## Parse funnel",
        f"- XML files: **{n_files}**  |  parsed: **{n_parsed}**  |  with a readable body: **{n_body}**",
        f"- with >=1 extracted test claim: **{n_with_test}**",
        f"- with >=1 CHECKABLE (recomputable) claim: **{n_with_checkable}**  (the statcheck denominator)",
        f"- with >=1 internal inconsistency: **{n_with_incons}**",
        "",
        "## Headline (over CHECKABLE claims — apples-to-apples with statcheck)",
        f"- extracted test claims: **{total_test}**  |  of which CHECKABLE/recomputable: **{total_checkable}**",
        f"- mean extraction coverage: **{mean_cov:.1%}**",
        f"- papers (of those with a checkable claim) with >=1 inconsistency: "
        f"**{rate_papers:.1%}** ({n_with_incons}/{n_with_checkable})",
        f"- inconsistent claims: **{rate_claims:.1%}** ({total_incons}/{total_checkable})",
        f"- decision-changing (gross) inconsistencies: **{total_gross}** "
        f"({rate_decision:.1%} of checkable)",
        "",
        "Reference: Nuijten et al. 2016 — ~50% of *psychology* papers had >=1 inconsistency and ~13% a "
        "decision error. Our population differs (see caveats); treat the comparison as qualitative.",
        "",
        "## Caveats (mandatory — this is a CONDITIONAL, descriptive measurement)",
        "- **Population.** PMC Open-Access biomedical articles, 2018-2025, matching a classical "
        "quantitative-design query (randomized/cohort/case-control/regression/ANOVA/correlation/t-test) "
        "AND reporting >=1 inline, regex-recomputable NHST statistic. NOT a literature-wide estimate.",
        "- **Sampling.** Day-clustered: publication days drawn at random, full day pool, up to "
        "per_day/day — uniform over DAYS, not over papers, so low-volume days/venues are "
        "over-represented (day volume is recorded per paper for optional inverse-probability weighting). "
        "The proper equal-probability frame (PMC OA file list) is reserved for the OSF-pre-registered run.",
        "- **Extraction scope.** Inline running-text + flattened table-cell text (values split across "
        "table cells may not re-form `t(df)=…, p=…`); figures not read. So this is a LOWER bound on "
        "reportable statistics.",
        "- **Recompute rules.** Two-tailed p only (no one-sided detection); p-as-inequality and the "
        "p=.05 boundary follow consistency_core; these drive the false-positive rate and remain to be "
        "validated against statcheck on a labelled set (Phase-B item).",
        "- **Confirmatory vs descriptive.** This is the DESCRIPTIVE census; the pre-specified hypotheses "
        "and human double-coding for kappa are OSF-pre-registered separately.",
        "",
        "## Article types in the corpus",
        "",
        "| type | n |", "|---|---|",
        *[f"| {t} | {n} |" for t, n in by_type.most_common(12)],
        "",
        f"_Per-paper records: `{jsonl}`._",
    ]
    summary_path.write_text("\n".join(lines))
    print("\n" + "\n".join(lines[3:24]))
    print(f"\nwrote {summary_path} + {jsonl}")
    return 0


if __name__ == "__main__":
    raise SystemExit(run_census(XML_DIR, MAX))
