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
| A — Dataset selection | ⬜ pending | — | — | Awaiting kickoff |
| B — Data download & sanity | ⬜ pending | — | — | Blocked on A |
| C — Reproduce original analysis | ⬜ pending | — | — | Blocked on B |
| D — Guardian-augmented analysis | ⬜ pending | — | — | Blocked on C |
| E — Write manuscript section | ⬜ pending | — | — | Blocked on D |
| F — Replication script + MASTER_VERIFICATION | ⬜ pending | — | — | Blocked on E |
| G — Figure | ⬜ pending | — | — | Blocked on D (parallel with E) |

---

## Phase A — Dataset selection

### Tasks

- [ ] **A.1** Spawn dataset-scouting subagent with anti-fabrication instructions
- [ ] **A.2** Query NCBI eutils GEO datasets API (`db=gds`) for candidate RNA-seq studies meeting criteria
- [ ] **A.3** Fetch top 5-10 candidate GSE records via efetch
- [ ] **A.4** For each candidate, fetch the linked PubMed record
- [ ] **A.5** For each candidate, fetch the PMC full-text record (filter to open-access papers)
- [ ] **A.6** Read the Methods section of each open-access candidate, identify the differential expression test used
- [ ] **A.7** Pick the first candidate that meets all selection criteria (see `PLAN.md` Phase A)
- [ ] **A.8** Present chosen dataset to PI for sign-off

### Checkpoints

| ID | Description | Status | Evidence | Verdict |
|---|---|---|---|---|
| **A1** | GEO record verified via eutils efetch | ⬜ | `evidence/A1_geo_record.xml` | — |
| **A2** | PubMed record verified via eutils efetch | ⬜ | `evidence/A2_pubmed.xml` | — |
| **A3** | Open-access status confirmed via PMC | ⬜ | `evidence/A3_pmc_check.xml` | — |
| **A4** | Original analysis identified, Methods sentence quoted | ⬜ | `evidence/A4_methods_quote.md` | — |

**Phase A complete when:** all four checkpoints PASS and PI has signed off on the chosen dataset.

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
