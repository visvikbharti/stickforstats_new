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
| A — Dataset selection | ✅ done | 2026-05-07T12:30 | 2026-05-07T13:30 | GSE219027 chosen; awaiting PI sign-off |
| B — Data download & sanity | ⬜ pending | — | — | Blocked on PI sign-off of A |
| C — Reproduce original analysis | ⬜ pending | — | — | Blocked on B |
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

**Chosen dataset:**
- GSE219027 — bulk RNA-seq, n = 24 (12 obese + 12 normal-weight osteoarthritis patients)
- Paper: Wijesinghe et al. 2023, *Clin Transl Med* 13(4):e1232 (PMID 37006170, PMC10068310, DOI 10.1002/ctm2.1232)
- Test to reproduce: DESeq2 with VST transformation (per-paper Methods §2.3)
- Headline result to match: 416 DEGs at FC ±1.5, p<0.05; named genes MMP9, S100A8, TYROBP, ARG2, IKBKE, PALB2, UQCC3, COL4*

---

## Phase B — Data download & sanity checks

### Tasks

- [ ] **B.1** Download supplementary files from chosen GSE record
- [ ] **B.2** Identify the count matrix file (often `*_counts.txt.gz` or `*_raw_counts.csv.gz`)
- [ ] **B.3** Identify the sample sheet (GEO `series_matrix.txt.gz` or supplementary metadata)
- [ ] **B.4** Parse count matrix into pandas DataFrame; record dimensions
- [ ] **B.5** Parse sample sheet; record sample → group assignments
- [ ] **B.6** Compute QC: total reads per sample, gene-count distribution, missing-value rate

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **B1** | Dimensions match GEO metadata | ⬜ | `data/dimensions_check.md` | — |
| **B2** | Sample-group assignments match `characteristics_ch1` | ⬜ | `data/sample_assignment.csv` | — |
| **B3** | Gene IDs in standard format | ⬜ | `data/gene_id_check.md` | — |

---

## Phase C — Reproduce the original analysis

### Tasks

- [ ] **C.1** Implement the same test the original paper used (per A4 quote)
- [ ] **C.2** Run on the same data with the same sample groupings
- [ ] **C.3** Extract our top-100 differentially expressed genes
- [ ] **C.4** Cross-check against the original paper's reported top-10/top-20
- [ ] **C.5** For 3-5 specifically named genes in the paper text, compute their values and compare
- [ ] **C.6** Document any discrepancies in `replication_diff.md`

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **C1** | ≥80% of paper's top hits in our top-100 | ⬜ | `outputs/replication_top_hits.csv` | — |
| **C2** | Effect-size signs match | ⬜ | `outputs/effect_size_check.md` | — |
| **C3** | Discrepancies documented | ⬜ | `replication_diff.md` | — |

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
