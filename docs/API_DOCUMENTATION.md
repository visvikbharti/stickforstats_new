# StickForStats API Documentation

## Overview

The StickForStats API provides endpoints for statistical analysis, test recommendations, and data processing. All endpoints follow RESTful conventions and return JSON responses.

**Base URL**: `http://localhost:8000/api`

**Authentication**: Currently using session authentication (JWT tokens coming in v1.1)

**Content Type**: `application/json` (except file uploads which use `multipart/form-data`)

---

## Test Recommender Module

### 1. Upload Data

**Endpoint**: `POST /test-recommender/upload-data/`

**Description**: Upload a data file for analysis. Supports CSV, Excel, and JSON formats.

**Headers**:
```
Content-Type: multipart/form-data
```

**Request Body**:
```javascript
{
  file: File,           // Required: The data file
  file_type: string,    // Optional: 'csv', 'excel', 'json' (auto-detected)
  delimiter: string,    // Optional: For CSV files (default: ',')
  has_header: boolean   // Optional: Whether first row contains headers (default: true)
}
```

**Response** (200 OK):
```json
{
  "data_id": "uuid-string",
  "n_rows": 100,
  "n_cols": 5,
  "variables": [
    {
      "name": "age",
      "type": "continuous",
      "dtype": "float64",
      "missing_count": 0,
      "unique_count": 45,
      "sample_values": [23, 34, 45, 56, 67]
    }
  ],
  "missing_summary": {
    "total_missing": 5,
    "complete_rows": 95,
    "complete_cols": 4
  },
  "data_types": {
    "numeric": 3,
    "categorical": 2
  },
  "preview": [
    {"col1": "value1", "col2": "value2"},
    // First 5 rows
  ]
}
```

**Error Responses**:
- `400 Bad Request`: Invalid file format or corrupted file
- `413 Payload Too Large`: File exceeds 50MB limit

---

### 2. Check Assumptions

**Endpoint**: `POST /test-recommender/check-assumptions/`

**Description**: Check statistical assumptions for the uploaded data.

**Request Body**:
```json
{
  "data_id": "uuid-string",
  "test_type": "normality",  // Options: normality, homogeneity, independence, outliers
  "variables": ["var1", "var2"],
  "alpha": 0.05
}
```

**Response** (200 OK):
```json
[
  {
    "test_name": "Shapiro-Wilk Test",
    "statistic": 0.9654,
    "p_value": 0.0823,
    "passed": true,
    "interpretation": "Data appears to be normally distributed (p > 0.05)",
    "recommendations": [
      "Parametric tests are appropriate",
      "Consider t-test or ANOVA"
    ]
  }
]
```

---

### 3. Get Test Recommendations

**Endpoint**: `POST /test-recommender/recommend/`

**Description**: Get recommended statistical tests based on data characteristics.

**Request Body**:
```json
{
  "data_id": "uuid-string",
  "dependent_var": "outcome",
  "independent_vars": ["group", "treatment"],
  "hypothesis_type": "difference",  // Options: difference, relationship, prediction
  "is_paired": false,
  "alpha": 0.05
}
```

**Response** (200 OK):
```json
[
  {
    "test_name": "Independent t-test",
    "test_type": "parametric",
    "suitability_score": 0.95,
    "reasons": [
      "Two groups comparison",
      "Continuous outcome variable",
      "Normality assumption met"
    ],
    "assumptions_met": ["normality", "independence"],
    "assumptions_violated": [],
    "power_estimate": 0.85,
    "sample_size_adequate": true,
    "alternatives": [
      {
        "name": "Mann-Whitney U",
        "when_to_use": "If normality is violated"
      }
    ]
  }
]
```

---

### 4. Run Statistical Test

**Endpoint**: `POST /test-recommender/run-test/`

**Description**: Execute a specific statistical test on the data.

