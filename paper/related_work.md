# StickForStats: Related Work Section (Draft for JSS)

## 2. Related Work

This section reviews the statistical software landscape, existing approaches to assumption validation, reproducibility frameworks, and high-precision computing in statistics. We position StickForStats within this context, identifying the specific gap that the Guardian system addresses.

### 2.1 Statistical Software Landscape

Statistical computing has evolved substantially since the introduction of early packages. We briefly review the major platforms relevant to our work.

**Commercial Packages.** SPSS (IBM, 1968) remains widely used in social sciences and provides comprehensive statistical tests including assumption diagnostics. SAS (SAS Institute, 1976) dominates in pharmaceutical and clinical research, offering extensive validation and audit trail capabilities. Stata (StataCorp, 1985) is popular in economics and epidemiology, known for reproducible scripting. GraphPad Prism (GraphPad Software, 1994) targets biomedical researchers with an emphasis on publication-quality graphics.

**Open-Source Platforms.** R (R Core Team, 1993) has become the *de facto* standard for statistical computing in academia, with over 19,000 packages on CRAN covering virtually every statistical method. Python's scientific stack—NumPy (Harris et al., 2020), SciPy (Virtanen et al., 2020), and statsmodels (Seabold & Perktold, 2010)—has gained significant traction, particularly in data science and machine learning contexts.

**Modern GUI Applications.** jamovi (The jamovi project, 2021) and JASP (JASP Team, 2023) provide user-friendly interfaces built on R, targeting researchers who prefer graphical workflows. These platforms have made statistical analysis more accessible while maintaining computational rigor.

All of these platforms provide assumption testing capabilities. SPSS includes Shapiro-Wilk and Kolmogorov-Smirnov tests for normality, Levene's test for homogeneity of variance, and various diagnostic plots. R offers even more extensive options through packages such as `car` (Fox & Weisberg, 2019), `nortest` (Gross & Ligges, 2015), and `lmtest` (Zeileis & Hothorn, 2002). The tools exist; they are not the problem.

### 2.2 The Optional Validation Problem

The critical observation is that in all major statistical platforms, assumption checking is **optional**. Users must explicitly request assumption tests, interpret their results, and decide whether to proceed. This design places the burden of statistical rigor entirely on the user.

Consider the typical workflow for an independent-samples t-test in SPSS:

1. User selects Analyze → Compare Means → Independent-Samples T Test
2. User specifies grouping variable and test variable
3. SPSS computes t-statistic and p-value
4. Results appear; analysis complete

Assumption testing requires additional steps:

5. User must remember to request Explore → Normality plots
6. User must separately request Levene's test (or check the option)
7. User must interpret these results
8. User must decide whether violations matter

Steps 5-8 are optional. Nothing in the software enforces them. A user can complete thousands of t-tests without ever checking a single assumption.

This is not a criticism of SPSS specifically—the same pattern holds across platforms. In R:

```r
# Complete t-test without any assumption checking
t.test(group1, group2)
```

The one-line command produces results. Assumption checking requires additional code that many users do not write.

**Why Optional Tools Fail.** The psychological and practical reasons for this failure are well-documented:

1. **Time pressure.** Hoekstra et al. (2012) found that researchers under deadline pressure were more likely to skip assumption checking and proceed directly to hypothesis tests.

2. **Confirmation bias.** Researchers may avoid assumption tests when they suspect violations might invalidate desired results (Nickerson, 1998).

3. **Statistical training gaps.** Surveys indicate that many researchers lack confidence in interpreting assumption test results (Hoekstra et al., 2014).

4. **The "robustness" rationalization.** A common justification is that parametric tests are "robust" to violations. While true for some violations with large samples, this is often invoked without verification (Zimmerman, 2004).

The result is a systematic gap between methodological standards and practice. Assumption testing tools have been available for decades, yet assumption violations remain a leading cause of statistical errors in published research.

### 2.3 The Reproducibility Crisis

The consequences of poor statistical practice are now well-documented. Baker (2016) surveyed 1,576 researchers across disciplines and found that 70% had failed to reproduce another scientist's experiments. When asked about contributing factors, respondents cited selective reporting (data selected to support hypothesis), pressure to publish, low statistical power, and poor statistical analysis.

Ioannidis (2005) provided a theoretical framework explaining why most published research findings may be false, identifying factors including low prior probability of true relationships, small effect sizes, flexibility in designs and analysis, and financial interests. While controversial, the paper catalyzed widespread attention to research reliability.

Empirical replication projects have confirmed these concerns. The Open Science Collaboration (2015) attempted to replicate 100 psychology studies and found that only 36% of replications produced significant results, compared to 97% of original studies. The Reproducibility Project: Cancer Biology (Errington et al., 2021) faced similar challenges, with many experiments proving difficult or impossible to replicate.

