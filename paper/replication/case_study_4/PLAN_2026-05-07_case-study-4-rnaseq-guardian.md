# PLAN — Case Study 4: Real RNA-seq with Guardian

| | |
|---|---|
| **Date created** | 2026-05-07 |
| **Owner** | Vishal Bharti (PI), Claude Opus 4.7 (executing agent) |
| **Status at creation** | Approved by PI; Phase A pending start |
| **Companion documents** | `TODO_2026-05-07_case-study-4-rnaseq-guardian.md`, `AUDIT_LOG_2026-05-07_case-study-4-rnaseq-guardian.md` |
| **Working directory** | `paper/replication/case_study_4/` |
| **Final replication script (deliverable)** | `paper/replication/case_study_4_genomics.py` (one level up; imports from `case_study_4/data/`) |
| **Manuscript target** | Case Study 4 section in `paper/plos_compbio/manuscript.md` |

---

## Why this case study exists

The PLOS Comp Bio manuscript currently uses three case studies:

1. **CRISPR strategy comparison** (10 variants × 4 modalities, n = 40 — small)
2. **UCI Wine Quality** (a teaching dataset, not biology)
3. **IV-magnesium meta-analysis** (1990s clinical trials, not modern comp bio)

The most likely PLOS Comp Bio reviewer objection is *"is this really
computational biology?"* The honest answer is that all three case studies
are statistics teaching examples that *could* arise in biology rather than
real high-throughput biological workflows.

Case Study 4 closes this gap. It runs the existing
`backend/core/services/genomics/differential_expression.py` module — which is
already advertised in the manuscript (Methods §3) — on a real, published RNA-
seq dataset, demonstrating Guardian's per-gene assumption checking and
cascade behaviour at scale (thousands of genes, not four groups of ten).

Acceptance probability before vs. after this case study: my honest estimate
is ~30% → ~50%, with the biggest gain being on the "substantial advance for
computational biology" criterion.

---

## Anti-Fabrication Charter

These six rules apply to every fact, citation, and number that ends up in
the manuscript or replication script. **Any violation is grounds for
immediate rollback** of the offending change. The charter is non-negotiable
and overrides any time pressure.

### 1. No training-memory citations.

Every paper, GEO ID, PMID, DOI, author list, journal name, and year comes
from a **live API fetch** — never quoted from what the executing agent
"remembers" from training data. Acceptable sources:

- NCBI eutils (`esearch.fcgi`, `efetch.fcgi`, `esummary.fcgi`)
- CrossRef API (`api.crossref.org/works/<DOI>`)
- EuropePMC API (`www.ebi.ac.uk/europepmc/webservices/rest/`)
- Direct HTTP fetch of the open-access paper PDF or its PMC HTML page

Every fetched record gets saved to `evidence/` as raw JSON/XML/HTML before
any claim is made about its contents.

### 2. No claimed sample counts without metadata parsing.

`n = 24 samples` only after parsing the actual SOFT/MINiML file or GEO
sample table. The parsed file is checked into `data/` so a reviewer can
re-derive the count. Statements like "the dataset has 12 treatment samples
and 12 control samples" require pointing at lines/sections in the parsed
metadata.

### 3. No claimed test results without computation.

Every p-value, fold-change, gene-list size, normality-rate, cascade-rate,
or other numerical claim that appears in the manuscript must be produced
by a script in `code/` (final form: `paper/replication/case_study_4_genomics.py`).
The script's stdout (or a CSV it writes) becomes the source of truth.
Quoting numbers from a paper without recomputing them is forbidden.

### 4. No paraphrasing the original paper's claims.

When we report what the original authors did or found, we **quote the actual
sentence and pin its location** (page number, section heading, PMC paragraph
ID, or table caption). Acceptable form:

> "Differential expression was assessed using DESeq2 (v1.30.1) with default
> parameters" *(Smith et al. 2021, Methods §2.3, PMC8123456 ¶27)*

Forbidden form:

> Smith et al. used DESeq2.

### 5. Discrepancy honesty.

