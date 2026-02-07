# Phase 1 Technical Specifications
## Bayesian Statistics, Pre-Registration, P-Curve Analysis

---

# 1. BAYESIAN STATISTICS MODULE

## 1.1 Mathematical Foundation

### Bayesian T-Test (JZS Prior)

The Jeffreys-Zellner-Siow (JZS) prior is used for effect size:

**Prior on effect size δ:**
```
δ ~ Cauchy(0, r)
```
where `r` is the scale parameter (default: √2/2 ≈ 0.707 for "medium" prior)

**Bayes Factor Calculation (One-Sample):**

For data X = {x₁, ..., xₙ} with sample mean x̄ and sample SD s:

```
BF₁₀ = ∫ p(X|δ) × p(δ) dδ / p(X|δ=0)
```

This integral can be computed analytically using:

```python
def bayes_factor_one_sample(data, mu=0, r=0.707):
    """
    Compute Bayes Factor for one-sample t-test using JZS prior.

    Based on Rouder et al. (2009) Equation 1.
    """
    n = len(data)
    t = (np.mean(data) - mu) / (np.std(data, ddof=1) / np.sqrt(n))
    v = n - 1  # degrees of freedom

    # Compute BF using numerical integration
    def integrand(g):
        return (1 + n*g)**(-0.5) * (1 + t**2 / ((1 + n*g) * v))**(-(v+1)/2) * \
               (2*np.pi)**(-0.5) * g**(-1.5) * np.exp(-1/(2*g*r**2))

    bf10, _ = integrate.quad(integrand, 0, np.inf)
    return bf10
```

### Prior Scale Interpretation

| Scale | r value | Interpretation |
|-------|---------|----------------|
| Ultra-wide | 1.414 | Expecting very large effects |
| Wide | 1.0 | Expecting large effects |
| Medium | 0.707 | Default, moderate expectations |
| Narrow | 0.5 | Expecting small effects |
| Ultra-narrow | 0.354 | Expecting very small effects |

### Two-Sample (Independent) Bayes Factor

For two groups with n₁ and n₂ observations:

```python
def bayes_factor_two_sample(group1, group2, r=0.707):
    """
    Compute Bayes Factor for independent samples t-test.

    Uses pooled variance estimate.
    """
    n1, n2 = len(group1), len(group2)
    n = n1 + n2

    # Pooled variance
    var1 = np.var(group1, ddof=1)
    var2 = np.var(group2, ddof=1)
    sp2 = ((n1-1)*var1 + (n2-1)*var2) / (n-2)

    # Effect size (Cohen's d)
    d = (np.mean(group1) - np.mean(group2)) / np.sqrt(sp2)

    # Effective sample size
    n_eff = (n1 * n2) / n

    # t-statistic
    t = d * np.sqrt(n_eff)
    v = n - 2

    # Similar integration as one-sample
    # ...
```

### Posterior Distribution

The posterior for δ given data:

```
p(δ|X) ∝ p(X|δ) × p(δ)
```

For visualization, compute on a grid:

```python
def compute_posterior(data, delta_range=np.linspace(-3, 3, 1000), r=0.707):
    """Compute posterior distribution for effect size."""
    n = len(data)
    t_obs = stats.ttest_1samp(data, 0).statistic
    v = n - 1

    # Prior: Cauchy(0, r)
    prior = stats.cauchy.pdf(delta_range, loc=0, scale=r)

    # Likelihood (non-central t)
    ncp = delta_range * np.sqrt(n)  # non-centrality parameter
    likelihood = stats.nct.pdf(t_obs, v, ncp)

    # Posterior (unnormalized)
    posterior_unnorm = prior * likelihood

    # Normalize
    posterior = posterior_unnorm / np.trapz(posterior_unnorm, delta_range)

    return delta_range, posterior
```

### Credible Interval (HDI)

Highest Density Interval calculation:

