# StickForStats: System Architecture Section (Draft for JSS)

## 3. System Architecture

StickForStats follows a three-tier architecture comprising a user interface layer, an application layer, and a data layer. This section describes the technology stack, design principles, and integration points.

### 3.1 Technology Stack

**Frontend (User Interface Layer):**
- React 18 with functional components and hooks
- Material-UI component library for consistent design
- Axios for HTTP requests
- Plotly.js and D3.js for statistical visualizations
- Redux Toolkit for state management

**Backend (Application Layer):**
- Django 4.2 with Django REST Framework
- Python 3.11 for statistical computation
- NumPy 1.24 and SciPy 1.11 for standard-precision calculations
- mpmath for arbitrary-precision arithmetic
- scikit-learn for machine learning utilities

**Data Layer:**
- PostgreSQL 15 for primary data storage (production)
- SQLite for development and testing
- Redis for session caching and rate limiting
- File storage for report exports

**Deployment:**
- Docker and Docker Compose for containerization
- Nginx for reverse proxy and static file serving
- Gunicorn WSGI server for production
- Celery for background task processing (report generation)

### 3.2 Design Principles

Four principles guided the architectural decisions:

**1. Computation Correctness First.**
Statistical software must produce correct results. We prioritized calculation accuracy over performance optimizations that might introduce errors. All statistical functions were validated against reference implementations (Section 6) before integration.

**2. Transparency by Default.**
Every statistical analysis returns complete information: test statistics, p-values, effect sizes, confidence intervals, and assumption check results. Users cannot obtain abbreviated results that hide important context.

**3. Reproducibility Built-In.**
Each analysis is associated with metadata enabling exact reproduction: data fingerprints (SHA-256), software version, parameter settings, and timestamp. This metadata is stored alongside results and included in exports.

**4. Modularity for Extension.**
The architecture separates concerns cleanly: the Guardian layer knows nothing about visualization; the statistical engine knows nothing about user sessions; the API layer handles only routing and serialization. This separation enables independent testing and extension.

### 3.3 User Interface Layer

The React frontend provides four main modules:

**Statistical Analysis Tools.** The primary interface for conducting analyses. Users upload data, select test type, and receive results with integrated Guardian reports. Supported input formats include CSV, Excel, and direct data entry.

**Learning Hub.** A collection of 50 interactive lessons covering statistical concepts from basic descriptive statistics to advanced methods like meta-analysis and survival analysis. Lessons include embedded quizzes and links to relevant analysis tools.

**AI Advisor.** An integration with Claude (Anthropic) that provides contextual guidance on statistical decisions. Users can ask questions about test selection, interpretation, and assumptions in natural language.

**Report Manager.** Tools for generating publication-ready reports, including forest plots, funnel plots, and statistical summaries. Reports can be exported as PDF, HTML, or LaTeX.

### 3.4 Application Layer

The Django backend is organized into several apps:

**api/v1/:** REST endpoints for all statistical operations
**core/:** Statistical computation modules
**core/guardian/:** Guardian assumption validation system
**users/:** Authentication and user management
**reports/:** Report generation and storage

#### 3.4.1 Statistical Engine

The statistical engine provides a unified interface for all analyses:

```python
class StatisticalEngine:
    def run_analysis(self, test_type: str, data: dict, options: dict) -> dict:
        """
        Execute statistical analysis with automatic Guardian validation.

        Parameters:
            test_type: Name of statistical test (e.g., 't_test', 'anova')
            data: Input data as arrays or DataFrame
            options: Test-specific parameters

        Returns:
            Dictionary containing:
            - results: Statistical test results
            - guardian_report: Assumption validation results
            - effect_sizes: Standardized effect measures
            - visualizations: Plot data for rendering
        """
```

Internally, the engine:
1. Routes the request to the appropriate test function
2. Invokes Guardian to validate assumptions
3. Executes the statistical test
4. Computes effect sizes and confidence intervals
5. Generates visualization data
6. Returns the combined response

#### 3.4.2 Dual-Precision Architecture

StickForStats provides two precision levels:

**Standard Precision (default):** Uses NumPy/SciPy with IEEE 754 double-precision (~15 significant digits). Sufficient for virtually all practical analyses.

**High Precision (optional):** Uses mpmath with 50-decimal-place precision. Activated by setting `high_precision=True` in API requests.

The dual-precision design serves several purposes:

1. **Verification:** Comparing standard and high-precision results can reveal numerical instability
2. **Audit Trail:** For published results, high precision provides exact values for verification
3. **Edge Cases:** Analyses involving very small p-values or extreme values benefit from extended precision

Implementation example:

```python
def calculate_t_statistic(data1, data2, high_precision=False):
    if high_precision:
        from mpmath import mpf, sqrt
        # Convert to arbitrary precision
        d1 = [mpf(str(x)) for x in data1]
        d2 = [mpf(str(x)) for x in data2]
        # Compute with 50-decimal precision
        ...
    else:
        # Standard NumPy computation
        return scipy.stats.ttest_ind(data1, data2)
```

#### 3.4.3 Guardian Integration

Guardian is integrated at the API layer to ensure all requests pass through validation:

```python
@api_view(['POST'])
def ttest(request):
    data = request.data

    # Guardian validation (automatic)
    guardian = GuardianCore()
    guardian_report = guardian.check(
        data=[data['data1'], data['data2']],
        test_type='t_test',
        alpha=data.get('alpha', 0.05)
    )

    # Execute statistical test
    result = perform_ttest(
        data['data1'],
        data['data2'],
        test_type=data.get('test_type', 'independent')
    )

    # Combined response
    return Response({
        'results': result,
        'guardian_report': guardian_report.to_dict(),
        'can_proceed': guardian_report.can_proceed,
        'confidence_score': guardian_report.confidence_score
    })
```

