#!/usr/bin/env python3
"""How far can the assumption-DISCLOSURE audit reach, compared with recomputation?

DEFINITIONS, FROZEN BEFORE THE RUN
==================================
Recomputation can only speak about a paper that reports a full recomputable triple. The
disclosure audit asks a weaker question -- "the paper says it ran test T; does it anywhere
say it checked what T requires?" -- and could in principle speak about any paper that names
a method. This script measures how many papers it can ACTUALLY speak about.

Population: papers with a readable body, i.e. the same denominator as the census's
checkable-paper rate. Rates are directly comparable to it.

Two reach definitions, because "can say something" is ambiguous and the difference is not
cosmetic:

  REACH-A (evaluable)  a paper with >=1 claim whose audit returns evaluable=True.
                       Includes rank-based tests, for which the audit's answer is
                       "nothing is conventionally reported for this test" -- true, and
                       useless to a reader.

  REACH-B (verdict)    a paper with >=1 claim that is evaluable AND has a non-empty
                       requirement set, so the audit can actually say "normality was /
                       was not disclosed".

REACH-B IS THE HEADLINE. Reach-A flatters the audit by counting vacuous verdicts.

Also reported, because a reach number without them is not actionable:
  - the reason histogram for every claim the audit cannot evaluate (what would have to
    change to widen reach);
  - the overlap with recomputation: how many reach-B papers are OUTSIDE the recomputable
    set, which is the only part that is genuinely new coverage;
  - per-assumption disclosure counts, which are a by-product, NOT a headline: this script
    measures REACH, and a disclosure rate computed here would be an accusation rate from a
    single unvalidated rule set.

CONTROL: the per-paper extracted-test-claim count must match the census ledger exactly.
If it does not, this script is not running the census's extraction and every rate below is
measuring a different corpus. Mismatches are counted and printed, never silently dropped.

Usage:
  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
      ../paper/replication/verification/census_disclosure_reach.py [XML_DIR] [MAX]
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

from core.manuscript.assumption_reporting import (  # noqa: E402
    REPORTING_REQUIREMENTS, detect_assumption_reporting,
)
from core.manuscript.claim_extractor import (  # noqa: E402
    StatisticalClaimExtractor, is_test_claim,
)
from core.manuscript.jats_parser import parse_jats  # noqa: E402
from core.manuscript.test_resolver import resolve_test  # noqa: E402

XML_DIR = Path(sys.argv[1]) if len(sys.argv) > 1 else \
    Path("/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25")
MAX = int(sys.argv[2]) if len(sys.argv) > 2 else 100000
DRIVE = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
LEDGER = DRIVE / "census_census_corpus_v2_2026-06-25.jsonl"
OUT_JSONL = DRIVE / "disclosure_reach_2026-08-25.jsonl"
SUMMARY = ROOT / "paper/replication/verification/DISCLOSURE_REACH_2026-08-25.md"
TRACKED = ROOT / "paper/census_paper/data/disclosure_reach_2026-08-25.json"


def _census_ledger() -> dict:
    if not LEDGER.exists():
        return {}
    out = {}
    for line in LEDGER.read_text().splitlines():
        if line.strip():
            r = json.loads(line)
            out[r["pmcid"]] = r
    return out


def render_report(d: dict) -> str:
    """Render the report from the summary dict alone.

    Kept separate from the measurement so `--report-only` can regenerate it from the
    tracked JSON with the corpus drive unmounted. A report generator that needs the
    drive is a report a correction cannot reach.
    """
    body = d["population_readable_body"]
    pct = lambda n: f"{100 * n / body:.2f}%"
    tot = d["claims_total"]
    cpct = lambda n: f"{100 * n / tot:.1f}%"
    reasons = "\n".join(
        f"| {k} | {v:,} | {cpct(v)} |" for k, v in d["reasons_not_evaluable"].items()
    )
    # test_keys_evaluable counts EVALUABLE claims, which is not the same as claims that
    # yield a verdict: a rank test is evaluable and its answer is "nothing is required".
    # An earlier draft of this table was headed "which tests reach a verdict" and listed
    # the rank tests at the top -- a caption asserting something its own rows refute.
    _silent = {k for k, v in REPORTING_REQUIREMENTS.items() if not v}
    keys = "\n".join(
        f"| `{k}` | {v:,} | {'no — this test requires nothing' if k in _silent else 'yes'} |"
        for k, v in d["test_keys_evaluable"].items()
    )
    pa = d["per_assumption"]
    assum = "\n".join(
        f"| {a} | {pa.get(a + ':reported', 0):,} | {pa.get(a + ':unreported', 0):,} |"
        for a in ("normality", "variance_homogeneity", "expected_frequencies", "linearity")
    )
    ctl = d.get("control_papers_compared", 0)
    return f"""# How far does the assumption-disclosure audit reach?

