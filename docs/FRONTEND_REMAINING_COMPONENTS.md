# Frontend Remaining Components - StickForStats v1.0

## Overview
**22 Components Remaining** for Tier 0 (Must-Have Features)  
**Estimated Work**: ~8,900 lines JSX + ~2,000 lines SCSS  
**Design Standard**: Enterprise SPSS/SAS aesthetic (no modern web app look)

---

## Sprint 1: Test Recommender (1 remaining)

### 1. ComparisonView
**Priority**: High | **Complexity**: Medium | **~400 lines**

**Purpose**: Side-by-side comparison of multiple statistical tests

**Features Required**:
- Split-panel layout for 2-4 tests simultaneously
- Synchronized scrolling between panels
- Highlight differences in assumptions and results
- Comparison matrix showing pros/cons
- Export comparison as report

**UI Elements**:
- Tabbed panels for each test
- Synchronized data views
- Difference highlighting
- Comparison summary table

---

## Sprint 2: Multiplicity Corrections (6 remaining)

### 2. HypothesisRegistry
**Priority**: Critical | **Complexity**: Medium | **~350 lines**

**Purpose**: Central registry for all hypotheses tested in session

**Features Required**:
- Add/edit/delete hypotheses
- Automatic capture from test runs
- Tagging and categorization
- Search and filter capabilities
- Export hypothesis list

**UI Elements**:
- Searchable table with filters
- Add hypothesis modal
- Bulk actions toolbar
- Tag management

### 3. CorrectionMethodSelector
**Priority**: High | **Complexity**: Low | **~200 lines**

**Purpose**: Intelligent selection widget for correction methods

**Features Required**:
- Method recommendations based on context
- Visual comparison of methods
- Interactive decision tree
- Method details on hover
- Save preferred methods

**UI Elements**:
- Radio/checkbox groups
- Info tooltips
- Comparison chart
- Recommendation badges

### 4. PValueAdjustmentTable
**Priority**: High | **Complexity**: Medium | **~300 lines**

**Purpose**: Display original vs adjusted p-values

**Features Required**:
- Side-by-side p-value comparison
- Visual indicators for significance changes
- Sort by original/adjusted/difference
- Export to CSV/Excel
- Highlight decision changes

**UI Elements**:
- Sortable data table
- Significance indicators
- Difference highlighting
- Export toolbar

### 5. SessionTracker
**Priority**: Critical | **Complexity**: High | **~450 lines**

**Purpose**: Track all statistical tests run in current session

**Features Required**:
- Real-time test logging
- P-hacking risk indicators
- Test timeline visualization
- Pattern detection warnings
- Session summary statistics

**UI Elements**:
- Timeline component
- Risk gauge meter
- Test history list
- Warning notifications
- Summary dashboard

### 6. AlphaSpendingCalculator
**Priority**: Medium | **Complexity**: High | **~400 lines**

**Purpose**: Calculate alpha spending for sequential testing

**Features Required**:
- O'Brien-Fleming boundaries
- Pocock boundaries
- Lan-DeMets spending functions
- Custom spending functions
- Boundary visualization

**UI Elements**:
- Function selector
- Parameter inputs
- Boundary plot
- Spending table
- Export options

### 7. MultipleTestingReport
**Priority**: High | **Complexity**: Medium | **~350 lines**

**Purpose**: Generate comprehensive multiple testing report

**Features Required**:
- Executive summary
- Method justification
- Adjusted results table
- Decision audit trail
- References and citations

**UI Elements**:
- Report preview
- Section toggles
- Export formats selector
- Template chooser
- Print preview

---

## Sprint 3: Power Analysis (7 remaining)

### 8. PowerCalculator
**Priority**: High | **Complexity**: Medium | **~400 lines**

**Purpose**: Core power calculation component

**Features Required**:
- All test types support
- Non-central distributions
- Exact vs approximate methods
- Batch calculations
- Validation against G*Power

**UI Elements**:
- Test type selector
- Parameter inputs grid
- Results display
- Calculation log
- Validation indicators

### 9. SampleSizeDeterminer
**Priority**: High | **Complexity**: Medium | **~350 lines**

**Purpose**: Calculate required sample sizes

**Features Required**:
- Unequal allocation ratios
- Dropout rate adjustment
- Cost optimization
- Multiple endpoints
- Adaptive designs

**UI Elements**:
- Allocation ratio slider
- Dropout calculator
- Cost input fields
- Endpoint manager
- Optimization controls

### 10. PowerCurveVisualizer
**Priority**: Medium | **Complexity**: High | **~500 lines**

