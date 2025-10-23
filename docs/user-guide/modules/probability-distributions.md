# Probability Distributions Module - User Guide

## Overview

The Probability Distributions module provides comprehensive tools for working with statistical distributions, including calculation of probability density functions (PDF), cumulative distribution functions (CDF), quantiles, and random sampling. This module is essential for statistical modeling, hypothesis testing, and data analysis.

## Supported Distributions

### 1. Normal (Gaussian) Distribution

The most common distribution in statistics, characterized by its bell-shaped curve.

**Parameters:**
- `mean (μ)`: Center of the distribution (-∞ to +∞)
- `standardDeviation (σ)`: Spread of the distribution (> 0)

**Use Cases:**
- Natural phenomena (heights, weights, IQ scores)
- Measurement errors
- Financial modeling
- Quality control

**Example:**
```javascript
// Human heights with mean 170cm and std dev 10cm
mean: 170
standardDeviation: 10

// Calculate probability of height between 160-180cm
P(160 < X < 180) = CDF(180) - CDF(160) = 0.683
```

### 2. Binomial Distribution

Models the number of successes in a fixed number of independent trials.

**Parameters:**
- `trials (n)`: Number of independent trials (≥ 1)
- `probability (p)`: Probability of success on each trial (0 to 1)

**Use Cases:**
- Quality inspection (defective/non-defective)
- Clinical trials (treatment success/failure)
- Survey responses (yes/no)
- Manufacturing yield

**Example:**
```javascript
// 20 coin flips, probability of exactly 12 heads
trials: 20
probability: 0.5
x: 12

P(X = 12) = C(20,12) × 0.5^12 × 0.5^8 = 0.120
```

### 3. Poisson Distribution

Models the number of events occurring in a fixed interval of time or space.

**Parameters:**
- `lambda (λ)`: Average rate of occurrence (> 0)

**Use Cases:**
- Call center arrivals
- Defects per unit area
- Accidents per time period
- Server requests

**Example:**
```javascript
// Average 3.5 customer arrivals per hour
lambda: 3.5

// Probability of exactly 5 arrivals
P(X = 5) = (e^-3.5 × 3.5^5) / 5! = 0.132
```

### 4. Exponential Distribution

Models the time between events in a Poisson process.

**Parameters:**
- `rate (λ)`: Rate parameter (> 0)

**Use Cases:**
- Time between failures
- Service times
- Radioactive decay
- Customer inter-arrival times

**Example:**
```javascript
// Average service time of 5 minutes (rate = 1/5 = 0.2)
rate: 0.2

// Probability service takes less than 3 minutes
P(X < 3) = 1 - e^(-0.2 × 3) = 0.451
```

### 5. Student's t-Distribution

Used when the population standard deviation is unknown and sample size is small.

**Parameters:**
- `degreesOfFreedom (df)`: Sample size minus 1 (≥ 1)

**Use Cases:**
- Small sample inference
- Confidence intervals for means
- Hypothesis testing
- Regression analysis

### 6. Chi-Square Distribution

Sum of squared standard normal variables.

**Parameters:**
- `degreesOfFreedom (df)`: Number of independent variables (≥ 1)

**Use Cases:**
- Goodness-of-fit tests
- Test of independence
- Variance estimation
- Contingency tables

### 7. F-Distribution

Ratio of two chi-square distributions.

**Parameters:**
- `df1`: Numerator degrees of freedom (≥ 1)
- `df2`: Denominator degrees of freedom (≥ 1)

**Use Cases:**
- ANOVA
- Comparing variances
- Regression analysis
- Model comparison

## Operations

### PDF (Probability Density Function)

Calculates the probability density at a specific point.

**Input Requirements:**
- Distribution parameters
- Value (x) at which to evaluate

**Output:**
- Probability density value
- Visualization of the PDF curve

**Interpretation:**
- For continuous distributions: Height of the curve at x
- For discrete distributions: Probability of exactly x

### CDF (Cumulative Distribution Function)

Calculates the probability that a random variable is less than or equal to a value.

