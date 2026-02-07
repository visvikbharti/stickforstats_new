# Frontend Components Documentation
## StickForStats Causal Inference & Mixed Models UI

---

## Overview

This document provides technical documentation for the frontend components implementing causal inference and mixed effects model visualizations.

**Created**: December 27, 2025
**Author**: StickForStats Team

---

## Directory Structure

```
frontend/src/
├── services/
│   ├── CausalInferenceService.js    # API client for causal endpoints
│   └── MixedModelsService.js        # API client for mixed model endpoints
│
├── components/
│   ├── causal/
│   │   ├── index.js                 # Component exports
│   │   ├── DAGBuilder.jsx           # Interactive DAG editor
│   │   ├── MediationPathDiagram.jsx # Mediation visualization
│   │   ├── EventStudyPlot.jsx       # DiD event study plots
│   │   └── BalancePlot.jsx          # PSM balance visualization
│   │
│   └── mixed_models/
│       ├── index.js                 # Component exports
│       └── CaterpillarPlot.jsx      # Random effects plot
│
└── modules/
    ├── MixedModelsModule.jsx        # Complete mixed models UI
    └── CausalInferenceModule.jsx    # Complete causal inference UI
```

---

## Services

### CausalInferenceService

API client for all causal inference backend endpoints.

```javascript
import causalInferenceService from '../services/CausalInferenceService';

// DAG Operations
const dagResult = await causalInferenceService.createDAG(edges, treatment, outcome);
const analysis = await causalInferenceService.analyzeDAG(edges, treatment, outcome);
const adjustmentSets = await causalInferenceService.findAdjustmentSets(edges, treatment, outcome);

// Propensity Score Methods
const propensity = await causalInferenceService.estimatePropensityScores(data, treatment, covariates);
const matched = await causalInferenceService.performMatching(data, treatment, covariates, options);

// Treatment Effects
const effects = await causalInferenceService.estimateTreatmentEffect(data, treatment, outcome, covariates);
const sensitivity = await causalInferenceService.sensitivityAnalysis(data, treatment, outcome, covariates);

// Mediation
const mediation = await causalInferenceService.baronKennyMediation(data, treatment, mediator, outcome);
const causalMed = await causalInferenceService.causalMediation(data, treatment, mediator, outcome);

// Difference-in-Differences
const did = await causalInferenceService.differenceInDifferences(data, outcome, treatment, post);
const eventStudy = await causalInferenceService.eventStudy(data, outcome, unit, time, eventTime);
```

### MixedModelsService

API client for mixed effects model endpoints.

```javascript
import mixedModelsService from '../services/MixedModelsService';

// ICC
const icc = await mixedModelsService.calculateICC(data, 'ICC(2,1)');
const allICCs = await mixedModelsService.calculateAllICCs(data);

// Linear Mixed Models
const lmm = await mixedModelsService.fitLMM(data, outcome, fixedEffects, randomEffects, groupingVar);
const randomIntercept = await mixedModelsService.fitRandomInterceptModel(data, outcome, fixed, group);
const randomSlopes = await mixedModelsService.fitRandomSlopesModel(data, outcome, fixed, slopes, group);

// Random Effects
const re = await mixedModelsService.extractRandomEffects(data, outcome, fixed, random, group);
const caterpillarData = mixedModelsService.processCaterpillarData(re);

// Model Comparison
const comparison = await mixedModelsService.compareLMMs(data, model1Spec, model2Spec);
const fitIndices = await mixedModelsService.getModelFitIndices(data, modelSpecs);

// Diagnostics
const diagnostics = await mixedModelsService.getDiagnostics(data, outcome, fixed, random, group);
```

---

## Visualization Components

### DAGBuilder

Interactive D3.js-based directed acyclic graph editor.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `initialNodes` | Array | `[]` | Initial node data |
| `initialEdges` | Array | `[]` | Initial edge data |
| `onDAGChange` | Function | - | Callback when DAG changes |
| `onAnalyze` | Function | - | Callback to trigger analysis |
| `readOnly` | Boolean | `false` | Disable editing |
| `height` | Number | `500` | Component height in pixels |

