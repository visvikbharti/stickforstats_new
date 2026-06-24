# Case Study 4 — proposed revision package (count-GLM arm + Group B correction)

**Date:** 2026-06-24
**Why:** PLOS Comp Biol desk-rejected on "combining existing methods"; the
manuscript's own L205 concedes the field uses count-based GLMs (DESeq2/edgeR) yet
never showed whether Guardian's verdict flips agree with them. We added that arm
(R DESeq2 + edgeR + limma-voom, identical 27,221-gene matrix; analysis under
`paper/replication/case_study_4/code/threeway/`, results in `.../outputs/threeway/`).
Double-implemented (Python + R native `fisher.test`) and adversarially verified.

**Two substantive changes, both improving honesty + defensibility:**
1. **Group B "74 false positives rejected" is REFUTED and must be rewritten** at 5
   sites (abstract L16, body L203, Fig 5 captions L207 + L368, Table 6 row L218),
   and in the bioRxiv abstract (next version). The count models call a majority of
   Group B DE (DESeq2 60.8%, edgeR 73.0%) with the *largest* effect sizes of any
   category — they are not outlier artefacts.
2. **Group A "rescues" must be right-sized**: ~10× enriched vs all discarded genes,
   but **~1.8× (p<10⁻⁹)** vs equally near-threshold genes — report the matched figure.

> **PI decision points** (flagged ⚑ below): (a) approve the Group B correction and a
> bioRxiv v2; (b) approve adding Table 7 + a count-GLM figure panel; (c) approve the
> "complementary to count models" framing (we do NOT claim Guardian beats DESeq2).

---

## Verified numbers feeding this revision

| Method (q/FDR < 0.05) | Significant genes |
|---|---|
| Naive t-test | 1,006 |
| Guardian cascade | 1,411 |
| DESeq2 | 1,782 |
| edgeR | 2,506 |
| limma-voom | 964 |
| Count-GLM consensus (≥2 of 3) | 1,584 |

- **Group A (479):** DESeq2-concordant 170/479 = 35.5% (edgeR 37.4%, consensus 29.0%)
  vs 3.6% background → 9.78× unmatched; **1.81× difficulty-matched** to naive q∈[0.05,0.10)
  (80% of Group A), Fisher p = 8.9×10⁻¹⁰.
- **Group B (74):** called DE by DESeq2 45/74 = 60.8%, edgeR 54/74 = 73.0%; median
  |DESeq2 log2FC| = 0.85 (41.9% ≥ 1) — largest of any category.
- **Whole-list agreement with count-GLM consensus (MCC):** naive 0.53, Guardian 0.51
  (tied); Guardian recall gain 0.44→0.50. pyDESeq2 vs R DESeq2 Jaccard 0.97.

---

## SITE 1 — Abstract (manuscript.md L16)

**BEFORE:**
> At genome scale, applying Guardian to a 91-sample synovial-sarcoma RNA-seq study (GSE271517) cascaded 90.6% of 27,221 genes to a rank-based test and flipped the differential-expression verdict for 553 genes---479 rescued from an under-powered t-test and 74 outlier-driven false positives rejected---materially changing the gene list a biologist would act on.

**AFTER:** ⚑
> At genome scale, applying Guardian to a 91-sample synovial-sarcoma RNA-seq study (GSE271517) flagged that a per-gene t-test is invalid for 90.6% of 27,221 genes and automatically cascaded them to a rank-based test, changing the differential-expression verdict for 553 genes. Benchmarked against count-based models (DESeq2, edgeR, limma-voom) on the same data, the cascade preferentially recovered count-concordant signal the t-test missed, while the comparison also showed that a general-purpose assumption check complements rather than replaces a domain-specific count model.

---

## SITE 2 — Group A body bullet (manuscript.md L202)

**BEFORE:**
> * **Group A (Guardian rescued, n = 479):** small effects (median |log2FC| = 0.20) where naive t-test was just under-powered (median naive q = 0.07) but rank-based Mann-Whitney detected the consistent shift (median Guardian q = 0.04).

