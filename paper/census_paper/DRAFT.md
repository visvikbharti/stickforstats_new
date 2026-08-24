# DRAFT — Second paper: a meta-research census of statistical verifiability in the open-access biomedical literature

> **Status of this document.** Working draft / manuscript skeleton. The *descriptive* census and all
> robustness analyses described below are **DONE** and committed under
> `paper/replication/verification/` (reports + figures + scripts). The *confirmatory* census
> (pre-registered hypotheses + human double-coding) is **NOT YET DONE** — it is gated on an OSF
> pre-registration and a Cohen's-kappa double-coding calibration (see **Gates before submission**).
> Every number in the Abstract/Results below is traceable to a committed report file; do not edit a
> number here without updating its source report.

---

## 1. Candidate titles

1. **How verifiable is the biomedical literature? A census of in-text statistical reporting and internal consistency across 10,103 open-access papers.**
2. **Most reported statistics cannot be checked, and most that can are consistent: a JATS-XML census of 10,103 PMC open-access biomedical articles.**
3. **Recomputable but rare: an automated internal-consistency census of NHST reporting in open-access biomedicine (2018–2025).**

*(Working preference: Title 1 — it foregrounds both headlines and the question framing.)*

---

## 2. Abstract (DRAFT, ~180 words)

Independent re-computation of reported statistics (the statcheck paradigm) has exposed widespread
internal inconsistencies in psychology, but the verifiability of the biomedical literature at scale is
largely uncharted. We assembled a census of 10,103 PMC Open-Access biomedical articles (2018–2025)
matching a classical quantitative-design query, ingested their JATS-XML full text, and extracted every
in-text null-hypothesis significance-testing (NHST) statistic with a regex pipeline, recomputing each
two-tailed p-value statcheck-style. Two findings dominate. First, **verifiability is rare**: only ~3.5%
(341/10,101) of papers report even one in-text, machine-recomputable test statistic; most reported
statistics live in tables or figures and cannot be recovered from running text. Second, among the 3,005
recomputable claims, the raw internal-inconsistency rate is **11.8%** (1.7% decision-changing), but
false-positive adjudication shows ~77% of flags are likely-true and ~14% are clear false positives
(chiefly one-sided p-values), yielding a genuine inconsistency rate of **9.1%, 95% CI [7.0%, 11.5%]**
(paper-clustered bootstrap, the inference the pre-registration specifies). The estimate is
robust: inverse-probability weighting moves it ≤0.6 pp, and an independent general-OA frame gives 5.6%.
Against statcheck on a labelled set the engine reaches 97.7% recall / 98.1% precision. A pre-registered
confirmatory census with human double-coding is planned.

---

## 3. Author summary (one paragraph)

When scientists report a statistical test — for example "t(38) = 2.1, p = 0.04" — the p-value can be
recomputed from the test statistic and degrees of freedom, and checked against what the authors wrote.
Tools like statcheck have used this idea to show that a surprisingly large share of psychology papers
contain numbers that do not add up. We asked a simpler, prior question for biomedicine: *how often is the
literature even checkable this way?* Scanning the full text of 10,103 open-access biomedical papers, we
found that only about one in thirty reports a statistic in a form a computer can re-derive from the text
— the rest are buried in tables and figures. Among the statistics we could check, most were internally
consistent; after manually separating genuine errors from artifacts of automated checking (such as
one-sided tests), roughly one in eleven were truly inconsistent — with an interval running from about
7% to 11.5% once we account for claims clustering within papers. The result is reassuring about
arithmetic consistency but sobering about transparency: the biomedical literature is, for the most part,
not written in a way that lets anyone verify its statistics automatically.

---

## 4. Section-by-section outline

### 4.1 Introduction — *the gap: how verifiable is the literature?*
- The reproducibility/credibility crisis framing; statistics as the load-bearing claims of a paper.
- The **statcheck** paradigm (Nuijten et al. 2016): in psychology, ~50% of papers had ≥1 internal
  inconsistency and ~13% a decision-changing ("gross") error. Establish this as the reference point and
  the method we extend.
- **The unstated precondition.** statcheck-style checking only works on statistics reported *in text* in
  a recomputable form (test statistic + df + p). Before asking "how *correct* is the literature?" we must
  ask "how much of it is even *checkable*?" — a question rarely quantified at biomedical scale.
- **This paper's contribution.** A descriptive census over 10,103 PMC OA biomedical papers answering
  two questions: (Q1) what fraction report an in-text recomputable NHST statistic? (Q2) among those, what
  fraction are internally inconsistent — raw, and after false-positive adjudication and robustness checks?
