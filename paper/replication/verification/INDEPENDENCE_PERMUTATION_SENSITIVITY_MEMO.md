# Independence validator & sample ordering — technical memo

**Date:** 2026-07-06
**Prompted by:** an external technical critique of the Guardian *independence* validator
(from "BGPT," forwarded by Dr. Chakraborty, 2026-07-05).
**Analysis:** `independence_permutation_sensitivity.py` (this directory) — runs the **real** production
code on the **real** manuscript dataset (GSE271517).
**Results:** `independence_permutation_sensitivity_results.json`; run log
`independence_permutation_sensitivity_run.log`.

---

## The critique (restated precisely)

> "In StickForStats, the independence validator is a lag-1 Pearson autocorrelation computed over the
> observation order. For omics matrices, that order can be arbitrary and sometimes correlates with batch
> or subject grouping, which can make 'dependence' partly a function of how samples are arranged."

**This is correct as a statement about the lag-1 autocorrelation validator in general.** The lag-1
autocorrelation `r₁ = corr(x[1:], x[:-1])` is, by construction, a function of the *order* of the values.
If you rearrange the same values, `r₁` changes. So for data whose row/column order carries no temporal or
sequential meaning — which is the normal case for an omics expression matrix — a "violation" reported by
this validator is partly an artifact of the arrangement.

The question is whether this affects **(a)** the paper's genome-scale result (Case Study 4), and **(b)** the
platform's general interactive path. The answers differ, and both are below, each backed by an experiment on
the real data.

---

## Bottom line (three points)

1. **The genome-scale result in the paper is not affected.** The production genomics differential-expression
   module **does not use the independence validator at all** — it cascades per gene on **normality
   (Shapiro-Wilk)** and **variance homogeneity (Levene)**, both of which are invariant to how the samples are
   ordered. Empirically, permuting the 91 sample columns leaves the Case Study 4 headline numbers unchanged at
   **decision-level**: identical cascade rate (90.55%), identical 1,411-gene significant set (Jaccard = 1.000)
   across every permutation. (The continuous test outputs shift by ~10⁻¹⁵ under reordering — floating-point
   summation order — but no gene's cascade or significance decision flipped; only the rank-based cascade is
   bit-exact. So "invariant" here means *decision-level exact*, not bit-identical.)

2. **The critique is valid for the platform's general interactive path.** For an ordinary t-test / ANOVA /
   regression, the Guardian pipeline *does* run the lag-1 validator on the raw observation order, with no
   automatic gate for cross-sectional data. On the same omics data, the independence-violation flag rate over
   the top 500 differentially-expressed genes is **0.2% under a random arrangement but ~30% under a
   condition-sorted arrangement** — arrangement, not data, drives the flag. This is exactly the failure the
   critique predicts, and we should tighten both the code and the manuscript to acknowledge it.

3. **There is a deeper, honest independence caveat in Case Study 4 — the *opposite* failure mode.** GSE271517
   is **91 samples from 55 patients** (17 patients contributed multiple samples; one contributed 9). The
   per-gene independent t-test / Mann-Whitney treats all 91 as independent, but they are clustered within
   patients. **No validator in the platform catches this** — the genomics path skips independence, and a
   lag-1 autocorrelation could not detect patient clustering even if it were applied. This is a real
   limitation of the illustrative analysis (a *missed real* dependence, not the *spurious* one the critique
   describes). Two honest mitigating facts: (i) Case Study 4 deliberately **reproduces the original authors'
   stated test selection** — Chen et al. themselves used "unpaired Student's t-test / Mann-Whitney U" on the
   same data (manuscript §Case Study 4), so the clustering caveat applies equally to the source paper and we
   are not introducing it; and (ii) the case study's purpose is to *demonstrate the cascade mechanism* on a
   real published workflow, not to deliver a definitive DE analysis of this cohort. Nonetheless, GEO also
   deposited a **patient-collapsed 55-sample matrix** (`GSE271517_Patient_Counts.csv.gz`, 55 columns), and a
   reviewer could reasonably ask why the 91-sample matrix was used; the manuscript should acknowledge the
   clustering explicitly and note that the planned DESeq2/edgeR follow-up should use a patient-aware
   (mixed-model / collapsed) design.

---

## Experiment 1 — the genomics case study is invariant to sample ordering

**Why it holds, structurally.** `DifferentialExpressionService.analyze()`
(`backend/core/services/genomics/differential_expression.py`) selects each group's values by *label*
(`row[g1_idx]`, `row[g2_idx]`) and, per gene, runs Shapiro-Wilk on each group and Levene between groups, then
a t-test or (on violation) Mann-Whitney. Every one of these is a **symmetric function of the values in a
group** — analytically independent of their order. Permuting the sample columns — carrying each sample's
group label with it — preserves those value sets, so every per-gene verdict is the same. (BH-FDR uses a
deterministic `argsort`, so ranks and the significant set are identical too.) The one caveat: the
floating-point *implementations* of Shapiro W, Levene F, and the t-statistic are not associative, so they
differ by ~10⁻¹⁵ under reordering; a gene sitting exactly on a decision boundary could in principle flip.
None did across the permutations below, so the result is decision-level exact on this dataset and robust to
floating point — not a bit-identity theorem.

**Empirical confirmation (real production pipeline, real data).** Baseline vs. 8 random column permutations:

| Quantity | Baseline (natural GEO order) | All 8 permutations |
|---|---|---|
| Cascade rate | 90.55% | 90.55% (max |Δ| = 0.0000 pp) |
| Significant genes (q<0.05) | 1,411 | 1,411 (max |Δ| = 0) |
| Significant-gene **set** | — | identical (Jaccard = 1.000000) |

