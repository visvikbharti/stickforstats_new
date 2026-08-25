# Reproduction guide — manuscript-verification module + meta-research census

**Last updated:** 2026-06-26 · **Scope:** everything needed to reproduce, from scratch, both (A) the
raw-data verification engine (the product) and (B) the meta-research census (the parallel paper),
including the 2026-06-26 extractor false-positive fix and its validation.

This is the single end-to-end guide. Companion design/status docs:
`docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md` (design), `docs/MANUSCRIPT_VERIFY_STATUS_2026-06-24.md`
(status), `docs/SESSION_HANDOFF_2026-06-{24,25,26}.md` (build narrative). Workflow picture:
`WORKFLOW.svg` / `WORKFLOW.png` (source `workflow.dot`) in this directory.

---

## 0. Two things this module does

1. **Verification engine (the product).** Given a manuscript (+ its data, if available), re-run each
   reported statistical test on the raw data and return a per-claim verdict — or explicitly say the
   data are insufficient. It also checks whether the authors' assumptions actually hold. When raw data
   are unavailable it falls back to a statcheck-style internal-consistency signal.
   Verdict taxonomy (`backend/core/manuscript/verdicts.py`): `VERIFIED`, `DISCREPANT`,
   `ASSUMPTION_VIOLATED`, `ASSUMPTION_UNREPORTED`, `INSUFFICIENT_DATA`, `UNVERIFIABLE_EXTRACTION`
   (+ secondary `INCONSISTENT_REPORTING`). **`INSUFFICIENT_DATA` is a first-class result** — most
   papers land there because the raw data are not deposited.

2. **Meta-research census (the parallel paper).** Apply the no-raw-data tier at scale to a random
   sample of PMC Open-Access papers and measure: what fraction report an in-text recomputable NHST
   statistic, and of those, how many are internally inconsistent / decision-changing.

---

## 1. Prerequisites

| Need | Detail |
|---|---|
| **External drive** | `/Volumes/My_Passport` MUST be mounted. ~3.2 GB of corpus/ledger/GEO-cache lives ONLY at `/Volumes/My_Passport/stickforstats_corpus/` (NOT in git). Without it, every census/fetch step fails. |
| **Python venv** | `.venv-django` (repo root, gitignored): python3.11 + Django 4.2 + DRF + scipy 1.17 + numpy 2.4 + the heavy URLconf deps. The local anaconda scipy is numpy-2 ABI-broken — do **not** use it. Recreate with `python3.11 -m venv .venv-django && .venv-django/bin/pip install -r <deps>` (see the plan doc for the dep list). |
| **NCBI key (optional)** | `export NCBI_API_KEY=...` lifts the fetch rate 3→10/sec. Without it, fetches are polite at 3/sec. |
| **Disk** | Local `/` is tight (~1–2 GB free). All big data goes to the drive. |

All commands below are run from `backend/` with `DJANGO_DEBUG=True` and the `.venv-django` interpreter.

---

## 2. Part A — the verification engine (one command)

```bash
cd backend
DJANGO_DEBUG=True ../.venv-django/bin/python ../paper/replication/verification/run_all.py
```

Expected: **`ALL CHECKS PASS`** — 5 pass/fail checks + 4 informational demos/benchmark. What each proves
is tabulated in `README.md`. Key lines:

- `eval_vs_statcheck.py` → **RECALL (of statcheck) 97.7%, PRECISION 98.1%, F1 97.9%** (the extractor vs
  statcheck 1.5.0 on a 20-paper labelled set; the objective external benchmark).
- `check_t12_t13_t19.py` → the verdict pipeline, every verdict type on real data (7/7).

**T20 control suite (Phase-A exit instrument)** — pins all 5 verdict types as a Django test:
```bash
DJANGO_DEBUG=True ../.venv-django/bin/python manage.py test core.tests.test_verification_engine
```
correct→VERIFIED, perturbed→DISCREPANT, parametric-on-non-normal→ASSUMPTION_VIOLATED,
no-data→INSUFFICIENT_DATA, garbled→UNVERIFIABLE_EXTRACTION (6/6).

