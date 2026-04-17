# OSF Pre-Registration — Retraction Backtest of StickForStats SQS

**Template.** OSF Standard Pre-Registration (condensed).
**Authoritative protocol.** [`paper/retraction_backtest/PROTOCOL.md`](./PROTOCOL.md) at commit `3da1c65` in `visvikbharti/stickforstats_new`. This OSF submission is a field-shaped summary; in any conflict the repository protocol controls.
**Status.** Draft — ready for upload to OSF by a study author. When uploaded, the OSF-assigned URL and DOI should be recorded back into this file and into `PROTOCOL.md`.
**Conflict of interest.** The authors are the developers of StickForStats. This is a self-validation study of our own instrument. Procedural safeguards are two-coder labeling (§9.2 of the protocol), blinded scoring (a runtime assertion in `code/sqs_client.py` rejects any metadata outside a whitelist), pre-committed AUC thresholds (§11), and a publish-regardless pledge (§13).

---

## 1. Study Information

### 1.1 Title
Retraction Backtest of the StickForStats Statistical Quality Score (SQS): A Preregistered Case-Control Study of Whether SQS Discriminates Papers Retracted for Statistical Reasons from Matched Controls.

### 1.2 Authors
- **Vishal Bharti** (corresponding) — CSIR-Institute of Genomics and Integrative Biology, New Delhi.
- **Debojyoti Chakraborty** — CSIR-IGIB & AcSIR, Ghaziabad.

### 1.3 Description
StickForStats computes a 0–100 Statistical Quality Score (SQS) from 45 regex rules across six categories (effect sizes, assumption transparency, sample and power, statistical precision, reproducibility indicators, guideline compliance). This study tests whether SQS, applied to the **original full text** of peer-reviewed biomedical papers, discriminates papers later retracted for statistical/data-analysis reasons from journal- and year-matched, discipline-matched non-retracted controls. The primary endpoint is AUC of SQS as a classifier, with a 2 000-replicate matched-cluster bootstrap 95 % CI.

### 1.4 Hypotheses

**H1 (directional, primary):** Among PMC-OA-indexed papers published 2010–2023, retracted-for-statistics papers have **lower** SQS than matched controls, with AUC ≥ 0.70.

**H0:** AUC = 0.50; SQS does not discriminate retracted-for-stats papers from controls.

---

## 2. Design Plan

### 2.1 Study type
Observational, retrospective **case-control**, matched 1:2.

### 2.2 Blinding
- **Scoring is blinded to retraction status.** A runtime assertion in `code/sqs_client.py` enforces that the dataframe passed to `SQSScorer` carries only a metadata whitelist (`pub_year`, `journal`, `issn`, `mesh_top5`); any attempt to pass the case/control label raises `BlindingViolation`.
- **Coders are blinded to SQS score.** Both reason-code coders label retraction notices without access to SQS output.

### 2.3 Study design
- **Cases:** peer-reviewed papers published 2010–2023, indexed in the PMC Open Access Subset, with a retraction notice whose reasons include at least one statistical/data-analysis issue per the codebook in PROTOCOL §9.1.
- **Controls (2 per case):** matched exactly on journal (ISSN) and on year of publication (±1 year), with at least one shared top-level MeSH major topic, and never appearing on the retraction list.
- **Matching distance tie-break order:** exact ISSN → exact year (then ±1) → maximise MeSH-major-topic Jaccard → minimise publication-date gap → PRNG seed 20260417.

### 2.4 Randomization
None (observational); bootstrap and matching random tie-breaks use a fixed PRNG seed (20260417).

---

## 3. Sampling Plan

### 3.1 Existing data
**Yes.** The study uses:
- Retraction Watch Database (Crossref-hosted GitLab; free since Crossref acquisition 2023-09-12).
- PMC Open Access Subset full text (NCBI; Europe PMC mirror as primary; NCBI OA bulk tarball as fallback).
- Europe PMC REST for matched-control search; NCBI E-utilities for MeSH / journal metadata.

All data are publicly available **prior to the pre-registration timestamp**. Only papers under CC0, CC-BY, CC-BY-SA, CC-BY-ND, or US-government public-domain licenses enter the corpus (CC-BY-NC is excluded).