```python
def hdi(samples, credible_mass=0.95):
    """
    Compute Highest Density Interval.

    The HDI is the narrowest interval containing the specified probability mass.
    """
    sorted_samples = np.sort(samples)
    n = len(sorted_samples)

    # Number of samples to exclude
    n_exclude = int(np.floor(n * (1 - credible_mass)))

    # Find narrowest interval
    width = sorted_samples[n - n_exclude - 1:] - sorted_samples[:n_exclude + 1]
    min_idx = np.argmin(width)

    hdi_min = sorted_samples[min_idx]
    hdi_max = sorted_samples[n - n_exclude - 1 + min_idx]

    return hdi_min, hdi_max
```

### ROPE Analysis

Region of Practical Equivalence:

```python
def rope_analysis(posterior_samples, rope_low=-0.1, rope_high=0.1):
    """
    Calculate percentage of posterior in ROPE.

    Returns:
        in_rope: Percentage of posterior in ROPE
        below_rope: Percentage below ROPE
        above_rope: Percentage above ROPE
        decision: 'accept null', 'reject null', or 'undecided'
    """
    in_rope = np.mean((posterior_samples >= rope_low) & (posterior_samples <= rope_high))
    below_rope = np.mean(posterior_samples < rope_low)
    above_rope = np.mean(posterior_samples > rope_high)

    # Decision rules (based on Kruschke, 2018)
    if in_rope > 0.95:
        decision = 'accept_null'
    elif in_rope < 0.05:
        decision = 'reject_null'
    else:
        decision = 'undecided'

    return {
        'in_rope': in_rope * 100,
        'below_rope': below_rope * 100,
        'above_rope': above_rope * 100,
        'decision': decision
    }
```

## 1.2 Implementation Files

### Backend

```python
# backend/core/services/bayesian/__init__.py
from .bayesian_ttest import (
    bayesian_one_sample_ttest,
    bayesian_two_sample_ttest,
    bayesian_paired_ttest
)
from .bayesian_anova import bayesian_one_way_anova
from .bayesian_correlation import bayesian_correlation
from .bayes_factor import interpret_bayes_factor, BayesFactorResult
from .priors import Prior, CauchyPrior, NormalPrior
from .posterior import compute_posterior, hdi, rope_analysis
```