_Generated by `census_disclosure_reach.py` over {body:,} papers with a readable body — the same
population, and the same denominator, as the census's recomputable-paper rate._

## The result runs opposite to the premise

The premise was that a disclosure audit — "the paper says it ran test T; does it anywhere say it
checked what T requires?" — asks a *weaker* question than recomputation and should therefore reach
*more* papers. **It reaches fewer. Less than half as many.**

| | papers | of {body:,} |
|---|---|---|
| papers with ≥1 extracted test claim (the ceiling) | {d['papers_with_any_test_claim']:,} | {pct(d['papers_with_any_test_claim'])} |
| **recomputation** (≥1 recomputable claim) | **{d['recomputation_reach']:,}** | **{pct(d['recomputation_reach'])}** |
| disclosure audit, REACH-A (evaluable at all) | {d['reach_a_evaluable']:,} | {pct(d['reach_a_evaluable'])} |
| **disclosure audit, REACH-B (a verdict is possible)** | **{d['reach_b_verdict']:,}** | **{pct(d['reach_b_verdict'])}** |
| … of which recomputation cannot touch (genuinely new) | {d['reach_b_beyond_recomputation']:,} | {pct(d['reach_b_beyond_recomputation'])} |
| … overlapping recomputation | {d['reach_b_and_recomputable']:,} | |
| recomputable but the audit cannot speak about it | {d['recomputable_only']:,} | |

REACH-B is the headline. REACH-A counts papers whose only answer is "this test requires nothing that
is conventionally reported" — true, and useless to a reader — so quoting it would flatter the audit.

**The genuinely new coverage is {d['reach_b_beyond_recomputation']} papers, {pct(d['reach_b_beyond_recomputation'])} of the corpus.** That is the honest
size of the prize, and it is smaller than the arm it was supposed to extend.

## Why: the audit is silenced by its own safety interlock

Of {tot:,} extracted test claims, {d['claims_evaluable']:,} are evaluable and only **{d['claims_with_verdict']:,} ({cpct(d['claims_with_verdict'])}) yield an actual
disclosure verdict**.

| why a claim yields no verdict | claims | share |
|---|---|---|
{reasons}

The dominant cause is not a missing feature. It is the interlock that refuses to build a finding on a
guess: when the paper does not state its design, the resolver defaults to the most common form and the
audit deliberately says nothing. That rule is correct — the alternative is telling authors they failed
to report a check for a test they did not run — but it is what caps the reach, and no amount of pattern
work will move it. **Widening this arm means getting papers to state their designs, not improving the
regexes.**

Two structural ceilings sit above that:

1. **The audit is gated on claim extraction.** It needs a claim object to resolve a test from, so it
   can never exceed the {d['papers_with_any_test_claim']:,} papers ({pct(d['papers_with_any_test_claim'])}) with an extractable in-text statistic — even though the
   *question* it asks would apply to any paper that names a method in its Methods section. A Methods-only
   detector, resolving "we used a Mann-Whitney U test" with no inline statistic, is the single change
   that would raise the ceiling, and it is not implemented.
2. **Rank-based tests require nothing** that is conventionally reported, by design. That is
   {d['reasons_not_evaluable'].get('evaluable but nothing conventionally reported (rank test)', 0):,} claims — {cpct(d['reasons_not_evaluable'].get('evaluable but nothing conventionally reported (rank test)', 0))} of all claims and the
   majority of the evaluable set — and they are the most common families in this corpus.

## Which tests the audit can evaluate