**Purpose**: Interactive power curve visualization

**Features Required**:
- D3.js interactive plots
- Multiple curves overlay
- Parameter sliders
- Zoom and pan
- Export as SVG/PNG

**UI Elements**:
- D3 chart component
- Parameter sliders
- Legend with toggles
- Zoom controls
- Export toolbar

### 11. EffectSizeEstimator
**Priority**: High | **Complexity**: Medium | **~300 lines**

**Purpose**: Estimate detectable effect sizes

**Features Required**:
- Pilot data analysis
- Literature-based estimation
- Meta-analysis integration
- Uncertainty quantification
- Sensitivity ranges

**UI Elements**:
- Data input forms
- Estimation methods tabs
- Uncertainty plots
- Sensitivity sliders
- Reference library

### 12. SensitivityAnalyzer
**Priority**: Medium | **Complexity**: High | **~450 lines**

**Purpose**: Multi-parameter sensitivity analysis

**Features Required**:
- Parameter ranges
- Monte Carlo simulation
- Tornado diagrams
- Heat maps
- Scenario comparison

**UI Elements**:
- Parameter range inputs
- Simulation controls
- Tornado chart
- Heat map grid
- Scenario manager

### 13. StudyDesignWizard
**Priority**: Medium | **Complexity**: High | **~600 lines**

**Purpose**: Guided study design workflow

**Features Required**:
- Step-by-step guidance
- Design templates
- Constraint checking
- Optimization suggestions
- Design documentation

**UI Elements**:
- Wizard steps
- Template gallery
- Constraint forms
- Suggestion panels
- Documentation preview

### 14. PowerAnalysisReport
**Priority**: Low | **Complexity**: Medium | **~300 lines**

**Purpose**: Generate power analysis reports

**Features Required**:
- Assumptions documentation
- Sensitivity analysis results
- Sample size justification
- Power curves
- Methods text

**UI Elements**:
- Report sections
- Chart embeds
- Export options
- Template selector
- Preview pane

---

## Sprint 4: Effect Sizes (5 remaining)

### 15. EffectSizeComparison
**Priority**: Medium | **Complexity**: Medium | **~350 lines**

**Purpose**: Compare effect sizes across studies

**Features Required**:
- Meta-analysis forest plots
- Study weights calculation
- Heterogeneity statistics
- Publication bias assessment
- Subgroup analysis

**UI Elements**:
- Forest plot
- Study input table
- Weight display
- Bias funnel plot
- Subgroup controls

### 16. RobustEstimators
**Priority**: High | **Complexity**: High | **~500 lines**

**Purpose**: Implement robust effect size estimators

**Features Required**:
- Trimmed means
- Winsorized statistics
- M-estimators
- Bootstrap methods
- Outlier detection

**UI Elements**:
- Estimator selector
- Trimming controls
- Bootstrap settings
- Outlier display
- Comparison table

### 17. ConfidenceIntervalPlotter
**Priority**: Medium | **Complexity**: Medium | **~400 lines**

**Purpose**: Visualize confidence intervals

**Features Required**:
- Error bar plots
- CI overlap assessment
- Multiple CI methods
- Interactive tooltips
- Export quality graphics

**UI Elements**:
- Chart types selector
- CI method chooser
- Overlap indicators
- Tooltip displays
- Export controls

### 18. EffectSizeConverter
**Priority**: Low | **Complexity**: Low | **~250 lines**

**Purpose**: Convert between effect size measures

**Features Required**:
- Common conversions (d to r, etc.)
- Variance calculations
- Back-transformation
- Batch conversion
- Formula display

**UI Elements**:
- Conversion matrix
- Input/output fields
- Formula viewer
- Batch upload
- History log

### 19. InterpretationGuide
**Priority**: Low | **Complexity**: Medium | **~300 lines**

**Purpose**: Interactive interpretation helper

**Features Required**:
- Context-specific guidance
- Benchmark comparisons
- Field-specific norms
- Practical significance
- Report language generator

**UI Elements**:
- Context selector
- Benchmark display
- Norm database
- Interpretation text
- Copy buttons

---

## Sprint 5: Reproducibility (7 remaining)

### 20. BundleValidator
**Priority**: Critical | **Complexity**: Medium | **~350 lines**

**Purpose**: Validate bundle integrity

**Features Required**:
- Checksum verification
- Data integrity checks
- Environment compatibility
- Version checking
- Repair suggestions

**UI Elements**:
- Validation checklist
- Progress indicators
- Error display
- Repair actions
- Report generator

