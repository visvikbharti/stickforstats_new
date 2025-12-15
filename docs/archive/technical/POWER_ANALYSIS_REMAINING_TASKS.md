# Power Analysis Educational Module - Remaining Tasks Comprehensive Plan

**Document Created:** December 11, 2025
**Last Updated:** December 11, 2025 (Session 2)
**Purpose:** Comprehensive context for continuing Power Analysis implementation across sessions
**Module Location:** `/frontend/src/components/power-analysis/education/`

---

## Executive Summary

The Power Analysis Educational Module has **11 lessons completed** and integrated into the application. This document outlines the **4 remaining phases** with full technical specifications to enable seamless continuation in future sessions.

### Progress Update (Session 3 - December 11, 2025)

**Session 2 Completed:**
- TypeITypeIIAnimation.jsx (~650 lines) - Interactive α/β/power visualization
- PowerCurveSimulation.jsx (~500 lines) - Interactive power curves with Recharts
- EffectSizeExplorer.jsx (~550 lines) - Distribution overlap visualization

**Session 3 Completed:**
- SamplingDistributionDemo.jsx (~500 lines) - Live sampling animation, empirical vs theoretical power
- NonParametricPowerDemo.jsx (~450 lines) - ARE comparison (3/π ≈ 0.955), when-to-use guide
- BayesFactorSimulation.jsx (~550 lines) - Evidence accumulation animation, JZS prior
- Fixed ESLint error in BayesFactorSimulation.jsx (line 135 incomplete expression)
- Updated index.js to export all 6 simulations

**Intentionally Skipped:**
- SampleSizeCalculatorDemo.jsx - REDUNDANT (PowerCurveSimulation includes sample size requirements)

**Total Simulations:** 6/6 complete (100% - excluding redundant component)
**Build Status:** Compiles successfully with warnings only (unused imports - non-blocking)

**Session 3 Part 2 Completed:**
- DecisionMatrixVisualization.jsx (~350 lines) - Interactive 2x2 matrix with hover states
- NonCentralDistribution.jsx (~450 lines) - Central vs non-central t/F distributions
- PowerHeatmap.jsx (~400 lines) - 2D power heatmap with contour lines
- PriorPosteriorPlot.jsx (~450 lines) - Bayesian prior-posterior updating animation
- Updated index.js to export all 4 visualizations

**REMAINING TASK:**
1. Scientific accuracy review (cross-validate with G*Power)

---

## 1. COMPLETED WORK SUMMARY

### 1.1 Lessons Created (11/11 - 100%)

| Lesson | File | Lines | Key Topics |
|--------|------|-------|------------|
| 1 | `Lesson01_FundamentalProblem.jsx` | ~700 | Why power analysis matters, "How many mice?" |
| 2 | `Lesson02_HypothesisTesting.jsx` | ~1500 | Type I/II errors, Decision Matrix, interactive simulator |
| 3 | `Lesson03_StatisticalPower.jsx` | ~1300 | Power definition, 80% convention, cost-benefit |
| 4 | `Lesson04_FourPillars.jsx` | ~1400 | n, d, α, power relationships, interactive calculator |
| 5 | `Lesson05_EffectSize.jsx` | ~1500 | Cohen's d/f/r/w/h, conversions, Winner's curse |
| 6 | `Lesson06_Mathematics.jsx` | ~1200 | Non-central t/F distributions, NCP derivations |
| 7 | `Lesson07_DifferentDesigns.jsx` | ~1200 | t-tests, ANOVA, chi-square, non-parametric (ARE) |
| 8 | `Lesson08_Assumptions.jsx` | ~800 | Violations, design effects, clustering |
| 9 | `Lesson09_APrioriVsPostHoc.jsx` | ~700 | Post hoc fallacy, sensitivity analysis |
| 10 | `Lesson10_RealWorld.jsx` | ~500 | 8-step protocol, worked examples |
| 11 | `Lesson11_BayesianPower.jsx` | ~800 | Bayes Factors, assurance, BFDA |

**Total Lesson Code:** ~425 KB (~11,600 lines)

### 1.2 Integration Complete

- **index.js** - Exports all 11 lessons (simulations/visualizations commented for Phase 6-7)
- **PowerAnalysisEducationHub.jsx** - Hub with lesson navigation
- **LearningHub.jsx** - Power module card added with BoltIcon
- **App.jsx** - Route `/power-learn` configured
- **Build Status:** Dev server compiles successfully (warnings only)