```python
# backend/core/services/bayesian/bayesian_ttest.py
"""
Bayesian T-Test Implementations
Based on Rouder et al. (2009) and JASP implementation.
"""

import numpy as np
from scipy import stats, integrate
from typing import Dict, Any, List, Optional, Literal
from dataclasses import dataclass

@dataclass
class BayesianTTestResult:
    """Result container for Bayesian t-test."""
    bf10: float
    bf01: float
    interpretation: str
    interpretation_level: str

    # Posterior
    posterior_mean: float
    posterior_median: float
    hdi_low: float
    hdi_high: float

    # ROPE
    rope_percentage: float
    rope_decision: str

    # Frequentist comparison
    freq_t: float
    freq_p: float
    freq_d: float

    # Additional info
    n: int
    prior_scale: float
    error_percentage: Optional[float] = None


def bayesian_one_sample_ttest(
    data: np.ndarray,
    mu: float = 0,
    prior_scale: float = 0.707,
    alternative: Literal['two-sided', 'greater', 'less'] = 'two-sided',
    rope: tuple = (-0.1, 0.1),
    credible_mass: float = 0.95
) -> BayesianTTestResult:
    """
    Perform Bayesian one-sample t-test.

    Args:
        data: Sample data
        mu: Null hypothesis value
        prior_scale: Scale of Cauchy prior on effect size (r)
        alternative: Direction of alternative hypothesis
        rope: Region of Practical Equivalence bounds
        credible_mass: Credible interval mass (default 95%)

    Returns:
        BayesianTTestResult with Bayes Factor, posterior, and interpretation

    References:
        Rouder, J. N., Speckman, P. L., Sun, D., Morey, R. D., & Iverson, G. (2009).
        Bayesian t tests for accepting and rejecting the null hypothesis.
        Psychonomic Bulletin & Review, 16(2), 225-237.
    """
    data = np.asarray(data)
    n = len(data)

    # Frequentist statistics
    t_stat, p_value = stats.ttest_1samp(data, mu)
    mean_diff = np.mean(data) - mu
    sd = np.std(data, ddof=1)
    d = mean_diff / sd  # Cohen's d

    # Compute Bayes Factor
    bf10 = _compute_bf10_one_sample(data, mu, prior_scale, alternative)
    bf01 = 1 / bf10

    # Interpret BF
    interpretation, level = interpret_bayes_factor(bf10)

    # Compute posterior
    delta_range, posterior = compute_posterior(data - mu, prior_scale)

    # Posterior statistics
    posterior_mean = np.trapz(delta_range * posterior, delta_range)
    posterior_median = delta_range[np.searchsorted(np.cumsum(posterior) / np.sum(posterior), 0.5)]

    # HDI
    hdi_low, hdi_high = hdi_from_posterior(delta_range, posterior, credible_mass)

    # ROPE analysis
    rope_result = rope_analysis_from_posterior(delta_range, posterior, rope)

    return BayesianTTestResult(
        bf10=bf10,
        bf01=bf01,
        interpretation=interpretation,
        interpretation_level=level,
        posterior_mean=posterior_mean,
        posterior_median=posterior_median,
        hdi_low=hdi_low,
        hdi_high=hdi_high,
        rope_percentage=rope_result['in_rope'],
        rope_decision=rope_result['decision'],
        freq_t=t_stat,
        freq_p=p_value,
        freq_d=d,
        n=n,
        prior_scale=prior_scale
    )


def _compute_bf10_one_sample(data, mu, r, alternative):
    """Compute BF10 using numerical integration."""
    n = len(data)
    t = stats.ttest_1samp(data, mu).statistic
    v = n - 1

    def integrand(g):
        if g <= 0:
            return 0
        term1 = (1 + n * g) ** (-0.5)
        term2 = (1 + t**2 / ((1 + n * g) * v)) ** (-(v + 1) / 2)
        term3 = (2 * np.pi) ** (-0.5)
        term4 = g ** (-1.5)
        term5 = np.exp(-1 / (2 * g * r**2))
        return term1 * term2 * term3 * term4 * term5

    bf10, error = integrate.quad(integrand, 1e-10, np.inf, limit=100)

    # Adjust for one-sided if needed
    if alternative == 'greater':
        bf10 = bf10 * 2 if t > 0 else bf10 / 2
    elif alternative == 'less':
        bf10 = bf10 * 2 if t < 0 else bf10 / 2

    return bf10
```

### Frontend Components

