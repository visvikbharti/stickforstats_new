# Proposed manuscript edits — independence validator honesty

**Status:** proposals for author/PI approval (not yet applied). Both manuscript copies are identical at these
lines: `paper/submission_package/manuscript.md` and `paper/plos_compbio/manuscript.md`.
Rationale + evidence: `INDEPENDENCE_PERMUTATION_SENSITIVITY_MEMO.md` (Edits 1–3) and `BGPT_REVIEW_RESPONSE.md`
(Edit 4). These fit the self-initiated integrity-correction pattern already recorded in
`CHANGES_FROM_PREPRINT.md`.

Four small, additive edits. None changes a result; all tighten claims to what the code and data support.
Edits 1–3 address the independence validator; Edit 4 pre-empts the calibration ("change vs improve") critique.

---

## Edit 1 — Guardian description, item 3 "Independence" (≈ line 60)

**Before:**
> 3. **Independence** --- Lag-1 Pearson autocorrelation on observation order, detecting temporal or spatial
> dependencies in observations. Distinct from the Durbin-Watson statistic [21], which is restricted to
> regression residuals; our implementation operates on the raw observation series and reports the inferential
> p-value from the Pearson test.

**After:**
> 3. **Independence** --- Lag-1 Pearson autocorrelation on observation order, detecting temporal or spatial
> dependencies in observations. Distinct from the Durbin-Watson statistic [21], which is restricted to
> regression residuals; our implementation operates on the raw observation series and reports the inferential
> p-value from the Pearson test. Because it is computed over observation order, this check is informative only
> when the rows are a meaningful sequence (time points or spatial positions); for cross-sectional or omics
> matrices, whose sample order is arbitrary and may itself correlate with grouping, it is referred to study
> design rather than treated as a data-driven verdict. Accordingly, the genome-scale per-gene cascade in
> Case Study 4 does **not** use this validator — it cascades on normality and variance homogeneity, which are
> invariant to sample ordering.

---

## Edit 2 — Genomics workflow paragraph (≈ line 287), one added sentence

**Before (first two sentences):**
> The genomics module performs per-gene differential expression analysis with Guardian assumption validation.
> For each gene in an uploaded expression matrix, the service checks normality (Shapiro-Wilk) and variance
> homogeneity (Levene's test) independently.

**After (add the italicised sentence):**
> The genomics module performs per-gene differential expression analysis with Guardian assumption validation.
> For each gene in an uploaded expression matrix, the service checks normality (Shapiro-Wilk) and variance
> homogeneity (Levene's test) independently. *The independence validator is deliberately not applied at
> genome scale: it tests for serial autocorrelation over observation order, which is not meaningful for an
> expression matrix whose sample order is arbitrary; both checks that do drive the cascade are functions of
> each group's values and are therefore invariant to how the samples are ordered.*

---

## Edit 3 — Limitations (≈ line 271), extend "Incomplete coverage" + add an independence caveat

**Before (the "Incomplete coverage" clause):**
> *Incomplete coverage:* Guardian's eight validators do not cover all possible assumptions---measurement
> reliability and selection bias may go undetected, though Guardian explicitly states which assumptions are
> checked.

**After (replace that clause with):**
> *Incomplete coverage:* Guardian's eight validators do not cover all possible assumptions---measurement
> reliability and selection bias may go undetected, though Guardian explicitly states which assumptions are
> checked. *Independence in particular is checked only as lag-1 autocorrelation over observation order, which
> is arrangement-dependent and informative only for sequentially ordered data; it does not detect clustered or
> hierarchical dependence. Case Study 4 illustrates this limit: GSE271517 comprises 91 tumour samples from 55
> patients (some contributing to both arms), so the per-gene tests---reproducing the original authors' unpaired
> test selection---treat clustered observations as independent. The platform does not flag this structure, and
> the planned DESeq2/edgeR follow-up should adopt a patient-aware (mixed-model or patient-collapsed) design.*

---

## Edit 4 — Limitations, add a calibration / "change vs improve" sentence

*Rationale:* the strongest recurring point in the BGPT auto-review (and the kind of thing a soundness-focused
reviewer will press on) is that the case studies show Guardian's reroutes **change** decisions but do not
demonstrate they **improve** calibration (Type I error / FDR) relative to a naïve or count-GLM baseline. A
one-sentence, honest acknowledgement pre-empts it. Add at the end of the Limitations paragraph
(after the *Retrospective verification scope* clause):

**Add:**
> *Demonstrated impact versus calibrated improvement:* the case studies establish that assumption-driven
> rerouting **changes** analytical decisions (which test is used, which genes are called), but we do not claim
> and have not benchmarked that rerouting **improves** inferential calibration—Type I error or false-discovery
> control—relative to a naïve parametric baseline or, for count data, a generalized-linear-model pipeline
> (DESeq2/edgeR). A controlled calibration study under known ground truth, including perturbations of batch
> structure and zero-inflation, is a natural and important next step; the present work reports transparent,
> reproducible decision changes rather than a proof of superior error-rate control.

---

## Notes for whoever applies these

- Apply the **same four edits to both** `paper/submission_package/manuscript.md` and
  `paper/plos_compbio/manuscript.md` (identical source at these lines), then re-render both PDFs via the
  pandoc→Chrome pipeline.
- Add two bullets to `paper/submission_package/CHANGES_FROM_PREPRINT.md` under **Corrections (scientific
  integrity)**: (1) "Independence validator scope clarified — noted as arrangement-dependent / sequential-only,
  explicitly excluded from the genome-scale cascade, and the Case Study 4 patient-clustering caveat added.";
  (2) "Limitations expanded to state that the case studies demonstrate changed decisions, not a benchmarked
  improvement in Type I error / FDR calibration — that calibration study is named as future work."
- Optional code tidy (separate from the manuscript): gate the `IndependenceValidator` on a caller-declared
  ordering context, and fix the cosmetic `max_penalty = 3 * 3.0` → `2 * 3.0` in the genomics module (see memo
  "Related minor observation"). Both are backward-compatible; the 46 validator tests stay green.
