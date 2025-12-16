---
title: 'StickForStats: A Statistical Analysis Platform with Automatic Assumption Validation'
tags:
  - Python
  - Django
  - React
  - statistics
  - assumption testing
  - reproducibility
  - Guardian system
  - statistical software
authors:
  - name: Vishal Bharti
    orcid: 0000-0000-0000-0000
    affiliation: "1, 2"
  - name: Debojyoti Chakraborty
    orcid: 0000-0000-0000-0000
    corresponding: true
    affiliation: "1, 2"
affiliations:
  - name: Division of Chemical and Systems Biology, CSIR-Institute of Genomics and Integrative Biology (IGIB), New Delhi 110025, India
    index: 1
  - name: Academy of Scientific and Innovative Research (AcSIR), Ghaziabad 201002, India
    index: 2
date: December 2025
bibliography: paper.bib
---

# Summary

StickForStats is a web-based statistical analysis platform designed to address a critical gap in statistical software: the automatic validation of statistical assumptions before analysis execution. The platform introduces the Guardian system, which automatically runs assumption checks and integrates validation results directly into analysis output, helping researchers avoid common statistical errors that contribute to the reproducibility crisis in science.

# Statement of Need

Statistical assumption violations are a significant contributor to irreproducible research findings [@ioannidis2005]. While assumption tests exist in all major statistical packages (SPSS, R, Stata, SAS), users must explicitly request them, and studies show that many researchers do not [@hoekstra2014]. This creates a gap where analyses are performed on data that violates the underlying mathematical assumptions, potentially leading to incorrect conclusions.

To our knowledge, no existing mainstream statistical platform automatically validates assumptions and integrates the results into the analysis output. StickForStats fills this gap with the Guardian system, which makes assumption checking mandatory and transparent.

# The Guardian System

Guardian is an automatic assumption validation system that runs alongside every statistical analysis. It implements eight validators:

1. **Normality Validator**: Shapiro-Wilk and Anderson-Darling tests
2. **Variance Homogeneity Validator**: Levene's and Bartlett's tests
3. **Independence Validator**: Durbin-Watson and runs tests
4. **Outlier Detector**: IQR method, modified Z-score, and Grubbs' test
5. **Sample Size Validator**: Checks adequacy for statistical power
6. **Modality Detector**: Identifies multimodal distributions
7. **Linearity Validator**: Assesses linearity for regression analyses
8. **Homoscedasticity Validator**: Breusch-Pagan and White tests

Each validator produces a confidence score (0-100), and Guardian aggregates these into an overall readiness assessment. When issues are detected, Guardian provides specific recommendations and, where appropriate, suggests data transformations.

# Key Features

- **Automatic assumption validation**: Every analysis includes Guardian validation
- **High-precision computing**: 50 decimal place precision via mpmath for edge cases
- **Educational integration**: 58 interactive lessons teaching statistical concepts
- **Code export**: Python code generation for reproducibility
- **Validated computations**: Agreement with SciPy to 14+ decimal places

# Software Architecture

StickForStats uses a Django REST backend with a React frontend. The Guardian system is implemented as middleware that intercepts analysis requests, performs validation, and augments responses with assumption status. This architecture ensures that users cannot bypass assumption checking.

# Validation

StickForStats computations have been validated against SciPy reference implementations. The validation suite (`paper/replication/run_all_validations.py`) demonstrates agreement to 14+ decimal places for t-tests, ANOVA, correlation coefficients, and meta-analysis pooled effects.

# Availability

StickForStats is available as open-source software at https://github.com/visvikbharti/stickforstats_new under the MIT license. Documentation, installation instructions, and contribution guidelines are included in the repository.

# Acknowledgements

We acknowledge CSIR-IGIB for infrastructure support.

# References
