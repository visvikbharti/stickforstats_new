# Manuscript verification module — working-capability status (for the PI)

**Date:** 2026-06-24 17:37 IST; **updated 2026-06-25 06:20 IST** · **Branch:** `docs/plos-compbio-submission`
**Plan:** `docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md` · **Task log:** `docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md`

> **2026-06-25 update.** The engine now has a **real REST surface + database persistence**, running
> under a full Django stack: `POST /api/v1/verify/analyze/` (manuscript + optional data table →
> per-claim verdicts + verifiability rate + coverage) and a token-gated `GET /api/v1/verify/report/`.
> Results persist to three new tables (`VerificationRun`, `ClaimVerdictRecord`, `LinkedDataset`).
> Tested end-to-end (VERIFIED-from-data, IDOR token gating, no-data→INSUFFICIENT_DATA). The
> separate **no-data** consistency review (`/manuscript/analyze`) is untouched — "shared engine,
> separate surface". Phase A now **17/24**. A Phase-B **OSF pre-registration draft** exists:
> `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md` (10 decisions awaiting the PI). The
> Case Study 4 / Group B manuscript correction remains PI-gated and was intentionally NOT touched.

## Bottom line
We now have a **working manuscript-verification engine**. From a paper's text and its deposited
data, it re-runs the authors' statistical test, checks the assumptions, and returns a per-claim
verdict — **VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED / INSUFFICIENT_DATA / UNVERIFIABLE_EXTRACTION**
(+ a secondary statcheck-style INCONSISTENT_REPORTING). Demonstrated end-to-end on **both tabular
and genomics** data, on **real** datasets, and now exposed through a **REST API with database
persistence**. Built across 2026-06-24/25; **17 of 24 Phase-A items**.

This is the tool your lab asked for: it verifies *using the raw data*, and says **"insufficient data
to verify"** (a first-class verdict) when the data are not available — which the pilots show is the
common case.

## The pipeline that works today
```
manuscript text ─▶ extract statistical claim (regex; +coverage gate so low recall can't read as "clean")
                ─▶ find data accession in the data-availability statement   (T09: 15 repositories)
                ─▶ fetch + decompress + ingest the dataset                  (T11: GEO path; .gz/.zip, tsv/csv)
                ─▶ link the claim to the dataset's columns/groups           (T21: tabular)
                ─▶ resolve the authors' test and RE-RUN it (no substitution)(T12 + T13, Guardian engine)
                ─▶ check assumptions separately (T14 independence-gated)
                ─▶ compare recomputed vs claimed (T15 rounding-aware)
                ─▶ assign the verdict (T19 precedence)
```

## Two live end-to-end demos (run in `.venv-verify`)

**Tabular** (`paper/replication/verification/demo_tabular_end_to_end.py`):
clinical table + claim *"biomarker higher in treatment, t(78)=2.9, p=.005"* → auto-linked
`biomarker × group` → recomputed t=2.897 → **VERIFIED**; an inflated claim (t=8.10) → **DISCREPANT**.

**Genomics** (`paper/replication/verification/demo_genomics_end_to_end.py`):
data-availability sentence → accession **GSE271517** → fetched **63,677 × 92** count matrix →
- **MKI67, TOP2A → VERIFIED** (t reproduces; these high-expression markers pass normality)
- **CFTR (ENSG00000001626) → ASSUMPTION_VIOLATED** — the t reproduces, *but* 15.1% outliers fail the
  per-gene t-test's assumptions. **This is the Case Study 4 thesis, delivered as a verification verdict.**

## What we measured along the way (the product's bottleneck, honestly)
- **Data-availability pilot** (80 biomedical PMC-OA papers): **32%** name a real data accession;
  **44%** are verifiable candidates; GEO is #1. Psychology baseline: 10% / 35%.
- **GEO resolve→ingest funnel**: of 12 GEO accessions, only **2 (17%)** directly yield an ingestible
  processed matrix (the rest: no series-suppl dir, only raw `_RAW.tar`, or unparseable).
- **Compound finding:** directly-verifiable raw data is the **exception**, even for the #1 repository.
  → `INSUFFICIENT_DATA` dominates; **"% unverifiable" is the meta-research headline** (this is publishable).

## No-data tier at scale (Phase-B preview, `census_consistency.py`)
Running the verifier (no data) over the 20-paper corpus: **473 statistical-test claims** (filtered
from 1,105 raw extractions — bare sample-size/CI/effect-size/standalone-p fragments are excluded by
the `is_test_claim` precision gate, while coverage is still computed on the full set), **100% coverage
on every paper, and 35 statcheck inconsistencies across 12/20 papers (60%)** — consistent with the
meta-research literature (~50%, Nuijten 2016). This is the no-raw-data tier (statcheck + coverage)
working on real papers; it previews the census's broad layer. **Spot-validated as TRUE positives:**
in PMC13223457, F(2,58)=3.728 recomputes to p≈0.030 (reported 0.061 — a decision-changing error),
and 5 further F-tests are off beyond rounding — i.e. the tool finds genuine mis-reported statistics,
not parsing artifacts.

> **Manuscript note:** a real-paper run exposed an extraction bug — the F/χ²/correlation/z/beta and
> standalone-p regexes only matched lowercase `p`, so papers reporting `P = 0.193` (the majority)
> got *no* p-value attached (claims-with-p 0→79 after the fix; coverage 0%→100%). The current
> manuscript's statcheck head-to-head (Table 8) was computed with the buggy extractor, so its recall
> is understated — relevant when the verifier becomes its own paper / for the census.

