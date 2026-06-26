#!/usr/bin/env python3
"""
Extract every flagged internal-inconsistency from the census corpus WITH full context, for
false-positive adjudication (validating the ~15% headline against statcheck-style artifacts).
=============================================================================================

The census reports per-paper inconsistency counts; to estimate the FALSE-POSITIVE rate (one-tailed
tests, rounding, p-reported-as-inequality, multiple-comparison correction, wrong test-type mapping)
we need the individual flagged claims. This re-runs the consistency check over only the corpus papers
the ledger says have >=1 inconsistency (fast) and dumps each flagged claim's full context to JSONL.

Output: /Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/flagged_inconsistencies.jsonl
Run:  cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python \
        ../paper/replication/verification/inspect_inconsistencies.py [CORPUS_DIR]
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "backend"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "stickforstats.settings")
os.environ.setdefault("DJANGO_DEBUG", "True")
import django  # noqa: E402

django.setup()

from core.manuscript.jats_parser import parse_jats  # noqa: E402
from core.manuscript.claim_extractor import StatisticalClaimExtractor, is_test_claim  # noqa: E402
from core.manuscript.consistency_adapter import evaluate_consistency  # noqa: E402

CORPUS = Path(sys.argv[1]) if len(sys.argv) > 1 else \
    Path("/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25")
OUT_DIR = Path("/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25")
LEDGER = OUT_DIR / f"census_{CORPUS.name}.jsonl"
OUT = OUT_DIR / "flagged_inconsistencies.jsonl"


def main() -> int:
    if not LEDGER.exists():
        print(f"no ledger at {LEDGER}; run the census first")
        return 1
    # papers the census says have >=1 inconsistency
    pmcids = []
    for line in LEDGER.read_text().splitlines():
        try:
            r = json.loads(line)
            if (r.get("n_inconsistent") or 0) > 0 and r.get("pmcid"):
                pmcids.append(r["pmcid"])
        except Exception:
            pass
    print(f"{len(pmcids)} papers flagged with >=1 inconsistency in the ledger")

    extractor = StatisticalClaimExtractor()
    flagged = []
    for pmcid in pmcids:
        f = CORPUS / f"{pmcid}.xml"
        if not f.exists():
            continue
        doc = parse_jats(f)
        if doc is None or not doc.has_body:
            continue
        for c in extractor.extract(doc.census_text, section="Results"):
            if not is_test_claim(c):
                continue
            sig = evaluate_consistency(c)
            if sig.checkable and sig.is_consistent is False:
                flagged.append({
                    "pmcid": pmcid,
                    "raw_text": (getattr(c, "raw_text", "") or "")[:400],
                    "claim_type": getattr(c, "claim_type", ""),
                    "statistic": getattr(c, "statistic_value", None),
                    "df": getattr(c, "df", None),
                    "reported_p": sig.reported_p,
                    "p_comparison": sig.p_comparison,
                    "recomputed_p": sig.computed_p,
                    "severity": sig.severity,                 # major | gross_error(decision-changing)
                    "discrepancy": sig.discrepancy,
                })

    OUT.write_text("\n".join(json.dumps(x) for x in flagged) + "\n")
    n_gross = sum(1 for x in flagged if x["severity"] == "gross_error")
    print(f"\nextracted {len(flagged)} flagged inconsistent claims ({n_gross} decision-changing) "
          f"-> {OUT}")
    print("\nsample (first 8):")
    for x in flagged[:8]:
        print(f"  [{x['severity']}] {x['claim_type']} stat={x['statistic']} df={x['df']} "
              f"reported p{x['p_comparison']}{x['reported_p']} vs recomputed p={x['recomputed_p']:.4g}")
        print(f"      \"{x['raw_text'][:140]}\"")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
