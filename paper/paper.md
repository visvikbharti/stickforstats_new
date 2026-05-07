---
title: 'StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation'
tags:
  - Python
  - Django
  - React
  - statistics
  - assumption validation
  - reproducibility
  - meta-analysis
  - power analysis
authors:
  - name: Vishal Bharti
    orcid: 0009-0003-1431-4457
    corresponding: true
    affiliation: 1
  - name: Debojyoti Chakraborty
    orcid: 0000-0003-1460-7594
    corresponding: true
    affiliation: "1, 2"
affiliations:
  - name: CSIR-Institute of Genomics and Integrative Biology, New Delhi 110025, India
    index: 1
  - name: Academy of Scientific and Innovative Research (AcSIR), Ghaziabad 201002, India
    index: 2
date: 9 April 2026
bibliography: paper.bib
---

# Summary

StickForStats is an open-source, web-based statistical analysis platform that
automatically validates the assumptions underlying every statistical test before
execution. Its core innovation is the Guardian system---a pipeline of eight
validators that intercept each analysis request, check assumptions such as
normality, variance homogeneity, independence, and outlier presence, and either
proceed with full confidence reporting or automatically cascade to an
appropriate nonparametric alternative. The platform pairs this validation layer
with a natural-language interface that lets researchers describe their question
in plain English, an autonomous test-selection engine, plain-language result
interpretation, and a manuscript review module that extracts and re-checks
statistical claims from uploaded papers. StickForStats is built with a Django
REST backend serving 195 API endpoints, a React frontend with 25 pages
supporting 16 languages, and optional Celery-based asynchronous processing for
long-running analyses.

# Statement of Need

Statistical assumption violations are pervasive in published research. Surveys
across psychology, education, and biomedicine consistently find that researchers
rarely verify the assumptions of the tests they apply [@hoekstra2012assumptions;
@keselman1998statistical]. When assumptions such as normality or homogeneity of
variance are violated, Type I and Type II error rates can deviate substantially
from their nominal levels [@zimmerman2004note], undermining the validity of
conclusions. The consequences compound at scale: the broader reproducibility
crisis in science has been attributed in part to widespread statistical
misapplication [@baker2016reproducibility; @ioannidis2005why;
@osc2015reproducibility].

Existing statistical software places the burden of assumption checking entirely
on the analyst. General-purpose environments such as R [@rcore2023] and Python's
SciPy [@virtanen2020scipy] require users to explicitly call separate diagnostic
tests and interpret the results themselves. GUI-based tools like JASP
[@jasp2023] and jamovi [@jamovi2023] simplify test execution but still leave
assumption verification as an optional, manual step. No widely adopted platform
currently intercepts the analysis pipeline to enforce assumption checking
automatically and transparently.

StickForStats addresses this gap. Its target users are researchers in the social,
behavioral, and biomedical sciences who regularly apply parametric statistical
tests but may lack the expertise or time to conduct comprehensive assumption
diagnostics. The platform is equally useful for statistics instructors who want
students to learn correct analytical workflows, and for journal editors and
reviewers who need to verify reported statistics in manuscripts.

# The Guardian System

The Guardian is a middleware layer that wraps every statistical test endpoint.
When an analysis request arrives, the Guardian selects the relevant subset of
its eight validators and runs them against the submitted data before the primary
test executes.

The eight validators and their methods are:

1. **Normality** --- Shapiro-Wilk [@shapiro1965analysis] and Anderson-Darling
   [@anderson1954test] tests on each group.
2. **Variance homogeneity** --- Levene's test [@levene1960robust] with
   Brown-Forsythe correction [@brown1974robust].
3. **Independence** --- Lag-1 Pearson autocorrelation on observation order.
   Distinct from the Durbin-Watson statistic [@durbin1951testing], which is
   restricted to regression residuals; our implementation operates on the raw
   observation series and reports the inferential p-value from the Pearson test.
4. **Outlier detection** --- Combined IQR fencing and modified Z-score method
   [@grubbs1969procedures].
5. **Sample size adequacy** --- Rule-based minimum thresholds calibrated per
   test type, informed by power analysis literature [@cohen1988statistical].
