# StickForStats

**A Statistical Analysis Platform with Automatic Assumption Validation**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Django 4.2](https://img.shields.io/badge/django-4.2-green.svg)](https://www.djangoproject.com/)

StickForStats is an open-source statistical analysis platform featuring the **Guardian system**—an automatic assumption validation layer that checks statistical assumptions before every test without requiring user action.

## Key Features

### Guardian System: Automatic Assumption Validation
- **8 Validators**: Normality, variance homogeneity, independence, outliers, sample size, modality, linearity, homoscedasticity
- **Automatic Execution**: Assumptions checked before every statistical test—no user action required
- **Integrated Reporting**: Assumption status appears alongside statistical results
- **Alternative Recommendations**: Suggests appropriate tests when violations are detected

### Statistical Tests
- **Parametric Tests**: t-tests (independent, paired, one-sample), ANOVA (one-way, factorial, repeated measures)
- **Non-parametric Tests**: Mann-Whitney U, Wilcoxon, Kruskal-Wallis, Friedman
- **Correlation & Regression**: Pearson, Spearman, Kendall, linear regression, logistic regression
- **Effect Sizes**: Cohen's d, Hedges' g, Glass's delta, eta-squared, omega-squared
- **Meta-Analysis**: Fixed and random effects (DerSimonian-Laird), forest plots, funnel plots
- **Power Analysis**: Sample size determination, power curves, sensitivity analysis

### Additional Features
- **High-Precision Computing**: Optional 50-decimal-place precision using mpmath
- **Code Export**: Generate equivalent R or Python code for any analysis
- **Reproducibility Bundle**: SHA-256 data fingerprints, complete audit trails
- **50 Interactive Lessons**: Integrated statistical education

### AI-Powered Features
- **AI Statistical Advisor**: Claude-powered natural language guidance for test selection
- **Paper Parser**: Manuscript analysis for JARS-Quant compliance
- **Statistical Quality Score (SQS)**: Automated scoring of manuscript statistical reporting (0-100)

## Demo

For a live demonstration of StickForStats features, run the application locally following the installation instructions below, or visit the [GitHub repository](https://github.com/visvikbharti/stickforstats_new) for the latest updates.

### Key Features in Action

1. **Guardian Validation**: Automatic assumption checking before every statistical test
2. **AI Statistical Advisor**: Natural language guidance for test selection and interpretation
3. **SQS Score Analysis**: Manuscript statistical quality assessment with actionable recommendations

> **Note:** See [docs/DEMO_MATERIALS_GUIDE.md](docs/DEMO_MATERIALS_GUIDE.md) for detailed feature documentation.

## Installation

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher (for frontend)
- PostgreSQL (production) or SQLite (development)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/visvikbharti/stickforstats_new.git
cd stickforstats_new

# Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start development server
python manage.py runserver
```

### Frontend Setup

```bash
# In a new terminal
cd frontend
npm install
npm start
```

The application will be available at `http://localhost:3000`.

## Quick Start

### API Usage

```bash
# Run a t-test with automatic assumption validation
curl -X POST http://localhost:8000/api/v1/stats/ttest/ \
  -H "Content-Type: application/json" \
  -d '{
    "data1": [23.5, 25.1, 22.8, 24.3, 26.0],
    "data2": [28.2, 29.5, 27.8, 30.1, 28.9],
    "test_type": "independent"
  }'
```

Response includes both statistical results AND Guardian report:

```json
{
  "results": {
    "t_statistic": -5.67,
    "p_value": 0.0005,
    "effect_size": {"cohens_d": 2.54}
  },
  "guardian_report": {
    "assumptions_checked": ["normality", "variance_homogeneity", "independence", "outliers"],
    "violations": [],
    "confidence_score": 1.0,
    "can_proceed": true
  }
}
```

### Python Usage

```python
import requests

# Perform correlation with Guardian validation
response = requests.post(
    "http://localhost:8000/api/v1/stats/correlation/",
    json={
        "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
        "y": [2.1, 4.2, 5.8, 8.1, 9.9, 12.2, 14.0, 16.1, 17.9, 20.2],
        "method": "pearson"
    }
)

result = response.json()
print(f"Pearson r: {result['results']['r']}")
print(f"Guardian confidence: {result['guardian_report']['confidence_score']}")
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/stats/ttest/` | POST | T-tests (independent, paired, one-sample) |
| `/api/v1/stats/anova/` | POST | ANOVA (one-way, factorial) |
| `/api/v1/stats/correlation/` | POST | Correlation (Pearson, Spearman, Kendall) |
| `/api/v1/stats/chi-square/` | POST | Chi-square tests |
| `/api/v1/meta-analysis/` | POST | Meta-analysis (fixed/random effects) |
| `/api/v1/power/` | POST | Power analysis |
| `/api/v1/nonparametric/mann-whitney/` | POST | Mann-Whitney U test |
| `/api/v1/nonparametric/wilcoxon/` | POST | Wilcoxon signed-rank test |

## Guardian System

The Guardian system automatically validates assumptions before every statistical test:

```
User Request → Guardian Interception → Assumption Validation → Analysis → Combined Response
```

### Validators

| Validator | Statistical Test | Threshold |
|-----------|-----------------|-----------|
| Normality | Shapiro-Wilk / Anderson-Darling | p < 0.05 |
| Variance Homogeneity | Levene's Test | p < 0.05 |
| Independence | Autocorrelation | \|r\| > 0.3 |
| Outliers | IQR + Z-score | Combined detection |
| Linearity | R² comparison + Runs test | ΔR² > 0.05 |
| Homoscedasticity | Breusch-Pagan | p < 0.05 |

### Confidence Score

Guardian calculates a confidence score (0-1) based on assumption status:

| Score | Interpretation |
|-------|----------------|
| 0.90 - 1.00 | Excellent - proceed with confidence |
| 0.70 - 0.89 | Acceptable - proceed with caution |
| 0.50 - 0.69 | Questionable - consider alternatives |
| 0.00 - 0.49 | Poor - use alternative test |

## Validation

StickForStats calculations are validated against reference implementations:

| Test | Reference | Agreement |
|------|-----------|-----------|
| T-test | SciPy | Exact (16 digits) |
| ANOVA | SciPy | Exact (14 digits) |
| Correlation | SciPy | Exact (16 digits) |
| Meta-analysis | Manual calculation | Exact (10 digits) |
| Power analysis | G*Power 3.1 | Within 1% |

See `paper/replication/` for reproducibility scripts.

## Project Structure

```
stickforstats/
├── backend/
│   ├── api/v1/              # REST API endpoints
│   ├── core/                # Statistical computations
│   │   ├── guardian/        # Guardian assumption validation
│   │   ├── stats/           # Statistical tests
│   │   └── hp_*.py          # High-precision modules
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   └── services/        # API clients
│   └── package.json
├── paper/                   # JSS paper materials
│   ├── replication/         # Reproducibility scripts
│   └── figures/             # Paper figures
├── examples/                # Usage examples
└── docs/                    # Documentation
```

## Documentation

- [API Documentation](docs/API_DOCUMENTATION.md)
- [Guardian System Guide](docs/GUARDIAN_GUIDE.md)
- [Deployment Guide](DEPLOYMENT_GUIDE.md)
- [Contributing Guidelines](CONTRIBUTING.md)

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

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run tests
pytest

# Run linting
flake8 backend/
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Django](https://www.djangoproject.com/), [React](https://reactjs.org/), [SciPy](https://scipy.org/)
- High-precision arithmetic via [mpmath](http://mpmath.org/)
- Inspired by the need for better statistical practice in science

## Contact

- **Issues**: [GitHub Issues](https://github.com/visvikbharti/stickforstats_new/issues)
- **Email**: vishalvikashbharti@gmail.com

---

**StickForStats** - Making statistical assumptions visible, not optional.