**Request Body**:
```json
{
  "data_id": "uuid-string",
  "test_type": "t-test",
  "dependent_var": "outcome",
  "independent_vars": ["group"],
  "parameters": {
    "equal_variance": true,
    "alternative": "two-sided"
  },
  "options": {
    "calculate_effect_size": true,
    "include_plots": false
  }
}
```

**Response** (200 OK):
```json
{
  "test_name": "Independent Samples t-test",
  "statistic": 2.345,
  "p_value": 0.0234,
  "degrees_of_freedom": 98,
  "effect_size": {
    "type": "Cohen's d",
    "value": 0.47,
    "confidence_interval": [0.12, 0.82],
    "interpretation": "Medium effect"
  },
  "confidence_interval": [0.23, 1.45],
  "summary_statistics": {
    "group1": {
      "mean": 45.2,
      "std": 8.3,
      "n": 50
    },
    "group2": {
      "mean": 49.1,
      "std": 7.9,
      "n": 50
    }
  },
  "interpretation": "Significant difference between groups (p < 0.05)",
  "apa_format": "t(98) = 2.35, p = .023, d = 0.47",
  "assumptions": [
    {
      "name": "Normality",
      "passed": true,
      "details": "Shapiro-Wilk test passed"
    }
  ],
  "post_hoc": null
}
```

---

## Multiplicity Correction Module

### 1. Apply Correction

**Endpoint**: `POST /multiplicity/correct/`

**Description**: Apply multiple testing correction to p-values.

**Request Body**:
```json
{
  "p_values": [0.01, 0.04, 0.03, 0.25, 0.002],
  "method": "holm",  // Options: bonferroni, holm, fdr_bh, etc.
  "alpha": 0.05,
  "hypothesis_names": ["H1", "H2", "H3", "H4", "H5"]  // Optional
}
```

**Response** (200 OK):
```json
{
  "method": "Holm-Bonferroni",
  "alpha_original": 0.05,
  "alpha_adjusted": 0.01,
  "p_values_original": [0.01, 0.04, 0.03, 0.25, 0.002],
  "p_values_adjusted": [0.04, 0.08, 0.08, 0.25, 0.01],
  "rejected": [true, false, false, false, true],
  "n_significant": 2,
  "n_tests": 5,
  "family_wise_error_rate": 0.05,
  "false_discovery_rate": 0.02,
  "summary": "2 out of 5 hypotheses remain significant after correction"
}
```

---

## Power Analysis Module

### 1. Calculate Power

**Endpoint**: `POST /power/calculate/`

**Description**: Calculate statistical power or required sample size.

**Request Body** (for power calculation):
```json
{
  "test_type": "t-test",
  "effect_size": 0.5,
  "sample_size": 30,
  "alpha": 0.05,
  "n_groups": 2,
  "alternative": "two-sided"
}
```

**Request Body** (for sample size calculation):
```json
{
  "test_type": "anova",
  "effect_size": 0.3,
  "power": 0.8,
  "alpha": 0.05,
  "n_groups": 3,
  "alternative": "two-sided"
}
```

**Response** (200 OK):
```json
{
  "power": 0.85,  // Or null if calculating sample size
  "sample_size": 45,  // Or null if calculating power
  "effect_size": 0.5,
  "alpha": 0.05,
  "test_type": "t-test",
  "n_groups": 2,
  "critical_value": 1.96,
  "noncentrality": 2.74,
  "interpretation": "Power of 0.85 indicates 85% chance of detecting the effect",
  "power_curve": [
    {"sample_size": 10, "power": 0.29},
    {"sample_size": 20, "power": 0.56},
    {"sample_size": 30, "power": 0.85}
  ],
  "recommendations": [
    "Current sample size provides adequate power",
    "Consider increasing sample size to 40 for 90% power"
  ]
}
```

---

## Effect Sizes Module

### 1. Calculate Effect Size

**Endpoint**: `POST /effect-sizes/calculate/`

**Description**: Calculate effect size from data.

