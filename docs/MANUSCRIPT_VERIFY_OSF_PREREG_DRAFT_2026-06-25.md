# OSF Pre-Registration (DRAFT) — Verifiability of Statistical Claims in the Published Biomedical Literature

**Status:** DRAFT for PI review — *not yet filed on OSF.*
**Date:** 2026-06-25 IST
**Authors:** Vishal Bharti; Debojyoti Chakraborty (CSIR-IGIB) — *[PI DECISION: confirm author list + any additional co-authors / second coders below]*
**Instrument:** StickForStats manuscript-verification module (verification-core: `backend/core/manuscript/verify_pipeline.py` + Guardian/cascade re-analysis engine). Phase A build log: `docs/MANUSCRIPT_MODULE_TODO_2026-06-24.md`.
**Companion plan:** `docs/MANUSCRIPT_MODULE_PLAN_2026-06-24.md` (this pre-reg operationalises its Phase B).

> **Purpose.** This is the pre-registration for the flagship **meta-research census** ("Phase B"):
> a systematic measurement of how many statistical claims in the published biomedical
> literature can actually be *verified* — recomputed and assumption-audited from the authors'
> own data — versus how many can only be checked for internal consistency or cannot be checked
> at all. The headline quantity is the **verifiability rate** and the distribution of per-claim
> verdicts. A measurement of this kind is novel by construction, which also aligns with the
> venue strategy (soundness/measurement venues rather than novelty-gated ones).
>
> Every binding methodological choice the PI must make is flagged inline as **[PI DECISION]**
> and collated in §11. Nothing here is filed until those are resolved and the PI signs off.

---

## 1. Study Information

### 1.1 Title
*Verifiability of statistical claims in the published biomedical literature: a systematic, raw-data re-analysis census.*

### 1.2 Background & rationale
Reproducibility audits of the literature have so far been dominated by **internal-consistency
checking** — recomputing a *p*-value from the reported test statistic and degrees of freedom
(the statcheck paradigm; Nuijten et al., 2016 reported ~50% of psychology papers contain at
least one inconsistency, and ~13% a decision-changing one). Internal consistency is necessary
but not sufficient: it cannot tell whether the *right* test was run, whether its assumptions
held, or whether the reported numbers reproduce from the actual data.

The decisive question — *does the claim reproduce from the authors' raw data, with an
appropriate test whose assumptions hold?* — has not been measured at scale because it requires
(a) locating the data, (b) linking each claim to the right variables, and (c) re-running the
test. Our Phase-A pilot quantified the binding constraint directly:

- **Data-availability pilot (80-paper biomedical/genomics PMC-OA sample):** **32%** carry a
  real data-repository accession; **44%** have any verifiable-candidate data statement; **19%**
  say "available on request"; **21%** give no statement. GEO is the single most common
  repository (32 papers). A psychology baseline (20 papers) was lower: 10% / 35%.
- **GEO ingestion funnel (12 GEO accessions):** only **2 (17%)** yielded a directly-ingestible
  processed data matrix without bespoke extraction (others were `_RAW.tar`-only, had no
  supplementary directory, or were corrupt) — a *lower bound* before raw-archive extraction.

**Implication, pre-registered as the framing:** for most papers the verdict will be
`INSUFFICIENT_DATA`. We treat that not as a failure of the instrument but as **the primary
finding** — "what fraction of the published record is even checkable against its own data" is
the measurement. This pre-registration commits us to reporting that denominator honestly.

### 1.3 Research questions
Primarily **descriptive/measurement**, with a small number of **pre-specified confirmatory
comparisons** (§7). The exploratory remainder is labelled as such (§8).

- **RQ1 (primary, descriptive).** Among extracted statistical claims in the sampled corpus,
  what fraction are *verifiable* (data located + linkable + re-runnable), and what is the
  distribution of per-claim verdicts (`VERIFIED / DISCREPANT / ASSUMPTION_VIOLATED /
  ASSUMPTION_UNREPORTED / INSUFFICIENT_DATA / UNVERIFIABLE_EXTRACTION`)?
- **RQ2 (primary, descriptive).** Of claims we *can* verify, what fraction reproduce
  (`VERIFIED`) vs materially disagree (`DISCREPANT`) vs were produced by an assumption-violating
  test (`ASSUMPTION_VIOLATED`)?
- **RQ3 (descriptive).** What is the internal-consistency (statcheck-style) inconsistency rate
  over the *same* corpus (the always-available tier), for comparability with prior literature?
- **RQ4 (confirmatory, see §7).** Does data availability / verifiability differ by **field**,
  **publication year**, and **data-sharing-policy stringency** of the journal?
- **RQ5 (descriptive).** Where data exist, how often did authors *report* checking assumptions,
  and how often do assumptions actually hold under re-analysis?

---

## 2. Design Plan

