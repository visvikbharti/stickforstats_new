# Session Handoff — 2026-06-24 (PLOS desk-reject → venue strategy + count-GLM adjudication)

> **Dated snapshot — superseded.** This records what was believed on the date in its title.
> For the current state of the project, start at [`README.md`](README.md) (the undated index),
> then [`STATUS_2026-07-14.md`](STATUS_2026-07-14.md) and [`TODO_2026-07-14.md`](TODO_2026-07-14.md).
> **Do not trust a "Still open" section in a dated document without re-checking it.**

**Timestamp:** 2026-06-24 14:54 IST
**Branch:** `docs/plos-compbio-submission`
**Authors:** Vishal Bharti, Debojyoti Chakraborty (CSIR-IGIB)
**Preprint (LIVE):** *StickForStats: automated statistical assumption validation for reproducible computational biology* — bioRxiv **doi 10.64898/2026.06.15.732278**, posted 2026-06-19, Bioinformatics.

> **Purpose of this doc:** preserve full context for the next session. What happened,
> the venue plan, the new analysis + its findings, every file touched (with paths), the
> ordered to-do list, and the decisions waiting on the PI. There is also a placeholder
> (§H) for the last lab-meeting discussion the user will brief separately.

---

## TL;DR

1. **PLOS Computational Biology DESK-REJECTED us 2026-06-24** (3rd scope/novelty rejection: JSS → JOSS → PLOS CB). NOT a quality problem — a venue-fit problem. bioRxiv preprint is live regardless.
2. **Venue plan (researched, verified vs 2026 guidelines):** move to a soundness-not-novelty venue — **PLOS ONE** (via transfer) or **PeerJ Life & Environment** top picks; GigaByte / BMC Bioinformatics / MethodsX backups. Avoid any novelty-gated venue. **User will pick with PI.**
3. **"Do it right" work DONE:** added the count-GLM reference arm (DESeq2/edgeR/limma-voom) to Case Study 4 — the thing the editor's "combining existing methods" instinct (manuscript L205) would have homed in on. It **validated Group A**, **refuted the Group B "false positives" claim** (an overclaim now corrected), and kept the core thesis stronger and honest.
4. **A full revision package is drafted** (`paper/plos_compbio/CASE_STUDY_4_REVISION_2026-06-24.md`) — drop-in before/after text for all 6 edit sites. `manuscript.md` NOT yet edited (pending PI sign-off on the Group B correction, which is live on bioRxiv).

---

## A. Publication status

| Venue | Outcome | Reason |
|---|---|---|
| Journal of Statistical Software | Desk-reject | "does not fit aims and scope" (wants novel methods) |
| JOSS | Reject | likely: 2025 scope scrutinizes web "platforms" lacking an exposed core library (confirm from email) |
| **PLOS Comp Biol** | **Desk-reject 2026-06-24** | section editor Maxwell W. Libbrecht, no external review: *"primarily concerns an implementation combining existing methods, it does not fit the journal's scope"* (EM id PCOMPBIOL-D-26-01466; earlier submission id was PCOMPBIOL-S-26-01887) |

**Common axis = novelty/significance.** Fix = submit where the gate is technical soundness, and stop using novelty-inviting language.

---

## B. Venue strategy (verified against 2026 author guidelines)

| Venue | Desk-reject risk | APC (USD) | Indexing | Why |
|---|---|---|---|---|
| **PLOS ONE** (via transfer) | Low | ~$2,477 (India waivers) | PubMed + WoS-SCIE | Judges technical soundness only — explicitly NOT novelty/impact. Already PLOS-formatted → lowest effort. Transfer may preserve submission date. |
| **PeerJ Life & Environment** | Low | **$1,195** | PubMed + WoS-SCIE | Named "Bioinformatics Software Tool" article type — integration tools in-scope by design. Cheapest + fastest (~30-40 d) of the safe picks. |
| **GigaByte** (Technical Release) | Lowest | **$535** | PubMed/PMC + ESCI | Guidelines explicitly say novelty not required. BUT ESCI-only (no IF) + reviewers must download/build/RUN the tool → need a live instance/container. |
| **BMC Bioinformatics** (Software) | Low | $3,090 | PubMed + WoS-SCIE (IF ~3) | Highest IF of the safe set; "sound-science" policy. Precedent: StatiCAL (2024, GUI wrapper of R stats). |
| **MethodsX** (Elsevier) | Low | ~$1,150 | PubMed | Sibling of SoftwareX, IS PubMed-indexed, published BioMedStatX (2025) — near-twin of Guardian. Strong dark-horse. |
| ❌ **AVOID** | — | — | — | PLOS CB resubmit, Cell Reports Methods, iScience, Oxford Bioinformatics, JSS, R Journal — all re-trigger the novelty gate → likely 4th scope reject. |

