# 🧪 COMPREHENSIVE TESTING GUIDE FOR STICKFORSTATS
## Complete Testing Strategy & Validation Framework
### Date: September 17, 2025 | Version: 1.0.0

---

## 📋 EXECUTIVE TESTING SUMMARY

### Testing Priorities
1. **50 Decimal Precision Validation** - Our core differentiator
2. **Statistical Accuracy** - Compare with R/Python/SPSS
3. **Example Data System** - All datasets load correctly
4. **ANCOVA Functionality** - New feature validation
5. **End-to-End Integration** - Frontend ↔ Backend flow
6. **Performance Testing** - Response times under load
7. **Edge Cases** - Boundary conditions and errors

---

## 🎯 SECTION 1: FUNCTIONAL TESTING

### 1.1 T-Test Calculator Testing

#### Test Case 1.1.1: One-Sample T-Test
```javascript
// Steps:
1. Navigate to: http://localhost:3001/statistical-tests
2. Select "T-Test Calculator"
3. Choose "One-Sample T-Test"
4. Click "Load Example Data"
5. Select "Blood Pressure Study"
6. Verify data loads: 30 values starting with 118, 122, 125...
7. Verify hypothesized mean: 120
8. Click "Calculate"

// Expected Results:
✓ t-statistic ≈ 2.145 (verify to 50 decimals)
✓ p-value < 0.05 (two-tailed)
✓ 95% CI should not include 120
✓ Effect size (Cohen's d) calculated
✓ Assumption checks displayed
✓ Export to PDF works
✓ Export to CSV works
```

#### Test Case 1.1.2: Paired T-Test
```javascript
// Steps:
1. Select "Paired T-Test"
2. Load "Training Effectiveness" example
3. Verify before/after data pairs
4. Set confidence level to 99%
5. Calculate

// Expected Results:
✓ Significant improvement (p < 0.001)
✓ Mean difference ≈ 7 points
✓ Positive Cohen's d (large effect)
✓ All 15 pairs processed
```

#### Test Case 1.1.3: Independent T-Test
```javascript
// Steps:
1. Select "Independent Samples T-Test"
2. Load "Clinical Treatment vs Control" example
3. Toggle Welch's correction ON/OFF
4. Calculate both versions

// Expected Results:
✓ Treatment group faster recovery (p < 0.001)
✓ Welch's correction slightly different df
✓ Levene's test for equal variances
✓ Glass's delta calculated
```

### 1.2 ANOVA Calculator Testing

#### Test Case 1.2.1: One-Way ANOVA
```javascript
// Steps:
1. Select "ANOVA Calculator"
2. Choose "One-Way ANOVA"
3. Load "Teaching Methods Comparison" example
4. Select multiple post-hoc tests:
   - Tukey HSD
   - Bonferroni
   - Scheffe
5. Calculate

// Expected Results:
✓ F-statistic significant (p < 0.001)
✓ η² (eta-squared) > 0.14 (large effect)
✓ ω² (omega-squared) calculated
✓ All pairwise comparisons shown
✓ Hybrid > Online > Traditional
✓ Assumption checks: normality, homogeneity
```

#### Test Case 1.2.2: ANCOVA (NEW FEATURE!)
```javascript
// Steps:
1. Choose "ANCOVA" type
2. Load "Salary Analysis with Age Covariate" example
3. Verify groups load (High School, Bachelor's, Master's)
4. Verify covariate loads (Age data)
5. Check "Homogeneity of slopes" checkbox
6. Calculate

// Expected Results:
✓ Groups significant after controlling for age
✓ Adjusted means displayed
✓ Covariate significance shown
✓ Homogeneity of slopes test result
✓ Partial eta squared calculated
✓ Education effect remains after adjustment
```

#### Test Case 1.2.3: Two-Way ANOVA
```javascript
// Steps:
1. Select "Two-Way ANOVA"
2. Manually input 2x3 factorial design data
3. Name factors: "Treatment" and "Dosage"
4. Calculate with interaction

// Expected Results:
✓ Main effects for both factors
✓ Interaction effect tested
✓ Effect sizes for all effects
✓ Post-hoc for significant effects
```

### 1.3 Regression Calculator Testing

#### Test Case 1.3.1: Simple Linear Regression
```javascript
// Steps:
1. Select "Regression Calculator"
2. Choose "Linear Regression"
3. Load "Advertising Impact on Sales" example
4. Enable prediction interface
5. Predict for advertising = $5000

// Expected Results:
✓ R² > 0.90 (excellent fit)
✓ Regression equation displayed
✓ Residual plots generated
✓ Prediction ≈ $38,000 with CI
✓ Durbin-Watson statistic
✓ VIF for multicollinearity
```

