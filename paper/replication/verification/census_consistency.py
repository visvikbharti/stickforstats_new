#!/usr/bin/env python3
"""
No-raw-data tier at scale — run verify_manuscript() over a local corpus and report the
consistency + coverage distribution. A Phase-B preview (the census's no-data layer) and a
sanity check on the capital-P extraction fix. Run in .venv-verify. Created 2026-06-24.
"""
from __future__ import annotations

import importlib
import sys
import types
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[3] / "backend"
for _n, _p in [("core", BACKEND / "core"), ("core.services", BACKEND / "core" / "services"),
               ("core.manuscript", BACKEND / "core" / "manuscript")]:
    if _n not in sys.modules:
        _m = types.ModuleType(_n); _m.__path__ = [str(_p)]; _m.__package__ = _n
        sys.modules[_n] = _m
vp = importlib.import_module("core.manuscript.verify_pipeline")

CORPUS = Path("paper/replication/manuscript_validation/corpus")


def main() -> int:
    files = sorted(CORPUS.glob("*.txt"))
    tot_claims = tot_with_p = tot_inconsistent = papers_inconsistent = low_cov = 0
    covs = []
    print("=" * 78)
    print("Consistency + coverage census (no-data tier) — verify_manuscript over the corpus")
    print("=" * 78)
    print(f"{'paper':16s} {'claims':>6s} {'cov':>5s} {'inconsist':>9s}")
    for f in files:
        text = f.read_text(errors="ignore")
        prof = vp.verify_manuscript(text, dataframe=None, full_text=text)
        with_p = sum(1 for v in prof.claim_verdicts if v.claimed_p_value is not None)
        tot_claims += prof.n_claims; tot_with_p += with_p
        tot_inconsistent += prof.n_inconsistent_reporting
        papers_inconsistent += 1 if prof.n_inconsistent_reporting else 0
        if prof.coverage is not None:
            covs.append(prof.coverage)
        low_cov += 1 if prof.low_coverage else 0
        cov = "n/a" if prof.coverage is None else f"{prof.coverage:.0%}"
        print(f"{f.stem:16s} {prof.n_claims:6d} {cov:>5s} {prof.n_inconsistent_reporting:9d}")
    n = len(files)
    mean_cov = sum(covs) / len(covs) if covs else 0
    print("-" * 78)
    print(f"papers={n}  total_claims={tot_claims}  claims_with_p={tot_with_p}")
    print(f"mean_coverage={mean_cov:.0%}  low_coverage_papers={low_cov}/{n}")
    print(f"internally-inconsistent claims (statcheck)={tot_inconsistent} "
          f"across {papers_inconsistent}/{n} papers")
    print("=" * 78)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