```jsx
// frontend/src/components/bayesian/BayesianTTest.jsx
import React, { useState, useCallback } from 'react';
import {
  Box, Paper, Typography, Slider, Button, Tabs, Tab,
  FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import PosteriorPlot from './components/PosteriorPlot';
import BayesFactorMeter from './components/BayesFactorMeter';
import ROPEAnalysis from './components/ROPEAnalysis';
import FrequentistComparison from './components/FrequentistComparison';
import DataInput from '../common/DataInput';

const PRIOR_SCALES = [
  { value: 0.354, label: 'Ultra-narrow (0.354)', description: 'Expecting very small effects' },
  { value: 0.5, label: 'Narrow (0.5)', description: 'Expecting small effects' },
  { value: 0.707, label: 'Medium (0.707)', description: 'Default - moderate expectations' },
  { value: 1.0, label: 'Wide (1.0)', description: 'Expecting large effects' },
  { value: 1.414, label: 'Ultra-wide (1.414)', description: 'Expecting very large effects' },
];

const BayesianTTest = () => {
  const { t } = useTranslation();
  const [testType, setTestType] = useState('one-sample');
  const [data, setData] = useState({ group1: [], group2: [] });
  const [priorScale, setPriorScale] = useState(0.707);
  const [alternative, setAlternative] = useState('two-sided');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bayesian/ttest/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          test_type: testType,
          data: data,
          prior_scale: priorScale,
          alternative: alternative,
          mu: 0  // For one-sample
        })
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();
      setResults(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [testType, data, priorScale, alternative]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Bayesian T-Test
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        {/* Test Type Selection */}
        <FormControl fullWidth sx={{ mb: 2 }}>
          <InputLabel>Test Type</InputLabel>
          <Select value={testType} onChange={(e) => setTestType(e.target.value)}>
            <MenuItem value="one-sample">One-Sample</MenuItem>
            <MenuItem value="independent">Independent Samples</MenuItem>
            <MenuItem value="paired">Paired Samples</MenuItem>
          </Select>
        </FormControl>

        {/* Data Input */}
        <DataInput
          testType={testType}
          data={data}
          onChange={setData}
        />

        {/* Prior Specification */}
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6">Prior Specification</Typography>
          <Typography variant="body2" color="textSecondary">
            The prior represents your expectations about effect size before seeing the data.
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Prior Scale (Cauchy)</InputLabel>
            <Select
              value={priorScale}
              onChange={(e) => setPriorScale(e.target.value)}
            >
              {PRIOR_SCALES.map(scale => (
                <MenuItem key={scale.value} value={scale.value}>
                  {scale.label} - {scale.description}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* Alternative Hypothesis */}
        <FormControl fullWidth sx={{ mt: 2 }}>
          <InputLabel>Alternative Hypothesis</InputLabel>
          <Select
            value={alternative}
            onChange={(e) => setAlternative(e.target.value)}
          >
            <MenuItem value="two-sided">Two-sided (≠)</MenuItem>
            <MenuItem value="greater">Greater (&gt;)</MenuItem>
            <MenuItem value="less">Less (&lt;)</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="contained"
          onClick={runAnalysis}
          disabled={loading || data.group1.length === 0}
          sx={{ mt: 3 }}
        >
          {loading ? 'Analyzing...' : 'Run Bayesian Analysis'}
        </Button>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>
      )}

      {results && (
        <>
          {/* Bayes Factor Display */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Bayes Factor</Typography>
            <BayesFactorMeter
              bf10={results.bf10}
              interpretation={results.interpretation}
            />
          </Paper>

          {/* Posterior Distribution */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Posterior Distribution</Typography>
            <PosteriorPlot
              posteriorData={results.posterior}
              hdi={[results.hdi_low, results.hdi_high]}
              priorScale={priorScale}
            />
          </Paper>

          {/* ROPE Analysis */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>ROPE Analysis</Typography>
            <ROPEAnalysis
              ropePercentage={results.rope_percentage}
              decision={results.rope_decision}
            />
          </Paper>

          {/* Frequentist Comparison */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Comparison with Frequentist Results
            </Typography>
            <FrequentistComparison
              t={results.freq_t}
              p={results.freq_p}
              d={results.freq_d}
              bf10={results.bf10}
            />
          </Paper>
        </>
      )}
    </Box>
  );
};

export default BayesianTTest;
```

---

# 2. PRE-REGISTRATION ASSISTANT

## 2.1 Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│                  PRE-REGISTRATION WORKFLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Study Information                                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Title, Authors, Abstract, Research Questions            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  Step 2: Hypotheses                                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ H1, H2, ... with directional specifications             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  Step 3: Study Design                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Between/Within, Groups, Conditions, Variables           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  Step 4: Sample Size & Power                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ ← Integrated Power Analysis Tool                        │   │
│  │ Expected effect size, desired power, justification      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  Step 5: Analysis Plan                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Primary: Test selection (Guardian validated)            │   │
│  │ Secondary: Additional analyses                          │   │
│  │ Exploratory: Clearly marked as exploratory              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  Step 6: Data Handling                                           │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Exclusion criteria, Missing data, Outliers              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                           ↓                                      │
│  Step 7: Review & Export                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ → OSF Prereg                                            │   │
│  │ → AsPredicted                                           │   │
│  │ → PDF Report                                            │   │
│  │ → JSON (for deviation tracking)                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2.2 Database Schema

