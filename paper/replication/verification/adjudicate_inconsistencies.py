#!/usr/bin/env python3
"""
Adjudicate the flagged inconsistencies into TRUE vs FALSE-POSITIVE categories (transparent rules).
==================================================================================================

Validates the census's ~15% inconsistency headline by classifying every flagged claim:
  * FP_MISEXTRACTION  — the claim's own text contains NO p-value, so the reported p was mis-paired
                        from a neighbouring claim (an extractor p-attachment artifact, not a real
                        inconsistency). The single biggest false-positive source.
  * FP_ONE_TAILED     — recomputed (two-tailed) p ≈ 2× reported p ⇒ the paper reported a one-sided
                        p; our recompute is two-tailed only, so this is a known non-error.
  * REVIEW_P_BOUND    — p reported as an inequality (p<x / p>x); recompute-vs-bound is ambiguous,
                        flag for human/LLM review rather than counting as a hard error.
  * TRUE_LIKELY       — the claim states both a recomputable statistic and a point p in its own text,
                        not one-tailed, beyond tolerance ⇒ a genuine internal inconsistency.

Prints the breakdown + the CORRECTED inconsistency rate, and writes a report.
Run: cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
       ../paper/replication/verification/adjudicate_inconsistencies.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

# The 3.2 GB raw corpus lives on an external drive, but the DERIVED inputs this script needs are
# ~2 MB and kept in-tree. Prefer the drive when mounted, fall back to the local copies otherwise.
# A generator that can ONLY run with the drive attached is a generator a correction cannot reach:
# the reports it writes then drift from the manuscript and nothing notices.
_DRIVE = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
_LOCAL = ROOT / "paper/census_paper/osf_deposit/data"
OUT_DIR = _DRIVE if _DRIVE.exists() else _LOCAL

# The CORRECTED 355-row frame is the published input from 2026-08-24 onward. The 333-row
# pre-correction frame is kept beside it so the re-score keeps a control.
_CORRECTED = ROOT / "paper/census_paper/data/flagged_inconsistencies_corrected.jsonl"
FLAGGED = _CORRECTED if _CORRECTED.exists() else (OUT_DIR / "flagged_inconsistencies.jsonl")
REPORT = ROOT / "paper/replication/verification/FP_VALIDATION_REPORT_2026-08-24.md"

# A p-value stated in the claim's OWN text (e.g. "p = 0.0057", "P<0.001", "p = .03",
# "P = 9.04e-8", "p = 6E-04").
#
# The scientific-notation alternative is NOT cosmetic. Until 2026-08-24 this pattern was
# `\b[pP]\s*[=<>]\s*0?\.\d` -- a p written in e-notation did not match, so the claim was
# classified FP_MISEXTRACTION with the reason "no p-value in the claim's own text", which is
# simply false: the p IS in the text, it is just not written with a leading decimal point.
#
# It was harmless on the 333-claim frame (0 rows affected, measured) and became load-bearing the
# moment the p-reader was corrected in f979b89: on the re-scored 355-claim frame, 13 rows matched
# FP_MISEXTRACTION and ALL 13 were e-notation claims, none a real mis-extraction. Those are the
# very claims the p-reader fix added, so the adjudicator would have discarded the correction.
# Same shape as the defect it mirrors: a rule learned in one module, not carried to the next.
#
# `−` (U+2212) is included because papers write "6E−04" with a real minus sign, and `\s` already
# matches the U+2009 thin spaces that JATS extraction leaves behind.
# An integer right-hand side ("p = 5") deliberately does NOT match -- it is not a p-value.
_P_IN_TEXT = re.compile(
    r"\b[pP]\s*[=<>≤≥]\s*"
    r"(?:"
    r"\d*\.\d+(?:\s*[eE]\s*[-+−]?\d+)?"   # .012   0.012   2.30e-03   1.843e-8
    r"|"
    r"\d+\s*[eE]\s*[-+−]?\d+"              # 6E-04  1e-5  (integer mantissa)
    r")",
)


def classify(x: dict) -> tuple:
    raw = x.get("raw_text", "") or ""
    rep = x.get("reported_p")
    rec = x.get("recomputed_p")
    comp = (x.get("p_comparison") or "").lower()

    if not _P_IN_TEXT.search(raw):
        return "FP_MISEXTRACTION", "no p-value in the claim's own text (p mis-paired from elsewhere)"
    if rep and rec and rep > 0 and abs(rec - 2.0 * rep) <= 0.25 * rec:
        return "FP_ONE_TAILED", "recomputed (two-tailed) ≈ 2× reported ⇒ one-sided p reported"
    if "less" in comp or "greater" in comp:
        return "REVIEW_P_BOUND", "p reported as an inequality; recompute-vs-bound is ambiguous"
    return "TRUE_LIKELY", "point p stated in-text, two-tailed, beyond tolerance ⇒ genuine"


def main() -> int:
    if not FLAGGED.exists():
        print(f"no flagged file at {FLAGGED}; run inspect_inconsistencies.py first")
        return 1
    rows = [json.loads(line) for line in FLAGGED.read_text().splitlines() if line.strip()]
    from collections import Counter
    cats = Counter()
    gross_cats = Counter()
    examples = {}
    for x in rows:
        cat, why = classify(x)
        cats[cat] += 1
        if x.get("severity") == "gross_error":
            gross_cats[cat] += 1
        examples.setdefault(cat, []).append(x)

    n = len(rows)
    true_n = cats["TRUE_LIKELY"]
    review_n = cats["REVIEW_P_BOUND"]
    fp_n = cats["FP_MISEXTRACTION"] + cats["FP_ONE_TAILED"]

    lines = [
        "# False-positive validation of the census inconsistency flags",
        "",
        "_Generated by `adjudicate_inconsistencies.py` over the 10,103-paper census, "
        "AFTER the 2026-06-26 extractor p-mis-pairing fix (scoped p-attachment + df-arity guard + "
        "generic-stat guards + p=1 parse + `;`/fractional-df capture)._",
        "",
        f"Flagged inconsistent claims (raw): **{n}**  (decision-changing: "
        f"{sum(1 for x in rows if x.get('severity') == 'gross_error')})",
        "",
        "## Breakdown (transparent rules)",
        "",
        "| category | n | of which decision-changing |", "|---|---|---|",
        *[f"| {c} | {cats[c]} | {gross_cats[c]} |" for c in
          ("TRUE_LIKELY", "REVIEW_P_BOUND", "FP_ONE_TAILED", "FP_MISEXTRACTION")],
        "",
        "## Corrected reading",
        f"- **clear false positives: {fp_n}/{n} = {fp_n / n:.0%}** "
        f"({cats['FP_MISEXTRACTION']} mis-extraction + {cats['FP_ONE_TAILED']} one-tailed)",
        f"- ambiguous (p reported as a bound), needs review: {review_n}",
        f"- **likely-true internal inconsistencies: {true_n}/{n} = {true_n / n:.0%}**",
        "",
        "The 2026-06-26 extractor fix ELIMINATED the dominant artifact: FP_MISEXTRACTION fell from 157 "
        "(35% of flags, pre-fix 10k) to 0 — a statistic's p-value is now bound only when it is genuinely "
        "part of the same reported result (scoped attachment), and ambiguous-df / effect-size-subscript / "
        "function-notation mis-extractions are no longer recomputed. The raw claim-inconsistency rate "
        "accordingly dropped 14.5% -> 11.1% and decision-changing 4.2% -> 1.7%. The residual clear false "
        "positives are now dominated by one-sided p-values (our recompute is two-tailed only); the "
        "defensible **true** rate remains the TRUE_LIKELY fraction (a LOWER bound; REVIEW_P_BOUND may add "
        "some, and a minority of TRUE_LIKELY are rounding-level). Full double-coding for the precise rate "
        "is the OSF-pre-registered study.",
        "",
        "## Examples per category",
    ]
    for c in ("TRUE_LIKELY", "FP_MISEXTRACTION", "FP_ONE_TAILED", "REVIEW_P_BOUND"):
        lines.append(f"\n**{c}:**")
        for x in examples.get(c, [])[:4]:
            rp = x.get("recomputed_p")
            lines.append(f"- `{x['raw_text'][:120]}` — reported p{x.get('p_comparison','')}"
                         f"{x.get('reported_p')} vs recomputed {rp:.4g}" if rp is not None else
                         f"- `{x['raw_text'][:120]}`")
    REPORT.write_text("\n".join(lines))

    print(f"flagged: {n} | TRUE_LIKELY: {true_n} ({true_n/n:.0%}) | "
          f"FP_MISEXTRACTION: {cats['FP_MISEXTRACTION']} | FP_ONE_TAILED: {cats['FP_ONE_TAILED']} | "
          f"REVIEW_P_BOUND: {review_n}")
    print(f"clear false positives: {fp_n}/{n} = {fp_n/n:.0%}")
    print(f"wrote {REPORT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