- Position relative to prior work: psychology (statcheck), p-value distributions / p-curve, GRIM/SPRITE
  consistency checks, data-availability audits. Our novelty = *biomedical scope + a verifiability
  (denominator) headline + transparent FP-adjudication + design-based robustness*, not a new checking
  algorithm.
- State plainly: this is the **descriptive** arm; the **confirmatory** arm is pre-registered separately.

### 4.2 Methods — *the census pipeline*
- **Corpus & population.** PMC Open-Access subset; query = open-access AND 2018:2025 AND a
  quantitative-design term (randomized / cohort / case-control / regression / ANOVA / correlation /
  t-test). Explicitly NOT a literature-wide population — a *design-query, in-text-recomputable* subset.
- **Sampling design.** Day-clustered enumeration: random publication days, full per-day pool, up to a
  per-day cap (18) — uniform over *days*, not over *papers*; per-paper day volume recorded to enable IPW.
  State the attrition: 10,200 requested → 10,103 fetched with a `<body>` → 10,101 with a readable body
  (80 dropped, no body). Source: `census_jats.py`, `fetch_stats.json`.
- **JATS-XML ingestion.** Parse full text; flatten running text + table-cell text (figures not read).
  Article-type tally retained (8,032 research-article, 1,124 review, etc.).
- **Extraction.** Regex extractor (~APA/biomed NHST grammar) → structured claims (statistic, df, reported
  p, operator). 13,703 test claims extracted; 3,005 of them CHECKABLE (recomputable). Note the
  2026-06-26 extractor fix (scoped p-attachment window, df-arity guard, generic-stat guards, p=1 parse,
  `;`/fractional-df handling) that removed a mis-extraction artifact — see Results/robustness.
- **Recompute (statcheck-style).** `consistency_core` recompute_p, **two-tailed only**; inequality
  p-values (`p < .05`) and the p = .05 boundary handled per documented rules. A claim is "inconsistent"
  if the reported p and recomputed p fall on opposite sides of significance bands per the consistency
  rules; "decision-changing" (gross) if the significance verdict flips at α = .05.
- **False-positive adjudication.** Transparent rule-based triage of all 355 flags into TRUE_LIKELY /
  REVIEW_P_BOUND / FP_ONE_TAILED / FP_MISEXTRACTION (`adjudicate_inconsistencies.py`). Report the
  categories rather than only the raw rate.
- **Robustness — same population (IPW).** Inverse-probability weighting by recorded per-paper day volume
  to recover the equal-probability estimand from the same corpus (`census_ipw.py`).
- **Robustness — independent frame.** A separate sampling path (NCBI `oa.fcgi` OA web service), general
  OA, no design-query enrichment, to test generalizability (`oa_pilot.py`).
- **Engine validation.** Head-to-head vs **statcheck** on a labelled set (`eval_vs_statcheck.py`):
  recall 97.7%, precision 98.1% — establishes the extractor/recompute engine introduces no material
  regression vs the reference tool.
- **Reproducibility.** Point to `paper/replication/verification/REPRODUCTION.md` (end-to-end guide),
  `workflow.dot` / `WORKFLOW.svg` (pipeline diagram), and the per-paper JSONL record.

### 4.3 Results — *the two headlines*
- **Headline 1 — verifiability is rare.** 3.5% (341/10,101) of papers report ≥1 in-text recomputable
  NHST statistic. Most statistics are in tables/figures → this 3.5% is a *lower bound* on reportable
  statistics and the key transparency finding.
  - Figure: corpus funnel → `figures/fig1_corpus_funnel.{png,svg}`.
  - Figure: article-type composition → `figures/fig7_article_types.{png,svg}`.
- **Headline 2 — among checkable claims, genuine inconsistency is around 9%, CI [7.0%, 11.5%].**
  - NOTE: this headline is a REPLICATION, not a discovery — Damen 2023 (PMID 36470577) measured
    statistical discrepancies across 163,129 RCTs. Headline 1 (the verifiability denominator) is
    the finding that survives as new. Present Headline 2 as a replication in biomedicine-wide
    PMC OA from JATS.
  - Raw: 11.8% (355/3,005) inconsistent; 1.7% (52) decision-changing.
    Figure: `figures/fig2_headline_outcome.{png,svg}`; reported-vs-recomputed scatter
    `figures/fig4_reported_vs_recomputed_p.{png,svg}`; by-statistic-type
    `figures/fig5_by_statistic_type.{png,svg}`.
  - FP-adjudicated: TRUE_LIKELY 274 (77%), REVIEW_P_BOUND 33, FP_ONE_TAILED 48 (clear FP),
    FP_MISEXTRACTION 0 → clear-FP 13.5%, likely-true 77% → **9.1% of checkable claims,
    95% CI [7.0%, 11.5%]**, resampling papers not claims (the top 10 papers hold 29.9% of all
    flags, so a claim-level interval would be far too narrow).
    Figure: `figures/fig3_fp_validation.{png,svg}`.
