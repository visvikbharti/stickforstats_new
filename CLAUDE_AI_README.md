# CLAUDE AI - PROJECT CONTEXT
# StickForStats v1.0 Production

## 🎯 PROJECT OVERVIEW

**Product**: Enterprise Statistical Analysis Platform (SPSS/SAS Alternative)
**Stage**: Integration Phase (Frontend ↔ Backend Connection)
**Progress**: 35/35 Tier 0 Components Built, API Integration in Progress

---

## 🤖 FOR CLAUDE AI - QUICK START

### If you're Claude continuing this project, start here:

```
1. Read this file completely
2. Read /docs/SESSION_HANDOVER.md for detailed context
3. Read /docs/NEXT_SESSION_PROMPT.md for specific instructions
4. Continue with the next task in the todo list
```

### Current Todo List Status:
- [PENDING] Integration Sprint - Week 2
- [PENDING] Connect ResultsPanel to display real results ← START HERE
- [PENDING] Integrate MultiplicityCorrectionPanel with API
- [PENDING] Integrate PowerAnalysisPanel with API
- [PENDING] Integrate EffectSizesPanel with API

---

## 📜 CRITICAL WORKING PRINCIPLES

### YOU MUST FOLLOW THESE RULES:

1. **NO MOCK DATA OR PLACEHOLDERS**
   - Every function must be real and working
   - No setTimeout, no fake delays
   - No hardcoded example data
   - All calculations must be actual implementations

