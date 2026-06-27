# OSF Pre-Registration — Internal-consistency verifiability of the open-access biomedical literature

**Template:** OSF "Preregistration for Existing Data" (the article corpus pre-exists; the confirmatory
sample is a new draw from public articles). **(D10 resolved.)**
**Status:** FINAL — ready to file. Resolve the two coder names (§6.2) and file on OSF before the
confirmatory run; nothing methodological remains open.
**Authors:** Vishal Bharti; Debojyoti Chakraborty (CSIR-IGIB). **(D9 resolved: this is a standalone
meta-research paper.)**
**Instrument (frozen):** the StickForStats verification engine — `backend/core/manuscript/`
(`jats_parser.py` → `claim_extractor.py` → `consistency_core.py`/`consistency_adapter.py`) at the commit
recorded with the run. **No external LLM or third-party service is used; extraction is deterministic regex +
SciPy recompute, on-prem.**
**Relationship to prior work:** this pre-registers the **confirmatory** version of the descriptive census in
`paper/census_paper/manuscript.md`. The descriptive census (day-clustered sample, transparent FP-adjudication)
is the prior; this study replicates it on an **equal-probability** frame and calibrates it against a
**human-double-coded gold standard**. A separate, broader pre-registration for the *raw-data* verification
census (does a claim reproduce from the authors' data?) is `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`
— that is a different, future paper and is out of scope here.

---

## 1. Study information

### 1.1 Research questions (descriptive measurement + a small confirmatory family)
- **RQ1 (primary, descriptive).** What fraction of biomedical open-access papers report at least one
  in-text, machine-**recomputable** NHST statistic (statistic + df + point p)? (The "checkable rate".)
- **RQ2 (primary, descriptive).** Among recomputable claims, what is the internal-**inconsistency** rate
  (reported vs recomputed p incompatible) and the decision-changing rate (the discrepancy crosses α)?
- **RQ3 (primary, descriptive).** After transparent false-positive adjudication, what is the
  **genuine** inconsistency rate (excluding one-sided-p and mis-extraction artifacts)?
- **RQ4 (confirmatory, §7).** Does the checkable rate (RQ1) differ by **field** and by **publication year**?
- **RQ5 (descriptive).** Inconsistency rate by statistic type (t / F / r / z / χ²).

### 1.2 Hypotheses
Confirmatory hypotheses are stated in §7. The primaries (RQ1–RQ3, RQ5) are **estimates with intervals**, not
null-hypothesis tests.

---

## 2. Design plan
Observational, retrospective **measurement study** over public articles; no manipulation, no human subjects.
The pipeline is automated and deterministic at a fixed code version. The **human double-coding** (§6) is
blinded: coders score claims without the tool's verdict and without each other's codes until both are logged.

---

## 3. Sampling plan

### 3.1 Registration timing (existing data)
The article corpus is already published. The confirmatory analysis has **not** been run at registration; only
the descriptive census (a day-clustered sample) and the Phase-A pilots have been examined. We register before
the confirmatory draw + run.

### 3.2 Source & frame
- **Corpus:** PubMed Central **Open-Access subset** (JATS XML; redistribution-permissive licences).
- **Frame (D-sampling resolved):** an **equal-probability** sample of the population below, drawn from the PMC
  OA enumeration via the NCBI OA web service / file enumeration at a frozen snapshot date (replacing the
  descriptive census's day-clustered draw; an inverse-probability-weighting check on the descriptive corpus
  already showed the design did not bias the rate by >0.6 pp, and this frame removes the issue by construction).
- **Year window (D1 resolved): 2018–2025.** Rationale: matches the descriptive census window so the
  confirmatory study is a direct replication+validation of it; the equal-probability frame and the human κ are
  the upgrades, not a moved goalpost.
- **Field scope (D2 resolved): broad biomedical**, the quantitative-design query population (randomized /
  cohort / case-control / regression / ANOVA / correlation / t-test), with **field strata** recorded per paper
  (from journal/MeSH) for RQ4.

### 3.3 Inclusion / exclusion (pre-specified)
- **Include:** articles with a parseable `<body>` containing ≥1 extractable test claim.
- **Exclude (counted separately, never silently dropped):** items with no extractable test claim; XML that
  fails to parse (recorded as a parse-failure stratum).
- `NOT-RECOMPUTABLE` and the no-checkable-claim count are **outcomes, not exclusions** — they remain in the
  RQ1 denominator (that is the point of RQ1).

### 3.4 Sample size & stopping (D3 resolved: N = 10,000)
- **Target N = 10,000 papers**, equal-probability within the frame. Precision (paper level): a proportion p̂
  has half-width ≤ 1.96·√(0.25/N) ≈ **±1.0%** at N=10,000. Per-claim rates use **paper-clustered** 95% CIs
  (cluster bootstrap or a GLMM with a random paper intercept), since claims nest within papers.
- **Stopping rule:** fixed-N; the full random sample is processed; **no data-dependent stopping**. If fetch
  throughput forces a cap, the realised N, the random seed, and the frozen frame snapshot date are reported and
  any shortfall is a stated coverage limitation — **no silent truncation**.

### 3.5 No-egress
The census runs on-prem; the only network calls are to public NCBI/PMC endpoints on a logged allow-list. **No
manuscript text is sent to any external LLM.** Corpus + ledger are cached on local/offline storage.

---

## 4. Variables (per claim)
Test type; test statistic; df; reported p (and p-comparison: `=`/`<`/`>`); reported effect size; recomputed
two-tailed p; **checkable** (statistic+df+point-p present) yes/no; **inconsistent** yes/no; **decision-changing**
yes/no; **adjudication category** (genuine / one-tailed-FP / p-bound-review / mis-extraction-FP). Paper-level:
field stratum, publication year, parse quality.

---

## 5. Analysis plan (frozen)

### 5.1 Extraction & checkability
Claims extracted with the frozen regex extractor (`claim_extractor.py`, post the 2026-06-26 scoped-p-attachment
fix); the commit hash is recorded with the run. A claim is **checkable** iff it carries the statistic, the df,
and a reported point p.

### 5.2 Recompute & inconsistency rule (D5 resolved — frozen here, verbatim)
For each checkable claim the two-tailed p is recomputed with SciPy (t → `t.sf(|t|,df)·2`; F → `f.sf`; χ² →
`chi2.sf`; z → `norm.sf·2`; r → t then `t.sf·2`). A claim is **inconsistent** iff the recomputed p lies
**outside the ±0.5-last-reported-digit rounding interval** of the reported p (rounding- and inequality-aware,
exactly as statcheck). A claim is **decision-changing** iff, in addition, the reported and recomputed p fall on
**opposite sides of α = 0.05**. These rules are frozen at registration and are not tuned afterward.

### 5.3 False-positive adjudication rule (D5 resolved — frozen, automated + human-validated)
Every flagged claim is adjudicated by frozen rules into exactly one category: **mis-extraction-FP** (the claim's
own text contains no p — mis-paired); **one-tailed-FP** (recomputed two-tailed p ≈ 2× reported ⇒ a one-sided
report our recompute is two-tailed only); **p-bound-review** (p reported as an inequality — ambiguous); or
**genuine** (a recomputable statistic and a point p in the same text, two-tailed, beyond tolerance). The
**genuine** rate (RQ3) is the headline; the human gold standard (§6) calibrates it.

### 5.4 Inference
RQ1–RQ3 and RQ5 reported as proportions with **paper-clustered 95% CIs**. Stratum estimates (field × year) use
the same clustering.

### 5.5 Missing data
Parse failures → reported stratum, sensitivity with/without. No-checkable-claim papers stay in the RQ1
denominator.

---

## 6. Validation & reliability (the credibility core)

### 6.1 Gold set (D7 resolved: 150 flagged claims + a 50-paper extraction check)
- **Adjudication gold set:** a **stratified random sample of 150** of the flagged (inconsistent) claims,
  stratified by statistic type and severity, double-coded into the four §5.3 categories. This validates the
  adjudication that turns the raw rate into the genuine rate (RQ3) — the headline-bearing step.
- **Extraction gold set (secondary):** **50 randomly sampled papers** fully read by a coder to record the true
  set of in-text recomputable claims, giving the extractor's **absolute** recall/precision (complementing the
  statcheck head-to-head: recall 97.7% / precision 98.1%).

