---
title: "Manuscript-Verification Module + Meta-Research Census"
subtitle: "Status briefing — 2026-06-26"
author: "Vishal Bharti · PI: Debojyoti Chakraborty (CSIR-IGIB)"
date: "2026-06-26"
---

## The steer (from the lab meeting)

- **Internal-consistency flagging (statcheck-style) is NOT the goal** — it's a fallback signal only.
- The module must **verify each reported statistic against the authors' RAW DATA**, or explicitly
  return **"insufficient data to verify"** (a first-class result).
- It must also check **whether the authors' statistical assumptions actually hold** (e.g. normality /
  variance before a t-test / ANOVA).
- This is the harder, honest tool — and the one editors/publishers would care about.

## Two deliverables

1. **Verification engine (the product)** — re-run a paper's statistics on its data → per-claim verdict.
2. **Meta-research census (a parallel paper)** — apply the no-data tier at scale to measure how
   verifiable the open-access literature actually is.

Both built on a shared regex extractor + statcheck-style recompute core.

## The complete workflow

![Verifier engine (A) + meta-research census (B), with the shared engine and the robustness arms.](/Users/vishalbharti/StickForStats_v1.0_Production/paper/replication/verification/WORKFLOW.png)

## The verdict taxonomy

`VERIFIED` · `DISCREPANT` · `ASSUMPTION_VIOLATED` · `ASSUMPTION_UNREPORTED` · `INSUFFICIENT_DATA` ·
`UNVERIFIABLE_EXTRACTION` (+ secondary `INCONSISTENT_REPORTING`)

- **`INSUFFICIENT_DATA` is first-class** — most papers land there because raw data are not deposited.
- All 5 primary verdicts are pinned by a control suite (**T20**, the Phase-A exit instrument).

## What's built (engine)

- Django REST surface (**T24**): `POST /verify/analyze/`, token-gated `GET /verify/report/<uuid>` —
  no network egress by default.
- Persistence (**T10**): `VerificationRun` / `ClaimVerdictRecord` / `LinkedDataset`.
- Genomics auto-linker: a gene-level claim → its GEO data, fully automatic (gene + group resolution,
  series-matrix alignment). Genome-scale proof on real GSE271517.
- Benchmarked vs **statcheck 1.5.0**: recall **97.7%**, precision **98.1%**, F1 **97.9%**.

## What's built (census)

- PMC fetcher (NCBI E-utilities, day-clustered random sample) + JATS parser + incremental census.
- **10,103 OA biomedical papers** across 744 random days.

## Census headline (10,103 papers)

| Metric | Value |
|---|---|
| Report an in-text **recomputable** NHST statistic | **3.5%** (most stats live in tables/figures) |
| Of checkable claims, internally **inconsistent** (raw) | **11.1%** |
| FP-validated **true** inconsistency rate | **≈ 6–8%** |
| **Decision-changing** | **1.7%** |

Two robust, novel headlines: (1) only ~3.5% of biomedical OA papers report an in-text recomputable
statistic; (2) of those, a single-digit % are genuinely internally inconsistent.

## Today's fix: extractor false positives (the scientific crux)

The dominant census false positive was **5 distinct extractor bugs**, not one (each traced to a real
PMCID): mis-paired far p · `t(1,644)` two-df · effect-size `d_z` / `Z(Y)` · `p=1`→0.1 ·
semicolon/fractional-df results dropping their p.

**Apples-to-apples on the same 10,103 papers (pre-fix via `git stash`):**

| | PRE-FIX | POST-FIX |
|---|---|---|
| FP_MISEXTRACTION | 157 (35% of flags) | **0** |
| Inconsistent (raw) | 14.5% | **11.1%** |
| Decision-changing | 4.2% | **1.7%** |
| Clear false-positive rate | 45% | **14%** |

No statcheck regression; +26 regression tests (each tied to a real PMCID).

## Robustness (already done)

- **IPW (inverse-probability weighting):** correcting the day-cluster design — same population, no new
  fetch — moves the headline ≤ 0.6 pp (inconsistent 11.1%→10.5%). **Day-clustering did not bias the
  rate.**
- **Adversarial review:** 21-agent workflow → verdict **SAFE**; 4 minor follow-ups found + fixed; the
  precision wins (window / directionality / df-guard) confirmed to lose zero genuine inconsistencies.
- **Independent OA-web-service frame** (`oa_pilot.py`): implemented; a generalizability pilot is
  accumulating (directional — the same-population robustness is the IPW result).

## Status

- **Verifier module Phase A: 18/24** (T20 added today). Remaining engineering: T07/T08/T16/T17/T18
  (provenance, consistency-demote, effect-size normalization, assumption-unreported detector).
- All work **committed + pushed** to `origin/docs/plos-compbio-submission` (not merged to `main`).

## Decisions for the PI

1. **OSF pre-registration** — resolve the 10 `[PI DECISION]` items in §11 of the draft (year window,
   field scope, target N, the two human coders, DISCREPANT tolerance, κ threshold, …) before the
   FORMAL confirmatory census.
2. **Venue** for the census paper (PLOS ONE / PeerJ / GigaByte / BMC Bioinformatics — soundness-not-novelty).
3. **κ double-coding** — assign 2 human coders for a gold subset.
4. **bioRxiv v2** — the Case Study 4 "Group B" correction (still gated).

## What to read (in order)

1. `docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md` — the design + the lab steer.
2. `paper/replication/verification/REPRODUCTION.md` — reproduce everything end-to-end.
3. `CENSUS_REPORT_LARGE` + `FP_VALIDATION_REPORT` + `CENSUS_IPW_REPORT` — the numbers.
4. `docs/SESSION_HANDOFF_2026-06-26.md` — today's fix in full.
5. `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md` — the PI decisions.