**Request Body**:
```json
{
  "data_id": "uuid-string",
  "test_type": "cohens_d",
  "groups": ["group1", "group2"],
  "confidence_level": 0.95
}
```

**Response** (200 OK):
```json
{
  "effect_size_type": "Cohen's d",
  "value": 0.68,
  "confidence_interval": [0.31, 1.05],
  "standard_error": 0.19,
  "interpretation": "Medium to large effect",
  "magnitude": "medium",
  "sample_size": 100,
  "benchmarks": {
    "small": 0.2,
    "medium": 0.5,
    "large": 0.8
  }
}
```

### 2. Convert Effect Size

**Endpoint**: `POST /effect-sizes/convert/`

**Description**: Convert between different effect size measures.

**Request Body**:
```json
{
  "value": 0.5,
  "from_type": "cohens_d",
  "to_type": "correlation_r",
  "sample_size": 100
}
```

**Response** (200 OK):
```json
{
  "original_value": 0.5,
  "original_type": "cohens_d",
  "converted_value": 0.243,
  "converted_type": "correlation_r",
  "formula": "r = d / sqrt(d^2 + 4)",
  "notes": "Conversion assumes equal group sizes"
}
```

---

## Reproducibility Module

### 1. Create Bundle

**Endpoint**: `POST /reproducibility/create-bundle/`

**Description**: Create a reproducibility bundle for an analysis.

**Request Body**:
```json
{
  "analysis_id": "uuid-string",
  "title": "My Analysis",
  "description": "Description of the analysis",
  "include_data": true,
  "include_code": true,
  "include_environment": true,
  "include_results": true,
  "compression": "gzip"
}
```

**Response** (200 OK):
```json
{
  "bundle_id": "uuid-string",
  "fingerprint": "sha256:abc123...",
  "created_at": "2024-01-13T10:30:00Z",
  "size_bytes": 1048576,
  "contents": {
    "data": true,
    "code": true,
    "environment": true,
    "results": true
  },
  "download_url": "/api/reproducibility/download/uuid-string",
  "validation_status": "valid",
  "reproducibility_score": 0.95
}
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "detail": "Detailed error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-13T10:30:00Z",
  "request_id": "req_abc123"
}
```

**Common Error Codes**:
- `INVALID_DATA`: Data validation failed
- `DATA_NOT_FOUND`: Referenced data ID doesn't exist
- `INSUFFICIENT_DATA`: Not enough data for the requested operation
- `PARAMETER_ERROR`: Invalid parameter values
- `SERVER_ERROR`: Internal server error

---

## Rate Limiting

- **Default**: 1000 requests per hour per IP
- **File uploads**: 100 per hour per IP
- **Heavy computations**: 50 per hour per IP

---

## Versioning

The API uses URL versioning. Current version: `v1`

Future versions will be available at `/api/v2/...`

---

## Testing the API

### Using the Integration Test Script

```bash
cd backend
python test_integration.py
```

### Using cURL

```bash
# Upload data
curl -X POST http://localhost:8000/api/test-recommender/upload-data/ \
  -F "file=@sample_data.csv" \
  -F "file_type=csv"

# Check assumptions
curl -X POST http://localhost:8000/api/test-recommender/check-assumptions/ \
  -H "Content-Type: application/json" \
  -d '{
    "data_id": "your-data-id",
    "test_type": "normality",
    "variables": ["var1"]
  }'
```

### Using Postman

1. Import the collection from `/docs/postman_collection.json`
2. Set the base URL to `http://localhost:8000/api`
3. Run the requests in sequence

---

## Changelog

### v1.0.0 (January 2025)
- Initial release
- Test Recommender module
- Multiplicity Correction module
- Power Analysis module
- Effect Sizes module
- Basic Reproducibility features

### Planned for v1.1.0
- JWT authentication
- WebSocket support for long-running analyses
- Batch processing endpoints
- Export results in multiple formats
- Advanced visualization endpoints

---

*Last Updated: January 13, 2025*
*API Version: 1.0.0*