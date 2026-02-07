# Phase 2: Core Enhancements Planning
## StickForStats Development Roadmap
## Created: December 26, 2025

---

# PHASE 2 OVERVIEW

Following the successful completion of Phase 1 (Bayesian Statistics, Pre-Registration Assistant, P-Curve Analysis), Phase 2 focuses on advanced analytical capabilities.

## Phase 1 Summary (COMPLETED)
- 13 new API endpoints
- ~4,500 lines of new backend code
- 3 major feature modules
- Full API integration with Django REST Framework

---

# PHASE 2 FEATURES

## 2.1 Mixed Effects/Multilevel Models

### Purpose
Enable analysis of hierarchical/nested data structures common in:
- Educational research (students within classrooms within schools)
- Clinical trials (measurements within patients)
- Organizational psychology (employees within teams within companies)
- Repeated measures designs

### Features

#### 2.1.1 Random Effects Models
- Random intercepts
- Random slopes
- Crossed random effects
- Nested random effects

#### 2.1.2 Model Types
- Linear Mixed Models (LMM)
- Generalized Linear Mixed Models (GLMM)
- Mixed ANOVA (Type III SS)

#### 2.1.3 Model Diagnostics
- ICC (Intraclass Correlation Coefficient)
- Design effect
- Residual analysis
- Model comparison (AIC, BIC, likelihood ratio tests)

#### 2.1.4 Guardian Integration
- Sample size requirements for multilevel models
- Convergence warnings
- Variance component checks

### Technical Implementation

```
backend/core/services/mixed_models/
├── __init__.py
├── lmm.py                  # Linear Mixed Models
├── glmm.py                 # Generalized LMM
├── random_effects.py       # Random effect specification
├── icc.py                  # ICC calculations
├── model_comparison.py     # Model comparison utilities
└── diagnostics.py          # Model diagnostics
```

### API Endpoints (Planned)

```
POST /api/core/mixed/lmm/           # Linear mixed model
POST /api/core/mixed/glmm/          # Generalized LMM
POST /api/core/mixed/icc/           # ICC calculation
POST /api/core/mixed/compare/       # Model comparison
GET  /api/core/mixed/diagnostics/   # Model diagnostics
```

### Dependencies
- statsmodels (mixedlm)
- Consider: lme4 via rpy2 for complex models

### Scientific References
- Snijders, T. A., & Bosker, R. J. (2011). Multilevel Analysis.
- Raudenbush, S. W., & Bryk, A. S. (2002). Hierarchical Linear Models.
- Bates, D., et al. (2015). Fitting Linear Mixed-Effects Models Using lme4.

---

## 2.2 Causal Inference Toolkit

### Purpose
Provide tools for causal reasoning beyond correlation, including:
- DAG (Directed Acyclic Graph) visualization
- Confound identification
- Propensity score methods
- Mediation analysis

### Features

#### 2.2.1 DAG Builder
- Visual DAG editor in frontend
- Automatic identification of:
  - Confounders
  - Mediators
  - Colliders
  - Instrumental variables
- Adjustment set calculation
- D-separation testing

#### 2.2.2 Propensity Score Methods
- Propensity score estimation (logistic regression)
- Matching (nearest neighbor, optimal)
- Weighting (IPW, IPTW)
- Stratification
- Balance diagnostics

#### 2.2.3 Treatment Effect Estimation
- Average Treatment Effect (ATE)
- Average Treatment Effect on Treated (ATT)
- Doubly robust estimation

#### 2.2.4 Mediation Analysis
- Baron-Kenny approach
- Causal mediation analysis (Imai et al.)
- Multiple mediators
- Sensitivity analysis

#### 2.2.5 Difference-in-Differences
- Parallel trends assumption testing
- Event study plots
- Staggered adoption designs

### Technical Implementation

```
backend/core/services/causal/
├── __init__.py
├── dag.py                  # DAG representation and algorithms
├── d_separation.py         # D-separation tests
├── adjustment_sets.py      # Backdoor adjustment calculation
├── propensity.py           # Propensity score methods
├── matching.py             # Matching algorithms
├── weighting.py            # IPW/IPTW
├── effects.py              # Treatment effect estimation
├── mediation.py            # Mediation analysis
├── did.py                  # Difference-in-differences
└── sensitivity.py          # Sensitivity analysis
```