```python
# backend/core/models/preregistration.py

from django.db import models
from django.contrib.postgres.fields import JSONField
import uuid

class PreRegistration(models.Model):
    """Pre-registration record."""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        REGISTERED = 'registered', 'Registered'
        IN_PROGRESS = 'in_progress', 'Data Collection In Progress'
        COMPLETED = 'completed', 'Completed'
        WITHDRAWN = 'withdrawn', 'Withdrawn'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    registered_at = models.DateTimeField(null=True, blank=True)

    # Status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT
    )

    # Step 1: Study Information
    title = models.CharField(max_length=500)
    authors = models.JSONField(default=list)  # [{name, affiliation, email, orcid}]
    abstract = models.TextField(blank=True)
    research_questions = models.JSONField(default=list)

    # Step 2: Hypotheses
    hypotheses = models.JSONField(default=list)
    # [{id, text, type: 'directional'|'non-directional', variables: []}]

    # Step 3: Study Design
    design_type = models.CharField(max_length=50)  # between, within, mixed, correlational
    design_details = models.JSONField(default=dict)
    # {groups: [], conditions: [], factors: [], levels: []}

    independent_variables = models.JSONField(default=list)
    # [{name, type, levels, measurement}]

    dependent_variables = models.JSONField(default=list)
    # [{name, type, measurement, scale}]

    covariates = models.JSONField(default=list)
    # [{name, type, role: 'control'|'moderator'|'mediator'}]

    # Step 4: Sample Size & Power
    target_sample_size = models.IntegerField(null=True)
    power_analysis = models.JSONField(null=True)
    # {effect_size, alpha, power, test, rationale}

    sample_size_rationale = models.TextField(blank=True)
    stopping_rule = models.TextField(blank=True)

    # Step 5: Analysis Plan
    primary_analyses = models.JSONField(default=list)
    # [{hypothesis_id, test, variables, assumptions, alpha, correction}]

    secondary_analyses = models.JSONField(default=list)
    exploratory_analyses = models.JSONField(default=list)

    # Step 6: Data Handling
    exclusion_criteria = models.JSONField(default=list)
    # [{criterion, justification}]

    missing_data_handling = models.TextField(blank=True)
    outlier_handling = models.TextField(blank=True)
    data_transformations = models.JSONField(default=list)

    # Validation
    guardian_validation = models.JSONField(null=True)
    validation_warnings = models.JSONField(default=list)

    # Tracking
    version = models.IntegerField(default=1)
    version_history = models.JSONField(default=list)

    # External links
    osf_url = models.URLField(blank=True, null=True)
    doi = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-created_at']

    def register(self):
        """Lock the pre-registration."""
        from django.utils import timezone
        self.status = self.Status.REGISTERED
        self.registered_at = timezone.now()
        self.save()

    def create_version(self):
        """Create a new version before modification."""
        self.version_history.append({
            'version': self.version,
            'timestamp': self.updated_at.isoformat(),
            'snapshot': self.to_dict()
        })
        self.version += 1
        self.save()


class PreRegistrationDeviation(models.Model):
    """Track deviations from pre-registration."""

    class Severity(models.TextChoices):
        MINOR = 'minor', 'Minor'
        MODERATE = 'moderate', 'Moderate'
        MAJOR = 'major', 'Major'

    prereg = models.ForeignKey(
        PreRegistration,
        on_delete=models.CASCADE,
        related_name='deviations'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    # What was planned
    planned_element = models.CharField(max_length=100)  # e.g., 'primary_analysis_1'
    planned_value = models.JSONField()

    # What was actually done
    actual_value = models.JSONField()

    # Justification
    deviation_type = models.CharField(max_length=50)
    severity = models.CharField(max_length=20, choices=Severity.choices)
    justification = models.TextField()
    discovered_at = models.CharField(max_length=50)  # 'before_analysis', 'during_analysis', 'after_analysis'
```

## 2.3 Export Templates

### OSF Prereg Template

