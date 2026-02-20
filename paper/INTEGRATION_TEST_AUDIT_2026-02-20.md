# Integration Test Audit & Bug Discovery Report

**Date:** 2026-02-20
**Author:** Claude Code (Opus 4.6) + Vishal Bharti
**Scope:** End-to-end integration testing across Pillar 1 (Autonomous Intelligence) and Pillar 2 (Journal Integration)
**Status:** 40/40 new tests passing | 3 production bugs discovered

---

## 1. Executive Summary

A comprehensive integration test suite was written to verify cross-service data flow
in the StickForStats v2.0 platform. Unlike the existing 423 unit/API tests which mock
services or test them in isolation, these 40 new tests exercise the **full pipeline** --
data in, result out -- with real scipy/numpy/pandas computations.

**During test development, three production bugs were discovered in the Pillar 2
manuscript review pipeline.** The most critical is that the STATCHECK-style
p-value consistency validation is **effectively dead code** -- it silently skips
all claims due to two naming mismatches between the claim extractor and the
consistency validator.

---

## 2. Test Suite Overview

### 2.1 File 1: `backend/core/tests/test_integration_autonomous.py` (22 tests)

Tests the complete Pillar 1 autonomous pipeline:
SmartProfiler -> CascadeEngine -> PlainLanguageTranslator -> AutonomousQueryHandler

| Test Class | # Tests | What It Verifies |
|---|---|---|
| `TestFullPipelineIntegration` | 6 | End-to-end: data + query -> profiler -> cascade -> translator (t-test, correlation, ANOVA, chi-square, paired, all output modes) |
| `TestDataFlowContractIntegration` | 5 | Output/input contracts between services (profiler -> data prep, cascade -> translator, variable types, cascade path structure, inferred questions) |
| `TestCascadeChainIntegration` | 4 | Guardian violation -> cascade with real data (skewed data cascades, normal data passes, max cascades limit, guardian report schema) |
| `TestEdgeCaseIntegration` | 5 | Pathological data handling (empty df, all-NaN, constant column, single row, mixed types) |
| `TestAutonomousAPIIntegration` | 2 | Real HTTP endpoint tests (profile + query endpoints with JSON data) |

**Data Fixtures (all seeded with `np.random.RandomState(42)`):**
- `_normal_two_group_df` -- Known t-test pass, Cohen's d ~= 1.0
- `_skewed_two_group_df` -- Exponential data, triggers normality violation
- `_correlation_df` -- Known Pearson r ~= 0.7
- `_multi_group_df` -- 3 groups, staggered means for ANOVA
- `_categorical_2x2_df` -- Strong association (OR ~= 5)
- `_paired_prepost_df` -- Pre/post with known mean shift
- `_all_nan_df`, `_single_value_df`, `_single_row_df`, `_empty_df`, `_mixed_types_df`

### 2.2 File 2: `backend/core/tests/test_integration_manuscript.py` (18 tests)

Tests the complete Pillar 2 manuscript pipeline:
ManuscriptParser -> StatisticalClaimExtractor -> ConsistencyValidator -> ManuscriptGuardian

| Test Class | # Tests | What It Verifies |
|---|---|---|
| `TestFullManuscriptPipelineIntegration` | 4 | Full review pipeline (psychology manuscript, multi-test manuscript, report completeness, finding categorization) |
| `TestClaimValidationChainIntegration` | 4 | Extraction -> consistency validation chain (consistent t-test, gross error detection, batch validation, summary accuracy) |
| `TestSQSScoringIntegration` | 3 | SQS scoring through pipeline (good vs. bad manuscript, score categories) -- uses `@unittest.skipUnless(SQS_AVAILABLE)` |
| `TestManuscriptEdgeCases` | 4 | Edge cases (empty text, no stats, all inconsistent, long manuscript with 25 claims) |
| `TestManuscriptAPIIntegration` | 3 | Real HTTP endpoint tests (analyze, claims, consistency endpoints) |

**Manuscript Fixtures:**
- `MANUSCRIPT_PSYCHOLOGY` -- Complete paper with t(118)=2.87, p=.005, Cohen's d=0.53
- `MANUSCRIPT_MULTI_TEST` -- ANOVA F(2,87)=4.23 + chi-square + correlation
- `MANUSCRIPT_INCONSISTENT` -- t(30)=0.50 with p=.001 (gross error: real p ~= 0.621)
- `MANUSCRIPT_PERFECT_REPORTING` -- All effect sizes, CIs, power analysis, pre-registration
- `MANUSCRIPT_MINIMAL_REPORTING` -- Only inequality p-values (p < .05), no effect sizes
- `MANUSCRIPT_EMPTY`, `MANUSCRIPT_NO_STATS`