### 1.3 Utility Files Created

```
/utils/
├── powerCalculations.js    (~830 lines) - Comprehensive power calculations
├── distributionFunctions.js (~400 lines) - Statistical distribution functions
├── bayesianCalculations.js  (~200 lines) - Bayes Factor calculations
└── index.js                 (~25 lines)  - Exports
```

**Key Functions in powerCalculations.js:**
- Effect sizes: `cohensD()`, `cohensF()`, `cohensF2()`, `cohensW()`, `cohensH()`, `hedgesG()`
- Conversions: `dToR()`, `rToD()`, `etaSquaredToF()`, `fToEtaSquared()`
- Parametric power: `powerTwoSampleTTest()`, `powerOneSampleTTest()`, `powerPairedTTest()`, `powerOneWayANOVA()`, `powerCorrelation()`, `powerChiSquare()`
- Non-parametric power: `powerMannWhitneyU()`, `powerWilcoxonSignedRank()`, `powerKruskalWallis()` (using ARE = 3/π)
- Sample size: `sampleSizeTwoSampleTTest()`, `sampleSizeOneWayANOVA()`, `sampleSizeCorrelation()`
- Utilities: `generatePowerCurve()`, `findSampleSizeForPower()`, `minimumDetectableEffectSize()`, `postHocPower()`

---

## 2. REMAINING TASK 1: Backend Non-Parametric Power Analysis

### 2.1 Current Backend State

**File:** `/backend/core/power_analysis.py`
**Status:** Comprehensive parametric power analysis exists, NO non-parametric

**Existing TestType Enum:**
```python
class TestType(Enum):
    # T-tests
    ONE_SAMPLE_T, TWO_SAMPLE_T, PAIRED_T
    # ANOVA
    ONE_WAY_ANOVA, FACTORIAL_ANOVA, REPEATED_MEASURES_ANOVA
    # Correlation
    PEARSON_CORRELATION, SPEARMAN_CORRELATION, PARTIAL_CORRELATION
    # Regression
    LINEAR_REGRESSION, MULTIPLE_REGRESSION, LOGISTIC_REGRESSION
    # Proportions
    ONE_PROPORTION, TWO_PROPORTIONS
    # Chi-square
    CHI_SQUARE_INDEPENDENCE, CHI_SQUARE_GOODNESS_OF_FIT
```

### 2.2 Implementation Required

**Add to TestType Enum:**
```python
# Non-parametric tests
MANN_WHITNEY_U = "mann_whitney_u"
WILCOXON_SIGNED_RANK = "wilcoxon_signed_rank"
KRUSKAL_WALLIS = "kruskal_wallis"
FRIEDMAN = "friedman"
```

**New Class to Create:**
```python
class NonParametricPowerAnalyzer:
    """
    Power analysis for non-parametric tests using Asymptotic Relative Efficiency (ARE).

    For normal data, non-parametric tests have ARE ≈ 3/π ≈ 0.955 compared to parametric.
    This means they require about 5% more samples for equivalent power.

    References:
    - Lehmann, E.L. (1975). Nonparametrics: Statistical Methods Based on Ranks.
    - Siegel, S. & Castellan, N.J. (1988). Nonparametric Statistics for the Behavioral Sciences.
    """

    ARE_NORMAL = 3 / np.pi  # ≈ 0.9549

    def mann_whitney_power(self, n1: int, n2: int, effect_size: float,
                           alpha: float = 0.05, alternative: str = 'two-sided') -> Dict:
        """
        Power for Mann-Whitney U test (Wilcoxon rank-sum test).

        Effect size can be:
        1. Cohen's d equivalent (standardized mean difference)
        2. Probability of superiority P(X > Y) where effect_size = P(X > Y) - 0.5

        Parameters:
        -----------
        n1, n2 : Sample sizes
        effect_size : Cohen's d or probability of superiority deviation from 0.5
        alpha : Significance level
        alternative : 'two-sided', 'greater', 'less'

        Returns:
        --------
        Dict with power, effective_n, are, ncp
        """
        # Apply ARE adjustment
        effective_n1 = n1 * self.ARE_NORMAL
        effective_n2 = n2 * self.ARE_NORMAL

        # Use t-test power formula with effective sample sizes
        # ... implementation using scipy.stats.nct

    def wilcoxon_signed_rank_power(self, n: int, effect_size: float,
                                    alpha: float = 0.05, alternative: str = 'two-sided') -> Dict:
        """
        Power for Wilcoxon signed-rank test.

        Parameters:
        -----------
        n : Number of pairs
        effect_size : Standardized mean difference of paired differences

        Returns:
        --------
        Dict with power, effective_n, are
        """
        effective_n = n * self.ARE_NORMAL
        # Use paired t-test power with effective n

    def kruskal_wallis_power(self, n_per_group: int, k_groups: int,
                              effect_size: float, alpha: float = 0.05) -> Dict:
        """
        Power for Kruskal-Wallis H test.

        Parameters:
        -----------
        n_per_group : Sample size per group
        k_groups : Number of groups
        effect_size : Cohen's f equivalent

        Returns:
        --------
        Dict with power, effective_n, are, df
        """
        effective_n = n_per_group * self.ARE_NORMAL
        # Use ANOVA power with effective n

    def friedman_power(self, n: int, k_treatments: int,
                       effect_size: float, alpha: float = 0.05) -> Dict:
        """
        Power for Friedman test (non-parametric repeated measures).

        Parameters:
        -----------
        n : Number of subjects/blocks
        k_treatments : Number of treatments/conditions
        effect_size : Cohen's f equivalent for repeated measures

        Returns:
        --------
        Dict with power, effective_n, are
        """
        # Friedman has ARE ≈ 0.91 for k=2, approaches 0.955 for large k
        are = min(self.ARE_NORMAL, 2 * (k_treatments + 1) / (3 * k_treatments * np.pi))
        # ... implementation
```

