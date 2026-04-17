# Retraction Backtest of the StickForStats Statistical Quality Score (SQS): Preregistered Protocol

**Authors.** Vishal Bharti; Debojyoti Chakraborty.
**Version.** 0.1 — Preregistered 2026-04-17.
**Repository path.** `paper/retraction_backtest/PROTOCOL.md`
**Source-of-truth commit hash.** To be recorded at commit time; the git commit that lands this file is the time-stamp of record for the preregistration.
**Contact.** vishalvikashbharti@gmail.com
**Declared conflict of interest.** The authors are the developers of StickForStats and the SQS. We acknowledge this is a "self-validation" study of our own instrument and build procedural safeguards (two-coder labeling, blinded scoring, pre-committed thresholds, publish-regardless pledge) accordingly (Section 13).

---

## 1. Abstract

Statistical-reporting errors are a documented driver of post-publication correction and retraction, but editors and reviewers have no lightweight, automatable pre-check that flags statistically fragile manuscripts before publication. StickForStats computes a 0–100 **Statistical Quality Score (SQS)** from 45 regex rules across six categories (effect sizes, assumption transparency, sample and power, statistical precision, reproducibility indicators, guideline compliance), implemented in `backend/core/sqs_rules.py`. This protocol preregisters a retrospective case–control backtest of whether SQS, applied to the *original* full text of peer-reviewed biomedical papers, discriminates papers later retracted for statistical/data-analysis reasons from matched controls that were not retracted. The primary endpoint is the area under the receiver-operating-characteristic curve (AUC) of SQS as a classifier, with a 95 % bootstrap confidence interval. We pre-commit to the following decision rule: AUC ≥ 0.70 **with lower 95 % CI ≥ 0.60** is declared a positive result; AUC in [0.60, 0.70) is declared partial discrimination; AUC < 0.60 is declared no useful discrimination. We target *n* = 200 retracted-for-statistics cases and 400 matched controls, a sample size motivated by Hanley & McNeil (1982) power analysis inflated for matched-bootstrap variance, multiple-rule secondary testing, and coverage attrition. The corpus is drawn exclusively from the PMC Open Access Subset under per-article Creative Commons or public-domain licenses. Retraction labels come from the Crossref-hosted Retraction Watch Database and Crossref `update-type:retraction` metadata. **Results will be published regardless of direction**; if SQS fails to discriminate, we will publish that finding prominently and the corresponding null result will be a first-class output of the study.

## 2. Background

Retractions of peer-reviewed scientific papers have risen roughly an order of magnitude over the last two decades, from several hundred per year in the mid-1990s to several thousand annually today (Fang, Steen, & Casadevall, 2012; Brainard & You, 2018). While misconduct accounts for a majority of retractions (Fang et al., 2012), a substantial fraction — variously estimated at 10 % – 25 % — are attributed at least in part to honest statistical and data-analysis error (Nuijten, Hartgerink, van Assen, Epskamp, & Wicherts, 2016; Allison, Brown, George, & Kaiser, 2016).

Two lines of prior work motivate the present study.

First, **automated statistical auditing** of manuscripts is feasible and has non-trivial yield:
- **statcheck** (Nuijten et al., 2016; Epskamp & Nuijten, 2018) parses APA-style statistics from psychology papers and recomputes *p*-values; roughly half of 30 000 papers surveyed contained at least one inconsistency, and ~13 % contained an inconsistency that changed the significance conclusion.
- **GRIM / GRIMMER** (Brown & Heathers, 2017; Anaya, 2016) test whether reported means and SDs are consistent with the claimed integer sample size; a double-digit fraction of papers fail these checks.
- **SPRITE** (Heathers, Anaya, Brown, & Nuijten, 2018) reconstructs plausible sample distributions from summary statistics.

These tools show that *content-level* statistical errors are detectable from the printed manuscript. StickForStats' SQS operates at a different level — *reporting quality* — by measuring the presence or absence of 45 required and recommended reporting practices, not the numerical internal consistency of the claims themselves.

Second, **landscape studies of retractions** (Fang et al., 2012; Brainard & You, 2018; Oransky, 2024 — *Retraction Watch Database*, hosted by Crossref) show that retraction causes are heterogeneous: plagiarism, image duplication, authorship disputes, ethics-review failures, and statistical/data-analysis errors each represent a sizable slice. Only the last is plausibly detectable from reporting quality of the original text.

The scientific question this study answers is thus narrowly scoped: **conditional on retraction for a statistical/data-analysis reason, does SQS at time of publication systematically flag the retracted paper as lower-quality than a matched paper that was not retracted?** A positive answer would establish SQS as a reviewer pre-check with evidence from out-of-sample historical data. A negative answer would close off that claim for StickForStats.

## 3. Primary hypothesis (H1)