### 21. PipelineRecorder
**Priority**: High | **Complexity**: High | **~500 lines**

**Purpose**: Record all analysis steps

**Features Required**:
- Automatic step capture
- Manual annotations
- Decision point tracking
- Branching support
- Replay capability

**UI Elements**:
- Timeline view
- Step cards
- Annotation forms
- Branch visualizer
- Replay controls

### 22. DataFingerprintViewer
**Priority**: Medium | **Complexity**: Medium | **~300 lines**

**Purpose**: Visualize data fingerprints

**Features Required**:
- Fingerprint comparison
- Change detection
- Visual diff display
- History tracking
- Verification status

**UI Elements**:
- Fingerprint display
- Comparison view
- Diff highlighting
- History timeline
- Status badges

### 23. SeedManager
**Priority**: High | **Complexity**: Medium | **~350 lines**

**Purpose**: Manage random seeds across libraries

**Features Required**:
- Master seed setting
- Library-specific seeds
- Seed history
- Reproducibility testing
- Seed recommendations

**UI Elements**:
- Seed input controls
- Library seed grid
- History table
- Test runner
- Recommendation panel

### 24. EnvironmentCapture
**Priority**: High | **Complexity**: Medium | **~300 lines**

**Purpose**: Capture system environment details

**Features Required**:
- System information
- Package versions
- Hardware details
- R/Python configs
- Dependency tree

**UI Elements**:
- Environment summary
- Package list
- Hardware specs
- Config display
- Tree visualizer

### 25. MethodsGenerator
**Priority**: Medium | **Complexity**: High | **~450 lines**

**Purpose**: Auto-generate methods section text

**Features Required**:
- Template selection
- Citation management
- Custom text editing
- Multiple formats
- Version tracking

**UI Elements**:
- Template gallery
- Text editor
- Citation manager
- Format selector
- Version history

### 26. BundleComparison
**Priority**: Low | **Complexity**: High | **~500 lines**

**Purpose**: Compare multiple analysis bundles

**Features Required**:
- Side-by-side comparison
- Difference highlighting
- Merge capabilities
- Conflict resolution
- Comparison report

**UI Elements**:
- Split view panels
- Diff markers
- Merge controls
- Conflict resolver
- Report preview

---

## Design Guidelines for All Components

### Visual Consistency
- **Base font**: 13px (not 16px)
- **Padding**: 8px standard (not 32px)
- **Border radius**: 3px max (not rounded)
- **Colors**: Muted professional palette
- **Primary**: #34495e (conservative blue)

### Information Density
- Minimize whitespace
- Use compact tables
- Dense form layouts
- Multi-column where appropriate
- Collapsible sections for advanced options

### Professional Features
- Keyboard shortcuts where applicable
- Export capabilities (PDF, CSV, LaTeX)
- Batch operations support
- Console/log views for power users
- No animations except subtle transitions (0.15s)

### Statistical Rigor
- Show all calculations
- Display confidence intervals
- Include test statistics
- Provide references
- No hiding of complexity

---

## Implementation Priority Order

### Phase 1: Critical Components (Weeks 1-2)
1. ComparisonView (complete Sprint 1)
2. HypothesisRegistry
3. SessionTracker
4. BundleValidator
5. PipelineRecorder

### Phase 2: High Priority (Weeks 3-4)
6. CorrectionMethodSelector
7. PValueAdjustmentTable
8. PowerCalculator
9. SampleSizeDeterminer
10. RobustEstimators
11. SeedManager
12. EnvironmentCapture

### Phase 3: Medium Priority (Weeks 5-6)
13. MultipleTestingReport
14. AlphaSpendingCalculator
15. EffectSizeEstimator
16. SensitivityAnalyzer
17. PowerCurveVisualizer
18. EffectSizeComparison
19. ConfidenceIntervalPlotter
20. DataFingerprintViewer
21. MethodsGenerator

### Phase 4: Lower Priority (Week 7)
22. StudyDesignWizard
23. PowerAnalysisReport
24. EffectSizeConverter
25. InterpretationGuide
26. BundleComparison

---

## Technical Stack Reminder

- **Framework**: React 18 with TypeScript
- **State**: Redux Toolkit
- **Styling**: SCSS with enterprise design system
- **Charts**: D3.js for complex visualizations
- **Tables**: React-table or AG-Grid for enterprise features
- **Exports**: jsPDF, xlsx, file-saver
- **Math**: Simple-statistics, jStat where needed

---

*Document Created: 2025-09-12*  
*Purpose: Track and detail remaining frontend work*  
*Maintainer: StickForStats Development Team*