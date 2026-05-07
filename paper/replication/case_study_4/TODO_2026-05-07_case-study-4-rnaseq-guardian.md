# TODO — Case Study 4: Real RNA-seq with Guardian

| | |
|---|---|
| **Started** | 2026-05-07 |
| **Last updated** | 2026-05-07 |
| **Plan** | `PLAN_2026-05-07_case-study-4-rnaseq-guardian.md` |
| **Audit log** | `AUDIT_LOG_2026-05-07_case-study-4-rnaseq-guardian.md` |

**Status legend:** ⬜ pending  ▶️ in progress  ✅ done  ❌ failed  ⏸️ blocked  🔄 needs revisit

---

## Phase status overview

| Phase | Status | Started | Completed | Notes |
|---|---|---|---|---|
| A — Dataset selection (initial) | ✅ done | 2026-05-07T12:30 | 2026-05-07T13:30 | GSE219027 picked; PI flagged borderline n + topic centrality |
| A-bis — Alternative scout | ✅ done | 2026-05-07T12:30 | 2026-05-07T13:00 | GSE271517 picked (synovial sarcoma, n=46 vs 44); PI approved switch |
| B — Data download & sanity | ✅ done | 2026-05-07T13:30 | 2026-05-07T14:10 | All 3 checkpoints PASS for GSE271517; raw integer counts confirmed; 91 samples (46 SSX1 + 44 SSX2 + 1 SSX4 excluded); 100% Ensembl IDs; Patient_Counts.csv also available for pseudoreplication-clean variant |
| C — Reproduce original analysis | ✅ done | 2026-05-07T14:30 | 2026-05-07T14:50 | Pivoted contrast (Primary vs Metastasis); 1,781 DEGs at padj<0.05; 5/5 SS markers express; KRT8 + OVOL1 directions match paper Subtype-III narrative; pseudoreplication caveat documented (sample vs patient top-100 overlap = 4%); see `outputs/replication_diff.md` |
| D — Guardian-augmented analysis | ⬜ pending | — | — | Blocked on C |
| E — Write manuscript section | ⬜ pending | — | — | Blocked on D |
| F — Replication script + MASTER_VERIFICATION | ⬜ pending | — | — | Blocked on E |
| G — Figure | ⬜ pending | — | — | Blocked on D (parallel with E) |

---

## Phase A — Dataset selection

### Tasks

- [x] **A.1** Spawn dataset-scouting subagent with anti-fabrication instructions
- [x] **A.2** Query NCBI eutils GEO datasets API (`db=gds`) for candidate RNA-seq studies meeting criteria — 5 query variants saved at `evidence/A0_geo_search_*.xml`
- [x] **A.3** Fetch top candidates via esummary + acc.cgi — 60+ candidate briefs at `evidence/A1_candidate_*_brief.txt` and `evidence/A1_candidate_*_samples.txt`
- [x] **A.4** For top 6 candidates, fetched the linked PubMed record at `evidence/A2_candidate_*_pubmed.xml`
- [x] **A.5** Fetched the PMC full-text record for 4 open-access candidates: PMC10068310 (chosen), PMC9624514, PMC11291271, PMC11474141
- [x] **A.6** Read the Methods section of each open-access candidate and identified the differential expression test
- [x] **A.7** Picked GSE219027 — meets all 8 selection criteria
- [ ] **A.8** Present chosen dataset to PI for sign-off ← awaiting PI

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **A1** | GEO record verified via eutils + acc.cgi | ✅ | `evidence/A1_verdict.md` (+ raw `A1_candidate_GSE219027_brief.txt` and `A1_candidate_GSE219027_samples.txt`) | PASS |
| **A2** | PubMed record verified via eutils efetch | ✅ | `evidence/A2_verdict.md` (+ raw `A2_candidate_GSE219027_pubmed.xml`) | PASS |
| **A3** | Open-access status confirmed via PMC | ✅ | `evidence/A3_verdict.md` (+ raw `A3_candidate_PMC10068310_fulltext.xml`) | PASS |
| **A4** | Original analysis identified, Methods sentence quoted | ✅ | `evidence/A4_verdict.md` | PASS |

**Phase A complete when:** all four checkpoints PASS and PI has signed off on the chosen dataset.

**Active dataset (post Phase A-bis switch):**
- **GSE271517** — bulk RNA-seq, n = 90 (46 SSX1 + 44 SSX2; +1 SSX4 excluded)
- Paper: Chen Y et al. 2024, *Adv Sci (Weinh)* 11(41):e2404510 (PMID 39257029, PMC11892499, DOI 10.1002/advs.202404510)
- Test to reproduce: DESeq2 on raw counts (Methods quoted in `evidence/Aalt_verdict_A4.md`)
- Active Phase A artefacts: `evidence/Aalt_verdict_A1.md`–`Aalt_verdict_A4.md`

