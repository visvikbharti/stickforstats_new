# Calibration benchmark — does the Guardian cascade *improve* calibration, or only *change* decisions?

**Date:** 2026-07-06
**Prompted by:** the external (BGPT) review's strongest point (raised in 4.1/4.3/§6 and now flagged in the
manuscript Limitations): the case studies show assumption-driven rerouting *changes* decisions but do not
show it *improves* Type I error / FDR calibration versus a baseline.
**Scripts:** `calibration_partA_continuous.py` (+ `_results.json`, `_run.log`),
`calibration_partB_countglm.py` + `calibration_partB_rmethods.R` (+ `_results.json`, `_run.log`),
`calibration_figure.py` → `calibration_benchmark.png/.pdf`.
**Under test:** the **real** production `DifferentialExpressionService` (Shapiro-Wilk + Levene →
t-test / Welch / Mann-Whitney cascade). Reproducible (seed 20260706).

---

## Bottom line (one honest sentence)

Framed as an **ablation of the assumption gate** (the "naïve" baseline is the cascade's *own* parametric
branch with the gate switched off), the gate **improves calibration and/or power over the ungated Student-t
default** — restoring near-nominal Type I/FDR under unbalanced heteroscedasticity (S2), adding power under
non-normality/outliers (S3–S5), and neutral where assumptions hold (S1) — but it is **not universally
optimal**: under simultaneous heteroscedasticity *and* heavy tails (S6) it only *partially* controls error,
a fixed always-Welch default is better-calibrated across the board, and for count data the field-standard
count-GLMs (edgeR/DESeq2) are more powerful at the same FDR.

This converts the "change vs improve" limitation into a *demonstrated, bounded, honestly-caveated* result —
and surfaces a concrete cascade improvement (below).

**Verification:** the simulation and interpretation were adversarially checked by four independent agents
(V1 code/no-bug — CONFIRMED, incl. first-principles reproduction of the S2 Behrens–Fisher inflation; V2
interpretation — CONFIRMED; V3 baseline-fairness — PARTIAL → drove the ablation framing; V4 conclusion —
CONFIRMED).

---

## Part A — continuous data, 6 assumption scenarios (n = 55 vs 36, GSE271517-like)

1000 genes/dataset, 10% truly DE (+1.5 SD shift), 100 datasets, α = 0.05. Naïve = Student's t (equal_var);
Guardian = production cascade. Values are means over datasets.

| Scenario | naïve Type I / FDR / Power | Guardian Type I / FDR / Power | cascade routing | reading |
|---|---|---|---|---|
| S1 normal, equal-var | 0.049 / 0.046 / 1.00 | 0.051 / 0.048 / 1.00 | 86% t | **neutral** — no harm when assumptions hold |
| S2 normal, **unequal-var** | **0.100 / 0.179** / 0.66 | **0.058 / 0.068** / 0.38 | 90% Welch | **cascade fixes** a 2× Type I / 3.6× FDR blow-up |
| S3 heavy-tail (t₃) | 0.046 / 0.034 / 0.99 | 0.049 / 0.039 / **1.00** | 84% MWU | controlled both; cascade slightly more power |
| S4 lognormal skewed | 0.048 / 0.040 / 1.00 | 0.052 / 0.045 / 1.00 | 100% MWU | controlled both |
| S5 outlier-contaminated | 0.046 / 0.030 / 0.94 | 0.049 / 0.042 / **1.00** | 86% MWU | **cascade gains power** under gross outliers |
| S6 **unequal-var + heavy** | 0.094 / 0.130 / 0.74 | **0.080 / 0.108** / 0.87 | 84% MWU | **honest limit** — cascade *reduces* but does not *remove* inflation |

**Key results:**
- **S2 is the headline.** With an *unbalanced* design (the exact 55-vs-36 shape of the RNA-seq case study),
  the naïve equal-variance t-test's Type I error doubles to 0.100 and its FDR blows out to 0.179 (3.6× the
  nominal 0.05). The Guardian cascade detects the variance heterogeneity (Levene) and routes 90% of genes to
  Welch, restoring Type I to 0.058 and FDR to 0.068. This is a *demonstrated* calibration improvement, not a
  change.
- **S6 is the honest limit.** When data are heteroscedastic *and* heavy-tailed, the cascade routes most genes
  to Mann-Whitney (because they fail normality), and MWU tests stochastic dominance — it is itself sensitive
  to variance differences — so it inherits a mild inflation (Type I 0.080, FDR 0.108). The cascade *reduces*
  the naïve inflation (0.094 → 0.080) but does not eliminate it. We report this rather than hide it.