### API Endpoints (Planned)

```
POST /api/core/causal/dag/create/       # Create DAG
POST /api/core/causal/dag/analyze/      # Analyze DAG structure
POST /api/core/causal/adjustment/       # Get adjustment sets
POST /api/core/causal/propensity/       # Propensity score
POST /api/core/causal/match/            # Matching
POST /api/core/causal/ate/              # Treatment effects
POST /api/core/causal/mediation/        # Mediation analysis
POST /api/core/causal/did/              # Difference-in-differences
```

### Dependencies
- networkx (DAG operations)
- Consider: DoWhy, CausalML for advanced methods

### Scientific References
- Pearl, J. (2009). Causality: Models, Reasoning, and Inference.
- Imbens, G. W., & Rubin, D. B. (2015). Causal Inference.
- Imai, K., et al. (2010). Identification, Inference and Sensitivity Analysis for Causal Mediation Effects.
- Rosenbaum, P. R., & Rubin, D. B. (1983). Propensity Score Methods.

---

## 2.3 Natural Language Query Enhancement

### Purpose
Extend the AI Advisor to handle:
- Complex multi-step analysis requests
- Conversational context maintenance
- Automatic analysis plan generation
- Methods section drafting

### Features

#### 2.3.1 Enhanced Query Understanding
- Multi-variable analysis requests
- Temporal/sequential analysis
- Conditional analysis ("if X then do Y")
- Comparison requests ("compare A vs B vs C")

#### 2.3.2 Analysis Plan Generation
- Automatic test selection chain
- Assumption check sequencing
- Decision tree traversal
- Alternative path suggestions

#### 2.3.3 Context Management
- Session state persistence
- Analysis history reference
- Variable tracking across queries
- Progressive refinement

#### 2.3.4 Report Generation
- APA-style methods sections
- Results paragraphs
- Table generation
- Figure captioning

### Technical Implementation

```
backend/ai_advisor/services/
├── enhanced_query/
│   ├── __init__.py
│   ├── parser.py           # Enhanced NLP parsing
│   ├── intent_classifier.py # Multi-intent classification
│   ├── context_manager.py  # Conversation context
│   ├── plan_generator.py   # Analysis plan generation
│   └── report_generator.py # APA report generation
```

### API Endpoints (Planned)

```
POST /api/ai-advisor/complex-query/     # Multi-step query
POST /api/ai-advisor/plan/              # Generate analysis plan
POST /api/ai-advisor/context/           # Manage conversation context
POST /api/ai-advisor/report/            # Generate report sections
GET  /api/ai-advisor/history/           # Query history
```

### Dependencies
- Claude API (current)
- Consider: LangChain for workflow orchestration

---

# IMPLEMENTATION PRIORITY

## Priority Matrix

| Feature | Impact | Complexity | Dependencies | Priority |
|---------|--------|------------|--------------|----------|
| Mixed Models | HIGH | HIGH | statsmodels | 1 |
| DAG Builder | HIGH | MEDIUM | networkx | 2 |
| Propensity Score | MEDIUM | MEDIUM | None | 3 |
| Mediation | MEDIUM | MEDIUM | Mixed Models | 4 |
| NLP Enhancement | MEDIUM | HIGH | AI Advisor | 5 |
| D-in-D | LOW | LOW | None | 6 |

## Recommended Order

### Phase 2a: Mixed Effects Models
1. Basic LMM implementation
2. ICC calculation
3. Random intercepts/slopes
4. Model comparison
5. Guardian integration

### Phase 2b: Causal Inference Core
1. DAG representation and visualization
2. D-separation and adjustment sets
3. Propensity score estimation
4. Matching methods
5. ATE/ATT estimation

### Phase 2c: Advanced Features
1. Mediation analysis
2. Difference-in-differences
3. NLP query enhancement
4. Report generation

---

# FRONTEND COMPONENTS (Phase 2)

## Mixed Models Interface

