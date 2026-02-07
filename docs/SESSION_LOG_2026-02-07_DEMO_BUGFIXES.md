# Session Log: February 7, 2026 - Lab Meeting Demo Bug Fixes

## Session Overview

**Date:** February 7, 2026
**Context:** Post-lab meeting demo bug fixes
**Outcome:** Successfully fixed two critical bugs discovered during live demonstration

---

## Background

During a lab meeting demonstration of StickForStats, two bugs were discovered when testing the Guardian Statistical Protection System with ANOVA analysis:

1. **Alternative Tests Error:** Clicking alternative test buttons (Bootstrap, Permutation Test, Mann Whitney) threw `TypeError: onSelectAlternative is not a function`
2. **Visual Evidence Not Showing:** The "Visual Evidence" button did nothing when clicked

These bugs affected user experience when the Guardian system blocked a parametric test due to assumption violations.

---

## Bug #1: `onSelectAlternative is not a function`

### Symptoms
- Error appeared in browser console: `TypeError: onSelectAlternative is not a function at GuardianWarning.jsx:680:34`
- Occurred when clicking any alternative test button in the Guardian warning panel
- Affected tests: Bootstrap, Permutation Test, Mann Whitney U, etc.

### Root Cause Analysis

The `GuardianWarning` component (`/frontend/src/components/Guardian/GuardianWarning.jsx`) expects three callback props:
- `onProceed` - Called when user clicks "Proceed with Test"
- `onSelectAlternative` - Called when user clicks an alternative test
- `onViewEvidence` - Called when user clicks "Visual Evidence"

In `ParametricTests.jsx`, the `GuardianWarning` component was rendered WITHOUT these required callbacks:

```jsx
// BEFORE (Broken)
{guardianReport && (
  <GuardianWarning
    guardianReport={guardianReport}
    data={columnData}
    alpha={alpha}
  />
)}
```

When users clicked an alternative test, line 417 in GuardianWarning.jsx tried to call `onSelectAlternative(test)`, but since the prop was undefined, it threw the error.

### Fix Applied

Added handler functions and passed them as props:

```jsx
// AFTER (Fixed)
{guardianReport && (
  <GuardianWarning
    guardianReport={guardianReport}
    data={columnData}
    alpha={alpha}
    onProceed={() => {
      console.log('[ParametricTests] User chose to proceed despite warnings');
      setIsTestBlocked(false);
    }}
    onSelectAlternative={handleSelectAlternative}
    onViewEvidence={handleViewEvidence}
    educationalMode={true}
  />
)}
```

The `handleSelectAlternative` function provides user guidance:

```jsx
const handleSelectAlternative = (alternativeTest) => {
  console.log('[ParametricTests] Alternative test selected:', alternativeTest);
  setSelectedAlternative(alternativeTest);

  const testDisplayNames = {
    'bootstrap': 'Bootstrap Test',
    'permutation_test': 'Permutation Test',
    'mann_whitney': 'Mann-Whitney U Test',
    'wilcoxon': 'Wilcoxon Signed-Rank Test',
    'kruskal_wallis': 'Kruskal-Wallis H Test',
    'friedman': 'Friedman Test'
  };

  const displayName = testDisplayNames[alternativeTest] ||
    alternativeTest.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  alert(`Alternative Test Selected: ${displayName}\n\nTo use this non-parametric alternative:\n1. Navigate to "Non-Parametric Tests" in the Statistical Analysis module\n2. Select "${displayName}" from the available tests\n3. Use the same data columns for analysis\n\nNon-parametric tests don't assume normal distribution and are robust to violations detected by Guardian.`);
};
```

---

## Bug #2: Visual Evidence Not Showing

### Symptoms
- Clicking "Visual Evidence" button had no visible effect
- No modal, no plots, no feedback to user
- Button appeared when `visual_evidence` object had data, but clicking did nothing

### Root Cause Analysis

The `onViewEvidence` callback was not passed to `GuardianWarning`, so clicking the button called `undefined()`.

Additionally, even if the callback existed, there was no UI component to display the diagnostic plots (Q-Q plots, histograms, etc.).

### Fix Applied

1. **Added handler function:**
```jsx
const handleViewEvidence = (evidence) => {
  console.log('[ParametricTests] View evidence requested:', evidence);
  setShowVisualEvidence(true);
};

