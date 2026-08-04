# StickForStats: automated statistical assumption validation for reproducible computational biology

**Vishal Bharti**^1,\*^, **Debojyoti Chakraborty**^1,2,\*^

1. CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India
2. Academy of Scientific and Innovative Research (AcSIR), Ghaziabad 201002, India

\* Corresponding authors: vishalvikashbharti@gmail.com, debojyoti.chakraborty@igib.in

ORCID: Vishal Bharti https://orcid.org/0009-0003-1431-4457; Debojyoti Chakraborty https://orcid.org/0000-0003-1460-7594

---

## Abstract

**Background:** Reproducible computational biology depends on statistical decisions that routine workflows often skip: verifying that a differential-expression test's assumptions hold across all genes, that a strategy-comparison ANOVA is robust to non-normality, or that a meta-analysis is not distorted by publication bias. Surveys of the published literature find such checks are rarely reported at all: of 141 gene-expression application papers, 3.5% stated the variance-homogeneity assumption behind their t-tests and ANOVAs, and of 95 health-research papers using linear regression, none reported checking all four of its assumptions. Existing statistical software leaves validation to the analyst as an optional step.

**Results:** We present StickForStats, an open-source web platform that reframes assumption validation as a default precondition for every analysis. Its Guardian system---a middleware pipeline of nine validators (normality, variance homogeneity, independence, outliers, sample size, modality, linearity, homoscedasticity, shape similarity)---checks assumptions before execution and, on critical violations, reroutes to an appropriate nonparametric alternative with a documented decision trail. At genome scale, applying Guardian to a 91-sample synovial-sarcoma RNA-seq study (GSE271517) rerouted 90.5% of 27,221 genes off the parametric default (89.6% to a rank-based test) and flipped the differential-expression verdict for 553 genes---479 rescued from an under-powered t-test, plus 74 outlier-influenced genes the rank-based cascade declines to call (a disagreement where count-based genomics models may differ)---materially changing the gene list a biologist would act on. The same automatic validation generalizes across domains: a CRISPR editing-strategy comparison (ANOVA F = 1122, with Guardian recommending Kruskal-Wallis H = 36.6), an ordinal correlation (Pearson r = 0.476 corrected to Spearman ρ = 0.479), and a sixteen-trial clinical meta-analysis revealing severe publication bias (Egger's t = -5.78, p < 0.001); a complementary module extends the same validators to published manuscripts, checking claims against CONSORT, STROBE, ICH-E9, and JARS-Quant reporting standards. All computations are validated against SciPy and R.

**Conclusions:** By making assumption validation automatic and transparent rather than an optional, easily skipped step, StickForStats targets a tractable, under-served contributor to irreproducibility. The platform is MIT-licensed and freely available at https://github.com/visvikbharti/stickforstats_new, with a citable archived snapshot on Zenodo (DOI 10.5281/zenodo.21258381).



## Keywords

Statistical assumption validation; Reproducibility; Differential expression; RNA-seq; Nonparametric methods; Meta-analysis; Manuscript screening; Open-source software
---

## Background

Computational biology compounds a basic statistical problem at scale. A single differential-expression analysis executes tens of thousands of simultaneous hypothesis tests whose correction method depends on distributional assumptions that no analyst can verify per gene by hand, so parametric defaults are applied unchecked across whole expression matrices [1]. CRISPR strategy comparisons rank editing modalities (base editing, prime editing, homology-directed repair) using composite scores that are rarely checked for the normality a parametric ANOVA requires. Clinical trials require careful attention to randomization assumptions and intention-to-treat analysis [2]. Meta-analyses aggregate heterogeneous trial effects under random-effects models without always confirming the absence of publication bias [3]. Each of these pipelines is widely used in peer-reviewed computational biology; none of them, by default, stops to ask whether the test's assumptions hold.

The underlying issue is general. Parametric tests rely on assumptions about data distribution, variance structure, and independence of observations, and when these are violated, Type I and Type II error rates can deviate substantially from their nominal levels [4]. Zimmerman showed that heterogeneity of variance distorts the independent t-test's error rates, particularly when it coincides with unequal group sizes [5]; in the controlled benchmark reported below, an unbalanced 55-versus-36 design with unequal variances raises the equal-variance t-test's Type I error from a nominal 0.05 to 0.100. Yet these checks are seldom performed or reported. Jafari and Azuaje surveyed 293 gene-expression papers and found that only 3.5% of application papers stated any variance-homogeneity assumption behind their t-tests and ANOVAs [6]; Jones et al. examined 95 health-research papers using linear regression and found that 37% reported checking any of its assumptions, none checked all four, and of those that addressed normality most inspected the outcome variable rather than the residuals [7]. Observing 30 psychology doctoral students as they analysed prepared datasets, Hoekstra et al. found that normality was correctly checked in 12% of analyses and homogeneity of variance in 23% [8], and Keselman et al. found similar neglect in educational research [9]. When a violation is detected, transformation (e.g., Box-Cox [10]) or a nonparametric alternative is required, but neither is helpful if the diagnostic step is skipped in the first place.

This gap sits within a well-documented reproducibility crisis. Baker's survey of 1,576 scientists found that 70% had failed to reproduce another scientist's experiments, and more than half had failed to reproduce their own [11]. The Open Science Collaboration attempted to replicate 100 psychology studies and found that only 36% produced statistically significant results consistent with the originals [12]. Ioannidis argued that most published research findings are false, attributing this in part to underpowered studies, flexible analyses, and the misapplication of statistical methods [13].

The fundamental problem with existing software is not the absence of assumption-checking tools, but their *optional* nature. In traditional statistical software: (1) assumption tests are separate from analysis---users must explicitly request them; (2) warnings are advisory, not mandatory; (3) time pressure favors shortcuts; and (4) statistical training varies widely [8,10]. Optional validation tools, available for over 25 years, have not solved the reproducibility crisis because they rely on human vigilance, which is undermined by well-documented cognitive biases such as confirmation bias [14] and frequently fails under real-world conditions.

Several approaches have attempted to address statistical quality. Reporting guidelines such as CONSORT [2] and JARS-Quant [15] provide post-hoc checklists. Pre-registration platforms like OSF [16] address p-hacking but not assumption violations. The statcheck tool [17] detects statistical inconsistencies in published papers but operates post-hoc and covers a limited set of test statistics. Tools like papaja [18] automate APA-style reporting but do not validate assumptions.

StickForStats takes a fundamentally different approach: rather than providing assumption tests as optional add-ons, it integrates validation directly into the analysis pipeline through the Guardian system. **Assumptions are checked automatically before every statistical test, and violations are reported alongside results.** This represents a shift from optional validation (requiring user initiative) to default validation (requiring user opt-out). The same validator infrastructure extends to a manuscript-review pipeline that applies parallel checks to published papers with discipline-aware reporting profiles, enabling pre-peer-review statistical auditing rather than only author-time assurance. Beyond Guardian, StickForStats also provides survival analysis, meta-analysis, multiple testing correction, causal inference, and high-precision power analysis.

## Implementation

### Platform architecture

StickForStats follows a three-tier architecture (Fig. 1): a user interface layer (React 18 with Material-UI), an application layer (Django REST Framework with Guardian integration), and a data layer (PostgreSQL with Redis caching).

![**Fig. 1. StickForStats system architecture.** Three-tier design: user interface (React 18 with genomics workflow, AI advisor, and manuscript review modules), application layer (Django REST with Guardian integration, statistical engine, and genomics differential expression service), and data layer (PostgreSQL, Redis, Celery workers, file storage).](figures/fig1_architecture.png){ width=90% } Long-running analyses are offloaded to Celery workers backed by Redis. Python and R SDKs provide programmatic access.

### The Guardian system

The Guardian operates on a simple principle: **assumptions are checked automatically before every statistical test, and violations are reported alongside results.** When a user requests a statistical test, the Guardian middleware intercepts the request, selects the relevant validators, runs them, and computes a composite confidence score before the primary test executes (Fig. 2).

![**Fig. 2. Guardian validation workflow.** The Guardian identifies test requirements, runs the relevant subset of nine validators, calculates the composite confidence score for the report, and routes the analysis on violation severity---executing the requested test with a Guardian report when no violation is graded critical, and re-routing to an appropriate nonparametric alternative when one is. The nine validators are listed on the right.](figures/fig2_guardian_flowchart.png){ width=60% }

Guardian is designed around four principles: (1) *Comprehensiveness*---check the major statistical assumptions for each test type; (2) *Transparency*---report all validation results, not just failures; (3) *Actionability*---provide specific recommendations when violations occur; and (4) *Configurable protection*---block by default (Protected Mode), with expert override available (Expert Mode).

**Validator suite.** The nine validators and their methods are (full specifications in Additional file 1):

1. **Normality** --- Shapiro-Wilk [19] (n <= 5000) and Anderson-Darling [20] (n > 5000 or as confirmation).
2. **Variance homogeneity** --- Levene's test [21] with Brown-Forsythe median correction [22].
3. **Independence** --- Lag-1 Pearson autocorrelation on observation order, detecting temporal or spatial dependencies in observations. Distinct from the Durbin-Watson statistic [23], which is restricted to regression residuals; our implementation operates on the raw observation series and reports the inferential p-value from the Pearson test. Because it is computed over observation order, this check is informative only when the rows are a meaningful sequence (time points or spatial positions); for cross-sectional or omics matrices, whose sample order is arbitrary and may itself correlate with grouping, it is referred to study design rather than treated as a data-driven verdict. Accordingly, the genome-scale per-gene cascade in Case Study 4 does **not** use this validator---it cascades on normality and variance homogeneity, which are invariant to sample ordering.
4. **Outlier detection** --- Combined IQR fencing and Z-score method [24] with configurable sensitivity thresholds.
5. **Sample size adequacy** --- Rule-based thresholds calibrated per test type from power analysis literature [25].
6. **Modality** --- Kernel density estimation with Silverman bandwidth for multimodality detection.
7. **Linearity** --- R-squared comparison (linear vs. quadratic) with Wald-Wolfowitz runs test [26] and RESET test.
8. **Homoscedasticity** --- Breusch-Pagan test [27] on residuals from a fitted linear model.
9. **Shape similarity** --- Two-sample Kolmogorov-Smirnov test on median-centred groups, for the rank-based location tests. Mann-Whitney U and Kruskal-Wallis test stochastic dominance and become tests of location only if the groups share a common shape and differ by a shift, so the groups are first centred on their own medians --- removing the shift the test is about, robustly --- and the centred distributions compared. For k > 2 groups all pairs are compared with a Bonferroni-corrected alpha. Grading uses the KS statistic D as well as its p-value, because at large n a negligible shape difference attains a small p and at small n a gross one attains none.

Table 1 shows which validators are activated for the test types most often used in the biomedical setting this paper addresses.

**Table 1. Assumption requirements by test type.** Values are read from `GuardianCore.test_requirements`, not curated. The registry holds 25 entries; the rows below cover the seven test types exercised in this paper's case studies (Mann-Whitney and Kruskal-Wallis share a row because their requirements are identical), and Additional file 1 prints the complete table.

| Test | Norm | Var | Indep | Outl | Size | Modal | Linear | Homosc | Other |
|---|---|---|---|---|---|---|---|---|---|
| t-test | X | X | X | X | | | | | |
| ANOVA | X | X | X | X | | | | | |
| Pearson r | X | | | X | | | X | | |
| Regression | X | | X | | | | X | X | |
| Chi-square | | | X | | | | | | expected frequencies^a^ |
| Mann-Whitney / Kruskal-Wallis | | | X | | | | | | similar shapes^a^ |

^a^ Chi-square's expected-cell-frequency requirement is evaluated outside the validator registry, by a
dedicated contingency-table path applying Cochran's rule; on a 2x2 table with a small expected cell it
raises a critical violation and blocks the test. Shape similarity is validator 9 above. Neither
requirement is the sample-size validator.

The shape-similarity check is graded warning at most and never critical, so it informs the interpretation
of a rank test without blocking it. This is deliberate on two grounds. Statistically, differing shapes do
not invalidate Mann-Whitney U or Kruskal-Wallis; they invalidate the reading of a significant result as a
difference in medians, which is a caveat rather than a disqualification. Structurally, Guardian's
normality and variance validators recommend exactly these rank tests when a parametric assumption fails,
so a critical shape violation would block the test Guardian had just recommended and leave the user with
no permitted analysis.

Two further properties of the registry are worth stating, because a reader who inspects the code will
find them. First, `modality` is implemented and callable but is not activated by any test type, and
`sample_size` is reached only by the factor-analysis and PCA paths, so neither appears in the rows above.
Second, the t-test requirements are design-aware at call time: for a one-sample or paired design the
variance-homogeneity requirement is dropped, and for a paired design normality and outliers are assessed
on the paired differences rather than on the raw columns.

Each violation is graded critical, warning or minor, with weights w = 3.0, 2.0, 1.0 respectively, and Guardian summarises a report with a single composite confidence score

C = max(0, 1 - sum_{i in V} w_i / (W_max x 1.2)),  W_max = 3.0 |V|

where V is the set of violations actually raised---not the set of validators run---so W_max is the penalty those same violations would have carried had every one of them been critical. Because |V| cancels between numerator and denominator, C measures the *mean* severity of a report and is independent of how many violations it contains: a clean report scores 1.0, and reports whose violations are uniformly minor, warning or critical score 0.722, 0.444 and 0.167 respectively, at any count. Mixed-severity reports fall between those anchors (for a four-validator test, C takes one of thirteen values, the largest being 0.722). C is therefore an ordinal display summary rather than a calibrated probability, and the implementation documents it as such---"an internal heuristic, not a named statistic". It gates nothing. Routing is decided entirely by severity: an analysis proceeds if and only if no violation is graded critical, and the AutonomousCascadeEngine re-routes to a nonparametric alternative (Table 2) exactly when one is.

**Table 2. Alternative test recommendations when violations are detected.**

| Original test | Violation | Graded critical when | Test the engine executes instead |
|---|---|---|---|
| t-test | Normality | worst group p < alpha/10 **and** min n < 30 | Mann-Whitney U test |
| t-test | Variance | variance ratio > 4 | Mann-Whitney U test^a^ |
| t-test | Outliers | > 10% of observations flagged | no nonparametric target^b^ |
| ANOVA | Normality | worst group p < alpha/10 **and** min n < 30 | Kruskal-Wallis test |
| ANOVA | Variance | ratio > 4 **and** max n / min n > 1.5 | Kruskal-Wallis test^c^ |
| Pearson r | Normality | p < alpha/10 **and** n < 30 | Spearman's rho |
| Pearson r | Linearity | residual runs test significant, or R-squared gain > 0.10 | Spearman's rho |
| Regression | Homoscedasticity | Breusch-Pagan significant **and** residual variance ratio > 4 or < 0.25 | Spearman's rho^d^ |
| Regression | Independence | lag-1 autocorrelation significant with abs(r) > 0.5 | Spearman's rho^d^ |

A violation graded warning or minor does not re-route: the originally requested test executes and the Guardian report is returned alongside it. Two severity adjustments therefore change the outcome and not merely the label---a normality violation is downgraded one level once every group has n >= 30 (central limit theorem; Lumley et al. [xx]), and an ANOVA variance violation is downgraded once the design is balanced to within a 1.5:1 size ratio (Box [22])---so large balanced designs are executed parametrically with a report rather than re-routed.

^a^Welch's t-test is implemented and is the first alternative the engine tries, but it is not the endpoint for a variance violation in the present release: the Welch step is re-validated against the same t-test requirement set, the same violation is raised again, and the cascade continues to Mann-Whitney U.

^b^Yuen's trimmed t-test is available as a standalone robust estimator but is not wired into the cascade, which has no outlier-specific target.

^c^Welch's ANOVA is offered as advice by the test recommender but is not an executable target of the cascade.

^d^Spearman's rho is a rank correlation and does not return regression coefficients or standard errors. Heteroscedasticity-robust standard errors and generalized least squares are advisory recommendations in this release, not cascade targets.

### Software implementation

The backend is implemented in Python 3.11 with Django 4.2 and Django REST Framework 3.14. Statistical computations use NumPy 1.25 [28] for array operations, SciPy 1.11 [29] for statistical functions, statsmodels 0.14 [30] for regression diagnostics and GLMs, lifelines 0.27 for survival analysis, and scikit-learn 1.3 for machine learning utilities. An optional high-precision mode uses mpmath 1.3 [31] for 50-decimal-digit calculations, critical for validation studies and extreme-value computations where IEEE 754 double precision (approximately 15 significant digits) may be insufficient. The frontend uses React 18 with Material-UI 5 for the user interface, Recharts 3.2 for interactive visualizations including forest plots and volcano plots, and jStat 1.9 for client-side computations. Asynchronous processing uses Celery 5.3 with Redis 7 for long-running analyses without blocking the interface. The platform is containerized with Docker and deployed via Docker Compose with PostgreSQL 15 for relational storage, Redis for caching and task queues, Nginx for static file serving, and optional Prometheus/Grafana monitoring. Guardian's assumption checks are surfaced directly in the analysis interface alongside every result, making validation a visible default rather than an optional diagnostic (Fig. 3).

![**Fig. 3. Guardian assumption validation in the StickForStats web interface.** A two-sample t-test computed by the real backend at 50-decimal precision on a hosted instance of the platform. Before reporting results, Guardian's "Assumption Checks" panel evaluates each assumption and flags violations in place: for the non-normal input shown, normality and equal variance are flagged as violated and independence is referred to study design. Assumption status is presented as an integral, default part of every analysis rather than an optional post-hoc diagnostic.](figures/fig3_guardian_report.png){ width=92% }


### Genomics differential expression workflow

The genomics module performs per-gene differential expression analysis with Guardian assumption validation. For each gene in an uploaded expression matrix, the service checks normality (Shapiro-Wilk) and variance homogeneity (Levene's test) independently. The independence validator is deliberately not applied at genome scale: it tests for serial autocorrelation over observation order, which is not meaningful for an expression matrix whose sample order is arbitrary; both checks that do drive the cascade are functions of each group's values and are therefore invariant to how the samples are ordered. Genes passing both checks are tested with the independent t-test (two groups) or ANOVA (multiple groups); genes failing either check are automatically cascaded to Mann-Whitney U or Kruskal-Wallis. After all per-gene tests complete, Benjamini-Hochberg FDR correction is applied across all raw p-values. The module generates volcano plot data (log2 fold change vs. negative log10 adjusted p-value) for visualization. In testing with log-normal gene expression data (100 genes, 20 samples), Guardian cascaded 98% of genes to nonparametric tests due to normality violations---the expected behavior for typical expression data.


### Validation methodology

Reference calculations were performed independently in R 4.4.1 (metafor 4.8.0) and Python (SciPy, statsmodels) for all statistical tests. For each test in Table 4, `paper/replication/reference_agreement.py` posts a fixed dataset to the production API endpoint, computes the same statistic with the reference implementation, and reports the absolute difference, the number of agreeing significant digits and the distance in float64 units in the last place; it prints the exact version of every library it used, so a reviewer's re-run is self-documenting. Where StickForStats delegates a statistic to the reference library rather than computing it independently -- the Shapiro-Wilk statistic, and the p-values of the chi-square and Mann-Whitney tests -- Table 4 says so, because in those cases agreement is exact by construction and corroborates nothing. Meta-analysis results were cross-validated against R's metafor package 4.8.0 (DerSimonian-Laird estimator): given the same per-study standard errors, the pooled log odds ratio returned by the API agrees with `rma(method="DL")` to 13 decimal places (14.6 significant digits, 15 ULP), and every heterogeneity statistic to at least 11 decimal places. The shipped effect-size table records each study's variance rounded to six decimals, so a reader who supplies R with that `variance` column rather than the squared standard error will see agreement at five decimal places instead; the comparison above uses identical inputs on both sides. G*Power cross-validation of power-analysis output is planned but not yet wired in this release; the in-app validation toggle reports "not implemented" rather than a fake match, and the manuscript's validation summary therefore omits the power-analysis row. Seven Python scripts and one R script independently verify all reported values. Reproducibility scripts are provided in the repository under `paper/replication/`. For the retrospective-verification evaluation, the 20-article corpus was originally discovered in the PubMed Central open-access subset via an E-utilities query, and the resulting PMCID list is pinned in `paper/replication/manuscript_validation/manifest.json` alongside that query; `fetch_corpus.py` rebuilds the corpus by fetching those pinned identifiers directly, so a re-run returns exactly these 20 articles rather than whatever the query returns today. On re-fetching, all 20 articles returned with their inline statistics unchanged, differing from the archived texts only inside the leading journal metadata (PubMed Central has since added an NLM catalogue journal identifier to each), and the `validate_corpus` management command reproduced the archived per-claim results (`results.json`) exactly, article by article. Each recomputable claim's p-value was recomputed with SciPy and compared rounding- and inequality-aware against the reported value.


### Calibration benchmark

To test whether the assumption-driven cascade improves inferential calibration rather than merely changing decisions, we ran a Monte Carlo benchmark against a known ground truth, framed as an ablation of the assumption gate. In each replicate, 1,000 genes were simulated with 10% truly differentially expressed (a fixed effect added to the second group), and every method was evaluated on Type I error (raw p < 0.05 among null genes), false-discovery rate (Benjamini-Hochberg q < 0.05), and power. The "naive" baseline is the cascade's own parametric branch with the gate removed---an equal-variance Student's t-test applied to every gene---so the contrast isolates the value of the gate itself; a fixed always-Welch pipeline is included as a robust reference. Part A (continuous data, 100 datasets per condition) spanned six scenarios at both balanced (20 vs 20) and unbalanced (55 vs 36, matching Case Study 4) designs: normal equal-variance (S1), normal unequal-variance (S2), heavy-tailed t3 (S3), lognormal-skewed (S4), outlier-contaminated (S5), and unequal-variance-plus-heavy-tailed (S6). Part B (negative-binomial counts, dispersion 0.2, 1.5-fold change, 20 datasets) compared the cascade and naive t-test on log-CPM against edgeR (quasi-likelihood F-test) and DESeq2 (Wald test) on raw counts, executed via R 4.4.1 with edgeR 4.2.2 and DESeq2 1.44.0. All conditions used a fixed seed (20260706); scripts, result JSONs, and a full memo are in `paper/replication/verification/` (`calibration_partA_continuous.py`, `calibration_partB_countglm.py`, `calibration_partB_rmethods.R`).


### Guardian evaluation

Each Guardian validator was exercised on scenarios constructed with known properties. The generating script (`paper/replication/guardian_validator_evidence.py`) states its seed (20260804), sample sizes and library versions, and prints every value reported here. The normality and variance-homogeneity validators delegate directly to `scipy.stats.shapiro` and `scipy.stats.levene(center='median')` and return their statistic and p-value unchanged, so agreement with SciPy is exact by construction and is not itself evidence of correctness; what these scenarios record is the severity label and confidence score Guardian derives from those statistics. At n = 50 per group with seed 20260804: an Exponential(scale = 1) sample gave Shapiro-Wilk W = 0.8130, p = 1.77 x 10^-6^, classified WARNING (context-downgraded from CRITICAL because n = 50 affords central-limit robustness) with confidence score 0.583; two normal groups built with a 4:1 population variance ratio (SD 1 vs SD 2, realised sample ratio 2.55) gave Levene F = 7.9495, p = 0.0058, classified WARNING with confidence 0.583 and Welch's t-test recommended; and a purely quadratic relationship (y = x^2^ + Normal(0, 1), x = linspace(-3, 3, 50)) raised R-squared from 0.0013 for the linear fit to 0.8957 for the quadratic fit, an improvement of 0.894, classified CRITICAL with confidence 0.167, which blocked the requested Pearson correlation. These statistics are random variables and should be read as draws rather than as constants: over the ten consecutive seeds 20260804-20260813 they span W = 0.768-0.891 (normality rejected in 9 of 10 seeds), Levene F = 7.95-18.19 (rejected in 10 of 10), and R-squared improvement 0.816-0.914 (10 of 10). Edge-case testing confirmed that Guardian returns a report without raising for single observations, for identical values (zero variance), for n = 10^6^ per group (3.59-3.67 s over three repeats on macOS arm64; above n = 5000 the Anderson-Darling branch is taken), and for magnitudes up to 10^308^. Three limits of that handling are stated for completeness: empty input raises an uncaught IndexError in the outlier detector; at 10^308^ no exception is raised but NumPy emits overflow and invalid-value warnings and SciPy returns a NaN Shapiro-Wilk statistic; and because the violation test is `p < alpha`, a NaN p-value (which Levene's test returns for zero-variance or non-finite input) is recorded as a satisfied assumption rather than as undefined.


### Use of AI-assisted technologies

Generative AI (Claude, Anthropic) was used to assist both software development and the drafting of this manuscript. In software development, all AI-suggested code was reviewed by the authors, tested against reference implementations (SciPy, R), and validated through the project's continuous integration pipeline (more than 1,500 automated tests across backend and frontend, all required checks green). In manuscript preparation, AI was used for drafting and editing assistance; all text was reviewed and verified by the authors, and every statistical value was independently recomputed and checked against SciPy and R. No AI tool is listed as an author. The authors take full responsibility for the content, accuracy, and integrity of this work, including any portion produced with AI assistance.


## Results

### Biomedical analysis suite

**Meta-analysis.** Fixed-effects and random-effects models with DerSimonian-Laird [3], Paule-Mandel, and REML estimation. Heterogeneity assessment (Q, I-squared, tau-squared, H-squared), Egger's publication bias test [32], forest and funnel plots, subgroup analysis, meta-regression, and leave-one-out sensitivity analysis.

**Multiple testing correction.** Eight methods spanning FWER control (Bonferroni, Holm-Bonferroni, Hochberg, Sidak, Holm-Sidak) and FDR control (Benjamini-Hochberg [1], Benjamini-Yekutieli, Storey's q-value).

**Clinical trial manuscript review.** Parses PDF, LaTeX, and DOCX manuscripts, extracts statistical claims via a deterministic regex pattern library (no language model is used in extraction), and verifies each claim for internal consistency in the style of statcheck [17]. Seven validators assess statistical consistency (recomputing the reported p-value from the reported test statistic and degrees of freedom), multiple-testing correction reporting, effect-size completeness, power reporting, reproducibility (data/code/materials availability), methodological appropriateness, and reporting completeness. Discipline-aware profiles weight validators per CONSORT [2], STROBE, ICH-E9, and JARS-Quant [15] standards (Fig. 4).

![**Fig. 4. Manuscript review workflow.** The pipeline parses manuscripts in PDF/LaTeX/DOCX format, extracts statistical claims via a deterministic regex pattern library, verifies each claim against seven specialized validators with discipline-aware profiles (CONSORT, STROBE, ICH-E9, JARS-Quant), and produces a statistical quality report with severity-classified findings.](figures/fig4_manuscript_review.png){ width=85% }

**Additional analysis modules.** Beyond the components exercised in the case studies, StickForStats provides survival analysis (Kaplan-Meier, Cox proportional hazards, and log-rank testing via lifelines); causal inference (DAG-based adjustment-set identification, propensity-score matching, inverse-probability weighting, doubly robust estimation, difference-in-differences, and mediation); high-precision power and sample-size analysis at 50-decimal-digit precision via mpmath [31] (closed-form G*Power cross-validation [33] is planned---the in-app toggle currently reports "not implemented" rather than a fake match); 15+ effect-size measures (Cohen's d, Hedges' g, eta-squared, omega-squared, Cramer's V, NNT) with parametric, bootstrap, and noncentral-distribution confidence intervals; a natural-language SmartProfiler that detects variable types and data-quality issues, selects an appropriate test under full Guardian validation, and returns plain-language summaries; and a 45-rule Statistical Quality Score (0--100, across six categories) that scores any analysis or manuscript.

### Platform comparison

Table 3 compares StickForStats with existing statistical platforms on features relevant to assumption validation and biomedical research. The distinction we draw is deliberately narrow: SPSS, R, jamovi and JASP all provide assumption tests, and jamovi and JASP both expose them in a dedicated Assumption Checks panel for t-tests and ANOVA. What differs is the default. In every one of those tools the analyst must request the check; in StickForStats it runs unless the analyst opts out, its result is attached to the primary output, and a violation can reroute the analysis. Versions compared are the current releases at the time of writing (jamovi 2.7.30, JASP 0.98.1, R 4.4.1, SPSS 29). The platform ships nine Guardian validators (covered by 38 integration and middleware tests, plus 56 dedicated validator tests and 54 further tests asserting that Guardian refuses rather than certifies when it cannot check), seven manuscript validators, and 45 Statistical Quality Score rules across six categories, with an optional 50-decimal-digit precision mode. It is accessible through a web interface, Python and R SDKs, and a Manifest V3 browser extension. The test suite comprises more than 2,400 automated tests (1,427 backend, 1,031 frontend) executed in CI; at time of writing all required CI checks are green on the main branch.

**Table 3. Feature comparison: StickForStats vs. existing statistical platforms.**

| Feature | StickForStats | SPSS 29 | R 4.4 | jamovi 2.7 | JASP 0.98 |
|---|---|---|---|---|---|
| Assumption checks available | Yes | Yes | Yes (packages) | Yes | Yes |
| **Checks run by default, without being requested** | **Yes** | No | No | No | No |
| Violation reported alongside the result | Yes | No | No | Optional panel | Optional panel |
| Composite confidence score | Yes | No | No | No | No |
| Automatic re-routing to an alternative test | Yes | No | No | No | No |
| Machine-readable assumption audit trail | Yes | No | No | No | No |
| Manuscript statistical-consistency review | Yes | No | Via statcheck | No | No |
| Statistical Quality Score | Yes | No | No | No | No |
| Web-based interface | Yes | No | Via Shiny | jamovi Cloud | No |
| Programmatic API / scripting | Python + R SDKs, REST | Syntax, Python plug-in | Native | Rj module, R syntax | R Syntax Mode |
| Open source | Yes (MIT) | No | Yes | Yes | Yes |
| Optional 50-digit precision mode | Yes | No | Via Rmpfr | No | No |
| Code export (R / Python) | Yes | Syntax only | Native | R syntax | R syntax |

### Validation against reference implementations

All statistical calculations were validated against SciPy, statsmodels and R by calling StickForStats' own production API endpoints on fixed datasets and comparing the returned values with the reference implementations (`paper/replication/reference_agreement.py`, which prints every library version and every number it reports). Table 4 gives the measured per-test agreement.

**Table 4. Validation summary against reference implementations.**

| Test | Metric | Reference | StickForStats implementation | Measured agreement |
|---|---|---|---|---|
| t-test (independent) | t-statistic | SciPy `ttest_ind` | independent, 50-digit Decimal | 1 ULP (15.6 significant digits) |
| t-test (paired) | t-statistic | SciPy `ttest_rel` | independent, 50-digit Decimal | 1 ULP (16.0 significant digits) |
| ANOVA (one-way) | F-statistic | SciPy `f_oneway` | independent, 50-digit Decimal | 2 ULP (15.6 significant digits) |
| Pearson correlation | r | SciPy `pearsonr` | independent, 50-digit Decimal | 2 ULP (15.7 significant digits) |
| Spearman correlation | rho | SciPy `spearmanr` | independent (own mid-ranks, then own Decimal r) | 0 ULP: identical to the last bit |
| Chi-square test | chi-squared | SciPy `chi2_contingency` | statistic independent; p-value delegated to SciPy | 1 ULP (16.1 significant digits) |
| Mann-Whitney U | U-statistic | SciPy `mannwhitneyu` | statistic independent; p-value delegated to SciPy | difference exactly zero |
| Shapiro-Wilk | W-statistic | SciPy `shapiro` | delegated: StickForStats calls SciPy | exact by construction (no independent implementation to compare) |
| Linear regression | coefficients | statsmodels OLS; exact rational solution | independent, 50-digit mpmath | 440 ULP vs statsmodels (13.1 significant digits); against the exact solution StickForStats is correct to 47.1 digits and statsmodels to 13.1 |
| Meta-analysis | pooled log odds ratio | R metafor 4.8.0, `rma(method="DL")` | independent, float64 | 15 ULP: 13 decimal places (14.6 significant digits) |

Agreement is reported as the distance in float64 units in the last place (ULP) with the number of agreeing significant decimal digits in parentheses. Because the reference implementations return IEEE-754 binary64, which carries at most 15.95 significant decimal digits, no agreement against them can be measured beyond that ceiling; a row reported as 0 ULP is identical to the last bit of the reference value. Datasets are Fisher's Iris [34] (t-tests, ANOVA, Mann-Whitney, Shapiro-Wilk) and UCI Wine Quality, red [35] (correlations, chi-square, regression); the meta-analysis row uses the 16-trial intravenous-magnesium dataset of Case Study 3. All of these, and the script that produces every value in this table, are provided under `paper/replication/`.

### Case Study 1: CRISPR genome editing strategy comparison

To demonstrate StickForStats' integration with computational biology pipelines, we applied it to validate statistical assumptions in genome editing strategy scoring output from CRISPRArchitect v3 [36], a multi-nuclease, consequence-guided decision support framework for CRISPR genome editing strategy design developed by our group. CRISPRArchitect is not yet publicly released, so the scored output it produced is deposited with this article rather than regenerable by a reader; the 40 scored strategies analysed here are in `paper/replication/data/crispr_topsis_scores.json`. CRISPRArchitect evaluates base editing (BE), prime editing (PE), and homology-directed repair (HDR) strategies within a unified TOPSIS multi-criteria ranking system, scoring each strategy across six dimensions---safety, feasibility, complexity, risk, confidence, and consequence---with weights calibrated for iPSC therapeutic editing contexts. We used CRISPRArchitect's scoring engine to evaluate four editing modalities (ABE8e base editing, PE3 prime editing, HDR with ssODN, and HDR with cssDNA) across 10 pathogenic variants from disease-associated genes (HBB, LMNA, COL7A1, CFTR, DMD, PCSK9, SCN1A, PAH, NF1, TP53) (Fig. 5A). This case study demonstrates how StickForStats can serve as a statistical validation layer for downstream analysis of computational biology tool outputs; the composite scores by modality are summarized in Table 5.

**Table 5. TOPSIS composite scores by editing modality (mean +/- SD).**

| Modality | N | Mean | SD | Min | Max |
|---|---|---|---|---|---|
| ABE (base editing) | 10 | 0.587 | 0.024 | 0.561 | 0.615 |
| PE (prime editing) | 10 | 0.433 | 0.011 | 0.415 | 0.449 |
| HDR (ssODN) | 10 | 0.283 | 0.019 | 0.255 | 0.307 |
| HDR (cssDNA) | 10 | 0.123 | 0.019 | 0.095 | 0.160 |

**Traditional approach (ANOVA):** F = 1122.10, p = 1.34e-35. A researcher might conclude significant differences and stop here.

**Guardian-augmented approach:** Guardian ran the four checks its ANOVA path requires---normality, variance homogeneity, independence and outliers---and raised exactly one violation: a normality WARNING driven by the ABE group (Shapiro-Wilk W = 0.793, p = 0.012). Levene's test passed (p = 0.251), no outliers were flagged, and independence was referred to study design because the row order of the scoring output is not a measurement sequence. Composite confidence score = 0.444, the value the heuristic assigns to a warning-only report. Because the violation was warning-level rather than critical, Guardian executed the requested ANOVA with a report attached and recommended Kruskal-Wallis as the more robust alternative (Table 2); the Kruskal-Wallis H test yielded H = 36.59, p = 5.62e-08 with eta-squared H = 0.93 (unbiased form per Tomczak & Tomczak [37]; large effect). All six pairwise Mann-Whitney comparisons were significant after Benjamini-Hochberg correction (all adjusted p < 0.001). Base editing consistently achieved the highest composite scores (mean = 0.587), driven by its superior safety profile (safety = 1.0, no DSBs)---aligning with iPSC safety concerns regarding p53-mediated selection of TP53-mutant clones. This case study demonstrates that even highly significant ANOVA results (p = 10^-35^) should not exempt the analysis from assumption checking; Guardian catches the normality violation regardless of the effect magnitude.

### Case Study 2: UCI Wine Quality --- Correlation assumptions

We examined the correlation between alcohol content and quality rating (ordinal scale 3--9) in 1,599 red wines.

**Traditional approach:** Pearson r = 0.476, p = 2.83e-91.

**Guardian findings:** Composite confidence score = 0.444. Guardian raised three violations: a normality violation on the quality ratings (Shapiro-Wilk W = 0.858, p = 9.5e-36), automatically downgraded from critical to warning because n = 1,599 per variable brings central-limit robustness; a CRITICAL linearity violation, flagged by the residual runs test (p = 6.4e-10) even though the quadratic R-squared gain is only 0.1%; and a minor outlier flag (0.2% of observations). The critical linearity violation is what blocks the parametric route. Guardian recommended Spearman's rho for ordinal data. Spearman's rho = 0.479, p < 0.001---the correlation remains significant, but Spearman's is the appropriate measure for ordinal data.

### Case Study 3: IV magnesium for acute MI --- Publication bias

We re-analyzed the 16 randomized trials of intravenous magnesium for prevention of mortality after acute myocardial infarction collated by Egger and colleagues [32,38,39] --- the canonical pedagogical example for funnel-plot asymmetry. Fourteen small early trials suggested a substantial mortality reduction; LIMIT-2 (n = 2,316) confirmed benefit; the much larger ISIS-4 trial (n = 58,050) found no benefit. The dataset is shipped with the R `metafor` package as `dat.egger2001` and is reproduced verbatim in our replication directory.

**Traditional approach:** Random-effects pooled odds ratio = 0.483, 95% CI [0.329, 0.710], I² = 68.1%, Q = 47.06 (df = 15, p < 0.001) --- a researcher reading the pooled estimate alone would conclude that IV magnesium reduces mortality by about half.

**Guardian findings:** The meta-analysis path is not one of Guardian's assumption-checked test types, so no composite confidence score is produced for it. The publication-bias check is a separate diagnostic: Egger's regression test (intercept = -1.60, t = -5.78, df = 14, p < 0.001) --- the funnel plot is severely asymmetric, with smaller studies systematically reporting larger benefits. Guardian recommended sensitivity analysis, and the result is more pointed than a simple attenuation. Dropping the four smallest trials barely moves the pooled estimate (OR 0.483 to 0.526, 95% CI [0.351, 0.787]) because those four carry only 12.6% of the random-effects weight, and under two equally natural readings of "smallest" --- the four least precise, or the four with fewest events --- the pooled effect becomes marginally *stronger* (OR 0.482). What the sensitivity analysis actually shows is the opposite end of the distribution: restricting the pool to the four largest trials gives OR 0.896, 95% CI [0.646, 1.243], p = 0.51, and the largest single trial (ISIS-4) shows essentially no effect (log OR = 0.06). This case study illustrates Guardian's role in surfacing limit-bias issues *before* a researcher publishes a pooled estimate that subsequent large trials may overturn.

![**Fig. 5. Case study results.** (A) CRISPR genome editing strategy comparison showing TOPSIS composite scores across four modalities (ABE, PE, HDR-ssODN, HDR-cssDNA) for 10 pathogenic variants scored by CRISPRArchitect v3. Guardian detected a normality WARNING and recommended Kruskal-Wallis (p < 0.001). ABE achieves highest scores driven by DSB-free safety profile. (B) Random-effects meta-analysis forest plot of 16 RCTs of intravenous magnesium for acute myocardial infarction (Egger 1997 [32]; Sterne & Egger 2001 [38]; data: `metafor::dat.egger2001` [39]). Marker size indicates random-effects weight; the diamond shows the pooled estimate (OR = 0.483, 95% CI [0.329, 0.710]). Guardian detected severe funnel asymmetry via Egger's test (t = -5.78, p < 0.001) --- the small early trials over-estimated benefit relative to LIMIT-2 and ISIS-4.](figures/fig5_case_studies.png){ width=95% }

### Case Study 4: Synovial sarcoma RNA-seq --- per-gene assumption checking at scale

To exercise Guardian on a real high-throughput biology workflow we re-analysed GSE271517 [40], 91 bulk RNA-seq tumours from 55 synovial-sarcoma patients (Chen et al., *Adv Sci* 2024). The original authors deposited raw integer counts and described their downstream test selection in their Experimental Section (§5, "Statistics") verbatim:

> "The unpaired Student's t-test was used to analyze the comparison between two continuous variables and a normally distributed variable. Non-normally distributed variables were analyzed with the Mann-Whitney U test."

The paper does not specify how normality was tested per variable --- a sound principle applied informally. Case Study 4 evaluates what Guardian's per-gene normality cascade produces on the same data.

We compared primary tumours (n = 55) versus metastases (n = 36) using the platform's genomics differential-expression module. After filtering to 27,221 genes (>=10 reads in >=3 samples) and log2(CPM+1) transformation, two pipelines were run on the identical matrix: a naive parametric default (per-gene equal-variance Student's t-test) and the Guardian-augmented pipeline (per-gene Shapiro-Wilk + Levene, automatic cascade to Mann-Whitney U on violation, Benjamini-Hochberg FDR).

**Traditional approach (naive t-test):** 1,006 genes significant at q < 0.05.

**Guardian findings:** 24,391 normality violations and 2,394 variance heterogeneity violations rerouted **24,648 of 27,221 genes (90.55%)** off the default equal-variance t-test --- 24,391 (89.60%) to Mann-Whitney U on a normality failure, and the remaining 257 to Welch's t-test on a variance failure alone. 1,411 genes were significant at q < 0.05; 553 genes flipped verdict between the two pipelines (Fig. 6A). The flipped set splits into two qualitatively different groups:

* **Group A (Guardian rescued, n = 479):** genes where the naive t-test was just under-powered (median naive q = 0.07) but rank-based Mann-Whitney detected the consistent shift (median Guardian q = 0.04); median |log2FC| = 0.54, with 3% exceeding |log2FC| >= 1.
* **Group B (Guardian no longer significant, n = 74):** genes of comparable magnitude (median |log2FC| = 0.61 against 0.54 for Group A; 11% versus 3% exceeding |log2FC| >= 1), but whose apparent effect is frequently driven by a subset of extreme samples, and where the rank-based Mann-Whitney does not reach significance because most observations in the two groups overlap (Fig. 6B). The two groups are therefore distinguished by the *shape* of the evidence rather than by its magnitude. We deliberately do *not* label these false positives. For genes like these, count-based generalized linear models (DESeq2, edgeR)---the genomics standard, which model the count distribution directly rather than switching tests by a normality assumption---may call a substantial fraction genuinely differentially expressed. Group B therefore illustrates the *limit* of assumption-driven test switching: it surfaces a real disagreement between pipelines for the analyst to adjudicate, but a rank test is not a universal substitute for a count-based model. (A formal DESeq2/edgeR benchmark of this set is a planned, pre-registered follow-up.)

Both proliferation markers MKI67 (log2FC = +0.97, q = 0.019) and TOP2A (+0.94, q = 0.040) were significant in both pipelines and up-regulated in metastasis, consistent with the original paper's "Subtype I = hyperproliferative + metastatic" finding. The 89.60% normality-driven cascade rate is itself the headline: per-gene RNA-seq distributions on the log-CPM scale are intrinsically non-normal --- which is why the field has converged on count-based GLMs (DESeq2, edgeR) and why the original paper's principle ("t-test for normal variables; Mann-Whitney otherwise") is the right one. Guardian operationalises that principle automatically, at scale, without requiring the analyst to remember to run normality checks per variable.

![**Fig. 6. Guardian-augmented vs naive analysis on real RNA-seq (GSE271517 [40]).** (A) Volcano plot of all 27,221 filtered genes from the Primary-tumour vs Metastasis contrast (n = 55 vs 36). Each point is one gene and the x-axis is log2 fold change of metastasis relative to primary tumour, so positive values are higher in metastasis; colour indicates hit-list category at q < 0.05. Genes called by neither pipeline (light grey, n = 25,736) are shown for context. *Hit by both* (dark gray, n = 932) are detected by both pipelines. *Guardian only* (blue, n = 479; "Group A") are rescued by the Mann-Whitney cascade despite the naive t-test reporting q just above 0.05; they cluster around the threshold line at modest fold changes. *Naive only* (red, n = 74; "Group B") are called by the naive t-test but not by Guardian's rank-based Mann-Whitney; they have relatively large apparent fold changes often driven by a subset of samples (a pipeline disagreement, not confirmed false positives). (B) |log2 fold change| distribution for the two verdict-flipped groups. The two distributions largely overlap (Group A median 0.54, 3% with |log2FC| ≥ 1; Group B median 0.61, 11% with |log2FC| ≥ 1), so the groups are separated by the shape of the evidence rather than by effect magnitude: Group A genes show a consistent shift that the t-test was under-powered to detect on non-normal data, whereas Group B genes carry a comparable apparent shift that rests disproportionately on a few extreme samples and whose group distributions overlap more. These are the genes where an assumption-driven rank switch and a count-based GLM (DESeq2/edgeR) may disagree, so we report the disagreement for the analyst rather than labelling them false positives.](figures/fig6_genomics_case_study.png){ width=95% }

### Case study summary

**Table 6. Summary of case study findings.**

| Dataset | Violation | Impact | Guardian Recommendation |
|---|---|---|---|
| CRISPR strategies | Non-normality + small n | Unreliable ANOVA | Kruskal-Wallis |
| Wine | Non-normality (ordinal) | Inappropriate r | Spearman's rho |
| IV magnesium meta-analysis [32,38] | Publication bias (Egger p < 0.001) | Inflated pooled effect | Sensitivity analysis |
| Synovial sarcoma RNA-seq [40] | Non-normality per gene (89.60% of 27,221 genes) | 553 genes verdict-flipped (479 Guardian rescues; 74 outlier-influenced genes the rank cascade declines---a pipeline disagreement, not confirmed false positives; see Case Study 4) | Per-gene Mann-Whitney cascade |

In all four cases (Table 6), Guardian flagged a methodological issue and recommended an appropriate alternative. The first three cases preserved the primary conclusion under the corrected method; the fourth case quantifies how much the *gene list* changes when assumptions are checked at scale. Guardian ensures researchers are informed of these issues automatically.

### Calibration of the assumption-driven cascade

The case studies show that Guardian's rerouting *changes* analytical decisions; a natural question is whether it *improves* them. We ran a controlled simulation with a known ground truth that ablates the assumption gate: the baseline is the cascade's own parametric branch with the gate switched off (an equal-variance Student's t-test applied to every gene), compared against the full production cascade (1,000 genes per dataset, 10% truly differentially expressed, 100 datasets; Implementation). On continuous data at the case study's unbalanced 55-versus-36 design (Fig. 7A--C), the gate is neutral when assumptions hold (S1); it restores near-nominal Type I error and false-discovery rate where the ungated t-test inflates badly under *unbalanced* heteroscedasticity (S2: Type I 0.100 to 0.058, FDR 0.179 to 0.068, by routing to Welch's test); and it adds power under heavy-tailed, skewed, or outlier-contaminated data without inflating Type I (S3--S5, via Mann-Whitney). The gate is not universally optimal: under simultaneous heteroscedasticity *and* heavy tails (S6) it only partially controls error (Type I 0.080), because its normality-first routing sends most genes to the variance-sensitive Mann-Whitney test where a fixed Welch default (Fig. 7, teal) controls error in every scenario---a concrete, testable direction for a variance-aware cascade. On negative-binomial count data (Fig. 7D--E), all methods control the FDR at the 55-versus-36 design (DESeq2 is marginally above nominal at 20 versus 20, 0.062, within Monte-Carlo error at 20 datasets), but the field-standard count-based generalized linear models (edgeR, DESeq2) carry more power than the rank cascade on log-CPM (0.82 versus 0.74 at 55 versus 36 samples; roughly twofold at 20 versus 20), consistent with the Case Study 4 interpretation that count models may legitimately recover the outlier-influenced genes the rank cascade declines. Scripts and the full protocol are in `paper/replication/verification/`.

![**Fig. 7. Calibration of the Guardian cascade under known ground truth.** Monte Carlo benchmark framed as an ablation of the assumption gate (naive baseline = the cascade's own equal-variance parametric branch with the gate removed). (A--C) Continuous data at the unbalanced 55-versus-36 design across six assumption-violation scenarios (S1 normal equal-variance; S2 normal unequal-variance; S3 heavy-tailed t3; S4 lognormal-skewed; S5 outlier-contaminated; S6 unequal-variance plus heavy-tailed): (A) Type I error (raw p < 0.05), (B) false-discovery rate (BH q < 0.05), and (C) power, for the ungated t-test (grey), the full Guardian cascade (navy), and a fixed always-Welch reference (teal). The gate is neutral under S1, restores near-nominal Type I and FDR control under unbalanced heteroscedasticity (S2), and adds power under non-normality (S3--S5); under simultaneous heteroscedasticity and heavy tails (S6) it only partially controls error, whereas always-Welch controls Type I in every scenario. (D--E) Negative-binomial count data: (D) FDR and (E) power for the cascade and naive t-test on log-CPM versus edgeR and DESeq2 on raw counts; FDR is controlled at 55 versus 36 (DESeq2 reaches 0.062 at 20 versus 20, within Monte-Carlo error) while the count-based models carry more power than the rank cascade. In D and E, solid bars are the 55-versus-36 design and faded bars 20 versus 20; the bar-colour, shading and scenario-code keys are inset in the figure.](figures/fig7_calibration.png){ width=100% }

### Retrospective verification accuracy on published manuscripts

To evaluate the retrospective verification engine---the statcheck-style consistency checker that recomputes reported p-values from the reported test statistic and degrees of freedom (cf. [17])---we assembled a corpus of 20 open-access articles from PubMed Central that report inline APA-style statistics, identified by a fixed query and thereafter pinned by PMCID (Implementation; the fetch script, corpus manifest, and results are provided under `paper/replication/manuscript_validation/`). The engine extracted 1,104 candidate statistical claims, of which 459 carried a test statistic and 353 were fully specified (statistic, degrees of freedom, and p-value) and therefore recomputable. Recomputing each p-value with SciPy and comparing in a rounding- and inequality-aware manner (as statcheck does [17]), 320 of 353 recomputable claims (90.7%) were consistent and 33 were flagged for review (29 discrepancy-level and 4 decision-level).

Manual review of the 33 flagged claims, each read back against its source article (Table 7), shows that most are not author errors, and that a specific mechanism is identifiable in each case. Eleven were repeated-measures ANOVAs carrying a Greenhouse-Geisser or Huynh-Feldt sphericity correction: these articles report the *uncorrected*, or only partly corrected, degrees of freedom alongside the *corrected* p-value, so any tool that recomputes from the reported df necessarily disagrees---a limitation shared with statcheck, which flags eleven of the same claims. For the six flags in the corpus's sphericity-heaviest article (statcheck flags nine there, our engine six) we tested this explanation rather than asserting it: scaling both degrees of freedom by an epsilon from 1 down to the Greenhouse-Geisser lower bound of 1/df~1~ spans a p-interval that contains the reported value in all six cases. Seven were multiplicity-adjusted post-hoc comparisons within a single parenthetical family in one article, in which the reported value is a Tukey/Dunnett-adjusted p and is necessarily larger than the raw-statistic p the checker recomputes; across that family the reported-to-raw inflation ranges from 1.1-fold to 58.3-fold, and two of its members are not flagged at all. Two were p-values from a fitted mixed-effects (REML) model, which the printed F and degrees of freedom do not carry. Two were bounds printed as point values---a p = 0.001 and a p = 0.01 reported for hugely significant F statistics---where the significance decision is correct as printed. Four were near-misses at the article's own precision, agreeing with the recomputation to within two units of the last printed digit. The remaining seven were genuine recompute-versus-reported discrepancies surfaced for human review---internally inconsistent reports that the study design cannot explain---and three of them are demonstrable from the article's own numbers: one article reports the same result twice with different statistics, and the version that recomputes to the printed p identifies the other as a transcription error, while a second p-value has been carried from one F statistic onto a different one. The clearest case is a reported F(6, 128) = 6.8, p = 0.03 that recomputes to p approximately 3 x 10^-6^; that article never mentions sphericity, and even the maximally conservative Greenhouse-Geisser bound (epsilon = 1/6) yields p = 0.016, so no correction can produce the reported value. A second is an independent-samples t(91) = 2.28 reported at p = 0.050 that recomputes to p approximately 0.025. The exercise confirms that the engine recovers the large majority of correctly reported statistics, and that 26 of its 33 residual flags are explainable tool limitations rather than author errors---a distribution we report in full rather than obscure. We state explicitly that none of the four decision-level flags is a confirmed conclusion-altering error: two are accounted for by a sphericity correction and a multiplicity adjustment respectively, one is a mixed-effects model p, and the fourth is the knife-edge t(91) = 2.28 above, where the recomputed 0.025 in fact agrees with the article's own conclusion that the effect is significant and only the engine's treatment of p = 0.050 as non-significant creates the decision mismatch.

**Table 7. Classification of the 33 claims flagged in the 20-article verification corpus.** Each flag was read back against its source article and its p-value recomputed; counts sum to 33 (29 discrepancy-level + 4 decision-level flags). Per-flag evidence is in `paper/replication/manuscript_validation/TABLE7_CLASSIFICATION.md`.

| Class | Count | Interpretation |
|---|---|---|
| Sphericity-corrected RM-ANOVA (Greenhouse-Geisser / Huynh-Feldt) | 11 | Uncorrected or partly corrected df reported with the corrected p; a limitation shared with statcheck, which flags eleven of the same claims |
| Multiplicity-adjusted post-hoc p (Tukey / Dunnett) | 7 | Reported p is an adjusted pairwise value, not the raw-statistic p the checker recomputes; all seven form one post-hoc family in one article |
| Mixed-effects (REML) model p | 2 | Reported p comes from a fitted mixed-effects model, which the printed F and df do not carry |
| Bound printed as a point value (e.g. p = 0.001, p > 0.99) | 2 | A reporting floor or ceiling for a hugely significant or clearly null statistic; the significance decision is correct as printed |
| Near-miss at the article's printed precision | 4 | Recomputed and reported p agree to within two units of the last printed digit |
| Genuine recompute-vs-reported discrepancy | 7 | Internally inconsistent reports surfaced for human review, not confirmed errors |

To benchmark the engine against the field standard rather than report self-consistency alone, we ran statcheck 1.5.0 [17] on the same 20 articles (`paper/replication/statcheck_baseline.R`); the run reproduces byte-for-byte. statcheck yielded at least one checkable statistic in 14 of the 20 articles, extracting 266 in total and flagging 47 (17.7% of 266) as inconsistent, of which 2 were decision errors; our engine recovered checkable claims in all 20 articles, 353 in total, and flagged 33 (9.3% of 353), of which 4 were decision-level (Table 8). We report these two rates descriptively and not as error rates: their denominators differ, their flagging rules differ---our engine adds a flat +/-0.005 tolerance in its inequality branch that statcheck does not have---and no ground-truth adjudication of the full extraction exists for this corpus. On the 14 articles both tools read, per-article extraction agrees closely (for example 45 vs 45, 9 vs 9, 88 vs 86, 18 vs 18), and both share the same fundamental limitation---neither recovers a sphericity-corrected or multiplicity-adjusted p-value---which accounts for 18 of our 33 flags and 18 of statcheck's 47. Matching the two flag sets claim by claim, 27 are flagged by both tools, 6 by our engine only, and 20 by statcheck only. All 6 of ours lie in two articles from which statcheck extracts nothing. Of statcheck's 20, sixteen are one article's systematic "p > 0.001" typo where "p < 0.001" was clearly intended (the string occurs 34 times, 16 of them attached to an F statistic): statcheck flags every one and our engine flags none, which is a false negative on our side, because the flat +/-0.005 tolerance makes any "p > x" claim with x <= 0.005 unflaggable regardless of the significance decision. Three more are a statcheck formatting artefact---an identical claim is flagged when its p is written in scientific notation and not when it is written as a decimal---and the last is a "p = 0.000" treated as an exact zero. Applying the Table 7 adjudication symmetrically to both flag sets (`paper/replication/manuscript_validation/STATCHECK_COMPARISON.md`) leaves 4 genuine candidate inconsistencies for statcheck and 7 for our engine; on the 14 articles both tools read, these are the same four claims. The two tools therefore agree on 27 flags and on their causes, and the residual differences are attributable to extraction coverage on our side, one formatting bug on statcheck's, and one documented false-negative hole on ours.

**Table 8. Head-to-head on the same 20-article corpus (statcheck 1.5.0 vs the StickForStats engine), reported descriptively.** The two flag rates have different denominators and different flagging rules and are not error rates against ground truth; the overlap and adjudication rows are the comparable quantities. Our engine's 1,104 candidate claim spans and 459 statistic-bearing claims describe a different construct from statcheck's output and are deliberately not placed in the extraction row.

| Measure | statcheck 1.5.0 | StickForStats engine |
|---|---|---|
| Articles yielding at least one checkable statistic | 14 of 20 | 20 of 20 |
| Checkable (recomputable) statistics | 266 | 353 |
| Flagged inconsistent | 47 (17.7% of 266) | 33 (9.3% of 353) |
| of which decision-level (opposite sides of alpha) | 2 | 4 |
| Flags attributed to sphericity or multiplicity mechanisms | 18 | 18 |
| Flags attributed to an artefact of that tool | 3 (p in scientific notation) | 0 |
| Flagged by this tool only | 20 (16 are one "p > 0.001" typo cluster) | 6 (all in articles statcheck does not read) |
| Flagged by both tools | 27 | 27 |
| Genuine candidate inconsistencies after adjudication | 4 | 7 |

### Software testing and continuous integration

StickForStats maintains more than 2,400 automated tests (1,427 backend, 1,031 frontend) executed via GitHub Actions on every commit (per-suite counts in Additional file 1). The CI pipeline runs eleven jobs (a closed-beta gate, three lint, three test, an end-to-end suite, two Docker build/push, and a staging deploy) plus a separate security workflow with Trivy and CodeQL scanning. A Design Contract ensures that "no statistical result may exist without an explicit, traceable assumption context"---enforced by 160 Guardian-specific backend tests: 22 integration, 16 middleware, 56 validator unit tests, 12 math-correctness, 35 that assert Guardian refuses rather than certifies when it cannot check, and 19 on the shape-similarity validator. Zero lint errors across all codebases; residual lint warnings are held under a non-regression ratchet so the count cannot increase.

## Discussion

### Contributions in context

StickForStats' primary contribution is the Guardian system, which shifts assumption validation from optional (requiring user initiative) to default (requiring user opt-out). This design philosophy---"tools available if you remember" becomes "system alerts users to potential issues by default"---addresses the documented gap between best statistical practice and actual practice [8,9,10].

Beyond Guardian, the AI Statistical Advisor helps users navigate test selection and generates publication-ready methods sections following JARS-Quant guidelines [15]. The Paper Parser enables pre-submission quality checking, catching reporting errors before peer review. These components work together: Guardian ensures valid analyses, the Advisor helps report them correctly, and the Parser verifies compliance.

### Relevance to computational biology

The platform is particularly relevant to computational biology for several reasons. First, as demonstrated in Case Study 1, Guardian catches assumption violations in real genome editing workflows---the CRISPR strategy comparison using CRISPRArchitect v3 TOPSIS scores required nonparametric testing due to non-normality, which Guardian detected and resolved automatically. Second, the genomics differential expression module performs per-gene Guardian validation across entire expression matrices, automatically cascading to Mann-Whitney U for genes failing normality and applying Benjamini-Hochberg FDR correction---the standard genomics workflow. Third, the multiple testing correction module with eight FDR/FWER methods [1] is essential for high-throughput experiments, and the platform ensures corrections are applied correctly. Fourth, the clinical trial manuscript review capability directly addresses statistical misreporting in the medical literature [17], with discipline-specific profiles for CONSORT [2] and ICH-E9 compliance.

### Comparison with alternative approaches

Compared to R [41] and SciPy, StickForStats trades programming flexibility for the safety of automated assumption checking; numerical agreement with these reference implementations is summarized in Table 4, and the feature-level comparison across platforms in Table 3. Compared to JASP [42] and jamovi [43], which both expose assumption tests in an optional Assumption Checks panel, it offers the same GUI accessibility but runs those checks by default, attaches the verdict to the primary result, and can reroute the analysis on a violation; it also adds manuscript review. Compared to statcheck [17], StickForStats provides both prospective validation (before analysis) and retrospective verification (re-checking published statistics), whereas statcheck operates only retrospectively. Pre-registration platforms like OSF [16] address p-hacking but not assumption violations; Guardian complements pre-registration by intervening at the point of analysis.

### Limitations

We acknowledge several limitations. *Threshold dependence:* Guardian's severity classifications depend on fixed thresholds (e.g., p < 0.05 for warnings); Guardian mitigates this by reporting actual test statistics, not just classifications. *Power of assumption tests:* Small samples may miss real violations while large samples may flag trivial ones; Guardian considers sample size in severity classification. *Incomplete coverage:* Guardian's nine validators do not cover all possible assumptions---measurement reliability and selection bias may go undetected, though Guardian explicitly states which assumptions are checked. *Power of the shape check at small n:* the equal-shape validator for the rank tests compares median-centred distributions with a two-sample Kolmogorov-Smirnov test, and median-centring makes that comparison conservative---measured family-wise error on identically distributed groups is 0.4% at two groups against a nominal 5%. The cost is power exactly where the rank tests are most used. For two lognormal groups differing threefold in spread, the check flags the difference in 0.5% of 200 replicates at n = 12 versus 24, rising to 67% at n = 40 per group; for normal-versus-exponential groups it is 13% at n = 30, 93.5% at n = 120 and 100% at n >= 300. A clean shape result at small n therefore means the difference was not detected, not that the assumption holds, and the validator says so in that case only when a group falls below n = 5. This also means the check does not close the calibration gap identified below: the heteroscedastic non-normal genes that the cascade routes to Mann-Whitney sit at sample sizes where it rarely fires. *Independence and dependence structure:* the independence validator tests only lag-1 autocorrelation over observation order, which is arrangement-dependent and informative only for sequentially ordered data; it does not detect clustered or hierarchical dependence. Case Study 4 illustrates this limit---GSE271517 comprises 91 tumour samples from 55 patients (some contributing to both arms), with 10 of the 55 patients contributing samples to both arms, so the per-gene tests, reproducing the original authors' unpaired test selection, treat clustered observations as independent. The platform does not flag this structure, and the planned DESeq2/edgeR follow-up should adopt a patient-aware (mixed-model or patient-collapsed) design. *Expert Mode override:* Experienced statisticians can proceed despite critical violations, though warnings remain visible. *Retrospective verification scope:* the consistency checker recomputes p-values from the reported statistic and degrees of freedom, so---like statcheck---it cannot recover a legitimately reported sphericity-corrected (Greenhouse-Geisser/Huynh-Feldt) p-value, cannot reproduce a multiplicity-adjusted (e.g. Tukey/Dunnett) p when only the raw statistic is shown, and cannot reproduce a p-value that comes from a fitted mixed-effects (REML) model. A further limitation is specific to our implementation: its inequality branch applies a flat +/-0.005 tolerance, so any claim of the form "p > x" with x <= 0.005 is unflaggable regardless of the significance decision. In our 20-article evaluation the explainable cases accounted for 26 of the 33 flags (Table 7), and this tolerance cost us all 16 of one article's "p > 0.001" typos, which statcheck catches. Flagged items are therefore recompute-versus-reported discrepancies for human review, not confirmed errors; seven were genuine candidate reporting inconsistencies, and none of the four decision-level flags is a confirmed conclusion-altering error. *Calibration of the cascade:* the controlled benchmark (Fig. 7) shows that, relative to the ungated equal-variance t-test it replaces, the assumption gate restores near-nominal Type I and false-discovery control under unbalanced heteroscedasticity and adds power under non-normality, but it is not universally optimal: under simultaneous heteroscedasticity and heavy tails the cascade only partially controls error (a fixed always-Welch default does better across the board), and for count data the count-based generalized linear models (DESeq2/edgeR) remain more powerful at the same FDR. The one calibration gap has a clear cause---the cascade routes on normality first, sending heteroscedastic non-normal genes to the variance-sensitive Mann-Whitney test---so a variance-aware routing rule (prefer Welch, or a heteroscedasticity-robust rank test, whenever variances differ) is a natural improvement identified by the benchmark itself. The benchmark also does not yet perturb batch structure or zero-inflation, which remain useful extensions.

### Future directions

The platform ships five curated biological example datasets (CRISPR editing strategies, clinical trial survival, gene expression, epidemiological case-control, and dose-response) under `examples/biological_datasets/`, four of which are accompanied by runnable analysis vignettes under `examples/vignettes/`; a dose-response vignette is not yet written. Future work will expand the Bayesian analysis suite, add dose-response modeling for pharmacological studies, CONSORT flow diagram generation, and integrate with biological data repositories (GEO, ClinicalTrials.gov).

## Conclusions

StickForStats makes statistical assumption validation a default precondition of analysis rather than an optional diagnostic. Across four published biomedical datasets the Guardian pipeline flagged a methodological issue in every case and supplied an appropriate alternative, and at genome scale it rerouted 90.55% of 27,221 genes off the parametric default and changed the differential-expression verdict for 553 of them. A controlled benchmark shows where this helps and where it does not: the assumption gate restores near-nominal Type I error and false-discovery control under unbalanced heteroscedasticity and adds power under non-normality, but it is not universally optimal, and for count data the field-standard generalized linear models remain more powerful at the same false-discovery rate. Reported honestly, those limits are as informative as the gains: they identify variance-aware routing as the next concrete improvement. By making the assumption check automatic, transparent and auditable, StickForStats addresses a tractable and under-served contributor to irreproducible analysis, and it is MIT-licensed and openly available so that the routing rules themselves can be inspected and extended.

## Availability and requirements

- **Project name:** StickForStats
- **Project home page:** https://github.com/visvikbharti/stickforstats_new (hosted evaluation instance: https://stickforstats.com)
- **Archived version:** Zenodo concept DOI 10.5281/zenodo.21258381 (this article: v1.2.0, version DOI [PENDING-ZENODO-V120-DOI])
- **Operating system(s):** Platform-independent (Docker / Docker Compose; runs in any modern web browser)
- **Programming language:** Python (backend), JavaScript / React (frontend)
- **Other requirements:** Python >= 3.10, Django 4.2, PostgreSQL 15, Redis 7 (SciPy >= 1.11, NumPy >= 1.24, statsmodels 0.14, mpmath 1.3)
- **License:** MIT
- **Any restrictions to use by non-academics:** None


## List of abbreviations

ABE: adenine base editing; ANOVA: analysis of variance; APC: article-processing charge; BH: Benjamini-Hochberg; CI: confidence interval; CONSORT: Consolidated Standards of Reporting Trials; CPM: counts per million; DSB: double-strand break; FDR: false-discovery rate; FWER: family-wise error rate; GEO: Gene Expression Omnibus; GLM: generalized linear model; HDR: homology-directed repair; ICH-E9: International Council for Harmonisation guideline E9; iPSC: induced pluripotent stem cell; IQR: interquartile range; JARS-Quant: Journal Article Reporting Standards for Quantitative Research; log2FC: log2 fold change; MI: myocardial infarction; OR: odds ratio; PE: prime editing; RCT: randomized controlled trial; REML: restricted maximum likelihood; RNA-seq: RNA sequencing; SD: standard deviation; SDK: software development kit; STROBE: Strengthening the Reporting of Observational Studies in Epidemiology; TOPSIS: Technique for Order of Preference by Similarity to Ideal Solution; cssDNA: chemically synthesized single-stranded DNA; ssODN: single-stranded oligodeoxynucleotide.

## Declarations

### Ethics approval and consent to participate

Not applicable. This study analysed only publicly available, previously published, de-identified secondary datasets and involved no new human participants, human data, or animal subjects.


### Consent for publication

Not applicable.


### Availability of data and materials

StickForStats is open-source under the MIT license; the version described here (v1.2.0, release tag `v1.2.0`) is openly available at https://github.com/visvikbharti/stickforstats_new and is archived on Zenodo with the concept DOI https://doi.org/10.5281/zenodo.21258381 (which always resolves to the latest archived version; the snapshot for this article is v1.2.0, DOI [PENDING-ZENODO-V120-DOI]), providing a citable DOI for the published version. The platform is platform-independent (Docker / Docker Compose) and runs in any modern browser; the backend requires Python >= 3.10, Django 4.2, PostgreSQL 15, and Redis 7 (SciPy >= 1.11, NumPy >= 1.24, statsmodels 0.14, mpmath 1.3). A `Dockerfile` and `docker-compose.yml` provision the full stack. A Python client SDK and command-line interface are available on PyPI (`pip install stickforstats`, or `pip install stickforstats[cli]` for the `sfs` command); the SDK connects to a StickForStats backend---a local Docker deployment or a hosted instance---through its REST API. All datasets analysed in this article are public and previously published; the replication package (`paper/replication/`) contains the verification scripts, the master runner (`MASTER_VERIFICATION.py`), and the statcheck head-to-head (`statcheck_baseline.R`) with run instructions. Per-dataset sources are: Fisher's Iris (via scikit-learn); UCI Wine Quality (https://archive.ics.uci.edu/dataset/186/wine+quality); the IV-magnesium meta-analysis (Egger 1997 [32]; `metafor::dat.egger2001` [39]); synovial-sarcoma RNA-seq (NCBI GEO accession GSE271517; Chen et al. 2024 [40]); and the 20-article retrospective-verification corpus (PubMed Central open-access subset, the article texts are not redistributed because they carry their own licences, and `fetch_corpus.py` rebuilds them by fetching the PMCIDs pinned in `manifest.json`, which also records the original discovery query).


### Competing interests

The authors are the developers of CRISPRArchitect (reference [36]), the genome-editing strategy-design tool whose composite scores constitute the dataset analysed in Case Study 1; in that case study StickForStats was applied as an independent statistical-validation step on those scores. Neither author holds any patent, licensing arrangement, equity, or consulting income related to CRISPRArchitect, genome-editing technology, or a commercial version of StickForStats. The authors declare no other competing interests.


### Funding

The authors received no specific grant from any funding agency in the public, commercial, or not-for-profit sectors for this work. Infrastructure and administrative support were provided by the CSIR-Institute of Genomics and Integrative Biology.


### Authors' contributions

V.B. conceived and developed the software, designed and performed the analyses and case studies, and wrote the manuscript. D.C. supervised the project, provided resources, and revised the manuscript. Both authors read and approved the final manuscript.


### Acknowledgements

We thank CSIR-Institute of Genomics and Integrative Biology for infrastructure and administrative support. We thank the developers of NumPy [28], SciPy [29], statsmodels [30], lifelines, and mpmath [31] whose libraries form the computational foundation of StickForStats.

## References

1. Benjamini Y, Hochberg Y. Controlling the False Discovery Rate. J R Stat Soc B. 1995;57(1):289-300.
2. Schulz KF, Altman DG, Moher D. CONSORT 2010 Statement. BMJ. 2010;340:c332.
3. DerSimonian R, Laird N. Meta-Analysis in Clinical Trials. Control Clin Trials. 1986;7(3):177-188.
4. Zimmerman DW. A Note on Preliminary Tests of Equality of Variances. Br J Math Stat Psychol. 2004;57(1):173-181.
5. Zimmerman DW. Comparative power of Student t test and Mann-Whitney U test for unequal sample sizes and variances. J Exp Educ. 1987;55(3):171-174. doi:10.1080/00220973.1987.10806451
6. Jafari P, Azuaje F. An assessment of recently published gene expression data analyses: reporting experimental design and statistical factors. BMC Med Inform Decis Mak. 2006;6:27. doi:10.1186/1472-6947-6-27
7. Jones L, Barnett A, Vagenas D. Common misconceptions held by health researchers when interpreting linear regression assumptions, a cross-sectional study. PLoS One. 2025;20(6):e0299617. doi:10.1371/journal.pone.0299617
8. Hoekstra R, Kiers HAL, Johnson A. Are Assumptions of Well-Known Statistical Techniques Checked, and Why (Not)? Front Psychol. 2012;3:137.
9. Keselman HJ, et al. Statistical Practices of Educational Researchers. Rev Educ Res. 1998;68(3):350-386.
10. Osborne JW. Improving Your Data Transformations: Applying the Box-Cox Transformation. Pract Assess Res Eval. 2010;15(12):1-9.
11. Baker M. 1,500 Scientists Lift the Lid on Reproducibility. Nature. 2016;533(7604):452-454.
12. Open Science Collaboration. Estimating the Reproducibility of Psychological Science. Science. 2015;349(6251):aac4716.
13. Ioannidis JPA. Why Most Published Research Findings Are False. PLoS Medicine. 2005;2(8):e124.
14. Nickerson RS. Confirmation Bias: A Ubiquitous Phenomenon. Rev Gen Psychol. 1998;2(2):175-220.
15. Appelbaum M, et al. Journal Article Reporting Standards for Quantitative Research in Psychology. Am Psychol. 2018;73(1):3-25.
16. Nosek BA, Ebersole CR, DeHaven AC, Mellor DT. The Preregistration Revolution. Proc Natl Acad Sci. 2018;115(11):2600-2606.
17. Nuijten MB, Hartgerink CHJ, van Assen MALM, Epskamp S, Wicherts JM. The prevalence of statistical reporting errors in psychology (1985-2013). Behav Res Methods. 2016;48(4):1205-1226.
18. Aust F, Barth M. papaja: Prepare Reproducible APA Journal Articles with R Markdown. R package version 0.1.0.9997. 2020.
19. Shapiro SS, Wilk MB. An Analysis of Variance Test for Normality. Biometrika. 1965;52(3-4):591-611.
20. Anderson TW, Darling DA. A Test of Goodness of Fit. J Am Stat Assoc. 1954;49(268):765-769.
21. Levene H. Robust Tests for Equality of Variances. In: Contributions to Probability and Statistics. Stanford University Press; 1960:278-292.
22. Brown MB, Forsythe AB. Robust Tests for the Equality of Variances. J Am Stat Assoc. 1974;69(346):364-367.
23. Durbin J, Watson GS. Testing for Serial Correlation in Least Squares Regression. II. Biometrika. 1951;38(1/2):159-177.
24. Grubbs FE. Procedures for Detecting Outlying Observations in Samples. Technometrics. 1969;11(1):1-21.
25. Cohen J. Statistical Power Analysis for the Behavioral Sciences. 2nd ed. Hillsdale, NJ: Lawrence Erlbaum; 1988.
26. Wald A, Wolfowitz J. On a Test Whether Two Samples Are from the Same Population. Ann Math Stat. 1940;11(2):147-162.
27. Breusch TS, Pagan AR. A Simple Test for Heteroscedasticity. Econometrica. 1979;47(5):1287-1294.
28. Harris CR, et al. Array Programming with NumPy. Nature. 2020;585(7825):357-362.
29. Virtanen P, et al. SciPy 1.0: Fundamental Algorithms for Scientific Computing in Python. Nat Methods. 2020;17(3):261-272.
30. Seabold S, Perktold J. Statsmodels: Econometric and Statistical Modeling with Python. Proc 9th Python Sci Conf. 2010:92-96.
31. Johansson F. mpmath: A Python Library for Arbitrary-Precision Floating-Point Arithmetic. 2013.
32. Egger M, et al. Bias in Meta-Analysis Detected by a Simple, Graphical Test. BMJ. 1997;315(7109):629-634.
33. Faul F, et al. G\*Power 3: A Flexible Statistical Power Analysis Program. Behav Res Methods. 2007;39(2):175-191.
34. Fisher RA. The Use of Multiple Measurements in Taxonomic Problems. Ann Eugen. 1936;7(2):179-188.
35. Cortez P, et al. Modeling Wine Preferences by Data Mining. Decis Support Syst. 2009;47(4):547-553.
36. Bharti V, Chakraborty D. CRISPRArchitect v3: multi-nuclease, consequence-guided decision support for genome editing strategy design. Unpublished software, CSIR-Institute of Genomics and Integrative Biology; 2026. The tool is not yet publicly released; the scored output analysed here is deposited with this article (`paper/replication/data/crispr_topsis_scores.json`).
37. Tomczak M, Tomczak E. The need to report effect size estimates revisited. An overview of some recommended measures of effect size. Trends Sport Sci. 2014;1(21):19-25.
38. Sterne JAC, Egger M. Funnel Plots for Detecting Bias in Meta-Analysis: Guidelines on Choice of Axis. J Clin Epidemiol. 2001;54(10):1046-1055.
39. Viechtbauer W. Conducting Meta-Analyses in R with the metafor Package. J Stat Softw. 2010;36(3):1-48.
40. Chen Y, Su Y, Cao X, Siavelis I, Leo IR, Zeng J, Tsagkozis P, Hesla AC, Papakonstantinou A, Liu X, Huang W-K, Zhao B, Haglund C, Ehnman M, Johansson H, Lin Y, Lehtiö J, Zhang Y, Larsson O, Li X, de Flon FH. Molecular Profiling Defines Three Subtypes of Synovial Sarcoma. Adv Sci (Weinh). 2024;11(41):e2404510. doi:10.1002/advs.202404510. PMID: 39257029. PMCID: PMC11892499.
41. R Core Team. R: A Language and Environment for Statistical Computing. Vienna, Austria: R Foundation; 2023.
42. JASP Team. JASP (Version 0.98.1). 2026. https://jasp-stats.org/ (accessed 4 August 2026)
43. The jamovi project. jamovi (Version 2.7.30). 2026. https://www.jamovi.org/ (accessed 4 August 2026)
## Additional files

**Additional file 1 — Supplementary Information (PDF).** A single supporting document with five sections, all reproducible from the open-source repository (https://github.com/visvikbharti/stickforstats_new): (S1.1) Guardian validator specifications --- the nine validators, the assumption each checks, its statistical method, and the test-type-to-validator mapping; (S1.2) Programmatic access --- Python SDK (`pip install stickforstats`) and `sfs` CLI usage examples; (S1.3) Additional validation on standard R datasets --- Guardian results on `mtcars` (regression), `ToothGrowth` (two-sample t-test), and `PlantGrowth` (one-way ANOVA), reproducible via `paper/replication/additional_real_data_analysis.py`; (S1.4) Guardian test-suite coverage --- per-suite test counts (22 integration, 16 middleware, 46 validator-unit, 12 math-correctness backend tests; 25 component and 30 hook frontend tests); (S1.5) Performance benchmarks --- end-to-end API latency measured with a freshly drawn random data set for every request, so that no measured response is served from the API's response cache (100 requests per condition, the conditions interleaved on identical data; `paper/replication/benchmark_api.py`, which aborts if any measured response reports a cache hit), showing that enabling the in-endpoint assumption check adds a median of 1.0 ms to a Pearson correlation (2.2 to 3.2 ms), 1.8 ms to a two-sample t-test (25.4 to 27.2 ms) and 2.4 ms to a one-way ANOVA (23.1 to 25.5 ms), while a standalone Guardian pre-flight call to `/api/guardian/check/` has a median of 356 ms; the optional cross-language result-validation step is the dominant cost when requested (+108 ms on the t-test) because it shells out to R.

---