- **Balanced-design nuance (n = 20 vs 20):** the equal-variance t-test is robust to variance heterogeneity
  when the group sizes are equal, so in S2 balanced the naïve Type I is fine (0.055). The cascade's Type I
  benefit is therefore specific to **unbalanced** designs — which is the common case, and the case study's
  case.

---

## Part B — count data: Guardian cascade vs count-GLMs (answers review point 4.3)

Negative-binomial counts (dispersion 0.2), 1.5× fold change, 1000 genes, 10% DE, 20 datasets. Guardian and
naïve run on log-CPM; edgeR (QL F-test) and DESeq2 (Wald) on raw counts.

| method | n=55 vs 36: FDR / Power | n=20 vs 20: FDR / Power |
|---|---|---|
| naïve-t (log-CPM) | 0.030 / 0.711 | 0.018 / 0.137 |
| **Guardian cascade (log-CPM)** | 0.039 / 0.736 | 0.028 / 0.136 |
| edgeR (counts) | 0.036 / **0.816** | 0.045 / **0.283** |
| DESeq2 (counts) | 0.047 / **0.818** | 0.062* / **0.304** |

*DESeq2 FDR = 0.062 at n=20 slightly exceeds nominal (known small-n behaviour).

**Reading:** all methods control FDR near nominal, but the **count-GLMs carry materially more power** than the
rank cascade — ~10 points at n=55/36 and roughly **2× at n=20/20** (0.28–0.30 vs 0.14). The assumption-safe
rank cascade on log-CPM does not, and is not expected to, match a model that uses the count likelihood and
shares information across genes. This directly quantifies the manuscript's Group B framing (count-GLMs may
legitimately call the large-effect Group B genes DE) and the reviewer's point that rank rerouting changes the
estimand for count data.

---

## The honest caveat + an actionable improvement (surfaced by adversarial verification)

A fixed **always-Welch** default (teal in the figure) controls Type I error in *all six* scenarios — including
S6 (0.045), where the cascade fails (0.080) — at the cost of only modest power in S3–S5. So the cascade is
**not Pareto-optimal** versus a robust default. Its genuine advantage is the **power** gains from Mann-Whitney
under heavy tails/outliers (S3–S5), and its one calibration failure (S6) has a clear cause: the cascade routes
on **normality first**, so when data are both non-normal and heteroscedastic it sends ~84% of genes to
Mann-Whitney — which is itself variance-sensitive — when Welch would have been the correct choice.

**Actionable design insight:** make the cascade *variance-aware* — when Levene flags heteroscedasticity,
prefer Welch even if normality also fails (or fall back to a heteroscedasticity-robust rank/permutation test),
rather than defaulting to Mann-Whitney on the normality branch. This is a concrete, testable improvement the
benchmark identified; we should note it as such rather than claim the current cascade is optimal.

## What this means for the manuscript

- **Upgrade** the Limitations "change vs improve" sentence to a demonstrated, bounded result, **framed as an
  ablation of the assumption gate**, and add a short **"Calibration of the cascade"** Results subsection + the
  figure (`calibration_benchmark.png`, → Fig 8). Proposed text is staged in `MANUSCRIPT_EDITS_independence.md`
  (Edit 6) with a revision of the applied Edit 4.
- **Scope the claim to be unimpeachable** (per verification V2/V3):
  - The improvement is **relative to the ungated Student-t default** (= the cascade's own parametric branch),
    i.e. it measures the value of *the gate*, not of a hand-picked test.
  - Say **"restores near-nominal control"**, not "fully controls" — the cascade's S2 residual (Type I 0.058,
    FDR 0.068) is marginally above 0.05 (the same assumption-test false-positive leakage).
  - **State the always-Welch caveat plainly** and cite the S6 failure + the actionable variance-aware-routing
    improvement above. Do not imply the current cascade is optimal.
  - Part B point estimates use 20 datasets (vs 100 in Part A), so its exact FDR/power values carry more
    Monte-Carlo error; the qualitative ordering (count-GLMs more powerful, all roughly control FDR) is robust.

## Reproduce
```bash
.venv-django/bin/python paper/replication/verification/calibration_partA_continuous.py   # ~5 min
.venv-django/bin/python paper/replication/verification/calibration_partB_countglm.py     # ~4 min (needs R: edgeR, DESeq2)
.venv-django/bin/python paper/replication/verification/calibration_figure.py
```