This pattern ensures Guardian cannot be bypassed—it is part of every statistical endpoint's execution path.

### 3.5 API Design

The REST API follows consistent conventions:

**Endpoints:**
```
POST /api/v1/stats/ttest/          - T-tests
POST /api/v1/stats/anova/          - ANOVA
POST /api/v1/stats/correlation/    - Correlation
POST /api/v1/stats/chi-square/     - Chi-square tests
POST /api/v1/meta-analysis/        - Meta-analysis
POST /api/v1/power/                - Power analysis
POST /api/v1/nonparametric/        - Non-parametric tests
GET  /api/v1/guardian/report/{id}/ - Retrieve Guardian report
```

**Request Format:**
```json
{
    "data1": [1.2, 3.4, 5.6, ...],
    "data2": [2.3, 4.5, 6.7, ...],
    "test_type": "independent",
    "alpha": 0.05,
    "high_precision": false,
    "include_visualizations": true
}
```

**Response Format:**
```json
{
    "results": {
        "t_statistic": -2.345,
        "p_value": 0.0234,
        "df": 18,
        "effect_size": {
            "cohens_d": 0.65,
            "hedges_g": 0.62
        },
        "confidence_interval": [-1.23, -0.12]
    },
    "guardian_report": {
        "assumptions_checked": ["normality", "variance_homogeneity", ...],
        "violations": [...],
        "confidence_score": 0.85,
        "can_proceed": true,
        "alternatives": ["welch_t_test"]
    },
    "visualizations": {
        "qq_plot": {...},
        "histogram": {...}
    }
}
```

### 3.6 Data Layer

**Database Schema:**

The primary entities are:
- `Analysis`: Stores analysis metadata and results
- `GuardianReport`: Stores assumption validation results
- `Report`: Stores generated report documents
- `User`: User accounts (optional, for authenticated features)

**Caching Strategy:**

Redis caches:
- Session data for authenticated users
- Rate limiting counters (100 requests/minute per IP)
- Recently computed results (15-minute TTL)

Caching is conservative to avoid serving stale results. Any data modification invalidates relevant caches.

### 3.7 Reproducibility Framework

Each analysis generates a reproducibility bundle:

```json
{
    "analysis_id": "uuid-...",
    "timestamp": "2025-12-15T10:30:00Z",
    "software_version": "1.0.0",
    "data_fingerprint": "sha256:abc123...",
    "parameters": {
        "test_type": "independent",
        "alpha": 0.05,
        "alternative": "two-sided"
    },
    "environment": {
        "python_version": "3.11.0",
        "scipy_version": "1.11.0",
        "numpy_version": "1.24.0"
    },
    "results": {...},
    "guardian_report": {...}
}
```

This bundle enables:
1. **Exact Replication:** Same inputs, parameters, and software version yield identical results
2. **Version Tracking:** If results differ, environment differences can be identified
3. **Audit Trail:** Complete record of analytical decisions for peer review

### 3.8 Code Export

For every analysis, users can export equivalent code in R or Python:

**Python Export:**
```python
# Generated by StickForStats v1.0.0
# Analysis ID: uuid-...

import numpy as np
from scipy import stats

# Data
group1 = np.array([23.5, 25.1, 22.8, ...])
group2 = np.array([28.2, 29.5, 27.8, ...])

# T-test
t_stat, p_value = stats.ttest_ind(group1, group2)
print(f"t = {t_stat}, p = {p_value}")

# Assumption checks
from scipy.stats import shapiro, levene
print("Normality (Group 1):", shapiro(group1))
print("Normality (Group 2):", shapiro(group2))
print("Variance homogeneity:", levene(group1, group2))
```

**R Export:**
```r
# Generated by StickForStats v1.0.0
# Analysis ID: uuid-...

# Data
group1 <- c(23.5, 25.1, 22.8, ...)
group2 <- c(28.2, 29.5, 27.8, ...)

# T-test
t.test(group1, group2)

# Assumption checks
shapiro.test(group1)
shapiro.test(group2)
var.test(group1, group2)
```

This feature enables:
1. **Verification:** Users can run exported code in their own environment
2. **Integration:** Results can be incorporated into existing R/Python workflows
3. **Learning:** Users see the underlying statistical code for educational purposes

### 3.9 Security Considerations

**Input Validation:**
All user inputs are validated before processing:
- Maximum data size: 100,000 rows
- Numeric validation for statistical data
- Sanitization of string inputs
- SQL injection prevention via Django ORM

**Rate Limiting:**
API endpoints are rate-limited to prevent abuse:
- 100 requests per minute per IP (unauthenticated)
- 500 requests per minute per user (authenticated)

**Data Privacy:**
- No user data is stored beyond session lifetime (unless explicitly saved)
- Analysis results are ephemeral by default
- Optional user accounts for persistent storage

---

## Figure 1 Reference

See `paper/figures/figure1_system_architecture.md` for the architectural diagram showing the three-tier design with Guardian integration.

---

## Word Count

- Section 3.1: ~200 words
- Section 3.2: ~200 words
- Section 3.3: ~200 words
- Section 3.4: ~450 words
- Section 3.5: ~250 words
- Section 3.6: ~150 words
- Section 3.7: ~200 words
- Section 3.8: ~200 words
- Section 3.9: ~150 words

**Total: ~2,000 words (~5 pages)**

---

*Draft prepared: December 15, 2025*
*Status: First draft*
