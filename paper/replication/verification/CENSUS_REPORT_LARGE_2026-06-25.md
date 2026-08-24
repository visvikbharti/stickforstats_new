> ## ⚠️ SUPERSEDED IN PART — read this first (added 2026-08-24)
>
> This file is a **dated record of what was measured on 2026-06-26** and is kept unedited below.
> Two of its headline numbers were later found to be **under-counts** and must not be quoted as
> current. The corpus, parse funnel and denominators below are all still correct; only the
> *inconsistency* counts moved.
>
> The p-value reader had two defects (fixed in `f979b89`): a p written in scientific notation was
> treated as having unknown precision and compared under a flat ±0.005 window, and the inequality
> branch applied that same flat window regardless of the precision actually stated. Re-scoring the
> same corpus flipped **22 claims, all consistent → inconsistent**, none the other way.
>
> | | this file (2026-06-26) | corrected (2026-08-24) |
> |---|---|---|
> | papers with ≥1 inconsistency | 129 (37.8% of 341) | **136 (39.9% of 341)** |
> | inconsistent claims | 333 = 11.1% of 3,005 | **355 = 11.81% of 3,005** |
> | decision-changing | 52 (1.7%) | **52 (1.73%) — UNCHANGED** |
>
> Adjudicated genuine rate: **9.12%, 95% CI [6.95%, 11.49%]** (paper-clustered bootstrap, 10,000
> replicates, seed 20260627). The interval crosses 10%, so the earlier "single-digit" framing is
> **retired**.
>
> Current companions: `FP_VALIDATION_REPORT_2026-08-24.md`, `CENSUS_IPW_REPORT_2026-08-24.md`.
> Control: re-running the pipeline against the 333-row frame reproduces every number in this file
> exactly.

# Consistency census (no-data tier) over a JATS-XML corpus

_Generated 2026-06-26 by `census_jats.py` over `census_corpus_v2_2026-06-25` (0s)._

## Fetch attrition (from fetch_stats.json)
- requested: **10200**  |  days sampled: **744**  |  IDs enumerated: **10200**
- fetched with full-text body: **10103**  |  dropped (no `<body>`): **80**
- sampling: day-clustered (uniform day, full-day pool, up to per_day/day) — NOT uniform over papers; low-volume days over-represented

## Parse funnel
- XML files: **10103**  |  parsed: **10103**  |  with a readable body: **10101**
- with >=1 extracted test claim: **1939**
- with >=1 CHECKABLE (recomputable) claim: **341**  (the statcheck denominator)
- with >=1 internal inconsistency: **129**

## Headline (over CHECKABLE claims — apples-to-apples with statcheck)
- extracted test claims: **13703**  |  of which CHECKABLE/recomputable: **3005**
- mean extraction coverage: **100.0%**
- papers (of those with a checkable claim) with >=1 inconsistency: **37.8%** (129/341)
- inconsistent claims: **11.1%** (333/3005)
- decision-changing (gross) inconsistencies: **52** (1.7% of checkable)

Reference: Nuijten et al. 2016 — ~50% of *psychology* papers had >=1 inconsistency and ~13% a decision error. Our population differs (see caveats); treat the comparison as qualitative.

## Caveats (mandatory — this is a CONDITIONAL, descriptive measurement)
- **Population.** PMC Open-Access biomedical articles, 2018-2025, matching a classical quantitative-design query (randomized/cohort/case-control/regression/ANOVA/correlation/t-test) AND reporting >=1 inline, regex-recomputable NHST statistic. NOT a literature-wide estimate.
- **Sampling.** Day-clustered: publication days drawn at random, full day pool, up to per_day/day — uniform over DAYS, not over papers, so low-volume days/venues are over-represented (day volume is recorded per paper for optional inverse-probability weighting). The proper equal-probability frame (PMC OA file list) is reserved for the OSF-pre-registered run.
- **Extraction scope.** Inline running-text + flattened table-cell text (values split across table cells may not re-form `t(df)=…, p=…`); figures not read. So this is a LOWER bound on reportable statistics.
- **Recompute rules.** Two-tailed p only (no one-sided detection); p-as-inequality and the p=.05 boundary follow consistency_core; these drive the false-positive rate and remain to be validated against statcheck on a labelled set (Phase-B item).
- **Confirmatory vs descriptive.** This is the DESCRIPTIVE census; the pre-specified hypotheses and human double-coding for kappa are OSF-pre-registered separately.

## Article types in the corpus

| type | n |
|---|---|
| research-article | 8032 |
| review-article | 1124 |
| case-report | 362 |
| brief-report | 162 |
| editorial | 92 |
| letter | 85 |
| other | 51 |
| systematic-review | 38 |
| article-commentary | 28 |
| abstract | 21 |
| data-paper | 16 |
| methods-article | 16 |

_Per-paper records: `/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/census_census_corpus_v2_2026-06-25.jsonl`._