# Data-availability pilot — how big is the verifiable fraction?

**Date:** 2026-06-24 16:47 IST
**Instrument:** T09 `data_availability_extractor` (11/11 correctness check)
**Harness:** `paper/replication/verification/pilot_data_availability.py`
**Corpus (biomed):** 80 PMC-OA full-text XML on the external drive
`/Volumes/My_Passport/stickforstats_corpus/pilot_biomed_2026-06-24/` (19 MB; not in git)
**Purpose:** size the fraction of papers for which raw-data verification is even *possible*
— the whole product's bottleneck (plan §1/§8). `INSUFFICIENT_DATA` will dominate; this
measures by how much.

---

## Result

| Sample | n | ≥1 data-repo accession | verifiable candidate¹ | on-request | none |
|---|---|---|---|---|---|
| **Biomedical / genomics**² | 80 | **32%** (26) | **44%** (35) | 19% (15) | 21% (17) |
| Psychology / social-science³ | 20 | 10% (2) | 35% (7) | 0% | 40% (8) |

¹ *verifiable candidate* = a structured accession **or** a concrete in-paper/supplementary pointer
(`open_accession` ∪ `in_paper_supp`). ² genomics-leaning PMC-OA query (RNA-seq / DE / single-cell /
transcriptome / genome-wide). ³ the existing statcheck corpus (ANOVA/t-test papers).

**Biomedical availability classes (n=80):** open_accession 28 · on_request 15 · statement_only 13 · in_paper_supp 7 · none 17.

**Repositories (biomedical, accession counts):** GEO **32**, GitHub 18, BioProject 11, Zenodo 8,
PRIDE 2, ArrayExpress 2, dbGaP 1, BioSample 1, MassIVE 1, figshare 1. (GitHub is code, not
necessarily raw data — only 2 papers were GitHub-only, hence 32% *data*-repo vs 35% *any*-accession.)

---

## What this means

1. **Even in the favourable genomics domain, ~⅔ of papers cannot be independently verified
   from public data** (32% have a real data accession; ~56% are on-request / statement-only / none).
   In psychology it is far worse (10%). This *confirms* the plan's core honest framing: the
   headline meta-research finding is **"% of published analyses that are unverifiable for lack of
   accessible raw data"**, and `INSUFFICIENT_DATA` is a first-class result, not a tool failure.
2. **GEO is the #1 target repository (32 of ~80 papers cite one).** → Prioritise the GEO
   fetch/parse path in **T11-FETCH** (it already has precedent: the project's own GSE271517).
   BioProject/SRA, Zenodo, ArrayExpress, dbGaP next.
3. **"Available upon request" (19%) is itself a finding** — papers *claim* availability but gate
   it behind author discretion; these are effectively unverifiable. Worth reporting as its own
   category in the census.
4. **Scale for the program:** deep raw-data verification realistically applies to **~⅓ of
   biomedical papers**; the broad census measures the rest (the majority) as unverifiable. Both
   layers are publishable; the "unverifiable majority" is the striking number.

## Caveats (honest)
- The biomedical query is genomics-leaning, so 32% is an **upper bound** for biomedicine at large;
  the true all-field rate sits between psychology (10%) and this (32%).
- **Accession-present ≠ verifiable.** This pilot measures only the *first* funnel stage (is a
  pointer named?). The next stages — does it **resolve** to a downloadable file (T11), in an
  **ingestible** format (T11), that can be **linked** to the specific claim's variables/design
  (T21) — will each shrink the fraction further. Measure them on this same 80-paper corpus next.
- Text was stripped from JATS with a crude tag-remover; a structured JATS `<data-availability>`
  parser (plan §4 JATS-first) would raise recall of the statement text (not the accessions).

## Update — funnel stage 2: GEO resolve → ingest (2026-06-24 17:09 IST)

The pilot above measured stage 1 (is an accession *named*?). Stage 2 (`funnel_geo.py`, T11)
asks: does a named **GEO** accession resolve to a downloadable, decompressible, **ingestible**
processed table? On 12 of the 24 GEO accessions the pilot found:

| Outcome | n/12 |
|---|---|
| **ingested** (resolved → downloaded → parsed to a DataFrame) | **2 (17%)** |
| no series-level suppl dir | 5 |
| suppl dir but no processed table (only `_RAW.tar` raw reads + filelist) | 4 |
| downloaded but unparseable (corrupt xlsx — flagged, not silently passed) | 1 |

The 2 successes: GSE303993 (`MLO_Counts.xlsx`, 158368×8) and GSE287628 (`DESeq2_vsd_data.csv.gz`,
21524×9) — genuine processed matrices, auto-decompressed and ingested via the extended
`DataImportService` (now reads tab/`.txt` + `.gz`/`.zip`).

**So the funnel compounds:** ~32% of papers name a data accession, and of GEO accessions only
~17% directly yield an ingestible processed matrix at the series suppl level. **17% is a LOWER
bound** — many processed matrices live inside `_RAW.tar`, at the GSM (sample) level, or in GEO
series-matrix softfiles, which this first-increment GEO fetcher does not yet open. Recovering
them is more engineering (T11 follow-ups) and would raise the rate; the honest current finding is
that **directly-verifiable raw data is the exception, not the rule**, even for the #1 repository.

## Repro
```bash
# biomedical (fetch to external drive)
python3 paper/replication/verification/pilot_data_availability.py --label biomed --retmax 80 \
  --corpus-dir /Volumes/My_Passport/stickforstats_corpus/pilot_biomed_2026-06-24
# psychology baseline (existing local corpus)
python3 paper/replication/verification/pilot_data_availability.py --label psych \
  --existing-dir paper/replication/manuscript_validation/corpus
```
JSON: `pilot_out/pilot_biomed.json`, `pilot_out/pilot_psych.json`.