#### Test Case 1.3.2: Multiple Regression
```javascript
// Steps:
1. Choose "Multiple Regression"
2. Load "House Price Prediction" example
3. Check all diagnostic plots
4. Request standardized coefficients

// Expected Results:
✓ All predictors' p-values shown
✓ Adjusted R² calculated
✓ Multicollinearity checks (VIF)
✓ Residual normality tested
✓ Cook's distance for outliers
```

#### Test Case 1.3.3: Logistic Regression
```javascript
// Steps:
1. Choose "Logistic Regression"
2. Load "Credit Default Prediction" example
3. Set classification threshold to 0.5
4. Calculate

// Expected Results:
✓ Odds ratios displayed
✓ ROC curve generated
✓ AUC > 0.8
✓ Confusion matrix shown
✓ Sensitivity/Specificity calculated
```

### 1.4 Correlation Calculator Testing

#### Test Case 1.4.1: Pearson Correlation
```javascript
// Steps:
1. Select "Correlation Calculator"
2. Load "Temperature vs Ice Cream Sales" example
3. Choose Pearson method
4. Enable bootstrap CI (1000 iterations)

// Expected Results:
✓ r ≈ 0.98 (very strong positive)
✓ p-value < 0.001
✓ 95% CI: [0.94, 0.99]
✓ Scatterplot with trend line
✓ R² = 0.96
```

#### Test Case 1.4.2: Correlation Matrix
```javascript
// Steps:
1. Select "Matrix Correlation"
2. Input 4+ variables
3. Choose Spearman method
4. Apply Bonferroni correction

// Expected Results:
✓ Full correlation matrix displayed
✓ Heat map visualization
✓ Adjusted p-values shown
✓ Significant correlations highlighted
```

### 1.5 Non-Parametric Tests

#### Test Case 1.5.1: Mann-Whitney U Test
```javascript
// Steps:
1. Select "Non-Parametric Tests"
2. Choose "Mann-Whitney U"
3. Load "Customer Satisfaction Ratings" example
4. Calculate with exact p-value

// Expected Results:
✓ U statistic calculated
✓ Z-score approximation
✓ Effect size (rank-biserial)
✓ Service A > Service B confirmed
```

#### Test Case 1.5.2: Kruskal-Wallis Test
```javascript
// Steps:
1. Choose "Kruskal-Wallis"
2. Load "Brand Preference Rankings" example
3. Enable post-hoc comparisons
4. Calculate

// Expected Results:
✓ H statistic significant
✓ Chi-square approximation
✓ Dunn's post-hoc tests
✓ Effect size (epsilon squared)
```

### 1.6 Categorical Tests

#### Test Case 1.6.1: Chi-Square Independence
```javascript
// Steps:
1. Select "Categorical Tests"
2. Choose "Chi-Square Independence"
3. Load "Gender vs Product Preference" example
4. Calculate with Yates correction

// Expected Results:
✓ χ² statistic > critical value
✓ p-value < 0.05
✓ Cramer's V effect size
✓ Expected frequencies shown
✓ Standardized residuals
```

#### Test Case 1.6.2: Fisher's Exact Test
```javascript
// Steps:
1. Choose "Fisher's Exact Test"
2. Load "Treatment Efficacy (Small Sample)" example
3. Calculate both one and two-tailed

// Expected Results:
✓ Exact p-value calculated
✓ Odds ratio with CI
✓ More accurate than chi-square for small n
```

---

## 🔬 SECTION 2: PRECISION TESTING

### 2.1 50 Decimal Precision Validation

#### Test Case 2.1.1: Backend Precision
```python
# Python test script
import requests
import mpmath

# Set precision to 50
mpmath.mp.dps = 50

# Test data
data = {
    "sample1": [1.23456789012345678901234567890123456789012345678901],
    "sample2": [2.34567890123456789012345678901234567890123456789012]
}

# Call API
response = requests.post('http://localhost:8000/api/v1/stats/ttest/', json=data)
result = response.json()

# Verify precision maintained
assert len(str(result['t_statistic']).split('.')[-1]) >= 40
print(f"✓ Backend maintains {len(str(result['t_statistic']).split('.')[-1])} decimal places")
```

#### Test Case 2.1.2: Frontend Display
```javascript
// Steps:
1. Perform any calculation
2. Set display precision to "50 decimals (Maximum)"
3. Click "Show Full Precision"
4. Copy value to clipboard
5. Paste in text editor

// Verification:
✓ Count decimal places (should be 50)
✓ No rounding errors visible
✓ Consistent across all calculators
```

#### Test Case 2.1.3: End-to-End Precision
```javascript
// Critical precision test
Input: π = 3.14159265358979323846264338327950288419716939937510

// Test in each calculator:
1. T-Test: Use as hypothesized mean
2. ANOVA: Use in group data
3. Regression: Use as predictor value
4. Correlation: Use in dataset

// Verify:
✓ All 50 digits preserved in results
✓ No precision loss in calculations
✓ Export maintains precision
```

