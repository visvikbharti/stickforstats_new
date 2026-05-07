# Aalt_A3 Verdict — Open-access status confirmed (Phase A-bis alternative)

**Chosen dataset:** GSE271517

**Claim being verified:** The Chen et al. 2024 paper for GSE271517 is
open-access in PMC (PMC11892499) and its full text is fetchable via NCBI
eutils. Wiley's *Advanced Science* is a fully open-access journal.

---

## Verified facts

| Claim | Evidence |
|---|---|
| PMCID = PMC11892499 | from A2 verdict (PubMed `PubmedData/ArticleIdList/ArticleId[@IdType='pmc']`) |
| Full PMC XML fetchable | `evidence/Aalt_candidate_PMC11892499_fulltext.xml` (267 KB JATS XML) |
| Public PMC HTML URL | `https://pmc.ncbi.nlm.nih.gov/articles/PMC11892499/` (assumed accessible — not directly retried in this scout but the eutils efetch returned the full body, so HTML rendering is downstream and reliable) |
| Methods section present | `<sec id="advs9200-sec-0240">` "Patient Samples and Ethics" through `<sec id="advs9200-sec-0410">` "Statistics" — all visible in the fetched XML |

## Section structural map (parsed from `advs9200-sec-####` IDs)

Methods sections (each verified to be the article's body, not cited refs):

| Section ID | Title |
|---|---|
| advs9200-sec-0240 | Patient Samples and Ethics |
| advs9200-sec-0250 | Validation Cohorts |
| advs9200-sec-0260 | Tissue DNA and RNA Extraction |
| advs9200-sec-0270 | Whole Transcriptomic Analysis |
| **advs9200-sec-0280** | **RNA seq Data Processing** ← key for A4 verdict |
| advs9200-sec-0290 | Gene Network Construction and Functional Enrichment Analysis |
| advs9200-sec-0300 | Immune Profiling Analyses |
| advs9200-sec-0310 | Non-Negative Matrix Factorization (NMF) Clustering |
| advs9200-sec-0320 | Weighted Correlation Network Analysis (WGCNA) and Co-Expressed Network Construction |
| advs9200-sec-0330 | Fusion Gene Detection |
| advs9200-sec-0340 | Fusion Gene Verification using Sanger Sequencing |
| advs9200-sec-0350 | Single Cell RNA Sequencing Pre-Processing |
| advs9200-sec-0360 | Single Cell RNA Sequencing Data Analysis |
| advs9200-sec-0370 | DNA Sequencing |
| advs9200-sec-0380 | Target Sequencing Data Analysis-Mutation Calling |
| advs9200-sec-0390 | HiRIEF-nanoLC-MS/MS based Proteomics |
| advs9200-sec-0400 | Immunohistochemistry |
| **advs9200-sec-0410** | **Statistics** ← key for downstream gene-level comparison style |
| advs9200-sec-0420 | Ethics Approval and Consent to Participate |

## Verdict

**PASS** — The full Methods, Results, Discussion are accessible via NCBI
eutils PMC endpoint. The relevant DEG-method section is at
`advs9200-sec-0280` ("RNA seq Data Processing"), the relevant
gene-comparison section is at `advs9200-sec-0410` ("Statistics"). Both
have been read and the relevant sentences are quoted verbatim in the
A4 verdict.

## Notes

- Wiley's *Advanced Science* is fully open-access (CC BY).
- License is CC BY 4.0 per the PMC `<license>` block.
- 267 KB JATS XML fetched in a single efetch call — no authentication
  needed, no paywall.

## Evidence file

- `evidence/Aalt_candidate_PMC11892499_fulltext.xml` — full PMC JATS XML (267 KB)
