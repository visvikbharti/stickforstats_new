# Transformation Wizard - Technical Architecture

**Date:** October 26, 2025
**Status:** 🏗️ **IN DESIGN**
**Goal:** Help users fix assumption violations through automatic data transformation
**Scientific Value:** ⭐⭐⭐⭐⭐ **MAXIMUM**

---

## 🎯 Vision

**Current Guardian:** "Your data violates normality. Here are alternatives."
**Guardian + Transformation Wizard:** "Your data violates normality. Let me fix it for you. *Click to transform*"

### User Experience Flow:
```
1. Upload data →
2. Select test →
3. Guardian detects violation →
4. User clicks "Fix Data" →
5. Wizard suggests transformation →
6. Shows Before/After Q-Q plots →
7. User approves →
8. Data transformed →
9. Re-validated →
10. Test proceeds ✅
```

---

## 🏗️ System Architecture

### Three-Layer Design:
```
┌─────────────────────────────────────────────┐
│           Frontend (React)                   │
│  ┌─────────────────────────────────────┐   │
│  │  TransformationWizard.jsx           │   │
│  │  - Multi-step wizard UI             │   │
│  │  - Before/After visualizations      │   │
│  │  - Transformation selection         │   │
│  │  - Code export                      │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓ API Call
┌─────────────────────────────────────────────┐
│           Service Layer (API)                │
│  ┌─────────────────────────────────────┐   │
│  │  TransformationService.js           │   │
│  │  - suggestTransformation()          │   │
│  │  - applyTransformation()            │   │
│  │  - validateTransformation()         │   │
│  │  - exportCode()                     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
                    ↓ HTTP
┌─────────────────────────────────────────────┐
│           Backend (Django + Python)          │
│  ┌─────────────────────────────────────┐   │
│  │  transformation_engine.py           │   │
│  │  - TransformationEngine class       │   │
│  │  - Statistical transformations      │   │
│  │  - Validation logic                 │   │
│  │  - Code generation                  │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │  views.py (endpoints)               │   │
│  │  - /suggest-transformation/         │   │
│  │  - /apply-transformation/           │   │
│  │  - /validate-transformation/        │   │
│  │  - /export-transformation-code/     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

---

## 📊 Transformations Supported

### 1. Log Transformation
**Use Case:** Right-skewed data (long tail on right)
**Formula:** `y = log(x)` or `y = log(x + 1)` (if zeros present)
**Suitable For:** Exponential growth, income, population data
**Improves:** Skewness, heavy right tails

### 2. Square Root Transformation
**Use Case:** Count data, moderately right-skewed
**Formula:** `y = √x` or `y = √(x + 0.5)` (if zeros)
**Suitable For:** Counts, rates, Poisson-distributed data
**Improves:** Moderate skewness, variance stabilization

### 3. Box-Cox Transformation
**Use Case:** General-purpose, finds optimal lambda
**Formula:**
```
y = (x^λ - 1) / λ  if λ ≠ 0
y = log(x)         if λ = 0
```
**Suitable For:** Any continuous positive data
**Improves:** Normality, linearity, homoscedasticity
**Power:** Automatically finds best transformation parameter

### 4. Inverse Transformation
**Use Case:** Left-skewed data (long tail on left)
**Formula:** `y = 1/x` or `y = 1/(x + c)`
**Suitable For:** Time-to-event, hazard rates
**Improves:** Left skewness

### 5. Rank Transformation (Normal Scores)
**Use Case:** Severe non-normality, outliers
**Formula:** Convert to ranks → map to standard normal quantiles
**Suitable For:** Any distribution
**Improves:** Strong guarantee of normality
**Note:** Non-parametric alternative

---

## 🔍 Transformation Suggestion Algorithm

### Decision Tree:
```
START: Analyze data characteristics
│
├─ Check for negative values
│  ├─ Yes → Rank transformation or add constant
│  └─ No → Continue
│
├─ Calculate skewness
│  ├─ Skewness > 1.0 (right-skewed)
│  │  ├─ Contains zeros → log(x+1)
│  │  └─ No zeros → log(x) or Box-Cox
│  │
│  ├─ Skewness < -1.0 (left-skewed)
│  │  └─ Inverse transformation
│  │
│  └─ |Skewness| < 1.0 but still non-normal
│     └─ Box-Cox (find optimal λ)
│
├─ Check kurtosis
│  ├─ Heavy tails → Consider robust transform
│  └─ Normal kurtosis → Continue
│
└─ Test transformation effectiveness
   ├─ Run Shapiro-Wilk on transformed data
   ├─ Compare p-values
   └─ Recommend best transformation
