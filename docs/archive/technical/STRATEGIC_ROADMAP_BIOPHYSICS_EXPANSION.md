# StickForStats Strategic Roadmap: Biophysics & Biochemistry Expansion

## Date: December 12, 2025
## Vision: World's Most Comprehensive Statistical & Biophysical Analysis Platform

---

## Executive Summary

StickForStats is evolving from a general statistics platform into a **domain-specific powerhouse** for life sciences research. This roadmap outlines the integration of biophysics/biochemistry analysis tools alongside the existing statistical framework.

---

## Current Platform Status (December 2025)

### Completed Systems

| System | Modules | Lines of Code |
|--------|---------|---------------|
| Learning Hub | 5 educational hubs, 43+ lessons | ~70,000+ |
| Statistical Analysis Platform | 9 modules | ~25,000+ |
| AI Advisor | Claude-powered guidance | ~5,000+ |
| Guardian | Statistical assumption protection | ~3,000+ |
| **Total** | | **~100,000+ lines** |

### What We Have
- General statistics (t-tests, ANOVA, regression, etc.)
- Power analysis (G*Power validated)
- Study design wizard
- Data preprocessing & visualization
- Machine learning basics
- R/Python code export

### What's Missing (The Opportunity)
- **Domain-specific analysis for life sciences**
- Biophysics curve fitting
- Binding affinity calculations
- Spectroscopy analysis
- Enzyme kinetics

---

## The Biophysics/Biochemistry Expansion

### Why This Matters

**Target Users:**
- Biochemistry researchers
- Drug discovery scientists
- Structural biologists
- Biophysicists
- Pharmaceutical industry QC
- Graduate students in life sciences

**Market Gap:**
- GraphPad Prism: Expensive ($$$), closed source
- Origin: Expensive, steep learning curve
- Python/R: Requires programming knowledge
- **StickForStats: FREE, web-based, no coding required, educational**

---

## Module 10: Biophysics Analysis Suite (NEW)

### 10.1 Michaelis-Menten Kinetics

**The Science:**
```
v = (Vmax × [S]) / (Km + [S])

Where:
- v = reaction velocity
- Vmax = maximum velocity
- [S] = substrate concentration
- Km = Michaelis constant (substrate concentration at half Vmax)
```

**Features to Implement:**

#### A. Non-Linear Regression Fitting
```javascript
// Core equation
const michaelismentenEquation = (S, Vmax, Km) => {
  return (Vmax * S) / (Km + S);
};

// Levenberg-Marquardt algorithm for fitting
// Initial parameter estimation from data
// R² and goodness-of-fit statistics
// 95% confidence intervals for Vmax and Km
```

#### B. Linear Transformations (Historical/Pedagogical)

| Plot Type | X-axis | Y-axis | Slope | Intercept |
|-----------|--------|--------|-------|-----------|
| Lineweaver-Burk | 1/[S] | 1/v | Km/Vmax | 1/Vmax |
| Eadie-Hofstee | v/[S] | v | -Km | Vmax |
| Hanes-Woolf | [S] | [S]/v | 1/Vmax | Km/Vmax |

**Why Include Linear Plots:**
- Educational value (show historical methods)
- Quick visual assessment
- BUT warn users: non-linear regression is statistically superior

#### C. Enzyme Inhibition Analysis