### 6.2 Coders (D4 — fill before filing)
Two independent coders: **[CODER 1 — name]** and **[CODER 2 — name]**; third adjudicator for disagreements:
**[ADJUDICATOR — name]**. Codebook owner: **[name]**. The frozen codebook is `paper/census_paper/CODEBOOK.md`.
Coders are blinded to the tool's category and to each other until both codings are logged
(`build_gold_set.py` exports a blinded sheet; the tool's verdicts are held in a separate key file).

### 6.3 Inter-rater reliability (D6 resolved: κ ≥ 0.6)
Cohen's **κ** between the two human coders on the adjudication category. **Pre-registered acceptance: human–human
κ ≥ 0.6** before the gold set is used to estimate tool accuracy. κ is computed by
`paper/census_paper/compute_kappa.py`.

### 6.4 Tool accuracy
Against the human consensus (post-adjudication): **sensitivity, specificity, and PPV** of the tool's
"genuine-inconsistent" flag, plus a confusion matrix over the four categories. The genuine-inconsistency rate
(RQ3) is then reported with the gold-standard-calibrated interval. Tolerance constants (§5.2) are **not** tuned
on the gold set; any post-hoc tolerance sensitivity is labelled exploratory.

---

## 7. Confirmatory hypotheses (RQ4; pre-specified)
Tested on the realised sample with Benjamini–Hochberg control across the confirmatory family (q = 0.05) and
paper-clustered inference:
- **H1.** The checkable rate (RQ1) **differs by field** (omnibus across the pre-registered field strata).
- **H2.** The checkable rate shows a **monotone year trend** across 2018–2025 (test for trend ≠ 0).

All else (RQ5; consistency-by-type; relationships among categories) is **exploratory**, labelled as such.

---

## 8. Threats to validity (pre-stated)
1. **Extraction false-negatives** (figure/table/star-encoded stats unread) bias the RQ1 denominator down →
   reported via the coverage metric + the 50-paper absolute-recall gold set; the checkable rate is stated as a
   **lower bound**.
2. **Two-tailed-only recompute** drives the residual one-sided false positives → quantified by the adjudication
   and the human gold set; the genuine rate excludes them.
3. **OA-subset selection** → the estimate is "of the OA biomedical literature", stated as such (generalisability
   limit).
4. **Regex precision** → the 2026-06-26 mis-extraction fix (157 → 0) is in the frozen version; the gold set
   bounds residual error.

---

## 9. Code, materials, timeline
- **Code:** frozen commit hash of the engine + the exact extractor/recompute/adjudication constants archived;
  repo + Docker tag recorded.
- **Frame:** equal-probability PMC OA enumeration snapshot date + random seed archived.
- **Outputs released on acceptance:** per-claim ledger, flagged-claim table, the gold-set codings + κ + the
  accuracy table — deposited on the **same OSF project as this registration** (cite the OSF DOI).
- **Timeline:** file this registration → draw the equal-probability sample → run the frozen pipeline → run the
  two-coder gold-set study (target completion **[DATE]**) → report. The engine and the descriptive prior are
  built; the gating items are the coder names (§6.2) and the coding window.

---

## 10. Resolved decisions (was §11 of the draft)
| # | Decision | **Resolved** |
|---|---|---|
| D1 | Year window | **2018–2025** (match the descriptive prior) |
| D2 | Field scope | **Broad biomedical**, quantitative-design query, field strata recorded |
| D3 | Target N | **10,000** papers, equal-probability frame |
| D4 | Coders | two + adjudicator — **names to fill in §6.2 before filing** |
| D5 | Flagging + adjudication rules | **frozen** in §5.2–5.3 (rounding-aware inconsistency; 4-category adjudication) |
| D6 | κ acceptance | **≥ 0.6** |
| D7 | Gold set | **150 flagged claims** (adjudication) + **50 papers** (extraction recall) |
| D8 | Journal-policy coding | **out of scope** for this consistency census (it belonged to the raw-data RQ4); not used here |
| D9 | Standalone? | **Yes — standalone meta-research paper** |
| D10 | OSF template | **Preregistration for Existing Data** |

*Once §6.2 coder names are filled, this converts directly into the OSF form with no methodological choice left open.*