## Extraction benchmark (T03, vs statcheck — the Phase-A exit instrument)
`eval_vs_statcheck.py` benchmarks our extractor against statcheck 1.5.0 (the de-facto NHST
extractor; its 266 recomputable statistics across the 20-paper corpus are the objective reference):
- **Recall 97.7%** (260/266) · **Precision 93.2%** (on statcheck-covered papers) · **F1 95.4%**.
- Near-perfect agreement where both operate (per-paper mostly 100%/100%).
- **+84 additional recomputable statistics in 6 papers statcheck extracted nothing from** — a recall
  advantage (real claims, validated), not false positives.
- Flagged inconsistent: statcheck 47, ours 34, ours decision-changing 5 (precision-over-recall by design).

> **Table 8 refresh:** the manuscript's statcheck head-to-head was computed with the buggy
> lowercase-`p` extractor (recall understated). With the fix the extractor recovers **97.7%** of
> statcheck's statistics plus 84 it misses — the head-to-head should be re-run for the verifier paper.

## Verified (all green, in `.venv-verify` / plain python)
- `poc_a4_cascade.py` 4/4 · `check_t04_t06.py` 12/12 · `check_t09_accession.py` 11/11 ·
  `check_t12_t13_t19.py` 7/7 (every verdict type) · both demos.
- The control suite **caught two real bugs** during development (picker chose `filelist.txt` as data;
  resolver matched `'dependent'` inside `'independent'`) — both fixed.

## Standalone REST surface + persistence (NEW 2026-06-25)
- **`POST /api/v1/verify/analyze/`** (`backend/api/v1/verify_views.py`) — accepts a manuscript
  (`file`: PDF/LaTeX/DOCX/TXT, or raw `text`) + an optional `data` table (CSV/TSV/XLSX) + `alpha`.
  Returns the paper-level profile (verdict distribution, verifiability rate, coverage, certify note)
  + per-claim verdicts, a `run_id`, and a one-time retrieval token. **No network egress by default** —
  it verifies only data you upload (accession auto-fetch is a deliberate opt-in follow-on).
- **`GET /api/v1/verify/report/<run_id>/?token=…`** — token-gated retrieval (missing/wrong token →
  404, never confirms existence), mirroring the manuscript-report IDOR protection.
- **Persistence** (`backend/core/models.py`, migration `0014`): `VerificationRun` (paper profile +
  IDOR token), `ClaimVerdictRecord` (per-claim; hot fields indexed for the Phase-B census, full
  verdict JSON in `detail`), `LinkedDataset` (data provenance). Glue: `verification_service.py`.
- **Tests:** `backend/core/tests/test_verify_api.py` (4) green; 16 neighbor Django tests green; the
  full verification-core suite still ALL-PASS.

## What's left (to a fully-automatic, productionised tool)
- **T21 genomics linking** (gene-row + sample-group metadata from the GEO series-matrix) + a
  **human-in-the-loop** review UI for ambiguous links + a **measured auto-link rate** on a real corpus.
- **T11 follow-ons**: `_RAW.tar`/GSM/series-matrix extraction; Zenodo/Dryad/figshare/OSF fetchers.
- **T24 follow-ons**: frontend `ManuscriptAnalyzer`/`ReviewerReport` reframe; CLI `--no-egress` flag;
  accession auto-fetch (opt-in); **B2 Celery batch** for the 5–10k census.
- **T08-CONSDEMOTE** (relabel the old consistency rate as a fallback signal), **T23** scoring
  follow-ons (%-among-verifiable + assumption-reporting completeness + the B3 calibration slot),
  **T17/T18** assumption-unreported detector + discipline checklists, **T20** formal control suite
  as a Django test.
- ✅ **T10-SCHEMA**, **T22-ORCHESTRATE (Django leg)**, **T24 core endpoints** — DONE 2026-06-25.
- **Phase B** (the census): the **OSF pre-reg DRAFT is written** (`MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`)
  — resolve the 10 PI decisions in its §11, then run on 5–10k papers with manual double-coding for κ + calibration.
- **2026-06-26 — extractor p-mis-pairing FIXED** (5 mechanisms; see `docs/SESSION_HANDOFF_2026-06-26.md`).
  Re-census on the same 10,103 papers: inconsistent **14.5%→11.1%**, decision-changing **4.2%→1.7%**,
  adjudicated clear-FP **45%→14%** (`FP_MISEXTRACTION` 157→0). statcheck recall 97.7% / prec 98.1% (no
  regression). The dominant census artifact is now removed at the extractor level, not just discounted;
  validated true rate still ≈6–8% of checkable. Reports regenerated (`CENSUS_REPORT_LARGE`/`FP_VALIDATION`).

## Dev environment
- **Verification-core (Django-free):** `.venv-verify` (python3.11) — local anaconda scipy is numpy-2
  ABI-broken, so the pure leaf modules run here.
- **Full app (Django + scipy):** `.venv-django` (python3.11; Django 4.2.30 + DRF + scipy 1.17 +
  numpy 2.4 + the heavy URLconf deps). Run the API tests / migrations here:
  `cd backend && DJANGO_DEBUG=True ../.venv-django/bin/python manage.py test core.tests.test_verify_api`.
  Both venvs are gitignored.
- Corpus + GEO cache live on the external drive `/Volumes/My_Passport/stickforstats_corpus/` (not in git).