```

---

## 💻 Backend Implementation

### File: `/backend/core/guardian/transformation_engine.py`

```python
"""
Transformation Engine
=====================
Automatic data transformation for assumption violation fixes.

Author: StickForStats Development Team
Date: October 2025
"""

import numpy as np
from scipy import stats
from scipy.special import boxcox
from typing import Dict, Any, List, Tuple, Optional


class TransformationEngine:
    """
    Analyzes data and suggests/applies statistical transformations
    to fix assumption violations.
    """

    TRANSFORMATION_TYPES = [
        'log',
        'sqrt',
        'boxcox',
        'inverse',
        'rank'
    ]

    def suggest_transformation(self, data: np.ndarray,
                              violation_type: str) -> Dict[str, Any]:
        """
        Analyze data and suggest best transformation

        Parameters:
        -----------
        data : np.ndarray
            Original data with assumption violations
        violation_type : str
            Type of violation ('normality', 'variance', etc.)

        Returns:
        --------
        Dict with:
            - recommended: str (transformation name)
            - alternatives: List[str]
            - reason: str (why this transform)
            - expected_improvement: float
        """
        pass

    def apply_transformation(self, data: np.ndarray,
                           transform_type: str,
                           **kwargs) -> Dict[str, Any]:
        """
        Apply transformation to data

        Returns:
        --------
        Dict with:
            - transformed_data: np.ndarray
            - transformation: str
            - parameters: Dict
            - inverse_function: str (for reverting)
        """
        pass

    def validate_transformation(self, original_data: np.ndarray,
                               transformed_data: np.ndarray) -> Dict[str, Any]:
        """
        Check if transformation improved normality

        Returns:
        --------
        Dict with:
            - original_p_value: float
            - transformed_p_value: float
            - improvement: bool
            - improvement_score: float (0-100)
        """
        pass

    def generate_code(self, transformation: str,
                     parameters: Dict,
                     language: str = 'python') -> str:
        """
        Generate reproducible code for transformation

        Parameters:
        -----------
        transformation : str
            Type of transformation applied
        parameters : Dict
            Transformation parameters
        language : str
            'python' or 'r'

        Returns:
        --------
        str : Executable code
        """
        pass
```

### API Endpoints:

**1. POST `/api/guardian/suggest-transformation/`**
```json
Request:
{
  "data": [23.5, 24.1, 22.8, ...],
  "violation_type": "normality"
}

Response:
{
  "recommended": "log",
  "alternatives": ["sqrt", "boxcox"],
  "reason": "Right-skewed distribution (skewness = 2.3)",
  "expected_improvement": 85.0,
  "current_p_value": 0.001,
  "estimated_p_value": 0.12
}
```

**2. POST `/api/guardian/apply-transformation/`**
```json
Request:
{
  "data": [23.5, 24.1, 22.8, ...],
  "transformation": "log",
  "add_constant": 1.0
}

Response:
{
  "transformed_data": [3.21, 3.22, 3.19, ...],
  "transformation": "log",
  "parameters": {"constant": 1.0},
  "inverse_formula": "exp(y) - 1"
}
```

**3. POST `/api/guardian/validate-transformation/`**
```json
Request:
{
  "original_data": [23.5, 24.1, ...],
  "transformed_data": [3.21, 3.22, ...]
}

Response:
{
  "original_p_value": 0.001,
  "transformed_p_value": 0.15,
  "improvement": true,
  "improvement_score": 92.5,
  "still_violated": false,
  "shapiro_stat_before": 0.85,
  "shapiro_stat_after": 0.98
}
```

**4. POST `/api/guardian/export-transformation-code/`**
```json
Request:
{
  "transformation": "log",
  "parameters": {"constant": 1.0},
  "language": "python"
}