6. **Modality** --- Kernel density estimation with bandwidth selection to
   detect multimodal distributions.
7. **Linearity** --- Comparison of linear and polynomial $R^2$ values
   supplemented by the Wald-Wolfowitz runs test [@wald1940test].
8. **Homoscedasticity** --- Breusch-Pagan test [@breusch1979simple] for
   regression residuals.

Each validator returns a severity level (critical, warning, or minor) and a
weight ($w = 3.0, 2.0, 1.0$ respectively). The Guardian computes a composite
confidence score:

$$C = \max\!\Bigl(0,\; 1 - \frac{\sum w_i}{W_{\max} \times 1.2}\Bigr)$$

where $W_{\max}$ is the maximum possible penalty for the test type. A score
above 0.8 indicates the analysis can proceed with confidence; between 0.6 and
0.8 signals caution; below 0.6 triggers review. When any critical violation is
detected, the AutonomousCascadeEngine automatically re-routes the analysis to
the most appropriate nonparametric alternative (e.g., Mann-Whitney U for a
failed independent $t$-test) with full documentation of the decision path.

The Guardian system is validated by 38 automated tests (22 integration, 16
middleware) that run in continuous integration on every commit.

# Additional Capabilities

**Autonomous analysis pipeline.** The SmartProfiler module automatically detects
variable types, distributions, and data quality issues from uploaded datasets.
Combined with intent detection from natural-language queries, the platform
selects and executes the appropriate test without requiring the user to specify
it. Results are translated into plain-language summaries via a template-based
PlainLanguageTranslator.

**Manuscript statistical review.** StickForStats can parse PDF, LaTeX, and DOCX
manuscripts, extract statistical claims using a regex and LLM hybrid pipeline,
and re-check each claim for internal consistency in the style of STATCHECK
[@bakker2011misreporting]. Seven specialized validators assess completeness,
consistency, power reporting, multiple-comparison corrections, assumption
documentation, effect-size reporting, and reproducibility. Discipline-aware
profiles (medicine, psychology, economics) weight validators according to
field-specific reporting standards such as CONSORT [@schulz2010consort] and
JARS-Quant [@appelbaum2018jars].

**Comprehensive statistical coverage.** The platform implements parametric and
nonparametric tests, correlation and regression (including ridge and lasso),
categorical tests, meta-analysis with DerSimonian-Laird random effects
[@dersimonian1986meta] and Egger's publication bias test [@egger1997bias],
power analysis validated against G\*Power [@faul2007gpower], survival analysis,
factor analysis, causal inference (DAGs, propensity scores, mediation,
difference-in-differences), mixed models, and missing-data handling.

**High-precision computing.** An optional 50-decimal-digit precision mode using
mpmath [@johansson2013mpmath] is available for all core calculations, critical
for validation studies where floating-point accumulation matters.

**Statistical Quality Score.** Forty-five rules across six categories
(test selection, assumption reporting, effect sizes, confidence intervals,
multiple comparisons, reproducibility) produce an automated quality score
(0--100) for any analysis or manuscript.

# Validation

All statistical calculations are validated against SciPy [@virtanen2020scipy]
and R [@rcore2023] reference implementations. Parametric tests agree to 14--16
decimal places; meta-analysis results agree to 10 decimal places; power
analysis results agree with G\*Power within 1%. Reproducibility scripts and
reference datasets (Fisher's Iris [@fisher1936use], UCI Wine Quality
[@cortez2009wine]) are provided in the repository under `paper/replication/`.

# AI Disclosure

Development of StickForStats was assisted by Claude (Anthropic). All
AI-generated code was reviewed, tested against reference implementations, and
validated through the project's continuous integration pipeline (more than
1,500 automated tests across backend and frontend, all required checks green).
Statistical correctness was verified independently against SciPy, R, and G\*Power.

# Acknowledgements

We acknowledge CSIR-Institute of Genomics and Integrative Biology for
institutional support. We thank the developers of NumPy [@harris2020numpy],
SciPy [@virtanen2020scipy], statsmodels [@seabold2010statsmodels], and mpmath
[@johansson2013mpmath] whose libraries form the computational foundation of
StickForStats.

# References