### 3.2 Data collection procedures
Fully scripted and reproducible via `paper/retraction_backtest/code/harvest.py`; every response is cached under `sha256(url).json.gz` and verified by `--self-check`. Retries on 429/5xx via tenacity exponential backoff. Every successful row is verified by cross-checking the embedded JATS `<article-id pub-id-type="doi">` against the manifest DOI before acceptance — see the case_0019 substitution documented in CRITICAL_REVIEW.md.

### 3.3 Sample size

| Target                | n_cases | n_controls | total |
|-----------------------|---------|------------|-------|
| Primary (preferred)   | 200     | 400        | 600   |
| Minimum viable        | 100     | 200        | 300   |
| Exploratory-only cap  | <100    | —          | —     |

**Below 100 cases, the study is labeled exploratory; primary-endpoint success claims are forbidden regardless of AUC.** The 2026-04-17 pilot at n_cases = 19 fell below this floor and its null result (AUC = 0.573, 95 % CI 0.405–0.717) was correctly flagged UNDERPOWERED.

### 3.4 Sample-size rationale
Hanley & McNeil (1982) parametric power with θ₀ = 0.50, θ₁ = 0.70, α = 0.025 one-sided, power = 0.80, 2:1 matching gives n_cases = 24. Simulation (code: `power_sim.py`) shows the *lower* 95 % CI bound ≥ 0.60 constraint requires n_cases = 100 for 88 % success probability and n_cases = 200 for 99 %. Inflation for 10–30 % parser-gate attrition, 10–20 % matching attrition, and 5–15 % labeling attrition yields the target of 200.

### 3.5 Stopping rule
Harvest runs until `n_cases` eligible cases are accepted or until the candidate pool is exhausted. No adaptive stopping on observed SQS.

---

## 4. Variables

### 4.1 Manipulated
None.

### 4.2 Measured (primary)
**Statistical Quality Score (SQS), 0–100 continuous.** Computed by `SQSScorer(field=...)` in `backend/core/sqs_scoring.py` at the frozen commit SHA recorded in the manifest per row. Field is resolved from MeSH top term via the frozen map in `code/field_mapping.py` (`medicine` → biomedical, `biology` → basic-science, `general` otherwise).

### 4.3 Measured (covariates)
- 6 per-category SQS subscores.
- 45-dimensional binary per-rule hit vector.
- Publication year, journal ISSN, top-5 MeSH major descriptors.
- Retraction date, retraction reason codes (verbatim + coder labels), days-to-retraction.
- License, parse-quality flags.

### 4.4 Indices
None; the 45-rule vector is the raw measurement. Category subscores are pre-computed aggregations defined in `backend/core/sqs_scoring.py` at the frozen SHA.

---

## 5. Analysis Plan

### 5.1 Statistical models
- **Primary:** AUC via Mann-Whitney U (DeLong-equivalent); 95 % CI via 2 000-replicate **matched-cluster** bootstrap (cluster = 1 case + 2 controls); two-sided *p*-value by CI inversion.
- **Secondary (pre-specified):**
  1. Per-rule Fisher exact (one-sided), BH-FDR = 0.05 across 45 rules.
  2. Per-category AUC with DeLong 95 % CI.
  3. Operating point at 90 % specificity: report sensitivity.
  4. Calibration: reliability diagram + Brier score.
  5. Cox regression of time-to-retraction on SQS (HR < 1.25 per 10-point decrement is pre-declared not interesting).
  6. Label-boundary sensitivity: rerun with strict / lenient stat-cause definitions.

### 5.2 Transformations
None on SQS (raw 0–100 score is the classifier).

### 5.3 Inference criteria (decision rule, §11 of PROTOCOL)

| Outcome                              | Claim                                                           |
|--------------------------------------|-----------------------------------------------------------------|
| AUC ≥ 0.70 **and** lower CI ≥ 0.60   | **Positive** — SQS discriminates; recommend as reviewer pre-check |
| 0.60 ≤ AUC < 0.70                    | **Partial** — discrimination below clinical floor               |
| AUC < 0.60                           | **Null** — no useful discrimination                             |

**Corner cases:**
- Point estimate ≥ 0.70 but lower CI < 0.60 ⇒ **Partial** (not Positive). Intentional type-II preference.
- Negative-control rerun (non-stat retractions vs controls) AUC > 0.60 ⇒ positive primary result must carry a prominent "picks up generic suspect-paper signal" caveat.
- Pre-2015 vs post-2015 subgroup AUC differ by > 0.15 ⇒ the title and abstract must state the heterogeneity and the conservative subgroup's result becomes the headline claim.