```
frontend/src/components/mixed-models/
├── MixedModelsHub.jsx          # Main hub
├── LMMAnalysis.jsx             # Linear mixed model interface
├── RandomEffectsBuilder.jsx    # Visual random effects specification
├── ICCCalculator.jsx           # ICC analysis
├── ModelComparison.jsx         # Model comparison interface
├── components/
│   ├── VariancePartition.jsx   # Variance decomposition viz
│   ├── RandomEffectsPlot.jsx   # Random effects visualization
│   └── ConvergenceIndicator.jsx
└── education/
    └── lessons/
        ├── Lesson01_WhatIsMLM.jsx
        ├── Lesson02_RandomEffects.jsx
        └── Lesson03_ICCInterpretation.jsx
```

## Causal Inference Interface

```
frontend/src/components/causal/
├── CausalHub.jsx               # Main hub
├── DAGBuilder.jsx              # Visual DAG editor
├── PropensityScore.jsx         # PS analysis
├── MediationAnalysis.jsx       # Mediation interface
├── DifferenceInDiff.jsx        # D-in-D analysis
├── components/
│   ├── DAGCanvas.jsx           # Interactive DAG canvas
│   ├── NodeEditor.jsx          # DAG node properties
│   ├── PathAnalyzer.jsx        # Path analysis display
│   ├── BalancePlot.jsx         # Covariate balance
│   └── EffectForest.jsx        # Treatment effects viz
└── education/
    └── lessons/
        ├── Lesson01_CorrelationVsCausation.jsx
        ├── Lesson02_DAGsExplained.jsx
        ├── Lesson03_ConfoundersAndColliders.jsx
        └── Lesson04_PropensityScores.jsx
```

---

# SUCCESS CRITERIA

## Phase 2a Completion (Mixed Models)
- [ ] LMM analysis working for nested designs
- [ ] ICC calculation validated against R/lme4
- [ ] Random intercepts and slopes supported
- [ ] Model comparison (AIC, BIC, LRT) working
- [ ] Guardian checks for multilevel assumptions
- [ ] 3+ education lessons created
- [ ] All endpoints documented

## Phase 2b Completion (Causal Core)
- [ ] DAG builder functional in frontend
- [ ] D-separation algorithm validated
- [ ] Adjustment set calculation correct
- [ ] Propensity score matching working
- [ ] ATE/ATT estimates validated
- [ ] 4+ education lessons created
- [ ] All endpoints documented

## Phase 2c Completion (Advanced)
- [ ] Mediation analysis working
- [ ] D-in-D analysis implemented
- [ ] NLP handles multi-step queries
- [ ] Report generation produces valid APA text
- [ ] All features integrated

---

# RISKS AND MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Mixed model convergence issues | HIGH | MEDIUM | Use robust defaults, clear warnings |
| DAG complexity in frontend | MEDIUM | HIGH | Start simple, progressive enhancement |
| PS matching performance | LOW | LOW | Optimize algorithms, add progress indicators |
| NLP complexity | HIGH | MEDIUM | Scope clearly, iterative development |

---

# TIMELINE (Flexible - No Dates)

## Phase 2a: Foundation
- Set up mixed models service structure
- Implement basic LMM
- Add ICC calculation
- Create initial tests

## Phase 2b: Core Features
- Implement random effects options
- Add model comparison
- Guardian integration
- Frontend skeleton

## Phase 2c: Causal Inference
- DAG data structure
- D-separation algorithm
- Adjustment sets
- Basic propensity scoring

## Phase 2d: Advanced & Integration
- Full propensity methods
- Mediation analysis
- NLP enhancement
- Documentation

---

# NOTES FOR FUTURE SESSIONS

1. **Start with Mixed Models** - Most requested by researchers
2. **DAG Builder is visually complex** - Consider using existing libraries (dagitty.js)
3. **Propensity Score** - Focus on interpretability over advanced methods
4. **NLP Enhancement** - Requires careful prompt engineering
5. **All implementations must validate against R packages**

---

# REFERENCES

## Statistical Methods
- Snijders & Bosker (2011). Multilevel Analysis
- Pearl (2009). Causality
- Imbens & Rubin (2015). Causal Inference
- MacKinnon (2008). Introduction to Statistical Mediation Analysis

## Software Validation
- lme4 (R package for mixed models)
- dagitty (R package for causal diagrams)
- MatchIt (R package for matching)
- mediation (R package for causal mediation)

---

*Phase 2 Planning Document*
*Created: December 26, 2025*
*Following Phase 1 Completion*