**Operational notes:**
- **PLOS ONE transfer is NOT automatic** for a section-editor scope desk-reject — must email the PLOS CB office (or reply to the decision letter) and *request* transfer of the manuscript to PLOS ONE; if granted it reuses the file package and may preserve the date. If declined, a fresh PLOS ONE submission is low-effort.
- **JOSS** = free secondary only if rebuilt installable-library-first; not the primary play.

**Reframe (applies to any venue):** kill "paradigm shift / significant advance / world platform" language from abstract/intro/discussion; lead with rigor/validation/reproducibility; promote the genome-scale RNA-seq result; foreground soundness assets (~1,500 tests, 10-16-digit SciPy/R agreement, Docker, MIT); cut the SPSS/R/jamovi/JASP feature-matrix, i18n, mobile/desktop (read as "product").

Full venue analysis (9-agent research, with sources) is in memory file `session-2026-06-24-plos-reject-countglm.md` and the earlier workflow output.

---

## C. Core findings — Case Study 4 count-GLM adjudication (the new analysis)

**Question answered:** does Guardian's rank-based cascade move the DE gene list TOWARD the count-GLM standard, or away? (Manuscript L205 conceded the field uses DESeq2/edgeR but never showed this.)

**Setup:** same 27,221 genes, Primary (n=55) vs Metastasis (n=36), GSE271517. Three arms:
- **Naive** = per-gene Student t on log2(CPM+1), BH → **1,006** sig
- **Guardian** = Shapiro+Levene → cascade to Mann-Whitney (90.55%), BH → **1,411** sig
- **Count-GLM standard** = DESeq2 **1,782**, edgeR **2,506**, limma-voom **964**; consensus(≥2/3) **1,584**

**Three findings (all double-implemented Python + R native `fisher.test`; adversarially verified, verdict PROCEED):**

1. **Group A (479 "rescues") — REAL, but right-size it.** Count-concordant DEG enrichment is 9.78× vs ALL naive-discarded genes, but only **~1.8× (Fisher p=8.9e-10)** vs genes with *equally marginal* naive evidence (naive q∈[0.05,0.10), which holds 80% of Group A). Report the difficulty-matched figure — the 10× alone overstates it ~3-6× and a methods referee will catch it. Use "count-concordant," not "real/gold-standard."

2. **Group B (74 "false positives rejected") — REFUTED OVERCLAIM.** The count models call a MAJORITY DE: **DESeq2 45/74 = 60.8%, edgeR 54/74 = 73.0%**, and Group B carries the **largest** count-model effect sizes of any category (median |DESeq2 log2FC| = 0.85; 41.9% ≥1). DESeq2's NB model has its own Cook's-distance outlier handling and still recovers them as large effects → "outlier-dominated false positives" is wrong. This claim is corrected at 5 sites + bioRxiv abstract.

3. **Guardian does NOT "beat" / "move toward" DESeq2 overall.** Whole-list agreement (MCC) is tied: naive 0.53 / Guardian 0.51 (vs consensus). Honest framing: the 90.55% cascade is an automatic genome-wide red flag that the parametric default is invalid → recommend a count model. Guardian = violation detector + distribution-free safety net + recall gain (0.44→0.50), **complementary to, not a substitute for, DESeq2/edgeR**.

DESeq2 DE-rate by category: hit-by-both 67.9%, Group A 35.5%, Group B 60.8%, neither 3.6%. pyDESeq2 vs canonical R DESeq2 Jaccard 0.97 (faithful port).

The honest write-up is `paper/replication/case_study_4/outputs/threeway/E_interpretation.md` (v2, post-review).

---

## D. Files created / changed (paths)

