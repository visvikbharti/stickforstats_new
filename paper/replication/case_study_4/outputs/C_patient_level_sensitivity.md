# Patient-level sensitivity analysis — Phase C

**Driver:** the sample-level analysis (n=91) has pseudoreplication
because 17 patients contributed multiple tumors. Per-patient sampling
removes this confound.

## Design

- One sample per patient. For patients with both primary and metastasis,
  prefer the primary (cleaner baseline). Otherwise the first available.
- Resulting design: 49 Primary_tumor + 6 Metastasis (n = 55 patients total).

## Results

- Significant genes at padj < 0.05: **704** (vs 1,781 at sample-level)
- Overlap of top-100 hits with sample-level top-100: **4 / 100 = 4.0%**

## Interpretation

A high overlap (≥ 50 %) indicates the sample-level finding is
not driven by pseudoreplication; the patient-level analysis confirms it.
A lower overlap means within-patient correlation was inflating signal,
and the patient-level result is more conservative.

The patient-level n is much smaller and may have less power than
sample-level, so an absolute drop in n_sig is expected; what we care
about is whether the **same biology** appears in the top hits.

## Verdict

NEEDS-REVIEW — overlap = 4.0% (threshold: ≥30%; pseudoreplication has limited impact on the headline finding if true).