### 2.3 API Endpoints to Add

**File:** `/backend/api/views.py` or appropriate router

```python
# Non-parametric power endpoints
@router.post("/power/mann-whitney/")
async def mann_whitney_power(request: MannWhitneyPowerRequest):
    """Calculate power for Mann-Whitney U test"""

@router.post("/power/wilcoxon/")
async def wilcoxon_power(request: WilcoxonPowerRequest):
    """Calculate power for Wilcoxon signed-rank test"""

@router.post("/power/kruskal-wallis/")
async def kruskal_wallis_power(request: KruskalWallisRequest):
    """Calculate power for Kruskal-Wallis H test"""

@router.post("/power/friedman/")
async def friedman_power(request: FriedmanPowerRequest):
    """Calculate power for Friedman test"""

# Sample size endpoints
@router.post("/power/sample-size/mann-whitney/")
@router.post("/power/sample-size/wilcoxon/")
@router.post("/power/sample-size/kruskal-wallis/")
```

### 2.4 High-Precision Module Update

**File:** `/backend/core/hp_power_analysis_comprehensive.py`

Add high-precision (50-decimal) versions using `mpmath` library for:
- Mann-Whitney U power
- Wilcoxon signed-rank power
- Kruskal-Wallis power
- Friedman power

---

## 3. COMPLETED: Interactive Simulations (6 Components)

### 3.1 Directory Structure (ALL COMPLETE)

```
/simulations/
├── TypeITypeIIAnimation.jsx       (~650 lines) ✅ COMPLETE
├── PowerCurveSimulation.jsx       (~500 lines) ✅ COMPLETE
├── EffectSizeExplorer.jsx         (~550 lines) ✅ COMPLETE
├── SamplingDistributionDemo.jsx   (~500 lines) ✅ COMPLETE
├── NonParametricPowerDemo.jsx     (~450 lines) ✅ COMPLETE
└── BayesFactorSimulation.jsx      (~550 lines) ✅ COMPLETE
NOTE: SampleSizeCalculatorDemo.jsx intentionally skipped (redundant)
```

### 3.2 Simulation Specifications

#### 3.2.1 PowerCurveSimulation.jsx

**Purpose:** Interactive power curves showing relationship between sample size and power

**Features:**
- Multiple power curves for different effect sizes (d = 0.2, 0.5, 0.8)
- Interactive sliders: α (0.01-0.10), effect size (0.1-1.5), sample size range
- 80% power reference line (dashed)
- Tooltip showing exact values on hover
- Export to PNG/SVG
- Test type selector (t-test, ANOVA, correlation, non-parametric)

**Technology:** Recharts (LineChart, ReferenceLine, Tooltip)

