# Manuscript Verification Module — Design & Work Plan

**Date:** 2026-06-24 (IST) · **Source:** lab meeting (week of 2026-06-15) · **Owner:** Vishal Bharti / PI Debojyoti Chakraborty
**Status:** design agreed in principle; work not started. Supersedes the "statcheck-style consistency checker" framing of Pillar 2.

---

## 0. The steer from the lab meeting (verbatim intent)

The lab/PI position, which this plan adopts:

1. **Internal-consistency flagging is NOT the goal.** Checking only "is this reported
   p-value arithmetically possible?" (statcheck-style) does **not** carry the weight the
   lab/PI care about. It is **repositioned as a complementary, always-available signal —
   the fallback used when raw data are unavailable** — never the headline. (The existing
   consistency code is reused, not discarded.)
2. **The module must verify statistical claims using the authors' RAW DATA**, or
   explicitly return **"insufficient data to verify the claim"** (or similar). The
   "insufficient data" verdict is a first-class output, not a failure.
3. **It must check whether the authors performed assumption checking** for their data
   distributions before running each test (e.g., normality/variance before a t-test/ANOVA)
   — both *did they report it* and, where data exist, *do the assumptions actually hold*.

This is a harder tool than a reporting screen — but it is the one that would interest
editors/publishers and that the lab wants. It is also the honest one (see §2), and it
reuses the Guardian engine we already built.

---

## 1. The two questions, and why we are choosing the hard one

- **Q1 — internal consistency / completeness** (answerable from the PDF alone, statcheck/GRIM territory). *Repositioned as a complementary, always-available signal (the no-raw-data fallback) — existing code reused, not discarded.*
- **Q2 — analytical correctness** ("did they use the right test, with assumptions met, and does the reported result reproduce?"). **Not answerable from a PDF — it needs the raw data, the design, and context.** This is now the product.