### 2.1 Study type
Observational, retrospective **measurement study** on an existing corpus of published articles
(no manipulation; no human subjects; public documents and public data only).

### 2.2 Blinding
The pipeline is automated and deterministic given a fixed code version. The **manual
double-coding validation** (§6.3) WILL be blinded: coders score papers without access to the
tool's verdict, and without knowledge of each other's codes, until both are recorded.

### 2.3 Two-tier instrument (pre-specified)
1. **Consistency tier (always available, no raw data).** Extract claims → recompute *p* from
   reported statistic + df → flag internal inconsistencies. Reuses `consistency_core` (pure,
   tested) via `consistency_adapter`. Emits the **secondary** signal `INCONSISTENT_REPORTING`.
   *This tier is explicitly NOT the headline; it is the comparability baseline (RQ3).*
2. **Verification tier (raw data).** For papers with locatable, linkable data: re-run the
   authors' stated test on their data via `cascade_engine.execute_with_cascade(max_cascades=0)`
   (no test substitution), audit assumptions with Guardian, and assign one of the six primary
   verdicts via the pre-registered decision table (§5.3).

---

## 3. Sampling Plan

### 3.1 Existing data / registration timing
The corpus consists of already-published articles; **no analysis of the verification outcomes
has been run on the full corpus** at registration time. Only the Phase-A pilots described in
§1.2 (≤100 papers) have been examined, to size feasibility. We will register before running the
full census.

### 3.2 Data source & sampling frame
- **Corpus:** PubMed Central **Open Access subset** (machine-readable JATS XML + supplementary
  files; redistribution-permissive licences only).
- **Year window:** **[PI DECISION] 2016–2025 vs 2018–2025.** (Recommendation: 2016–2025 — a
  full decade, brackets the major data-sharing-policy changes, and lets RQ4's year trend span
  pre/post mandate.)
- **Field scope:** **[PI DECISION]** — options: (a) genomics/transcriptomics-led (highest
  data-availability per the pilot, best raw-data tier yield); (b) broad biomedical; (c)
  multi-field with a psychology comparison arm (matches prior statcheck literature). Recommendation:
  (b) broad biomedical with pre-registered field strata, so RQ4 is answerable and the genomics
  subset is large enough for the raw-data tier.

### 3.3 Inclusion / exclusion (pre-specified)
- **Include:** research articles with a parseable Results section containing ≥1 extractable
  statistical test claim.
- **Exclude:** reviews, editorials, errata, protocols, and papers with no extractable
  test claim (recorded as a separate count, not as a verdict). Papers whose XML fails to parse
  are recorded as a parse-failure stratum (not silently dropped).

### 3.4 Sample size & stopping rule
- **Target N:** **[PI DECISION] 5,000–10,000 papers** (plan range). Recommendation: 10,000,
  random-sampled within the year × field strata, to give precise stratum-level estimates for
  RQ4.
- **Precision rationale (descriptive primary outcomes).** A verifiability-rate estimate *p̂*
  has half-width ≤ 1.96·√(0.25/N). At the **paper** level: N=5,000 ⇒ ±1.4%; N=10,000 ⇒ ±1.0%.
  Claims are nested within papers, so per-claim CIs WILL use cluster-robust (paper-clustered)
  or mixed-model standard errors (§5.4) — the naive binomial half-widths above are the paper-level
  floor, not the per-claim precision.
- **Stopping rule:** fixed-N (the full random sample is processed); no data-dependent stopping.
  If compute or fetch-throughput forces a cap below target, the realised N and the exact draw
  (random seed, frozen sampling frame snapshot date) are reported, and any shortfall is reported
  as a coverage limitation — **no silent truncation** (a hard rule carried from Phase A).

### 3.5 Data handling / security (no-egress)
All re-analysis runs **on-prem** (Docker; the verification surface fetches nothing for the
REST path and the batch census uses an explicit, logged fetch allow-list of public repositories
only). **No raw data and no manuscript text are sent to any external LLM or third-party
service.** Vision/figure extraction, if used, runs against a **local** model only. The corpus
XML + fetched data are cached on local/offline storage (Phase-A cache currently on the external
drive `/Volumes/My_Passport/stickforstats_corpus/`); no participant or private data are involved.

---

## 4. Variables

### 4.1 Unit of analysis
Two nested units: the **statistical claim** (primary) and the **paper** (clustering unit + RQ4
stratum). Both denominators are reported explicitly.

### 4.2 Measured variables (per claim)
- Extracted fields: test type, test statistic, df, reported *p*, reported effect size, reported CI.
- **Extraction coverage** (claims-with-p / candidate statistical mentions) and the per-claim
  `UNVERIFIABLE_EXTRACTION` gate.
- **Data-availability class** (open accession / in-paper supplement / on-request / statement-only
  / none) and repository (GEO/SRA/Dryad/Zenodo/figshare/OSF/…).
