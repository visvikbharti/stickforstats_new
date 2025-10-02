# Integration Plan - Frontend/Backend Connection

## 🎯 Objective
Connect the completed Tier 0 frontend components with the backend services to create a working product.

## 📅 Timeline: 2 Weeks (Jan 13-27, 2025)

---

## Week 1: Core Integration

### Day 1-2: TestRecommender Integration ✅
- [x] Create API endpoints for test recommendation
- [x] Create frontend API service layer
- [x] Connect DataInputPanel to backend
- [ ] Connect ResultsPanel to display results

### Day 3-4: Data Flow Implementation ✅
- [x] Implement file upload handling
- [x] Add data validation layer
- [x] Create error handling system
- [x] Test with real CSV/Excel files

### Day 5: Testing & Debugging ✅
- [x] End-to-end testing of TestRecommender
- [x] API integration test suite created
- [x] Server startup script created
- [x] Comprehensive API documentation

## Week 2: Complete Integration

### Day 1-2: Redux State Management ✅
- [x] Create Redux actions for API calls
- [x] Implement async thunks
- [x] Add loading/error states
- [x] Connect DataInputPanel to Redux

### Day 3-4: Extend to Other Modules
- [ ] MultiplicityCorrectionPanel API
- [ ] PowerAnalysis API
- [ ] EffectSizes API
- [ ] Basic Reproducibility API

### Day 5: Deployment Preparation
- [ ] Docker configuration
- [ ] Environment setup
- [ ] Basic authentication
- [ ] Deploy demo version

---

## 📡 API Endpoints Structure

### TestRecommender Module
```
POST /api/test-recommender/upload-data
  Request: FormData with CSV/Excel file
  Response: { data_id, summary, variables }

POST /api/test-recommender/check-assumptions
  Request: { data_id, test_type }
  Response: { assumptions, violations, recommendations }

POST /api/test-recommender/recommend
  Request: { data_id, variables, hypothesis }
  Response: { recommended_tests, reasons, power }

POST /api/test-recommender/run-test
  Request: { data_id, test_type, parameters }
  Response: { results, statistics, p_values, effect_sizes }
```

### MultiplicityCorrection Module
```
POST /api/multiplicity/correct
  Request: { p_values, method, alpha }
  Response: { adjusted_p_values, significant, method_details }

GET /api/multiplicity/methods
  Response: { available_methods, descriptions }
```

### PowerAnalysis Module
```
POST /api/power/calculate
  Request: { test_type, effect_size, sample_size, alpha }
  Response: { power, curves, recommendations }

POST /api/power/sample-size
  Request: { test_type, effect_size, power, alpha }
  Response: { required_n, per_group, total }
```

### EffectSizes Module
```
POST /api/effect-sizes/calculate
  Request: { data, groups, type }
  Response: { effect_size, confidence_interval, interpretation }

POST /api/effect-sizes/convert
  Request: { value, from_type, to_type, sample_size }
  Response: { converted_value, formula }
```

### Reproducibility Module
```
POST /api/reproducibility/create-bundle
  Request: { analysis_id, include_data, include_env }
  Response: { bundle_id, fingerprint, download_url }

POST /api/reproducibility/validate-bundle
  Request: { bundle_file }
  Response: { valid, issues, reproducibility_score }
```

---

## 🔧 Technical Implementation

### Backend (Django)
1. **Serializers**: Pydantic models for validation
2. **Views**: Class-based views with DRF
3. **Authentication**: JWT tokens
4. **CORS**: Configured for frontend URL
5. **File Handling**: Temporary storage for uploads

### Frontend (React)
1. **API Service**: Axios with interceptors
2. **Redux**: Async actions with Redux Toolkit
3. **Error Handling**: Global error boundary
4. **Loading States**: Skeleton screens
5. **Data Caching**: Redux persist

### Data Flow
```
User Input (UI) 
  → Redux Action 
  → API Service 
  → Django Backend 
  → Statistical Computation 
  → Response 
  → Redux Reducer 
  → UI Update
```

---

## 🧪 Testing Strategy

### Unit Tests
- API endpoint tests
- Serializer validation tests
- Frontend service tests

### Integration Tests
- Complete workflow tests
- Data upload → Analysis → Results
- Error handling scenarios

### Performance Tests
- Large dataset handling (10MB+)
- Concurrent user simulations
- Response time benchmarks

---

## 📊 Success Metrics

### Week 1 Goals
- [ ] TestRecommender fully functional
- [ ] Real data processing working
- [ ] Error handling implemented
- [ ] 90% test coverage

### Week 2 Goals
- [ ] All Tier 0 modules connected
- [ ] Redux state management complete
- [ ] Demo deployed online
- [ ] Documentation complete

---

## 🚨 Risk Mitigation

### Potential Issues
1. **Calculation Mismatches**: Frontend/backend results differ
   - Solution: Centralize calculations in backend
   
2. **Performance**: Large datasets slow
   - Solution: Implement pagination, caching
   
3. **State Management**: Complex Redux state
   - Solution: Modular reducers, clear actions
   
4. **File Uploads**: Large files timeout
   - Solution: Chunked uploads, progress bars

---

## 📝 Documentation Requirements

1. **API Documentation**: OpenAPI/Swagger spec
2. **Frontend Services**: JSDoc comments
3. **Integration Guide**: Setup instructions
4. **User Guide**: How to use features
5. **Developer Guide**: Architecture overview

---

*Last Updated: January 13, 2025*
*Status: Active Development*
*Priority: CRITICAL*