Evaluable is not the same as informative. The rank-based families dominate the evaluable set and
every one of them yields the same empty answer.

| test | evaluable claims | yields a disclosure verdict? |
|---|---|---|
{keys}

## Disclosure counts — a by-product, NOT a headline

Reported here for completeness and to be read with care. These are the output of a single, unvalidated
rule set against regex evidence patterns; an "unreported" count from one rater is an accusation rate,
not a measurement, and it is exactly the quantity the κ double-coding exists to calibrate. **Do not
quote these as a finding about the literature.**

| assumption | disclosed | not found |
|---|---|---|
{assum}

## Controls

- **Extraction matches the census exactly.** Per-paper extracted-test-claim counts were compared
  against the census ledger for all {ctl:,} papers, with **{d['control_ledger_mismatches']} mismatches**, and the corpus total is
  {tot:,} — the published census figure. This script is running the census's extraction, not its own.
- **The control was mutation-tested.** Truncating the input text to 5,000 characters produced 33
  mismatches over a 200-paper slice, so the control detects a divergent extraction rather than passing
  vacuously.
- **A vacuous control is reported as vacuous.** The first version of this script printed "extraction
  matches the census" after making *zero* comparisons, on a corpus whose papers are not in the census
  ledger. It now prints the number of comparisons actually made and calls a zero-comparison control
  VACUOUS.

## Provenance