---

## 3. Bugs Discovered

### 3.1 BUG-001: Consistency Validator Attribute Name Mismatch (CRITICAL)

**Severity:** Critical -- Core Pillar 2 feature is non-functional
**Location:** `backend/core/manuscript/consistency_validator.py:168`
**Impact:** ALL manuscripts pass consistency validation regardless of actual errors

**Root Cause:**
```
StatisticalClaim (claim_extractor.py)   has:  statistic_value
ConsistencyValidator (consistency_validator.py) reads:  claim.statistic  (via getattr)
```

The validator does `getattr(claim, 'statistic', None)` at line 168, but `StatisticalClaim`
has the attribute named `statistic_value`. The `getattr` returns `None`, causing the
validator to skip the claim with "Cannot recompute: test statistic not reported".

**Evidence:**
- Integration test `test_consistent_ttest_passes_validation` failed before bridge was applied
- The existing unit tests (`test_manuscript_services.py`) use `_MockClaim` with `statistic`
  attribute, masking this mismatch in testing
- In production, `ManuscriptGuardian.review()` filters claims by `c.statistic_value is not None`
  then passes them to the validator, which reads `claim.statistic` = `None`

**Fix:** Add attribute alias in `ConsistencyValidator.validate_claim()`:
```python
reported_stat = getattr(claim, 'statistic', None) or getattr(claim, 'statistic_value', None)
```

### 3.2 BUG-002: Consistency Validator Claim Type Name Mismatch (CRITICAL)

**Severity:** Critical -- Compounds BUG-001, both must be fixed
**Location:** `backend/core/manuscript/consistency_validator.py:101,210`
**Impact:** Even with BUG-001 fixed, claims would still be skipped

**Root Cause:**
```
StatisticalClaimExtractor produces:    t_statistic, f_statistic, chi_square, r_value
ConsistencyValidator.SUPPORTED_TYPES:  t, F, chi2, r
```

The validator checks `if claim_type not in self.SUPPORTED_TYPES` and skips with
"Unsupported claim type" note. The extractor and validator use different naming
conventions for the same statistical test types.

**Mapping required:**
| Extractor Type | Validator Type |
|---|---|
| `t_statistic` | `t` |
| `f_statistic` | `F` |
| `chi_square` | `chi2` |
| `z_statistic` | `z` |
| `r_value` | `r` |

**Evidence:**
- Integration test `test_inconsistent_claim_flagged_as_gross_error` returned `severity='none'`
  before bridge was applied
- The existing unit tests use `_MockClaim(claim_type='t', ...)` matching the validator's
  expected types, never exercising the extractor -> validator path
- `AdvancedValidators` (advanced_validators.py:123) have their own `SUPPORTED_TYPES` using
  the extractor names -- this inconsistency suggests the two modules were developed independently

**Fix:** Add type mapping in `ConsistencyValidator.validate_claim()`:
```python
_CLAIM_TYPE_MAP = {
    't_statistic': 't', 'f_statistic': 'F', 'chi_square': 'chi2',
    'z_statistic': 'z', 'r_value': 'r',
}
claim_type = self._CLAIM_TYPE_MAP.get(claim_type, claim_type)
```

### 3.3 BUG-003: ManuscriptParser Rejects .txt File Uploads (MODERATE)

**Severity:** Moderate -- Users uploading plain text manuscripts get a 400 error
**Location:** `backend/core/manuscript/parser.py:255-259`

**Root Cause:**
```python
_EXT_MAP = {'.pdf': 'pdf', '.tex': 'latex', '.latex': 'latex', '.docx': 'docx'}
# .txt is NOT in the map
```

When `file_type='auto'`, the parser calls `_detect_file_type()` which checks the
filename extension against `_EXT_MAP`. Files with `.txt` extension return `'unknown'`,
triggering a `ValueError`.

Additionally, `ManuscriptGuardian.review_text()` (line 438-440) wraps text in a
`StringIO` with `f.name = 'manuscript.txt'` and calls `self.review(f, file_type='auto')`,
which also fails for the same reason.