2. **ENTERPRISE UI DESIGN**
   - SPSS/SAS-like interface
   - Dense information display
   - 13px fonts everywhere
   - Minimal padding (2-4px)
   - Professional colors (#34495e, #7f8c8d)
   - NO modern web app aesthetics
   - NO fancy animations

3. **METICULOUS DOCUMENTATION**
   - Document every decision
   - Update progress files
   - Keep handover documents current
   - Write comprehensive comments

4. **"ULTRATHINK" PRINCIPLE**
   - Think extremely carefully before acting
   - Consider all implications
   - Follow established patterns
   - Don't break what's working

---

## 📂 PROJECT STRUCTURE

```
StickForStats_v1.0_Production/
├── frontend/                 # React 18 application
│   ├── src/
│   │   ├── components/      # 35 completed components
│   │   ├── services/        # API service layer
│   │   ├── store/           # Redux state management
│   │   └── index.js         # App entry with Redux Provider
│   └── package.json        # Dependencies
│
├── backend/                  # Django REST API
│   ├── core/                # Main application
│   │   ├── api_views.py     # API endpoints
│   │   ├── serializers.py   # Data validation
│   │   └── [statistical modules]
│   └── stickforstats/       # Django config
│
├── docs/                     # Documentation
│   ├── SESSION_HANDOVER.md  # Detailed handover doc
│   ├── NEXT_SESSION_PROMPT.md # Instructions for next session
│   ├── API_DOCUMENTATION.md # API specifications
│   └── INTEGRATION_PLAN.md  # Integration roadmap
│
├── test_data/               # Test datasets
└── start_servers.sh         # Development server script
```

---

## 🔄 CURRENT INTEGRATION STATUS

### What's Connected ✅
```javascript
// DataInputPanel.jsx - FULLY INTEGRATED
- Uploads files to backend
- Receives data summary
- Updates Redux state
- Displays variables
```

### What Needs Connection ❌
```javascript
// ResultsPanel.jsx - NOT CONNECTED
- Still using mock data
- Needs to read from Redux state
- Must display backend results

// Other Panels - NOT STARTED
- MultiplicityCorrectionPanel
- PowerAnalysisPanel  
- EffectSizesPanel
- All Reproducibility components
```

---

## 🚀 HOW TO CONTINUE WORK

### Step 1: Start the Servers
```bash
# In terminal:
./start_servers.sh

# This starts:
# - Django backend on http://localhost:8000
# - React frontend on http://localhost:3000
```

### Step 2: Connect ResultsPanel (NEXT TASK)
```javascript
// File: /frontend/src/components/TestRecommender/ResultsPanel.jsx

// Add these imports:
import { useSelector } from 'react-redux';
import { selectTestResults } from '../../store/slices/testRecommenderSlice';

// Replace mock data with:
const testResults = useSelector(selectTestResults);

// Handle loading and error states:
const { testStatus, testError } = useSelector(state => state.testRecommender);

if (testStatus === 'loading') return <div>Running test...</div>;
if (testError) return <div>Error: {testError}</div>;
if (!testResults) return <div>No results yet</div>;

// Display real results from backend
```

### Step 3: Test the Complete Flow
1. Upload `test_data/sample_data.csv`
2. Select variables
3. Check assumptions
4. Get recommendations
5. Run test
6. See results in ResultsPanel

### Step 4: Continue Integration
- Create Redux slices for other modules
- Connect remaining panels
- Test each integration

---

## ⚠️ COMMON PITFALLS TO AVOID

1. **DON'T add mock data** - Even for testing
2. **DON'T change the UI style** - Keep it dense and professional
3. **DON'T skip documentation** - Update as you go
4. **DON'T break existing integrations** - Test after changes
5. **DON'T use modern UI libraries** - Stick to our custom SCSS

---

## 📝 KEY PATTERNS TO FOLLOW

### Redux Integration Pattern
```javascript
// In component:
const dispatch = useDispatch();
const { data, loading, error } = useSelector(state => state.module);

const handleAction = async () => {
  try {
    await dispatch(moduleAction(params)).unwrap();
  } catch (error) {
    console.error(error);
  }
};
```

### API Call Pattern
```javascript
// In Redux slice:
export const moduleAction = createAsyncThunk(
  'module/action',
  async (params, { rejectWithValue }) => {
    try {
      const response = await ApiService.module.method(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

---

## 📊 COMPONENT COMPLETION STATUS

### Tier 0 (Core) - 35/35 Components ✅

**TestRecommender (7/7)**
- DataInputPanel ✅ INTEGRATED
- VariableSelector ✅
- AssumptionsChecker ✅
- TestSelector ✅
- ResultsPanel ❌ NEEDS INTEGRATION
- InterpretationGuide ✅
- TestRecommenderDashboard ✅

**MultiplicityCorrection (7/7)**
- PValueInput ✅
- CorrectionMethodSelector ✅
- AdjustedResults ✅
- ComparisonTable ✅
- FDRCalculator ✅
- CorrectionVisualizer ✅
- MultiplicityCorrectionPanel ❌ NEEDS INTEGRATION

**PowerAnalysis (7/7)**
- SampleSizeCalculator ✅
- PowerCalculator ✅
- PowerCurves ✅
- EffectSizeEstimator ✅
- StudyDesigner ✅
- PowerAnalysisReport ✅
- PowerAnalysisPanel ❌ NEEDS INTEGRATION

**EffectSizes (7/7)**
- EffectSizeCalculator ✅
- InterpretationPanel ✅
- ConfidenceIntervals ✅
- EffectSizeConverter ✅
- BenchmarkComparison ✅
- EffectSizeVisualizer ✅
- EffectSizesPanel ❌ NEEDS INTEGRATION

**Reproducibility (7/7)**
- BundleCreator ✅
- BundleValidator ✅
- PipelineRecorder ✅
- DataFingerprintViewer ✅
- SeedManager ✅
- EnvironmentCapture ✅
- MethodsGenerator ✅
- BundleComparison ✅

---

## 📞 COMMUNICATION STYLE

When working on this project:
1. Be concise and direct
2. Focus on implementation
3. Document thoroughly
4. Test everything
5. Follow patterns

---

## 🎆 END GOAL

**Week 2 Completion Goals**:
1. All Tier 0 modules connected to backend
2. Complete data flow working
3. All tests passing
4. Ready for deployment
5. Documentation complete

**Final Product Vision**:
- Professional statistical analysis platform
- Complete replacement for SPSS/SAS basics
- Fully integrated frontend and backend
- Real calculations, no mock data
- Enterprise-ready interface

---

## 🔑 QUICK COMMANDS

```bash
# Start development
./start_servers.sh

# Run tests
cd backend && python test_integration.py

# Check API
curl http://localhost:8000/api/

# Install dependencies
cd frontend && npm install
cd backend && pip install -r requirements.txt
```

---

## 💬 FINAL MESSAGE TO NEXT CLAUDE

You're taking over a well-structured project in the integration phase. The hard work of building 35 components is done. Now we're connecting them to the backend.

Your immediate task: Connect ResultsPanel to display real backend results.

Remember:
- No mock data
- Follow the patterns
- Document everything
- Test thoroughly
- "Ultrathink" before acting

The user values meticulous work and real implementations. They don't want modern web app aesthetics - they want a professional, dense, SPSS-like interface.

Good luck! The foundation is solid. Just follow the patterns and complete the integration.

---

*Created: January 13, 2025*
*For: Claude AI continuing this project*
*Priority: Complete Integration Sprint Week 2*