```python
# backend/core/services/preregistration/templates/osf.py

OSF_TEMPLATE = {
    "Study Information": {
        "1": {
            "question": "Title",
            "field": "title"
        },
        "2": {
            "question": "Authors",
            "field": "authors",
            "format": lambda authors: ", ".join([a['name'] for a in authors])
        },
        "3": {
            "question": "Description",
            "field": "abstract"
        },
        "4": {
            "question": "Hypotheses",
            "field": "hypotheses",
            "format": lambda hyps: "\n".join([f"{i+1}. {h['text']}" for i, h in enumerate(hyps)])
        }
    },
    "Design Plan": {
        "5": {
            "question": "Study type",
            "field": "design_type"
        },
        # ... more fields
    },
    "Sampling Plan": {
        "9": {
            "question": "Existing Data",
            "default": "Registration prior to creation of data"
        },
        "10": {
            "question": "Data collection procedures",
            "field": "design_details.procedures"
        },
        "11": {
            "question": "Sample size",
            "field": "target_sample_size"
        },
        "12": {
            "question": "Sample size rationale",
            "field": "sample_size_rationale"
        },
        "13": {
            "question": "Stopping rule",
            "field": "stopping_rule"
        }
    },
    "Variables": {
        "14": {
            "question": "Manipulated variables",
            "field": "independent_variables",
            "format": format_variables
        },
        "15": {
            "question": "Measured variables",
            "field": "dependent_variables",
            "format": format_variables
        }
    },
    "Analysis Plan": {
        "16": {
            "question": "Statistical models",
            "field": "primary_analyses",
            "format": format_analyses
        },
        "17": {
            "question": "Transformations",
            "field": "data_transformations"
        },
        "18": {
            "question": "Inference criteria",
            "field": "primary_analyses",
            "format": lambda a: f"α = {a[0].get('alpha', 0.05)}"
        },
        "19": {
            "question": "Data exclusion",
            "field": "exclusion_criteria",
            "format": format_exclusions
        },
        "20": {
            "question": "Missing data",
            "field": "missing_data_handling"
        },
        "21": {
            "question": "Exploratory analysis",
            "field": "exploratory_analyses",
            "format": format_analyses
        }
    }
}
```

---

# 3. P-CURVE ANALYSIS

## 3.1 Statistical Foundation

### P-Curve Theory

From Simonsohn, Nelson & Simmons (2014):

**Right-skew test:** If there are real effects, p-values should cluster near zero (right-skewed when plotted as histogram with p on x-axis).

**Flatness test:** If there's no effect, p-values should be uniformly distributed between 0 and 0.05.

### PP-Value Calculation

For each p-value, calculate its "pp-value" - the probability of observing a p-value at least as extreme under the null:

```python
def calculate_pp_value(p_value, test_statistic, df, test_type='t'):
    """
    Calculate pp-value for p-curve analysis.

    The pp-value is the probability of obtaining a p-value
    as small or smaller, given that H0 is true.

    For a p-value from a t-test:
    pp = p / 0.05 (under uniform null)

    For more accurate pp-values, use the test statistic:
    pp = F(t) where F is the CDF of the t-distribution
    """
    if test_type == 't':
        # Convert p to t, then get pp
        t_critical = stats.t.ppf(1 - 0.025, df)  # two-tailed
        t_observed = stats.t.ppf(1 - p_value/2, df)
        pp = stats.t.cdf(t_observed, df) / stats.t.cdf(t_critical, df)
    elif test_type == 'F':
        # Similar for F-tests
        pass
    elif test_type == 'z':
        pp = stats.norm.cdf(stats.norm.ppf(1 - p_value/2)) / 0.975
    else:
        # Simple approximation
        pp = p_value / 0.05

    return pp
```

### Stouffer's Method for Combining PP-Values

```python
def stouffer_test(pp_values):
    """
    Combine pp-values using Stouffer's method.

    Z = Σ Φ⁻¹(pp_i) / √n

    Returns Z-score and p-value for right-skew test.
    """
    z_scores = [stats.norm.ppf(pp) for pp in pp_values]
    combined_z = np.sum(z_scores) / np.sqrt(len(z_scores))
    p_value = stats.norm.cdf(combined_z)  # One-tailed

    return combined_z, p_value
```

### Complete P-Curve Implementation