Response:
{
  "code": "import numpy as np\ntransformed = np.log(data + 1)",
  "language": "python"
}
```

---

## 🎨 Frontend Implementation

### Component: `/frontend/src/components/Guardian/TransformationWizard.jsx`

**Props:**
```jsx
<TransformationWizard
  open={wizardOpen}
  onClose={() => setWizardOpen(false)}
  data={currentData}
  violations={guardianResult.violations}
  onTransformComplete={(transformedData) => {
    setData(transformedData);
    setWizardOpen(false);
  }}
/>
```

**Wizard Steps:**

**Step 1: Analysis**
- Display current violations
- Show Q-Q plot and histogram of original data
- Display statistics (skewness, kurtosis, Shapiro-Wilk p-value)

**Step 2: Suggestion**
- Show recommended transformation
- Display reason for recommendation
- List alternative transformations
- Allow manual selection

**Step 3: Preview**
- Show Before/After Q-Q plots side-by-side
- Display transformed data statistics
- Show improvement score
- Highlight if still violated

**Step 4: Apply**
- Confirm transformation
- Apply to data
- Re-validate with Guardian
- Export transformation code

---

## 🔗 Integration with GuardianWarning

### Add "Fix Data" Button:

```jsx
// In GuardianWarning.jsx
const [wizardOpen, setWizardOpen] = useState(false);

// Add button to violation display
{result.hasViolations && (
  <Button
    variant="contained"
    color="primary"
    startIcon={<AutoFixHighIcon />}
    onClick={() => setWizardOpen(true)}
  >
    Fix Data (Transform)
  </Button>
)}

// Render wizard
<TransformationWizard
  open={wizardOpen}
  onClose={() => setWizardOpen(false)}
  data={data}
  violations={result.violations}
  onTransformComplete={handleTransformComplete}
/>
```

---

## 📈 Success Metrics

### Technical Metrics:
- **Transformation Accuracy:** 90%+ success rate in fixing violations
- **Response Time:** < 2 seconds for suggestion
- **UI Performance:** Smooth transitions, responsive plots

### User Metrics:
- **Adoption Rate:** % of users who click "Fix Data"
- **Success Rate:** % of transformations that fix violation
- **Time Saved:** Compare manual vs. wizard transformation time

### Scientific Metrics:
- **Normality Improvement:** Average p-value increase
- **False Negative Rate:** % of transformations that don't actually help
- **Reversibility:** User can always revert to original data

---

## 🎓 Educational Value

### What Users Learn:
1. **When to transform:** Not all violations need transformation
2. **Which transformation:** Match transformation to data characteristics
3. **How transformations work:** Mathematical formulas and interpretations
4. **Reproducibility:** Export code for methods sections
5. **Limitations:** When transformation isn't appropriate

---

## 🚀 Implementation Plan

### Phase 1: Backend Engine (2-3 hours)
1. Create `transformation_engine.py`
2. Implement 5 transformations
3. Add suggestion algorithm
4. Create validation logic
5. Implement code generation

### Phase 2: API Endpoints (1 hour)
1. Add 4 endpoints to `views.py`
2. Update `urls.py`
3. Test endpoints

### Phase 3: Frontend Service (1 hour)
1. Create `TransformationService.js`
2. Add API methods
3. Add error handling

### Phase 4: Wizard Component (2-3 hours)
1. Create `TransformationWizard.jsx`
2. Build 4-step wizard UI
3. Add visualizations
4. Implement state management

### Phase 5: Integration (1 hour)
1. Update `GuardianWarning.jsx`
2. Test end-to-end flow
3. Handle edge cases

---

## 🎯 Next Steps

**READY TO IMPLEMENT:** Starting with backend transformation engine
**Estimated Total Time:** 7-9 hours
**Expected Impact:** GAME-CHANGER for user experience

---

**Let's transform how users handle assumption violations!** 🚀