**Standalone CLI** (no server, no egress):
```bash
DJANGO_DEBUG=True ../.venv-django/bin/python ../paper/replication/verification/verify_cli.py PAPER.txt [--data DATA.csv] [--json]
```

**REST surface** (T24): `POST /api/v1/verify/analyze/` (manuscript file|text + optional data table),
token-gated `GET /api/v1/verify/report/<uuid>/`. No network egress by default. API tests:
`manage.py test core.tests.test_verify_api`.

---

## 3. Part B — the meta-research census (from scratch)

The census is **incremental**: a JSONL ledger keyed by PMCID; each run processes only NEW papers.
A full 10k corpus is ~80 min of polite fetching, done in time-bounded chunks (background tasks are
reaped at ~10 min; the fetcher caches by PMCID so re-running resumes).

**Corpus + ledger live on the drive:**
- corpus XMLs: `/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25/`
- ledger + flagged JSONL: `/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/`

**Sampling term** (the design-query population):
```
"open access"[filter] AND 2018:2025[pdat] AND (randomized OR cohort OR "case-control"
 OR regression OR ANOVA OR correlation OR "t-test")
```

### 3.1 Fetch a corpus chunk (~+1000 papers; resumable, seeds 0,1,2,…)
```bash
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python -c "
import sys; sys.path.insert(0,'.'); from pathlib import Path
from core.manuscript.pmc_fetcher import fetch_corpus_sample
TERM='\"open access\"[filter] AND 2018:2025[pdat] AND (randomized OR cohort OR \"case-control\" OR regression OR ANOVA OR correlation OR \"t-test\")'
fetch_corpus_sample(TERM, 1000, Path('/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25'), seed=<SEED>)"
```
Repeat with seeds 0..9 to reach ~10k (each chunk caps at the ~10-min reaper; just re-run with the next
seed). Day-clustered sampling (uniform over days, full day pool, up to 18/day); the per-paper day
volume is recorded in `fetch_stats.json` for inverse-probability weighting (§3.5).

### 3.2 Run / re-run the census (incremental; ~30–40 s for 1k new, ~6 min for a cold 10k rebuild)
```bash
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python -c "
import sys; sys.path.insert(0,'../paper/replication/verification'); from pathlib import Path
import census_jats
census_jats.run_census(Path('/Volumes/My_Passport/stickforstats_corpus/census_corpus_v2_2026-06-25'),
    summary_path=Path('$(pwd)/../paper/replication/verification/CENSUS_REPORT_LARGE_2026-06-25.md'))"
```
To force a full rebuild (after an engine change), move the ledger aside first:
`mv .../census_2026-06-25/census_census_corpus_v2_2026-06-25.jsonl{,.bak}` then re-run (kill-safe:
the ledger is flushed atomically every 1000 papers, so a reaped run resumes).

**Expected headline (10,103 papers, corrected p-reader):** report `CENSUS_REPORT_LARGE_2026-06-25.md`
carries the ORIGINAL scoring and is headed with a correction banner; the numbers below are current.
- **3.4%** of papers report an in-text recomputable NHST statistic (341 of 10,101 readable bodies).
- of **3,005 checkable claims, 11.81% inconsistent (raw)**; **1.73% decision-changing**; 39.9% of
  checkable-claim papers (136/341) have ≥1 inconsistency.
- CONTROL: re-run with the UNCORRECTED p-reader and you must reproduce 333 / 52 / 129 exactly.

### 3.3 Dump every flagged claim with context
```bash
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python ../paper/replication/verification/inspect_inconsistencies.py
```
→ `/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/flagged_inconsistencies.jsonl`
(333 flagged claims, 52 decision-changing, as originally scored). The re-scored frame — the
published input from 2026-08-24 — is tracked in-tree at
`paper/census_paper/data/flagged_inconsistencies_corrected.jsonl` (355 rows,
sha256 7613bb7d…dd95), and the scripts below prefer it automatically.

