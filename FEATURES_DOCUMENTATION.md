# STICKFORSTATS V2.0 -- COMPLETE FEATURES DOCUMENTATION
## High-Precision Statistical Platform with Guardian Protection and Autonomous Intelligence
### Last Updated: February 19, 2026

---

## VERIFIED METRICS

| Metric                  | Count       |
|-------------------------|-------------|
| API Endpoints           | 195         |
| Internationalization    | 16 languages|
| Frontend Pages          | 25          |
| Guardian Validators     | 8           |
| SQS Rules               | 45 (6 categories) |
| Celery Async Tasks      | 13 (7 queues)     |
| Guardian Tests           | 38/38 passing      |

---

## TABLE OF CONTENTS

1. [Executive Summary](#executive-summary)
2. [Technical Architecture](#technical-architecture)
3. [Core Statistical Engine](#core-statistical-engine)
4. [Guardian Statistical Protection System](#guardian-statistical-protection-system)
5. [Statistical Quality Score (SQS)](#statistical-quality-score-sqs)
6. [Autonomous Intelligence (NEW in v2.0)](#autonomous-intelligence-new-in-v20)
7. [Journal Integration (NEW in v2.0)](#journal-integration-new-in-v20)
8. [AI-Powered Features](#ai-powered-features)
9. [Platform Features (NEW in v2.0)](#platform-features-new-in-v20)
10. [Internationalization](#internationalization)
11. [Compliance and Regulatory](#compliance-and-regulatory)
12. [Infrastructure and DevOps](#infrastructure-and-devops)
13. [User Interface and Experience](#user-interface-and-experience)
14. [Testing and Quality Assurance](#testing-and-quality-assurance)

---

## EXECUTIVE SUMMARY

StickForStats v2.0 is a professional-grade statistical analysis platform designed for researchers, journal editors, and institutions. It maintains 50+ decimal precision throughout all calculations, enforces statistical best practices through the Guardian protection system, and introduces autonomous intelligence features that guide users from data upload through publication-ready results.

Built with Django REST Framework (backend) and React 18 (frontend), the platform has grown from a 13-calculator precision tool into a comprehensive research infrastructure with 195 API endpoints, journal manuscript validation, multi-tenant workspaces, and compliance-grade security controls.

### What Changed from v1.0 to v2.0

- **Guardian System**: 8 validators that automatically check statistical assumptions before every test
- **SQS Scoring**: 45-rule quality scoring engine across 6 categories
- **Autonomous Intelligence**: SmartProfiler, cascade engine, natural language interface, guided wizard
- **Journal Integration**: Manuscript parsing, claim extraction, STATCHECK-style validation, submission API
- **Multi-Tenant Platform**: RBAC, project workspaces, SSO, GDPR compliance
- **SDKs and Integrations**: Python SDK, R SDK, Jupyter extension, LMS integration, browser extension
- **Infrastructure**: Docker/Kubernetes, Celery async processing, Prometheus/Grafana monitoring
- **Compliance**: SOC 2, FDA 21 CFR Part 11, GDPR, OWASP/ISO 27001

---

## TECHNICAL ARCHITECTURE

### Backend Stack
```
Framework:        Django 4.2 + Django REST Framework
Precision:        mpmath library (50 decimal places)
Database:         PostgreSQL 15
Task Queue:       Celery + Redis (13 tasks, 7 queues)
API:              195 endpoints, OpenAPI documented
Authentication:   Token-based + SSO (Keycloak SAML/OIDC)
Gateway:          Kong API Gateway
Search:           NLP-enhanced query parsing
```

### Frontend Stack
```
Framework:        React 18.2.0
UI Library:       Material-UI v5.14
Precision:        Decimal.js (50+ decimals)
Charts:           Recharts (74 files), Plotly (3 files)
State:            React Hooks + Context API
Routing:          React Router v6
i18n:             16 languages (frontend/src/i18n/index.js)
PWA:              Service worker with offline support
Theming:          Dark mode + custom theme system
```

### Precision Pipeline
```
User Input -> String Format -> Backend (mpmath, 50 digits) ->
String Serialization -> Frontend (Decimal.js) -> Display
```

### Key File Locations
```
Guardian Core:          backend/core/guardian/guardian_core.py
SQS Rules:             backend/core/sqs_rules.py
High-Precision Engine:  backend/core/high_precision_calculator.py
API Routes:            backend/api/v1/urls.py
i18n Configuration:    frontend/src/i18n/index.js
Replication Data:      paper/replication/
```

---

## CORE STATISTICAL ENGINE

### Parametric Tests

#### T-Test Calculator
- **API Endpoint**: `/api/v1/stats/ttest/`
- One-sample, two-sample (independent), paired, and Welch's T-test
- 50 decimal precision maintained throughout
- Effect size (Cohen's d), confidence intervals, power analysis
- Guardian-protected: normality, variance homogeneity checked automatically

#### ANOVA Calculator (with ANCOVA)
- **API Endpoints**: `/api/v1/stats/anova/`, `/api/v1/stats/ancova/`
- One-way, two-way, three-way ANOVA
- Repeated measures and mixed ANOVA
- ANCOVA with covariate adjustment and homogeneity of regression slopes
- Post-hoc tests: Tukey HSD, Bonferroni, Scheffe
- Assumption checks: Levene's test, homogeneity of variances
- Effect sizes: eta-squared, partial eta-squared, omega-squared

#### Regression Calculator
- **API Endpoint**: `/api/v1/stats/regression/`
- Simple linear, multiple linear, polynomial (up to degree 10)
- Logistic, Ridge, Lasso, and Elastic Net regression
- Diagnostics: R-squared, adjusted R-squared, VIF, Durbin-Watson, Cook's distance
- Residual analysis and prediction with confidence intervals

### Non-Parametric Tests
- **API Endpoint**: `/api/v1/stats/nonparametric/`
- Mann-Whitney U test
- Wilcoxon signed-rank test
- Kruskal-Wallis H test
- Friedman test
- Sign test, Runs test
- Kolmogorov-Smirnov test
- Mood's median test

### Correlation Analysis
- **API Endpoint**: `/api/v1/stats/correlation/`
- Pearson, Spearman rank, Kendall's tau
- Point-biserial, partial, and semi-partial correlation
- Correlation matrix generation
- Significance testing and confidence intervals

### Meta-Analysis
- Fixed-effects and random-effects models
- Heterogeneity assessment (I-squared, Q statistic)
- Forest plot generation
- Publication bias detection (funnel plots, Egger's test)
- Subgroup analysis

### Power Analysis
- Sample size for means, proportions, correlations, ANOVA
- A priori, post-hoc, and sensitivity analyses
- Effect size estimation tools
- Multiple comparison adjustments

### Distribution Calculator
- **API Endpoint**: `/api/v1/stats/distribution/`
- Normal, T, Chi-square, F, Binomial, Poisson, Exponential, Gamma, Beta
- PDF, CDF, and quantile computations
- Critical values and probability calculations
- Interactive visualization

### Descriptive Statistics
- **API Endpoint**: `/api/v1/stats/descriptive/`
- Central tendency: arithmetic, geometric, and harmonic mean; median; mode
- Dispersion: standard deviation, variance, range, IQR
- Shape: skewness, kurtosis
- Percentiles, Z-scores, outlier detection
- Box plot and histogram with normal curve overlay

### Confidence Intervals
- **API Endpoint**: `/api/v1/stats/confidence-intervals/`
- Mean, proportion, difference of means, difference of proportions
- Variance and ratio confidence intervals
- Bootstrap confidence intervals
- Multiple confidence levels

### Sample Size Calculator
- **API Endpoint**: `/api/v1/stats/sample-size/`
- Sample size for means, proportions, correlations, ANOVA
- Power analysis integration and effect size estimation

### Normality Tests
- **API Endpoint**: `/api/v1/stats/normality/`
- Shapiro-Wilk, Anderson-Darling, Kolmogorov-Smirnov
- D'Agostino-Pearson, Jarque-Bera
- Q-Q plot, P-P plot, histogram with normal overlay

### Outlier Detection
- **API Endpoint**: `/api/v1/stats/outliers/`
- IQR method, Z-score, Modified Z-score (MAD)
- Grubbs' test, Dixon's Q test
- DBSCAN clustering, Isolation Forest, Local Outlier Factor

### Effect Size Calculator
- **API Endpoint**: `/api/v1/stats/effect-size/`
- Cohen's d, Hedges' g, Glass's delta
- Eta-squared, partial eta-squared, omega-squared
- Cohen's f, Cramer's V
- Odds ratio, risk ratio, Number Needed to Treat (NNT)

### Chi-Square Tests
- **API Endpoint**: `/api/v1/stats/chi-square/`
- Test of independence, goodness of fit
- McNemar's test, Fisher's exact test (2x2)
- Contingency table analysis with expected frequencies
- Standardized residuals and Cramer's V

### High-Precision Computing
- **Backend**: mpmath library with 50 decimal places (`mp.dps = 50`)
- **Frontend**: Decimal.js with matching precision
- All intermediate values serialized as strings to prevent floating-point loss
- File: `backend/core/high_precision_calculator.py`

### Code Export
- R code generation for all statistical tests
- Python code generation for all statistical tests
- Fully reproducible scripts with data and parameters embedded

---

## GUARDIAN STATISTICAL PROTECTION SYSTEM

The Guardian system is the core innovation of StickForStats. It automatically validates statistical assumptions before every test execution, preventing common statistical errors that lead to retracted papers and unreliable research.

### Architecture
- **Core**: `backend/core/guardian/guardian_core.py` (lines 314-911)
- **Tests**: 38 tests (22 integration + 16 middleware), all passing
- **Frontend Components**: `GuardianReportDisplay`, `GuardianBadge`, `ConfidenceGauge`, `ViolationCard`
- **GuardianWarning**: Requires 3 callback props (`onProceed`, `onSelectAlternative`, `onViewEvidence`)
- **Expert Mode**: `frontend/src/context/SettingsContext.js` -- allows proceeding despite violations

### 8 Validators

1. **Normality Validator** -- Shapiro-Wilk, Anderson-Darling, visual Q-Q checks
2. **Homogeneity of Variance Validator** -- Levene's test, Bartlett's test
3. **Sample Size Validator** -- Minimum sample requirements per test type
4. **Independence Validator** -- Autocorrelation, Durbin-Watson checks
5. **Outlier Validator** -- IQR, Z-score, and Grubbs' test detection
6. **Missing Data Validator** -- Missingness pattern analysis (MCAR/MAR/MNAR)
7. **Scale Type Validator** -- Ensures variable measurement level matches the test
8. **Multicollinearity Validator** -- VIF checks for regression models

### Confidence Scoring Formula
```
confidence = max(0, 1 - sum(w_si) / (max_penalty * 1.2))
```
- **Weights**: critical = 3.0, warning = 2.0, minor = 1.0
- Score ranges from 0 (all assumptions violated) to 1 (all passed)

### Auto-Alternative Suggestions
When a violation is detected, Guardian automatically suggests appropriate alternative tests:
- Normality violation in T-test -> suggests Mann-Whitney U
- Variance homogeneity violation -> suggests Welch's T-test
- Outliers detected -> suggests robust methods or non-parametric alternatives
- Small sample size -> suggests exact tests or bootstrapping

---

## STATISTICAL QUALITY SCORE (SQS)

### Overview
- **File**: `backend/core/sqs_rules.py`
- **Total Rules**: 45
- **Categories**: 6

### 6 Rule Categories
1. **Assumption Checking** -- Were all relevant assumptions tested?
2. **Effect Size Reporting** -- Are effect sizes reported alongside p-values?
3. **Confidence Interval Reporting** -- Are CIs provided for key estimates?
4. **Sample Adequacy** -- Is the sample size sufficient for the analysis?
5. **Multiple Comparison Correction** -- Are family-wise error rates controlled?
6. **Reporting Completeness** -- Are all JARS-Quant / APA standards met?

### Scoring
- Each rule contributes to an overall quality percentage
- Scores are broken down by category for targeted improvement
- Thresholds: Excellent (90+), Good (75-89), Adequate (60-74), Needs Improvement (<60)

---

## AUTONOMOUS INTELLIGENCE (NEW in v2.0)

### SmartProfiler
Automatically analyzes uploaded datasets to detect variable types, infer research questions, and recommend appropriate statistical tests.
- Column-level type detection (continuous, ordinal, nominal, binary, datetime)
- Distribution shape profiling per variable
- Suggested research questions based on variable relationships
- Recommended test battery with rationale

### AutonomousCascadeEngine
Chains Guardian validation with automatic fallback to appropriate alternative tests when assumptions are violated.
- Runs the user's requested test through Guardian
- If assumptions fail, automatically selects and runs the best alternative
- Presents both the original attempt (with violation report) and the valid alternative
- Supports multi-step cascades (e.g., parametric -> non-parametric -> exact test)

### PlainLanguageTranslator
Converts statistical output into plain English summaries that non-statisticians can understand.
- Translates p-values, effect sizes, and confidence intervals into natural language
- Provides contextual interpretation ("This difference is statistically significant and practically meaningful")
- Adjustable audience level (general public, undergraduate, researcher, expert)
- Supports all 16 interface languages

### NaturalLanguageBar
A search-style interface that lets users describe what they want to do in plain language.
- Intent detection: "Is there a difference between these two groups?" maps to T-test
- Supports ambiguous queries with clarification dialogs
- Autocomplete with statistical test suggestions
- Query history and favorites

### GuidedWizard
Step-by-step workflow templates that walk users from research question to results.
- **7 Workflow Templates**:
  1. Group Comparison (2 groups)
  2. Group Comparison (3+ groups)
  3. Relationship / Association
  4. Prediction / Regression
  5. Before-After / Repeated Measures
  6. Categorical Analysis
  7. Exploratory Data Analysis
- Each template: research question -> data upload -> assumption checks -> test execution -> interpretation

### SmartUpload
Drag-and-drop data upload with automatic data profiling.
- Accepts CSV, Excel, SPSS, SAS, Stata formats
- Generates a Data Health Card on upload:
  - Missing data percentage per column
  - Outlier flags
  - Distribution previews
  - Variable type suggestions
  - Data quality score
- One-click cleaning suggestions (imputation, outlier handling, type conversion)

---

## JOURNAL INTEGRATION (NEW in v2.0)

### Manuscript Parsing
- Parses PDF, LaTeX (.tex), and DOCX manuscript files
- Uses GROBID for structured extraction of sections, references, and statistical claims
- Identifies methods, results, and discussion sections automatically

### Statistical Claim Extraction
- Regex-based extraction of statistical statements (e.g., "t(45) = 2.34, p = .021")
- LLM-enhanced extraction for non-standard reporting formats
- Supports: t-tests, ANOVA, chi-square, correlation, regression, non-parametric tests
- Cross-references extracted claims with reported data

### STATCHECK-Style Consistency Validation
- Recomputes reported statistics from extracted test parameters
- Flags inconsistencies between reported test statistics and p-values
- Detects rounding errors, transcription mistakes, and impossible values
- Severity classification: error, warning, note

### 7 Manuscript Validators
1. **Statistical Reporting Completeness** -- JARS-Quant compliance
2. **Effect Size Presence** -- Ensures effect sizes accompany significance tests
3. **Confidence Interval Presence** -- Checks for CI reporting
4. **Assumption Reporting** -- Verifies assumption checks are documented
5. **Multiple Comparison Handling** -- Checks correction methods when needed
6. **Sample Description Adequacy** -- Demographics, N, power analysis reported
7. **Reproducibility Checklist** -- Data availability, code availability, preregistration

### Discipline Profiles
Pre-configured validation profiles for different research fields:
- **Medicine** -- CONSORT, STROBE, PRISMA compliance
- **Psychology** -- APA 7th edition, JARS-Quant standards
- **Economics** -- Econometric reporting standards
- **Education** -- AERA reporting guidelines
- **Social Sciences** -- General social science reporting norms
- Additional profiles configurable per institution

### 3-Tier Reports
1. **Editor Report** -- High-level summary: pass/fail, critical issues, recommendation
2. **Reviewer Report** -- Detailed statistical audit with line-by-line annotations
3. **Author Report** -- Actionable checklist with specific fix instructions

### Journal Submission API with Webhooks
- RESTful API for journal systems to submit manuscripts for validation
- Webhook callbacks for async processing completion
- Batch processing support for bulk manuscript validation
- Rate-limited and authenticated access

### Journal Analytics Dashboard
- Submission volume tracking
- Common statistical errors by discipline
- Validation pass/fail rates over time
- Institutional benchmarking

---

## AI-POWERED FEATURES

### Claude-Powered Statistical Advisor
- 8+ dedicated API endpoints for AI-assisted analysis
- Contextual suggestions based on data characteristics and research design
- Explanation of statistical concepts at adjustable complexity levels
- Interpretation of results with domain-appropriate language

### NLP-Enhanced Query Parsing
- Natural language processing for test selection
- Disambiguation of statistical terminology
- Multilingual query support (aligned with 16-language i18n)

### Report Generation
- APA 7th edition formatted results sections
- Automated methods section drafting
- Publication-ready tables and figures
- JARS-Quant compliance checking

### Paper Analysis for JARS-Quant Compliance
- Automated audit of submitted manuscripts against JARS-Quant standards
- Section-by-section compliance scoring
- Missing element identification with suggested additions

---

## PLATFORM FEATURES (NEW in v2.0)

### Multi-Tenant RBAC with Project Workspaces
- Role-based access control: Admin, Researcher, Reviewer, Viewer
- Project-level isolation with shared workspace collaboration
- Team management and invitation system
- Activity audit logs per workspace

### Python SDK
- `pip install stickforstats`
- Pythonic interface to all 195 API endpoints
- DataFrame-native input/output (pandas integration)
- Async support for batch operations

### R SDK
- `install.packages("stickforstats")`
- Tidyverse-compatible interface
- Seamless data.frame and tibble support
- RStudio integration

### Progressive Web App (PWA) with Offline Support
- Service worker for offline calculator access
- Cached datasets and recent results
- Background sync when connectivity restores
- Installable on desktop and mobile

### Celery Async Processing
- **13 Tasks** across **7 Queues**:
  - `default` -- Standard statistical computations
  - `guardian` -- Assumption validation pipeline
  - `manuscript` -- Document parsing and validation
  - `export` -- Report and code generation
  - `analytics` -- Dashboard aggregation
  - `cleanup` -- Data retention and GDPR erasure
  - `priority` -- Real-time user-facing operations
- Redis as message broker and result backend
- Task monitoring via Flower dashboard

### Data Import: SPSS, SAS, Stata
- `.sav` (SPSS), `.sas7bdat` (SAS), `.dta` (Stata) file support
- Automatic variable label and value label preservation
- Missing value code translation
- Metadata extraction (variable descriptions, formats)

### OpenAPI Specification and Interactive Docs
- 67 documented endpoints with full request/response schemas
- Interactive Swagger UI for testing
- Downloadable OpenAPI 3.0 spec for client generation
- Code examples in Python, R, curl, and JavaScript

### Site Licensing for Institutions
- Volume licensing with centralized billing
- Usage analytics per department/lab
- Custom branding and theme overrides
- Dedicated support tier

### Plugin Marketplace with Sandboxed Runtime
- Third-party statistical method plugins
- Sandboxed execution environment for security
- Plugin review and approval workflow
- Version management and dependency resolution

### GDPR Compliance
- Data Subject Access Requests (DSAR) automation
- Right to erasure (data deletion pipeline via Celery)
- Consent management with granular opt-in/opt-out
- Data Processing Agreement (DPA) template
- Data residency options (EU/US/custom)

### SSO via Keycloak
- SAML 2.0 and OpenID Connect (OIDC) support
- Integration with institutional identity providers
- Multi-factor authentication support
- Session management and forced logout

### API Gateway via Kong
- Rate limiting and throttling per API key
- Request/response transformation
- Authentication plugin chain
- Analytics and logging

### Desktop Application via Tauri
- Native desktop app for Windows, macOS, and Linux
- Local computation option for sensitive data
- Automatic updates via built-in updater
- File system integration for batch processing

### Mobile Application via React Native
- iOS and Android native apps
- Camera-based data capture (photograph tables)
- Push notifications for async job completion
- Offline-first with background sync

### Browser Extension
- Right-click context menu for statistical tables on web pages
- Inline validation of statistical claims in articles
- Quick calculator popup
- Export detected statistics to StickForStats workspace

### Jupyter Extension
- `%stickforstats` magic commands
- Inline Guardian reports in notebook cells
- DataFrame-to-StickForStats pipeline
- Results rendered as rich notebook output

### LMS Integration
- **Canvas** and **Blackboard** LTI integration
- Assignment submission with statistical validation
- Grade passback for statistics coursework
- Instructor dashboard for class-wide analytics

### Certification Program
- Proficiency levels: Beginner, Intermediate, Advanced, Expert
- Automated assessment via platform usage and quiz modules
- Digital badges and verifiable certificates
- Institutional cohort management

### 16-Language Internationalization
- **Configuration**: `frontend/src/i18n/index.js`
- **Supported Languages**: English, Spanish, French, German, Portuguese, Italian, Chinese (Simplified), Chinese (Traditional), Japanese, Korean, Arabic, Hindi, Russian, Turkish, Dutch, Swedish
- All UI strings, error messages, help text, and statistical terminology localized
- RTL support for Arabic

### Dark Mode and Theme Customization
- **AppThemeContext.jsx** -- Main MUI theme provider
- **DarkModeContext.jsx** -- Dark mode state management
- System preference detection with manual override
- Custom accent color selection
- High-contrast accessibility mode

---

## COMPLIANCE AND REGULATORY

### SOC 2 Type II Controls
- Access control and authentication audit trails
- Data encryption at rest (AES-256) and in transit (TLS 1.3)
- Incident response procedures documented
- Annual third-party audit readiness

### FDA 21 CFR Part 11 Documentation
- Electronic signature support
- Audit trail for all data modifications
- System validation documentation (IQ/OQ/PQ)
- Data integrity controls (ALCOA+ principles)

### GDPR Data Processing Agreement
- Standard contractual clauses
- Data controller/processor responsibilities defined
- Breach notification procedures (72-hour window)
- Cross-border transfer mechanisms

### OWASP / ISO 27001 Security Controls Matrix
- OWASP Top 10 mitigation for all endpoints
- Input validation and output encoding
- Security headers (CSP, HSTS, X-Frame-Options)
- Dependency vulnerability scanning in CI/CD
- ISO 27001 control mapping document

---

## INFRASTRUCTURE AND DEVOPS

### Docker and Kubernetes Deployment
- Multi-stage Docker builds for backend and frontend
- Kubernetes manifests for production deployment
- Horizontal Pod Autoscaling based on CPU/memory and request rate
- Health checks and readiness probes

### Prometheus and Grafana Monitoring
- Application metrics: request latency, error rates, queue depths
- Infrastructure metrics: CPU, memory, disk, network
- Custom dashboards for statistical computation performance
- Alerting rules for SLA violations

### CI/CD via GitHub Actions
- Automated test suite (38 Guardian tests + unit tests)
- Linting and code quality checks
- Docker image build and push
- Staging and production deployment pipelines
- Dependency security scanning

### Horizontal Pod Autoscaling
- CPU-based autoscaling (target 70% utilization)
- Memory-based autoscaling
- Custom metrics scaling (queue depth, active computations)
- Scale-to-zero for non-production environments

---

## USER INTERFACE AND EXPERIENCE

### 25 Frontend Pages
Organized across the following sections:
- Home / Dashboard
- Statistical Calculators (13 calculator pages)
- Data Upload and Management
- Guardian Reports
- Journal Manuscript Validation
- Results Explorer
- Code Export (R/Python)
- Settings and Preferences
- Project Workspace
- Analytics Dashboard
- Help and Documentation

### Navigation System
- Responsive drawer navigation with search
- Calculator categories with quick access
- Breadcrumb navigation
- Keyboard shortcuts for power users

### Visualization
- **Primary**: Recharts library (74 component files)
- **Secondary**: Plotly (3 component files) for 3D and specialized plots
- Interactive charts with zoom, pan, and tooltip
- Export as PNG, SVG, PDF
- Responsive sizing across breakpoints

### Example Datasets
- 60+ professional datasets across all calculator types
- Preview before loading with expected outcome display
- Context-aware categorization (Research, Clinical, Business, Education)
- One-click data loading with educational descriptions

### Common Components
- **ExampleDataLoader** -- Dataset browser and loader
- **ResultsDisplay** -- High-precision formatted output with copy/export
- **VisualizationPanel** -- Interactive chart container
- **DataInput** -- CSV/Excel paste, manual entry, file upload
- **GuardianReportDisplay** -- Assumption validation report
- **GuardianBadge** -- Inline confidence indicator
- **ConfidenceGauge** -- Visual confidence score meter
- **ViolationCard** -- Individual assumption violation detail

### Responsive Design
```
xs: 0      (phones)
sm: 600    (tablets)
md: 900    (small laptops)
lg: 1200   (desktops)
xl: 1536   (large screens)
```

---

## TESTING AND QUALITY ASSURANCE

### Guardian Tests: 38/38 Passing
- 22 integration tests covering all 8 validators
- 16 middleware tests for request/response pipeline
- Zero build errors, zero Django issues

### Backend Tests
```
backend/tests/
  test_ttest.py
  test_anova.py
  test_ancova.py
  test_regression.py
  test_precision.py
  test_guardian/ (38 tests)
```

### Replication and Verification
- 40+ case study statistics verified against scipy
- Replication scripts and data: `paper/replication/`
- Full audit log: `paper/AUDIT_LOG_2026-02-19.md`

### Code Quality
- Zero hardcoded magic numbers (e.g., no hardcoded 1.96)
- Zero unseeded `Math.random()` calls
- Zero placeholder comments or TODOs in production source
- All PDF and LaTeX manuscript copies synced and identical

---

## API ENDPOINTS OVERVIEW

### Base URL
```
Development:  http://localhost:8000/api/v1/
Production:   https://api.stickforstats.com/v1/
```

### Authentication
```
Headers: {
  'Content-Type': 'application/json',
  'X-CSRFToken': csrfToken,
  'Authorization': 'Token <api_key>'  (for SDK/external access)
}
```

### Endpoint Categories (195 total)

| Category               | Endpoints | Example Routes                          |
|------------------------|-----------|-----------------------------------------|
| Statistical Tests      | 30+       | `/stats/ttest/`, `/stats/anova/`, `/stats/correlation/` |
| Guardian               | 15+       | `/guardian/validate/`, `/guardian/report/` |
| SQS                    | 10+       | `/sqs/score/`, `/sqs/rules/`            |
| Journal Validation     | 20+       | `/journal/parse/`, `/journal/validate/` |
| AI Advisor             | 8+        | `/ai/suggest/`, `/ai/interpret/`        |
| Data Management        | 15+       | `/data/upload/`, `/data/profile/`       |
| User/Auth              | 15+       | `/auth/login/`, `/auth/sso/`            |
| Workspace              | 20+       | `/workspace/create/`, `/workspace/share/` |
| Export                 | 10+       | `/export/r/`, `/export/python/`, `/export/pdf/` |
| Analytics              | 10+       | `/analytics/usage/`, `/analytics/journal/` |
| Admin                  | 15+       | `/admin/users/`, `/admin/licensing/`    |
| OpenAPI Documented     | 67        | Full Swagger/OpenAPI specs available    |

---

## KNOWN INTENTIONAL ITEMS

These items have been audited and confirmed as correct:
- Canvas 2D / Recharts / export colors -- intentional design choices
- KS test `np.std()` without `ddof` -- correct (MLE expects population SD)
- `1-exp()` patterns in `statisticalDistributions.js`, `ProbabilityCalculator.jsx`, `AlphaSpendingCalculator.jsx` -- mathematically correct formulas

---

## DEVELOPMENT

### Lead Developer
- **Vishal Bharti** -- Architecture, implementation, and research

### Common Commands
```bash
cd backend && python manage.py runserver 0.0.0.0:8000
cd frontend && HOST=0.0.0.0 npm start
NODE_OPTIONS="--max-old-space-size=4096" npx react-scripts build
pkill -f "react-scripts start"; pkill -f "manage.py runserver"
```

### Environment
- macOS Darwin 25.2.0
- Node.js with `--max-old-space-size=4096` for builds
- Python 3 + Django REST Framework
- React (CRA) with MUI + Recharts + jStat + DOMPurify
- LaTeX compiler: tectonic

---

**Document Version**: 2.0
**Last Updated**: February 19, 2026
**Status**: SUBMISSION READY (JSS + ArXiv)