**New analysis code** — `paper/replication/case_study_4/code/threeway/`
- `phase_e_countglm.R` — R DESeq2 + edgeR + limma-voom on filtered raw counts
- `phase_e_threeway.py` — pure-numpy adjudication (Fisher/Spearman/κ/MCC; NO scipy/sklearn — see env gotcha)
- `phase_e_difficulty_matched.py` — difficulty-matched Group A + Group B effect-size evidence
- `phase_e_figure_and_verify.R` — independent R cross-check of the Python stats + renders the figure

**New outputs** — `paper/replication/case_study_4/outputs/threeway/`
- `E_interpretation.md` — **the honest read (v2)**; read this first next session
- `E_threeway_summary.md`, `E_threeway_metrics.json`, `E_difficulty_matched.json` — numbers
- `E_gene_level_merged.csv` — per-gene table backing every claim (recompute anything from this)
- `deseq2_results.csv`, `edger_results.csv`, `limmavoom_results.csv` — count-GLM outputs
- `fig_threeway.png` — the 3-panel figure (proposed Fig 5C / Fig 6)
- `sample_meta.csv` — sample metadata used by R
- `filtered_raw_counts.csv` — **gitignored** (7.5 MB; regenerable from the committed `.gz` via the export step in the recon)

**Revision package (NOT yet applied to manuscript):**
- `paper/plos_compbio/CASE_STUDY_4_REVISION_2026-06-24.md` — drop-in before/after for all 6 sites + Table 7 + Fig 5C reference + replication-script assertions + bioRxiv note

**Memory (outside repo, in ~/.claude/.../memory/):**
- `session-2026-06-24-plos-reject-countglm.md` + `MEMORY.md` index line (marked READ FIRST)

**Pre-existing files referenced (unchanged):**
- `backend/core/services/genomics/differential_expression.py` — the Guardian DE service (8-validator cascade)
- `paper/replication/case_study_4/code/phase_c_deseq2_analysis.py`, `phase_d_guardian_analysis.py`
- `paper/replication/case_study_4/outputs/{C_full_deseq2_results,D_guardian_vs_naive,D_naive_ttest_results,D_guardian_results}.csv`
- `paper/plos_compbio/manuscript.md` — Case Study 4 at L188-220; abstract L16; Fig 5 captions L207/L368; Table 6 L218

**Environment gotcha:** local anaconda Python 3.9 has **numpy 2.0.2 vs scipy/sklearn/matplotlib ABI break** — scipy/sklearn/matplotlib hard-fail on import. Use pure numpy/pandas for Python stats, and **R for figures + cross-checks** (R 4.4.1 healthy; DESeq2/edgeR/limma/apeglm installed).

---

## E. How to reproduce the analysis

```bash
cd paper/replication/case_study_4
# 1. export filtered raw counts for R (regenerates the gitignored input)
PYTHONWARNINGS=ignore python3 - <<'PY'
import gzip, pandas as pd
with gzip.open("data/GSE271517_Sample_Counts.csv.gz","rt") as f: c=pd.read_csv(f,index_col=0)
cf=c.loc[(c>=10).sum(1)>=3]; cf.index.name="ensembl_gene_id"
m=pd.read_csv("data/GSE271517_sample_assignment.csv").set_index("sample_title").loc[c.columns]
cf.to_csv("outputs/threeway/filtered_raw_counts.csv")
m[["tumor_type","patient_id","fusion_gene"]].to_csv("outputs/threeway/sample_meta.csv")
PY
# 2. count-GLM arm (R)
Rscript code/threeway/phase_e_countglm.R
# 3. adjudication (pure-numpy)
PYTHONWARNINGS=ignore python3 code/threeway/phase_e_threeway.py
PYTHONWARNINGS=ignore python3 code/threeway/phase_e_difficulty_matched.py
# 4. independent R cross-check + figure
Rscript code/threeway/phase_e_figure_and_verify.R
```

---

## F. TO-DO — in order (next session)

**Gate 0 — decisions (PI):**
1. ⚑ Approve the **Group B correction** (it changes a live bioRxiv claim) + a **bioRxiv v2**.
2. ⚑ Approve adding **Table 7 + the count-GLM figure**.
3. ⚑ Approve the **"complementary to count models"** framing (no claim that Guardian beats DESeq2).
4. ⚑ **Pick the target venue** (PLOS ONE vs PeerJ vs GigaByte vs BMC Bioinformatics) with PI.

