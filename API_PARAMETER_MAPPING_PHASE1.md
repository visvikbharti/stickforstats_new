# 📋 API PARAMETER MAPPING DOCUMENT - PHASE 1
## StickForStats v1.0 - API Standardization
## Date: September 29, 2025

---

## 🎯 OBJECTIVE
Standardize all 46 statistical test API endpoints with consistent, scientifically accurate parameters.

---

## 📊 PARAMETER MAPPING ANALYSIS

### 1. T-TEST ENDPOINTS (`/api/v1/stats/ttest/`)

#### CURRENT IMPLEMENTATION (Discovered):
```json
{
  "test_type": "one_sample|two_sample|paired",  // ✓ Correct
  "data1": [array],                              // ✓ Correct
  "data2": [array],                              // ✓ Correct (when needed)
  "alternative": "two_sided|less|greater",       // ✓ Optional
  "confidence_level": "95",                      // ✓ String format
  "hypothesized_mean": "100",                    // ✓ For one_sample
  "parameters": {},                               // ✓ Additional params
  "options": {}                                   // ✓ Processing options
}
```

#### TEST SUITE SENDING (Incorrect):
```json
{
  "test_type": "independent",  // ✗ Should be "two_sample"
  "data1": [array],
  "data2": [array],
  "test_type": "one-sample",  // ✗ Should be "one_sample" (underscore)
  "mu": 100                    // ✗ Should be in parameters or hypothesized_mean
}
```

#### FIXES NEEDED:
1. Map "independent" → "two_sample"
2. Map "one-sample" → "one_sample"
3. Map "mu" → "hypothesized_mean" or parameters.mu

---

### 2. ANOVA ENDPOINTS (`/api/v1/stats/anova/`)

#### EXPECTED PARAMETERS:
```json
{
  "data": [[group1], [group2], [group3]],  // List of lists
  "groups": ["A", "B", "C"],               // Group labels (optional)
  "test_type": "one_way|two_way|repeated", // Type of ANOVA
  "factors": {},                            // For two-way ANOVA
  "repeated": true/false                    // For repeated measures
}
```

#### TEST SUITE SENDING:
```json
{
  "data": [[array1], [array2], [array3]],  // ✓ Correct format
  "repeated": true                         // ✓ For repeated measures
}
```

---

### 3. NON-PARAMETRIC ENDPOINTS

#### Mann-Whitney U Test (`/nonparametric/mann-whitney/`)
**CURRENT EXPECTS:**
```json
{
  "group1": [array],  // ✗ Should accept data1/data2 too
  "group2": [array]
}
```

**TEST SUITE SENDS:**
```json
{
  "data1": [array],
  "data2": [array]
}
```

#### Wilcoxon Signed-Rank (`/nonparametric/wilcoxon/`)
**CURRENT EXPECTS:**
```json
{
  "x": [array],        // ✗ Inconsistent naming
  "y": [array]         // Optional for paired
}
```

**TEST SUITE SENDS:**
```json
{
  "data1": [array],
  "data2": [array]
}
```

---

### 4. CATEGORICAL TESTS

#### Chi-Square Independence (`/categorical/chi-square/independence/`)
**CURRENT EXPECTS:**
```json
{
  "contingency_table": [[a,b],[c,d]],  // ✓ Correct
  "correction": true                    // Yates correction
}
```

#### Fisher's Exact Test (`/categorical/fishers/`)
**CURRENT EXPECTS:**
```json
{
  "table": [[a,b],[c,d]]  // ✗ Should be "contingency_table" for consistency
}
```

---

### 5. CORRELATION ENDPOINTS (`/stats/correlation/`)

**CURRENT EXPECTS:**
```json
{
  "x": [array],
  "y": [array],
  "method": "pearson|spearman|kendall"
}
```

**TEST SUITE SENDS:** ✓ Correct

---

### 6. POWER ANALYSIS ENDPOINTS

#### T-Test Power (`/power/t-test/`)
**CURRENT EXPECTS:**
```json
{
  "effect_size": 0.5,
  "alpha": 0.05,
  "power": 0.8,
  "sample_size": null,  // One of these should be null (to calculate)
  "ratio": 1            // Group size ratio
}
```

**TEST SUITE SENDS:**
```json
{
  "effect_size": 0.5,
  "alpha": 0.05,
  "power": 0.8
  // Missing sample_size parameter
}
```

---

## 🔧 IMPLEMENTATION STRATEGY

### Step 1: Create Parameter Adapter Layer
```python
class APIParameterAdapter:
    """
    Adapts incoming parameters to expected format
    Maintains backward compatibility
    """

    PARAMETER_MAPPINGS = {
        'ttest': {
            'independent': 'two_sample',
            'one-sample': 'one_sample',
            'paired-sample': 'paired',
            'mu': 'hypothesized_mean'
        },
        'nonparametric': {
            'data1': 'group1',
            'data2': 'group2',
            'x': 'data1',
            'y': 'data2'
        },
        'categorical': {
            'contingency_table': 'table',
            'table': 'contingency_table'
        }
    }

    def adapt_parameters(self, endpoint, params):
        # Map parameters based on endpoint
        pass
```

### Step 2: Update Serializers
- Add flexibility to accept multiple parameter names
- Validate and normalize internally
- Maintain backward compatibility

### Step 3: Fix Endpoints Systematically
1. **Priority 1**: T-Tests (most used)
2. **Priority 2**: ANOVA (common)
3. **Priority 3**: Non-parametric (important alternatives)
4. **Priority 4**: Others

---

## 📈 PROGRESS TRACKING

### Tests Fixed:
- [ ] T-Test (3 variants)
- [ ] ANOVA (3 variants)
- [ ] ANCOVA
- [ ] MANOVA
- [ ] Linear Regression
- [ ] Multiple Regression
- [ ] Polynomial Regression
- [ ] Logistic Regression
- [ ] Mann-Whitney U
- [ ] Wilcoxon Signed-Rank
- [ ] Kruskal-Wallis
- [ ] Friedman Test
- [ ] Chi-Square (2 variants)
- [ ] Fisher's Exact
- [ ] McNemar's Test
- [ ] Pearson Correlation
- [ ] Spearman Correlation
- [ ] Kendall's Tau
- [ ] Power Analysis (6 types)

---

## 🎯 SUCCESS CRITERIA
- All 46 tests return HTTP 200 with valid data
- Parameter names are consistent across similar tests
- Backward compatibility maintained
- Documentation updated
- Test suite passes 100%

---

*Document Created: September 29, 2025, 06:45 AM*
*Status: IN PROGRESS*