- **Linkability** (linked / ambiguous / unlinkable) and whether linking was auto vs human-confirmed.
- **Recomputed** test statistic, *p*, effect size (re-analysis tier).
- **Assumption audit:** assumptions reported in text (yes/no); assumptions hold under Guardian
  (yes/no/violation list), with the T14 independence gate applied.
- **Primary verdict** (one of six) + secondary `INCONSISTENT_REPORTING` flag.

### 4.3 Paper-level / stratum variables
Field, publication year, journal data-sharing-policy stringency (coded ordinal — **[PI DECISION]**
on the coding scheme / source, e.g. TOP Factor or a hand-coded policy tier), parse quality.

---

## 5. Analysis Plan

### 5.1 Extraction & coverage
Claims extracted with the regex extractor (`claim_extractor.py`, post the 2026-06-24 capital-`P`
fix). Coverage is computed on the **full** claim set (recall-honest); verification is run only on
genuine test claims (`is_test_claim`, precision). The frozen extractor version + commit hash are
recorded with the run. *(Note for transparency: the manuscript's earlier Table-8 statcheck
benchmark used the pre-fix extractor and understated recall; the re-benchmarked figures —
recall 97.7%, precision 93.2%, F1 95.4% on the 20-paper statcheck-overlap set — supersede it.)*

### 5.2 Re-analysis (verification tier)
Each linked claim is re-run via `execute_with_cascade(intended_test, max_cascades=0)` so the
**authors' own test** is reproduced (never auto-substituted). The Guardian assumption report is
read **separately**. The engine's own confidence score is recorded only as
`uncalibrated_engine_confidence` and is **NOT** reported as verification confidence (calibration
is a validation output, §6.4).

### 5.3 Verdict decision rule (pre-registered, frozen)
Per-claim verdict assigned by the pure decision table (`verdict_decision.assign_verdict`) with
this precedence:
1. extraction unreliable → `UNVERIFIABLE_EXTRACTION`;
2. else no resolvable test OR no linkable data → `INSUFFICIENT_DATA`;
3. else if the used test's required assumptions fail → `ASSUMPTION_VIOLATED` **regardless of
   whether the number reproduces** (an inappropriate test is the finding);
4. else recomputed vs claimed within tolerance → `VERIFIED`; otherwise → `DISCREPANT`.
`ASSUMPTION_UNREPORTED` is assigned (text-decidable, no data needed) when a test requiring
assumption checks is used but no check is reported.

