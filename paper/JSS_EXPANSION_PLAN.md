# JSS Paper Expansion Plan

**Target:** Journal of Statistical Software
**Current:** 10 pages
**Required:** 25-40 pages
**Gap:** +15-30 pages needed

---

## Section-by-Section Expansion Plan

### 1. Introduction (Current: ~1.5 pages → Target: 2 pages)
**Status:** Adequate, minor expansion needed
- Add 1-2 paragraphs on specific examples of assumption violations in published research
- Add brief mention of educational component

### 2. Related Work (Current: ~1 page → Target: 3 pages)
**Additions needed:**
- Detailed comparison with SPSS assumption testing workflow
- Detailed comparison with R packages (car, lmtest, nortest)
- Comparison with jamovi, JASP (modern alternatives)
- Comparison with Stata's diagnostic commands
- Table: Feature matrix comparing platforms

### 3. The Guardian System (Current: ~2 pages → Target: 5 pages)
**Additions needed:**
- Algorithm pseudocode for main Guardian pipeline
- Detailed description of each validator (currently just list)
- Decision tree for test selection
- Threshold justification and sensitivity discussion

### 4. System Architecture (Current: ~1 page → Target: 2 pages)
**Additions needed:**
- API endpoint documentation
- Database schema overview
- Security considerations

### 5. Code Examples (Current: ~0.5 pages → Target: 5 pages)
**NEW SECTION - Critical for JSS**
- Complete API usage tutorial
- Python client example
- curl command examples
- Response parsing examples
- Error handling examples

### 6. Validation (Current: ~1 page → Target: 4 pages)
**Additions needed:**
- More comprehensive test cases
- Edge case handling
- Numerical stability tests
- Performance benchmarks (speed, memory)

### 7. Case Studies (Current: ~1.5 pages → Target: 5 pages)
**CRITICAL CHANGE: Replace synthetic data with real data**
- Case Study 1: Fisher's Iris (classic, known issues)
- Case Study 2: Real published dataset (UCI or similar)
- Case Study 3: Meta-analysis with real studies

### 8. Limitations and Future Work (Current: ~0.5 pages → Target: 2 pages)
**Additions needed:**
- Honest limitations discussion
- What Guardian cannot detect
- Computational limitations
- Future validator plans

### 9. Conclusion (Current: ~0.5 pages → Target: 1 page)
**Status:** Adequate

---

## Content to Write

### A. Software Comparison Table (NEW)

| Feature | StickForStats | SPSS | R (base) | jamovi | JASP |
|---------|--------------|------|----------|--------|------|
| Automatic assumption checks | ✅ | ❌ | ❌ | ❌ | Partial |
| Integrated recommendations | ✅ | ❌ | ❌ | ❌ | ❌ |
| Confidence scoring | ✅ | ❌ | ❌ | ❌ | ❌ |
| Alternative test suggestions | ✅ | ❌ | ❌ | ❌ | ❌ |
| Web-based | ✅ | ❌ | ❌ | ❌ | ❌ |
| Open source | ✅ | ❌ | ✅ | ✅ | ✅ |
| Educational content | ✅ | ❌ | ❌ | Partial | ✅ |
| High-precision computing | ✅ | ❌ | Partial | ❌ | ❌ |

### B. Algorithm Pseudocode (NEW)

```
Algorithm: Guardian Validation Pipeline

Input: data, test_type, alpha
Output: GuardianReport

1. IDENTIFY required assumptions for test_type
2. FOR EACH assumption IN required_assumptions:
     a. SELECT appropriate validator
     b. RUN validator(data, alpha)
     c. IF violation detected:
          - Record violation details
          - Assign severity (critical/warning/minor)
          - Generate recommendation
3. CALCULATE confidence_score from violations
4. DETERMINE can_proceed (confidence > threshold)
5. IF NOT can_proceed:
     - SUGGEST alternative tests
6. GENERATE visual evidence (Q-Q plots, residual plots)
7. RETURN GuardianReport
```

### C. Real Data Case Study: Fisher's Iris

**Why Iris?**
- Universally known dataset
- Has documented assumption issues
- Perfect for demonstrating Guardian value

**Analysis Plan:**
1. Load Iris data (150 samples, 4 features, 3 species)
2. Attempt ANOVA: sepal_length ~ species
3. Guardian detects:
   - Normality: Setosa passes, others borderline
   - Variance homogeneity: Groups have different variances
   - Sample size: Adequate (50 per group)
4. Compare: Traditional ANOVA output vs Guardian-augmented output

### D. Expanded Validator Descriptions

**NormalityValidator:**
- Tests: Shapiro-Wilk (n < 5000), Anderson-Darling
- Threshold: p < 0.05 flags warning, p < 0.01 flags critical
- Visual: Q-Q plot with confidence bands
- Recommendation: Consider non-parametric alternatives or transformation

**VarianceHomogeneityValidator:**
- Tests: Levene's (robust), Bartlett's (sensitive)
- Threshold: p < 0.05 flags warning
- Recommendation: Welch's correction or non-parametric test

[Continue for all 8 validators...]

### E. Limitations Section (Honest)

**What Guardian Does NOT Do:**
1. Cannot detect measurement error in original data
2. Cannot validate study design (sampling, randomization)
3. Cannot detect publication bias (except in meta-analysis)
4. Limited to implemented tests (8 validators, not exhaustive)

**Computational Limitations:**
1. Large datasets (n > 100,000) may have slow validation
2. High-precision mode increases computation time
3. Web-based architecture adds network latency

**Statistical Limitations:**
1. Threshold values (0.05, 0.7) are conventional, not optimal
2. Multiple testing correction not applied to validator p-values
3. Some validators assume specific data structures

---

## Writing Schedule

| Section | Estimated Pages | Priority |
|---------|-----------------|----------|
| Real Data Case Study | 3-4 | Critical |
| Code Examples | 4-5 | Critical |
| Software Comparison | 1-2 | High |
| Algorithm Pseudocode | 2 | High |
| Expanded Validation | 2-3 | High |
| Limitations | 1-2 | High |
| Related Work Expansion | 1-2 | Medium |
| **TOTAL** | **14-20** | |

---

## Files to Modify

1. `paper/stickforstats.tex` - Main paper
2. `paper/references.bib` - Add new citations
3. `paper/figures/` - Add new figures if needed

---

*Plan created: December 16, 2025*
*Target: JSS submission*
