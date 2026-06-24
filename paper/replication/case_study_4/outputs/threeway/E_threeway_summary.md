# Phase E -- three-way DE divergence: count-GLM adjudication

**Question:** does Guardian's rank-based cascade move the gene list TOWARD the count-based GLM standard (DESeq2 / edgeR / limma-voom), or away from it?

## Significant-set sizes (padj/FDR < 0.05, 27,221 genes)

| Method | Significant |
|---|---|
| naive | 1,006 |
| guardian | 1,411 |
| DESeq2 | 1,782 |
| edgeR | 2,506 |
| limma_voom | 964 |
| countglm_consensus>=2of3 | 1,584 |
| countglm_consensus=3of3 | 712 |

## Headline 1 -- agreement with the count-GLM consensus (>=2 of 3)

| Simple method | MCC | F1 | Cohen kappa | recall of consensus |
|---|---|---|---|---|
| naive t-test | 0.5344 | 0.5413 | 0.5196 | 0.4426 |
| **Guardian** | 0.5067 | 0.5329 | 0.5058 | 0.5038 |

Closer to the count-GLM consensus: **naive** (higher MCC).

## Headline 2 -- adjudicating the verdict flips with the gold standard

**Group A (479 Guardian rescues; naive-NS, Guardian-sig):** 29.0% are confirmed DE by the count-GLM consensus (DESeq2 alone: 35.5%) vs a background rate of 2.9% among all naive-non-significant genes -- **10.04x enrichment**, Fisher p=1.307e-90.

**Group B (74 Guardian rejects; naive-sig, Guardian-NS):** 43.2% are agreed NOT-DE by the count-GLM consensus (DESeq2 alone: 39.2%) vs 29.3% among all naive-significant genes -- **1.48x enrichment**, Fisher p=0.009944.

## DESeq2 DE-rate by verdict category (monotonicity check)

| Category | DESeq2-DE rate |
|---|---|
| hit_by_both | 67.9% |
| guardian_only(A) | 35.5% |
| naive_only(B) | 60.8% |
| neither | 3.6% |

## Effect-size concordance with DESeq2 log2FC

- Spearman rho: Guardian 0.869, naive 0.851
- Sign agreement: Guardian 77.3%, naive 77.3%

## Reproducibility cross-check

- pyDESeq2 vs canonical R DESeq2: Jaccard 0.974, kappa 0.9859 (faithful port).