**Gate 1 — manuscript edits (after Gate 0):**
5. Apply SITE 1-6 edits from `CASE_STUDY_4_REVISION_2026-06-24.md` to `paper/plos_compbio/manuscript.md`.
6. Add **Table 7**; fold `fig_threeway.png` into the figures (new Fig 5 panel C, or a standalone Fig 6).
7. Fix minor: L196 "Welch t-test" → "Student's t-test (equal variance)" (matches the code).
8. Wire the count-GLM arm into the replication: extend `case_study_4_genomics.py` (or a new `case_study_4_threeway` runner) + `MASTER_VERIFICATION.py` with the new assertions (DESeq2 1782, edgeR 2506, voom 964; Group A 170/479 + ~1.8× matched; Group B 45/74 DESeq2 / 54/74 edgeR; MCC ~0.53/0.51; pyDESeq2 Jaccard ≥0.95).

**Gate 2 — venue reframe + submit:**
9. Venue-independent retone (kill hype language; promote genomics result; foreground soundness assets; trim product material).
10. Format to the chosen venue's template.
11. Post **bioRxiv v2** with the corrected abstract (SITE 1 text).
12. Request PLOS ONE transfer (if that's the pick) OR submit fresh to the chosen venue.

**Optional / housekeeping:**
13. Confirm the exact JOSS rejection reason from the rejection email (decides whether a library-first JOSS resubmission stays on the table).

---

## G. Decisions pending (summary)

- Group B correction + bioRxiv v2 — **PI**
- Table 7 + figure + complementarity framing — **PI**
- Venue choice — **user + PI**
- Everything in Gate 1/2 is ready to execute on my side the moment Gate 0 clears.

---

## H. Last lab-meeting discussion — manuscript verification module (captured)

The lab meeting (week of 2026-06-15) focused entirely on **Pillar 2 (manuscript review
module)**. Full design + work plan: **`docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md`**.

**Key steer (repositions the module):**
- **Internal-consistency flagging (statcheck-style) is NOT the goal** — repositioned as a
  complementary, always-available signal (the no-raw-data fallback); existing code reused,
  not discarded; not the product headline.
- The module must **verify claims using the authors' RAW DATA**, or explicitly return
  **"insufficient data to verify"** (first-class verdict).
- It must **check whether authors performed assumption checking** (reported it, and where
  data exist, whether assumptions actually hold) — this is where the Guardian engine plugs in.

**Lab's seven points** (all addressed in the plan): (1) regex misses figures/plots/stars →
hybrid extraction + vision-LLM; (2) can't verify correctness from a PDF without raw data →
the whole point, hence the raw-data tier + INSUFFICIENT_DATA verdict; (3) regex corpus
coverage gaps both directions → coverage metric, low-coverage ⇒ low confidence; (4) separate,
robust tool with a confidence score → **decision: shared engine, separate surface**, with a
verification-centric calibrated score; (5) data security → on-prem/Docker, no-retention, no
raw data to external LLMs; (6) the **5–10k-paper systematic study** → the flagship
meta-research paper (converges with venue strategy: a measurement is novel by definition);
(+) right-test-in-right-order / power → mostly undecidable from text → emit
ASSUMPTION_UNREPORTED / INSUFFICIENT_DATA, not a verdict.

**Two phases:** Phase A = make the module robust (extraction → data ingestion → Guardian
re-analysis → calibrated scoring → standalone surface). Phase B = the 5–10k study
(recommend years **2016–2025**, PMC-OA corpus, OSF pre-registration, manual double-coding
for κ + sensitivity/specificity, census + deep verification, then meta-research venue +
editor/publisher pitch).

**Convergence:** this is the same direction as the venue strategy (§B, Reframe #1 =
meta-research measurement) and the Case Study 4 lesson (scope claims to what's verifiable).
The manuscript module becomes the *instrument*; the meta-research census is the headline paper.

**Open decisions for PI** (see plan §10): year window (2016–2025 vs 2018–2025); field scope;
greenlight "shared engine, separate surface"; DISCREPANT tolerance; who are the two manual
coders; whether this becomes the *next* paper or folds into the current reframe.