**AFTER:**
> * **Group A (Guardian rescued, n = 479):** small effects (median |log2FC| = 0.20) where the naive t-test was just under-powered (median naive q = 0.07) but the rank-based Mann-Whitney detected the consistent shift (median Guardian q = 0.04). Benchmarked against the count models, these rescues are enriched for count-concordant differential expression: 35.5% are called DE by DESeq2 (37.4% by edgeR). Restricting the comparison to genes with *equally marginal* naive evidence (naive q ∈ [0.05, 0.10), which holds 80% of Group A) the rescues remain 1.8-fold enriched (Fisher p < 10⁻⁹) — the cascade preferentially re-flags signal a count model corroborates, not near-threshold genes at random.

---

## SITE 3 — Group B body bullet (manuscript.md L203)  ⚑ the key correction

**BEFORE:**
> * **Group B (Guardian rejected, n = 74):** outlier-dominated genes with much larger apparent effects (median |log2FC| = 0.46; 31% with |log2FC| >= 1) where naive t-test was misled by a few extreme samples and Mann-Whitney correctly recognised that most observations in both groups overlapped (Fig 5B).

**AFTER:**
> * **Group B (Guardian rejected, n = 74):** genes the rank cascade rejects but where the count models — the appropriate tool for RNA-seq counts — disagree. DESeq2 calls 45 of the 74 (60.8%) differentially expressed and edgeR 54 (73.0%), and these genes carry the *largest* count-model effect sizes of any category (median |DESeq2 log2FC| = 0.85; 41.9% with |log2FC| ≥ 1). Because DESeq2's negative-binomial model applies its own outlier handling (Cook's-distance replacement, active at n = 55/36) and still recovers these as large effects, they are not simply t-test artefacts: a rank test on log-CPM has discarded real large-effect signal here. This is a candid limitation of any distribution-free per-gene test on count data, and the reason StickForStats flags the violation but recommends a count model rather than treating the Mann-Whitney verdict as definitive (Fig 5B,C; Table 7).

---

## SITE 4 — "headline" paragraph (manuscript.md L205) — extend with complementarity + benchmark

**BEFORE (final two sentences):**
> ... which is why the field has converged on count-based GLMs (DESeq2, edgeR) and why the original paper's principle ("t-test for normal variables; Mann-Whitney otherwise") is the right one. Guardian operationalises that principle automatically, at scale, without requiring the analyst to remember to run normality checks per variable.

**AFTER:** ⚑
> ... which is why the field has converged on count-based GLMs (DESeq2, edgeR, limma-voom) and why the original paper's principle ("t-test for normal variables; Mann-Whitney otherwise") is the right one. Guardian operationalises that principle automatically, at scale; the cascade is best read as a genome-wide red flag that the parametric default is invalid, prompting either the rank-based fallback it provides or — preferably for count data — a dedicated count model. To make this concrete we benchmarked both per-gene pipelines against DESeq2, edgeR, and limma-voom on the identical matrix (Table 7, Fig 5C): neither the naive t-test nor the Guardian cascade matches a count model (both agree with the count-GLM consensus at MCC ≈ 0.5), but the cascade's automatic detection of the assumption failure — and its 0.44→0.50 recall gain for count-concordant genes — is exactly the safeguard a routine workflow lacks. Guardian is therefore complementary to, not a substitute for, a domain-specific model.

---

## SITE 5 — Fig 5 caption, panel B clause (IDENTICAL text at L207 inline and L368 standalone — fix BOTH)

**BEFORE (panel B clause):**
> ... Group B is shifted right (median 0.46; 31% with |log2FC| ≥ 1), characteristic of outlier-dominated false positives that t-test mistakes for true differential expression and that the rank-based Mann-Whitney correctly rejects.

**AFTER:**
> ... Group B is shifted right on the naive log-CPM scale (median 0.46; 31% with |log2FC| ≥ 1) but is *not* a false-positive set: on raw counts these genes carry the largest model-based effect sizes of any category (median |DESeq2 log2FC| = 0.85), and a majority are called differentially expressed by DESeq2 (61%) and edgeR (73%) — large-effect genes the rank cascade conservatively rejects, illustrating the limit of a distribution-free test on count data.