- **DISCREPANT tolerance [PI DECISION — frozen here before the run].** Recommended, mirroring
  statcheck and rounding semantics: a statistic/*p* matches if the recomputed value lies within
  the ±0.5-last-reported-digit rounding interval **OR** within a relative tolerance of
  **[PI DECISION] 1%**; AND the significance decision at α agrees. A claim is `DISCREPANT` only
  if it fails the match AND (for *p*) the significance decision flips OR the relative gap exceeds
  **[PI DECISION] 10%**. These constants are frozen at registration and reported verbatim.

### 5.4 Inference for the descriptive primaries
Rates (verifiability rate, each verdict proportion, inconsistency rate) reported with
**paper-clustered 95% CIs** (cluster bootstrap or GLMM with a random paper intercept). Stratum
estimates (field × year) reported with the same clustering. No null-hypothesis test is attached
to the descriptive primaries; they are estimates with intervals.

### 5.5 Missing data / exclusions
- Papers with no extractable claim → counted separately (denominator transparency), excluded
  from claim-level rates.
- Parse failures → reported as a stratum; sensitivity analysis with/without them.
- `INSUFFICIENT_DATA` and `UNVERIFIABLE_EXTRACTION` are **outcomes, not exclusions** — they
  remain in the claim denominator (this is the whole point of RQ1).

---

## 6. Validation & Reliability (the credibility core)

### 6.1 Hand-labelled gold set
A random **[PI DECISION] n = 100–200 paper** subsample (stratified by field × data-availability
class) is manually coded as ground truth for: (i) the set of true statistical claims present
(extractor recall/precision, absolute — not just vs statcheck); (ii) data-availability class;
(iii) the correct per-claim verdict where data exist.

### 6.2 Coders
**[PI DECISION] — two independent coders required.** Candidates / assignment to be named by the
PI. Coders are blinded to the tool's output and to each other until both codings are logged.
A pre-registered codebook + adjudication protocol (third adjudicator for disagreements) will be
finalised before coding begins.

### 6.3 Inter-rater reliability
Cohen's **κ** between the two human coders (and, separately, between each human and the tool) for
the verdict assignment and the data-availability class. Pre-registered acceptance: human–human
κ ≥ **[PI DECISION] 0.6** before the gold set is used to estimate tool accuracy.

### 6.4 Tool accuracy & calibration
Against the human gold standard: **sensitivity/specificity** of (a) claim extraction and (b)
each verdict; a confusion matrix over the six verdicts. **Calibration:** reliability curve of the
engine confidence vs observed correctness; only after this do we populate the reserved
`calibrated_confidence` field — until then it stays `None` (enforced in code). The DISCREPANT
tolerance constants (§5.3) are **not** tuned on the gold set after the fact (they are frozen
pre-registration); any post-hoc sensitivity to tolerance is reported as exploratory.

---

## 7. Confirmatory Hypotheses (pre-specified, RQ4)

Tested only on the realised sample, with multiplicity control (Benjamini–Hochberg across the
confirmatory family, q = 0.05) and paper-clustered inference:

- **H1.** Data availability (open-accession rate) is **higher in later years** than earlier years
  within the window (monotone year trend > 0).
- **H2.** Data availability differs **by field**, with genomics/transcriptomics highest
  (consistent with the pilot).
- **H3.** Open-accession rate is **higher** for journals with more stringent data-sharing policies.
- **H4 (where data exist).** Among re-runnable claims, the `ASSUMPTION_VIOLATED` rate is **> 0**
  and is reported with its CI (effect-existence + magnitude, not a strawman null).

All four are confirmatory; everything else is exploratory.

---

## 8. Exploratory Analyses (labelled)
- Verdict distribution by test type (t / ANOVA / correlation / χ² / regression).
- Relationship between `INCONSISTENT_REPORTING` (consistency tier) and `DISCREPANT` (raw-data
  tier) on the subset where both are computable — does internal consistency predict
  reproducibility?
- Repository-level ingestion yield (extends the GEO funnel to Dryad/Zenodo/figshare/OSF).
- Text-mining of assumption-reporting language vs whether assumptions actually hold.

---

## 9. Threats to Validity (pre-stated)
1. **Extraction false-negatives** (regex misses figure/table/star-encoded stats) bias the claim
   denominator → mitigated by the coverage metric + gold-set absolute recall; reported, not hidden.
2. **Linkability ceiling** (auto claim→data linking is imperfect) → measured auto-link rate;
   human-in-the-loop confirmation on the gold set; never fabricate a link (enforced: unlinkable
   → `INSUFFICIENT_DATA`).
3. **Engine misuse** silently corrupting verdicts → `max_cascades=0` + the T14 independence gate
   + the frozen decision table; positive/negative control suite must pass before each run.
4. **OA-subset selection** (OA papers may share data more) → reported as a generalisability
   limit; the estimate is *of the OA biomedical literature*, stated as such.
5. **INSUFFICIENT_DATA dominance** is expected and is the finding, not a defect.

---

## 10. Timeline, Code, and Materials
- **Code:** frozen commit hash of the verification-core + engine recorded with the run; the exact
  extractor/decision-table/tolerance constants archived. Repository + Docker image tagged.
- **Sampling frame snapshot:** PMC-OA file-list snapshot date + random seed archived.
- **Outputs:** per-claim verdict table, paper-level profiles, the gold-set codings + κ, all
  released (data + code) on acceptance.
- **Timeline:** **[PI DECISION]** — pilot-to-full-run start date; gold-set coding window; target
  submission. (Engine is built; the gating items are the PI decisions in §11 + coder recruitment.)

---

## 11. Open decisions for the PI (collated — must resolve before filing)

| # | Decision | Options / recommendation |
|---|----------|--------------------------|
| D1 | **Year window** | 2016–2025 *(rec.)* vs 2018–2025 |
| D2 | **Field scope** | genomics-led / **broad biomedical w/ field strata** *(rec.)* / multi-field + psychology arm |
| D3 | **Target N** | 5,000 vs **10,000** *(rec.)* |
| D4 | **Two manual coders** | who; + third adjudicator; codebook owner |
| D5 | **DISCREPANT tolerance constants** | rel-tol 1% + decision-flip + 10% gap *(rec.)* — frozen here |
| D6 | **κ acceptance threshold** | ≥ 0.6 *(rec.)* |
| D7 | **Gold-set size** | 100–200 papers *(rec. 150)*, stratified |
| D8 | **Journal-policy coding source** | TOP Factor vs hand-coded tier |
| D9 | **Is this the *next* paper** | standalone meta-research flagship vs folded into the current reframe *(rec.: standalone — strongest novelty/measurement play, per venue strategy)* |
| D10 | **OSF template** | generic Prereg vs "Preregistration for Existing Data" *(rec.: Existing Data variant, since the corpus pre-exists)* |

---

*Prepared by the Phase-A build. This draft is internally consistent with the measured pilot
numbers (§1.2) and the frozen Phase-A engine. Once §11 is resolved, this converts directly into
the OSF form fields with no further methodological choices left open.*