Statistical assumption violations contribute to this crisis in several ways:

1. **Inflated Type I error rates.** When normality assumptions are violated with small samples, actual false positive rates can substantially exceed nominal alpha levels (Wilcox, 2012).

2. **Reduced power.** Assumption violations can reduce statistical power, increasing Type II errors and contributing to underpowered studies.

3. **Biased effect size estimates.** Outliers and non-normality can distort effect size calculations, leading to irreproducible estimates.

4. **Invalid confidence intervals.** Parametric confidence intervals assume specific distributions; violations render coverage probabilities incorrect.

### 2.4 Existing Approaches to Statistical Quality

Several approaches have been proposed to improve statistical practice:

**Reporting Guidelines.** The EQUATOR network maintains reporting guidelines including CONSORT for trials, STROBE for observational studies, and PRISMA for systematic reviews. These guidelines recommend reporting assumption checks but cannot enforce them.

**Statistical Review.** Many journals employ statistical reviewers who check methodology. However, review occurs post-hoc, after data collection and initial analysis. Violations discovered at review stage may be difficult to address.

**Pre-registration.** Platforms like OSF (Open Science Framework) and AsPredicted allow researchers to pre-register analysis plans. While valuable for reducing analytical flexibility, pre-registration does not ensure assumption checking occurs.

**Automated Reporting.** Some tools generate automatic reports. The `report` package in R (Makowski et al., 2021) produces text summaries of statistical analyses. However, these reports describe results rather than validate assumptions.

**Educational Initiatives.** Statistical literacy programs aim to improve researcher training. While valuable long-term, education alone has not solved the immediate problem of assumption violations in current research.

None of these approaches address the fundamental issue: **assumption validation remains optional at the point of analysis.**

### 2.5 Automatic Validation: A Gap in the Literature

To our knowledge, no existing statistical platform implements mandatory, automatic assumption validation integrated directly into the analysis pipeline. The closest approaches include:

**GraphPad Prism's Normality Testing.** Prism offers an option to automatically test normality when running t-tests. However, this feature must be enabled in preferences, results appear in a separate table, and the analysis proceeds regardless of outcome.

**JASP's Assumption Checks.** JASP displays assumption check options within analysis panels, reducing the steps required. However, checks remain optional, and results are advisory rather than integrated into primary output.

**R's assertr Package.** The `assertr` package (Fischetti, 2021) allows users to define data validation pipelines that halt on violations. This is powerful but requires users to explicitly code validation rules—it is a tool for those who already prioritize validation.

The Guardian system differs from all of these in three key respects:

1. **Automatic execution.** No user action triggers assumption checking; it occurs for every analysis by default.

2. **Integrated reporting.** Assumption results appear in the same response object as statistical results; users cannot access their p-value without seeing assumption status.

3. **Actionable recommendations.** When violations are detected, specific alternative tests are recommended based on the nature of the violation.

### 2.6 High-Precision Computing in Statistics

Standard statistical software uses IEEE 754 double-precision floating-point arithmetic, providing approximately 15-17 significant decimal digits. For the vast majority of statistical calculations, this precision is more than adequate.

However, certain scenarios benefit from extended precision:

**Extreme p-values.** When p-values approach machine epsilon (~10^-16), standard precision cannot distinguish between very small values. This matters for multiple testing corrections and meta-analyses combining many studies.

**Iterative algorithms.** Maximum likelihood estimation, MCMC sampling, and optimization routines can accumulate rounding errors over many iterations. Extended precision can detect or prevent such accumulation.

**Numerical stability verification.** Comparing standard and extended precision results can reveal calculations near the limits of numerical stability.

**Exact reproducibility.** Platform-specific floating-point implementations can produce slightly different results. Extended precision provides a reference for cross-platform verification.

The `mpmath` library (Johansson, 2013) provides arbitrary-precision arithmetic in Python. The `Rmpfr` package (Maechler, 2019) offers similar capabilities in R. StickForStats leverages `mpmath` and Python's `decimal` module to provide optional 50-decimal-place precision.

We do not claim that 50-decimal precision is necessary for typical statistical analysis. Rather, it serves as a verification and audit tool, particularly valuable for published results where exact reproducibility is paramount.

### 2.7 Educational Integration

Statistical software has historically separated analysis tools from educational content. Users learn statistics from textbooks, courses, or online resources, then apply that knowledge in software.

Several platforms have begun integrating education:

**JASP's Learn Stats Module.** JASP includes educational resources and tutorials accessible from within the application, connecting conceptual learning with practical application.

**R's learnr Package.** The `learnr` package (Schloerke et al., 2020) enables interactive tutorials within RStudio, though these are separate from analysis workflows.

**DataCamp and Similar Platforms.** Online learning platforms combine instruction with coding exercises but are separate from production analysis environments.