### 5.4 Data exclusion
- Parser-quality gate (PROTOCOL §7.4): title + abstract ≥ 100 words + methods ≥ 100 words + results ≥ 100 words + total ≥ 1 500 words + at least {methods, results} section types.
- Non-English (language detection on full text).
- License outside {CC0, CC-BY, CC-BY-SA, CC-BY-ND, US-government PD}.
- Full-text unavailable in PMC OA.
- Duplicate / un-retracted / non-original-research.

### 5.5 Missing data
- Primary: complete-case.
- Sensitivity: multiple imputation (m = 10, chained equations, Rubin's rules) for matching covariates only.
- Full-text unavailability is treated as exclusion, not missing data; reported separately in the attrition CONSORT flow.

### 5.6 Exploratory analyses
Explicitly disallowed as post-hoc endpoints. The pre-specified sensitivity analyses in §10.3 of the protocol (discipline stratification, temporal pre/post 2015, label-boundary, matching ratio, negative-control) are the only deviations from the primary pipeline permitted.

---

## 6. Label reliability (per PROTOCOL §9.2)

Two coders independently apply the §9.1 codebook (verbatim Retraction Watch reason codes + English keyword phrases) to each retraction notice. Cohen's κ (1960) across the two coders is the primary reliability metric:

- **κ ≥ 0.80** — accept labels, proceed.
- **0.60 ≤ κ < 0.80** — proceed with adjudication: disagreements are reconciled by a third coder; disagreement rate is reported.
- **κ < 0.60** — halt primary analysis, rewrite the codebook, disclose publicly.

The second-coder handoff package lives at `paper/retraction_backtest/second_coder/` (stratified sample, codebook, κ-computation script, README). Handoff artifacts will be committed alongside the second coder's submitted labels under `second_coder/returned_labels.csv`; κ is computed before any scoring begins.

---

## 7. Artifacts released publicly (PROTOCOL §13)

On primary-endpoint completion, irrespective of direction:
1. **Manifest** (DOI, PMCID, case/control, cluster ID, discipline, year, journal, reason codes, SQS, per-category subscores, per-rule hit flags) — CC0 on this repo.
2. **All code** — MIT on this repo.
3. **This pre-registration** — OSF + git-timestamped protocol file.
4. **Attrition CONSORT-style flow** — `reports/attrition_consort.csv`.
5. **Second-coder labels + κ** — `second_coder/`.
6. **Pilot report** retained as historical record — `reports/PILOT_REPORT.md`.

---

## 8. Relevant papers
- Hanley JA, McNeil BJ (1982). *Radiology* 143:29–36.
- Cohen J (1960). *Educ Psychol Meas* 20:37–46.
- Nuijten MB, et al. (2016). *Behav Res Methods* 48:1205–1226.
- Fang FC, Steen RG, Casadevall A (2012). *PNAS* 109:17028–17033.
- Brainard J, You J (2018). *Science* doi:10.1126/science.aav8384.
- Mandrekar JN (2010). *J Thorac Oncol* 5:1315–1316.
- Retraction Watch Database — Oransky I, Marcus A, Crossref (2023–).

Full reference list is in PROTOCOL.md.

---

## 9. Pre-registration attestation

By submitting this registration to OSF, the authors attest that at the timestamp of submission:

- No SQS score for any planned case or control paper has been observed by the authors **except** the pilot's 57 rows (19 cases + 38 controls) reported in `reports/PILOT_REPORT.md`, which was preregistered separately via git commit `3da1c65` and declared UNDERPOWERED per this protocol's own §8.4.
- The 45-rule SQS definition and the analysis code are frozen to the commit SHA recorded in this registration. Any post-registration change to scoring or analysis will be filed as a formal **registration amendment** with timestamped explanation, or the study re-registered.
- The second coder has not received the primary coder's labels at the time of this registration.
- The authors commit to publishing the primary-endpoint result regardless of direction (preprint + peer-reviewed submission).

**Source-of-truth commit for this registration.** `3da1c65` (pilot + protocol) plus subsequent pre-scoring engineering commits documented in `code/HARVEST_NOTES.md`. The specific commit SHA at OSF upload time should be recorded in the OSF "additional files" section.