---

## 📊 SECTION 3: INTEGRATION TESTING

### 3.1 Example Data System

#### Test Case 3.1.1: Data Loader Component
```javascript
// For EACH calculator:
1. Click "Load Example Data"
2. Verify dialog opens
3. Select each available dataset
4. Verify preview shows correctly
5. Load data
6. Verify data populates correctly

// Checklist:
□ T-Test: 6 example datasets
□ ANOVA: 4 example datasets
□ ANCOVA: 2 example datasets
□ Regression: 5 example datasets
□ Correlation: 3 example datasets
□ Non-Parametric: 4 example datasets
□ Categorical: 4 example datasets
```

#### Test Case 3.1.2: Data Integrity
```javascript
// Verify each dataset:
✓ Correct number of observations
✓ Expected outcome matches actual result
✓ Context label appropriate
✓ Description accurate
✓ No missing values (unless intentional)
```

### 3.2 API Integration

#### Test Case 3.2.1: Authentication Flow
```bash
# Test API authentication
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "test"}'

# Use token in subsequent requests
curl -X POST http://localhost:8000/api/v1/stats/ttest/ \
  -H "Authorization: Token <token>" \
  -H "Content-Type: application/json" \
  -d '{"sample1": [1,2,3], "sample2": [4,5,6]}'
```

#### Test Case 3.2.2: Error Handling
```javascript
// Test invalid inputs:
1. Empty data arrays
2. Single data point
3. Non-numeric values
4. Mismatched array lengths
5. Missing required fields

// Expected:
✓ Graceful error messages
✓ No crashes
✓ Clear user guidance
✓ Form validation works
```

---

## 🚀 SECTION 4: PERFORMANCE TESTING

### 4.1 Response Time Testing

#### Test Case 4.1.1: Calculation Speed
```javascript
// Benchmark each test type:
Dataset Size    Expected Time
10 points       < 100ms
100 points      < 500ms
1000 points     < 2 seconds
10000 points    < 10 seconds

// Test with Chrome DevTools:
1. Open Network tab
2. Perform calculation
3. Check API response time
4. Check rendering time
```

### 4.2 Load Testing

#### Test Case 4.2.1: Concurrent Users
```python
# Load test with locust
from locust import HttpUser, task, between

class StickForStatsUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def perform_ttest(self):
        self.client.post("/api/v1/stats/ttest/", json={
            "sample1": [1,2,3,4,5],
            "sample2": [6,7,8,9,10]
        })

    @task
    def perform_anova(self):
        self.client.post("/api/v1/stats/anova/", json={
            "groups": [[1,2,3], [4,5,6], [7,8,9]]
        })

# Run: locust -f loadtest.py --host=http://localhost:8000
# Target: 100 concurrent users, 0% error rate
```

---

## 🛡️ SECTION 5: SECURITY TESTING

### 5.1 Input Validation

#### Test Case 5.1.1: SQL Injection Prevention
```javascript
// Test malicious inputs:
1. Group name: "'; DROP TABLE users; --"
2. Data values: "<script>alert('XSS')</script>"
3. File upload: malicious.exe renamed to .csv

// Verify:
✓ All inputs sanitized
✓ No script execution
✓ File type validation works
```

### 5.2 Authentication Security

#### Test Case 5.2.1: Token Security
```javascript
// Test:
1. Token expiration
2. Invalid token rejection
3. Rate limiting on login
4. Password complexity requirements
```

---

## 🎨 SECTION 6: UI/UX TESTING

### 6.1 Responsive Design

#### Test Case 6.1.1: Mobile Compatibility
```javascript
// Test on devices:
□ iPhone 12/13/14
□ Samsung Galaxy S21
□ iPad Pro
□ Desktop (1920x1080)
□ Desktop (4K)

// Check:
✓ All buttons clickable
✓ Tables scroll horizontally
✓ Modals fit screen
✓ Text readable
```

### 6.2 Accessibility

#### Test Case 6.2.1: WCAG Compliance
```javascript
// Test with tools:
1. Run Lighthouse audit
2. Test with screen reader (NVDA/JAWS)
3. Keyboard-only navigation
4. Color contrast checker

// Target:
✓ Lighthouse score > 90
✓ All interactive elements focusable
✓ ARIA labels present
✓ Contrast ratio ≥ 4.5:1
```

---

## 📈 SECTION 7: STATISTICAL VALIDATION

### 7.1 Cross-Validation with R

#### Test Case 7.1.1: T-Test Validation
```r
# R validation script
data1 <- c(1, 2, 3, 4, 5)
data2 <- c(6, 7, 8, 9, 10)

# R result
t.test(data1, data2)

# Compare with StickForStats result
# Difference should be < 10^-10
```

### 7.2 Python (SciPy) Validation