**Fallback dataset (Phase A initial pick, retained but not used in manuscript):**
- GSE219027 — bulk RNA-seq, n = 24 (12 obese + 12 normal-weight osteoarthritis)
- Paper: Wijesinghe et al. 2023, *Clin Transl Med* 13(4):e1232 (PMID 37006170, PMC10068310, DOI 10.1002/ctm2.1232)
- Phase A verdict files (`evidence/A1_verdict.md`–`A4_verdict.md`) and the data file `data/GSE219027_DESeq_Counts.txt.gz` remain in the repo as documented fallback. Excel-corruption side finding (`data/file_format_check.md`) may be cited as a one-sentence Discussion anecdote regardless of which dataset Case Study 4 uses.

---

## Phase B — Data download & sanity checks

**Target dataset: GSE271517** (synovial sarcoma, SSX1 vs SSX2)

### Tasks

- [x] **B.1** Download supplementary files: `GSE271517_Sample_Counts.csv.gz` (3.3 MB) + `GSE271517_Patient_Counts.csv.gz` (2.1 MB) — both present at NCBI FTP, MD5 sums recorded
- [x] **B.2** Verified count files are raw integer counts (zero floats in 99 sampled rows × 91 columns) — pyDESeq2 reproduction is therefore possible
- [x] **B.3** Parsed sample sheet → `data/GSE271517_sample_assignment.csv`; 91/91 column-header → GSM 1:1 alignment
- [x] **B.4** Dimensions: 63,677 genes × 91 samples (Sample_Counts) and × 55 patients (Patient_Counts)
- [x] **B.5** Group split: 46 SSX1 + 44 SSX2 + 1 SSX4 at sample-level; 28 SSX1 + 26 SSX2 + 1 SSX4 at patient-level (each fusion-gene assignment traces to `characteristics_ch1` of the GSM record)
- [x] **B.6** QC sanity (reads/sample distribution, missing rate) deferred to Phase C — will be embedded in the replication script alongside DESeq2 reproduction

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **B1** | Dimensions match GEO metadata | ✅ | `data/GSE271517_dimensions_check.md` | PASS |
| **B2** | Sample-group assignments match `characteristics_ch1` | ✅ | `data/GSE271517_sample_assignment.csv` | PASS |
| **B3** | Gene IDs in standard format | ✅ | `data/GSE271517_dimensions_check.md` (B3 section) — 100% Ensembl, no Excel corruption | PASS |

---

## Phase C — Reproduce the original analysis (post-pivot)

**Pivoted contrast (PLAN amendment 2):** Primary tumor vs Metastasis,
sample-level n=55 vs n=36 (with patient-level sensitivity analysis to
follow). Reason: paper found SSX1-vs-SSX2 has no biological signal
(§2.7); Primary-vs-Metastasis is biologically meaningful and the paper
extensively discusses metastasis biology via the Subtype I cluster.

### Tasks

