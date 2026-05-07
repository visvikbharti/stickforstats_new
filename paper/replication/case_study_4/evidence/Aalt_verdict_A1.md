# Aalt_A1 Verdict — GEO record verified (Phase A-bis alternative)

**Chosen dataset:** GSE271517

**Claim being verified:** GEO record GSE271517 corresponds to a bulk RNA-seq
study of 91 synovial sarcoma tumors from 55 patients (some patients with
longitudinal samples), with both `Patient_Counts.csv.gz` and `Sample_Counts.csv.gz`
raw count matrices publicly available. The dataset can be partitioned into
two groups by SS18 fusion partner: SSX1 (n=46 samples) vs SSX2 (n=44
samples), with 1 SSX4 sample excluded.

---

## Verified facts (each line points at the evidence-file field)

| Claim | Field in evidence files |
|---|---|
| Accession = GSE271517 | line 1: `^SERIES = GSE271517` in `Aalt_candidate_GSE271517_brief.txt` |
| Title = "Molecular Profiling Defines Three Subtypes of Synovial Sarcoma" | line 2: `!Series_title` in `Aalt_candidate_GSE271517_brief.txt` (also in PubMed XML, A2 verdict) |
| Study type = Expression profiling by high throughput sequencing | line in brief record `!Series_type` |
| Organism = Homo sapiens | inferred from PubMed (A2 verdict) and parser query filter `db=gds&term=...AND ("Homo sapiens"[ORGN])...` |
| Total samples in GEO = 91 | counted as the union of fusion-gene characteristics (46 + 44 + 1) in `Aalt_candidate_GSE271517_samples.txt` (`grep ^!Sample_characteristics_ch1 ... \| grep "fusion gene"` → 46 SSX1, 44 SSX2, 1 SSX4) |
| Group structure for Phase A-bis comparison = 46 SSX1 vs 44 SSX2 | parsed from `!Sample_characteristics_ch1 = fusion gene: SSX1\|SSX2` blocks |
| Linked PubMed ID = 39257029 | esummary record (`Aalt_geo_summaries_2019_2024_b2.xml`) and `Aalt_candidate_GSE271517_pubmed.xml` |
| Supplementary file (raw counts) = `GSE271517_Sample_Counts.csv.gz` (3.3 MB) and `GSE271517_Patient_Counts.csv.gz` (2.1 MB) | brief record `!Series_supplementary_file` lines + verified directory listing at `https://ftp.ncbi.nlm.nih.gov/geo/series/GSE271nnn/GSE271517/suppl/` (HTTP 200) |
| 91 tumors from 55 patients | abstract of original paper (PMC11892499, A3 verdict): "we performed RNA and targeted DNA sequencing on 91 tumors from 55 patients" |

## Sample-count derivation

```python
import re
with open('evidence/Aalt_candidate_GSE271517_samples.txt') as f:
    content = f.read()
# Count fusion gene characteristics
fusion = re.findall(r'!Sample_characteristics_ch1 = fusion gene: (\S+)', content)
# Result: SSX1=46, SSX2=44, SSX4=1
from collections import Counter
print(Counter(fusion))
# Counter({'SSX1': 46, 'SSX2': 44, 'SSX4': 1})

# Histology
histology = re.findall(r'!Sample_characteristics_ch1 = histology: (\w+)', content)
print(Counter(histology))
# Counter({'Monophasic': 74, 'Biphasic': 14})  -- note: histology missing for some samples; n!=91
```

