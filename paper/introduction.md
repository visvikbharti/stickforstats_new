# StickForStats: Introduction Section (Draft for JSS)

## 1. Introduction

### 1.1 The Reproducibility Crisis in Statistical Analysis

The scientific community faces a well-documented reproducibility crisis. In a landmark survey of 1,576 researchers, Baker (2016) found that more than 70% had failed to reproduce another scientist's experiments, and more than half had failed to reproduce their own experiments. When asked about the causes, approximately 50% of respondents cited "poor statistical analysis" as a contributing factor.

This crisis is not merely academic. Erroneous statistical conclusions have led to retracted medical studies, failed drug trials, and policy decisions based on unreliable evidence. Ioannidis (2005) provocatively argued that "most published research findings are false," attributing this to factors including low statistical power, small effect sizes, and flexibility in study designs and analytical methods.

A significant portion of these statistical errors stems from violation of test assumptions. Parametric tests such as the t-test and ANOVA require specific distributional assumptions—normality, homogeneity of variance, independence of observations—that are frequently violated in practice. When these assumptions are violated, the resulting p-values and confidence intervals may be unreliable, leading to incorrect conclusions.

### 1.2 The Inadequacy of Current Solutions

Statistical software packages have been available for decades. SPSS, first released in 1968, R in 1993, and GraphPad Prism in 1994, all provide comprehensive statistical analysis capabilities. These tools offer assumption testing—normality tests, variance homogeneity tests, and diagnostic plots are readily available.

Yet the reproducibility crisis persists.

The fundamental problem is not the absence of assumption-checking tools, but their *optional* nature. In traditional statistical software:

1. **Assumption tests are separate from analysis.** Users must explicitly request a Shapiro-Wilk test before running a t-test. Many do not.

2. **Warnings are advisory, not mandatory.** Even when assumption violations are detected, software proceeds with the analysis. The decision to heed warnings rests entirely with the user.

3. **Time pressure favors shortcuts.** Researchers facing publication deadlines may skip assumption checking, rationalizing that "the t-test is robust" or "the sample size is large enough."

4. **Statistical training varies widely.** Not all researchers have the background to recognize when assumptions matter and when violations can be safely ignored.

The result is a systematic gap between best statistical practice and actual practice. Optional validation tools, available for over 25 years, have not solved the reproducibility crisis because they rely on human vigilance that frequently fails under real-world conditions.

### 1.3 A Different Approach: Mandatory Validation

StickForStats takes a fundamentally different approach to statistical quality assurance. Rather than providing assumption tests as optional add-ons, the platform integrates assumption validation directly into the analysis pipeline through the Guardian system.

The Guardian system operates on a simple principle: **assumptions are checked automatically before every statistical test, and violations are reported alongside results.** This approach has three key characteristics:

1. **Automatic execution.** When a user requests a t-test, normality testing, variance homogeneity testing, and outlier detection occur automatically. No additional user action is required.

2. **Integrated reporting.** Assumption check results appear in the same response as statistical results. Users cannot see their p-value without also seeing assumption status.

3. **Actionable guidance.** When violations are detected, the system suggests appropriate alternatives—for example, recommending the Mann-Whitney U test when normality is violated for a t-test.

This design philosophy represents a paradigm shift from "tools available if you remember" to "system prevents incorrect usage by default."

### 1.4 Additional Contributions

Beyond the Guardian system, StickForStats offers several additional features designed to improve statistical practice:

**High-Precision Computing.** While standard statistical software uses IEEE 754 double-precision floating-point arithmetic (approximately 15 significant digits), StickForStats optionally provides 50-decimal-place precision for all calculations. This capability serves multiple purposes: detecting numerical instability in edge cases, ensuring exact reproducibility across platforms, and providing an audit trail for verification.

**Integrated Education.** The platform includes 50 interactive lessons covering power analysis, principal component analysis, confidence intervals, experimental design, probability distributions, and domain-specific applications in biophysics. Unlike separate tutorials, these educational modules are embedded within the analysis workflow, enabling learning in context.

**Reproducibility Framework.** Each analysis generates a complete reproducibility bundle including data fingerprints (SHA-256 hashes), processing pipeline records, decision point documentation, and environment specifications. These bundles enable exact replication and provide evidence for peer review.

**Code Export.** For every analysis, users can export equivalent R or Python code, facilitating verification and integration with existing workflows.

### 1.5 Contributions of This Paper

This paper makes the following contributions:

1. We introduce the Guardian system, an industry-first implementation of mandatory assumption validation in statistical software. We describe its architecture, the 15 validators implemented, and its integration with statistical analysis workflows.

2. We present a validation study comparing StickForStats results against established reference implementations (SciPy, R, G*Power 3.1), demonstrating agreement to 14+ decimal places for standard statistical tests.

3. We provide case studies demonstrating Guardian's effectiveness in detecting assumption violations that would otherwise go unnoticed.

4. We describe the high-precision computing architecture and discuss scenarios where 50-decimal precision provides practical benefits.

5. We release StickForStats as open-source software, freely available at [repository URL].

### 1.6 Paper Organization

The remainder of this paper is organized as follows. Section 2 reviews related work in statistical software and reproducibility tools. Section 3 describes the system architecture, including the technology stack and design principles. Section 4 presents the Guardian system in detail, covering its validators, confidence scoring, and alternative test recommendation. Section 5 describes the high-precision computing implementation. Section 6 presents validation results comparing StickForStats with reference implementations. Section 7 provides case studies demonstrating the system in practice. Section 8 discusses limitations and future work. Section 9 concludes.

---

## References (to be formatted in JSS style)

Baker, M. (2016). 1,500 scientists lift the lid on reproducibility. *Nature*, 533(7604), 452-454.

Cohen, J. (1988). *Statistical power analysis for the behavioral sciences* (2nd ed.). Lawrence Erlbaum Associates.

Faul, F., Erdfelder, E., Lang, A.-G., & Buchner, A. (2007). G*Power 3: A flexible statistical power analysis program for the social, behavioral, and biomedical sciences. *Behavior Research Methods*, 39(2), 175-191.

Ioannidis, J. P. A. (2005). Why most published research findings are false. *PLoS Medicine*, 2(8), e124.

Wasserstein, R. L., & Lazar, N. A. (2016). The ASA statement on statistical significance and p-values. *The American Statistician*, 70(2), 129-133.

---

## Word Count

- Section 1.1: ~250 words
- Section 1.2: ~300 words
- Section 1.3: ~250 words
- Section 1.4: ~200 words
- Section 1.5: ~150 words
- Section 1.6: ~100 words

**Total: ~1,250 words (~3 pages)**

---

## Notes for Revision

1. **Tone:** Academic but accessible. Avoid overselling.
2. **Claims:** Every claim should be supportable with evidence.
3. **Balance:** Acknowledge that Guardian is not a complete solution—it addresses assumption checking, not all sources of statistical error.
4. **Honesty:** Note limitations in Section 8, not hidden.

---

*Draft prepared: December 15, 2025*
*Status: First draft, ready for review*