**Evidence:**
- Integration tests initially all failed for `review_text()` calls
- API endpoint `_get_file_and_type()` in `manuscript_views.py:58` maps `.txt` to
  `file_type='auto'`, but the parser can't handle auto-detection for `.txt`

**Fix options:**
1. Add `.txt` to `_EXT_MAP`: `'.txt': 'latex'` (parse as plain text using LaTeX stripper)
2. Change `review_text()` to use `file_type='latex'` instead of `file_type='auto'`
3. Both (belt and suspenders)

---

## 4. Pre-existing Test Failures (Not From Our Changes)

The full test suite (508 tests) has **17 failures + 24 errors**, all in
`sqc_analysis.tests.test_spc_implementation`. These are schema mismatches between
the test expectations and the actual API response structure:

| Test | Expected Key | Status |
|---|---|---|
| `test_evaluate_control_plan` | `item_evaluations` | Missing from response |
| `test_generate_implementation_roadmap` | `organization_info` | Missing from response |
| `test_get_case_study` | `industry` | Missing from response |
| `test_get_industry_recommendations` | `industry` | Missing from response |

**Root cause:** The `SPCImplementationService` was refactored but the tests were
not updated to match the new response schemas. These are test-only issues, not
production bugs.

---

## 5. Test Metrics

### Before This Session
- **Unit/API tests:** 468 (including 38 Guardian, 45+ manuscript, 50+ autonomous)
- **Integration tests:** 0
- **Known failures:** 17 failures + 24 errors (sqc_analysis)

### After This Session
- **Unit/API tests:** 468 (unchanged)
- **Integration tests:** 40 (NEW)
- **Total tests:** 508
- **New test failures:** 0
- **Pre-existing failures:** 17 failures + 24 errors (sqc_analysis, unchanged)

### Test Execution Time
```
Integration tests only:  ~34 seconds
Full suite:              ~120 seconds
```

---

## 6. Workarounds Applied in Tests

The integration tests include two workarounds for the discovered bugs:

### 6.1 `_bridge_claim()` helper (test_integration_manuscript.py)
```python
_TYPE_MAP = {
    't_statistic': 't', 'f_statistic': 'F', 'chi_square': 'chi2',
    'z_statistic': 'z', 'r_value': 'r',
}

@classmethod
def _bridge_claim(cls, claim):
    claim.statistic = claim.statistic_value   # BUG-001 workaround
    claim.claim_type = cls._TYPE_MAP.get(...)  # BUG-002 workaround
    return claim
```

### 6.2 `_review_text()` helper (test_integration_manuscript.py)
```python
def _review_text(guardian, text):
    f = io.StringIO(text)
    f.name = 'manuscript.tex'  # BUG-003 workaround: .tex not .txt
    return guardian.review(f, file_type='latex')
```

These workarounds allow the integration tests to verify the intended behavior
while the bugs remain unfixed in production code.

---

## 7. Remediation Plan

### Phase 1: Fix Critical Bugs (BUG-001 + BUG-002)
1. Update `ConsistencyValidator.validate_claim()` to handle both attribute names
2. Add `_CLAIM_TYPE_MAP` to `ConsistencyValidator` for type translation
3. Add integration tests that verify the fix works WITHOUT the bridge workaround
4. Run full suite to confirm no regressions

### Phase 2: Fix Moderate Bug (BUG-003)
1. Add `.txt` to `ManuscriptParser._EXT_MAP`
2. Fix `ManuscriptGuardian.review_text()` to use explicit file_type
3. Verify API endpoint handles `.txt` uploads correctly

### Phase 3: Fix Pre-existing SQC Failures
1. Audit `SPCImplementationService` response schemas
2. Update tests to match current response format
3. Verify all 508 tests pass

---

## 8. Files Modified in This Session

| File | Action | Lines |
|---|---|---|
| `backend/core/tests/test_integration_autonomous.py` | **Created** | ~380 |
| `backend/core/tests/test_integration_manuscript.py` | **Created** | ~610 |

No existing files were modified.

---

## 9. Verification Commands

```bash
# Run integration tests only
cd backend && python manage.py test core.tests.test_integration_autonomous \
  core.tests.test_integration_manuscript -v2

# Run full suite
cd backend && python manage.py test -v2

# Expected: 40 new tests passing, 508 total, 0 new failures
```