If our recomputation does not match the original paper's reported numbers,
we **document the discrepancy explicitly** in `replication_diff.md` —
including possible causes (different normalization, sample exclusions we
didn't replicate, software-version drift). We **never** tune parameters
until they match. If the discrepancy is large enough that the case study
would no longer be honest, we abandon the dataset and pick another.

### 6. Audit log.

Each checkpoint produces a short entry in
`AUDIT_LOG_2026-05-07_case-study-4-rnaseq-guardian.md`:

- Timestamp (ISO-8601)
- Phase + checkpoint ID
- What was claimed
- How it was verified
- Evidence file or URL
- PASS / FAIL / NEEDS-REVIEW verdict

Entries are append-only. If a previous claim is later found to be wrong, we
add a new entry retracting it — we do not edit the historical record.

---

## Phases & Checkpoints

### Phase A — Dataset selection

**Goal:** identify a single GEO dataset that satisfies all selection criteria
and has a paper open enough for us to verify the Methods.

**Selection criteria (all must hold):**

- [x] Two-group RNA-seq comparison (treatment vs. control, or disease vs.
      healthy) — simplifies Guardian's binary-test cascade decision
- [x] Raw counts publicly available in GEO (not just normalized values, so
      we can run a real test)
- [x] **n ≥ 8 per group** (powered enough that nonparametric vs. parametric
      have a meaningful difference; cascade rate has a real denominator)
- [x] Original paper open-access in PMC (full Methods readable)
- [x] Published 2019 or later (modern methods baseline)
- [x] Comp-bio relevant (cancer / neurodegeneration / immunology / infection)
- [x] Total samples < 50 (analysis fits in laptop memory; runtime tractable)

**Method:**

- Query GEO via NCBI eutils with filters:
  - `db=gds`
  - organism: human (rat/mouse acceptable as fallback)
  - dataset type: high-throughput sequencing (filter out array data)
  - sample count: 16-50
- Fetch top hits' SOFT files and associated PubMed records
- Inspect the methods sections of candidate papers
- Pick the first one that meets all criteria

**Checkpoints:**

- **A1. GEO record verified.** Evidence: `evidence/A1_geo_record.xml` (full
  GSE record fetched via efetch). Verdict file: `evidence/A1_verdict.md`
  with the parsed GSE ID, sample count, platform, organism — each line
  pointing at the XML field that was the source.

- **A2. PubMed record verified.** Evidence: `evidence/A2_pubmed.xml` (full
  PubMed record fetched via efetch). Verdict file: `evidence/A2_verdict.md`
  with verified PMID, full title, authors, journal, year, DOI — each
  pointed back at its XML field.

- **A3. Open-access status confirmed.** Evidence: `evidence/A3_pmc_check.xml`
  (PMC efetch result if available) and the working PMC URL. Verdict file
  records whether PMC full-text exists, and if so what PMC ID.

- **A4. Original analysis identified.** Evidence: `evidence/A4_methods_quote.md`
  containing the exact quoted sentence(s) from the paper's Methods that
  describe the differential-expression test used, with location (PMC
  paragraph ID or page/section). If the paper used DESeq2 / edgeR / limma
  we can reproduce; if they used something we can't, we may need a
  different dataset.

**STOP at end of Phase A. Present chosen dataset to PI for sign-off
before Phase B starts.**

### Phase B — Data download & sanity checks

**Goal:** get the count matrix and sample sheet into `data/` and verify
they are consistent with the metadata.

**Checkpoints:**

- **B1. Dimensions verified.** n_samples × n_genes match what the GEO
  metadata claimed (parsed in A1). Mismatch → STOP, investigate.

- **B2. Sample-group assignment verified.** Treatment / control labels
  trace to GEO `characteristics_ch1` (or the equivalent metadata field) —
  never inferred from filename or sample title alone.

- **B3. Gene IDs sane.** Standard format identified (Ensembl gene ID /
  Entrez gene ID / HGNC Symbol). Distribution checked: no obvious
  corruption, no >50% missing.

### Phase C — Reproduce the original analysis (baseline)

**Goal:** convince ourselves we have the right data with the right groupings
by reproducing the original paper's reported results.

**Checkpoints:**

- **C1. Top hits match.** Of the original paper's reported top-10 (or top-20)
  differentially expressed genes, **≥ 80% appear in our top-100** when we
  run the same test they used. Less than 80% → STOP and investigate.

- **C2. Effect-size signs match.** No flipped signs on top hits (a
  treatment-up gene should be treatment-up in our recomputation).

- **C3. Discrepancies documented.** Any non-matching genes or numerical
  drift get an explicit note in `replication_diff.md` with hypothesised
  causes.

If C1 fails → STOP, do not proceed. Either we have wrong sample groupings,
wrong normalization, the wrong dataset, or there is something subtle in
the original paper's pipeline we are missing.

### Phase D — Guardian-augmented analysis

**Goal:** run the same data through StickForStats' genomics module with
Guardian enabled, and quantify what changes.

**Procedure:**

- Invoke `backend/core/services/genomics/differential_expression.py` with
  Guardian enabled
- For each gene: Shapiro-Wilk on each group, Levene's across groups
- Failures → cascade to Mann-Whitney U
- Apply Benjamini-Hochberg FDR across all p-values from the cascaded test
  set (whatever each gene ended up using)
- Tabulate: cascade rate, hit list pre/post cascade, hit list differences

**Checkpoints:**

- **D1. Code path verified.** Log emissions confirm Guardian validators
  ran on every gene. We did not silently bypass them.

- **D2. Cascade rate is plausible.** Expected range: **5%–50%** of genes
  cascaded. 0% rate → Guardian is broken. 100% rate → likely a data
  pre-processing problem (wrong scale, log-not-applied, etc.).

- **D3. Hit-list comparison computed.** Output file
  `outputs/guardian_vs_naive.csv` with four columns:
  - **Hit by both:** count
  - **Parametric-only:** count + listed (the "lost" hits if Guardian was
    wrong to cascade them)
  - **Nonparametric-only:** count + listed (the "gained" hits Guardian
    unlocked)
  - **Verdict-flipped at FDR q < 0.05:** count

### Phase E — Write the Case Study 4 manuscript section

**Length target:** 250-350 words + 1 figure + 1 small table (matches the
existing case-study format in the PLOS manuscript).

**Constraints:**

- Every cited paper has a PMID + DOI in the bibliography
- Every number traces to a script line
- Original paper's claims are quoted, with location pinned
- Honest about discrepancies and limitations

**Checkpoints:**

- **E1. Manuscript fact check.** Every numerical claim cross-referenced
  to a line in `code/` output. Walk-through saved as `evidence/E1_factcheck.md`.

- **E2. Citation completeness.** Every reference has its full fetched
  record in `evidence/`. Bibliography draft committed to manuscript.

- **E3. PI review.** Draft sent to PI for review before commit. PI either
  approves or requests changes; both responses logged.

### Phase F — Replication script & MASTER_VERIFICATION

- `paper/replication/case_study_4_genomics.py` (downloads from GEO, recomputes,
  prints summary) — runs to completion in < 5 min on a laptop.
- `paper/replication/case_study_4/data/` — checked-in count matrix and
  sample sheet, OR a download script with checksums.
- Wired into `MASTER_VERIFICATION.py` with returncode-based PASS check.
- `paper/replication/README.md` updated to list it.

### Phase G — Figure for Case Study 4

Candidate visualisations:

1. **Volcano plot with cascade overlay.** Same axes as a standard volcano
   (log2FC vs. -log10 q), but cascaded genes coloured differently. Genes
   that flipped verdict highlighted.
2. **Histogram of normality p-values across all genes**, with the cascade
   threshold (Shapiro p = 0.05) drawn as a vertical line.
3. **Bar chart: hit-list breakdown** — how many genes are hit by both
   methods, parametric-only, nonparametric-only.

Pick the one most informative for our specific dataset's results.

---

## Time estimate

- Phase A: ~3-4 hours (live searching, verification, PI sign-off)
- Phase B: ~1-2 hours
- Phase C: ~3-4 hours (recomputing the original analysis)
- Phase D: ~1-2 hours (the genomics module already exists)
- Phase E: ~2-3 hours (writing + fact-check)
- Phase F: ~1-2 hours (script + integration)
- Phase G: ~1-2 hours (figure)

**Total: ~12-19 hours of focused work, spread over 2-3 days.**

---

## Out of scope (explicit)

To prevent scope creep:

- **No new statistical methods.** We use what already exists in the platform.
- **No new validators.** The eight Guardian validators are fixed.
- **No new benchmarks.** Case Study 4 is one dataset, not a benchmark suite.
- **No re-running Case Studies 1-3.** They are settled.
- **No methodology paper.** This is one case study within a software paper.

---

## Failure modes & decision rules

| If | Then |
|---|---|
| Phase A finds no dataset meeting all criteria | Relax criteria one-by-one, document each relaxation. If still nothing, escalate to PI. |
| Phase B downloaded data ≠ metadata | STOP. File issue at the GEO record. Try alternate dataset. |
| Phase C our recomputation diverges from paper | Document, hypothesise causes, attempt to resolve. If unresolvable: pick a new dataset. |
| Phase D cascade rate is 0% or 100% | STOP. Pre-processing problem. Investigate before claiming any results. |
| Phase E PI rejects the draft | Address feedback; do not push back on integrity-related concerns. |

---

## Companion documents

- `TODO_2026-05-07_case-study-4-rnaseq-guardian.md` — checklist + per-checkpoint status
- `AUDIT_LOG_2026-05-07_case-study-4-rnaseq-guardian.md` — append-only evidence log
- `README.md` — directory map (this file's neighbour)

---

## Amendments

When the plan is amended, append entries below (date-stamped, brief
rationale). The original plan above remains unchanged.

### Amendment 1 — 2026-05-07T13:30 — Dataset switch (Phase A → A-bis)

After PI compared the Phase A pick (GSE219027) and Phase A-bis pick
(GSE271517) side-by-side, the active dataset for the case study was
switched from GSE219027 (osteoarthritis fibroblasts, n=12 vs 12,
clinical/translational) to **GSE271517** (synovial sarcoma, n=46 vs
44 fusion partners, central comp-bio). Phase A artefacts for
GSE219027 are retained as documented fallback. See
`AUDIT_LOG_2026-05-07_…` entry "Phase A → A-bis decision" for full
rationale and consequences.

### Amendment 2 — 2026-05-07T14:30 — Phase C contrast change (Primary vs Metastasis)

After reading the GSE271517 paper's PMC fulltext, two facts emerged
that the planning phase did not have:

1. The paper explicitly states **no biological difference between
   SSX1 and SSX2 fusions** (§2.7, log-rank P = 0.637/0.494 for
   OS/MFS). No SSX1-vs-SSX2 DEG list is reported. Running that
   contrast would yield ~null results.
2. The paper's **Statistics section** describes informal/ad-hoc test
   selection ("t-test for normally distributed variables, Mann-
   Whitney for non-normally distributed") **without describing how
   normality was tested per variable** — exactly the gap Guardian
   addresses. This is the "real-bug-class behavior" angle.

**Phase C contrast changed:** SSX1-vs-SSX2 → **Primary tumor (n=55)
vs Metastasis (n=36)**, sample-level, with patient-level sensitivity
analysis as a robustness check.

**C1 checkpoint redefined:**
- Old: "≥80% of paper's top hits in our top-100"
- New: "≥5 canonical SS marker genes (TLE1, SS18, SSX1, SSX2,
  BCL2) express at biologically-plausible levels in our matrix,
  AND ≥4 of 8 metastasis-associated genes (MKI67, TOP2A, VIM,
  SNAI1, ZEB1, CDH1, KRT8, KRT18) show canonically-expected
  direction (proliferation/EMT up in metastasis; epithelial loss)."

**Phase D narrative sharpened:** Guardian formalizes what the paper
did informally — automatic per-gene Shapiro-Wilk + Levene's, with
cascade to Mann-Whitney for genes that fail normality. Comparison
of hit lists with vs without Guardian quantifies how many genes the
paper's informal procedure could have miscategorised.

**Phase E framing template added** (to be expanded in Phase E):
> "The original authors followed a sound statistical principle:
> choose t-test or Mann-Whitney based on whether the variable is
> normally distributed. But the procedure was informal — they did
> not describe a per-variable normality testing protocol. We
> applied Guardian's per-gene Shapiro-Wilk + Levene's pipeline to
> the same data, found N% of genes flagged for non-normality, and
> the resulting hit list differed from naive t-test by X genes."

See `AUDIT_LOG_2026-05-07_…` entry "Phase C plan revision" for
the verbatim paper quotes that drove this change.