const handleCloseVisualEvidence = () => {
  setShowVisualEvidence(false);
};
```

2. **Added data preparation for VisualEvidence component:**
```jsx
const visualEvidenceData = useMemo(() => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);
  const numericColumns = columns.filter(col => {
    const values = data.map(row => parseFloat(row[col]));
    return values.some(v => !isNaN(v));
  });

  return {
    data: data,
    columns: numericColumns
  };
}, [data]);
```

3. **Added Dialog component with VisualEvidence:**
```jsx
<Dialog
  open={showVisualEvidence}
  onClose={handleCloseVisualEvidence}
  maxWidth="lg"
  fullWidth
  PaperProps={{
    sx: {
      minHeight: '70vh',
      maxHeight: '90vh'
    }
  }}
>
  <DialogTitle sx={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    bgcolor: 'primary.main',
    color: 'primary.contrastText'
  }}>
    <Typography variant="h6">
      📊 Visual Evidence - Assumption Diagnostics
    </Typography>
    <IconButton onClick={handleCloseVisualEvidence} sx={{ color: 'inherit' }}>
      <CloseIcon />
    </IconButton>
  </DialogTitle>
  <DialogContent sx={{ p: 3 }}>
    {visualEvidenceData ? (
      <VisualEvidence
        data={visualEvidenceData}
        testType={testType}
        guardianReport={guardianReport}
      />
    ) : (
      <Alert severity="info" sx={{ mt: 2 }}>
        No data available for visualization.
      </Alert>
    )}
  </DialogContent>
  <DialogActions sx={{ p: 2, bgcolor: 'grey.100' }}>
    <Button onClick={handleCloseVisualEvidence} variant="contained">
      Close
    </Button>
  </DialogActions>
</Dialog>
```

---

## Files Modified

### Primary File: `/frontend/src/components/statistical-analysis/statistical-tests/ParametricTests.jsx`

**Changes Summary:**

| Line Range | Change Type | Description |
|------------|-------------|-------------|
| 12-40 | Import | Added Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton, CloseIcon |
| 66 | Import | Added VisualEvidence component import |
| 89-90 | State | Added `selectedAlternative` and `showVisualEvidence` state variables |
| 342-398 | Functions | Added `handleSelectAlternative`, `handleViewEvidence`, `handleCloseVisualEvidence`, and `visualEvidenceData` |
| 628-640 | Props | Updated GuardianWarning with all required callback props |
| 1226-1276 | UI | Added Visual Evidence Dialog component |

### Full Diff of Key Changes:

```diff
// Imports added
+ import {
+   Dialog,
+   DialogTitle,
+   DialogContent,
+   DialogActions,
+   Button,
+   IconButton
+ } from '@mui/material';
+ import CloseIcon from '@mui/icons-material/Close';
+ import VisualEvidence from '../../VisualEvidence';

// State variables added
+ const [selectedAlternative, setSelectedAlternative] = useState(null);
+ const [showVisualEvidence, setShowVisualEvidence] = useState(false);