### 3.4 Adjudicate false positives (TRUE vs FP categories)
```bash
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python ../paper/replication/verification/adjudicate_inconsistencies.py
```
→ `FP_VALIDATION_REPORT_2026-08-24.md`. **Expected (corrected frame): 355 flagged → TRUE_LIKELY 77%,
FP_MISEXTRACTION 0, FP_ONE_TAILED 14%, REVIEW_P_BOUND ~9%; clear-false-positive rate 13.5%.**
(Pre-fix it was 450 flagged, 45% clear-FP, FP_MISEXTRACTION 157 — see §4.)

### 3.5 Robustness — inverse-probability weighting (equal-probability, same population, no fetch)
```bash
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python ../paper/replication/verification/census_ipw.py
```
→ `CENSUS_IPW_REPORT_2026-08-24.md`. Re-weights every paper by its recorded day volume to recover the
equal-probability estimand. **Expected: the headline barely moves** — inconsistent 11.08%→10.52%
(0.56 pp), recomputable 3.38%→3.39%, decision-changing 1.73%→1.46%. The day-clustering did not bias
the rate.

### 3.6 Independent frame — PMC OA web-service pilot (generalizability)
```bash
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python ../paper/replication/verification/oa_pilot.py [TARGET_N] [SEED]
```
Samples the GENERAL OA population (no design-query enrichment) via `oa.fcgi`, into
`/Volumes/My_Passport/stickforstats_corpus/oa_pilot_2026-06-26/`; then census that dir (§3.2 with that
path). Tests whether the inconsistency rate generalizes beyond quantitative-design papers. (NCBI
retired `oa_file_list.csv`; `oa.fcgi` is the current date-based enumeration endpoint. The recomputable
PAPER rate is lower here — no enrichment — so a bounded pilot has a wider CI; the same-population
robustness result is §3.5.)

To re-score an already-fetched OA corpus, move the ledger aside first or `run_census` will reuse the
stored per-paper records and "reproduce" the old numbers by construction rather than by control:
```bash
mv .../census_2026-06-25/census_oa_pilot_2026-06-26.jsonl{,.bak}
cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python -c "
from pathlib import Path; import sys; sys.path.insert(0,'../paper/replication/verification')
import census_jats; census_jats.run_census(
    Path('/Volumes/My_Passport/stickforstats_corpus/oa_pilot_2026-06-26'),
    summary_path=Path('/tmp/oa.md'))"
```
**Expected (corrected p-reader, 2026-08-25):** 246 XML / 230 readable bodies; **5 papers (2.2%)** with a
checkable claim; 354 test claims, **108 checkable**; **7 inconsistent = 6.5%**; **0 decision-changing**;
4 of the 5 checkable papers carry a flag. Report: `CENSUS_OA_PILOT_REPORT_2026-08-25.md`.
- **CONTROL:** check out the pre-fix reader
  (`git checkout f979b89^ -- backend/core/manuscript/consistency_core.py backend/core/manuscript/verdict_decision.py`),
  move the ledger aside, re-run, and you must reproduce **6/108 = 5.6%** and 0 decision-changing exactly.
  Restore with `git checkout HEAD -- <those two paths>` and confirm `git status` is clean before doing
  anything else.

---

## 4. The 2026-06-26 extractor false-positive fix (what changed and why it matters)

The dominant census false positive (`FP_MISEXTRACTION`) was **five** distinct extractor bugs, each
traced to a real corpus PMCID (see `docs/SESSION_HANDOFF_2026-06-26.md`):

1. **Scoped p-attachment** — a generic statistic ("F = 5.48", no p in its own matched text) borrowed a
   p-value from a neighbouring claim. Now a standalone p attaches only to the closest PRECEDING
   statistic, within a 40-char window (corpus-calibrated; max legit gap 33), no sentence break between.
2. **df-arity guard** — a t-test with a 2-tuple df (`t(1,644)`) is ambiguous → not recomputable.
   (Chi-square keeps df[0]: its 2-tuple is the unambiguous `(df, N)` form.)