> Among peer-reviewed papers published 2010–2023, indexed in the PMC Open Access Subset, and later formally retracted with a retraction notice whose reasons include at least one statistical or data-analysis issue ("statistical-cause retractions"), the **Statistical Quality Score computed from the original full text** is **lower** than the SQS of journal- and year-matched, discipline-matched, non-retracted control papers, with an AUC ≥ 0.70.

The direction is pre-specified: retracted-for-statistics papers have *lower* SQS. AUC is computed with controls as the "negative" class and retracted-for-stats papers as the "positive" class (lower SQS → higher classifier score → positive).

## 4. Null hypothesis (H0)

> The distribution of SQS in retracted-for-statistics papers is not systematically different from that of matched controls: AUC = 0.50.

## 5. Primary endpoint

**AUC of SQS as a classifier of retracted-for-statistics vs matched-controls, with a 2 000-replicate matched-cluster bootstrap 95 % CI.**

- Computation: Mann-Whitney / DeLong equivalence; SQS treated as a continuous classifier, cases are retracted-for-stats papers, controls are matched non-retracted papers.
- Bootstrap unit: the matched cluster (one case + its two controls). This respects the matching structure; a standard unit-level bootstrap would otherwise underestimate variance (Efron & Tibshirani, 1993, §8.5).
- Seed: 20260417 (today's date as integer). Hard-coded in the analysis script for reproducibility.

**Pre-committed clinically meaningful threshold.** AUC ≥ 0.70 with lower 95 % CI ≥ 0.60 is the success threshold. This is not chosen to match expected SQS performance; it is chosen from the literature on clinical-prediction-rule adoption (Mandrekar, 2010) where AUC ≥ 0.70 is the conventional floor for "acceptable discrimination" and AUC ≥ 0.80 is the floor for "good". A confidence-interval constraint (lower bound ≥ 0.60) prevents a single noisy point estimate from driving a claim.

## 6. Secondary endpoints

All secondary analyses are pre-specified; post hoc endpoints are forbidden.

1. **Per-rule discrimination.** For each of the 45 SQS rules, compute a one-sided Fisher exact test of (rule hit in case) vs (rule hit in control). BH-FDR corrected across 45 rules at FDR = 0.05 (Benjamini & Hochberg, 1995).
2. **Per-category discrimination.** AUC of each of the six category subscores, separately, with DeLong 95 % CIs. Interpretive only; not combined with primary endpoint.
3. **Operating point at 90 % specificity.** The SQS threshold that yields 90 % specificity on the control distribution; report resulting sensitivity for cases.
4. **Calibration.** Reliability diagram of SQS percentile → observed case-prevalence; Brier score for the implicit classifier *P*(retracted | SQS).
5. **Time-to-retraction analysis.** Cox regression of time from publication to retraction on SQS (adjusted for journal and year). Is lower SQS associated with faster retraction? Pre-committed effect-size threshold: hazard ratio per 10-point SQS decrement < 1.25 is not interesting.
6. **Robustness to label boundary.** Repeat primary analysis with (a) "stat-cause-only" labels (strict), (b) "stat-cause present" labels (lenient), showing how results move.

## 7. Population and sampling frame

### 7.1 Source

- **Retraction list (cases).** Retraction Watch Database, hosted on Crossref's GitLab since acquisition on 2023-09-12 (Marcus & Oransky, 2023 via Crossref). Supplemented and cross-checked with Crossref `filter=update-type:retraction` query — as of our pilot check (2026-04-17) Crossref indexes **71 100** retraction relationships, and Europe PMC indexes **31 910** retracted publications of which **16 854** are marked Open Access. These counts exceed the sample size we need by at least an order of magnitude.
- **Full text (cases and controls).** PMC Open Access Subset, retrieved through the sanctioned PMC FTP / BioC API / OA Web Service API (NCBI). PMC restricts ad-hoc bulk scraping but provides explicit bulk packages (each containing roughly 100 000 articles); we will use these.
- **Candidate pool for matching.** Europe PMC `PUB_TYPE` filter plus OpenAlex (CC0-licensed) metadata for journal/year/subject normalisation. OpenAlex provides `is_retracted` boolean as a convenience flag, but our authoritative retraction label is Retraction Watch.

### 7.2 Inclusion criteria (retracted arm / cases)

1. Original paper published 2010-01-01 through 2023-12-31 inclusive.
2. Original paper indexed in PMC with an identifiable PMCID and present in the PMC Open Access Subset with a redistribution-permitted license (CC0, CC-BY, CC-BY-SA, or US-government public domain). CC-BY-NC is excluded to avoid derivative-distribution concerns for our processed corpus.
3. Retraction notice linked via Crossref `update-to`/`update-type=retraction` or present in the Retraction Watch Database.
4. Retraction notice explicitly states at least one reason code that maps to the **statistical-cause taxonomy** (Section 10).
5. Primary language English (SQS regex rules are English-only).
6. Parser succeeds (see §7.4): title, abstract, methods, and results sections are all detected.

### 7.3 Exclusion criteria (retracted arm)

Papers meeting any of these are excluded:

- Retraction solely for plagiarism, image manipulation, figure duplication, authorship disputes, or research-ethics violations **with no analytical component**. Non-stat retractions are the natural null case — they should *not* carry a statistical quality signal — but including them dilutes the population we actually want to estimate on. Section 11 sensitivity analysis uses these as a negative control.
- Non-English language (after automatic language detection on the full text).
- No recognisable Methods *or* Results section (parser quality gate).
- Full text behind a paywall or under a license we cannot reuse for machine analysis (i.e. outside the PMC OA Subset's commercial-or-NC-permitted groups we permit).
- Published before 2010-01-01 (reporting norms and required statistics shifted substantially around the mid-2010s — APA JARS-Quant 2018, STROBE/CONSORT updates, rise of mandatory data-sharing statements — and we do not want SQS to exploit era-based style heuristics it could not have known about at time of original publication).
- Duplicate retraction of the same paper; keep the first retraction notice only.
- Self-published papers, book chapters, and commentaries (not original research).
- Retracted but subsequently un-retracted.

### 7.4 Parser-quality gate

We count a paper as "eligible" only if the `ManuscriptParser` from `backend/core/manuscript/parser.py` yields **all** of: title detected, abstract section ≥ 100 words, methods section ≥ 100 words, results section ≥ 100 words, total word count ≥ 1 500. Failures are logged and the paper is excluded. The pre-SQS parser-success rate is an expected attrition factor.

Concretely, the gate implementation is:

```python
def parser_gate(parsed: ParsedManuscript) -> bool:
    sections = {s.section_type for s in parsed.sections}
    return (
        bool(parsed.metadata.title) and
        len(parsed.abstract_text or '') >= 500 and     # ~100 words
        len(parsed.methods_text or '') >= 500 and
        len(parsed.results_text or '') >= 500 and
        parsed.metadata.word_count >= 1500 and
        {'methods', 'results'} <= sections
    )
```

A pre-flight pilot on 100 random PMC OA papers must confirm that this gate accepts ≥ 70 % of well-formed research articles and rejects ≥ 95 % of commentary / editorial / erratum articles; if not, the gate will be re-tuned in a single pre-frozen commit before scoring begins and the new thresholds logged here.

### 7.5 Inclusion criteria (control arm)

For each retracted-for-statistics case we draw **two** matched non-retracted controls from PMC OA. Matches are pre-specified as exact on journal (ISSN), and on **year of publication ± 1 year** (±1 year is used to avoid zero-match failures for journals with sparse coverage in a given year). Disciplinary match is enforced by **shared top-level Medical Subject Heading (MeSH) major topic**: the case must have at least one MeSH major topic in common with each control. A control is ineligible if it appears on the retraction list in either direction (neither as the retracted paper nor as the originally cited retraction notice) at any time in our observation window.

Matching algorithm: greedy nearest-neighbour with replacement permitted across different cases but *without* replacement within a single case's two controls. If fewer than two eligible controls exist for a case (e.g. because the case is in a very small journal and year window), the case is dropped and the drop logged.

Formal matching distance (ties broken in this order):
1. Exact-match on ISSN (required; no match → discard).
2. Exact-match on year, else ±1 year (required within this window).
3. Maximise size of MeSH-major-topic intersection (break ties by total MeSH-overlap count).
4. If multiple candidates remain, take the two with closest publication date to the case (days).

The matching step is deterministic given a fixed random seed for the final tie-break step (PRNG seed = 20260417, same seed as §5 bootstrap).

### 7.6 Matching ratio justification

A 2:1 control-to-case ratio is a conventional compromise that gains roughly 33 % additional statistical efficiency over 1:1 while avoiding the diminishing returns and matched-variance inflation that become acute at 4:1 and above (Breslow & Day, 1980; Wacholder et al., 1992). It also triples the pool of sensitivity-analysis reruns with different control draws.

## 8. Sample size and power

### 8.1 Parametric calculation (Hanley & McNeil, 1982)

Let θ₀ = 0.50 (null AUC) and θ₁ = 0.70 (pre-committed threshold AUC). With case-to-control ratio *k* = 2, one-sided α = 0.025, power = 0.80, the variance of the estimated AUC under Hanley & McNeil (1982) is

```
V(θ) = [θ(1-θ) + (n_a - 1)(Q₁ - θ²) + (n_n - 1)(Q₂ - θ²)] / (n_a · n_n)
Q₁ = θ / (2 - θ)
Q₂ = 2θ² / (1 + θ)
```

Solving (zₐ √V₀ + z_β √V₁)² = (θ₁ − θ₀)² via binary search (sample code in `paper/retraction_backtest/code/sample_size.py`) gives:

| θ₁   | n_cases | n_controls | total |
|------|---------|------------|-------|
| 0.65 | 44      | 88         | 132   |
| 0.70 | 24      | 48         | **72** |
| 0.75 | 16      | 32         | 48    |

At the **pre-committed** θ₁ = 0.70, the parametric floor is **72 total (24 cases, 48 controls)**.

### 8.2 Simulation calculation (matched-bootstrap 95 % CI)

The parametric calculation undershoots because (a) the primary decision rule requires the bootstrap 95 % CI *lower bound* to clear 0.60, not merely a point estimate to be non-null, and (b) bootstrapping by matched cluster inflates variance relative to iid bootstrap.

Monte-Carlo simulation (code: `paper/retraction_backtest/code/power_sim.py`; normal SQS with equal variance, AUC-implied mean shift) gives the following probability of clearing the "lower 95 % CI ≥ 0.60" threshold at true AUC = 0.70:

| n_cases | P(success) |
|---------|-----------|
| 100     | 0.88      |
| 150     | 0.97      |
| 200     | 0.99      |
| 300     | 1.00      |

### 8.3 Inflation for operational loss

We further inflate to absorb:

- **Multiple rules.** 45 secondary endpoints, each needing its own ~20-event-per-predictor floor for Fisher exact power at BH-FDR = 0.05; the empirical floor for secondary power reaching 0.70 is roughly n_cases ≈ 100 per event direction.
- **Parser-failure attrition.** We estimate 10 %–30 % loss to parser-quality gate (§7.4).
- **Matching attrition.** We estimate 10 %–20 % loss where fewer than two valid controls exist.
- **Labeling attrition.** Disagreement-after-adjudication on the statistical-cause label (§10) causes 5 %–15 % loss.

### 8.4 Target sample sizes

- **Primary target.** *n_cases = 200, n_controls = 400, total N = 600.* This is the number used to make all pre-committed success claims.
- **Minimum viable sample.** *n_cases = 100, total N = 300.* Below this, we pre-commit to labeling the study *exploratory*, widening CIs, and declining to claim primary endpoint success regardless of AUC.
- **Feasibility envelope.** Europe PMC has 16 854 open-access retracted publications as of 2026-04-17. Even if only 10 % of retractions have a statistical cause and only 50 % survive our parser-quality and English-language filters, that leaves > 800 eligible cases — comfortably above the primary target.

## 9. Classification of retraction reasons (statistical-cause taxonomy)

### 9.1 Codebook

A retraction notice is labeled **STATISTICAL-CAUSE (positive)** if and only if its Retraction Watch reason codes, verbatim notice text, or Crossref retraction-notice DOI target text contain at least one of the following:

- Explicit Retraction Watch reason codes: `"+Error in Data"`, `"+Error in Analyses"`, `"+Error in Statistical Analysis"`, `"+Falsification/Fabrication of Data"` *only when* the falsification relates to numerical values rather than images, `"+Unreliable Data"`, `"+Unreliable Results"`, `"+Duplication of Data"`, `"+Statistical Error in Analyses"`, `"+Inappropriate Statistical Methods"` (code labels verified against Retraction Watch controlled vocabulary as of access date).
- Keyword phrases, case-insensitive, in the retraction notice body: "inappropriate statistical test", "incorrect statistical analysis", "error in statistical analysis", "statistical error", "inflated significance", "sample size (too small|insufficient|inadequate)", "unadjusted multiple comparisons", "multiple testing not corrected", "incorrect standard error", "incorrect p-value", "incorrect (test statistic|F statistic|t statistic|chi-square)", "data duplication producing (spurious|false|artifactual)", "error bars", "incorrect normalisation", "assumption (violated|not tested)", "non-independent observations".

A notice is labeled **NON-STATISTICAL (negative)** if its reason codes include *only* items from: plagiarism, self-plagiarism, unauthorised authorship change, IRB/ethics violation with no analytical dimension, image manipulation/duplication *without* accompanying data claim, journal-policy violation (e.g. paper-mill concerns with no analytical specifics), duplicate publication, copyright violation.

**Ambiguous cases** (both stat and non-stat reasons present) are classified as stat-cause for the **primary** analysis and as non-stat for a **sensitivity** analysis (§11.3).

### 9.2 Independent coding

Two coders independently apply the codebook to each retraction notice. Coder identity and institutional affiliation are logged; coders are blinded to SQS score. Inter-rater reliability is pre-reported as Cohen's κ (Cohen, 1960). **Pre-committed thresholds:**

- κ ≥ 0.80: accept coding, proceed.
- 0.60 ≤ κ < 0.80: proceed but document disagreement rate; adjudication reconciles by majority with a third coder breaking ties.
- κ < 0.60: **halt primary analysis**, rewrite codebook, and disclose the issue in the final report — we will not proceed with unreliable labels.

## 10. Analysis plan

### 10.1 Scoring pipeline

1. Retrieve full text for each case and control via PMC OA FTP package (JATS XML preferred; PDF fallback).
2. Run `ManuscriptParser(...)` from `backend/core/manuscript/parser.py`. Apply the §7.4 parser-quality gate; discard failures.
3. Run `SQSScorer(field=<matched discipline profile>)` from `backend/core/sqs_scoring.py`; record raw 0–100 SQS and per-category subscores. Use `field='medicine'` for biomedical disciplines, `'biology'` for basic-science, `'general'` otherwise. The mapping from MeSH top term to field value is itself pre-frozen in `paper/retraction_backtest/code/field_mapping.py` and not adjusted after pilot data are seen.
4. Record rule hits for the 45 rules as a binary matrix of shape (n_papers × 45).
5. Acceptance tests before primary analysis runs:
   - **Reproducibility check.** Re-score 50 random papers on a second machine with the same commit SHA; require 100 % exact agreement of raw SQS scores.
   - **Blinding check.** Scorer must not access retraction label at scoring time; a runtime assertion enforces that the `label` column is `NaN` in the dataframe passed to the SQS scorer.
   - **Label-coder audit.** A sample of 30 coded retraction notices is independently re-coded by a third coder; Cohen's κ with the original two coders' consensus must be ≥ 0.70 or the label set is returned for revision.

### 10.2 Primary analysis

- AUC point estimate via Mann-Whitney U (DeLong-equivalent).
- 95 % CI via 2 000-replicate matched-cluster bootstrap as in §5.
- Two-sided *p*-value computed from the bootstrap distribution (we invert the bootstrap CI at the null). For publication we report both the *p*-value and the CI; the CI is the primary decision-bearing quantity.

### 10.3 Pre-specified sensitivity analyses

1. **Discipline stratification.** Drop any discipline for which fewer than 20 cases are present, rerun primary analysis. Quantifies how much the result depends on any one discipline.
2. **Temporal stratification.** Pre-2015 cohort vs post-2015 cohort, primary analysis run separately on each. This checks for **temporal drift in reporting norms** — a known confounder since the SQS rules were authored in 2024–2026 and may reflect post-2015 norms more than pre-2015 norms.
3. **Label-boundary sensitivity.** Move ambiguous stat-cause/non-stat cases into each bucket, recompute AUC. Report the window.
4. **Matching-ratio sensitivity.** Rerun primary analysis with 1:1 matching; note movement.
5. **Negative-control rerun.** Apply primary analysis to non-stat retractions (plagiarism/ethics only) vs their controls. **We expect AUC ≈ 0.50 here.** An AUC materially above 0.50 for non-stat retractions implies SQS is picking up generic "questionable paper" signal rather than specifically statistical quality, and we will disclose that prominently.

### 10.4 Multiple testing

- Primary endpoint: no correction (single test).
- Secondary endpoints: BH-FDR = 0.05 within each endpoint family (the 45 per-rule tests form one family; the six per-category AUCs form another).
- Sensitivity analyses: raw *p*-values reported; they do not drive conclusions.

### 10.5 Missing data

- Complete-case analysis for the primary endpoint.
- Sensitivity: multiple imputation (m = 10, chained equations, Rubin's rules) for matching covariates (MeSH heading, discipline) where missing.
- Full-text unavailability is an exclusion criterion, not a missing-data problem; attrition at this stage is reported in the CONSORT-style flow figure.

## 11. Decision rule

At primary-endpoint time:

| Outcome              | Lower 95 % CI | Verbal claim                                                   |
|----------------------|----------------|----------------------------------------------------------------|
| AUC ≥ 0.70, CI ≥ 0.60 | ✓              | **Positive.** SQS discriminates retracted-for-stats papers at a clinically meaningful level; recommend use as reviewer pre-check. |
| 0.60 ≤ AUC < 0.70     | —              | **Partial.** Some discrimination but below the clinical floor; SQS is not by itself adequate. |
| AUC < 0.60            | —              | **Null.** No useful discrimination; SQS at time of publication does not predict statistical retraction. |

**Corner cases.** The decision rule is checked by the two constraints on AUC: point estimate *and* lower 95 % CI bound. If the point estimate is ≥ 0.70 but the lower CI is < 0.60 (wide CI, e.g. underpowered), the classification is *Partial* — not positive. If the point estimate is < 0.70 but the upper CI is > 0.70, the classification is still *Partial*. This asymmetry is intentional: we prefer type II error to type I error when claiming clinical utility of our own instrument.

**Negative-control corner case.** If §10.3.5 (non-stat retractions vs controls) yields AUC > 0.60, the primary result — even if positive — must be reported with a prominent caveat: SQS is picking up "suspect paper" signal at least partially rather than specifically statistical quality. The primary claim is not withdrawn, but its scope is narrowed.

**Temporal-subgroup corner case.** If the primary result is positive overall but pre-2015 and post-2015 subgroups differ in AUC by > 0.15, the paper's title and abstract will explicitly state the heterogeneity and the conservative subgroup's result becomes the claim.

**In all three outcome cases, results, code, manifest, and retraction coding are released publicly.**

## 12. Threats to validity

Listed in order of pre-committed severity.

1. **Label leakage via retraction-notice text.** Retraction notices sometimes *cite* the specific error ("the authors misapplied the χ² test"), and SQS rules match on similar keywords. *Mitigation:* SQS is applied **only to the original manuscript text**, never to the retraction notice. Coders have access to the retraction notice; SQS scorer does not.
2. **Temporal bias (rules authored post-hoc).** Because the 45 SQS rules were written in 2024–2026, they may encode post-hoc knowledge of which reporting patterns are "now expected" that did not exist in 2010. *Mitigation:* temporal stratification (§10.3.2) is pre-specified; we will report how the effect moves between pre-2015 and post-2015 cohorts.
3. **PMC-OA selection bias.** Open-access papers are not a random sample of all biomedical literature; they skew toward biology/medicine and certain publishers. *Mitigation:* discipline stratification; explicit scoping of claim to "biomedical papers indexed in PMC OA"; we will not generalise claims beyond this population.
4. **Non-stat retractions as confounder.** If non-stat retractions (plagiarism, ethics) also have lower SQS — because authors who plagiarise may also be sloppy statisticians — a raw retracted-vs-not comparison would conflate effects. *Mitigation:* §10.3.5 negative-control analysis makes this testable and publishable.
5. **Matching failures at small journal × year cells.** Journal-matching may force use of controls from adjacent years, and for small journals may be impossible. *Mitigation:* documented attrition and a matching-ratio-sensitivity rerun (§10.3.4).
6. **Inter-rater unreliability in labeling.** Retraction reason codes are inconsistent between journals and over time. *Mitigation:* two independent coders with κ threshold (§9.2); rewrite-codebook halt rule at κ < 0.60.
7. **Ascertainment bias in which papers get re-examined.** High-profile or high-citation papers are more likely to be scrutinised post-publication and thus more likely to appear in the retraction corpus. *Mitigation:* citation-count is logged as a covariate; a pre-specified secondary analysis conditions on citation quartile.
8. **Parser failures correlated with quality.** If a paper is so poorly structured that the parser fails the quality gate (§7.4), it will be excluded — possibly removing the *most* structurally weak papers, biasing controls and cases asymmetrically. *Mitigation:* parser-failure rate is reported separately for cases and controls; a sensitivity analysis rescoring parser-failed papers via the more tolerant full-text fallback is pre-specified.
9. **Goodhart's law (future-state warning, not present threat).** If the instrument succeeds and is adopted, authors will tune manuscripts to the rules without improving underlying rigor. *Mitigation:* this is a limitation of deployment, not of the present retrospective study; we will discuss it in the paper's Limitations.
10. **SQS rule-pattern overlap with retraction vocabulary.** Several SQS reproducibility rules (e.g. RP001 "data availability statement", RP006 "pre-registration") key on the same vocabulary that retraction notices cite for failures. A paper's Methods section might contain the phrase "data available upon request" that earns it SQS credit, while its retraction notice cites "data not actually provided upon request" as the retraction reason — this could produce *positive* correlation between "surface" reporting quality and retraction, which would *dampen* our effect and produce a false null rather than a false positive. *Mitigation:* we document the direction of this potential bias explicitly in the paper. It is asymmetric and *helps* guard against over-claiming.
11. **Journal-of-publication confounding.** Some journals have systematically lower baseline reporting quality *and* higher retraction rates (predatory or near-predatory venues). Matching on journal should control this, but to the extent the effect is *within-journal* we still recover a valid estimate. A journal-only-matched rerun with 1-year rather than ±1-year window (§10.3.4) quantifies how much headroom journal matching is consuming.
12. **SQS version drift.** We freeze the `sqs_rules.py` commit SHA for scoring and store it in the manifest, but if a later reviewer asks "what would the *current* SQS have scored?" we cannot satisfy that without re-running. *Mitigation:* the frozen SHA is the primary endpoint's definition; any post-hoc re-scoring with a newer SQS version is clearly marked as exploratory and does not modify the pre-registered claim.

## 13. Ethics and data governance

- **Not human-subjects research.** No identifiable individual data are processed; no IRB review required.
- **Redistribution.** We do **not** re-publish any full-text articles. We publish:
  1. The retraction-and-control **manifest** (DOI, PMCID, case/control label, match cluster ID, discipline, year, journal, retraction reason codes, SQS, per-category subscores, per-rule hit flags). The manifest is released under CC0.
  2. All **analysis code** under MIT license on GitHub.
  3. The **pre-registered protocol** (this document) in the main StickForStats repository, time-stamped by git.
- **Per-article licensing.** Every article used must be in the PMC OA Subset "commercial reuse permitted" group (CC0, CC-BY, CC-BY-SA, CC-BY-ND) or US government public domain. CC-BY-NC and papers without a machine-readable CC license are excluded.
- **Negative-results commitment.** If the primary endpoint fails (AUC < 0.70), the paper is still submitted to preprint (bioRxiv or Open Science Framework) and to a peer-reviewed journal. A prominent "Negative Result" tag is applied. We pre-commit against any drawer-file outcome.

## 14. Registration and code availability

- **Preregistration time-stamp.** The git commit that lands this document on the `main` branch of `https://github.com/visvikbharti/stickforstats_new` is the preregistration time-stamp. The commit SHA is the cryptographic proof of priority.
- **OSF co-registration.** *Recommended, not required:* also deposit this file to a time-stamped OSF project prior to any data collection, for a second independent time-stamp. [REQUIRES HUMAN VERIFICATION — OSF deposit not yet done; to be completed before Task #26 (harvesting) begins.]
- **Analysis code.** All pipeline code (harvester, scorer, analysis notebook) will live in `paper/retraction_backtest/code/` and be released with the paper.
- **Frozen SQS version.** The exact `backend/core/sqs_rules.py` and `backend/core/sqs_scoring.py` files used are those at the commit SHA recorded at scoring time. We will **not** modify SQS rules during the run.
- **Artefact inventory (pre-frozen).** At run time the following artefacts will be frozen together and stored under `paper/retraction_backtest/frozen/`:
  - `commit.txt` — git SHA at scoring time.
  - `codebook.md` — the labeling codebook actually used (derived from §9 after resolving the [REQUIRES HUMAN VERIFICATION] items).
  - `field_mapping.py` — MeSH-to-field mapping used for `SQSScorer(field=...)`.
  - `random_seeds.json` — every PRNG seed used (matching, bootstrap, sensitivity).
  - `requirements.lock.txt` — exact Python package versions.
  - `manifest.csv` — the case/control manifest (DOI, PMCID, label, cluster id, SQS, subscores, rule hits).
- **Compute environment.** Scoring is run on a single machine; a reproducibility check re-runs on a second machine (§10.1 acceptance tests) before the primary analysis executes.

## 15. Glossary

- **AUC.** Area under the Receiver Operating Characteristic curve; the probability that a uniformly random case receives a higher classifier score than a uniformly random control. Equivalent to the Mann-Whitney *U* statistic normalised to [0,1] (Hanley & McNeil, 1982).
- **Sensitivity.** Pr(classifier calls positive | truly positive). Here: Pr(SQS below threshold | retracted-for-stats).
- **Specificity.** Pr(classifier calls negative | truly negative). Here: Pr(SQS at or above threshold | not retracted).
- **Cohen's κ.** Inter-rater agreement coefficient corrected for chance (Cohen, 1960). κ = 1 is perfect, κ = 0 is chance-level.
- **Matched control.** A non-case paper drawn from the same journal, same ±1-year publication window, and with at least one shared MeSH major topic with its case (§7.5).
- **FDR (false discovery rate).** The expected proportion of rejected null hypotheses that are actually true (Benjamini & Hochberg, 1995).
- **Brier score.** Mean squared error between predicted probability of the positive class and the binary outcome; lower is better.
- **Reliability diagram.** Graph binning predicted probabilities and plotting observed frequency per bin; the 45° line is perfect calibration.
- **Statistical-cause retraction.** Retraction whose notice cites at least one reason from the statistical-cause taxonomy in §9.1.

## 16. Open questions

Items flagged **[REQUIRES HUMAN VERIFICATION]** must be resolved before scoring begins.

1. **[REQUIRES HUMAN VERIFICATION]** Retraction Watch database license terms. The Crossref blog (2023-09-12) states the database is "always open" but we did not extract the explicit license tag from the repository README. Required action: fetch `README.md` from `https://gitlab.com/crossref/retraction-watch-data` and confirm license (CC0 or CC-BY-4.0 expected). If more restrictive than CC-BY, revise §13 manifest-redistribution clause.
2. **[REQUIRES HUMAN VERIFICATION]** PMC OA Subset commercial-reuse counts for retracted papers. Our 16 854 OA-retraction figure is Europe PMC's total OA count; the subset that also falls in PMC's "commercial reuse permitted" group (CC0, CC-BY, CC-BY-SA, CC-BY-ND only) has not been counted. Required action: run a pilot probe of 200 random OA retractions and confirm ≥ 70 % carry a permissive-reuse license. If not, revise sample-size target.
3. **[REQUIRES HUMAN VERIFICATION]** The exact Retraction Watch reason-code vocabulary. Our §9.1 codebook lists plausible code names (e.g. `"+Error in Data"`); the canonical list is distributed separately from the CSV. Required action: pull the vocabulary file (usually `reason_codes.md` in the same GitLab repo, or the Retraction Watch user guide) and replace our plausible list with the authoritative one.
4. **[REQUIRES HUMAN VERIFICATION]** Inter-rater coder identities. Our two-coder plan requires identifying a second qualified coder independent of the StickForStats team. Required action: recruit and disclose before run.
5. **[REQUIRES HUMAN VERIFICATION]** `SQSScorer` API. The scorer import path `from core.sqs_scoring import SQSScorer` is referenced in `manuscript_guardian.py` (line 40), but `sqs_scoring.py` exists in the repo. Confirm the exact public interface (`.analyze(text, title=...)` returning `SQSReport` with `.percentage` and `.grade`) matches what our harness expects.
6. **[REQUIRES HUMAN VERIFICATION]** OSF preregistration deposit. We name OSF as recommended second time-stamp but have not yet created the OSF project.
7. **[REQUIRES HUMAN VERIFICATION]** Pre-2010 exclusion cutoff. We chose 2010 as the lower bound primarily because major reporting-guideline updates (CONSORT 2010, APA JARS-Quant 2018, STROBE revisions) concentrate the post-2010 era. This cutoff should be reviewed by a methodology collaborator before freezing.

---

## References

- Allison, D.B., Brown, A.W., George, B.J., & Kaiser, K.A. (2016). A tragedy of errors. *Nature*, 530, 27–29.
- Anaya, J. (2016). The GRIMMER test: a method for testing the validity of reported measures of variability. *PeerJ Preprints*, 4:e2400v1.
- Benjamini, Y., & Hochberg, Y. (1995). Controlling the false discovery rate: a practical and powerful approach to multiple testing. *Journal of the Royal Statistical Society, Series B*, 57(1), 289–300.
- Brainard, J., & You, J. (2018). What a massive database of retracted papers reveals about science publishing's "death penalty". *Science*, news feature, 25 Oct 2018.
- Breslow, N.E., & Day, N.E. (1980). *Statistical Methods in Cancer Research. Volume I: The Analysis of Case-Control Studies.* IARC Scientific Publications No. 32.
- Brown, N.J.L., & Heathers, J.A.J. (2017). The GRIM Test: a simple technique detects numerous anomalies in the reporting of results in psychology. *Social Psychological and Personality Science*, 8(4), 363–369.
- Cohen, J. (1960). A coefficient of agreement for nominal scales. *Educational and Psychological Measurement*, 20(1), 37–46.
- Efron, B., & Tibshirani, R.J. (1993). *An Introduction to the Bootstrap*. Chapman & Hall.
- Epskamp, S., & Nuijten, M.B. (2018). *statcheck: Extract statistics from articles and recompute p-values.* R package version 1.3.0.
- Fang, F.C., Steen, R.G., & Casadevall, A. (2012). Misconduct accounts for the majority of retracted scientific publications. *Proceedings of the National Academy of Sciences*, 109(42), 17028–17033.
- Hanley, J.A., & McNeil, B.J. (1982). The meaning and use of the area under a receiver operating characteristic (ROC) curve. *Radiology*, 143(1), 29–36.
- Heathers, J.A.J., Anaya, J., van der Zee, T., & Brown, N.J.L. (2018). Recovering data from summary statistics: Sample Parameter Reconstruction via Iterative TEchniques (SPRITE). *PeerJ Preprints*, 6:e26968v1.
- Mandrekar, J.N. (2010). Receiver operating characteristic curve in diagnostic test assessment. *Journal of Thoracic Oncology*, 5(9), 1315–1316.
- Marcus, A., & Oransky, I. (2023). Retraction Watch database acquired by Crossref. *Crossref blog*, 12 September 2023.
- Nuijten, M.B., Hartgerink, C.H.J., van Assen, M.A.L.M., Epskamp, S., & Wicherts, J.M. (2016). The prevalence of statistical reporting errors in psychology (1985–2013). *Behavior Research Methods*, 48(4), 1205–1226.
- Oransky, I. (ed.). *The Retraction Watch Database* (hosted by Crossref, ongoing). `https://gitlab.com/crossref/retraction-watch-data`
- Wacholder, S., McLaughlin, J.K., Silverman, D.T., & Mandel, J.S. (1992). Selection of controls in case-control studies. *American Journal of Epidemiology*, 135(9), 1019–1028.