**The binding constraint, stated honestly up front:** most papers do **not** share usable
raw data. So Q2 is only *answerable* for the subset with available data; for the rest the
correct output is **INSUFFICIENT_DATA**. The fraction of papers we *cannot* verify is
itself one of the most important results of the 10k study (§7) — a damning, publishable
fact about reproducibility, not a shortcoming of the tool. We must never paper over it
with a consistency score (that is exactly the overclaim that sank Case Study 4's "74 false
positives"; see `docs/SESSION_HANDOFF_2026-06-24.md`).

---

## 2. Per-claim verdict taxonomy (the core output)

For every extracted statistical claim, the engine emits ONE verdict:

| Verdict | Meaning | Needs raw data |
|---|---|---|
| **VERIFIED** | data found + re-analysis reproduces the claimed statistic/p/effect within tolerance, with an appropriate test whose assumptions hold | yes |
| **DISCREPANT** | data found, re-analysis materially disagrees with the claimed numbers | yes |
| **ASSUMPTION_VIOLATED** | data found; the used test's assumptions fail (e.g., parametric test, normality rejected) regardless of whether p matches | yes |
| **ASSUMPTION_UNREPORTED** | a test requiring assumption checks was used, but no check is reported in the text | no (text) |
| **INSUFFICIENT_DATA** | raw/supplementary data unavailable or not linkable to the claim → cannot verify | n/a |
| **UNVERIFIABLE_EXTRACTION** | the claim could not be reliably extracted (low coverage) | n/a |
| *(secondary)* INCONSISTENT_REPORTING | statcheck-style internal inconsistency — a complementary, always-available flag (the no-raw-data fallback), not the headline | no |

A paper's report is the **distribution of these verdicts**, not a single "correct/incorrect" stamp.

---

## 3. Separate module, or part of the platform? — DECISION: **shared engine, separate surface**

**Decision:** keep the verification *engine* in the monorepo (it IS the Guardian core +
claim extraction + assumption auditing — do not fork the stats engine), but expose a
**dedicated, separately-deployable application + CLI + batch pipeline** on top of it.

Rationale:
- **Reuse, don't duplicate:** re-running assumptions and the appropriate test *is*
  `backend/core/guardian` + `core/high_precision_calculator`. Forking would diverge the science.
- **Different user & deployment:** editors/publishers/meta-researchers, batch corpus runs,
  and on-prem handling of embargoed manuscripts + raw data need their own surface and
  security posture — not bolted onto the interactive web app.
- **Credibility & adoption:** a focused standalone "manuscript statistics verifier" is far
  easier to pitch to a journal than "a feature of a big platform."
- **Venue bonus:** a clean *exposed core library* + thin surfaces is exactly what JOSS's
  2025 scope wants, and removes the "it's a sprawling platform" objection that has hurt us.

Concretely: `verification-core` (shared library/service) ← `verifier-app` (web/CLI for one
manuscript) and `verifier-batch` (the 5–10k corpus pipeline).

---

## 4. Target architecture (pipeline)

```
PDF / XML / DOCX
   │
   ▼  T0  EXTRACTION (hybrid)
   ├─ regex (high-precision canonical forms)
   ├─ LLM claim extractor  (existing: statistical_claim_extractor.py)
   ├─ table parser (Camelot / GROBID / JATS)
   ├─ vision-LLM for figure-embedded values + significance stars (bounds only)
   └─ → structured claims with provenance (page/loc) + extraction-confidence + COVERAGE metric
   │
   ▼  DATA INGESTION
   ├─ parse data-availability statement; detect accessions (GEO/SRA/Dryad/Zenodo/OSF/figshare)
   ├─ fetch supplementary files; import (existing data_import_service: SPSS/SAS/Stata/CSV/XLSX)
   └─ link claim → dataset → variables/groups/design  (semi-automated; human-in-the-loop fallback)
   │
   ▼  VERIFICATION (Guardian engine)  — only where data linked
   ├─ reconstruct the comparison (groups/design from text + data)
   ├─ Guardian assumption checks (normality, variance, independence, ...)
   ├─ run the appropriate test; compare recomputed stat/p/effect to the claimed values
   └─ → per-claim verdict (§2)
   │
   ▼  SCORING + CALIBRATED CONFIDENCE  (§6)  →  report (per-claim + paper-level)
```

---

## 5. Scoring (verification-centric, calibrated — NOT consistency-centric)

Per paper, report a **verification profile**, not a single grade:
- **Verifiability rate** = % of claims with sufficient data to even attempt verification.
- Among verifiable: **% VERIFIED / % DISCREPANT / % ASSUMPTION_VIOLATED**.
- **Assumption-reporting completeness** = % of tests with a reported assumption check.
- **Coverage** = % of statistical content successfully extracted (low coverage ⇒ low confidence, never a high score — this closes the false-negative trap).
- **Calibrated confidence:** every score is calibrated against the manual double-coding
  (§7 B3) so "confidence 0.9" means ~90% agreement with a human expert. Where data are
  absent, the headline is "N% of claims unverifiable — data unavailable", *not* a number
  that implies the stats are fine.
- **Explicit "what this does / does NOT certify" box** on every report.

---

## 6. PHASE A — make the module robust (the instrument)

| # | Item | Approach | Deliverable / acceptance |
|---|---|---|---|
| **A0** | Audit current state | Read `statistical_claim_extractor.py`, `consistency_validator.py`, `manuscript/advanced_validators.py`, `manuscript_parser.py`; map to §4 | Gap list + what's reusable |
| **A1** | Extraction overhaul (T0) | regex + LLM + table parser + vision-LLM; emit provenance + per-claim extraction-confidence + paper-level coverage | On a 30-paper dev set, recall ≥ target vs hand-labelled claims; coverage reported, never silently 100% |
| **A2** | Data-ingestion layer | parse data-availability statements; accession detection (GEO/SRA/Dryad/Zenodo/OSF/figshare); supplementary download; import via existing `data_import_service` | Given a paper w/ data, the linked dataset(s) are retrieved + loaded |
| **A3** | Claim→data linking | map claim variables/groups/design to dataset columns; semi-automated with a human-in-the-loop review UI for ambiguous links | % auto-linked measured; ambiguous cases surfaced, not guessed |
| **A4** | Verification engine (T3) | reconstruct comparison; run Guardian assumption checks + appropriate test; compare to claimed values within tolerance; emit §2 verdict | Re-analysis matches authors on a positive-control set; produces all verdict types correctly |
| **A5** | Assumption-audit | (i) text-detect whether authors reported assumption checks; (ii) where data exist, test whether assumptions actually hold (Guardian) | Flags "parametric test used; normality rejected; no check reported" |
| **A6** | Scoring + calibration hooks | implement §5 rubric; store per-claim + paper-level; leave a slot for the calibration constants from B3 | Report renders the verification profile + the certify/not-certify box |
| **A7** | Security + surface | on-prem/Docker mode; in-memory, no-retention; de-identification; **do not send raw data to external LLM APIs** (text-only metadata / local model for sensitive tier); expose `verifier-app` + CLI + batch API | Sensitive-data path never egresses; standalone deploy works |

**Phase-A exit criterion:** end-to-end run on ~30–50 hand-curated papers (mix of
data-available and data-absent) producing correct, calibrated per-claim verdicts.

---

## 7. PHASE B — the 5–10k-paper systematic study

The flagship publication. Two layers: a **broad census** (scale) + a **deep verification**
on the data-available subset (depth), anchored by **manual validation** (credibility).

| # | Item | Detail |
|---|---|---|
| **B0** | Scope & sampling frame | **Corpus = PMC Open-Access subset** (legal full-text mining). **Year window: recommend 2016–2025** (a decade → enables temporal-trend analysis and brackets the rise of data-sharing mandates; option to start 2018 to cut heterogeneity — PI to choose). Stratify by field + journal + year. Target 5–10k for the census. |
| **B1** | Pre-registration (OSF) | hypotheses, metrics, sampling, analysis plan, stopping rule, tolerance thresholds — *before* running, given the integrity focus. |
| **B2** | Batch pipeline | `verifier-batch`: ingest → extract → fetch-data-where-available → verify → score → store. Budget compute/LLM/download cost explicitly. |
| **B3** | **Manual validation (the credibility anchor)** | stratified random subsample (~300–500 papers) **double-coded by 2 humans**; Cohen's κ; measure the tool's **sensitivity / specificity / PPV per verdict type vs the human gold standard.** This is also exactly what the PI demanded ("how do you know it's right?"). |
| **B4** | Census analysis | descriptive meta-research: **% of papers verifiable at all (data available)**, % reporting assumption checks, % VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED among the verifiable, **trends over 2016→2025**, by field/journal. |
| **B5** | Write-up | systematic-review / meta-research format. Likely (honest) headline: *the large majority of published analyses cannot be independently verified because raw data are unavailable; among those that can, assumption checking is seldom reported and sometimes violated.* |
| **B6** | Venue + adoption | meta-research venues (PLOS Biology Meta-Research, BMC Medical Research Methodology, Research Integrity & Peer Review, Royal Society Open Science). Then approach editors/publishers with the **validated** tool (nobody adopts an uncalibrated checker; B3 is the door-opener). |

---

## 8. Honest constraints & risks (design around these, don't hide them)

- **Raw-data availability is the bottleneck.** Realistically a minority of papers share
  usable data; INSUFFICIENT_DATA will dominate. → Make it a headline finding, not a gap.
- **Claim→data→variable linking is genuinely hard** and partly manual. → human-in-the-loop;
  measure and report the auto-link rate; never fabricate a link.
- **Figure/stars extraction is imperfect** → record as bounds; lower coverage; never assert.
- **Compute/time/cost** for 5–10k papers (LLM + downloads + re-analysis) is non-trivial → budget.
- **Legal/ethical:** mine only PMC-OA / open-licensed text; respect supplementary-data
  licenses; embargoed/clinical raw data needs de-identification + on-prem handling.
- **Context-dependence:** "right test in right order", a-priori power, etc. are often
  undecidable from text → emit ASSUMPTION_UNREPORTED / INSUFFICIENT_DATA, not a verdict.

---

## 9. Sequenced roadmap

1. **A0 audit** (small) → know what's reusable.
2. **A1–A5 core** built against a 30–50 paper dev set (the instrument).
3. **A6–A7** scoring + standalone surface + security.
4. **B0–B1** scope + OSF pre-registration.
5. **B3 manual validation** on the subsample (calibrates A6).
6. **B2 + B4** run the census at scale.
7. **B5 write-up → B6 submit + pitch to editors.**

The **software paper** (the verifier tool, a la JOSS/PeerJ/BMC) and the **meta-research
census paper** are two separate publications from this one program — and both are stronger
than the current platform paper.

---

## 10. Open decisions (for PI / next session)

- **Year window:** 2016–2025 (decade, trends) vs 2018–2025 (less heterogeneity)? — *recommend 2016–2025*.
- **Field scope:** all biomedicine, or a focused slice (e.g., genomics/clinical) for the first pass?
- **Greenlight "shared engine, separate surface"** (§3)?
- **Verification tolerance thresholds** (what counts as DISCREPANT) — set in the pre-registration.
- **Manual-coding capacity** — who are the two coders for B3 (the κ second-coder)?
- Relationship to the *current* StickForStats submission: does this become the next paper, or fold into the reframe now?