3. **Generic-stat guards** — Cohen's `d z`/`d_z` and function notation `Z(Y)` are not test statistics.
4. **p-parse** — the leading dot is captured, so `p = 1` is 1.0 not 0.1; a malformed two-dot token
   degrades to not-checkable instead of crashing.
5. **Strict patterns** accept `;` separators and a fractional F df1 (Greenhouse-Geisser), so genuinely
   paired results keep their p (correct attribution + recall).

**Effect (apples-to-apples on the same 10,103-paper corpus; pre-fix obtained via `git stash` of the two
engine files):** `FP_MISEXTRACTION` 157→0; raw inconsistent 14.5%→11.1%; decision-changing 4.2%→1.7%;
clear-false-positive rate 45%→14%. **No statcheck regression** (recall 97.7%, precision 98.1%).
Validated by a 21-agent adversarial review (4 minor follow-ups found + fixed). Regression tests:
```bash
DJANGO_DEBUG=True ../.venv-django/bin/python manage.py test core.tests.test_claim_extractor_pmispairing
```
(26 tests, each tied to a real PMCID).

---

## 5. File map

**Engine (`backend/core/manuscript/`):** `verdicts.py` (taxonomy) · `verify_pipeline.py` (orchestrator)
· `reanalysis_engine.py` (re-run on data) · `consistency_core.py` + `claim_extractor.py` (shared
engine) · `verification_service.py` (Django persist, T22) · `genomics_linker.py` + `geo_metadata.py`
(auto-link GEO data) · `jats_parser.py` + `pmc_fetcher.py` (census).
**Surface:** `backend/api/v1/verify_views.py` (T24) · migration `0014_*` (T10 models).
**Tests:** `backend/core/tests/test_verification_engine.py` (T20) · `test_claim_extractor_pmispairing.py`
· `test_consistency_*` · `test_verify_api.py`.
**Replication scripts (`paper/replication/verification/`):** `run_all.py` (one-command suite) ·
`verify_cli.py` · `check_*` (controls) · `eval_vs_statcheck.py` (benchmark) · `census_jats.py` +
`large_census.py` (census) · `inspect_inconsistencies.py` + `adjudicate_inconsistencies.py` (FP
validation) · `census_ipw.py` (robustness) · `oa_pilot.py` (independent frame) · `demo_*` ·
`scale_genomics_verify.py` + `geo_autolink_rate.py` (genomics).
**Reports (all regenerable):** `CENSUS_REPORT_LARGE_2026-06-25.md`, `FP_VALIDATION_REPORT_2026-08-24.md`,
`CENSUS_IPW_REPORT_2026-08-24.md`, `SCALE_REPORT_2026-06-25.md`, `GEO_AUTOLINK_REPORT_2026-06-25.md`.
**Diagram:** `workflow.dot` → `WORKFLOW.svg` / `WORKFLOW.png`.

---

## 6. Mandatory caveats (carry into any write-up)

- **Conditional population.** PMC OA biomedical 2018–2025 matching a quantitative-design query AND
  reporting ≥1 inline regex-recomputable NHST statistic. NOT a literature-wide estimate.
- **Extraction scope.** Inline running text + flattened table cells only; figures not read; two-tailed
  recompute only (one-sided p is a known residual FP, ~14% of flags). So the in-text recomputable rate
  is a LOWER bound on reportable statistics.
- **Descriptive vs confirmatory.** This is the DESCRIPTIVE census. The pre-specified hypotheses and
  human double-coding for κ are OSF-pre-registered separately
  (`docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`, 10 [PI DECISION] items, not yet filed).
- **FP-validated genuine rate 9.12%, 95% CI [6.95%, 11.49%]** (paper-clustered bootstrap, 10,000
  replicates, seed 20260627) of checkable claims; the raw 11.81% still includes one-sided-p and some
  rounding-level flags. The interval crosses 10%, so this is NOT described as a single-digit rate.
  Full double-coding is the pre-registered study.