// GuardianWarning props updated
- <GuardianWarning
-   guardianReport={guardianReport}
-   data={columnData}
-   alpha={alpha}
- />
+ <GuardianWarning
+   guardianReport={guardianReport}
+   data={columnData}
+   alpha={alpha}
+   onProceed={() => {
+     console.log('[ParametricTests] User chose to proceed despite warnings');
+     setIsTestBlocked(false);
+   }}
+   onSelectAlternative={handleSelectAlternative}
+   onViewEvidence={handleViewEvidence}
+   educationalMode={true}
+ />
```

---

## Component Architecture Reference

### GuardianWarning Component Props

Located at: `/frontend/src/components/Guardian/GuardianWarning.jsx`

```jsx
const GuardianWarning = ({
  guardianReport,      // Required: The Guardian validation report object
  onProceed,           // Optional: Callback when "Proceed with Test" clicked
  onSelectAlternative, // Optional: Callback when alternative test selected
  onViewEvidence,      // Optional: Callback when "Visual Evidence" clicked
  educationalMode,     // Optional: Show educational explanations (default: false)
  data,                // Optional: Data array for PDF/JSON export
  alpha,               // Optional: Significance level for export
  onTransformComplete  // Optional: Callback when data transformation applied
}) => { ... }
```

### VisualEvidence Component Props

Located at: `/frontend/src/components/VisualEvidence.jsx`

```jsx
const VisualEvidence = ({
  data,           // Required: { data: [], columns: [] }
  testType,       // Optional: Type of statistical test
  guardianReport  // Optional: Guardian report for requirements display
}) => { ... }
```

Available diagnostic plots:
- Q-Q Plot (normality assessment)
- Histogram with normal curve overlay
- Scatter plot with regression line
- Box plot with outlier detection
- Residual plot

---

## Testing Instructions

### Test Bug Fix #1 (Alternative Tests)

1. Navigate to: Statistical Analysis → Parametric Tests
2. Load data file: `DEMO_ONLY_NOT_FOR_PAPER/02_anova/drug_efficacy_clean.csv`
3. Select: Test Type = "One-way ANOVA"
4. Configure: Data Column = `pain_reduction`, Group Column = `drug_group`
5. Wait for Guardian to analyze assumptions
6. If Guardian shows violations, click "View Alternatives (3)"
7. Click any alternative test (Bootstrap, Permutation Test, Mann Whitney)
8. **Expected:** Alert dialog with guidance appears (no error)

### Test Bug Fix #2 (Visual Evidence)

1. Follow steps 1-5 above
2. Click "Visual Evidence" button
3. **Expected:** Modal opens with diagnostic plots
4. Use tabs to switch between: Q-Q Plot, Histogram, Scatter Plot, Box Plot, Residual Plot
5. Click "Close" to dismiss modal

---

## Related Components (For Future Reference)

Other test components that already have proper callback implementations:

| Component | File Path | Status |
|-----------|-----------|--------|
| NonParametricTests | `/frontend/src/components/statistical-analysis/statistical-tests/NonParametricTests.jsx` | ✅ Has callbacks |
| CategoricalTests | `/frontend/src/components/statistical-analysis/statistical-tests/CategoricalTests.jsx` | ✅ Has callbacks |
| CorrelationTests | `/frontend/src/components/statistical-analysis/statistical-tests/CorrelationTests.jsx` | ✅ Has callbacks |
| NormalityTests | `/frontend/src/components/statistical-analysis/statistical-tests/NormalityTests.jsx` | ⚠️ Check needed |

---

## Previous Session Context (From Earlier Today)

### Expert Mode Fix (Applied Earlier)

Before this session, the Expert Mode toggle wasn't working in ParametricTests.jsx. The fix was:

```jsx
// Added import
import { useSettings } from '../../../context/SettingsContext';

// Added hook inside component
const { expertMode, shouldBlockTest } = useSettings();

// Changed blocking logic
- setIsTestBlocked(!report.can_proceed);
+ setIsTestBlocked(!expertMode && !report.can_proceed);

// Added expertMode to useEffect dependencies
}, [testType, columnData, columnData2, groupedData, alpha, data, expertMode]);
```

This ensures that when Expert Mode is enabled, tests are not blocked even if Guardian finds violations (only warnings are shown).

---

## Demo Data Reference

For demonstrations, use files from `DEMO_ONLY_NOT_FOR_PAPER/` directory:

| Demo | File | Description |
|------|------|-------------|
| ANOVA | `02_anova/drug_efficacy_clean.csv` | 3 groups (Placebo, LowDose, HighDose), 15 per group |

**Important:** These are SIMULATED datasets for demos only. The JSS paper uses REAL datasets (Fisher's Iris, UCI Wine Quality, etc.).

---

## Session Metadata

- **Claude Model:** Opus 4.5
- **Working Directory:** `/Users/vishalbharti/StickForStats_v1.0_Production/frontend`
- **Git Branch:** main
- **Servers:** Backend on :8000, Frontend on :3000
- **Network IP:** 192.168.41.3

---

## Future Improvements (Not Implemented)

1. **Auto-switch to alternative test:** Instead of showing an alert, could automatically navigate to NonParametricTests with the selected test pre-configured
2. **Inline visual evidence:** Could show plots inline instead of in a modal
3. **Better transformation wizard integration:** The "Fix Data" button exists but transformation workflow could be improved

---

*Document created: February 7, 2026*
*Last updated: February 7, 2026*
