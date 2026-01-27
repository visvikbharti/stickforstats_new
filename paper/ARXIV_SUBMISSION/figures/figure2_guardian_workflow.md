# Figure 2: Guardian Assumption Validation Workflow

## Description for Paper

Figure 2 illustrates the Guardian system's workflow for automatic assumption validation. When a user submits data for statistical analysis, the Guardian intercepts the request, identifies the required assumptions for the requested test, executes the appropriate validators, computes a confidence score, and determines whether to proceed with analysis or recommend alternative tests.

## ASCII Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GUARDIAN VALIDATION WORKFLOW                         │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌─────────────┐
    │   USER      │
    │  REQUEST    │
    │             │
    │ • Data      │
    │ • Test type │
    │ • Options   │
    └──────┬──────┘
           │
           ▼
    ┌─────────────────────────────────────────┐
    │         1. TEST REQUIREMENTS            │
    │            IDENTIFICATION               │
    │                                         │
    │   ┌─────────────────────────────────┐  │
    │   │ Test Type → Required Assumptions│  │
    │   ├─────────────────────────────────┤  │
    │   │ t-test    → Normality,          │  │
    │   │             Variance Homog.,    │  │
    │   │             Independence,       │  │
    │   │             Outliers            │  │
    │   │ ANOVA     → Normality,          │  │
    │   │             Variance Homog.,    │  │
    │   │             Independence        │  │
    │   │ Pearson r → Normality,          │  │
    │   │             Linearity,          │  │
    │   │             Outliers            │  │
    │   │ Chi-square→ Expected freq ≥5,   │  │
    │   │             Independence        │  │
    │   └─────────────────────────────────┘  │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │       2. PARALLEL VALIDATOR EXECUTION   │
    │                                         │
    │   ┌───────────┐  ┌───────────┐         │
    │   │ Normality │  │  Variance │         │
    │   │           │  │ Homogeneity│         │
    │   │ Shapiro-  │  │           │         │
    │   │ Wilk      │  │ Levene's  │         │
    │   │ Anderson- │  │ Bartlett's│         │
    │   │ Darling   │  │ Fligner-  │         │
    │   │ K-S       │  │ Killeen   │         │
    │   └─────┬─────┘  └─────┬─────┘         │
    │         │              │               │
    │   ┌───────────┐  ┌───────────┐         │
    │   │Independence│  │  Outliers │         │
    │   │           │  │           │         │
    │   │ Durbin-   │  │ IQR       │         │
    │   │ Watson    │  │ Method    │         │
    │   │           │  │ Mahalanobis│         │
    │   └─────┬─────┘  └─────┬─────┘         │
    │         │              │               │
    │         └──────┬───────┘               │
    │                │                       │
    └────────────────┼───────────────────────┘
                     │
                     ▼
    ┌─────────────────────────────────────────┐
    │     3. CONFIDENCE SCORE CALCULATION     │
    │                                         │
    │   Score = Σ (wᵢ × statusᵢ)              │
    │                                         │
    │   where:                                │
    │   • wᵢ = weight (golden ratio based)   │
    │   • statusᵢ ∈ {MET: 1, WARNING: 0.5,   │
    │                 VIOLATED: 0}            │
    │                                         │
    │   ┌─────────────────────────────────┐  │
    │   │ Example:                        │  │
    │   │ Normality:    MET (1.0)  × 0.38│  │
    │   │ Variance:     MET (1.0)  × 0.24│  │
    │   │ Independence: MET (1.0)  × 0.24│  │
    │   │ Outliers:     WARN(0.5) × 0.14│  │
    │   │ ─────────────────────────────  │  │
    │   │ Score = 0.93 (93% confidence)  │  │
    │   └─────────────────────────────────┘  │
    └──────────────────┬──────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │  SCORE ≥ 0.7?  │
              └───────┬────────┘
                      │
           ┌──────────┴──────────┐
           │                     │
           ▼                     ▼
    ┌─────────────┐       ┌─────────────┐
    │     YES     │       │     NO      │
    │             │       │             │
    │  PROCEED    │       │  RECOMMEND  │
    │  WITH TEST  │       │ ALTERNATIVE │
    └──────┬──────┘       └──────┬──────┘
           │                     │
           ▼                     ▼
    ┌─────────────┐       ┌─────────────────────┐
    │  EXECUTE    │       │ SUGGEST:            │
    │  REQUESTED  │       │                     │
    │  ANALYSIS   │       │ • Mann-Whitney U    │
    │             │       │   (if normality     │
    │ + Guardian  │       │    violated)        │
    │   Report    │       │ • Welch's t-test    │
    │             │       │   (if variance      │
    │             │       │    violated)        │
    │             │       │ • Transform data    │
    │             │       │ • Remove outliers   │
    └──────┬──────┘       └──────────┬──────────┘
           │                         │
           └───────────┬─────────────┘
                       │
                       ▼
    ┌─────────────────────────────────────────┐
    │            4. RESPONSE TO USER          │
    │                                         │
    │   {                                     │
    │     "test_results": {...},              │
    │     "guardian_report": {                │
    │       "assumptions_checked": [...],     │
    │       "violations": [...],              │
    │       "confidence_score": 0.93,         │
    │       "can_proceed": true,              │
    │       "alternatives": [...],            │
    │       "visual_evidence": {...}          │
    │     }                                   │
    │   }                                     │
    └─────────────────────────────────────────┘