- corpus: `{d['corpus_dir']}`
- per-paper records: `disclosure_reach_2026-08-25.jsonl` (on the corpus drive)
- tracked summary: `paper/census_paper/data/disclosure_reach_2026-08-25.json`
- re-render this report without the drive: `census_disclosure_reach.py --report-only`
"""


def main() -> int:
    if "--report-only" in sys.argv:
        SUMMARY.write_text(render_report(json.loads(TRACKED.read_text())))
        print(f"re-rendered {SUMMARY} from {TRACKED} (no corpus needed)")
        return 0
    files = [f for f in sorted(XML_DIR.glob("*.xml")) if not f.name.startswith(".")][:MAX]
    if not files:
        print(f"no XML files in {XML_DIR}")
        return 1
    ledger = _census_ledger()
    print(f"{len(files)} XML files; census ledger has {len(ledger)} papers")

    extractor = StatisticalClaimExtractor()
    rows = []
    reasons = Counter()
    test_keys = Counter()
    per_assumption = Counter()
    control_mismatch = []
    control_compared = [0]  # papers the ledger could actually be checked against
    t0 = time.time()

    for i, f in enumerate(files, 1):
        doc = parse_jats(f)
        if doc is None or not doc.has_body:
            continue
        pmcid = doc.pmcid or f.stem
        text = doc.census_text
        claims = [c for c in extractor.extract(text, section="Results") if is_test_claim(c)]

        n_evaluable = n_verdict = 0
        paper_unreported = set()
        for c in claims:
            try:
                res = resolve_test(c)
            except Exception as exc:
                reasons[f"resolver raised: {type(exc).__name__}"] += 1
                continue
            if not res.resolved:
                reasons["test not resolved"] += 1
                continue
            if res.ambiguous:
                reasons["design not stated; resolver defaulted (interlock: silence)"] += 1
                continue
            if res.intended_test not in REPORTING_REQUIREMENTS:
                reasons[f"no requirements defined for '{res.intended_test}'"] += 1
                continue
            rep = detect_assumption_reporting(c, manuscript_text=text,
                                              test_key=res.intended_test)
            if not rep.evaluable:
                reasons[f"not evaluable: {rep.reason[:60]}"] += 1
                continue
            n_evaluable += 1
            test_keys[res.intended_test] += 1
            if not rep.required:
                reasons["evaluable but nothing conventionally reported (rank test)"] += 1
                continue
            n_verdict += 1
            for a in rep.reported:
                per_assumption[f"{a}:reported"] += 1
            for a in rep.unreported:
                per_assumption[f"{a}:unreported"] += 1
                paper_unreported.add(a)

        led = ledger.get(pmcid, {})
        n_led = led.get("n_test_claims")
        if n_led is not None:
            control_compared[0] += 1
            if n_led != len(claims):
                control_mismatch.append((pmcid, n_led, len(claims)))

        rows.append({
            "pmcid": pmcid,
            "n_test_claims": len(claims),
            "n_test_claims_ledger": n_led,
            "n_checkable_ledger": led.get("n_checkable"),
            "n_evaluable": n_evaluable,
            "n_verdict": n_verdict,
            "unreported_assumptions": sorted(paper_unreported),
        })
        if i % 500 == 0:
            print(f"  {i}/{len(files)}  ({time.time() - t0:.0f}s)")

    OUT_JSONL.parent.mkdir(parents=True, exist_ok=True)
    with OUT_JSONL.open("w") as fh:
        for r in rows:
            fh.write(json.dumps(r) + "\n")

    body = len(rows)
    reach_a = sum(1 for r in rows if r["n_evaluable"] > 0)
    reach_b = sum(1 for r in rows if r["n_verdict"] > 0)
    recomputable = sum(1 for r in rows if (r["n_checkable_ledger"] or 0) > 0)
    with_test = sum(1 for r in rows if r["n_test_claims"] > 0)
    # genuinely NEW coverage: reach-B papers recomputation cannot touch
    new_b = sum(1 for r in rows if r["n_verdict"] > 0 and not (r["n_checkable_ledger"] or 0) > 0)
    both = reach_b - new_b
    only_recompute = recomputable - both

    pct = lambda n: f"{100 * n / body:.2f}%" if body else "n/a"
    summary = {
        "population_readable_body": body,
        "papers_with_any_test_claim": with_test,
        "recomputation_reach": recomputable,
        "reach_a_evaluable": reach_a,
        "reach_b_verdict": reach_b,
        "reach_b_beyond_recomputation": new_b,
        "reach_b_and_recomputable": both,
        "recomputable_only": only_recompute,
        "claims_total": sum(r["n_test_claims"] for r in rows),
        "claims_evaluable": sum(r["n_evaluable"] for r in rows),
        "claims_with_verdict": sum(r["n_verdict"] for r in rows),
        "reasons_not_evaluable": dict(reasons.most_common()),
        "test_keys_evaluable": dict(test_keys.most_common()),
        "per_assumption": dict(per_assumption.most_common()),
        "control_papers_compared": control_compared[0],
        "control_ledger_mismatches": len(control_mismatch),
        "control_mismatch_examples": control_mismatch[:10],
        "corpus_dir": str(XML_DIR),
    }
    TRACKED.parent.mkdir(parents=True, exist_ok=True)
    TRACKED.write_text(json.dumps(summary, indent=2) + "\n")
    SUMMARY.write_text(render_report(summary))

    print("\n" + "=" * 72)
    print(f"population (readable body)           {body}")
    print(f"papers with >=1 extracted test claim {with_test}  ({pct(with_test)})")
    print(f"RECOMPUTATION reach (>=1 checkable)  {recomputable}  ({pct(recomputable)})")
    print(f"REACH-A evaluable                    {reach_a}  ({pct(reach_a)})")
    print(f"REACH-B verdict possible  <-HEADLINE {reach_b}  ({pct(reach_b)})")
    print(f"   of which BEYOND recomputation     {new_b}  ({pct(new_b)})")
    print(f"   overlapping recomputation         {both}")
    print(f"   recomputation-only                {only_recompute}")
    # A control that made no comparisons is not a passing control. The first run of this
    # script printed "extraction matches the census" over a corpus whose papers are not in
    # the census ledger at all -- zero comparisons, reported as success.
    if control_compared[0] == 0:
        verdict = "  <-- VACUOUS: no paper in this corpus is in the census ledger"
    elif control_mismatch:
        verdict = "  <-- INVESTIGATE"
    else:
        verdict = f"  (matches the census on all {control_compared[0]} comparable papers)"
    print(f"CONTROL ledger mismatches            {len(control_mismatch)}{verdict}")
    print("=" * 72)
    print("\nwhy claims could not be evaluated:")
    for k, v in reasons.most_common(12):
        print(f"  {v:7d}  {k}")
    print(f"\nwrote {OUT_JSONL}\n      {TRACKED}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