- **Robustness.**
  - IPW (Table — `CENSUS_IPW_REPORT_2026-08-24.md`): recomputable-paper rate 3.38%→3.39%; inconsistent
    11.81%→11.32%; decision-changing 1.73%→1.46% — all shifts ≤0.5 pp; day-clustering did not bias.
    Figure: `figures/fig6_rate_robustness.{png,svg}`.
  - Independent OA frame (Table — `CENSUS_OA_PILOT_REPORT_2026-06-26.md`): 5.6% inconsistent (6/108,
    5 papers; directional, wide CI), recomputable-paper rate 2.2% — lands in the FP-validated true range
    and below the raw rate.
- **Extractor-fix transparency.** The 2026-06-26 fix eliminated FP_MISEXTRACTION (157→0); raw rate fell
  14.5%→11.1% and decision-changing 4.2%→1.7% (as scored by the p-reader in use at the time; the
  corrected reader puts the post-fix raw rate at 11.8%). Report this openly as a methods-validity result, not a
  silent correction.
- **Engine vs statcheck.** Recall 97.7% / precision 98.1% on the labelled set.

*Tables to assemble:* T1 corpus/attrition; T2 extraction & checkability funnel; T3 inconsistency rates
(raw / FP-adjudicated / IPW / independent frame); T4 FP-adjudication categories; T5 engine-vs-statcheck.
*Figures already rendered:* fig1–fig7 in `paper/replication/verification/figures/`.

