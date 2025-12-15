# Contributing to StickForStats

Thank you for your interest in contributing to StickForStats! This document provides guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [email].

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/stickforstats.git`
3. Add upstream remote: `git remote add upstream https://github.com/visvikbharti/stickforstats.git`
4. Create a branch: `git checkout -b feature/your-feature-name`

## How to Contribute

### Types of Contributions

We welcome:

- **Bug fixes**: Found a bug? Please report it or submit a fix
- **New features**: New statistical tests, validators, or UI improvements
- **Documentation**: Improvements to README, API docs, or code comments
- **Tests**: Additional test coverage for existing features
- **Translations**: Help make StickForStats accessible in more languages

### What We're Looking For

- **New Guardian validators**: Additional assumption checks for statistical tests
- **Statistical tests**: Implementations of tests not yet supported
- **Educational content**: New lessons for the Learning Hub
- **Performance improvements**: Optimizations for large datasets
- **Accessibility**: Making the UI more accessible

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Git

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt  # Development dependencies
python manage.py migrate
python manage.py runserver
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

### Running Tests

```bash
# Backend tests
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

## Coding Standards

### Python (Backend)

- Follow PEP 8 style guide
- Use type hints for function signatures
- Maximum line length: 100 characters
- Use docstrings for public functions and classes

```python
def calculate_effect_size(
    group1: List[float],
    group2: List[float],
    method: str = "cohens_d"
) -> Dict[str, float]:
    """
    Calculate effect size between two groups.

    Parameters
    ----------
    group1 : List[float]
        First group of observations
    group2 : List[float]
        Second group of observations
    method : str, optional
        Effect size method ('cohens_d', 'hedges_g', 'glass_delta')

    Returns
    -------
    Dict[str, float]
        Dictionary containing effect size and confidence interval
    """
    ...
```

### JavaScript/React (Frontend)

- Use functional components with hooks
- Follow ESLint configuration
- Use PropTypes or TypeScript for type checking
- Keep components focused and reusable

```javascript
import React from 'react';
import PropTypes from 'prop-types';

const ResultDisplay = ({ result, guardianReport }) => {
  // Component implementation
};

ResultDisplay.propTypes = {
  result: PropTypes.object.isRequired,
  guardianReport: PropTypes.object.isRequired,
};

export default ResultDisplay;
```

### Statistical Code

For statistical implementations:

1. **Validate against references**: Compare results with SciPy, R, or G*Power
2. **Document formulas**: Include mathematical notation in docstrings
3. **Handle edge cases**: Small samples, missing data, extreme values
4. **Include tests**: Unit tests with known values

```python
def shapiro_wilk_test(data: np.ndarray) -> Tuple[float, float]:
    """
    Perform Shapiro-Wilk test for normality.

    The test statistic W is calculated as:
        W = (Σ aᵢ x₍ᵢ₎)² / Σ (xᵢ - x̄)²

    Reference: Shapiro, S. S., & Wilk, M. B. (1965). Biometrika, 52(3-4), 591-611.

    Parameters
    ----------
    data : np.ndarray
        Sample data (3 ≤ n ≤ 5000)

    Returns
    -------
    Tuple[float, float]
        W statistic and p-value
    """
    ...
```

## Testing Guidelines

### Test Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Maintain or improve code coverage

### Test Structure

```python
# test_guardian_normality.py

import pytest
import numpy as np
from core.guardian.guardian_core import NormalityValidator

class TestNormalityValidator:
    """Tests for the normality validator."""

    def test_normal_data_passes(self):
        """Normal data should not trigger violation."""
        np.random.seed(42)
        data = np.random.normal(0, 1, 100)
        validator = NormalityValidator()
        result = validator.validate([data])
        assert result['violated'] is False

    def test_skewed_data_detected(self):
        """Highly skewed data should trigger violation."""
        data = np.array([1, 1, 1, 1, 1, 100])  # Extreme outlier
        validator = NormalityValidator()
        result = validator.validate([data])
        assert result['violated'] is True

    def test_small_sample_warning(self):
        """Small samples should produce warning."""
        data = np.array([1, 2])  # n < 3
        validator = NormalityValidator()
        result = validator.validate([data])
        assert result['severity'] == 'critical'
```

### Validation Tests

For statistical functions, include validation against known values:

```python
def test_ttest_matches_scipy():
    """T-test should match SciPy to 10+ decimal places."""
    from scipy import stats

    group1 = [23.5, 25.1, 22.8, 24.3, 26.0]
    group2 = [28.2, 29.5, 27.8, 30.1, 28.9]

    # Our implementation
    our_result = perform_ttest(group1, group2)

    # SciPy reference
    scipy_t, scipy_p = stats.ttest_ind(group1, group2)

    assert abs(our_result['t_statistic'] - scipy_t) < 1e-10
    assert abs(our_result['p_value'] - scipy_p) < 1e-10
```

## Pull Request Process

### Before Submitting

1. Update documentation if needed
2. Add tests for new features
3. Run the full test suite
4. Update CHANGELOG.md (if applicable)

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement

## Testing
Describe how you tested the changes

## Checklist
- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No new warnings
```

### Review Process

1. Submit PR to `main` branch
2. Automated tests will run
3. Maintainer will review within 1 week
4. Address feedback if requested
5. Merge after approval

## Reporting Issues

### Bug Reports

Please include:
- StickForStats version
- Python/Node.js versions
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Error messages/screenshots

### Feature Requests

Please include:
- Use case description
- Proposed solution
- Alternative solutions considered
- Willingness to contribute

### Security Issues

For security vulnerabilities, please email [security email] directly rather than creating a public issue.

## Questions?

- Open a GitHub Discussion for general questions
- Check existing issues before creating new ones
- Join our community [Discord/Slack] (if applicable)

---

Thank you for contributing to StickForStats!
