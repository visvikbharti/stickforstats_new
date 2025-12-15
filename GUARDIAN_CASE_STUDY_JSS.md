# Guardian System Case Study for JSS Paper
## Authentic Example of Automatic Assumption Violation Detection

**Date:** December 15, 2025
**Purpose:** Demonstrate Guardian's automatic assumption checking with real data

---

## Case Study: Detecting Non-Normal Data Before T-Test

### The Scenario

A researcher wants to compare two groups using an independent t-test. However, Group 1 contains outliers that make the data severely non-normal.

### The Data

```
Group 1: [1.2, 1.5, 1.8, 2.0, 2.1, 2.3, 2.5, 15.0, 18.0, 25.0]
         (Note: Contains extreme values 15, 18, 25 - outliers)

Group 2: [3.1, 3.5, 3.8, 4.0, 4.2, 4.5, 4.8, 5.0, 5.2, 5.5]
         (Normally distributed)
```

### What Happens in Traditional Software

In SPSS, R, or GraphPad:
1. User runs t-test
2. Software computes t-statistic and p-value
3. User sees p = 0.33 → "Not significant"
4. **User never realizes the normality assumption was violated**
5. The result may be invalid

### What Happens in StickForStats

#### 1. User Submits T-Test Request
```bash
curl -X POST http://localhost:8000/api/v1/stats/ttest/ \
  -d '{"data1": [1.2,1.5,1.8,2.0,2.1,2.3,2.5,15.0,18.0,25.0],
       "data2": [3.1,3.5,3.8,4.0,4.2,4.5,4.8,5.0,5.2,5.5],
       "test_type": "independent"}'
```

#### 2. Guardian Automatically Runs Assumption Checks

**Normality Check (Shapiro-Wilk Test):**

| Group | Shapiro-Wilk W | p-value | Result |
|-------|----------------|---------|--------|
| Group 1 | 0.699 | **0.00086** | **VIOLATED** |
| Group 2 | 0.978 | 0.956 | Met |

**Equal Variance Check (Levene's Test):**

| Metric | Value | Result |
|--------|-------|--------|
| F-statistic | 3.20 | - |
| p-value | 0.091 | Met |

**Sample Size Check:**

| Metric | Value | Result |
|--------|-------|--------|
| n per group | 10 | Met (minimum: 2) |

#### 3. Guardian Issues Warning

```json
{
  "assumptions": {
    "normality_data1": {
      "is_met": false,
      "p_value": 0.00086,
      "warning": "Data significantly deviates from normal distribution"
    }
  }
}
```

#### 4. T-Test Results Still Provided (With Caveats)

```json
{
  "t_statistic": "0.9993",
  "p_value": "0.331",
  "assumptions_violated": ["normality_data1"]
}
```

### The Key Difference

| Aspect | Traditional Software | StickForStats + Guardian |
|--------|---------------------|--------------------------|
| Assumption checking | Manual (if user remembers) | **Automatic** |
| Warning system | None or optional | **Mandatory** |
| Violation detection | User must run separate tests | **Integrated** |
| Alternative suggestion | None | **Mann-Whitney U recommended** |

### Scientific Impact

Without Guardian, this researcher might:
1. Report p = 0.33 as "not significant"
2. Conclude "no difference between groups"
3. **Unknowingly base conclusions on invalid test**

With Guardian, the researcher:
1. Sees automatic normality warning
2. Knows the parametric test assumption is violated
3. Can choose to:
   - Transform the data
   - Remove outliers (with justification)
   - Use Mann-Whitney U test (non-parametric alternative)
4. **Makes informed statistical decision**

---

## Verification: The Data Is Indeed Non-Normal

### Visual Evidence (Descriptive Statistics)

**Group 1:**
- Mean: 7.14
- Median: 2.2
- SD: 8.07
- Skewness: High positive (mean >> median)

**Group 2:**
- Mean: 4.36
- Median: 4.35
- SD: 0.79
- Skewness: Near zero (mean ≈ median)

### Statistical Evidence

The Shapiro-Wilk test for Group 1:
- W = 0.699 (far from 1.0)
- p = 0.00086 (highly significant)

This confirms: **Group 1 is NOT normally distributed.**

---

## Alternative: Mann-Whitney U Test

Since normality is violated, the non-parametric Mann-Whitney U test is appropriate:

```bash
curl -X POST http://localhost:8000/api/v1/nonparametric/mann-whitney/ \
  -d '{"group1": [1.2,1.5,1.8,2.0,2.1,2.3,2.5,15.0,18.0,25.0],
       "group2": [3.1,3.5,3.8,4.0,4.2,4.5,4.8,5.0,5.2,5.5]}'
```

The Mann-Whitney U test does not assume normality and provides a valid comparison.

---

## Conclusion

This case study demonstrates Guardian's core value proposition:

1. **Automatic Detection**: No user action required
2. **Clear Warning**: "Data significantly deviates from normal distribution"
3. **Quantitative Evidence**: p = 0.00086 for Shapiro-Wilk test
4. **Informed Decision**: User can proceed knowingly or choose alternative

**This is the paradigm shift Guardian brings: from "tools available if you remember" to "system prevents incorrect usage."**

---

## Reproducibility

To reproduce this case study:

```python
# Test data
group1 = [1.2, 1.5, 1.8, 2.0, 2.1, 2.3, 2.5, 15.0, 18.0, 25.0]
group2 = [3.1, 3.5, 3.8, 4.0, 4.2, 4.5, 4.8, 5.0, 5.2, 5.5]

# Verify normality violation
from scipy.stats import shapiro
w1, p1 = shapiro(group1)
w2, p2 = shapiro(group2)
print(f"Group 1: W={w1:.3f}, p={p1:.6f}")  # Should show p << 0.05
print(f"Group 2: W={w2:.3f}, p={p2:.6f}")  # Should show p > 0.05
```

---

*Case study prepared with authentic data and results.*
*December 15, 2025*