StickForStats includes 50 interactive lessons covering statistical concepts from basic probability to advanced methods like factor analysis and survival analysis. Uniquely, these lessons are embedded within the analysis interface, enabling learning in the context of actual data analysis rather than in a separate educational environment.

### 2.8 Summary and Positioning

Table 1 summarizes how StickForStats compares to existing platforms across key dimensions.

| Feature | SPSS | R | GraphPad | JASP | StickForStats |
|---------|------|---|----------|------|---------------|
| Assumption tests available | Yes | Yes | Yes | Yes | Yes |
| Automatic execution | No | No | Optional | No | **Yes** |
| Integrated with results | No | No | No | Partial | **Yes** |
| Alternative recommendations | No | Manual | No | No | **Yes** |
| High-precision option | No | Via Rmpfr | No | No | **Yes (50 dec)** |
| Embedded education | No | Via learnr | No | Yes | **Yes (50 lessons)** |
| Code export | No | Native | No | No | **Yes (R/Python)** |

The contribution of StickForStats is not to provide new assumption tests—these exist in abundance. Rather, it is to change the **default behavior** of statistical software from "validation available if requested" to "validation performed automatically." This paradigm shift addresses the fundamental gap between statistical best practices and actual practice.

---

## References (to be formatted in JSS style)

Baker, M. (2016). 1,500 scientists lift the lid on reproducibility. *Nature*, 533(7604), 452-454.

Errington, T. M., et al. (2021). Investigating the replicability of preclinical cancer biology. *eLife*, 10, e71601.

Fischetti, T. (2021). assertr: Assertive Programming for R Analysis Pipelines. R package version 2.8.

Fox, J., & Weisberg, S. (2019). *An R Companion to Applied Regression* (3rd ed.). Sage.

Gross, J., & Ligges, U. (2015). nortest: Tests for Normality. R package version 1.0-4.

Harris, C. R., et al. (2020). Array programming with NumPy. *Nature*, 585(7825), 357-362.

Hoekstra, R., Kiers, H. A., & Johnson, A. (2012). Are assumptions of well-known statistical techniques checked, and why (not)? *Frontiers in Psychology*, 3, 137.

Hoekstra, R., Morey, R. D., Rouder, J. N., & Wagenmakers, E. J. (2014). Robust misinterpretation of confidence intervals. *Psychonomic Bulletin & Review*, 21(5), 1157-1164.

Ioannidis, J. P. A. (2005). Why most published research findings are false. *PLoS Medicine*, 2(8), e124.

Johansson, F. (2013). mpmath: A Python library for arbitrary-precision floating-point arithmetic.

Maechler, M. (2019). Rmpfr: R MPFR - Multiple Precision Floating-Point Reliable. R package.

Makowski, D., Ben-Shachar, M. S., Patil, I., & Lüdecke, D. (2021). Automated results reporting as a practical tool to improve reproducibility and methodological best practices adoption. *CRAN*.

Nickerson, R. S. (1998). Confirmation bias: A ubiquitous phenomenon in many guises. *Review of General Psychology*, 2(2), 175-220.

Open Science Collaboration. (2015). Estimating the reproducibility of psychological science. *Science*, 349(6251), aac4716.

Schloerke, B., Allaire, J. J., Borges, B., & Pruim, R. (2020). learnr: Interactive Tutorials for R. R package.

Seabold, S., & Perktold, J. (2010). Statsmodels: Econometric and statistical modeling with Python. *Proceedings of the 9th Python in Science Conference*, 57-61.

Virtanen, P., et al. (2020). SciPy 1.0: Fundamental algorithms for scientific computing in Python. *Nature Methods*, 17(3), 261-272.

Wilcox, R. R. (2012). *Introduction to Robust Estimation and Hypothesis Testing* (3rd ed.). Academic Press.

Zeileis, A., & Hothorn, T. (2002). Diagnostic checking in regression relationships. *R News*, 2(3), 7-10.

Zimmerman, D. W. (2004). A note on preliminary tests of equality of variances. *British Journal of Mathematical and Statistical Psychology*, 57(1), 173-181.

---

## Word Count

- Section 2.1: ~350 words
- Section 2.2: ~450 words
- Section 2.3: ~400 words
- Section 2.4: ~300 words
- Section 2.5: ~300 words
- Section 2.6: ~300 words
- Section 2.7: ~200 words
- Section 2.8: ~200 words

**Total: ~2,500 words (~6-7 pages)**

---

## Notes for Revision

1. **Balance:** Acknowledge that existing tools are capable; the issue is workflow design, not capability.
2. **Evidence:** Every claim about existing software should be verifiable.
3. **Honesty:** Do not overstate Guardian's novelty—it combines existing techniques in a new workflow.
4. **Table accuracy:** Verify each cell in the comparison table before publication.

---

*Draft prepared: December 15, 2025*
*Status: First draft, ready for review*