```

## Flowchart Version (for conversion to vector graphics)

```
                    START
                      │
                      ▼
              ┌───────────────┐
              │ Receive Test  │
              │   Request     │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Identify Test │
              │  Requirements │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │ Run Validators│
              │  (Parallel)   │
              └───────┬───────┘
                      │
                      ▼
              ┌───────────────┐
              │   Calculate   │
              │ Confidence    │
              │    Score      │
              └───────┬───────┘
                      │
                      ▼
                 ╱         ╲
               ╱  Score ≥   ╲
              ╱    0.7?      ╲
              ╲             ╱
               ╲           ╱
                 ╲       ╱
                   ╲   ╱
            ────────┴────────
           │                 │
          YES                NO
           │                 │
           ▼                 ▼
    ┌─────────────┐   ┌─────────────┐
    │   Execute   │   │  Recommend  │
    │    Test     │   │ Alternative │
    └──────┬──────┘   └──────┬──────┘
           │                 │
           └────────┬────────┘
                    │
                    ▼
            ┌───────────────┐
            │ Return Results│
            │ + Guardian    │
            │   Report      │
            └───────────────┘
                    │
                    ▼
                   END
```

## Figure Caption

**Figure 2.** Guardian assumption validation workflow. When a statistical test is requested, the Guardian system: (1) identifies the assumptions required for that test based on a predefined mapping; (2) executes the appropriate validators in parallel, each running multiple statistical tests; (3) calculates a weighted confidence score using golden-ratio-based weights; and (4) either proceeds with the analysis (if score ≥ 0.7) or recommends alternative approaches. The response always includes both the statistical results and the complete Guardian report.

## Key Points for Paper

1. **Automatic execution**: No user action required to trigger validation
2. **Parallel processing**: Multiple validators run simultaneously for efficiency
3. **Weighted scoring**: Uses golden ratio (φ ≈ 1.618) for weight distribution
4. **Threshold-based decision**: Clear cutoff (0.7) for proceed/recommend
5. **Transparent reporting**: Full details provided regardless of decision

## Test-to-Assumption Mapping Table

| Test Type | Required Assumptions |
|-----------|---------------------|
| Independent t-test | Normality, Variance homogeneity, Independence, Outliers |
| Paired t-test | Normality (of differences), Independence, Outliers |
| One-way ANOVA | Normality, Variance homogeneity, Independence |
| Pearson correlation | Normality, Linearity, Outliers |
| Linear regression | Normality (residuals), Independence, Homoscedasticity, Linearity |
| Chi-square | Expected frequencies ≥ 5, Independence |
| Mann-Whitney U | Independence, Similar shapes |
| Kruskal-Wallis | Independence, Similar shapes |
