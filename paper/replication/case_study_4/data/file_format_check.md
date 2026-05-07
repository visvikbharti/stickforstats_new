# Phase B partial finding — `GSE219027_DESeq_Counts.txt.gz` is normalized counts, not raw counts

| | |
|---|---|
| **Date** | 2026-05-07 |
| **File** | `data/GSE219027_DESeq_Counts.txt.gz` (1.7 MB compressed; MD5 32d84f35da754a34a7b0825d70bcb49e) |
| **Source** | `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE219nnn/GSE219027/suppl/GSE219027_DESeq_Counts.txt.gz` |

## What we found

The file's name is ambiguous — `_DESeq_Counts` could mean either *raw counts ready for DESeq2* (the input) or *DESeq2 size-factor-normalized counts* (an output). Inspection shows it's the latter:

| Indicator | Value | Interpretation |
|---|---|---|
| Lines | 60,613 | 3 metadata header rows + 60,610 gene rows |
| Columns | 25 | 1 gene-symbol column + 24 sample columns |
| Float fraction (first 100 data rows × all columns) | ~33% | Pure raw counts would be 0% floats |
| Value range (sample MFX037_S33, n=11,132 nonzero) | 1.16 → 370,262 | Consistent with size-factor-normalized counts (still on count scale) |
| Median nonzero | 99.45 | Typical for normalized RNA-seq |

Decoded: this is the output of `counts(dds, normalized=TRUE)` from DESeq2 (counts divided by sample-specific size factors). It is **not** raw integer counts (input to `DESeqDataSetFromMatrix()`), and it is **not** VST-transformed values (those would be log-scale, all <20).

## Why this matters

- **Cannot run pyDESeq2 from this file** — pyDESeq2 requires raw integer counts as input.
- **Can still run a per-gene t-test pipeline** on this matrix (the genomics module's parametric default), with or without log2-transformation for variance stabilization.
- **Phase C reproduction** must therefore be reframed: rather than "recompute DESeq2 from raw counts and verify our top hits", it becomes "run the same per-gene t-test the platform applies and verify the paper's named genes (MMP9, S100A8, TYROBP, ARG2, IKBKE, PALB2, UQCC3, COL4*) appear in our top hits."

## Bonus finding — Excel-date gene corruption

The first nine "gene IDs" in the file are integer values that decode to dates:

| Integer ID in file | Excel date interpretation | Likely original gene name |
|---|---|---|
| 37226 | 2001-12-01 | DEC1 / SEPT1 family |
| 37681 | 2003-03-01 | MARCH family |
| 38047 | 2004-03-01 | MARCH family |
| 38412 | 2005-03-01 | MARCH family |
| 38777 | 2006-03-01 | MARCH family |
| 39142 | 2007-03-01 | MARCH family |
| 39508 | 2008-03-01 | MARCH family |
| 39873 | 2009-03-01 | MARCH family |
| 40238 | 2010-03-01 | MARCH family |
| 40603 | 2011-03-01 | MARCH family |

This is the well-documented **Ziemann et al. 2016 issue** — gene names like `SEPT1`/`SEPT2`/.../`MARCH1`/`DEC1` get auto-converted to Excel date serial numbers when imported. After the first 9 corrupted IDs, the remaining ~60,600 rows use proper HGNC symbols (A1BG, A1BG-AS1, A1CF, A2M, ...).

This is a side finding, not part of the main case-study narrative, but it ironically illustrates the broader thesis (automated quality checks are needed) — the dataset itself contains a famous bioinformatics quality bug.

## Sample dimensions confirmed

24 samples, 12 obese + 12 normal-weight, balanced. Sample → GSM mapping saved at `data/sample_assignment.csv` (built by parsing `evidence/A1_candidate_GSE219027_samples.txt`).

## Implications for case-study scope

If we proceed with GSE219027:
1. **Phase C reproduction:** simplified to "named verifying genes appear in top hits" (paper provides ~8 such genes). Drop the "≥80% of top-100" criterion (no top-100 list exists in the paper).
2. **Phase D Guardian analysis:** runs natively on the normalized matrix; the genomics module's t-test default operates on per-gene values regardless of normalization scheme.
3. **Manuscript framing:** *"We use the published DESeq2 size-factor-normalized expression matrix from GSE219027 (`counts(dds, normalized=TRUE)` form, deposited by the original authors). Applying the platform's parametric default (per-gene t-test), Guardian cascaded N% of genes to Mann-Whitney U based on per-gene normality violations."*

## Verdict

**B1 (dimensions): PASS** — 60,610 genes × 24 samples confirmed.
**B2 (sample assignment): PASS** — 12 OB + 12 NW, mapped to GSM IDs via the GEO sample sheet.
**B3 (gene IDs): PASS-with-caveat** — HGNC symbols, with 9 Excel-date-corrupted entries at the top of the matrix (documented; will be excluded or flagged in downstream analysis).

**File-format caveat: NEEDS-FRAMING-DECISION** — The file contains DESeq2-normalized values, not raw counts, so pyDESeq2 reproduction is not possible. Decide between the simplified Phase C plan (above) or pivoting to a different dataset (GSE271517 from Phase A-bis is a candidate).