```python
# backend/core/services/meta_science/pcurve.py

import numpy as np
from scipy import stats
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass

@dataclass
class PCurveResult:
    """Results from p-curve analysis."""

    # Input
    n_studies: int
    p_values: List[float]

    # PP-values
    pp_values: List[float]

    # Right-skew test (evidential value)
    right_skew_z: float
    right_skew_p: float
    has_evidential_value: bool

    # Flatness test (33% power)
    flat_z: float
    flat_p: float
    is_flat: bool

    # Full p-curve test
    full_z: float
    full_p: float

    # Half p-curve (more robust)
    half_z: float
    half_p: float

    # Interpretation
    conclusion: str
    confidence: str

    # Visualization data
    observed_distribution: List[float]
    expected_null: List[float]
    expected_33_power: List[float]

    # Warnings
    warnings: List[str]


def analyze_pcurve(
    p_values: List[float],
    test_statistics: List[Dict] = None
) -> PCurveResult:
    """
    Perform p-curve analysis on a set of significant p-values.

    Args:
        p_values: List of p-values (should all be < 0.05)
        test_statistics: Optional list of {stat, df, test_type} for accurate pp-values

    Returns:
        PCurveResult with all analyses and interpretation

    References:
        Simonsohn, U., Nelson, L. D., & Simmons, J. P. (2014).
        P-curve: A key to the file-drawer.
        Journal of Experimental Psychology: General, 143(2), 534.

        Simonsohn, U., Nelson, L. D., & Simmons, J. P. (2015).
        Better P-curves: Making P-curve analysis more robust.
        Journal of Experimental Psychology: General, 144(6), 1146.
    """
    warnings = []

    # Validate inputs
    p_values = [p for p in p_values if p < 0.05]
    if len(p_values) < 5:
        warnings.append("Fewer than 5 studies; results may be unreliable")

    n = len(p_values)

    # Calculate pp-values
    if test_statistics:
        pp_values = [
            calculate_pp_value(p, ts['stat'], ts.get('df'), ts.get('test_type', 't'))
            for p, ts in zip(p_values, test_statistics)
        ]
    else:
        # Simple approximation
        pp_values = [p / 0.05 for p in p_values]

    # RIGHT-SKEW TEST (Full p-curve)
    # Tests if distribution is right-skewed (more small p-values than expected under null)
    right_z_full, right_p_full = stouffer_test(pp_values)

    # HALF P-CURVE (more robust)
    # Only use p < 0.025
    half_pp = [pp for pp in pp_values if pp < 0.5]  # corresponds to p < 0.025
    if len(half_pp) >= 3:
        right_z_half, right_p_half = stouffer_test(half_pp)
    else:
        right_z_half, right_p_half = np.nan, np.nan
        warnings.append("Too few p-values < 0.025 for half p-curve")

    # FLATNESS TEST (33% power)
    # Under 33% power, expected p-curve is right-skewed but flatter
    # Calculate expected pp-values under 33% power
    pp_33_power = calculate_expected_pp_33_power(p_values)
    flat_z, flat_p = compare_to_33_power(pp_values, pp_33_power)

    # Determine conclusion
    has_evidential_value = right_p_full < 0.05
    is_flat = flat_p > 0.05  # Cannot reject that it's as flat as 33% power

    if has_evidential_value and not is_flat:
        conclusion = "evidential_value"
        confidence = "high" if right_p_full < 0.01 else "moderate"
    elif not has_evidential_value and is_flat:
        conclusion = "no_evidential_value"
        confidence = "high" if right_p_full > 0.1 else "moderate"
    else:
        conclusion = "inconclusive"
        confidence = "low"

    # Create distribution data for visualization
    bins = [0.01, 0.02, 0.03, 0.04, 0.05]
    observed_dist = [sum(1 for p in p_values if bins[i-1] if i > 0 else 0 < p <= bins[i]) / n
                     for i in range(len(bins))]
    expected_null = [0.2] * 5  # Uniform
    expected_33 = calculate_expected_distribution_33_power()

    return PCurveResult(
        n_studies=n,
        p_values=p_values,
        pp_values=pp_values,
        right_skew_z=right_z_full,
        right_skew_p=right_p_full,
        has_evidential_value=has_evidential_value,
        flat_z=flat_z,
        flat_p=flat_p,
        is_flat=is_flat,
        full_z=right_z_full,
        full_p=right_p_full,
        half_z=right_z_half,
        half_p=right_p_half,
        conclusion=conclusion,
        confidence=confidence,
        observed_distribution=observed_dist,
        expected_null=expected_null,
        expected_33_power=expected_33,
        warnings=warnings
    )


def interpret_pcurve(result: PCurveResult) -> str:
    """Generate human-readable interpretation of p-curve results."""

    interpretations = {
        'evidential_value': (
            f"The p-curve analysis indicates that the set of {result.n_studies} studies "
            f"contains evidential value (right-skew test: Z = {result.right_skew_z:.2f}, "
            f"p = {result.right_skew_p:.4f}). The distribution of p-values is significantly "
            f"right-skewed, suggesting that the findings are unlikely to be solely the result "
            f"of selective reporting or p-hacking."
        ),
        'no_evidential_value': (
            f"The p-curve analysis suggests that the set of {result.n_studies} studies "
            f"lacks evidential value (right-skew test: Z = {result.right_skew_z:.2f}, "
            f"p = {result.right_skew_p:.4f}). The distribution of p-values is consistent "
            f"with the null hypothesis or selective reporting. This does not prove the "
            f"effects are false, but suggests the evidence is weak."
        ),
        'inconclusive': (
            f"The p-curve analysis for these {result.n_studies} studies is inconclusive. "
            f"The evidence neither strongly supports nor refutes the presence of a true effect. "
            f"More studies may be needed for a definitive conclusion."
        )
    }

    return interpretations.get(result.conclusion, "Analysis could not be completed.")
```