#### Usage

```jsx
import DAGBuilder from '../components/causal/DAGBuilder';

<DAGBuilder
  initialNodes={[
    { id: 'treatment', label: 'Treatment', x: 100, y: 200 },
    { id: 'outcome', label: 'Outcome', x: 400, y: 200 }
  ]}
  initialEdges={[
    { source: 'treatment', target: 'outcome' }
  ]}
  onDAGChange={({ nodes, edges, treatment, outcome }) => {
    console.log('DAG updated:', nodes, edges);
  }}
  onAnalyze={async (edges, treatment, outcome) => {
    const result = await causalInferenceService.analyzeDAG(edges, treatment, outcome);
    return result;
  }}
  height={500}
/>
```

#### Features

- **Node Operations**: Add, delete, drag, select nodes
- **Edge Operations**: Add by clicking two nodes, delete selected
- **Node Types**: Treatment (green), Outcome (red), Confounder (orange), Mediator (blue)
- **Cycle Detection**: Prevents creating cycles
- **History**: Undo/redo support
- **Export/Import**: Save/load DAG as JSON
- **Zoom/Pan**: D3 zoom behavior

---

### MediationPathDiagram

Visualizes mediation analysis results with path coefficients.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `treatment` | String | - | Treatment variable name |
| `mediators` | Array | `[]` | Array of mediator objects with `name` |
| `outcome` | String | - | Outcome variable name |
| `results` | Object | - | Mediation analysis results from API |
| `showConfidenceIntervals` | Boolean | `true` | Show CIs on hover |
| `showEffectDecomposition` | Boolean | `true` | Show effect table |

#### Usage

```jsx
import MediationPathDiagram from '../components/causal/MediationPathDiagram';

<MediationPathDiagram
  treatment="intervention"
  mediators={[{ name: "self_efficacy" }]}
  outcome="behavior_change"
  results={{
    path_a: 0.568,
    path_b: 0.470,
    direct_effect: 0.150,
    indirect_effect: 0.267,
    total_effect: 0.417,
    p_a: 0.001,
    p_b: 0.003,
    p_indirect: 0.01,
    indirect_ci: [0.199, 0.336],
    proportion_mediated: 0.64
  }}
/>
```

#### Features

- **Path Visualization**: SVG paths with arrows
- **Significance Indicators**: Asterisks for p-values
- **Effect Decomposition Table**: Total, direct, indirect effects
- **Confidence Intervals**: Bootstrap CIs
- **Multi-Mediator Support**: Multiple parallel mediators

---

### EventStudyPlot

Dynamic treatment effects visualization for difference-in-differences.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | Array | `[]` | Array of period estimates |
| `treatmentTime` | Number | `0` | Period when treatment occurs |
| `title` | String | `'Event Study...'` | Chart title |
| `xLabel` | String | `'Periods...'` | X-axis label |
| `yLabel` | String | `'Treatment Effect...'` | Y-axis label |
| `height` | Number | `400` | Chart height |
| `showParallelTrendsTest` | Boolean | `true` | Show parallel trends alert |
| `parallelTrendsResult` | Boolean | `null` | Override parallel trends check |

#### Data Format

```javascript
const eventStudyData = [
  { period: -3, estimate: 0.02, se: 0.15, ciLower: -0.27, ciUpper: 0.31, pValue: 0.89 },
  { period: -2, estimate: -0.05, se: 0.14, ciLower: -0.32, ciUpper: 0.22, pValue: 0.72 },
  { period: -1, estimate: 0.08, se: 0.13, ciLower: -0.17, ciUpper: 0.33, pValue: 0.53 },
  { period: 0, estimate: 0, se: 0, ciLower: 0, ciUpper: 0, pValue: 1 }, // Reference
  { period: 1, estimate: 0.94, se: 0.16, ciLower: 0.63, ciUpper: 1.25, pValue: 0.001 },
  { period: 2, estimate: 1.54, se: 0.18, ciLower: 1.19, ciUpper: 1.89, pValue: 0.001 },
  // ...
];
```