#### Test Case 7.2.1: ANOVA Validation
```python
from scipy import stats
import numpy as np

# Test data
group1 = [72, 75, 68, 70, 73]
group2 = [78, 82, 80, 79, 81]
group3 = [85, 88, 86, 87, 89]

# SciPy result
f_stat, p_val = stats.f_oneway(group1, group2, group3)

# Compare with StickForStats
# Our precision should exceed SciPy's float64
```

---

## 🐛 SECTION 8: BUG TRACKING

### Known Issues to Test

```yaml
Issue #1:
  Description: ListItemButton import warning in RegressionCalculator
  Status: Verify fixed
  Test: Check console for errors

Issue #2:
  Description: Source map warnings
  Status: Non-critical, can ignore
  Test: Verify doesn't affect functionality

Issue #3:
  Description: Multiple background processes on port 3001
  Status: Monitor for port conflicts
  Test: Check with lsof -i :3001
```

---

## 📝 SECTION 9: TEST EXECUTION CHECKLIST

### Phase 1: Smoke Testing (30 min)
```
□ Frontend loads without errors
□ Backend API responds
□ Each calculator opens
□ Basic calculation works
□ Example data loads
```

### Phase 2: Feature Testing (2 hours)
```
□ All T-Test variants
□ All ANOVA types (including ANCOVA)
□ All Regression types
□ Correlation methods
□ Non-parametric tests
□ Categorical tests
□ Export functionality
□ Precision validation
```

### Phase 3: Integration Testing (1 hour)
```
□ Example data system
□ API endpoints
□ Authentication flow
□ Error handling
□ Data persistence
```

### Phase 4: Performance Testing (30 min)
```
□ Response times
□ Large dataset handling
□ Concurrent users
□ Memory usage
```

### Phase 5: Final Validation (30 min)
```
□ Cross-check with R/Python
□ Verify 50 decimal precision
□ Export formats correct
□ Documentation complete
```

---

## 🎯 TESTING PRIORITIES

### MUST TEST (Critical)
1. **50 decimal precision** - Core differentiator
2. **ANCOVA functionality** - New feature
3. **Example data loading** - User experience
4. **Basic calculations** - All calculators
5. **Export functionality** - PDF/CSV

### SHOULD TEST (Important)
1. Post-hoc tests
2. Assumption checking
3. Effect sizes
4. Visualization
5. Error handling

### NICE TO TEST (Enhancement)
1. Performance optimization
2. Mobile responsiveness
3. Accessibility
4. Cross-browser compatibility
5. Localization

---

## 📊 TEST METRICS

### Success Criteria
```yaml
Functional Tests:     100% pass
Precision Tests:      50 decimals maintained
Integration Tests:    95% pass
Performance Tests:    <2s for standard operations
Security Tests:       No vulnerabilities
UI/UX Tests:         >90 Lighthouse score
Statistical Tests:    <10^-10 difference from R/Python
```

---

## 🚀 QUICK TEST SCRIPT

```bash
#!/bin/bash
# Quick smoke test script

echo "🧪 Starting StickForStats Quick Test..."

# Check backend
echo "Testing backend..."
curl -s http://localhost:8000/api/health/ || echo "❌ Backend not responding"

# Check frontend
echo "Testing frontend..."
curl -s http://localhost:3001/ || echo "❌ Frontend not responding"

# Test simple calculation
echo "Testing calculation..."
curl -X POST http://localhost:8000/api/v1/stats/ttest/ \
  -H "Content-Type: application/json" \
  -d '{"sample1": [1,2,3], "sample2": [4,5,6], "test_type": "independent"}' \
  || echo "❌ Calculation failed"

echo "✅ Quick test complete!"
```

---

## 📱 MANUAL TESTING WORKFLOW

### For Each Calculator:
1. **Open Calculator**
   - Verify UI loads correctly
   - Check all tabs/sections visible

2. **Load Example Data**
   - Click "Load Example Data"
   - Select dataset
   - Verify preview
   - Load into calculator

3. **Run Calculation**
   - Click Calculate
   - Verify results appear
   - Check assumptions
   - Verify precision

4. **Test Features**
   - Change parameters
   - Try different methods
   - Test edge cases

5. **Export Results**
   - Export to PDF
   - Export to CSV
   - Verify formatting

---

## 🎉 TESTING COMPLETION

### Sign-off Checklist
```
□ All functional tests passed
□ 50 decimal precision verified
□ ANCOVA working correctly
□ Example data system functional
□ No critical bugs found
□ Performance acceptable
□ Documentation updated
□ Ready for deployment
```

---

**Document Generated**: September 17, 2025
**Testing Framework**: Version 1.0.0
**Next Review**: Before major release

---

*"Quality is not an act, it is a habit." - Aristotle*

## TEST WITH CONFIDENCE. SHIP WITH PRIDE. 🚀