**Data Generation:**
```javascript
import { generatePowerCurve } from '../utils/powerCalculations';

// Generate curves for multiple effect sizes
const sampleSizes = Array.from({ length: 100 }, (_, i) => i + 5);
const effectSizes = [0.2, 0.5, 0.8];
const data = generatePowerCurve('t-test', sampleSizes, effectSizes, alpha);
```

#### 3.2.2 TypeITypeIIAnimation.jsx

**Purpose:** Animate Type I and Type II error regions with draggable critical value

**Features:**
- Two overlapping normal distributions (H₀ centered at 0, H₁ shifted by effect size)
- Draggable critical value line
- Shaded regions:
  - α (red) - Type I error
  - β (orange) - Type II error
  - Power (green) - 1 - β
- Real-time labels updating as critical value moves
- Effect size slider
- Play/pause animation showing sampling under H₀ and H₁

**Technology:** D3.js on Canvas (following `CoverageAnimation.jsx` pattern)

**Key D3 Elements:**
```javascript
// Two distributions
const h0Distribution = d3.range(-4, 4, 0.01).map(x => ({
  x,
  y: normalPDF(x)
}));

const h1Distribution = d3.range(-4, 4, 0.01).map(x => ({
  x,
  y: normalPDF(x - effectSize * Math.sqrt(n))
}));

// Shaded areas using d3.area()
const alphaArea = d3.area()
  .x(d => xScale(d.x))
  .y0(height)
  .y1(d => yScale(d.y))
  .defined(d => d.x > criticalValue);
```

#### 3.2.3 SamplingDistributionDemo.jsx

**Purpose:** Demonstrate sampling distributions under H₀ and H₁

**Features:**
- Generate samples from population
- Show test statistic histogram
- Overlay theoretical distribution
- Animate decision process (reject/fail to reject)
- Running tally of correct decisions
- Power estimate converges to theoretical

**Technology:** Canvas + requestAnimationFrame for smooth animation

**Algorithm:**
```javascript
function runSimulation() {
  for (let i = 0; i < numSamples; i++) {
    // Generate sample under H₁ (effect exists)
    const sample = generateNormalSample(n, effectSize, 1);
    const testStat = calculateTStatistic(sample);

    // Check if rejected
    const rejected = Math.abs(testStat) > criticalValue;
    if (rejected) correctRejections++;

    // Empirical power = correctRejections / totalSamples
    empiricalPower = correctRejections / (i + 1);
  }
}
```

#### 3.2.4 EffectSizeExplorer.jsx

**Purpose:** Visual comparison of effect sizes and distribution overlap

