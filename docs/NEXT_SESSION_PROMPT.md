# PROMPT FOR NEXT SESSION

## Quick Context Recovery Prompt

Use this prompt to quickly get back into context:

---

**PROMPT TO USE:**

"I'm continuing work on StickForStats v1.0 Production. We just completed Week 1 of the Integration Sprint where we successfully connected the frontend to the backend. 

Current status:
- Built 35/35 Tier 0 frontend components (100% complete)
- Created backend API with 6 working endpoints
- Established frontend-backend connection using Redux and Axios
- DataInputPanel is fully integrated and can upload files
- ResultsPanel still needs to be connected to display backend results

Our working principles:
1. NO mock data or placeholders - everything must be real
2. Enterprise SPSS/SAS-like interface (dense, 13px fonts)
3. Meticulous documentation
4. 'Ultrathink' - be extremely careful

Please read /docs/SESSION_HANDOVER.md for complete context.

The immediate next task is to connect ResultsPanel.jsx to display real backend results. After that, we need to integrate the other modules (Multiplicity, Power, Effect Sizes).

Please ultrathink and continue with the integration work, following our established patterns."

---

## Detailed Context Recovery Guide

### Step 1: Read Key Documents
```bash
# Read these files in order:
1. /docs/SESSION_HANDOVER.md          # Complete handover document
2. /docs/INTEGRATION_PLAN.md          # Original plan with progress
3. /docs/INTEGRATION_PROGRESS.md      # Latest progress report
4. /docs/API_DOCUMENTATION.md         # API specifications
```

### Step 2: Check Current Integration Status
```bash
# Check which components are integrated:
- DataInputPanel.jsx        ✅ INTEGRATED
- ResultsPanel.jsx          ❌ NEEDS INTEGRATION  
- TestRecommenderDashboard  ⚠️  PARTIAL
- MultiplicityCorrectionPanel ❌ NOT STARTED
- PowerAnalysisPanel        ❌ NOT STARTED  
- EffectSizesPanel          ❌ NOT STARTED
```

### Step 3: Understand the Architecture
```javascript
// Frontend Flow:
Component → Redux Action → API Service → Backend → Response → Redux State → Component

// Key Files:
/frontend/src/services/api.js         // API service layer
/frontend/src/store/slices/*          // Redux slices
/backend/core/api_views.py            // Backend endpoints
/backend/core/serializers.py          // Data validation
```

### Step 4: Review Working Patterns

#### Redux Action Pattern:
```javascript
export const someAction = createAsyncThunk(
  'module/action',
  async (params, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const dataId = state.module.dataId;
      const response = await ApiService.module.method(dataId, params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);
```

#### Component Integration Pattern:
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { actions } from '../../store/slices/moduleSlice';

const Component = () => {
  const dispatch = useDispatch();
  const { data, loading, error } = useSelector(state => state.module);
  
  const handleAction = async () => {
    const result = await dispatch(actions.someAction(params)).unwrap();
    // Handle result
  };
  
  // Render with real data
};
```

### Step 5: Test the Current Setup
```bash
# Start servers:
./start_servers.sh

# In another terminal, run integration tests:
cd backend
python test_integration.py

