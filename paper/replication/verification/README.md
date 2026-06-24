# Manuscript-verification module — verification & demos

Built 2026-06-24. The engine + pipeline that re-runs a manuscript's reported statistics on its
deposited data and returns per-claim verdicts. Design + work plan:
`docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md`; status: `docs/MANUSCRIPT_VERIFY_STATUS_2026-06-24.md`;
task log: `docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md`. Code lives in `backend/core/manuscript/`.

## Run everything (one command)
```bash
# one-time: dedicated venv (the local anaconda scipy is numpy-2 ABI-broken)
python3.11 -m venv .venv-verify
.venv-verify/bin/pip install numpy scipy pandas scikit-learn statsmodels matplotlib seaborn
# run the whole suite (5 pass/fail checks + 4 demos/benchmark)
.venv-verify/bin/python paper/replication/verification/run_all.py
```

## What each script is
| Script | What it checks |
|---|---|
| `poc_a4_cascade.py` | T05 — the cascade engine IS the A4 verifier (Iris/Wine → VERIFIED/DISCREPANT) |
| `check_t04_t06.py` | T04 INCONSISTENT_REPORTING adapter + T06 coverage/UNVERIFIABLE gate (12/12) |
| `check_t09_accession.py` | T09 accession extraction across 15 repositories (11/11) |
| `check_t12_t13_t19.py` | the full verdict pipeline — every verdict type on real data (7/7) |
| `check_verify_pipeline.py` | `verify_manuscript()` paper-level profile |
| `eval_vs_statcheck.py` | **T03 benchmark** vs statcheck — recall 97.7%, precision 93.2%, F1 95.4% |
| `demo_tabular_end_to_end.py` | text → extract → import → link → verify (tabular) |
| `demo_genomics_end_to_end.py` | DAS text → GSE271517 fetch → gene link → verify (MKI67 VERIFIED, CFTR ASSUMPTION_VIOLATED) |
| `census_consistency.py` | no-data tier over 20 papers (35 statcheck inconsistencies, 12/20) |
| `pilot_data_availability.py` | data-availability pilot (32% of biomedical papers name a data accession) |
| `funnel_geo.py` | GEO resolve→ingest funnel (17% directly ingestible) |

## The verdict taxonomy (`backend/core/manuscript/verdicts.py`)
`VERIFIED` · `DISCREPANT` · `ASSUMPTION_VIOLATED` · `ASSUMPTION_UNREPORTED` · `INSUFFICIENT_DATA`
· `UNVERIFIABLE_EXTRACTION` (+ secondary `INCONSISTENT_REPORTING`). `INSUFFICIENT_DATA` is a
first-class result — most papers land there because the raw data are unavailable.

## CLI (the standalone surface)
```bash
.venv-verify/bin/python paper/replication/verification/verify_cli.py PAPER.txt [--data DATA.csv] [--json]
```

## Notes
- Corpus + GEO cache live on the external drive `/Volumes/My_Passport/stickforstats_corpus/` (not in git).
- Engine imports sidestep Django (`core/services/__init__` pulls Django) via namespace packages — see any script's header.