### 4.4 Discussion
- **Two complementary messages.** Reassuring on arithmetic (genuine inconsistency ~9%, CI [7.0%, 11.5%], lower
  than psychology's ~13% gross-error figure under a like-for-like reading) but sobering on transparency
  (only ~3.5% checkable from text). The denominator is the story.
- **Why so little is checkable.** Biomedical reporting conventions push statistics into tables/figures;
  effect sizes + CIs (not test-stat + df + p) increasingly preferred; reporting heterogeneity across
  fields. Implication: automated post-publication verification has limited reach unless reporting norms
  change (machine-readable stats, structured results).
- **Comparison to Nuijten et al. 2016** — qualitative only: different population, different reporting
  norms, in-text-recomputable subset; do not over-equate the rates.
- **Implications.** For journals/checklists: encourage in-text or structured reporting of recomputable
  statistics. For meta-research: verifiability is a measurable property of a literature, worth tracking
  longitudinally. For tool builders: precision-first adjudication matters because raw flag rates
  overstate problems (157→0 artifact is the cautionary tale).
- **Where this sits.** Descriptive, hypothesis-generating; the confirmatory + human-calibrated estimate
  is the pre-registered follow-up.

### 4.5 Limitations
- **Descriptive, not confirmatory.** No pre-registered hypotheses here; exploratory measurement.
- **Two-tailed recompute only.** One-sided tests inflate raw flags (the FP_ONE_TAILED bucket = 46);
  partly the gap between 11.8% raw and the ~9.1% adjudicated rate.
- **Table/figure statistics not read.** In-text-only; the 3.5% is a lower bound; table-embedded values
  split across cells may not re-form a checkable triple.
- **Population is a design-query subset**, not literature-wide; rates are conditional on inclusion.
- **p-as-inequality and the p = .05 boundary** follow fixed rules (REVIEW_P_BOUND = 25 ambiguous flags).
- **FP-adjudication is rule-based, single-rater** here — hence the kappa double-coding gate before any
  precise true-rate claim.
- **Sampling** uniform over days not papers (addressed by IPW, but residual day-selection
  non-uniformity remains; addressed only directionally by the independent frame's small N).

### 4.6 Pre-registration and kappa plan (forward-looking section)
- State that the present manuscript reports the **descriptive** census and that a **confirmatory**
  census is **pre-registered on OSF** with the decisions listed in *Gates before submission*.
- Describe the planned **two-coder kappa double-coding**: ~150-paper gold set, two blinded human coders
  independently labelling each flagged claim as genuinely inconsistent vs false positive, Cohen's
  kappa ≥ 0.6 target, used to *calibrate the tool's precision* and convert the adjudicated range into a
  point estimate with a CI.

---

## 5. Gates before submission

**Status: the descriptive census + all robustness analyses are DONE and committed. The following two
gates are NEEDED before formal submission of the confirmatory paper.**

### 5.1 OSF pre-registration — 10 PI decisions
File a pre-registration on OSF fixing, in advance, the following ten items (currently
[PI DECISION] in `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`):
1. **Year window** (e.g. 2018–2025 vs a fixed recent window).
2. **Field / population scope** (design-query subset vs general biomedical OA vs broader).
3. **Target N** (powered sample size for the confirmatory inconsistency-rate estimate).
4. **Sampling frame** (equal-probability PMC OA file-list vs day-clustered + IPW).
5. **Two human coders** — identity/independence/blinding protocol.
6. **DISCREPANT tolerance** — the numeric rounding/boundary tolerance for "consistent".
7. **Kappa threshold** for accepting coder agreement (≥ 0.6 proposed).
8. **Primary endpoint definition** — inconsistent-claim rate vs paper-level rate; decision-changing rule.
9. **One-sided handling** — detection/exclusion policy (the FP_ONE_TAILED issue).
10. **Inclusion/exclusion + stopping rule** — recomputable-claim definition, article types, attrition.

### 5.2 Kappa double-coding (tool-accuracy calibration)
- Two **blinded** coders independently adjudicate a **~150-paper gold set** of flagged claims.
- Compute **Cohen's kappa**; require **≥ 0.6**.
- Use the human-validated labels to (a) convert the ~77% likely-true / [7.0%, 11.5%] range into a
  calibrated true-inconsistency **point estimate + CI**, and (b) report tool precision/recall against
  human ground truth alongside the statcheck head-to-head.

**Done vs needed at a glance**

| Item | Status | Artifact |
|---|---|---|
| 10,103-paper JATS census | DONE | `CENSUS_REPORT_LARGE_2026-06-25.md` |
| FP-adjudication of all flags | DONE | `FP_VALIDATION_REPORT_2026-08-24.md` |
| IPW (same-population) robustness | DONE | `CENSUS_IPW_REPORT_2026-08-24.md` |
| Independent OA-frame replication | DONE (directional) | `CENSUS_OA_PILOT_REPORT_2026-06-26.md` |
| Engine vs statcheck (97.7/98.1) | DONE | `eval_vs_statcheck.py` |
| Figures fig1–fig7 | DONE | `figures/` |
| Reproduction guide + workflow diagram | DONE | `REPRODUCTION.md`, `WORKFLOW.svg` |
| OSF pre-registration filed | **NEEDED** | draft: `MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md` |
| Two-coder kappa double-coding (≥0.6) | **NEEDED** | — |

---

## 6. Target venues

Soundness-not-novelty / meta-research outlets (the descriptive census + transparent methods fit these
better than novelty-gated venues that desk-rejected the platform paper):

- **PLOS ONE** — soundness-based, meta-research friendly, no novelty bar.
- **PeerJ** — soundness-based, open methods.
- **GigaByte** — data/methods-forward, reproducibility emphasis.
- **BMC Bioinformatics** — if framed around the verification engine/pipeline.

Meta-research-specialist alternatives:
- **Research Integrity and Peer Review** (BMC) — directly on-topic for verifiability/consistency.
- **BMC Medical Research Methodology** — methodology + biomedical scope.
- **Royal Society Open Science** — broad, soundness-based, registered-report friendly (could host the
  confirmatory arm as a Registered Report).

*Note:* the confirmatory census could be submitted as a **Registered Report** (Royal Society Open Science
or PLOS ONE registered-report track), with this descriptive census cited as the motivating pilot.

---

## 7. Source-of-truth file map (for drafting)

- Census headline: `paper/replication/verification/CENSUS_REPORT_LARGE_2026-06-25.md`
- FP adjudication: `paper/replication/verification/FP_VALIDATION_REPORT_2026-08-24.md`
- IPW robustness: `paper/replication/verification/CENSUS_IPW_REPORT_2026-08-24.md`
- Independent OA frame: `paper/replication/verification/CENSUS_OA_PILOT_REPORT_2026-06-26.md`
- Engine vs statcheck: `paper/replication/verification/eval_vs_statcheck.py`
- Pipeline scripts: `census_jats.py`, `census_ipw.py`, `oa_pilot.py`, `adjudicate_inconsistencies.py`,
  `make_census_figures.py`
- Figures: `paper/replication/verification/figures/fig1_corpus_funnel` … `fig7_article_types`
- Reproduction + diagram: `paper/replication/verification/REPRODUCTION.md`, `WORKFLOW.svg`/`.png`,
  `workflow.dot`
- OSF pre-reg draft: `docs/MANUSCRIPT_VERIFY_OSF_PREREG_DRAFT_2026-06-25.md`
- Per-paper records (external drive only): `/Volumes/My_Passport/stickforstats_corpus/census_2026-06-25/`