The 91-sample count is also corroborated by the abstract ("91 tumors from
55 patients") and by the count of distinct GSM blocks
(`grep -c '^\^SAMPLE = ' evidence/Aalt_candidate_GSE271517_samples.txt`).

## Two-group analysis we will run (Phase A-bis primary candidate)

**Primary comparison (passes n ≥ 20 / group):**
- SS18::SSX1 fusion, n = 46
- SS18::SSX2 fusion, n = 44

**Note:** the SSX4 sample (n=1) is excluded from the two-group comparison.

**Caveat (must surface in Phase E manuscript draft):** the SSX1 vs SSX2
comparison is NOT the original paper's primary differential-expression
analysis. The paper's primary DE analyses compared three NMF-derived
"subtypes" (subtype I vs II, subtype II vs III, etc.). The SSX1 vs SSX2
comparison is, however, a natural pre-specified biological comparison
in this dataset (the two fusion variants are the standard clinical
distinction in synovial sarcoma), and the paper does report on this
comparison briefly: "no significant difference between SSX1 and SSX2
fusions in terms of overall survival (OS) or metastasis-free survival
(MFS) (log-rank test, P = 0.637 and 0.494, respectively)" (PMC11892499).
The paper used the same RNA-seq counts and DESeq2 pipeline that we will
apply to this new comparison.

## Selection-criteria checklist (Phase A-bis)

- [x] **Two-group RNA-seq comparison** — SSX1 vs SSX2, binary
- [x] **Raw counts publicly available in GEO** — `GSE271517_Sample_Counts.csv.gz` (3.3 MB) and `GSE271517_Patient_Counts.csv.gz` (2.1 MB), both explicitly named "Counts" matrices (paper Methods §4.10 confirms these are featureCounts outputs)
- [x] **n ≥ 20 per group** — 46 SSX1, 44 SSX2
- [x] **Total samples ≤ 100** — 90 (excluding the single SSX4 sample)
- [x] **Original paper open-access in PMC** — PMC11892499 (verified in A3)
- [x] **Published 2019 or later** — 2024 (Adv Sci, Nov 2024)
- [x] **Topic is cancer** — Synovial sarcoma (soft-tissue sarcoma)
- [x] **Methods identifies a reproducible test** — DESeq2 with raw counts (verified in A4)
- [x] **NOT GSE219027** — confirmed (different accession, different cancer type)

## Verdict

**PASS** — GSE271517 satisfies all the GEO-side selection criteria for
the alternative Phase A-bis dataset. We will proceed with this dataset
as the alternative for PI sign-off.

## Discrepancy notes

- **No sample-count discrepancy.** Paper abstract states "91 tumors from
  55 patients"; GEO record has exactly 91 sample blocks (counted via
  `grep -c '^\^SAMPLE = '`). Of these, 46 are SSX1 fusions, 44 are SSX2,
  and 1 is SSX4 (excluded from our two-group analysis). The fusion
  classification is verified in `!Sample_characteristics_ch1` field.
- **Comparison-mismatch caveat:** the paper's primary DEG analyses are
  3-subtype (NMF cluster) comparisons, not SSX1 vs SSX2. Our SSX1 vs
  SSX2 comparison uses the same raw counts and DESeq2 method that the
  paper used, but the SSX1-vs-SSX2 specific result list is not in the
  paper for direct top-hit cross-validation. This means **Phase C
  (reproduce the original analysis) requires modification**: rather
  than reproducing the paper's headline DEGs, we will reproduce one of
  the paper's 3-subtype DEG comparisons (e.g., "Bulk RNA-seq DEGs (SS
  III versus SS II)" from Figure 6c) as our cross-validation, then
  shift to SSX1 vs SSX2 as the Guardian case-study comparison. This
  needs PI sign-off before Phase C starts.

## Evidence file

- `evidence/Aalt_candidate_GSE271517_brief.txt` — GEO Series brief record (raw)
- `evidence/Aalt_candidate_GSE271517_samples.txt` — full sample-block dump (raw, 91 SAMPLE blocks)
- `evidence/Aalt_geo_summaries_2019_2024_b2.xml` — esummary record showing PMID 39257029, n=91 samples, suppFile = "CSV"
- `evidence/Aalt_geo_search_cancer_2019_2024.xml` — original esearch query that surfaced this dataset
