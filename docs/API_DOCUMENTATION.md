# StickForStats API v2.0 Documentation

> Developer reference for the StickForStats High-Precision Statistical Analysis API.
> 195 endpoints across 14 categories. All computations use 50-digit precision via mpmath.

**Base URL**: `http://localhost:8000/api/v1/`

**Authentication**: Session-based (default), API key via `X-API-Key` header (journal/platform endpoints), Stripe webhook signature (billing webhook).

**Content Type**: `application/json` unless noted. File uploads use `multipart/form-data`.

**Versioning**: All endpoints are under `/api/v1/`. The prefix is included in paths below.

---

## Table of Contents

1. [Statistical Tests](#1-statistical-tests)
2. [Guardian System](#2-guardian-system)
3. [Autonomous Analysis](#3-autonomous-analysis)
4. [Manuscript Analysis](#4-manuscript-analysis)
5. [SQS Scoring](#5-sqs-scoring)
6. [AI Advisor](#6-ai-advisor)
7. [Data Management](#7-data-management)
8. [User Management & Platform](#8-user-management--platform)
9. [Site Licensing](#9-site-licensing)
10. [Plugin Marketplace](#10-plugin-marketplace)
11. [GDPR Compliance](#11-gdpr-compliance)
12. [Journal Integration & Analytics](#12-journal-integration--analytics)
13. [Specialized Modules](#13-specialized-modules)
14. [System](#14-system)

---

## Authentication

| Method | Header | Used By |
|--------|--------|---------|
| Session cookie | `Cookie: sessionid=...` | Browser/frontend |
| API Key | `X-API-Key: <key>` | Journal submissions, platform API |
| Stripe Signature | `Stripe-Signature: <sig>` | Billing webhooks |

Most analytical endpoints are publicly accessible (no auth required). Platform, GDPR, and journal endpoints require authentication as noted per-endpoint.

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "detail": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2026-01-15T10:30:00Z",
  "request_id": "req_abc123"
}
```

**Common HTTP Status Codes**:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Authentication Required |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 429 | Rate/Tier Limit Exceeded |
| 500 | Internal Server Error |
| 501 | Not Implemented (database models unavailable) |

---

## Rate Limits

| Endpoint Category | Limit |
|-------------------|-------|
| Standard endpoints | 1,000 requests/hour per IP |
| File uploads | 100 requests/hour per IP |
| Heavy computations (power, regression, meta-analysis) | 50 requests/hour per IP |
| Batch operations | 10 requests/hour per IP |
| Data profiling | 100 requests/hour per IP |

---

## 1. Statistical Tests

High-precision statistical tests computed with mpmath (50 decimal digits). All test endpoints accept `POST` with JSON data and return results including test statistics, p-values, effect sizes, confidence intervals, and APA-formatted strings.

### Core Statistical Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/stats/ttest/` | Independent/paired/one-sample t-test |
| POST | `/api/v1/stats/anova/` | One-way / two-way ANOVA |
| POST | `/api/v1/multivariate/manova/` | MANOVA (alias for ANOVA with `anova_type=manova`) |
| POST | `/api/v1/anova/repeated-measures/` | Repeated measures ANOVA (alias) |
| POST | `/api/v1/stats/ancova/` | Analysis of covariance |
| POST | `/api/v1/stats/correlation/` | Pearson, Spearman, Kendall, point-biserial |
| POST | `/api/v1/stats/regression/` | Simple regression (OLS) |
| POST | `/api/v1/stats/descriptive/` | Descriptive statistics (mean, median, SD, skewness, kurtosis) |
| POST | `/api/v1/stats/comparison/` | Side-by-side comparison of two analyses |
| POST | `/api/v1/stats/recommend/` | Automatic test selector based on data characteristics |

#### Example: T-Test

**Request**:
```json
POST /api/v1/stats/ttest/
{
  "test_type": "independent",
  "group1": [23.1, 25.4, 22.8, 24.5, 26.1, 23.9],
  "group2": [28.3, 27.1, 29.5, 26.8, 30.2, 27.9],
  "alpha": 0.05,
  "alternative": "two-sided",
  "equal_variance": true
}
```

**Response** (200):
```json
{
  "test_name": "Independent Samples t-test",
  "statistic": "-4.892451234567890123456789012345678901234567890123",
  "p_value": "0.000621834567890123456789012345678901234567890123",
  "degrees_of_freedom": 10,
  "effect_size": {
    "type": "Cohen's d",
    "value": -2.82,
    "interpretation": "Large effect"
  },
  "confidence_interval": [-6.72, -2.48],
  "summary_statistics": {
    "group1": {"mean": 24.30, "std": 1.24, "n": 6},
    "group2": {"mean": 28.30, "std": 1.30, "n": 6}
  },
  "apa_format": "t(10) = -4.89, p < .001, d = -2.82",
  "precision": "50 decimal digits (mpmath)"
}
```

### Regression Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/regression/` | General regression (auto-detect type) |
| POST | `/api/v1/regression/linear/` | Linear regression |
| POST | `/api/v1/regression/multiple/` | Multiple regression |
| POST | `/api/v1/regression/polynomial/` | Polynomial regression |
| POST | `/api/v1/regression/logistic/` | Logistic regression |
| POST | `/api/v1/regression/ridge/` | Ridge regression (L2 penalty) |
| POST | `/api/v1/regression/lasso/` | Lasso regression (L1 penalty) |

#### Example: Multiple Regression

**Request**:
```json
POST /api/v1/regression/multiple/
{
  "regression_type": "multiple",
  "dependent_variable": "outcome",
  "independent_variables": ["age", "dosage", "weight"],
  "data": [
    {"outcome": 45.2, "age": 30, "dosage": 100, "weight": 70},
    {"outcome": 52.1, "age": 45, "dosage": 150, "weight": 85}
  ],
  "confidence_level": 0.95
}
```

### Categorical Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/categorical/chi-square/independence/` | Chi-square test of independence |
| POST | `/api/v1/categorical/chi-square/goodness/` | Chi-square goodness of fit |
| POST | `/api/v1/categorical/fishers/` | Fisher's exact test |
| POST | `/api/v1/categorical/mcnemar/` | McNemar test (paired proportions) |
| POST | `/api/v1/categorical/cochran-q/` | Cochran's Q test |
| POST | `/api/v1/categorical/g-test/` | G-test (log-likelihood ratio) |
| POST | `/api/v1/categorical/binomial/` | Binomial test |
| POST | `/api/v1/categorical/multinomial/` | Multinomial test |
| POST | `/api/v1/categorical/effect-sizes/` | Cramer's V, Phi, Odds Ratio |

#### Example: Chi-Square Independence

**Request**:
```json
POST /api/v1/categorical/chi-square/independence/
{
  "observed": [[50, 30], [20, 40]],
  "alpha": 0.05,
  "correct": true
}
```

### Nonparametric Tests

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/nonparametric/mann-whitney/` | Mann-Whitney U test |
| POST | `/api/v1/nonparametric/wilcoxon/` | Wilcoxon signed-rank test |
| POST | `/api/v1/nonparametric/kruskal-wallis/` | Kruskal-Wallis H test |
| POST | `/api/v1/nonparametric/friedman/` | Friedman test |
| POST | `/api/v1/nonparametric/sign/` | Sign test |
| POST | `/api/v1/nonparametric/mood/` | Mood's median test |
| POST | `/api/v1/nonparametric/jonckheere/` | Jonckheere-Terpstra trend test |
| POST | `/api/v1/nonparametric/page/` | Page's L trend test |
| POST | `/api/v1/nonparametric/post-hoc/` | Nonparametric post-hoc comparisons |
| POST | `/api/v1/nonparametric/effect-sizes/` | Rank-biserial r, eta-squared |

### Power Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/power/t-test/` | Power calculation for t-test |
| POST | `/api/v1/power/sample-size/t-test/` | Required sample size for t-test |
| POST | `/api/v1/power/effect-size/t-test/` | Detectable effect size for t-test |
| POST | `/api/v1/power/anova/` | Power calculation for ANOVA |
| POST | `/api/v1/power/correlation/` | Power calculation for correlation |
| POST | `/api/v1/power/chi-square/` | Power calculation for chi-square |
| POST | `/api/v1/power/curves/` | Generate power curves |
| POST | `/api/v1/power/allocation/` | Optimal sample allocation |
| POST | `/api/v1/power/sensitivity/` | Sensitivity analysis |
| POST | `/api/v1/power/report/` | Comprehensive power report |
| GET | `/api/v1/power/info/` | Available power analysis methods |

#### Example: Power for T-Test

**Request**:
```json
POST /api/v1/power/t-test/
{
  "effect_size": 0.5,
  "sample_size_per_group": 30,
  "alpha": 0.05,
  "alternative": "two-sided"
}
```

**Response** (200):
```json
{
  "power": 0.8507,
  "effect_size": 0.5,
  "sample_size_per_group": 30,
  "alpha": 0.05,
  "interpretation": "Power of 0.85 indicates 85% chance of detecting the effect",
  "recommendations": [
    "Current sample size provides adequate power (> 0.80)",
    "Consider increasing to n=40 per group for 90% power"
  ]
}
```

---

## 2. Guardian System

The Guardian Statistical Protection System validates assumptions before tests execute. It ensures scientific integrity by checking normality, homoscedasticity, sample size adequacy, and outlier influence.

**Base path**: `/api/guardian/` (served via `core.guardian.urls`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/guardian/check/` | Full Guardian validation for a test |
| POST | `/api/guardian/validate/normality/` | Validate normality assumption |
| POST | `/api/guardian/detect/outliers/` | Detect outliers in data |
| GET | `/api/guardian/requirements/` | List all test requirements |
| GET | `/api/guardian/requirements/<test_type>/` | Requirements for a specific test |
| POST | `/api/guardian/export/pdf/` | Export validation report as PDF |
| POST | `/api/guardian/export/json/` | Export validation report as JSON |
| GET | `/api/guardian/health/` | Guardian subsystem health check |
| POST | `/api/guardian/transformation/suggest/` | Suggest data transformations for violations |
| POST | `/api/guardian/transformation/apply/` | Apply a suggested transformation |
| POST | `/api/guardian/transformation/validate/` | Validate transformation effectiveness |
| POST | `/api/guardian/transformation/export-code/` | Export transformation as R/Python code |

**8 Validators**: normality (Shapiro-Wilk/D'Agostino), homoscedasticity (Levene/Bartlett), independence, sample size, outlier detection (IQR/Grubbs), sphericity, multicollinearity, and linearity.

**Confidence formula**: `max(0, 1 - sum(w_si) / (max_penalty * 1.2))` where weights are: critical=3.0, warning=2.0, minor=1.0.

#### Example: Guardian Check

**Request**:
```json
POST /api/guardian/check/
{
  "test_type": "independent_t",
  "data": {
    "group1": [23.1, 25.4, 22.8, 24.5, 26.1],
    "group2": [28.3, 27.1, 29.5, 26.8, 30.2]
  },
  "alpha": 0.05
}
```

**Response** (200):
```json
{
  "test_type": "independent_t",
  "overall_status": "pass",
  "confidence_score": 0.92,
  "violations": [],
  "warnings": [
    {
      "validator": "sample_size",
      "severity": "minor",
      "message": "Small sample size (n=5 per group). Consider increasing to n>=30.",
      "weight": 1.0
    }
  ],
  "validators_run": [
    "normality", "homoscedasticity", "independence",
    "sample_size", "outlier_detection"
  ],
  "recommendations": [
    "Data meets assumptions for independent t-test",
    "Consider collecting more observations for greater power"
  ]
}
```

---

## 3. Autonomous Analysis

**NEW in v2.0.** The Autonomous Intelligence Layer provides a natural language interface to the full statistical pipeline. Upload data, ask a question in plain English, and receive Guardian-validated results with human-readable explanations.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/autonomous/profile/` | Smart data profiling with research question inference | None |
| POST | `/api/v1/autonomous/query/` | Full autonomous query pipeline (NL question + data) | None |
| POST | `/api/v1/autonomous/cascade/` | Execute test with Guardian cascade protection | None |
| POST | `/api/v1/autonomous/translate/` | Translate statistical results to plain English | None |
| POST | `/api/v1/autonomous/next-step/` | Get recommended next steps for analysis | None |

### POST `/api/v1/autonomous/profile/`

Upload data and receive a complete profile with research question inference, test recommendations, and a data health card.

**Accepts**: `multipart/form-data` (CSV/Excel file) or `application/json` (inline data).

**Request** (JSON):
```json
{
  "data": [
    {"age": 25, "score": 78, "group": "control"},
    {"age": 32, "score": 85, "group": "treatment"},
    {"age": 28, "score": 92, "group": "treatment"},
    {"age": 45, "score": 71, "group": "control"}
  ],
  "user_hint": "I want to compare scores between groups"
}
```

**Response** (200):
```json
{
  "profile": {
    "n_rows": 4,
    "n_columns": 3,
    "total_missing": 0,
    "missing_pattern": "none"
  },
  "inferred_questions": [
    {
      "type": "comparison",
      "text": "Is there a significant difference in scores between control and treatment groups?",
      "variables": ["score", "group"],
      "suggested_tests": ["independent_t", "mann_whitney"],
      "confidence": 0.91,
      "explanation": "Two-group comparison detected with continuous outcome variable."
    }
  ],
  "data_health": {
    "overall_score": 0.85,
    "completeness_score": 1.0,
    "quality_score": 0.90,
    "suitability_score": 0.75,
    "issues": ["Small sample size (n=4)"],
    "strengths": ["No missing data", "Clean variable types"]
  },
  "variables": {...},
  "suggested_workflow": ["profile", "guardian_check", "run_test", "translate"],
  "recommendations": [
    {
      "primary_test": "independent_t",
      "confidence_score": 0.88,
      "alternatives": ["mann_whitney", "welch_t"],
      "reasoning": "Two groups, continuous outcome, normality plausible",
      "warnings": ["Small sample size - consider nonparametric alternative"]
    }
  ]
}
```

### POST `/api/v1/autonomous/query/`

Send a natural language question with data. Returns the complete analysis pipeline: profiling, Guardian validation, test execution, and plain-language translation.

**Request**:
```json
{
  "query": "Is there a difference in scores between groups?",
  "data": [
    {"score": 78, "group": "A"},
    {"score": 85, "group": "B"}
  ],
  "mode": "plain_english",
  "alpha": 0.05
}
```

**Modes**: `"plain_english"` (default), `"researcher"`, `"apa_format"`

**Response** (200):
```json
{
  "query": "Is there a difference in scores between groups?",
  "parsed_intent": "two_group_comparison",
  "profile_summary": {...},
  "cascade_result": {
    "original_test": "independent_t",
    "final_test": "mann_whitney",
    "n_cascades": 1,
    "reason": "Normality assumption violated; cascaded to nonparametric alternative"
  },
  "translation": "There is no statistically significant difference between groups (p = 0.34). The effect size is small (r = 0.12).",
  "inferred_questions": [...],
  "suggested_next_steps": ["Check for confounding variables", "Increase sample size"],
  "confidence": 0.85,
  "warnings": ["Small sample size may limit statistical power"]
}
```

### POST `/api/v1/autonomous/cascade/`

Execute a specific statistical test with automatic Guardian cascade protection. If the requested test's assumptions fail, the system automatically cascades to the most appropriate alternative.

**Request**:
```json
{
  "test": "independent_t",
  "data": {"group1": [1, 2, 3, 4, 5], "group2": [4, 5, 6, 7, 8]},
  "alpha": 0.05,
  "max_cascades": 3
}
```

**Response** (200):
```json
{
  "original_test": "independent_t",
  "final_test": "independent_t",
  "n_cascades": 0,
  "assumptions_satisfied": true,
  "confidence_score": 0.94,
  "cascade_path": [
    {
      "test": "independent_t",
      "passed": true,
      "violations": [],
      "alternatives": []
    }
  ],
  "result": {
    "test_name": "Independent Samples t-test",
    "statistic": -3.162,
    "p_value": 0.013,
    "effect_size": -2.0,
    "effect_size_name": "Cohen's d",
    "degrees_of_freedom": 8,
    "additional": {}
  },
  "guardian_report": {...}
}
```

### POST `/api/v1/autonomous/translate/`

Translate raw statistical output into human-readable text in one of three modes.

**Request**:
```json
{
  "test_type": "independent_t",
  "results": {
    "statistic": 2.45,
    "p_value": 0.023,
    "effect_size": 0.65
  },
  "mode": "plain_english",
  "alpha": 0.05
}
```

### POST `/api/v1/autonomous/next-step/`

Based on the current analysis state, get recommendations for what to do next.

**Request**:
```json
{
  "has_data": true,
  "data_profiled": true,
  "test_executed": false,
  "results_translated": false
}
```

**Response** (200):
```json
{
  "next_steps": [
    {
      "step": "run_guardian_check",
      "description": "Validate assumptions before running the test",
      "priority": "high"
    },
    {
      "step": "execute_test",
      "description": "Run the recommended statistical test",
      "priority": "high"
    }
  ]
}
```

---

## 4. Manuscript Analysis

**NEW in v2.0.** Automated statistical quality review of research manuscripts. Supports PDF, LaTeX (.tex), and DOCX formats. Extracts statistical claims, checks p-value consistency, and generates SQS scores.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/manuscript/analyze/` | Full manuscript review pipeline | None |
| POST | `/api/v1/manuscript/parse/` | Parse manuscript structure only | None |
| POST | `/api/v1/manuscript/claims/` | Extract statistical claims | None |
| POST | `/api/v1/manuscript/consistency/` | Validate claim consistency | None |
| GET | `/api/v1/manuscript/report/<uuid:submission_id>/` | Retrieve stored review report | None |
| POST | `/api/v1/manuscript/journal/submit/` | Journal-authenticated submission | `X-API-Key` |
| POST | `/api/v1/manuscript/batch-submit/` | Batch submission (up to 10 files) | Optional `X-API-Key` |
| GET | `/api/v1/manuscript/batch-status/<batch_id>/` | Check batch progress | None |

### POST `/api/v1/manuscript/analyze/`

Full manuscript review: parse, extract claims, validate consistency, compute SQS score, generate findings.

**Content-Type**: `multipart/form-data`

**Request**:
```
POST /api/v1/manuscript/analyze/
Content-Type: multipart/form-data

file: <manuscript.pdf>
field: psychology        (optional, default "general")
alpha: 0.05              (optional)
```

**Response** (200):
```json
{
  "submission_id": "a1b2c3d4-...",
  "title": "Effects of Mindfulness on Academic Performance",
  "authors": ["Smith, J.", "Doe, A."],
  "word_count": 8542,
  "sqs_score": 72.5,
  "sqs_grade": "B",
  "claims_found": 14,
  "claims_consistent": 12,
  "claims_inconsistent": 2,
  "consistency_rate": 0.857,
  "decision_errors": 1,
  "gross_errors": 0,
  "findings": [
    {
      "category": "p_value_consistency",
      "severity": "major",
      "message": "Reported t(45)=2.12, p=.02 but computed p=.039",
      "location": "Results, paragraph 3"
    }
  ],
  "processing_time_ms": 3420
}
```

### POST `/api/v1/manuscript/parse/`

Parse a manuscript into structured sections without full analysis.

**Content-Type**: `multipart/form-data`

**Response** (200):
```json
{
  "metadata": {
    "title": "Effects of Mindfulness...",
    "authors": ["Smith, J."],
    "abstract": "This study examines...",
    "keywords": ["mindfulness", "education"],
    "word_count": 8542,
    "page_count": 24,
    "sections_found": ["abstract", "introduction", "methods", "results", "discussion"],
    "statistical_tests_mentioned": ["t-test", "ANOVA", "correlation"],
    "journal_format": "APA"
  },
  "sections": [
    {
      "section_type": "methods",
      "title": "Methods",
      "content_length": 2341,
      "content_preview": "Participants were recruited...",
      "tables_count": 2,
      "figures_mentioned": 1
    }
  ],
  "parse_quality": 0.92,
  "methods_text_length": 2341,
  "results_text_length": 3102,
  "warnings": []
}
```

### POST `/api/v1/manuscript/claims/`

Extract all statistical claims from a manuscript.

**Response** (200):
```json
{
  "claims": [
    {
      "claim_id": "c001",
      "claim_type": "t_test",
      "test_name": "independent t-test",
      "statistic_value": 2.45,
      "p_value": 0.018,
      "p_comparison": "<",
      "df": 48,
      "confidence_interval": [0.12, 1.45],
      "effect_size_type": "Cohen's d",
      "effect_size_value": 0.71,
      "sample_size": 50,
      "location": "Results, Table 2",
      "raw_text": "t(48) = 2.45, p = .018, d = 0.71",
      "confidence": 0.95
    }
  ],
  "summary": {
    "total_claims": 14,
    "claims_by_type": {"t_test": 5, "anova": 3, "correlation": 4, "chi_square": 2},
    "claims_with_p_values": 14,
    "claims_with_effect_sizes": 10,
    "claims_with_ci": 6,
    "claims_with_df": 12,
    "unique_test_types": 4,
    "extraction_warnings": []
  }
}
```

### POST `/api/v1/manuscript/consistency/`

Extract claims and validate statistical consistency (are reported p-values correct given the test statistics and df?).

**Response** (200):
```json
{
  "total_claims_extracted": 14,
  "checkable_claims": 12,
  "results": [
    {
      "claim_id": "c001",
      "claim_type": "t_test",
      "reported_statistic": 2.45,
      "reported_p": 0.018,
      "reported_p_comparison": "=",
      "computed_p": 0.0182,
      "is_consistent": true,
      "is_decision_consistent": true,
      "discrepancy": 0.0002,
      "severity": "none",
      "decision_at_05": "reject",
      "reported_decision_at_05": "reject",
      "raw_text": "t(48) = 2.45, p = .018",
      "note": ""
    }
  ],
  "summary": {
    "total_checked": 12,
    "consistent": 10,
    "inconsistent": 2,
    "decision_errors": 1,
    "gross_errors": 0,
    "could_not_check": 2,
    "overall_consistency_rate": 0.833,
    "severity_counts": {"none": 10, "minor": 1, "major": 1}
  },
  "warnings": []
}
```

### POST `/api/v1/manuscript/journal/submit/`

Journal-authenticated submission. Requires a valid API key. Triggers webhook delivery if the journal has a webhook URL configured.

**Auth**: `X-API-Key` header (required)

**Request** (`multipart/form-data`):
```
file: <manuscript.pdf>
manuscript_id: JSTAT-2026-0042    (optional, journal's internal ID)
title: My Manuscript Title        (optional)
authors: ["Smith, J."]            (optional, JSON array)
```

**Response** (201):
```json
{
  "submission_id": "uuid-...",
  "status": "completed",
  "overall_assessment": "minor_issues",
  "sqs_score": 72.5,
  "sqs_grade": "B",
  "claims_found": 14,
  "consistency_rate": 0.857,
  "decision_errors": 1,
  "gross_errors": 0,
  "findings_count": 4,
  "processing_time_ms": 3420,
  "report_url": "/api/v1/manuscript/report/uuid-.../",
  "webhook_delivered": true
}
```

### POST `/api/v1/manuscript/batch-submit/`

Submit up to 10 manuscripts in a single request. Files are sent as `file_0`, `file_1`, ..., `file_9`.

**Auth**: Optional `X-API-Key` for journal-authenticated batch.

**Request** (`multipart/form-data`):
```
file_0: <manuscript1.pdf>
file_1: <manuscript2.docx>
file_2: <manuscript3.tex>
field: psychology          (optional)
alpha: 0.05                (optional)
```

**Response** (201):
```json
{
  "batch_id": "uuid-...",
  "total_submitted": 3,
  "completed": 3,
  "failed": 0,
  "submissions": [
    {
      "submission_id": "uuid-...",
      "file_name": "manuscript1.pdf",
      "file_index": 0,
      "status": "completed",
      "sqs_score": 72.5,
      "sqs_grade": "B",
      "claims_found": 14,
      "consistency_rate": 0.857,
      "processing_time_ms": 3420,
      "report_url": "/api/v1/manuscript/report/uuid-.../"
    }
  ],
  "errors": []
}
```

### GET `/api/v1/manuscript/batch-status/<batch_id>/`

Check the progress of a batch submission.

**Response** (200):
```json
{
  "batch_id": "uuid-...",
  "total": 3,
  "batch_status": "completed",
  "status_counts": {
    "pending": 0,
    "parsing": 0,
    "analyzing": 0,
    "completed": 3,
    "failed": 0
  },
  "submissions": [...]
}
```

---

## 5. SQS Scoring

The Statistical Quality Score (SQS) evaluates the quality of statistical reporting using 45 rules across 6 categories. Used both standalone and within manuscript review.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/sqs/analyze/` | Full SQS analysis of structured results |
| POST | `/api/v1/sqs/analyze-text/` | SQS analysis of free-text results section |
| GET | `/api/v1/sqs/rules/` | List all 45 scoring rules |
| GET | `/api/v1/sqs/fields/` | List supported research fields |
| GET | `/api/v1/sqs/categories/` | List 6 scoring categories |
| POST | `/api/v1/sqs/quick-check/` | Quick check for common issues |
| GET | `/api/v1/sqs/health/` | SQS subsystem health check |

#### Example: SQS Analysis

**Request**:
```json
POST /api/v1/sqs/analyze/
{
  "results": {
    "test_type": "independent_t",
    "statistic": 2.45,
    "p_value": 0.023,
    "df": 48,
    "effect_size": 0.71,
    "effect_size_type": "cohens_d",
    "confidence_interval": [0.12, 1.45],
    "sample_size": 50,
    "alpha": 0.05
  },
  "field": "psychology"
}
```

**Response** (200):
```json
{
  "sqs_score": 85.0,
  "sqs_grade": "A",
  "category_scores": {
    "reporting_completeness": 90,
    "statistical_validity": 85,
    "effect_size_reporting": 80,
    "assumption_checking": 75,
    "reproducibility": 90,
    "interpretation_quality": 85
  },
  "rules_passed": 38,
  "rules_failed": 7,
  "findings": [
    {
      "rule_id": "R012",
      "category": "assumption_checking",
      "severity": "moderate",
      "message": "No normality test reported"
    }
  ],
  "field_adjustments": "psychology"
}
```

---

## 6. AI Advisor

Claude-powered statistical guidance with NLP-enhanced query parsing. Provides test recommendations, result interpretation, methods section generation, and APA reporting.

### Core Advisor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai-advisor/chat/` | Interactive chat session |
| GET | `/api/v1/ai-advisor/status/` | AI Advisor system status |
| GET | `/api/v1/ai-advisor/conversation/<id>/` | Retrieve conversation history |
| POST | `/api/v1/ai-advisor/quick-recommend/` | Quick test recommendation |
| POST | `/api/v1/ai-advisor/interpret/` | Interpret statistical results |
| POST | `/api/v1/ai-advisor/methods-section/` | Generate methods section text |
| POST | `/api/v1/ai-advisor/assumption-guidance/` | Guidance on assumption violations |

### NLP-Enhanced Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/ai-advisor/parse-query/` | Parse natural language query into structured intent |
| POST | `/api/v1/ai-advisor/analysis-plan/` | Generate full analysis plan from description |
| POST | `/api/v1/ai-advisor/apa-report/` | Generate APA-formatted results section |
| POST | `/api/v1/ai-advisor/enhanced-chat/` | Chat with NLP preprocessing |

#### Example: Quick Recommendation

**Request**:
```json
POST /api/v1/ai-advisor/quick-recommend/
{
  "description": "I want to compare blood pressure before and after treatment in 30 patients",
  "data_summary": {
    "n_participants": 30,
    "design": "within_subjects",
    "outcome_type": "continuous",
    "n_groups": 2
  }
}
```

#### Example: APA Report

**Request**:
```json
POST /api/v1/ai-advisor/apa-report/
{
  "test_type": "paired_t",
  "results": {
    "statistic": 3.21,
    "p_value": 0.003,
    "effect_size": 0.59,
    "df": 29,
    "mean_difference": 5.4,
    "ci": [2.1, 8.7]
  },
  "context": "Blood pressure reduction after 8-week mindfulness intervention"
}
```

---

## 7. Data Management

Endpoints for importing data in various formats (CSV, Excel, SPSS, SAS, Stata, JSON, Parquet) and retrieving data profiles.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/data/import/` | Import data file (CSV, Excel, JSON) |
| POST | `/api/v1/data/universal-import/` | Universal import (SPSS, SAS, Stata, Parquet, and more) |
| GET | `/api/v1/data/supported-formats/` | List all supported import formats |

### POST `/api/v1/data/import/`

Basic data import for CSV, Excel, and JSON files.

**Content-Type**: `multipart/form-data`

**Request**:
```
file: <data.csv>
file_type: csv              (optional, auto-detected)
delimiter: ","              (optional, for CSV)
has_header: true            (optional)
```

**Response** (200):
```json
{
  "data_id": "uuid-...",
  "n_rows": 150,
  "n_cols": 5,
  "variables": [
    {
      "name": "sepal_length",
      "type": "continuous",
      "dtype": "float64",
      "missing_count": 0,
      "unique_count": 35,
      "sample_values": [5.1, 4.9, 4.7]
    }
  ],
  "missing_summary": {
    "total_missing": 0,
    "complete_rows": 150,
    "complete_cols": 5
  },
  "data_types": {"numeric": 4, "categorical": 1},
  "preview": [...]
}
```

### POST `/api/v1/data/universal-import/`

**NEW in v2.0.** Import from SPSS (.sav), SAS (.sas7bdat), Stata (.dta), Parquet, and more. Preserves variable labels, value labels, and metadata.

**Content-Type**: `multipart/form-data`

**Response** (200):
```json
{
  "data_id": "uuid-...",
  "format_detected": "spss",
  "n_rows": 500,
  "n_cols": 12,
  "variables": [...],
  "metadata": {
    "variable_labels": {"q1": "Satisfaction Rating", "q2": "Age Group"},
    "value_labels": {"q1": {"1": "Very Unsatisfied", "5": "Very Satisfied"}},
    "file_encoding": "UTF-8"
  }
}
```

### GET `/api/v1/data/supported-formats/`

**Response** (200):
```json
{
  "formats": [
    {"extension": ".csv", "name": "CSV", "mime": "text/csv"},
    {"extension": ".xlsx", "name": "Excel", "mime": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    {"extension": ".sav", "name": "SPSS", "mime": "application/x-spss-sav"},
    {"extension": ".sas7bdat", "name": "SAS", "mime": "application/x-sas"},
    {"extension": ".dta", "name": "Stata", "mime": "application/x-stata"},
    {"extension": ".parquet", "name": "Parquet", "mime": "application/x-parquet"},
    {"extension": ".json", "name": "JSON", "mime": "application/json"}
  ]
}
```

---

## 8. User Management & Platform

**NEW in v2.0.** Organization management, RBAC, project workspaces, billing, and API key management.

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register/` | Register a new user | None |
| POST | `/api/auth/login/` | Log in and receive session | None |
| GET | `/api/auth/me/` | Get current user info | Session |

### Subscription Tiers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/platform/tiers/` | List available subscription tiers | None (public) |

**Response** (200):
```json
{
  "tiers": [
    {
      "slug": "free",
      "name": "Free",
      "price_monthly": 0,
      "price_yearly": 0,
      "max_team_members": 1,
      "max_projects": 3,
      "max_api_keys": 1,
      "features": {"guardian": true, "sqs": true, "ai_advisor": false}
    },
    {
      "slug": "pro",
      "name": "Professional",
      "price_monthly": 29,
      "price_yearly": 290,
      "max_team_members": 5,
      "max_projects": 20,
      "max_api_keys": 5,
      "features": {"guardian": true, "sqs": true, "ai_advisor": true}
    }
  ],
  "currency": "USD",
  "billing_periods": ["monthly", "yearly"]
}
```

### Organizations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/platform/organizations/` | List user's organizations | Session |
| POST | `/api/v1/platform/organizations/` | Create organization | Session |
| GET | `/api/v1/platform/organizations/<slug>/` | Get organization details | Session |
| PATCH | `/api/v1/platform/organizations/<slug>/` | Update organization | Session |
| GET | `/api/v1/platform/organizations/<slug>/members/` | List members | Session |
| POST | `/api/v1/platform/organizations/<slug>/invite/` | Invite member by email | Session |
| PATCH | `/api/v1/platform/organizations/<slug>/members/<id>/role/` | Change member role | Session (admin+) |

#### Example: Create Organization

**Request**:
```json
POST /api/v1/platform/organizations/
{
  "name": "Research Lab Alpha",
  "description": "Statistical analysis team",
  "contact_email": "admin@researchlab.edu"
}
```

**Response** (201):
```json
{
  "id": "uuid-...",
  "name": "Research Lab Alpha",
  "slug": "research-lab-alpha",
  "tier": "Free"
}
```

#### Example: Invite Member

**Request**:
```json
POST /api/v1/platform/organizations/research-lab-alpha/invite/
{
  "email": "colleague@university.edu",
  "role": "member"
}
```

**Roles**: `owner`, `admin`, `member`, `viewer`

### Projects & RBAC

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/platform/projects/` | List organization projects | Session |
| POST | `/api/v1/platform/projects/` | Create project | Session |
| GET | `/api/v1/platform/projects/<slug>/` | Get project details | Session |
| PATCH | `/api/v1/platform/projects/<slug>/` | Update project | Session |
| DELETE | `/api/v1/platform/projects/<slug>/` | Archive project (soft delete) | Session |
| GET | `/api/v1/platform/permissions/` | Get current user's permissions | Session |

### Billing

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/platform/billing/` | Get subscription status | Session |
| POST | `/api/v1/platform/billing/` | Create Stripe checkout session | Session |
| POST | `/api/v1/platform/billing/webhook/` | Stripe webhook handler | Stripe-Signature |

### Usage & API Keys

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/platform/usage/` | Usage analytics dashboard | Session |
| GET | `/api/v1/platform/api-keys/` | List API keys | Session |
| POST | `/api/v1/platform/api-keys/` | Create new API key | Session |
| DELETE | `/api/v1/platform/api-keys/<uuid:key_id>/` | Revoke an API key | Session |

#### Example: Create API Key

**Request**:
```json
POST /api/v1/platform/api-keys/
{
  "name": "CI/CD Pipeline Key",
  "scopes": ["stats:read", "stats:write", "manuscript:submit"]
}
```

**Response** (201):
```json
{
  "id": "uuid-...",
  "name": "CI/CD Pipeline Key",
  "key": "sfs_k1_a3b4c5d6e7f8g9h0...",
  "prefix": "sfs_k1_a",
  "message": "Save this key -- it will not be shown again."
}
```

---

## 9. Site Licensing

**NEW in v2.0.** Institutional / university site license management. Supports email domain, IP range, SAML SSO, and manual verification methods.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/licensing/tiers/` | List institutional license tiers | None (public) |
| POST | `/api/v1/licensing/create/` | Create institutional license | Session |
| POST | `/api/v1/licensing/verify/` | Verify user eligibility under a license | None |
| GET | `/api/v1/licensing/usage/<license_key>/` | Usage statistics for a license | Session |
| GET | `/api/v1/licensing/report/<license_key>/` | Generate usage report | Session |

### GET `/api/v1/licensing/tiers/`

**Response** (200):
```json
{
  "tiers": [
    {
      "id": "department",
      "name": "Department License",
      "max_users": 50,
      "price_per_year": 2500,
      "features": ["guardian", "sqs", "ai_advisor", "manuscript_review"]
    },
    {
      "id": "university",
      "name": "University-Wide License",
      "max_users": 5000,
      "price_per_year": 15000,
      "features": ["guardian", "sqs", "ai_advisor", "manuscript_review", "priority_support"]
    }
  ],
  "verification_methods": ["email_domain", "ip_range", "saml_sso", "manual"]
}
```

### POST `/api/v1/licensing/create/`

**Auth**: Session required.

**Request**:
```json
{
  "institution_name": "University of Example",
  "tier": "university",
  "admin_email": "stats-admin@example.edu",
  "domain": "example.edu",
  "verification_method": "email_domain",
  "duration_years": 1
}
```

**Response** (201):
```json
{
  "license_key": "SFS-UNIV-A3B4C5D6",
  "institution_name": "University of Example",
  "tier": "university",
  "valid_until": "2027-02-19T00:00:00Z",
  "verification_method": "email_domain",
  "domain": "example.edu"
}
```

### POST `/api/v1/licensing/verify/`

**Request**:
```json
{
  "email": "researcher@example.edu",
  "license_key": "SFS-UNIV-A3B4C5D6"
}
```

**Response** (200):
```json
{
  "eligible": true,
  "institution": "University of Example",
  "tier": "university",
  "reason": "Email domain matches institutional domain"
}
```

### GET `/api/v1/licensing/usage/<license_key>/`

**Auth**: Session required.

**Query params**: `?period=monthly` (default) or `?period=weekly`

---

## 10. Plugin Marketplace

**NEW in v2.0.** Browse, install, execute, and configure plugins for organizations. Plugin types include statistical tests, SQS rule packs, visualizations, data connectors, and report templates.

### Browsing & Details

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/marketplace/plugins/` | Browse available plugins | None |
| GET | `/api/v1/marketplace/plugins/<slug>/` | Get plugin details + reviews | None |
| GET | `/api/v1/marketplace/installed/` | List installed plugins for org | Session |

**Query parameters for browse**:

| Param | Type | Description |
|-------|------|-------------|
| `type` | string | Filter by type: `statistical_test`, `sqs_rule_pack`, `visualization`, `data_connector`, `report_template` |
| `official` | bool | Only official plugins |
| `verified` | bool | Only verified plugins |
| `search` | string | Search by name |
| `sort` | string | `popular` (default), `newest`, `rating`, `name` |

### Installation & Management

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/marketplace/plugins/<slug>/install/` | Install plugin for org | Session |
| DELETE | `/api/v1/marketplace/plugins/<slug>/install/` | Uninstall plugin | Session |
| POST | `/api/v1/marketplace/plugins/<slug>/review/` | Submit/update review (1-5 stars) | Session |

### Plugin Runtime

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/v1/marketplace/plugins/<slug>/execute/` | Execute installed plugin | Session |
| PATCH | `/api/v1/marketplace/plugins/<slug>/config/` | Update plugin configuration | Session |

#### Example: Execute Plugin

**Request**:
```json
POST /api/v1/marketplace/plugins/bayesian-ttest/execute/
{
  "data": {
    "group1": [23.1, 25.4, 22.8],
    "group2": [28.3, 27.1, 29.5]
  },
  "config": {
    "prior_scale": 0.707,
    "iterations": 10000
  }
}
```

#### Example: Update Plugin Config

**Request**:
```json
PATCH /api/v1/marketplace/plugins/bayesian-ttest/config/
{
  "config": {
    "prior_scale": 1.0,
    "default_iterations": 5000
  }
}
```

**Response** (200):
```json
{
  "status": "updated",
  "plugin": "Bayesian T-Test",
  "config": {
    "prior_scale": 1.0,
    "default_iterations": 5000
  }
}
```

---

## 11. GDPR Compliance

**NEW in v2.0.** Data subject rights endpoints compliant with GDPR Articles 13-20. Handles consent management, data export (DSAR), and right to erasure.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/privacy/consent/` | Get consent status for all activities | Session |
| POST | `/api/v1/privacy/consent/` | Update consent for an activity | Session |
| GET | `/api/v1/privacy/export/` | Export all personal data (Art. 15 + Art. 20) | Session |
| POST | `/api/v1/privacy/erase/` | Right to erasure / right to be forgotten (Art. 17) | Session |
| GET | `/api/v1/privacy/info/` | Data processing information (Art. 13/14) | None (public) |

### GET `/api/v1/privacy/consent/`

**Auth**: Session required.

**Response** (200):
```json
{
  "consents": [
    {
      "consent_type": "analytics",
      "granted": true,
      "updated_at": "2026-01-15T10:30:00Z",
      "description": "Usage analytics for platform improvement"
    },
    {
      "consent_type": "ai_processing",
      "granted": false,
      "updated_at": "2026-01-10T08:00:00Z",
      "description": "AI-powered statistical guidance using your data"
    }
  ]
}
```

### POST `/api/v1/privacy/consent/`

**Request**:
```json
{
  "consent_type": "analytics",
  "granted": true
}
```

### GET `/api/v1/privacy/export/`

**Auth**: Session required. Returns all personal data across all categories.

**Response** (200):
```json
{
  "user": {
    "username": "researcher1",
    "email": "researcher@university.edu",
    "date_joined": "2025-06-15T12:00:00Z"
  },
  "analyses": [...],
  "datasets_metadata": [...],
  "consent_history": [...],
  "audit_trail": [...],
  "exported_at": "2026-02-19T14:30:00Z"
}
```

### POST `/api/v1/privacy/erase/`

**Auth**: Session required. Requires explicit confirmation.

**Request**:
```json
{
  "confirm": true
}
```

**Response** (200):
```json
{
  "status": "erased",
  "items_deleted": {
    "analyses": 15,
    "datasets": 8,
    "reports": 12,
    "audit_records": 45
  },
  "retention_note": "Some records may be retained for legal compliance for up to 30 days."
}
```

### GET `/api/v1/privacy/info/`

Public endpoint. Returns data processing information per GDPR Art. 13/14.

---

## 12. Journal Integration & Analytics

**NEW in v2.0.** Analytics dashboard endpoints for journal editors and administrators. Provides aggregate statistics on submissions, SQS scores, common issues, and trends.

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/journal/analytics/overview/` | Summary metrics for journal submissions | None |
| GET | `/api/v1/journal/analytics/issues/` | Most common statistical issues | None |
| GET | `/api/v1/journal/analytics/trends/` | SQS score trends over time (weekly) | None |
| GET | `/api/v1/journal/analytics/comparison/` | Compare current vs previous period | None |

All journal analytics endpoints require the `?journal=<slug>` query parameter.

### GET `/api/v1/journal/analytics/overview/`

**Query params**: `?journal=<slug>&days=30`

**Response** (200):
```json
{
  "journal": "Journal of Statistical Software",
  "period_days": 30,
  "total_submissions": 47,
  "by_status": {
    "completed": 42,
    "analyzing": 3,
    "failed": 2
  },
  "sqs_scores": {
    "average": 68.3,
    "distribution": {
      "excellent_80_plus": 12,
      "good_60_79": 18,
      "needs_work_40_59": 8,
      "poor_below_40": 4
    },
    "scored_count": 42
  }
}
```

### GET `/api/v1/journal/analytics/issues/`

**Query params**: `?journal=<slug>&days=90`

**Response** (200):
```json
{
  "journal": "Journal of Statistical Software",
  "period_days": 90,
  "submissions_analyzed": 120,
  "top_issues": [
    {"category": "missing_effect_sizes", "count": 45, "percentage": 37.5},
    {"category": "p_value_inconsistency", "count": 28, "percentage": 23.3},
    {"category": "no_confidence_intervals", "count": 22, "percentage": 18.3}
  ],
  "severity_breakdown": {
    "critical": 8,
    "major": 35,
    "moderate": 52,
    "minor": 25
  }
}
```

### GET `/api/v1/journal/analytics/trends/`

**Query params**: `?journal=<slug>&days=180`

Returns weekly SQS score averages and submission counts.

### GET `/api/v1/journal/analytics/comparison/`

**Query params**: `?journal=<slug>&days=30`

Compares current period with the equivalent previous period, including percentage change calculations.

---

## 13. Specialized Modules

### Missing Data Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/missing-data/detect/` | Detect missing data patterns (MCAR/MAR/MNAR) |
| POST | `/api/v1/missing-data/impute/` | Impute missing data (mean, median, mode, regression) |
| POST | `/api/v1/missing-data/little-test/` | Little's MCAR test |
| POST | `/api/v1/missing-data/compare/` | Compare imputation methods |
| POST | `/api/v1/missing-data/visualize/` | Generate missing data visualizations |
| POST | `/api/v1/missing-data/multiple-imputation/` | Multiple imputation (MICE) |
| POST | `/api/v1/missing-data/knn/` | K-nearest neighbors imputation |
| POST | `/api/v1/missing-data/em/` | EM algorithm imputation |
| GET | `/api/v1/missing-data/info/` | Available imputation methods |

### Survival Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/survival/availability/` | Check if survival analysis is available |
| POST | `/api/v1/survival/kaplan-meier/` | Kaplan-Meier survival analysis |
| POST | `/api/v1/survival/cox-regression/` | Cox proportional hazards regression |
| POST | `/api/v1/survival/predict/` | Predict survival probabilities |
| GET | `/api/v1/survival/tutorial/` | Survival analysis tutorial |

### Factor Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/factor/availability/` | Check if factor analysis is available |
| POST | `/api/v1/factor/adequacy/` | KMO and Bartlett's test of adequacy |
| POST | `/api/v1/factor/determine/` | Determine number of factors (parallel analysis, scree) |
| POST | `/api/v1/factor/efa/` | Exploratory factor analysis |
| POST | `/api/v1/factor/transform/` | Apply factor transformations (Varimax, Promax) |
| GET | `/api/v1/factor/tutorial/` | Factor analysis tutorial |

### Meta-Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/meta-analysis/` | Run meta-analysis (fixed/random effects) |
| POST | `/api/v1/meta-analysis/convert-effect/` | Convert between effect size measures |
| POST | `/api/v1/meta-analysis/calculate-se/` | Calculate standard errors from reported stats |
| POST | `/api/v1/meta-analysis/publication-bias/` | Funnel plot, Egger's test, trim-and-fill |
| POST | `/api/v1/meta-analysis/sensitivity/` | Leave-one-out sensitivity analysis |
| POST | `/api/v1/meta-analysis/subgroup/` | Subgroup analysis |

### Causal Inference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/core/causal/dag/create/` | Create directed acyclic graph |
| POST | `/api/v1/core/causal/dag/analyze/` | Analyze DAG for causal paths |
| POST | `/api/v1/core/causal/adjustment/` | Compute adjustment sets |
| POST | `/api/v1/core/causal/propensity/` | Propensity score estimation |
| POST | `/api/v1/core/causal/match/` | Propensity score matching |
| POST | `/api/v1/core/causal/effect/` | Estimate treatment effects (ATE/ATT) |
| POST | `/api/v1/core/causal/sensitivity/` | Sensitivity analysis for unmeasured confounding |
| POST | `/api/v1/core/causal/mediation/baron-kenny/` | Baron-Kenny mediation analysis |
| POST | `/api/v1/core/causal/mediation/causal/` | Causal mediation analysis |
| POST | `/api/v1/core/causal/mediation/sensitivity/` | Mediation sensitivity analysis |
| POST | `/api/v1/core/causal/mediation/multiple/` | Multiple mediator analysis |
| POST | `/api/v1/core/causal/did/` | Difference-in-differences |
| POST | `/api/v1/core/causal/did/event-study/` | Event study design |
| POST | `/api/v1/core/causal/did/parallel-trends/` | Parallel trends test |
| POST | `/api/v1/core/causal/did/staggered/` | Staggered DiD (Callaway-Sant'Anna) |

### Mixed Models

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/core/mixed/icc/` | Intraclass correlation coefficient |
| POST | `/api/v1/core/mixed/lmm/fit/` | Fit linear mixed model |
| POST | `/api/v1/core/mixed/lmm/random-effects/` | Extract random effects |
| POST | `/api/v1/core/mixed/lmm/compare/` | Compare nested models (LRT) |
| POST | `/api/v1/core/mixed/lmm/diagnostics/` | Model diagnostics |

### Audit System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/audit/summary/` | Audit trail summary |
| POST | `/api/v1/audit/record/` | Record an audit event |
| GET | `/api/v1/audit/metrics/<metric_type>/` | Get audit metrics |
| GET | `/api/v1/audit/health/` | Audit subsystem health |

### Report Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/reports/` | List reports |
| POST | `/api/v1/reports/generate/` | Generate a new report |
| GET | `/api/v1/reports/<uuid:report_id>/` | Get report details |
| POST | `/api/v1/reports/<uuid:report_id>/export/` | Export report (PDF, HTML, DOCX, LaTeX) |

### SSO / OIDC

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/sso/config/` | Get SSO configuration | None |
| POST | `/api/v1/sso/login/` | Initiate SSO login flow | None |
| GET/POST | `/api/v1/sso/callback/` | SSO callback handler | None |
| POST | `/api/v1/sso/validate/` | Validate SSO token | None |
| GET | `/api/v1/sso/providers/` | List configured SSO providers | None |

### LMS Integration (LTI 1.3)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/lti/config/` | LTI tool configuration (JSON) |
| POST | `/api/v1/lti/login/` | LTI OIDC login initiation |
| POST | `/api/v1/lti/launch/` | LTI resource launch handler |
| POST | `/api/v1/lti/deep-link/` | LTI deep linking response |
| POST | `/api/v1/lti/grade/` | LTI grade passback (AGS) |
| GET | `/api/v1/lti/platforms/` | List registered LMS platforms |
| GET | `/api/v1/lti/jwks/` | JWKS endpoint for LTI key verification |

### Certification Program

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/certification/levels/` | List certification levels | None |
| GET | `/api/v1/certification/levels/<level_id>/` | Level details and requirements | None |
| POST | `/api/v1/certification/exam/start/` | Start a certification exam | Session |
| POST | `/api/v1/certification/exam/submit/` | Submit exam answers | Session |
| GET | `/api/v1/certification/verify/<certificate_id>/` | Verify a certificate | None |
| GET | `/api/v1/certification/my-certifications/` | List user's certifications | Session |

### Additional Statistical Modules

These modules are mounted at separate URL prefixes under `/api/v1/`:

#### Confidence Intervals (`/api/v1/confidence-intervals/`)

REST framework router-based endpoints with ViewSet CRUD operations:

| Prefix | Description |
|--------|-------------|
| `projects/` | Confidence interval projects (CRUD) |
| `data/` | Interval data management |
| `results/` | Stored results |
| `simulations/` | Simulation results |
| `resources/` | Educational resources |
| `calculate/` | **Compute confidence intervals** (primary endpoint) |

#### Probability Distributions (`/api/v1/probability-distributions/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `create/` | Create a distribution object |
| POST | `calculate/` | Calculate probability for a distribution |
| POST | `sample/` | Generate random samples |
| POST | `fit/` | Fit distribution to data |
| POST | `approximations/` | Compare distribution approximations |
| POST | `process-capability/` | Process capability analysis |
| POST | `poisson-process/` | Simulate Poisson process |
| GET | `examples/` | Distribution examples |

#### SQC Analysis (`/api/v1/sqc-analysis/`)

| Prefix / Endpoint | Description |
|--------------------|-------------|
| `control-charts/` | Control chart ViewSet (CRUD) |
| `process-capability/` | Process capability ViewSet |
| `acceptance-sampling/` | Acceptance sampling ViewSet |
| `msa/` | Measurement system analysis ViewSet |
| `economic-design/` | Economic design ViewSet |
| `spc-implementation/` | SPC implementation ViewSet |
| `quick-control-chart/` | Quick control chart generation |
| `quick-capability/` | Quick process capability analysis |
| `quick-sampling/` | Quick acceptance sampling |
| `quick-msa/` | Quick MSA |
| `simulation/` | SQC simulation |
| `demo/` | Demo data |

#### Design of Experiments (`/api/v1/doe-analysis/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `generate-design/` | Generate experimental design |
| POST | `analyze-experiment/` | Analyze experimental data |
| POST | `optimize-response/` | Response surface optimization |
| POST | `generate-report/` | Generate DOE report |
| POST | `screening-analysis/` | Screening design analysis |
| GET | `examples/` | DOE examples |

#### PCA Analysis (`/api/v1/pca-analysis/`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `quick/` | Quick PCA analysis |
| POST | `interactive/` | Interactive PCA with component selection |
| POST | `gene-contribution/` | Gene/variable contribution analysis |
| POST | `comparison/` | Compare PCA results |
| POST | `simulation/` | PCA simulation |
| GET | `demo/` | Demo data for PCA |

---

## 14. System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health/` | Health check (for container orchestration) |
| GET | `/api/v1/test/` | Simple test endpoint (returns 200 with status) |
| GET | `/api/v1/validation/dashboard/` | Validation dashboard metrics |
| GET | `/api/v1/schema/` | OpenAPI 3.0 schema (JSON) |
| GET | `/api/v1/schema/swagger/` | Swagger UI interactive documentation |
| GET | `/api/v1/schema/redoc/` | ReDoc API documentation |

### GET `/api/v1/health/`

**Response** (200):
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2026-02-19T14:30:00Z",
  "components": {
    "database": "ok",
    "guardian": "ok",
    "sqs": "ok"
  }
}
```

### GET `/api/v1/schema/`

Returns the full OpenAPI 3.0 specification as JSON. Can be imported into Postman, Swagger, or other API tools.

---

## Testing the API

### Using cURL

```bash
# Health check
curl http://localhost:8000/api/v1/health/

# Run a t-test
curl -X POST http://localhost:8000/api/v1/stats/ttest/ \
  -H "Content-Type: application/json" \
  -d '{
    "test_type": "independent",
    "group1": [23.1, 25.4, 22.8, 24.5],
    "group2": [28.3, 27.1, 29.5, 26.8],
    "alpha": 0.05
  }'

# Autonomous query with file upload
curl -X POST http://localhost:8000/api/v1/autonomous/profile/ \
  -F "file=@data.csv" \
  -F "user_hint=Compare groups"

# Manuscript analysis
curl -X POST http://localhost:8000/api/v1/manuscript/analyze/ \
  -F "file=@manuscript.pdf" \
  -F "field=psychology"

# Journal submission with API key
curl -X POST http://localhost:8000/api/v1/manuscript/journal/submit/ \
  -H "X-API-Key: sfs_j_abcdef1234567890" \
  -F "file=@manuscript.pdf" \
  -F "manuscript_id=JSTAT-2026-0042"
```

### Using the Integration Test Script

```bash
cd backend
python test_integration.py
```

### Using Swagger UI

Navigate to `http://localhost:8000/api/v1/schema/swagger/` for interactive API documentation with a built-in request builder.

---

## Changelog

### v2.0.0 (February 2026)
- **Autonomous Intelligence Layer**: Smart profiling, natural language queries, Guardian cascade, plain-language translation, next-step recommendations
- **Manuscript Review**: Full statistical quality review pipeline for PDF/LaTeX/DOCX manuscripts, claim extraction, consistency validation, batch submission
- **Journal Integration**: Journal-authenticated submissions with API keys, webhook delivery, analytics dashboard (overview, issues, trends, comparison)
- **Universal Platform Layer**: Organizations, RBAC, projects, Stripe billing, API key management, subscription tiers
- **Site Licensing**: Institutional licenses with email domain, IP range, SAML SSO verification
- **Plugin Marketplace**: Browse, install, execute, configure, and review plugins
- **GDPR Compliance**: Consent management, data export (DSAR), right to erasure, privacy info
- **SSO/OIDC**: Enterprise single sign-on with configurable providers
- **LMS Integration**: LTI 1.3 support for Canvas, Moodle, Blackboard
- **Certification Program**: Statistical literacy certification with exam management
- **Universal Data Import**: SPSS, SAS, Stata, Parquet format support
- **OpenAPI 3.0 Schema**: Full schema with Swagger UI and ReDoc

### v1.0.0 (January 2025)
- High-precision statistical tests (t-test, ANOVA, ANCOVA, correlation, regression)
- Guardian Statistical Protection System (8 validators, 38 tests)
- SQS Scoring (45 rules, 6 categories)
- AI Advisor with NLP-enhanced endpoints
- Categorical analysis (chi-square, Fisher's, McNemar, G-test, binomial, multinomial)
- Nonparametric tests (Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman, and more)
- Missing data analysis (detection, imputation, Little's MCAR, MICE, KNN, EM)
- Survival analysis (Kaplan-Meier, Cox regression)
- Factor analysis (EFA, adequacy, parallel analysis)
- Meta-analysis (fixed/random effects, publication bias, sensitivity)
- Causal inference (DAGs, propensity scores, DiD, mediation)
- Mixed models (ICC, LMM, model comparison)
- Power analysis (11 endpoints covering t-test, ANOVA, correlation, chi-square)
- Regression (linear, multiple, polynomial, logistic, ridge, lasso)
- Report management and audit system
- Confidence intervals, probability distributions, SQC, DOE, PCA modules

---

*Last Updated: February 19, 2026*
*API Version: 2.0.0*
*Total Endpoints: 195*