#### Usage

```jsx
import EventStudyPlot from '../components/causal/EventStudyPlot';

<EventStudyPlot
  data={eventStudyData}
  treatmentTime={0}
  title="Policy Impact: Dynamic Treatment Effects"
  showParallelTrendsTest={true}
/>
```

#### Features

- **Pre/Post Coloring**: Gray for pre-treatment, blue for post-treatment
- **Confidence Intervals**: Error bars with caps
- **Reference Lines**: At y=0 and treatment time
- **Significance Highlighting**: Larger dots for significant effects
- **Parallel Trends Check**: Automatic assessment

---

### BalancePlot

Covariate balance visualization for propensity score matching.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | Array | `[]` | Balance data array |
| `title` | String | `'Covariate Balance...'` | Chart title |
| `threshold` | Number | `0.1` | SMD threshold for "balanced" |
| `showTable` | Boolean | `true` | Show detailed table |
| `showVarianceRatio` | Boolean | `false` | Show variance ratios |
| `height` | Number | `400` | Chart height |

#### Data Format

```javascript
const balanceData = [
  { variable: 'age', smdBefore: 0.45, smdAfter: 0.03, varianceRatioBefore: 1.2, varianceRatioAfter: 1.02 },
  { variable: 'income', smdBefore: 0.32, smdAfter: 0.08, varianceRatioBefore: 1.5, varianceRatioAfter: 1.1 },
  { variable: 'education', smdBefore: 0.28, smdAfter: 0.05, varianceRatioBefore: 0.9, varianceRatioAfter: 0.98 },
  // ...
];
```

#### Usage

```jsx
import BalancePlot from '../components/causal/BalancePlot';

<BalancePlot
  data={balanceData}
  title="Covariate Balance: Before vs After Matching"
  threshold={0.1}
  showTable={true}
/>
```

#### Features

- **Love Plot Style**: Horizontal layout with before/after
- **Threshold Visualization**: Lines at 0.1 and 0.25
- **Improvement Tracking**: Connecting lines showing change
- **Summary Statistics**: Count of balanced covariates
- **Detailed Table**: All covariates with statistics

---

### CaterpillarPlot

Random effects visualization from mixed models.

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | Array | `[]` | Random effects data |
| `title` | String | `'Random Effects...'` | Chart title |
| `effectType` | String | `'Intercept'` | Type of effect to display |
| `sortBy` | String | `'estimate'` | Sort field |
| `ascending` | Boolean | `true` | Sort direction |
| `height` | Number | `400` | Base chart height |
| `showShrinkage` | Boolean | `false` | Show shrinkage info |
| `maxGroups` | Number | `50` | Max groups to display |

#### Data Format

```javascript
const randomEffectsData = [
  { group: 'School A', effect: 'Intercept', estimate: 2.5, se: 0.8, ciLower: 0.9, ciUpper: 4.1, nObs: 45 },
  { group: 'School B', effect: 'Intercept', estimate: -1.2, se: 0.9, ciLower: -2.9, ciUpper: 0.5, nObs: 38 },
  { group: 'School C', effect: 'Intercept', estimate: 0.8, se: 0.7, ciLower: -0.6, ciUpper: 2.2, nObs: 52 },
  // ...
];
```

#### Usage

```jsx
import CaterpillarPlot from '../components/mixed_models/CaterpillarPlot';

<CaterpillarPlot
  data={randomEffectsData}
  title="School Random Effects (BLUPs)"
  effectType="Intercept"
  sortBy="estimate"
  ascending={true}
  showShrinkage={true}
/>
```

#### Features

