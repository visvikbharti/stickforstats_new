# StickForStats

**The Comprehensive Statistical Analysis Platform -- From Data Upload to Journal Submission**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Django 4.2](https://img.shields.io/badge/django-4.2-green.svg)](https://www.djangoproject.com/)
[![React 18](https://img.shields.io/badge/react-18-61dafb.svg)](https://reactjs.org/)
[![API Endpoints](https://img.shields.io/badge/API_endpoints-195-brightgreen.svg)](#api-endpoints)
[![Languages](https://img.shields.io/badge/i18n-16_languages-blueviolet.svg)](#internationalization)
[![Guardian Tests](https://img.shields.io/badge/Guardian_tests-38%2F38_passing-success.svg)](#guardian-system)
[![SQS Rules](https://img.shields.io/badge/SQS_rules-45-informational.svg)](#statistical-quality-score)
[![Pages](https://img.shields.io/badge/frontend_pages-25-orange.svg)](#project-structure)

StickForStats is an open-source statistical analysis platform that takes researchers from raw data to journal-ready results with automatic assumption validation, manuscript review, and multi-tenant collaboration. Upload your data, describe your research question in plain English, and receive validated results with Guardian-checked assumptions, plain-language interpretation, and publication-quality reports.

---

## Why StickForStats?

Most statistical tools force researchers to choose between power and usability. StickForStats eliminates that tradeoff through three pillars:

| Pillar | Problem it Solves | Key Capability |
|--------|-------------------|----------------|
| **Autonomous Intelligence** | "I have data but don't know which test to run" | Upload data + ask a question in plain English -- get validated results and a report |
| **Journal Integration** | "I need to verify the statistics in this manuscript" | Parse manuscripts, extract claims, validate consistency -- Turnitin for statistics |
| **Universal Platform** | "My whole lab / department / journal needs this" | Multi-tenant RBAC, Python and R SDKs, LMS integration, GDPR compliance, SSO |

---

## Autonomous Intelligence -- Anyone Can Use It

StickForStats makes statistical analysis accessible to researchers at every skill level, without sacrificing rigor.

**SmartProfiler** -- Upload a dataset and SmartProfiler automatically detects variable types (continuous, categorical, ordinal), identifies distributions, flags quality issues, and infers possible research questions before you run a single test.

**Natural Language Interface** -- Describe your research question in plain English via the NaturalLanguageBar. Intent detection parses your query, maps it to the appropriate statistical test, and returns results with full Guardian validation.

**AutonomousCascadeEngine** -- When the Guardian system detects assumption violations, the cascade engine automatically falls back to appropriate alternative tests. A parametric t-test that fails the normality check is seamlessly rerouted to Mann-Whitney U with full documentation of the decision path.

**PlainLanguageTranslator** -- Every statistical result is accompanied by a plain-English interpretation. Not just "p = 0.003" but "There is strong evidence that the treatment group scores are higher than the control group scores, with a large practical effect."

**GuidedWizard** -- Seven workflow templates guide beginners through common analyses step by step: comparing two groups, comparing multiple groups, finding relationships, predicting outcomes, time-to-event analysis, before-and-after studies, and survey analysis.

**AI Statistical Advisor** -- Claude-powered natural language guidance for test selection, result interpretation, APA-formatted methods sections, and assumption troubleshooting across 11 API endpoints.

---

## Journal Integration -- Turnitin for Statistics

StickForStats provides end-to-end manuscript statistical review, from parsing to journal submission.

**Manuscript Parsing** -- Accepts PDF, LaTeX, and DOCX manuscripts. The parser extracts the full text, identifies statistical sections, and prepares the content for claim analysis.

**Statistical Claim Extraction** -- A regex + LLM hybrid pipeline identifies every statistical claim in the manuscript: test statistics, p-values, confidence intervals, effect sizes, sample sizes, and degrees of freedom.

**STATCHECK-style Consistency Validation** -- Each extracted claim is recalculated from its reported components. Inconsistencies between reported test statistics and p-values are flagged with severity levels.

**7 Specialized Manuscript Validators:**

| Validator | What It Checks |
|-----------|---------------|
| Completeness | Are effect sizes, confidence intervals, and exact p-values reported? |
| Consistency | Do reported test statistics match reported p-values? |
| Power | Was an a priori power analysis conducted? |
| Multiple Comparisons | Are corrections applied when needed? |
| Assumption Reporting | Are assumption checks documented? |
| Effect Size | Are effect sizes reported and interpreted? |
| Reproducibility | Is there enough detail to reproduce the analyses? |

**Discipline-Aware Profiles** -- Pre-configured validation profiles for Medicine (CONSORT), Psychology (JARS-Quant), Economics (AEA), and general science, each emphasizing the reporting standards that matter most in that field.

**3-Tier Reports** -- Generate separate reports tailored for editors (summary + decision-relevant flags), reviewers (detailed technical analysis), and authors (actionable improvement suggestions).

**Batch Processing and Journal Submission** -- Process multiple manuscripts in a single batch. Submit validation reports directly to journals via webhook-enabled submission API.

**Journal Analytics Dashboard** -- Track submission trends, common statistical issues, and comparison metrics across manuscripts over time.

---

## Universal Platform -- Used by Everyone

StickForStats scales from a single researcher to an entire institution.

### Multi-Tenant Architecture

- **Organization workspaces** with role-based access control (RBAC): Owner, Admin, Analyst, Viewer
- **Project-level isolation** -- each project has its own datasets, analyses, and reports
- **Usage dashboards** with per-organization analytics
- **Billing integration** via Stripe with tiered plans (Free, Professional, Institutional)
- **API key management** for programmatic access

### Authentication and Security

- **SSO via Keycloak** -- SAML 2.0 and OpenID Connect support
- **5 SSO endpoints** for configuration, login, callback, token validation, and provider management
- **API Gateway via Kong** for rate limiting, authentication, and request routing

### GDPR and Privacy Compliance

- **Consent management** -- track and manage user consent status
- **Data export** -- users can export all their data (DSAR compliance)
- **Right to erasure** -- complete data deletion on request
- **Privacy information endpoint** -- transparent data processing disclosure
- Full implementation across 4 dedicated privacy endpoints

### SDKs and Integrations

- **Python SDK** (`pip install stickforstats`) -- Pythonic wrapper around the full API
- **R SDK** -- CRAN-ready package for R users
- **Jupyter Notebook Extension** -- run StickForStats analyses directly in notebooks
- **Browser Extension** -- analyze data on any webpage

### LMS Integration (LTI 1.3)

- Canvas, Blackboard, and Moodle integration via LTI 1.3 protocol
- Deep linking for embedding specific analyses in course content
- Grade passback for automated assessment
- 7 LTI endpoints covering configuration, login, launch, deep linking, grades, platform management, and JWKS

### Certification Program

- Structured certification levels for statistical proficiency
- Timed examinations with automated scoring
- Verifiable digital certificates with unique certificate IDs
- 6 certification endpoints

### Plugin Marketplace

- Browse, install, and review community-contributed plugins
- **Sandboxed plugin runtime** -- plugins execute in an isolated environment
- Plugin configuration management
- 7 marketplace and runtime endpoints

### Site Licensing

- Institutional and enterprise site licenses
- License key verification and usage tracking
- Usage reporting per license
- 5 licensing endpoints

### Desktop and Mobile

- **Desktop app** via Tauri -- native performance with the full web UI
- **Mobile app** via React Native -- statistical analysis on the go

### Infrastructure

- **Docker Compose** for local development
- **Kubernetes manifests** for production deployment
- **Prometheus + Grafana** monitoring stack
- **Celery** async computation with 13 task types across 7 queue routes
- **PWA** with offline support

---

## Core Statistical Engine

The statistical engine is the foundation of StickForStats, validated against SciPy and G*Power with up to 50-decimal-place precision.

### Guardian System -- Automatic Assumption Validation

The Guardian system intercepts every statistical test and validates assumptions before execution. No user action required.

```
User Request --> Guardian Interception --> Assumption Validation --> Analysis --> Combined Response
```

**8 Validators:**

| Validator | Statistical Test | Threshold |
|-----------|-----------------|-----------|
| Normality | Shapiro-Wilk / Anderson-Darling | p < 0.05 |
| Variance Homogeneity | Levene's Test | p < 0.05 |
| Independence | Autocorrelation | \|r\| > 0.3 |
| Outliers | IQR + Z-score | Combined detection |
| Sample Size | Rule-based minimums | Per-test thresholds |
| Modality | Kernel density estimation | Bimodal detection |
| Linearity | R-squared comparison + Runs test | Delta R-squared > 0.05 |
| Homoscedasticity | Breusch-Pagan | p < 0.05 |

**Confidence Score** -- Guardian calculates a composite confidence score (0--1) based on violation severity:

| Score Range | Interpretation |
|-------------|---------------|
| 0.90 -- 1.00 | Excellent -- proceed with confidence |
| 0.70 -- 0.89 | Acceptable -- proceed with caution |
| 0.50 -- 0.69 | Questionable -- consider alternatives |
| 0.00 -- 0.49 | Poor -- use alternative test |

Formula: `confidence = max(0, 1 - sum(weights) / (max_penalty * 1.2))` where weights are critical=3.0, warning=2.0, minor=1.0.

**38/38 tests passing** (22 integration + 16 middleware).

### Statistical Tests

| Category | Tests |
|----------|-------|
| **Parametric** | Independent t-test, Paired t-test, One-sample t-test, One-way ANOVA, Factorial ANOVA, Repeated measures ANOVA, MANOVA, ANCOVA |
| **Non-parametric** | Mann-Whitney U, Wilcoxon signed-rank, Kruskal-Wallis, Friedman, Sign test, Mood's median, Jonckheere-Terpstra, Page's trend, Post-hoc tests |
| **Correlation** | Pearson, Spearman, Kendall |
| **Regression** | Linear, Multiple, Polynomial, Logistic, Ridge, Lasso |
| **Categorical** | Chi-square (independence + goodness-of-fit), Fisher's exact, McNemar, Cochran's Q, G-test, Binomial, Multinomial |
| **Effect Sizes** | Cohen's d, Hedges' g, Glass's delta, Eta-squared, Omega-squared, Categorical effect sizes, Non-parametric effect sizes |
| **Meta-Analysis** | Fixed and random effects (DerSimonian-Laird), Effect size conversion, Publication bias (Egger's, trim-and-fill), Sensitivity analysis, Subgroup analysis |
| **Power Analysis** | T-test power/sample size/effect size, ANOVA power, Correlation power, Chi-square power, Power curves, Optimal allocation, Sensitivity analysis |
| **Survival Analysis** | Kaplan-Meier, Cox regression, Survival prediction |
| **Factor Analysis** | KMO/Bartlett adequacy, Factor determination, Exploratory factor analysis, Factor rotation |
| **Causal Inference** | DAG creation/analysis, Propensity scores, Matching, Treatment effects, Mediation (Baron-Kenny + causal), Difference-in-differences (standard + event study + staggered) |
| **Mixed Models** | ICC, Linear mixed models, Random effects, Model comparison, Diagnostics |
| **Missing Data** | Pattern detection, Little's MCAR test, Multiple imputation, KNN imputation, EM algorithm, Method comparison |
| **Descriptive** | Central tendency, Dispersion, Distribution shape, Percentiles |

### Statistical Quality Score (SQS)

Automated scoring of statistical reporting quality (0--100) across 45 rules in 6 categories:

| Category | What It Evaluates |
|----------|------------------|
| Test Selection | Appropriate test for the data and question |
| Assumption Reporting | Documentation of assumption checks |
| Effect Size Reporting | Presence and interpretation of effect sizes |
| Confidence Intervals | Reporting of uncertainty estimates |
| Multiple Comparisons | Application of corrections when needed |
| Reproducibility | Sufficient detail for replication |

### High-Precision Computing

Optional 50-decimal-place precision using mpmath for all core statistical calculations. Critical for validation studies and meta-analyses where floating-point accumulation matters.

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- PostgreSQL (production) or SQLite (development)

### Backend

```bash
git clone https://github.com/visvikbharti/stickforstats_new.git
cd stickforstats_new/backend

python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

### Frontend

```bash
cd frontend
npm install
npm start
```

The application will be available at `http://localhost:3000`.

### Docker (Full Stack)

```bash
docker-compose up --build
```

---

## API Endpoints

195 REST API endpoints organized across 22 categories.

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Core Statistics** | 10 | T-test, ANOVA, ANCOVA, correlation, regression, descriptive, comparison, test recommendation |
| **Power Analysis** | 11 | Power, sample size, effect size for t-test/ANOVA/correlation/chi-square, curves, allocation, sensitivity |
| **Regression** | 6 | Linear, multiple, polynomial, logistic, ridge, lasso |
| **Categorical** | 9 | Chi-square, Fisher's exact, McNemar, Cochran's Q, G-test, binomial, multinomial, effect sizes |
| **Non-parametric** | 10 | Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman, sign, Mood's, Jonckheere-Terpstra, Page's, post-hoc, effect sizes |
| **Missing Data** | 9 | Detection, imputation (multiple, KNN, EM), Little's MCAR, comparison, visualization |
| **Survival Analysis** | 5 | Availability check, Kaplan-Meier, Cox regression, prediction, tutorial |
| **Factor Analysis** | 6 | Availability, adequacy, determination, EFA, transformation, tutorial |
| **Causal Inference** | 14 | DAG, adjustment sets, propensity scores, matching, treatment effects, mediation (4 types), DiD (4 types) |
| **Mixed Models** | 5 | ICC, LMM fitting, random effects, model comparison, diagnostics |
| **Meta-Analysis** | 6 | Fixed/random effects, effect size conversion, SE calculation, publication bias, sensitivity, subgroup |
| **AI Advisor** | 11 | Chat, status, conversation history, quick recommend, interpret, methods section, assumption guidance, NLP parsing, analysis plan, APA report |
| **SQS** | 7 | File analysis, text analysis, rules, fields, categories, quick check, health |
| **Autonomous** | 5 | Smart profile, query, cascade execution, result translation, next step |
| **Manuscript** | 8 | Analyze, parse, claim extraction, consistency check, submission report, journal submit, batch submit, batch status |
| **Journal Analytics** | 4 | Overview, issues, trends, comparison |
| **Reports** | 4 | List, generate, detail, export |
| **Platform** | 14 | Tiers, organizations (CRUD + members + invite), usage, billing, webhooks, API keys, projects, RBAC |
| **Privacy / GDPR** | 4 | Consent, data export, erasure, privacy info |
| **Marketplace** | 7 | Plugin listing, detail, install, review, installed, execute, config |
| **LMS (LTI 1.3)** | 7 | Config, login, launch, deep link, grade passback, platforms, JWKS |
| **Certification** | 6 | Levels, level detail, exam start, exam submit, certificate verify, user certifications |
| **SSO** | 5 | Config, login, callback, token validation, providers |
| **Site Licensing** | 5 | Tiers, create, verify, usage, reporting |
| **Audit** | 4 | Summary, record, metrics, health |
| **Data Import** | 3 | Legacy import, universal import, supported formats |
| **API Docs** | 3 | OpenAPI schema, Swagger UI, ReDoc |
| **Infrastructure** | 2 | Health check, simple test |

Full interactive documentation is available at `/api/v1/schema/swagger/` (Swagger UI) or `/api/v1/schema/redoc/` (ReDoc) when the server is running.

---

## Project Structure

```
stickforstats/
├── backend/
│   ├── api/v1/                    # 195 REST API endpoints
│   │   ├── views.py               # Core statistical views
│   │   ├── autonomous_views.py    # SmartProfiler, Cascade, Translator
│   │   ├── manuscript_views.py    # Manuscript parsing and validation
│   │   ├── causal_views.py        # DAG, propensity, DiD, mediation
│   │   ├── mixed_models_views.py  # ICC, LMM, random effects
│   │   ├── platform_views.py      # Multi-tenant, billing, API keys
│   │   ├── gdpr_views.py          # Privacy and GDPR compliance
│   │   ├── sso_views.py           # SSO / OIDC authentication
│   │   └── ...                    # 20+ view modules
│   ├── core/
│   │   ├── guardian/              # Guardian assumption validation (8 validators)
│   │   ├── services/              # SmartProfiler, CascadeEngine, Translator
│   │   ├── manuscript/            # Manuscript parsing and claim extraction
│   │   ├── sqs_rules.py           # 45 SQS rules across 6 categories
│   │   ├── sqs_scoring.py         # SQS scoring engine
│   │   ├── high_precision_calculator.py  # 50-decimal mpmath
│   │   ├── meta_analysis.py       # Meta-analysis engine
│   │   ├── tasks.py               # 13 Celery async tasks
│   │   └── ...                    # Statistical computation modules
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/                 # 25 page components
│   │   ├── components/            # React UI components
│   │   ├── context/               # Settings, Theme, Dark Mode contexts
│   │   ├── i18n/                  # 16 languages, 4 namespaces each
│   │   └── services/              # API clients
│   └── package.json
├── sdk/
│   ├── python/                    # Python SDK (pip install stickforstats)
│   ├── r/                         # R SDK (CRAN package)
│   ├── jupyter/                   # Jupyter notebook extension
│   └── browser-extension/         # Browser extension
├── desktop/                       # Tauri desktop application
├── mobile/                        # React Native mobile application
├── infrastructure/
│   ├── keycloak/                  # SSO identity provider config
│   └── kong/                      # API gateway config
├── kubernetes/                    # Production K8s manifests
├── monitoring/
│   ├── prometheus.yml             # Metrics collection
│   └── grafana/                   # Dashboards
├── compliance/
│   ├── SOC2_Type_II_Controls.md
│   ├── FDA_21_CFR_Part_11.md
│   ├── SECURITY_CONTROLS_MATRIX.md
│   └── DATA_PROCESSING_AGREEMENT.md
├── paper/                         # JSS publication materials
│   ├── replication/               # Reproducibility scripts + data
│   └── figures/                   # Paper figures
├── docker-compose.yml
└── README.md
```

---

## SDKs

### Python SDK

```python
from stickforstats import Client

client = Client(base_url="https://your-instance.example.com", api_key="your-key")

# Run a t-test with automatic Guardian validation
result = client.ttest(
    data1=[23.5, 25.1, 22.8, 24.3, 26.0],
    data2=[28.2, 29.5, 27.8, 30.1, 28.9],
    test_type="independent"
)

print(f"t = {result.t_statistic}, p = {result.p_value}")
print(f"Cohen's d = {result.effect_size.cohens_d}")
print(f"Guardian confidence: {result.guardian.confidence_score}")

# Autonomous analysis -- describe your question in plain English
analysis = client.autonomous.query(
    data=my_dataframe,
    question="Is there a significant difference in test scores between the treatment and control groups?"
)
print(analysis.plain_language_summary)

# Manuscript validation
report = client.manuscript.analyze(file_path="manuscript.pdf", discipline="psychology")
print(f"Consistency issues: {len(report.inconsistencies)}")
print(f"SQS score: {report.sqs_score}/100")
```

### R SDK

```r
library(stickforstats)

client <- sfs_connect("https://your-instance.example.com", api_key = "your-key")

# Run ANOVA with Guardian validation
result <- sfs_anova(client, data = my_data, formula = score ~ group)

summary(result)
# Guardian confidence: 0.95
# F(2, 57) = 8.34, p = 0.0007
# eta-squared = 0.23

# Generate a publication-quality forest plot from meta-analysis
meta <- sfs_meta_analysis(client, effects = effect_sizes, variances = variances)
sfs_forest_plot(meta, file = "forest_plot.pdf")
```

---

## Compliance

StickForStats includes documentation and controls for regulated environments:

| Document | Scope |
|----------|-------|
| [SOC 2 Type II Controls](compliance/SOC2_Type_II_Controls.md) | Security, availability, processing integrity, confidentiality, privacy |
| [FDA 21 CFR Part 11](compliance/FDA_21_CFR_Part_11.md) | Electronic records and signatures for clinical research |
| [GDPR Data Processing Agreement](compliance/DATA_PROCESSING_AGREEMENT.md) | EU data protection compliance |
| [Security Controls Matrix](compliance/SECURITY_CONTROLS_MATRIX.md) | Comprehensive security control mapping |

GDPR is also implemented at the API level with 4 dedicated endpoints for consent management, data export (DSAR), right to erasure, and privacy information disclosure.

---

## Internationalization

StickForStats supports 16 languages with 4 translation namespaces per language (common, statistics, navigation, education):

| Language | Code | Language | Code |
|----------|------|----------|------|
| English | `en` | Arabic (RTL) | `ar` |
| Spanish | `es` | Turkish | `tr` |
| Chinese | `zh` | Russian | `ru` |
| Portuguese | `pt` | Indonesian | `id` |
| French | `fr` | Thai | `th` |
| German | `de` | Vietnamese | `vi` |
| Japanese | `ja` | Polish | `pl` |
| Korean | `ko` | Hindi | `hi` |

Language is auto-detected from browser settings and can be changed at runtime. Arabic uses full RTL layout support.

---

## Validation

StickForStats calculations are validated against reference implementations:

| Test | Reference | Agreement |
|------|-----------|-----------|
| T-test | SciPy | Exact (16 digits) |
| ANOVA | SciPy | Exact (14 digits) |
| Correlation | SciPy | Exact (16 digits) |
| Meta-analysis | Manual calculation | Exact (10 digits) |
| Power analysis | G*Power 3.1 | Within 1% |

40+ case study statistics independently verified against SciPy. Reproducibility scripts and data are available in `paper/replication/`.

---

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md) -- endpoint reference and usage examples
- [Guardian System Guide](docs/GUARDIAN_GUIDE.md) -- assumption validation details
- [Deployment Guide](DEPLOYMENT_GUIDE.md) -- production deployment instructions
- [Contributing Guidelines](CONTRIBUTING.md) -- how to contribute
- [Features Documentation](FEATURES_DOCUMENTATION.md) -- comprehensive feature reference
- Interactive API docs at `/api/v1/schema/swagger/` (Swagger UI)
- Interactive API docs at `/api/v1/schema/redoc/` (ReDoc)

---

## Citation

If you use StickForStats in your research, please cite:

```bibtex
@article{stickforstats2025,
  title = {{StickForStats}: A Statistical Analysis Platform with Automatic Assumption Validation},
  author = {Bharti, Vishal and Chakraborty, Debojyoti},
  journal = {Journal of Statistical Software},
  year = {2025},
  note = {Submitted}
}
```

---

## Contributing

We welcome contributions. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development setup
cd backend
pip install -r requirements.txt
python manage.py test     # Run backend tests

cd ../frontend
npm install
npm test                  # Run frontend tests
```

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

## Contact

- **Author**: Vishal Bharti
- **Co-author**: Debojyoti Chakraborty
- **Email**: vishalvikashbharti@gmail.com
- **GitHub**: [github.com/visvikbharti/stickforstats_new](https://github.com/visvikbharti/stickforstats_new)
- **Issues**: [GitHub Issues](https://github.com/visvikbharti/stickforstats_new/issues)

---

**StickForStats** -- Making statistical assumptions visible, not optional.