**Features:**
- Two overlapping distributions with adjustable separation (Cohen's d)
- Visual benchmarks (small/medium/large zones)
- Overlap percentage calculation and display
- Effect size converter (d ↔ r ↔ f ↔ η²)
- Real-world examples for each benchmark
- Sample size requirements table

**Technology:** Canvas for distributions, Material-UI for controls

**Overlap Calculation:**
```javascript
// Overlap coefficient for two normal distributions
function calculateOverlap(d) {
  // Cohen's U3: proportion of H₁ above H₀ median
  const u3 = normalCDF(d);

  // Overlap coefficient
  const overlap = 2 * normalCDF(-Math.abs(d) / 2);

  return { u3, overlap, percentNonOverlap: (1 - overlap) * 100 };
}
```

#### 3.2.5 SampleSizeCalculatorDemo.jsx

**Purpose:** Interactive sample size determination with "what-if" analysis

**Features:**
- Input: effect size, α, desired power
- Output: required n with justification
- Sensitivity table showing n for different power levels
- Cost-benefit analysis (research budget slider)
- Comparison across test types
- Export results to CSV

**Technology:** Recharts (BarChart), Material-UI (DataGrid)

#### 3.2.6 NonParametricPowerDemo.jsx

**Purpose:** Compare parametric vs non-parametric test power

**Features:**
- Side-by-side power curves (t-test vs Mann-Whitney)
- ARE visualization (3/π ≈ 0.955)
- Sample size inflation calculator
- When to use non-parametric (normality violation scenarios)
- Robustness demonstration with non-normal data

**Technology:** Recharts (dual-axis chart), Canvas for distributions

**Key Comparison:**
```javascript
// Show power difference
const tTestPower = powerTwoSampleTTest(n, n, d, alpha);
const mwPower = powerMannWhitneyU(n, n, d, alpha);

// Sample size needed for equivalent power
const nEquivalent = Math.ceil(n / ARE_NORMAL); // ~5% more
```

#### 3.2.7 BayesFactorSimulation.jsx

**Purpose:** Demonstrate Bayesian evidence accumulation

**Features:**
- Prior distribution specification (slider for width)
- Likelihood visualization
- Posterior updating animation
- Bayes Factor calculation and interpretation
- Evidence categories (anecdotal, moderate, strong, decisive)
- Comparison with p-value approach

**Technology:** D3.js for prior/posterior animation

**Bayes Factor Calculation:**
```javascript
// Simplified JZS Bayes Factor approximation
function calculateBF10(t, n, r = 0.707) {
  const v = n - 1;
  const g = r * r;

  // BF10 ≈ (1 + t²/(v·g))^(-(v+1)/2) × √(1 + g)
  const bf10 = Math.pow(1 + (t * t) / (v * g), -(v + 1) / 2) * Math.sqrt(1 + g);

  return 1 / bf10; // Return BF10 (evidence for H1)
}
```

### 3.3 Common Simulation Patterns

All simulations should follow these patterns from existing CI module:

```javascript
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box, Paper, Typography, Slider, Button, Grid,
  FormControl, InputLabel, Select, MenuItem, Alert
} from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const SimulationComponent = () => {
  // State for parameters
  const [parameter, setParameter] = useState(defaultValue);

  // Canvas ref for D3/Canvas rendering
  const canvasRef = useRef(null);
  const animationRef = useRef(null);

  // Memoized calculations
  const calculatedValue = useMemo(() => {
    return expensiveCalculation(parameter);
  }, [parameter]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const animate = () => {
      // Clear and redraw
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawVisualization(ctx, calculatedValue);
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [calculatedValue]);

  return (
    <Paper sx={{ p: 3 }}>
      <Typography variant="h5">Simulation Title</Typography>

      {/* Parameter Controls */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Typography>Parameter: {parameter}</Typography>
          <Slider
            value={parameter}
            onChange={(e, v) => setParameter(v)}
            min={minValue}
            max={maxValue}
            step={0.01}
          />
        </Grid>
      </Grid>

      {/* Visualization */}
      <Box sx={{ mt: 2 }}>
        <canvas ref={canvasRef} width={800} height={400} />
      </Box>

      {/* Results */}
      <Alert severity="info">
        Calculated result: {calculatedValue.toFixed(4)}
      </Alert>
    </Paper>
  );
};
```

---

## 4. COMPLETED: Visualizations (4 Components)

### 4.1 Directory Structure (ALL COMPLETE)

```
/visualizations/
├── DecisionMatrixVisualization.jsx  (~350 lines) ✅ COMPLETE
├── NonCentralDistribution.jsx       (~450 lines) ✅ COMPLETE
├── PowerHeatmap.jsx                 (~400 lines) ✅ COMPLETE
└── PriorPosteriorPlot.jsx           (~450 lines) ✅ COMPLETE
```

### 4.2 Visualization Specifications

#### 4.2.1 DecisionMatrixVisualization.jsx

**Purpose:** Animated 2x2 decision matrix showing all outcomes

**Features:**
- Four cells: True Positive, True Negative, False Positive (α), False Negative (β)
- Hover to highlight each outcome
- Animation showing sample falling into each category
- Adjustable α and β with real-time matrix update
- Real-world scenario examples for each cell

**Layout:**
```
                    Reality
                H₀ True    H₁ True
             ┌──────────┬──────────┐
    Reject   │  Type I  │  Power   │
    H₀       │   (α)    │  (1-β)   │
Decision     ├──────────┼──────────┤
    Fail to  │ Correct  │ Type II  │
    Reject   │ (1-α)    │   (β)    │
             └──────────┴──────────┘
```

#### 4.2.2 NonCentralDistribution.jsx

**Purpose:** Compare central vs non-central distributions

**Features:**
- Central t/F distribution (under H₀)
- Non-central t/F distribution (under H₁)
- Adjustable noncentrality parameter (λ)
- Show critical value and power region
- Mathematical formula display
- Link between NCP and power

**Key Visualization:**
```javascript
// Non-central t PDF
function nonCentralTPDF(t, df, ncp) {
  // Numerical approximation using series expansion
  // ... (complex formula)
}

// Draw both distributions
ctx.beginPath();
ctx.strokeStyle = '#1976d2'; // Central (blue)
for (let t = -5; t <= 5; t += 0.1) {
  const y = tPDF(t, df);
  ctx.lineTo(xScale(t), yScale(y));
}
ctx.stroke();

ctx.beginPath();
ctx.strokeStyle = '#d32f2f'; // Non-central (red)
for (let t = -5; t <= 5; t += 0.1) {
  const y = nonCentralTPDF(t, df, ncp);
  ctx.lineTo(xScale(t), yScale(y));
}
ctx.stroke();
```

#### 4.2.3 PowerHeatmap.jsx

**Purpose:** 2D heatmap showing power as function of n and effect size

**Features:**
- X-axis: Sample size (10-200)
- Y-axis: Effect size (0.1-1.2)
- Color: Power (0-1, red-yellow-green gradient)
- Contour lines at power = 0.70, 0.80, 0.90
- Click to get exact values
- Multiple test types

**Technology:** D3.js (d3.contour) or Recharts (custom cells)

**Color Scale:**
```javascript
const powerColorScale = d3.scaleSequential(d3.interpolateRdYlGn)
  .domain([0, 1]);

// Or custom
function getPowerColor(power) {
  if (power < 0.5) return `rgb(${255}, ${Math.round(power * 2 * 255)}, 0)`;
  return `rgb(${Math.round((1 - power) * 2 * 255)}, 255, 0)`;
}
```

#### 4.2.4 PriorPosteriorPlot.jsx

**Purpose:** Bayesian prior and posterior distribution visualization

**Features:**
- Prior distribution (adjustable: Cauchy, normal, uniform)
- Likelihood from data
- Posterior distribution (prior × likelihood / evidence)
- Animation of posterior updating with more data
- Credible interval display
- Prior sensitivity analysis

**Technology:** D3.js with smooth animation

---

## 5. REMAINING TASK 4: Scientific Accuracy Review

### 5.1 Validation Checklist

| Item | Verification Method | Status |
|------|---------------------|--------|
| Cohen's d benchmarks (0.2/0.5/0.8) | Cross-check with Cohen (1988) | Pending |
| Cohen's f benchmarks (0.1/0.25/0.4) | Cross-check with Cohen (1988) | Pending |
| Cohen's w benchmarks (0.1/0.3/0.5) | Cross-check with Cohen (1988) | Pending |
| Effect size conversions | Verify d↔r, η²↔f formulas | Pending |
| NCP for t-test: λ = d√(n/2) | Verify with G*Power | Pending |
| NCP for ANOVA: λ = nkf² | Verify with G*Power | Pending |
| Sample size formula | Compare n values with G*Power | Pending |
| Non-parametric ARE = 3/π | Cross-check with Lehmann (1975) | Pending |
| Post hoc power warning | Ensure prominent display | Pending |
| Bayesian BF formulas | Verify JZS approximation | Pending |

### 5.2 G*Power Cross-Validation

**Test Cases to Run in G*Power 3.1.9.7:**

```
1. Two-sample t-test
   - d = 0.5, α = 0.05, n1 = n2 = 30
   - Expected power: ~0.478

2. One-way ANOVA (3 groups)
   - f = 0.25, α = 0.05, n = 20/group
   - Expected power: ~0.545

3. Correlation
   - r = 0.3, α = 0.05, n = 50
   - Expected power: ~0.572

4. Chi-square (2x3 table)
   - w = 0.3, α = 0.05, n = 100, df = 2
   - Expected power: ~0.851
```

### 5.3 Reference Materials

**Primary Sources:**
1. Cohen, J. (1988). Statistical power analysis for the behavioral sciences (2nd ed.)
2. Faul, F., Erdfelder, E., Lang, A.-G., & Buchner, A. (2007). G*Power 3
3. Lehmann, E.L. (1975). Nonparametrics: Statistical Methods Based on Ranks

**Bayesian Sources:**
1. Rouder, J.N., et al. (2009). Bayesian t tests
2. Schönbrodt, F.D., & Wagenmakers, E.-J. (2018). Bayes factor design analysis

---

## 6. IMPLEMENTATION PRIORITY ORDER

### Phase 1: Quick Wins (Can be done immediately)
1. Clean up ESLint warnings in lesson files (unused imports)
2. Create placeholder simulation files with basic structure
3. Test all lessons in browser to verify they render correctly

### Phase 2: Backend Non-Parametric (~4-6 hours)
1. Add `NonParametricPowerAnalyzer` class
2. Implement 4 non-parametric power functions
3. Add API endpoints
4. Write unit tests
5. Update HP module

### Phase 3: Interactive Simulations (~12-16 hours)
1. TypeITypeIIAnimation.jsx (most educational value, do first)
2. PowerCurveSimulation.jsx (direct complement to lessons)
3. EffectSizeExplorer.jsx (already partially in Lesson 5)
4. SamplingDistributionDemo.jsx
5. NonParametricPowerDemo.jsx (after backend)
6. SampleSizeCalculatorDemo.jsx
7. BayesFactorSimulation.jsx (requires Lesson 11)

### Phase 4: Visualizations (~6-8 hours)
1. DecisionMatrixVisualization.jsx (for Lesson 2)
2. NonCentralDistribution.jsx (for Lesson 6)
3. PowerHeatmap.jsx (standalone tool)
4. PriorPosteriorPlot.jsx (for Lesson 11)

### Phase 5: Scientific Accuracy (~2-3 hours)
1. Run all G*Power test cases
2. Compare with frontend calculations
3. Document any discrepancies
4. Add validation tests

---

## 7. FILE QUICK REFERENCE

### Frontend Paths
```
/frontend/src/components/power-analysis/education/
├── PowerAnalysisEducationHub.jsx    # Main hub
├── index.js                         # Exports
├── lessons/
│   ├── Lesson01_FundamentalProblem.jsx
│   ├── Lesson02_HypothesisTesting.jsx
│   ├── Lesson03_StatisticalPower.jsx
│   ├── Lesson04_FourPillars.jsx
│   ├── Lesson05_EffectSize.jsx
│   ├── Lesson06_Mathematics.jsx
│   ├── Lesson07_DifferentDesigns.jsx
│   ├── Lesson08_Assumptions.jsx
│   ├── Lesson09_APrioriVsPostHoc.jsx
│   ├── Lesson10_RealWorld.jsx
│   └── Lesson11_BayesianPower.jsx
├── simulations/                     # TO BE CREATED
├── visualizations/                  # TO BE CREATED
└── utils/
    ├── powerCalculations.js
    ├── distributionFunctions.js
    ├── bayesianCalculations.js
    └── index.js
```

### Backend Paths
```
/backend/core/
├── power_analysis.py                # Main power analysis module
└── hp_power_analysis_comprehensive.py  # High-precision version
```

### Integration Paths
```
/frontend/src/
├── App.jsx                          # Route: /power-learn
└── components/education/
    └── LearningHub.jsx              # Power module card
```

---

## 8. KNOWN ISSUES

### 8.1 Production Build Failure
**Issue:** `npm run build` fails with React Three Fiber error
**Cause:** Pre-existing React 18 vs React 19 conflict with @react-three/fiber
**Status:** NOT related to Power Analysis module
**Workaround:** Dev server works fine (`npm start`)

### 8.2 ESLint Warnings
**Issue:** Many "unused import" warnings in lesson files
**Cause:** Imports prepared for future features (accordions, sliders, etc.)
**Status:** Non-blocking, cosmetic only
**Fix:** Remove or use the imports when implementing full interactivity

---

## 9. SESSION CONTINUATION CHECKLIST

When starting a new session, use this checklist:

- [ ] Read this document for full context
- [ ] Check current todo list status
- [ ] Verify dev server still compiles (`npm start`)
- [ ] Review which task to continue:
  1. Backend non-parametric power
  2. Simulations (which one?)
  3. Visualizations (which one?)
  4. Scientific accuracy review
- [ ] Check if any new requirements from user

---

**Document Version:** 2.0
**Last Updated:** December 11, 2025 (Session 3 - Part 2)
**Author:** Claude (Opus 4.5)

---

## COMPLETION STATUS SUMMARY

| Component Type | Status | Count | Lines (approx) |
|---------------|--------|-------|----------------|
| Lessons | ✅ COMPLETE | 11/11 | ~11,600 |
| Simulations | ✅ COMPLETE | 6/6 | ~3,200 |
| Visualizations | ✅ COMPLETE | 4/4 | ~1,650 |
| Utils | ✅ COMPLETE | 4/4 | ~1,455 |
| **TOTAL FRONTEND** | **✅ COMPLETE** | **25 files** | **~17,905** |

**Backend Non-Parametric:** Not started (frontend utils have full client-side implementation)
**Scientific Accuracy Review:** Pending (recommend cross-validation with G*Power 3.1.9.7)