The manuscript's Case Study 4 numbers are **invariant at decision granularity** (identical cascade rate and
identical significant-gene set) to how the samples are arranged, because the genome-scale cascade never
touches observation order.

---

## Experiment 2 — the general independence validator *is* order-sensitive

Run on the real GSE271517 expression vectors, using the **real** `IndependenceValidator`
(`guardian_core.py`).

**2a. Single top DE gene (ENSG00000131002, |Δmean| = 2.77 log₂CPM).**
Ordering the 91 samples as *all Primary, then all Metastasis* — a common GEO deposit layout — puts a step
change at the group boundary that the lag-1 autocorrelation reads as serial dependence:

- Condition-sorted ordering: lag-1 r = **0.314**, parametric p = 0.0026 → validator verdict **VIOLATED
  (warning)**.
- Same values, 2,000 random orderings: mean r = −0.012 (≈ the theoretical −1/(n−1) = −0.011).
- Permutation p-value for the condition-sorted |r| = **0.005**.

**Nuance worth stating plainly:** the permutation p is *low* (0.005), i.e. the condition-sorted arrangement is
genuinely more autocorrelated than random reorderings — because a condition-sorted arrangement of a strongly
DE gene really does have a step-function structure. So **a permutation p-value is not, by itself, a complete
fix.** It correctly *calibrates the test under exchangeability* (see 2b), but it cannot rescue a validator
that is being applied to a non-temporal ordering in the first place. The right fix is to **gate** the
validator on whether the observation order is meaningful.

**2b. Systematic flag rate over the top 500 DE genes — arrangement, not data, drives the flag:**

| Sample arrangement | Independence-violation flag rate |
|---|---|
| One random ordering | **0.2%** (1/500) — ≈ the nominal false-positive rate |
| Natural GEO order | **32.0%** (160/500) |
| Condition-sorted (Primary | Metastasis) | **30.4%** (152/500) |

Same data, same genes, same validator — the flag rate swings from 0.2% to ~30% purely on how the columns are
ordered. The natural GEO order for this study already correlates with the Primary/Metastasis grouping, so the
32% is not a contrived worst case; it is what the validator would report if naively pointed at these vectors
in their deposited order. **This confirms the critique's hypothesis on real data.**

*Scope of the ~30%:* the analysis is restricted to the **top 500 most differentially-expressed genes** —
precisely the genes most separated between conditions, where a condition-sorted ordering produces the
strongest spurious autocorrelation. It is therefore an *upper bound* on severity, not a genome-wide rate. The
robust, arrangement-agnostic anchor is the **0.2% random-order baseline** (≈ nominal), which shows the test is
well-calibrated *under exchangeability* and mis-calibrated only when pointed at a non-random arrangement.

---

## What the code and manuscript already get right (and where to tighten)

**Already honest:**
- The validator's docstring (`guardian_core.py:829`) explicitly states it is *not* Durbin-Watson, that it
  "only makes sense when the data rows represent successive time points," and that "if the rows have been
  shuffled or come from independent units in unspecified order, the lag-1 autocorrelation is meaningless."
- Its violation message tells the user: *"assumes rows are in time/sequence order; ignore if data are
  cross-sectional."*
- The manuscript (Guardian system §, item 3) already describes it as operating "on the raw observation
  series," and Fig 7 refers independence "to study design."

**Where to tighten (recommendations):**

1. **Gate the validator, don't just caption it.** Today the general `check()` path still *emits a violation*
   for cross-sectional data; the caveat lives only in the message text. Add an explicit ordering context so
   that, unless the caller declares the observation order is temporal/sequential/spatial, the validator
   returns **"not applicable — independence must be judged from study design (repeated measures, batch,
   clustering)"** instead of a lag-1 verdict. This is backward-compatible if the default preserves current
   behavior for the existing tests, with cross-sectional callers opting in to the gate. Optionally attach a
   permutation p-value as supporting information.

2. **Manuscript — Guardian description (item 3).** Add one clause: the lag-1 autocorrelation is informative
   only when observations are in temporal/sequential order; for cross-sectional or omics matrices it is
   referred to study design rather than flagged, and the genome-scale differential-expression cascade
   (Case Study 4) does **not** use it (it cascades on normality and variance).

3. **Manuscript — Limitations.** Add: (i) the independence validator is arrangement-dependent and applies
   only to sequentially-ordered data; and (ii) the Case Study 4 dataset contains repeated samples per patient
   (91 samples / 55 patients), so the per-gene tests treat clustered observations as independent — a
   dependence structure the platform does not check and that the planned DESeq2/edgeR + mixed-model follow-up
   should address.

---

## Related minor observation (not part of the critique; does not affect any reported result)

While reading the genomics module I noticed the per-gene **confidence score** normalizes against a
`max_penalty = 3 * 3.0` (`differential_expression.py:337`) — a "3 checks × max weight" constant — even though
only two assumption families (normality, variance) can contribute a penalty there. The third slot appears to
be a vestige mirroring the general Guardian formula (which includes independence). Effect: the reported
`guardian_confidence` can never fall below ≈ 0.44 even when both checks are maximally violated, so the score's
floor is a little generous. **This is cosmetic and does not touch any headline number** — the cascade decision
and gene significance are driven by the boolean `norm_pass`/`var_pass`, not by the confidence value. Worth a
one-line fix (`max_penalty = 2 * 3.0`) for tidiness if we revisit the module.

---

## Reproduce

```bash
cd StickForStats_v1.0_Production
# fetch the GEO counts once (if not cached):
.venv-django/bin/python paper/replication/case_study_4_genomics.py
# then run the permutation-sensitivity analysis:
.venv-django/bin/python paper/replication/verification/independence_permutation_sensitivity.py
```

Deterministic (fixed seed 20260706); writes `independence_permutation_sensitivity_results.json`.
