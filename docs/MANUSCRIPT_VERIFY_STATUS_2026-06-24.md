# Manuscript verification module — working-capability status (for the PI)

**Date:** 2026-06-24 17:37 IST · **Branch:** `docs/plos-compbio-submission`
**Plan:** `docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md` · **Task log:** `docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md`

## Bottom line
We now have a **working manuscript-verification engine**. From a paper's text and its deposited
data, it re-runs the authors' statistical test, checks the assumptions, and returns a per-claim
verdict — **VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED / INSUFFICIENT_DATA / UNVERIFIABLE_EXTRACTION**
(+ a secondary statcheck-style INCONSISTENT_REPORTING). Demonstrated end-to-end on **both tabular
and genomics** data, on **real** datasets. Built in one session (2026-06-24); 11 of 24 Phase-A items.

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

## Verified (all green, in `.venv-verify` / plain python)
- `poc_a4_cascade.py` 4/4 · `check_t04_t06.py` 12/12 · `check_t09_accession.py` 11/11 ·
  `check_t12_t13_t19.py` 7/7 (every verdict type) · both demos.
- The control suite **caught two real bugs** during development (picker chose `filelist.txt` as data;
  resolver matched `'dependent'` inside `'independent'`) — both fixed.

## What's left (to a fully-automatic, productionised tool)
- **T21 genomics linking** (gene-row + sample-group metadata from the GEO series-matrix) + a
  **human-in-the-loop** review UI for ambiguous links + a **measured auto-link rate** on a real corpus.
- **T11 follow-ons**: `_RAW.tar`/GSM/series-matrix extraction; Zenodo/Dryad/figshare/OSF fetchers.
- **T10-SCHEMA** (persist LinkedDataset + verdicts), **T22-ORCHESTRATE** (wire into `manuscript_guardian`),
  **T08-CONSDEMOTE** (relabel the old consistency rate as a fallback signal), **T23** scoring profile,
  **T24** the standalone `/verify` surface + CLI.
- **Phase B** (the census): pre-register (OSF), run on 5–10k papers, manual double-coding for calibration.

## Dev environment
Local anaconda scipy is numpy-2 ABI-broken → use `.venv-verify` (python3.11; see TODO doc). Corpus +
GEO cache live on the external drive `/Volumes/My_Passport/stickforstats_corpus/` (not in git).