- **Sorted Display**: By effect magnitude
- **Significance Coloring**: Green (positive), red (negative), gray (NS)
- **95% Confidence Intervals**: Error bars
- **Multiple Effect Types**: Switch between intercept/slopes
- **Interactive Tooltips**: Full BLUP details

---

## Main Modules

### MixedModelsModule

Complete interface for mixed effects modeling.

**Route**: `/modules/mixed-models`

#### Tabs

1. **ICC Calculation**
   - Select ICC type (6 Shrout & Fleiss types)
   - View ICC value, CI, F-value, p-value
   - Interpretation guidelines

2. **Linear Mixed Model**
   - Specify outcome, fixed effects, grouping variable
   - Optional random slopes
   - Fixed effects table
   - Variance components
   - Model fit statistics (AIC, BIC)

3. **Random Effects**
   - Caterpillar plot visualization
   - Effect type selection
   - Sorting options

### CausalInferenceModule

Complete interface for causal analysis.

**Route**: `/modules/causal-inference`

#### Tabs

1. **DAG Builder**
   - Interactive graph creation
   - Causal structure analysis
   - Adjustment set identification

2. **Matching & Effects**
   - Stepper workflow
   - Propensity estimation
   - Matching
   - Effect estimation
   - Balance plot

3. **Mediation**
   - Variable selection
   - Baron-Kenny analysis
   - Path diagram

4. **Diff-in-Diff**
   - Basic DiD
   - Event study
   - Dynamic effects plot

---

## Styling Conventions

All components follow the project's styling conventions:

### MUI Theme Integration

```jsx
import { useTheme } from '@mui/material/styles';

const theme = useTheme();
const primaryColor = theme.palette.primary.main;
const isDark = theme.palette.mode === 'dark';
```

### Styled Components Pattern

```jsx
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(255,255,255,0.05)'
    : 'rgba(0,0,0,0.02)',
  borderRadius: theme.shape.borderRadius,
  transition: 'transform 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)'
  }
}));
```

### Color Scheme

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Treatment | `#4caf50` | `#4caf50` |
| Outcome | `#f44336` | `#f44336` |
| Confounder | `#ff9800` | `#ff9800` |
| Mediator | `#2196f3` | `#2196f3` |
| Significant | `theme.palette.primary.main` | - |
| Non-significant | `theme.palette.grey[400]` | - |

---

## Testing

### ESLint Status

```
0 errors, 19 warnings (unused imports)
```

### Manual Testing Checklist

- [ ] DAG Builder: Create nodes, edges, drag, delete
- [ ] DAG Builder: Export/import JSON
- [ ] DAG Builder: Cycle detection
- [ ] Mediation: Display path coefficients
- [ ] Mediation: Show significance correctly
- [ ] Event Study: Pre/post coloring
- [ ] Event Study: Confidence intervals
- [ ] Balance Plot: Before/after comparison
- [ ] Balance Plot: Threshold lines
- [ ] Caterpillar: Sort by effect
- [ ] Caterpillar: Significance colors
- [ ] Mixed Models Module: Data parsing
- [ ] Mixed Models Module: ICC calculation
- [ ] Mixed Models Module: LMM fitting
- [ ] Causal Module: All 4 tabs work
- [ ] Causal Module: API integration

---

## Known Issues

1. **ESLint Warnings**: Unused imports in several components (non-breaking)
2. **Hook Dependencies**: Some useEffect/useCallback hooks have missing deps (cosmetic warnings)
3. **D3 Cleanup**: Force simulation should be stopped on unmount

---

## Future Enhancements

1. **Forest Plot**: For meta-analysis visualization
2. **Funnel Plot**: Publication bias detection
3. **Diagnostic Plots**: Q-Q plots, residual plots for LMM
4. **Sensitivity Plot**: For mediation sensitivity analysis
5. **Power Curve**: Integration with power analysis
6. **Export**: PNG/SVG export for all visualizations

---

*Documentation updated: December 27, 2025*