**Input Requirements:**
- Distribution parameters
- Upper bound value (x)

**Output:**
- Cumulative probability P(X ≤ x)
- Visualization showing area under curve

**Interpretation:**
- Always between 0 and 1
- Increases monotonically
- Used for probability calculations

### Quantile (Inverse CDF)

Finds the value x such that P(X ≤ x) = p.

**Input Requirements:**
- Distribution parameters
- Probability p (between 0 and 1)

**Output:**
- Quantile value x
- Visualization marking the quantile

**Common Quantiles:**
- 0.25: First quartile (Q1)
- 0.50: Median (Q2)
- 0.75: Third quartile (Q3)
- 0.95: 95th percentile

### Random Sampling

Generates random samples from the distribution.

**Input Requirements:**
- Distribution parameters
- Sample size (n)
- Optional: Random seed for reproducibility

**Output:**
- Array of random samples
- Summary statistics
- Histogram of samples

**Applications:**
- Monte Carlo simulations
- Bootstrap methods
- Synthetic data generation
- Statistical modeling

## Step-by-Step Usage

### Basic Calculation Workflow

1. **Select Distribution Type**
   - Choose from dropdown menu
   - View parameter requirements

2. **Enter Parameters**
   - Input required parameters
   - System validates ranges automatically
   - Real-time feedback on invalid inputs

3. **Choose Operation**
   - PDF: For probability at a point
   - CDF: For cumulative probability
   - Quantile: For finding critical values
   - Random: For generating samples

4. **Configure Additional Options**
   - Set precision (decimal places)
   - Enable/disable visualization
   - Choose export format

5. **Execute Calculation**
   - Click "Calculate" button
   - View real-time progress
   - Automatic validation performed

6. **Review Results**
   - Numerical results displayed
   - Interactive visualizations
   - Statistical summary

7. **Export/Save**
   - Download results as PDF/Excel
   - Save to project
   - Share via link

### Advanced Features

#### Batch Calculations

Process multiple values simultaneously:

```javascript
// Calculate PDF for multiple x values
x_values: [1.0, 1.5, 2.0, 2.5, 3.0]
distribution: normal
parameters: {mean: 2, standardDeviation: 0.5}

// Results returned as array
results: [0.108, 0.484, 0.798, 0.484, 0.108]
```

#### Comparison Mode

Compare multiple distributions:

1. Enable "Comparison Mode"
2. Add distributions to compare
3. Overlay PDFs/CDFs
4. View side-by-side statistics

#### Parameter Estimation

Estimate distribution parameters from data:

1. Upload or paste dataset
2. Select candidate distributions
3. System performs:
   - Maximum likelihood estimation
   - Method of moments
   - Goodness-of-fit tests
4. Recommends best-fitting distribution

## Practical Examples

### Example 1: Quality Control

**Scenario:** Product weights should be 100g ± 2g. Current process has mean 100.5g, std dev 0.8g.

```javascript
// Setup
Distribution: Normal
Mean: 100.5
Std Dev: 0.8

// Calculate proportion within spec
P(98 < X < 102) = CDF(102) - CDF(98)
                = 0.969 - 0.001
                = 0.968 (96.8% within spec)

// Find control limits for 99.7% coverage
Lower limit = mean - 3×std = 100.5 - 2.4 = 98.1g
Upper limit = mean + 3×std = 100.5 + 2.4 = 102.9g
```

### Example 2: Reliability Analysis

**Scenario:** Component has exponential failure rate of 0.001 per hour.

```javascript
// Setup
Distribution: Exponential
Rate: 0.001

// Reliability at 500 hours
R(500) = P(X > 500) = e^(-0.001×500) = 0.606

// Mean time to failure
MTTF = 1/rate = 1000 hours

// 90% reliability time
t_90 = -ln(0.9)/0.001 = 105.4 hours
```

### Example 3: Sample Size Determination

**Scenario:** Estimate mean with 95% confidence, margin of error 2 units, assumed σ = 10.