| Inhibition Type | Effect on Vmax | Effect on Km | Equation |
|-----------------|----------------|--------------|----------|
| Competitive | Unchanged | Increased (Km,app) | v = Vmax[S] / (Km(1+[I]/Ki) + [S]) |
| Non-competitive | Decreased (Vmax,app) | Unchanged | v = Vmax[S] / ((1+[I]/Ki)(Km + [S])) |
| Uncompetitive | Decreased | Decreased | v = Vmax[S] / (Km + [S](1+[I]/Ki)) |
| Mixed | Decreased | Changed | v = Vmax[S] / (Km(1+[I]/Ki) + [S](1+[I]/Ki')) |

#### D. Hill Equation (Cooperativity)
```
v = Vmax × [S]^n / (K0.5^n + [S]^n)

Where:
- n = Hill coefficient
- n > 1: positive cooperativity
- n < 1: negative cooperativity
- n = 1: no cooperativity (reduces to Michaelis-Menten)
```

---

### 10.2 Binding Affinity Analysis

**Core Equations:**

#### A. Simple Binding (One Site)
```
Y = Bmax × [L] / (Kd + [L])

Where:
- Y = fraction bound
- Bmax = maximum binding
- [L] = ligand concentration
- Kd = dissociation constant
```

#### B. Scatchard Analysis
```
Bound/Free = (Bmax - Bound) / Kd

Plot: Bound/Free vs Bound
Slope = -1/Kd
X-intercept = Bmax
```

**Note:** Include warning that Scatchard is deprecated for parameter estimation (use non-linear regression), but useful for visualization.

#### C. Dose-Response Curves (IC50/EC50)
```
Y = Bottom + (Top - Bottom) / (1 + 10^((LogIC50 - X) × HillSlope))

4-Parameter Logistic (4PL) Model
```

**Features:**
- Automatic IC50/EC50 calculation
- Variable vs fixed slope options
- Confidence intervals
- Comparison of multiple curves (F-test)

#### D. Competition Binding
```
Ki = IC50 / (1 + [L]/Kd)

Cheng-Prusoff equation for converting IC50 to Ki
```

---

### 10.3 Circular Dichroism (CD) Analysis

**Applications:**
- Secondary structure estimation
- Protein folding/unfolding
- Ligand binding effects
- Thermal stability

#### A. Secondary Structure Estimation
```
Methods to implement:
- SELCON3
- CONTIN
- CDSSTR
- K2D3 (neural network based)

Reference spectra databases:
- SP175 (175-260 nm)
- Reference Set 4 (190-240 nm)
```

#### B. Thermal Denaturation
```
Two-state model:
Y = (YN + YD × exp(-ΔG/RT)) / (1 + exp(-ΔG/RT))

Where:
ΔG = ΔH × (1 - T/Tm) - ΔCp × ((Tm - T) + T × ln(T/Tm))

Simplified (no ΔCp):
ΔG = ΔH × (1 - T/Tm)
```

**Output:**
- Tm (melting temperature)
- ΔH (enthalpy of unfolding)
- ΔG at any temperature
- Fraction folded vs temperature plot

#### C. Chemical Denaturation
```
ΔG = ΔG(H2O) - m × [denaturant]

Linear extrapolation method (LEM)
m-value indicates cooperativity
```

---

### 10.4 Additional Biophysical Techniques

#### A. Isothermal Titration Calorimetry (ITC)
```
One-site binding model:
Q = n × M × V × ΔH × θ

Where:
- Q = heat evolved
- n = stoichiometry
- M = macromolecule concentration
- V = cell volume
- ΔH = binding enthalpy
- θ = fraction of sites occupied

Output: Kd, ΔH, ΔS, ΔG, n
```

#### B. Surface Plasmon Resonance (SPR)
```
Association: R = Req × (1 - exp(-kobs × t))
Dissociation: R = R0 × exp(-kd × t)

kobs = ka × [A] + kd
KD = kd / ka
```

#### C. Fluorescence Anisotropy
```
r = (I_parallel - I_perpendicular) / (I_parallel + 2 × I_perpendicular)

Binding analysis from anisotropy changes
```

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)
**Priority: Michaelis-Menten + Basic Binding**

```
/src/components/statistical-analysis/biophysics/
├── BiophysicsHub.jsx                    # Main hub (Module 10)
├── index.js
├── enzyme-kinetics/
│   ├── MichaelisMentenFitter.jsx       # Core MM fitting
│   ├── LinearTransformations.jsx        # LB, EH, HW plots
│   ├── EnzymeInhibition.jsx            # Ki determination
│   ├── HillEquation.jsx                # Cooperativity
│   └── utils/
│       └── enzymeKineticsCalculations.js
├── binding-affinity/
│   ├── BindingCurveFitter.jsx          # Kd determination
│   ├── ScatchardAnalysis.jsx           # Visual analysis
│   ├── DoseResponse.jsx                # IC50/EC50
│   └── utils/
│       └── bindingCalculations.js
└── shared/
    ├── NonLinearRegression.js          # Core fitting algorithms
    └── BiophysicsDataImport.jsx        # CSV/Excel import
```

**Deliverables:**
- [ ] Michaelis-Menten non-linear fitting
- [ ] All 3 linear transformation plots
- [ ] Hill equation fitting
- [ ] Basic binding curve analysis
- [ ] IC50/EC50 calculator
- [ ] Data import from CSV/Excel

### Phase 2: Advanced Analysis (Weeks 3-4)
**Priority: Inhibition + CD + Code Export**

**Deliverables:**
- [ ] Enzyme inhibition analysis (4 types)
- [ ] Ki calculator (Cheng-Prusoff)
- [ ] CD secondary structure estimation
- [ ] Thermal denaturation fitting
- [ ] R code export for biophysics
- [ ] Python code export (scipy.optimize)

### Phase 3: Education Integration (Weeks 5-6)
**Priority: Learning Hub for Biophysics**

```
/src/components/biophysics-education/
├── BiophysicsLearningHub.jsx            # Route: /biophysics-learn
└── lessons/
    ├── Lesson1_EnzymeKineticsIntro.jsx  # What is enzyme kinetics?
    ├── Lesson2_MichaelisMenten.jsx      # MM equation derivation
    ├── Lesson3_LinearPlots.jsx          # History & limitations
    ├── Lesson4_Inhibition.jsx           # Types of inhibition
    ├── Lesson5_Cooperativity.jsx        # Hill equation
    ├── Lesson6_BindingBasics.jsx        # Kd, Ka, binding curves
    ├── Lesson7_DoseResponse.jsx         # IC50, EC50, Hill slope
    ├── Lesson8_CDSpectroscopy.jsx       # CD principles
    └── Lesson9_ThermalStability.jsx     # Protein folding
```

### Phase 4: Advanced Techniques (Weeks 7-8)
**Priority: ITC, SPR, Integration**

**Deliverables:**
- [ ] ITC analysis module
- [ ] SPR kinetics analysis
- [ ] Fluorescence anisotropy
- [ ] Global fitting (multiple datasets)
- [ ] Report generation (publication-ready figures)

---

## Technical Architecture

### Non-Linear Regression Engine

```javascript
// /src/utils/nonLinearRegression.js

/**
 * Levenberg-Marquardt Algorithm
 * For fitting arbitrary models to data
 */
export class NonLinearFitter {
  constructor(model, data, initialParams) {
    this.model = model;
    this.data = data;
    this.params = initialParams;
  }

  fit(options = {}) {
    const {
      maxIterations = 1000,
      tolerance = 1e-8,
      lambda = 0.001
    } = options;

    // Implementation using numeric differentiation
    // Returns: { params, standardErrors, R2, AIC, BIC }
  }

  confidenceIntervals(alpha = 0.05) {
    // Calculate 95% CI for each parameter
  }

  predict(x) {
    // Generate predicted values
  }
}

// Pre-built models
export const MODELS = {
  michaelismenten: (x, params) => (params.Vmax * x) / (params.Km + x),
  hill: (x, params) => (params.Vmax * Math.pow(x, params.n)) / (Math.pow(params.K05, params.n) + Math.pow(x, params.n)),
  onesite_binding: (x, params) => (params.Bmax * x) / (params.Kd + x),
  fourPL: (x, params) => params.Bottom + (params.Top - params.Bottom) / (1 + Math.pow(10, (params.LogIC50 - Math.log10(x)) * params.Hill)),
  // ... more models
};
```

### Data Validation for Biophysics

```javascript
// /src/utils/biophysicsValidation.js

export function validateEnzymeKineticsData(data) {
  const warnings = [];
  const errors = [];

  // Check for negative values
  if (data.substrate.some(v => v < 0)) {
    errors.push('Substrate concentrations cannot be negative');
  }

  // Check for sufficient data points
  if (data.substrate.length < 5) {
    warnings.push('Recommend at least 5 data points for reliable fitting');
  }

  // Check for good spread of concentrations
  const ratio = Math.max(...data.substrate) / Math.min(...data.substrate.filter(v => v > 0));
  if (ratio < 10) {
    warnings.push('Recommend substrate concentrations spanning at least 10-fold range');
  }

  // Check for points near Km
  // ... more validation

  return { valid: errors.length === 0, errors, warnings };
}
```

---

## Updated Complete Roadmap

### Immediate (Quick Wins) - Week 1
1. ~~Fix React version compatibility build error~~ (investigate)
2. ~~Add unit tests for power calculations~~
3. ~~Add more non-parametric tests to Study Design Wizard~~
4. **NEW:** Create BiophysicsHub.jsx skeleton
5. **NEW:** Implement basic Michaelis-Menten fitter

### Short-Term - Weeks 2-4
1. Implement Pre-registration Export (OSF, AsPredicted formats)
2. Add effect size calculators (from raw data)
3. Implement Sequential Analysis support
4. **NEW:** Complete enzyme kinetics module
5. **NEW:** Complete binding affinity module
6. **NEW:** Add biophysics code export (R/Python)

### Medium-Term - Weeks 5-8
1. Multi-site study planning in wizard
2. Adaptive design support
3. Bayesian power analysis option
4. **NEW:** CD spectroscopy analysis
5. **NEW:** Biophysics Learning Hub (9 lessons)
6. **NEW:** ITC/SPR analysis modules

### Long-Term - Months 3-6
1. **NEW:** Global fitting across multiple experiments
2. **NEW:** Publication-ready figure export
3. **NEW:** Integration with protein databases (PDB, UniProt)
4. **NEW:** Batch analysis for high-throughput screening
5. **NEW:** AI Advisor specialized for biophysics questions

---

## Competitive Advantage

| Feature | GraphPad Prism | Origin | StickForStats |
|---------|---------------|--------|---------------|
| Price | $255-1,095/year | $1,000+ | **FREE** |
| Web-based | No | No | **Yes** |
| Educational content | Limited | No | **43+ lessons** |
| AI guidance | No | No | **Yes (Claude)** |
| Statistical rigor | Good | Good | **G*Power validated** |
| Open source | No | No | **Yes** |
| No coding required | Yes | No | **Yes** |
| Privacy (client-side) | No | No | **Yes** |

---

## File Structure After Biophysics Expansion

```
/src/components/
├── education/                    # General stats education
├── statistical-analysis/         # 10 modules (was 9)
│   ├── data-profiling/
│   ├── preprocessing/
│   ├── visualization/
│   ├── statistical-tests/
│   ├── advanced-statistics/
│   ├── machine-learning/
│   ├── regression/
│   ├── power-analysis/
│   ├── study-design-wizard/
│   └── biophysics/              # NEW MODULE 10
│       ├── BiophysicsHub.jsx
│       ├── enzyme-kinetics/
│       ├── binding-affinity/
│       ├── cd-spectroscopy/
│       └── thermal-analysis/
├── biophysics-education/         # NEW LEARNING HUB
│   ├── BiophysicsLearningHub.jsx
│   └── lessons/
├── power-analysis/               # Existing
├── ai-advisor/                   # Existing
└── guardian/                     # Existing
```

---

## Success Metrics

### Technical KPIs
- [ ] Michaelis-Menten fitting accuracy: R² > 0.99 on test datasets
- [ ] IC50 calculation within 5% of GraphPad Prism
- [ ] CD secondary structure estimation within 3% of CDPro
- [ ] Page load time < 2 seconds
- [ ] All calculations client-side (privacy)

### User KPIs
- [ ] Time to complete enzyme kinetics analysis < 5 minutes
- [ ] Zero coding required for basic analysis
- [ ] Educational content completion rate > 60%

---

## References & Validation

### Enzyme Kinetics
- Cornish-Bowden, A. (2012). Fundamentals of Enzyme Kinetics. Wiley.
- Copeland, R.A. (2000). Enzymes: A Practical Introduction. Wiley-VCH.

### Binding Analysis
- Hulme, E.C. & Trevethick, M.A. (2010). Ligand binding assays at equilibrium. Br J Pharmacol.
- Motulsky, H.J. & Neubig, R.R. (2010). Analyzing binding data. Curr Protoc Neurosci.

### CD Spectroscopy
- Greenfield, N.J. (2006). Using circular dichroism spectra to estimate protein secondary structure. Nat Protoc.
- Kelly, S.M. et al. (2005). How to study proteins by circular dichroism. Biochim Biophys Acta.

---

## Sign-Off

**Document Created:** December 12, 2025
**Author:** Claude (Opus 4.5) with StickForStats Team
**Status:** Strategic Planning Document
**Next Action:** Begin Phase 1 implementation

---

*"Making professional biophysics analysis accessible to every researcher, student, and scientist - no expensive software, no coding required."*