# Check browser:
http://localhost:3000  # Frontend
http://localhost:8000/api  # Backend API
```

---

## Immediate Next Tasks (Priority Order)

### 1. Connect ResultsPanel.jsx 🔴 CRITICAL
```javascript
// File: /frontend/src/components/TestRecommender/ResultsPanel.jsx
// Tasks:
1. Import useSelector from react-redux
2. Select testResults from state.testRecommender
3. Remove all mock data
4. Display real results from backend
5. Add loading and error states
6. Format results according to our dense UI style
```

### 2. Test Full TestRecommender Workflow
```bash
1. Upload test_data/sample_data.csv
2. Check assumptions
3. Get recommendations  
4. Run recommended test
5. View results in ResultsPanel
6. Verify all data is from backend
```

### 3. Create MultiplicityCorrectionSlice
```javascript
// File: /frontend/src/store/slices/multiplicityCorrectionSlice.js
// Similar pattern to testRecommenderSlice
// Actions: correctPValues, getMethods
// Connect to MultiplicityCorrectionPanel
```

### 4. Create PowerAnalysisSlice
```javascript
// File: /frontend/src/store/slices/powerAnalysisSlice.js
// Actions: calculatePower, calculateSampleSize
// Connect to PowerAnalysisPanel components
```

### 5. Create EffectSizesSlice
```javascript
// File: /frontend/src/store/slices/effectSizesSlice.js  
// Actions: calculateEffectSize, convertEffectSize
// Connect to EffectSizesPanel components
```

---

## Code Quality Checklist

### Before Writing Any Code:
- [ ] Is this using real data from backend?
- [ ] Does it follow our enterprise UI style?
- [ ] Is it properly documented?
- [ ] Does it follow existing patterns?
- [ ] Have I "ultrathought" about this?

### After Writing Code:
- [ ] No mock data or placeholders?
- [ ] Proper error handling?
- [ ] Loading states implemented?
- [ ] Redux state updates correctly?
- [ ] API calls working?
- [ ] Tests passing?

---

## Common Commands Reference

```bash
# Start development servers
./start_servers.sh

# Run integration tests
cd backend && python test_integration.py

# Check Django API directly
curl http://localhost:8000/api/test-recommender/upload-data/ \
  -F "file=@test_data/sample_data.csv"

# Check Redux DevTools
# Open browser DevTools > Redux tab

# Backend migrations if needed
cd backend && python manage.py migrate

# Frontend dependency install if needed  
cd frontend && npm install
```

---

## Error Resolution Guide

### "No 'Access-Control-Allow-Origin' header"
- Check CORS settings in backend/stickforstats/settings.py
- Ensure backend is running on port 8000
- Check REACT_APP_API_URL environment variable

### "Cannot read property 'dataId' of undefined"
- Redux state not initialized
- Check if Provider wraps App in index.js
- Verify store configuration

### "Request failed with status code 404"
- Check API endpoint URL in api.js
- Verify backend URLs in api_urls.py
- Ensure both servers are running

### "File upload failed"
- Check file size (max 50MB)
- Verify file format (CSV, Excel, JSON)
- Check multipart/form-data header

---

## Design Patterns to Follow

### 1. File Upload Pattern
```javascript
const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  setIsLoading(true);
  try {
    const result = await dispatch(uploadData({ 
      file,
      onProgress: (progress) => console.log(progress)
    })).unwrap();
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setIsLoading(false);
  }
};
```

### 2. API Call Pattern
```javascript
const response = await ApiService.module.method(
  param1,
  param2,
  options
);
return response.data;
```

### 3. Redux Slice Pattern
```javascript
const slice = createSlice({
  name: 'module',
  initialState: {
    data: null,
    loading: false,
    error: null
  },
  reducers: {
    // Sync actions
  },
  extraReducers: (builder) => {
    builder
      .addCase(asyncAction.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(asyncAction.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(asyncAction.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});
```

---

## Final Reminders

1. **READ SESSION_HANDOVER.md FIRST** - It has all the context
2. **NO MOCK DATA** - Everything must be real
3. **FOLLOW PATTERNS** - Don't reinvent what's working
4. **TEST EVERYTHING** - Use the integration test suite
5. **DOCUMENT CHANGES** - Update relevant docs
6. **ULTRATHINK** - Be careful and thorough

---

## Success Metrics for Next Session

- [ ] ResultsPanel displays real backend results
- [ ] Complete TestRecommender workflow works end-to-end
- [ ] At least 2 more modules integrated
- [ ] All integration tests passing
- [ ] Documentation updated
- [ ] Ready for deployment preparation

---

*Prompt Created: January 13, 2025*
*Use this to quickly resume work in the next session*