```javascript
// Using normal distribution
Confidence: 0.95 → z = 1.96
Margin of error: E = 2
Std deviation: σ = 10

// Required sample size
n = (z × σ / E)² = (1.96 × 10 / 2)² = 96.04
Round up to n = 97
```

## Validation and Compliance

### Automatic Validation

All inputs undergo validation:
- **Range checks**: Parameters within valid bounds
- **Type checks**: Numeric values only
- **Logical checks**: Probabilities between 0 and 1
- **Overflow prevention**: Large value handling

### Audit Trail

Every calculation is logged:
```
Entry ID: DIST-2025-10-15-001
User: analyst@company.com
Timestamp: 2025-10-15T10:30:45Z
Distribution: Normal(μ=100, σ=10)
Operation: CDF(x=110)
Result: 0.8413
Validation: PASSED
Signature: a7b9c2d4e6f8...
```

### Compliance Features

- **21 CFR Part 11**: Electronic signatures
- **GxP**: Data integrity (ALCOA+)
- **ISO 9001**: Quality management
- **Reproducibility**: Seeded random generation

## Tips and Best Practices

### Distribution Selection

1. **Check data characteristics:**
   - Continuous vs. discrete
   - Bounded vs. unbounded
   - Symmetric vs. skewed

2. **Use diagnostic plots:**
   - Q-Q plots for normality
   - Histogram overlays
   - Probability plots

3. **Perform goodness-of-fit tests:**
   - Chi-square test
   - Kolmogorov-Smirnov test
   - Anderson-Darling test

### Accuracy Considerations

- **Numerical precision**: Use appropriate decimal places
- **Extreme values**: Check for underflow/overflow
- **Approximations**: Understand when used (e.g., normal approximation to binomial)
- **Convergence**: For iterative methods

### Common Pitfalls

1. **Using normal distribution inappropriately**
   - Check normality assumption
   - Consider transformations if needed

2. **Ignoring sample size requirements**
   - Small samples need t-distribution
   - Large samples allow normal approximation

3. **Misinterpreting probabilities**
   - PDF ≠ probability for continuous distributions
   - Use CDF for probability calculations

## Troubleshooting

### Issue: "Invalid parameters"
**Solution:** Check parameter constraints (e.g., σ > 0)

### Issue: "Calculation overflow"
**Solution:** Use log-scale calculations for extreme values

### Issue: "Convergence failed"
**Solution:** Adjust tolerance or use alternative method

### Issue: "Results differ from other software"
**Solution:** Check parameterization (some use 1/λ vs. λ)

## Integration with Other Modules

### Confidence Intervals
- Use t-distribution for small sample means
- Use normal distribution for large samples
- Use chi-square for variance intervals

### Design of Experiments
- Assume normal errors in ANOVA
- Check residual distributions
- Transform if necessary

### Statistical Quality Control
- Normal distribution for variables control charts
- Binomial for p-charts
- Poisson for c-charts

## API Usage

### REST API Example

```bash
curl -X POST https://api.stickforstats.com/v1/distributions/calculate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "distribution": "normal",
    "operation": "cdf",
    "parameters": {
      "mean": 100,
      "standardDeviation": 15
    },
    "x": 115
  }'
```

### JavaScript SDK

```javascript
import { StickForStats } from '@stickforstats/sdk';

const client = new StickForStats({ apiKey: 'YOUR_KEY' });

const result = await client.distributions.calculate({
  distribution: 'normal',
  operation: 'pdf',
  parameters: { mean: 0, standardDeviation: 1 },
  x: 1.96
});

console.log(`PDF value: ${result.value}`);
```

## Additional Resources

### Educational Content
- Interactive lessons in Education Hub
- Video tutorials on YouTube
- Webinar series (monthly)

### References
- [NIST Engineering Statistics Handbook](https://www.itl.nist.gov/div898/handbook/)
- [Probability Distributions Theory](internal-link)
- [Statistical Tables](internal-link)

### Support
- In-app help: Click `?` icon
- Email: support@stickforstats.com
- Forum: community.stickforstats.com

---

*Module Version: 1.0.0*
*Last Updated: October 2025*
*© 2025 StickForStats, Inc.*