**ALSO** in the same captions, panel A clause — change:
> *Naive only* (red, n = 74; "Group B") are flagged by the naive t-test but rejected by Guardian's Mann-Whitney; they include genes with relatively large apparent fold changes that turn out to be driven by outlier samples.

**to:**
> *Naive only* (red, n = 74; "Group B") are flagged by the naive t-test but rejected by Guardian's Mann-Whitney; on raw counts a majority are nonetheless called differentially expressed by count-based models (DESeq2, edgeR), so the cascade is conservative here rather than corrective (see Table 7).

---

## SITE 6 — Table 6 row (manuscript.md L218)

**BEFORE (Impact / Recommendation cells):**
> | 553 genes verdict-flipped (479 Guardian rescues, 74 t-test false positives rejected) | Per-gene Mann-Whitney cascade |

**AFTER:**
> | 553 genes verdict-flipped (479 rescues enriched for count-model-concordant DE; 74 conservative rejections a count model mostly retains) | Cascade to Mann-Whitney; for counts, defer to a count-based GLM |

---

## NEW — Table 7 + Fig 5C (add after the Group B paragraph)

**Table 7. Per-gene pipelines benchmarked against count-based models (GSE271517, 27,221 genes, Primary vs Metastasis).**

| Method | Significant (q/FDR < 0.05) | Agreement with count-GLM consensus (MCC) |
|---|---|---|
| Naive t-test | 1,006 | 0.53 |
| Guardian cascade | 1,411 | 0.51 |
| DESeq2 | 1,782 | reference |
| edgeR | 2,506 | reference |
| limma-voom | 964 | reference |
| Count-GLM consensus (≥2 of 3) | 1,584 | — |
| **Group A rescues count-concordant** | 35.5% DESeq2 / 29.0% consensus (3.6% background; 9.8× unmatched, ~1.8× difficulty-matched, p<10⁻⁹) | |
| **Group B rejects called DE by count model** | 60.8% DESeq2 / 73.0% edgeR (median \|DESeq2 log2FC\| = 0.85) | |

**Fig 5C** (use `paper/replication/case_study_4/outputs/threeway/fig_threeway.png`):
three panels — (A) DESeq2 DE-rate by verdict category; (B) Group A rescues confirmed
DE vs background, and Group B rejects agreed-NOT-DE vs background, against the count-GLM
consensus; (C) naive-vs-Guardian agreement (MCC) with DESeq2/edgeR/consensus. Placement
(new panel in Fig 5, or standalone Fig 6) is editorial.

---

## Minor fix (while we're here)

- **L196:** "naive parametric default (per-gene Welch t-test)" → "(per-gene Student's
  t-test, equal variance)". The code uses `equal_var=True` (Student's), and the Fig 5
  caption already says "naive t-test"; "Welch" is inaccurate.

---

## Replication script update (to add)

Add the count-GLM arm to the replication so the new claims are machine-checked:
- Run `code/threeway/phase_e_countglm.R` (DESeq2/edgeR/limma-voom) and
  `code/threeway/phase_e_threeway.py` from `case_study_4_genomics.py` (or a new
  `case_study_4_threeway` runner) and assert:
  - set sizes DESeq2 1782 (±25), edgeR 2506 (±25), limma-voom 964 (±25)
  - Group A DESeq2-concordant 170/479 (±10); difficulty-matched [0.05,0.10) ≈1.8× (p<1e-6)
  - Group B DESeq2-DE 45/74 (±5), edgeR 54/74 (±5); median |DESeq2 log2FC| ≈0.85
  - MCC naive ≈0.53, Guardian ≈0.51 vs consensus
  - pyDESeq2 vs R DESeq2 Jaccard ≥0.95
- Add to `MASTER_VERIFICATION.py` so it runs green end-to-end.

---

## bioRxiv

The abstract clause "74 outlier-driven false positives rejected" is live on bioRxiv
(doi 10.64898/2026.06.15.732278). Post a **v2** with the SITE 1 abstract text once the
PI approves. bioRxiv versions are permanent and stack; v1 remains citable.