- [x] **C.1** Installed pyDESeq2 0.4.4 (compatible with system SciPy 1.7.3; 0.4.10+ requires SciPy 1.11+ via `false_discovery_control`)
- [x] **C.2** Loaded `Sample_Counts.csv` → 63,677 × 91; built sample-level + patient-level designs
- [x] **C.3** Low-count filter ≥10 reads in ≥3 samples → 27,221 genes (sample-level), 25,432 genes (patient-level)
- [x] **C.4** Ran pyDESeq2 contrast Metastasis vs PrimaryTumor; 1,781 sig at padj<0.05 (sample-level); 704 (patient-level)
- [x] **C.5** Saved top-100 by padj to `outputs/C_top100_DEGs.csv` and `outputs/C_patient_level_top100_DEGs.csv`
- [x] **C.6** Looked up Ensembl GRCh37 IDs live (3 of 14 would have been wrong from training memory); 5/5 SS markers express
- [x] **C.7** Metastasis-gene direction check: 3/8 canonical (carcinoma-EMT logic doesn't fully apply to SS); paper-specific markers (KRT8, OVOL1) match paper §2.10 Subtype-III narrative
- [x] **C.8** Patient-level sensitivity: 4% top-100 overlap with sample-level — pseudoreplication is significant but orthogonal to Guardian's scope; documented openly
- [x] **C.9** Discrepancies documented in `outputs/replication_diff.md` (no parameter tuning)

### Checkpoints (post-pivot, per PLAN amendment 2)

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **C1** | ≥5/5 SS markers express + biological-direction sanity | ✅ | `outputs/canonical_marker_check.md` + `replication_diff.md` | PASS-with-context |
| **C2** | Effect-size signs match for paper-named genes (KRT8, OVOL1) | ✅ | `outputs/replication_diff.md` C2 section | PASS |
| **C3** | Discrepancies documented (or "no discrepancies") | ✅ | `outputs/replication_diff.md` | PASS |

---

## Phase D — Guardian-augmented analysis

### Tasks

- [ ] **D.1** Invoke `backend/core/services/genomics/differential_expression.py` with Guardian enabled
- [ ] **D.2** Per-gene Shapiro-Wilk + Levene's; cascade failures to Mann-Whitney U
- [ ] **D.3** Apply Benjamini-Hochberg FDR across all p-values
- [ ] **D.4** Verify Guardian code path actually executed (parse log emissions)
- [ ] **D.5** Compute cascade rate
- [ ] **D.6** Compute hit-list comparison (parametric-only / nonparametric-only / verdict-flipped)

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **D1** | Guardian validators ran on every gene | ⬜ | `outputs/guardian_log_excerpt.txt` | — |
| **D2** | Cascade rate ∈ [5%, 50%] | ⬜ | `outputs/cascade_rate.md` | — |
| **D3** | Hit-list comparison CSV produced | ⬜ | `outputs/guardian_vs_naive.csv` | — |

---

## Phase E — Write manuscript section

### Tasks

- [ ] **E.1** Draft Case Study 4 section (250-350 words)
- [ ] **E.2** Add 1 small summary table
- [ ] **E.3** Add bibliography entries (full PMID + DOI per cited paper)
- [ ] **E.4** Fact-check every numerical claim against script output
- [ ] **E.5** Send draft to PI for review

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **E1** | Manuscript numbers traced to script lines | ⬜ | `evidence/E1_factcheck.md` | — |
| **E2** | Every reference has fetched record in `evidence/` | ⬜ | `evidence/E2_citations.md` | — |
| **E3** | PI reviewed and approved | ⬜ | (PI confirmation in audit log) | — |

---

## Phase F — Replication script & MASTER_VERIFICATION

### Tasks

- [ ] **F.1** Build `paper/replication/case_study_4_genomics.py`
- [ ] **F.2** Wire data files / download into the script
- [ ] **F.3** Add to `paper/replication/MASTER_VERIFICATION.py`
- [ ] **F.4** Update `paper/replication/README.md`
- [ ] **F.5** Smoke-test from a clean checkout

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **F1** | Script runs from clean checkout | ⬜ | (terminal capture) | — |
| **F2** | MASTER_VERIFICATION returns 0 with case_study_4 included | ⬜ | (terminal capture) | — |

---

## Phase G — Figure

### Tasks

- [ ] **G.1** Pick visualisation type (see `PLAN.md` Phase G)
- [ ] **G.2** Generate figure via matplotlib script in `code/`
- [ ] **G.3** Save to `paper/plos_compbio/figures/fig6_genomics_case_study.png`
- [ ] **G.4** Add Figure 6 caption to manuscript

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **G1** | Figure renders cleanly at 300 DPI | ⬜ | `outputs/fig6_*.png` | — |
| **G2** | Figure caption added to manuscript Figure Legends | ⬜ | (manuscript diff) | — |

---

## Open questions (to PI when relevant)

- *(none yet — none have arisen)*

---

## Decisions log

Date-stamped record of decisions taken during execution.

- **2026-05-07** — PI approved the plan and the anti-fabrication charter as written. Phase A pending start.
- **2026-05-07** — Domain preference left to executing agent's discretion. Default lean: cancer-vs-normal (rationale: most reviewer-relevant, GEO has strong selection).
- **2026-05-07** — Phase A scouting agent ran. Default cancer-vs-normal preference relaxed to broader "comp-bio relevant disease vs healthy" because the strict cancer-vs-normal filter intersected with all other criteria (n≥8/group, two-group only, raw counts, PMC OA, reproducible test) returned no clean candidates after evaluating ~60 datasets. The chosen dataset (GSE219027, osteoarthritis obese vs normal-weight synovial fibroblasts) is in the inflammation/immunology space — relevant for comp bio but not strictly cancer.
- **2026-05-07** — Two named candidates were rejected for important methodological reasons documented in `evidence/A1_verdict.md`'s rejection list. Most-relevant rejection: GSE264492 (HeLa + Streptococcus agalactiae) used the time-series tool TiSA rather than a clean two-group test, breaking the "we can reproduce this" criterion.

---

## Risk log

Issues that could derail this work, with mitigations.

| Risk | Likelihood | Mitigation |
|---|---|---|
| No GEO dataset meets all criteria | Low | Relax criteria one at a time, log each relaxation; pivot to mouse if human fails |
| Original paper used a method we can't reproduce (e.g., custom Bayesian model) | Medium | A4 catches this before we commit; pick a different paper |
| Our recomputation diverges from paper at C1 | Medium | Document, investigate; if unresolvable pivot to new dataset |
| Guardian cascade rate is 0% (broken) or 100% (data issue) | Low | D2 catches this; investigate |
| PI rejects manuscript draft | Medium | Address feedback honestly; do not argue against integrity-related concerns |
| Time slips beyond 3 days | Medium | Re-scope: drop Phase G figure → text-only case study acceptable for first draft |
