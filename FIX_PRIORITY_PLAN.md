# SYSTEMATIC FIX PLAN - STICKFORSTATS v1.0
**Generated:** September 30, 2025, 12:22 AM
**Current Status:** 37/62 endpoints operational (59.7%)
**Target:** 100% functionality

---

## 📋 ISSUE CATEGORIES & FIX PRIORITY

### **PRIORITY 1: PARAMETER MISMATCHES (Est. 30-60 min)**
**Impact:** HIGH | **Difficulty:** EASY | **Count:** 11 endpoints

These are simple parameter naming mismatches between API and tests.

1. **T-Test** - Missing `test_type` parameter format
2. **ANCOVA** - Parameter structure mismatch
3. **Linear Regression** - Missing required parameters
4. **Multiple Regression** - X array format issue
5. **Chi-Square Independence** - Needs `contingency_table` not `observed`
6. **Page's Trend Test** - Data parameter format
7. **Effect Size T-Test** - Missing `sample_size` parameter
8. **Power ANOVA** - Missing `groups` parameter
9. **Power Correlation** - Parameter name (`r` vs `effect_size`)
10. **Optimal Allocation** - Parameter name (`total_n` vs `total_sample_size`)
11. **Sensitivity Analysis** - Missing `test_type`
12. **Comprehensive Power Report** - Parameter structure
13. **Audit Metrics** - Invalid metric type name

**Fix Method:** Read view functions, identify exact parameter names, update test script.

---

### **PRIORITY 2: IMPLEMENTATION BUGS (Est. 1-2 hours)**
**Impact:** HIGH | **Difficulty:** MEDIUM | **Count:** 5 endpoints

These are bugs in existing code that need debugging.

1. **G-Test** - `alpha` parameter not expected
   - Location: `backend/api/v1/categorical_views.py`
   - Error: `g_test() got an unexpected keyword argument 'alpha'`
   - Fix: Add `alpha` parameter or remove from call

2. **Friedman Test** - Division by zero error
   - Location: `backend/api/v1/nonparametric_views.py`
   - Error: `[<class 'decimal.DivisionByZero'>]`
   - Fix: Add zero-check before division

3. **Non-Parametric Post-Hoc** - Parameter name mismatch
   - Error: `dunn_test() got an unexpected keyword argument 'p_adjust'`
   - Fix: Change `p_adjust` to correct parameter name

4. **Non-Parametric Effect Sizes** - Missing parameters
   - Error: Missing `test_type` and `data`
   - Fix: Add proper parameter validation

5. **Power Curves** - Uninitialized variable
   - Error: `local variable 'result' referenced before assignment`
   - Fix: Initialize `result` before use

**Fix Method:** Read source files, debug issues, add proper error handling.

---

### **PRIORITY 3: MISSING METHODS (Est. 2-3 hours)**
**Impact:** MEDIUM | **Difficulty:** HARD | **Count:** 7 endpoints

These endpoints are routed but methods don't exist in classes.

1. **Cochran's Q Test**
   - Error: `'HighPrecisionCategorical' object has no attribute 'cochrans_q'`
   - Status: Method not implemented
   - Action: Implement Cochran's Q test with 50-decimal precision

2. **Multinomial Test**
   - Error: `'HighPrecisionCategorical' object has no attribute 'multinomial_test'`
   - Status: Method not implemented
   - Action: Implement multinomial test

3. **Categorical Effect Sizes**
   - Error: `'HighPrecisionCategorical' object has no attribute 'calculate_effect_sizes'`
   - Status: Method not implemented
   - Action: Implement Cramér's V, Phi, etc.

4. **Mood's Median Test**
   - Error: `'HighPrecisionNonParametric' object has no attribute 'moods_median'`
   - Status: Method not implemented
   - Action: Implement Mood's median test

5. **Jonckheere-Terpstra Test**
   - Error: `'HighPrecisionNonParametric' object has no attribute 'jonckheere_terpstra'`
   - Status: Method not implemented
   - Action: Implement J-T trend test

**Fix Method:** Implement missing statistical methods with proper precision.

---

### **PRIORITY 4: GUARDIAN AUTH ISSUES (Est. 15-30 min)**
**Impact:** LOW | **Difficulty:** EASY | **Count:** 2 endpoints

Guardian sub-endpoints unexpectedly require authentication.

1. **Validate Normality** - Unexpected auth requirement
2. **Detect Outliers** - Unexpected auth requirement

**Fix:** Either:
- Remove authentication requirement (Guardian should be public)
- OR: Update test to expect auth (if intentional)

---

## 🎯 EXECUTION STRATEGY

### **Phase 1: Quick Wins (1-2 hours)**
1. Fix all parameter mismatches (Priority 1)
2. Fix Guardian auth issues (Priority 4)
3. **Expected Result:** 50/62 endpoints working (80%+)

### **Phase 2: Bug Fixes (1-2 hours)**
4. Debug and fix 5 implementation bugs (Priority 2)
5. **Expected Result:** 55/62 endpoints working (88%+)

### **Phase 3: Complete Implementation (2-3 hours)**
6. Implement 7 missing methods (Priority 3)
7. **Expected Result:** 62/62 endpoints working (100%)

---

## 📝 METICULOUS DOCUMENTATION PLAN

After each fix:
1. Document exact change made
2. Test endpoint individually
3. Update test report
4. Verify scientific accuracy
5. Check 50-decimal precision maintained

---

## ✅ SUCCESS CRITERIA

- [ ] All 62 endpoints return valid JSON
- [ ] All statistical calculations scientifically accurate
- [ ] 50-decimal precision maintained
- [ ] Response times < 100ms average
- [ ] Guardian System 100% operational
- [ ] Zero mock data (only real calculations)
- [ ] Professional UI remains intact

---

**Next Action:** Start with Priority 1 - Parameter Mismatches
**Estimated Total Time:** 4-6 hours to 100%
**Current Progress:** 59.7% → Target: 100%