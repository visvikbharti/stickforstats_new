# Phase B verdict — GSE271517 dimensions, format, sample assignment

| | |
|---|---|
| **Date** | 2026-05-07 |
| **Active dataset** | GSE271517 (Chen Y et al. 2024, *Adv Sci* 11(41):e2404510, PMID 39257029, PMC11892499) |

## B1 — Dimensions (PASS)

### `GSE271517_Sample_Counts.csv.gz`

| | |
|---|---|
| File MD5 | `305be1592dd5f00670aab55c6c0375c9` |
| File size | 3,449,884 bytes (3.3 MB compressed) |
| Lines | 63,678 (1 header + 63,677 data rows) |
| Columns | 92 (= 1 `ID` column + 91 sample columns) |
| Genes | 63,677 |
| Samples | 91 |
| Source | `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE271nnn/GSE271517/suppl/` |

### `GSE271517_Patient_Counts.csv.gz`

| | |
|---|---|
| File MD5 | `3ecb1487424447c44da963901ec2dbe0` |
| File size | 2,190,551 bytes (2.1 MB compressed) |
| Lines | 63,678 (1 header + 63,677 data rows) |
| Columns | 56 (= 1 `ID` column + 55 patient columns) |
| Genes | 63,677 (same set as Sample_Counts) |
| Patients | 55 |

### Cross-check against GEO metadata

- GEO `acc.cgi` brief reports 91 `!Series_sample_id` lines (GSM8378214 — GSM8378304). **Matches Sample_Counts.csv 91 columns. PASS.**
- Original paper abstract: *"91 tumors from 55 patients"* (per A4_verdict). Matches both files.

## B2 — Sample-group assignment (PASS)

### Method

For every column header in `Sample_Counts.csv.gz`, look up the corresponding GSM
record in the GEO `samples` dump and read the `!Sample_characteristics_ch1 = fusion gene: ...`
line. The sample → fusion mapping is therefore traced to the authoritative GEO
metadata, never inferred from filenames or column ordering.

Mapping table built and saved at `data/GSE271517_sample_assignment.csv` (8 columns:
`gsm`, `sample_title`, `patient_id`, `fusion_gene`, `histology`, `tumor_type`,
`metastasis`, `overall_survival`).

### Result

| Level | n | Group structure |
|---|---|---|
| Sample-level (one column per tumor) | 91 | **46 SSX1, 44 SSX2, 1 SSX4** |
| Patient-level (one column per patient, paper-aggregated) | 55 | **28 SSX1, 26 SSX2, 1 SSX4** |

### Sample-vs-patient confound

Of the 55 patients, **17 contributed multiple tumor samples** (range 2-5 each). The
biggest contributor is patient P1 with 5 tumors. The agent's verdict file
(`evidence/Aalt_verdict_A4.md`) flagged this as a Phase B concern.

**Implication for Case Study 4 design:** the patient-level matrix avoids
pseudoreplication and is statistically the cleaner choice. n = 28 vs 26 (after
excluding the single SSX4 patient) is still well above our power floor of n ≥ 20
per group, and it removes the within-patient correlation issue entirely.
**Phase D should use Patient_Counts.csv.gz unless the original paper
explicitly used Sample_Counts** (Phase C will resolve this when we read the
paper's analysis section more carefully).

### Cross-check: file column titles ↔ sample sheet titles

```
Sample sheet has 91 unique titles
Count file has 91 sample columns
In both: 91
In sheet only: 0
In file only: 0
```

**1:1 alignment.** No orphan titles. PASS.

## B3 — Gene ID format (PASS)

| Check | Result |
|---|---|
| Format | Ensembl gene IDs |
| Pattern | `ENSG[0-9]{11}` (e.g. `ENSG00000000003` = TSPAN6) |
| Match rate | **100% (63,677 / 63,677)** start with `ENSG` |
| Excel-date corruption (Ziemann 2016) | **None detected** |
| Reference build | hg19 / GRCh37 (per paper Methods, also confirmed by gene-count consistency with Ensembl GRCh37 v75 ≈ 63k features) |

**Distinct improvement over GSE219027:** GSE219027's count file contained 9
Excel-date-corrupted gene names at the top of the matrix (integer values like
37226 = 2001-12-01); GSE271517 uses Ensembl IDs throughout, no corruption.

## Caveats and items deferred to later phases

1. **Sample-vs-patient analytical level.** Defer the formal choice to Phase C.
   Default lean: patient-level (cleaner statistics). Phase C will verify whether
   the paper's reported DEG list uses Sample- or Patient-Counts.

2. **SSX4 single sample.** Excluded from the binary SSX1-vs-SSX2 comparison (per
   the paper's own primary analysis). 90 of 91 samples (or 54 of 55 patients) are
   used.

3. **QC (read counts per sample, missing-value rate, overall normalisation
   sanity).** Deferred to Phase C — these checks will be embedded in the
   replication script alongside the t-test/DESeq2 baseline computation.

## Verdict summary

| Checkpoint | Verdict | Evidence |
|---|---|---|
| **B1** Dimensions match GEO metadata | PASS | This file + raw `acc.cgi` fetch |
| **B2** Sample-group assignment traces to `characteristics_ch1` | PASS | `data/GSE271517_sample_assignment.csv` |
| **B3** Gene IDs in standard format | PASS | First/last/random gene-ID inspection; 100% Ensembl |

**Phase B for GSE271517: COMPLETE.** Ready to start Phase C.