---

# 4. VALIDATION REQUIREMENTS

## 4.1 Bayesian Module Validation

Compare against:
1. **JASP** - Primary reference for Bayes Factors
2. **R BayesFactor package** - `ttestBF()` function
3. **Published examples** - Rouder et al. (2009) examples

```python
# paper/JSS_SUBMISSION/replication/validate_bayesian.py

def test_one_sample_against_jasp():
    """
    Validate one-sample Bayesian t-test against JASP.

    Test case from JASP documentation:
    Data: [1.2, 2.3, 3.1, 2.8, 3.5, 2.9, 3.2, 2.7, 3.0, 2.5]
    Prior: Cauchy(0, 0.707)
    JASP BF10: 4.558
    """
    data = [1.2, 2.3, 3.1, 2.8, 3.5, 2.9, 3.2, 2.7, 3.0, 2.5]
    expected_bf10 = 4.558

    result = bayesian_one_sample_ttest(data, mu=0, prior_scale=0.707)

    assert abs(result.bf10 - expected_bf10) < 0.01, \
        f"BF10 mismatch: got {result.bf10}, expected {expected_bf10}"
```

## 4.2 P-Curve Validation

Compare against:
1. **P-curve app** (http://p-curve.com)
2. **Published examples** from Simonsohn et al.

```python
def test_pcurve_against_app():
    """
    Validate p-curve against official p-curve app.

    Test case from Simonsohn et al. (2014) Supplement:
    p-values: [0.001, 0.003, 0.012, 0.022, 0.035, 0.041, 0.044]
    Expected right-skew Z: 3.72
    """
    p_values = [0.001, 0.003, 0.012, 0.022, 0.035, 0.041, 0.044]
    expected_z = 3.72

    result = analyze_pcurve(p_values)

    assert abs(result.right_skew_z - expected_z) < 0.1, \
        f"Z mismatch: got {result.right_skew_z}, expected {expected_z}"
```

---

# 5. INTEGRATION POINTS

## 5.1 Guardian Integration

Bayesian tests should integrate with Guardian:
- Same assumption checks (normality, homogeneity)
- Report violations in Bayesian context
- Recommend robust Bayesian alternatives

## 5.2 Reproducibility Bundle Integration

All new features must generate reproducibility entries:
- Bayesian: Prior specification, BF values, posterior samples
- Pre-registration: Link to registered document
- P-curve: Input p-values, all calculated statistics

## 5.3 Code Export Integration

Generate R and Python code for:
- Bayesian: Using `BayesFactor` (R) or custom implementation (Python)
- P-curve: Using `p-curve` analysis code

---

*Document Version: 1.0*
*Created: December 26, 2025*
*Author: Claude Code Assistant*
