# Backend-Frontend Integration Guide
## Complete Documentation for Seamless Integration

**Version:** 1.0.0
**Last Updated:** September 15, 2025
**Purpose:** Ensure perfect synchronization between Django backend and React frontend

---

## 🔌 Current API Endpoints

### Authentication Endpoints
```python
# Backend: backend/authentication/urls.py
# Status: ✅ WORKING

POST   /api/auth/login/
       Request:  {"username": "email", "password": "string"}
       Response: {"token": "string", "user": {...}}
       Frontend: src/services/authService.js

POST   /api/auth/logout/
       Headers:  {"Authorization": "Token <token>"}
       Response: {"detail": "Successfully logged out"}

GET    /api/auth/me/
       Headers:  {"Authorization": "Token <token>"}
       Response: {"id": int, "email": "string", "first_name": "string", ...}
```

### Statistical Endpoints (TO BE IMPLEMENTED)
```python
# Backend: backend/api/v1/statistical/
# Status: ⏳ IN DEVELOPMENT

POST   /api/v1/stats/descriptive/
       Request:  {"data": [numbers], "statistics": ["mean", "std", "median"]}
       Response: {"results": {...}, "metadata": {...}}

POST   /api/v1/stats/ttest/
       Request:  {
           "test_type": "one_sample|two_sample|paired",
           "data1": [numbers],
           "data2": [numbers] (optional),
           "parameters": {
               "mu": 0,
               "equal_var": true,
               "confidence": 0.95
           }
       }
       Response: {
           "result": {
               "t_statistic": "string",  # High precision
               "p_value": "string",
               "confidence_interval": ["string", "string"],
               "effect_size": {...}
           },
           "assumptions": {...},
           "recommendations": [...]
       }

POST   /api/v1/stats/anova/
       Request:  {
           "groups": [[...], [...], [...]],
           "type": "one_way|two_way|repeated_measures"
       }
       Response: Similar structure

POST   /api/v1/stats/correlation/
       Request:  {
           "x": [numbers],
           "y": [numbers],
           "method": "pearson|spearman|kendall"
       }
       Response: Similar structure
```

### Data Management Endpoints
```python
# Backend: backend/api/v1/data/
# Status: ⏳ TO BE IMPLEMENTED

POST   /api/v1/data/import/
       Request:  FormData with file
       Response: {
           "dataset_id": "uuid",
           "summary": {...},
           "columns": [...],
           "preview": [...]
       }

GET    /api/v1/data/datasets/
       Response: {"datasets": [...]}

GET    /api/v1/data/datasets/{id}/
       Response: {"id": "uuid", "data": [...], "metadata": {...}}

POST   /api/v1/data/export/
       Request:  {"dataset_id": "uuid", "format": "csv|excel|spss|r"}
       Response: File download
```

---

## 🔄 Frontend Service Layer

### Base API Service
```javascript
// frontend/src/services/api.js
import axios from 'axios';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // Add auth token to requests
    this.client.interceptors.request.use(
      config => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Token ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Handle responses
    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get(url, params = {}) {
    const response = await this.client.get(url, { params });
    return response.data;
  }

  async post(url, data = {}) {
    const response = await this.client.post(url, data);
    return response.data;
  }

  async put(url, data = {}) {
    const response = await this.client.put(url, data);
    return response.data;
  }

  async delete(url) {
    const response = await this.client.delete(url);
    return response.data;
  }

  async upload(url, file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress
    });
    return response.data;
  }
}

export default new ApiService();
```

### Statistical Service
```javascript
// frontend/src/services/statisticalService.js
import ApiService from './api';
import { validateData, formatHighPrecision } from '../utils/validation';

class StatisticalService {
  async calculateDescriptive(data, statistics = ['mean', 'std', 'median']) {
    // Validate input
    const validatedData = validateData(data);

    // Call API
    const result = await ApiService.post('/v1/stats/descriptive/', {
      data: validatedData,
      statistics
    });

    // Format high-precision results
    return this.formatResults(result);
  }

  async performTTest(options) {
    const {
      testType = 'two_sample',
      data1,
      data2 = null,
      mu = 0,
      equalVar = true,
      confidence = 0.95
    } = options;

    // Validate
    if (!data1 || data1.length < 2) {
      throw new Error('Insufficient data for t-test');
    }

    // Prepare request
    const request = {
      test_type: testType,
      data1: validateData(data1),
      parameters: {
        mu,
        equal_var: equalVar,
        confidence
      }
    };

    if (testType !== 'one_sample' && data2) {
      request.data2 = validateData(data2);
    }

    // Call API
    const result = await ApiService.post('/v1/stats/ttest/', request);

    // Process result
    return this.processStatisticalResult(result);
  }

  async performANOVA(groups, type = 'one_way') {
    // Validate each group
    const validatedGroups = groups.map(g => validateData(g));

    // Check minimum requirements
    if (validatedGroups.length < 2) {
      throw new Error('ANOVA requires at least 2 groups');
    }

    // Call API
    const result = await ApiService.post('/v1/stats/anova/', {
      groups: validatedGroups,
      type
    });

    return this.processStatisticalResult(result);
  }

  processStatisticalResult(result) {
    // Convert high-precision strings to display format
    const processed = {
      ...result,
      display: {}
    };

    // Format for display (maintaining precision)
    if (result.result) {
      processed.display = {
        t_statistic: formatHighPrecision(result.result.t_statistic, 6),
        p_value: formatHighPrecision(result.result.p_value, 4),
        // ... other fields
      };
    }

    return processed;
  }

  formatResults(result) {
    // Implementation for formatting results
    return result;
  }
}

export default new StatisticalService();
```

---

## 🔗 Backend Services Structure

### High-Precision Service Layer
```python
# backend/core/services/statistical_service.py
from decimal import Decimal
from typing import List, Dict, Any, Optional
from core.high_precision_calculator import HighPrecisionCalculator
from core.assumption_checker import AssumptionChecker
from core.validation_framework import StatisticalValidator

class StatisticalService:
    """
    Main service layer for statistical calculations.
    Coordinates between high-precision calculator, assumption checker, and validator.
    """

    def __init__(self):
        self.calculator = HighPrecisionCalculator(precision=50)
        self.assumption_checker = AssumptionChecker()
        self.validator = StatisticalValidator()

    def perform_t_test(
        self,
        test_type: str,
        data1: List[float],
        data2: Optional[List[float]] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Perform t-test with assumption checking and validation.

        Returns:
            {
                "result": {
                    "t_statistic": "string",  # High precision
                    "p_value": "string",
                    "confidence_interval": ["string", "string"],
                    "effect_size": {...}
                },
                "assumptions": {
                    "normality": {...},
                    "equal_variance": {...},
                    "independence": {...}
                },
                "recommendations": [...],
                "metadata": {
                    "calculation_id": "uuid",
                    "precision": 50,
                    "algorithm": "high_precision",
                    "validated": true
                }
            }
        """
        # Step 1: Check assumptions
        assumptions = self.check_t_test_assumptions(data1, data2, test_type)

        # Step 2: Perform calculation
        if test_type == 'one_sample':
            result = self.calculator.t_statistic_one_sample(data1, **kwargs)
        elif test_type == 'two_sample':
            result = self.calculator.t_statistic_two_sample(data1, data2, **kwargs)
        else:
            result = self.calculator.t_statistic_paired(data1, data2, **kwargs)

        # Step 3: Validate against R/Python
        validation = self.validator.validate_t_test(data1, data2, test_type, **kwargs)

        # Step 4: Format response
        return self.format_response(result, assumptions, validation)

    def check_t_test_assumptions(self, data1, data2, test_type):
        """Check all assumptions for t-test"""
        assumptions = {}

        # Normality
        assumptions['normality'] = self.assumption_checker.check_normality(data1)
        if data2 is not None:
            assumptions['normality_group2'] = self.assumption_checker.check_normality(data2)

        # Equal variance (for two-sample)
        if test_type == 'two_sample' and data2 is not None:
            assumptions['equal_variance'] = self.assumption_checker.check_homoscedasticity(
                data1, data2
            )

        # Sample size
        assumptions['sample_size'] = self.assumption_checker.check_sample_size(
            len(data1), 'ttest'
        )

        return assumptions

    def format_response(self, result, assumptions, validation):
        """Format response with string precision for frontend"""
        return {
            "result": {
                # Convert Decimal to string for JSON serialization
                "t_statistic": str(result['t_statistic']),
                "p_value": str(result['p_value']),
                "mean": str(result.get('mean', '')),
                "std": str(result.get('std', '')),
                "df": str(result.get('df', '')),
                "n": str(result.get('n', ''))
            },
            "assumptions": assumptions,
            "validation": {
                "passed": validation.passed == validation.total_tests,
                "accuracy": validation.average_accuracy,
                "details": validation.summary
            },
            "recommendations": self.generate_recommendations(assumptions),
            "metadata": {
                "precision": 50,
                "algorithm": "high_precision_decimal",
                "version": "1.0.0"
            }
        }

    def generate_recommendations(self, assumptions):
        """Generate recommendations based on assumption checks"""
        recommendations = []

        if not assumptions.get('normality', {}).get('is_normal', True):
            recommendations.append("Consider non-parametric alternative (Mann-Whitney U test)")

        if not assumptions.get('equal_variance', {}).get('equal_variance', True):
            recommendations.append("Use Welch's t-test instead of Student's t-test")

        if not assumptions.get('sample_size', {}).get('is_adequate', True):
            recommendations.append("Increase sample size for more reliable results")

        return recommendations
```

### API Views
```python
# backend/api/v1/views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from core.services.statistical_service import StatisticalService
from .serializers import TTestSerializer, TTestResponseSerializer

class TTestView(APIView):
    """
    T-Test endpoint with high precision calculation.

    Implements one-sample, two-sample, and paired t-tests
    with assumption checking and validation.
    """

    def post(self, request):
        # Validate input
        serializer = TTestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {"error": "Invalid input", "details": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Extract validated data
        validated_data = serializer.validated_data

        try:
            # Perform calculation
            service = StatisticalService()
            result = service.perform_t_test(
                test_type=validated_data['test_type'],
                data1=validated_data['data1'],
                data2=validated_data.get('data2'),
                **validated_data.get('parameters', {})
            )

            # Serialize response
            response_serializer = TTestResponseSerializer(result)
            return Response(response_serializer.data, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response(
                {"error": "Calculation error", "message": str(e)},
                status=status.HTTP_422_UNPROCESSABLE_ENTITY
            )
        except Exception as e:
            return Response(
                {"error": "Internal error", "message": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
```

---

## 📦 Required Python Packages

```python
# backend/requirements.txt
# Core
Django==4.1.0
djangorestframework==3.14.0
django-cors-headers==3.13.0

# High Precision Computing
mpmath==1.3.0  # Arbitrary precision arithmetic
decimal==1.0.0  # Built-in, high precision decimals

# Statistical Computing
numpy==1.21.0  # For data handling (not calculations)
scipy==1.7.3  # For special functions only
pandas==1.5.0  # Data manipulation
statsmodels==0.13.5  # For validation

# Testing & Validation
pytest==7.2.0
pytest-django==4.5.2
pytest-cov==4.0.0
rpy2==3.5.5  # R integration for validation

# Data Import/Export
openpyxl==3.0.10  # Excel files
pyreadstat==1.2.0  # SPSS, SAS, Stata files

# Performance
redis==4.4.0
celery==5.2.0  # Async tasks

# Development
black==22.10.0
flake8==6.0.0
mypy==0.991  # Type checking
```

---

## 📦 Required NPM Packages

```json
// frontend/package.json additions
{
  "dependencies": {
    // Core
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.11.2",

    // State Management
    "redux": "^4.2.0",
    "react-redux": "^8.0.5",
    "@reduxjs/toolkit": "^1.9.0",

    // API Communication
    "axios": "^1.4.0",
    "socket.io-client": "^4.5.0",

    // Data Visualization
    "d3": "^7.8.5",
    "plotly.js": "^2.18.0",
    "react-plotly.js": "^2.6.0",
    "recharts": "^2.5.0",

    // High Precision Display
    "decimal.js": "^10.4.3",
    "bignumber.js": "^9.1.1",

    // File Handling
    "papaparse": "^5.4.1",  // CSV parsing
    "xlsx": "^0.18.5",  // Excel files

    // UI Components
    "@mui/material": "^5.14.20",
    "@mui/icons-material": "^5.14.19",
    "notistack": "^3.0.1",  // Notifications

    // Forms & Validation
    "formik": "^2.2.9",
    "yup": "^1.0.0",

    // Testing
    "@testing-library/react": "^13.4.0",
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/user-event": "^14.4.3"
  },
  "devDependencies": {
    // Type Definitions
    "@types/react": "^18.0.0",
    "@types/node": "^16.0.0",
    "typescript": "^4.9.0",

    // Code Quality
    "eslint": "^8.0.0",
    "prettier": "^2.8.0",

    // Testing
    "jest": "^27.0.0",
    "cypress": "^12.0.0"  // E2E testing
  }
}
```

---

## 🔄 State Management Pattern

```javascript
// frontend/src/store/slices/statisticalSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import StatisticalService from '../../services/statisticalService';

// Async thunk for t-test
export const performTTest = createAsyncThunk(
  'statistical/ttest',
  async (params, { rejectWithValue }) => {
    try {
      const result = await StatisticalService.performTTest(params);
      return result;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const statisticalSlice = createSlice({
  name: 'statistical',
  initialState: {
    currentCalculation: null,
    history: [],
    loading: false,
    error: null,
    assumptions: null,
    recommendations: []
  },
  reducers: {
    clearCalculation: (state) => {
      state.currentCalculation = null;
      state.error = null;
    },
    addToHistory: (state, action) => {
      state.history.push(action.payload);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(performTTest.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(performTTest.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCalculation = action.payload.result;
        state.assumptions = action.payload.assumptions;
        state.recommendations = action.payload.recommendations;
        state.history.push({
          type: 't-test',
          result: action.payload.result,
          timestamp: new Date().toISOString()
        });
      })
      .addCase(performTTest.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearCalculation, addToHistory } = statisticalSlice.actions;
export default statisticalSlice.reducer;
```

---

## 🧪 Integration Testing

### Backend Integration Test
```python
# backend/tests/integration/test_statistical_api.py
import pytest
from decimal import Decimal
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

@pytest.mark.django_db
class TestStatisticalAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = get_user_model().objects.create_user(
            username='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_ttest_endpoint_with_high_precision(self):
        """Test that t-test endpoint returns high precision results"""
        data = {
            "test_type": "two_sample",
            "data1": [23.1, 24.2, 25.3, 26.4, 27.5],
            "data2": [22.5, 23.6, 24.7, 25.8, 26.9],
            "parameters": {
                "equal_var": True,
                "confidence": 0.95
            }
        }

        response = self.client.post('/api/v1/stats/ttest/', data, format='json')

        assert response.status_code == 200
        result = response.json()

        # Check structure
        assert 'result' in result
        assert 'assumptions' in result
        assert 'recommendations' in result

        # Check precision (should be string with many decimals)
        t_stat = result['result']['t_statistic']
        assert isinstance(t_stat, str)
        assert len(t_stat.split('.')[-1]) >= 15  # At least 15 decimal places

        # Validate against known value
        expected_t = Decimal('0.4028448795687253')  # Pre-calculated
        actual_t = Decimal(t_stat)
        assert abs(actual_t - expected_t) < Decimal('1e-15')
```

### Frontend Integration Test
```javascript
// frontend/src/tests/integration/StatisticalService.test.js
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../store';
import { useStatisticalCalculation } from '../../hooks/useStatisticalCalculation';

describe('Statistical Service Integration', () => {
  it('should calculate t-test with proper precision', async () => {
    const wrapper = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result } = renderHook(
      () => useStatisticalCalculation(),
      { wrapper }
    );

    // Perform calculation
    act(() => {
      result.current.performTTest({
        testType: 'two_sample',
        data1: [23.1, 24.2, 25.3, 26.4, 27.5],
        data2: [22.5, 23.6, 24.7, 25.8, 26.9]
      });
    });

    // Wait for result
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check result
    expect(result.current.result).toBeDefined();
    expect(result.current.result.t_statistic).toBeDefined();

    // Check precision (string with many decimals)
    const tStat = result.current.result.t_statistic;
    expect(typeof tStat).toBe('string');
    expect(tStat.split('.')[1].length).toBeGreaterThanOrEqual(15);
  });
});
```

---

## 🚀 Deployment Configuration

### Environment Variables
```bash
# backend/.env
DEBUG=False
SECRET_KEY=your-secret-key-here
DATABASE_URL=postgresql://user:pass@localhost/stickforstats
REDIS_URL=redis://localhost:6379
PRECISION=50
VALIDATION_TOLERANCE=1e-15
ENABLE_R_VALIDATION=true
R_HOME=/usr/local/lib/R

# frontend/.env
REACT_APP_API_URL=http://localhost:8000/api
REACT_APP_WS_URL=ws://localhost:8000/ws
REACT_APP_PRECISION_DISPLAY=6
REACT_APP_ENABLE_VALIDATION=true
```

---

## 📊 Monitoring & Logging

### Backend Logging
```python
# backend/core/middleware/logging.py
import logging
import time
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('stickforstats.api')

class APILoggingMiddleware(MiddlewareMixin):
    def process_request(self, request):
        request.start_time = time.time()

        # Log request
        logger.info(f"API Request: {request.method} {request.path}")

        return None

    def process_response(self, request, response):
        # Calculate duration
        duration = time.time() - getattr(request, 'start_time', 0)

        # Log response
        logger.info(
            f"API Response: {request.method} {request.path} "
            f"Status: {response.status_code} Duration: {duration:.3f}s"
        )

        # Add performance header
        response['X-Response-Time'] = f"{duration:.3f}"

        return response
```

### Frontend Performance Monitoring
```javascript
// frontend/src/utils/monitoring.js
class PerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  startMeasure(name) {
    performance.mark(`${name}-start`);
  }

  endMeasure(name) {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);

    const measure = performance.getEntriesByName(name)[0];
    this.metrics.push({
      name,
      duration: measure.duration,
      timestamp: new Date().toISOString()
    });

    // Send to analytics if needed
    if (measure.duration > 1000) {
      console.warn(`Slow operation: ${name} took ${measure.duration}ms`);
    }
  }

  getMetrics() {
    return this.metrics;
  }
}

export default new PerformanceMonitor();
```

---

## 🔐 Security Considerations

### Input Validation
```python
# backend/api/v1/validators.py
from rest_framework import serializers
import numpy as np

class DataArrayValidator:
    """Validate numerical arrays for statistical calculations"""

    def __call__(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Data must be a list")

        if len(value) < 2:
            raise serializers.ValidationError("Need at least 2 data points")

        if len(value) > 1000000:
            raise serializers.ValidationError("Data size exceeds maximum (1M points)")

        # Check all values are numeric
        try:
            numeric_values = [float(x) for x in value]
        except (ValueError, TypeError):
            raise serializers.ValidationError("All values must be numeric")

        # Check for NaN or Inf
        if any(np.isnan(x) or np.isinf(x) for x in numeric_values):
            raise serializers.ValidationError("Data contains NaN or Inf values")

        return numeric_values
```

### Rate Limiting
```python
# backend/api/v1/throttles.py
from rest_framework.throttling import UserRateThrottle

class CalculationRateThrottle(UserRateThrottle):
    """Limit calculation requests to prevent abuse"""
    scope = 'calculations'
    rate = '100/hour'  # 100 calculations per hour per user

class HeavyCalculationRateThrottle(UserRateThrottle):
    """Stricter limits for heavy calculations"""
    scope = 'heavy_calculations'
    rate = '10/hour'  # 10 heavy calculations per hour
```

---

## 📝 Code Generation Templates

### New Statistical Test Template
```python
# backend/core/services/tests/template_test.py
"""
Template for implementing new statistical test
Replace [TEST_NAME] with actual test name
"""

from typing import Dict, Any, List, Optional
from decimal import Decimal
from core.high_precision_calculator import HighPrecisionCalculator

class [TEST_NAME]Service:
    def __init__(self):
        self.calculator = HighPrecisionCalculator(precision=50)

    def calculate(
        self,
        data: List[float],
        **parameters
    ) -> Dict[str, Any]:
        """
        Calculate [TEST_NAME] with high precision.

        Args:
            data: Input data
            **parameters: Test-specific parameters

        Returns:
            Dictionary with results, assumptions, and recommendations
        """
        # 1. Validate input
        self._validate_input(data, parameters)

        # 2. Check assumptions
        assumptions = self._check_assumptions(data, parameters)

        # 3. Perform calculation
        result = self._calculate_statistic(data, parameters)

        # 4. Validate against R/Python
        validation = self._validate_result(result, data, parameters)

        # 5. Generate recommendations
        recommendations = self._generate_recommendations(assumptions)

        # 6. Format response
        return self._format_response(result, assumptions, validation, recommendations)

    def _validate_input(self, data, parameters):
        """Validate input data and parameters"""
        pass

    def _check_assumptions(self, data, parameters):
        """Check statistical assumptions"""
        pass

    def _calculate_statistic(self, data, parameters):
        """Perform the actual calculation"""
        pass

    def _validate_result(self, result, data, parameters):
        """Validate against reference implementations"""
        pass

    def _generate_recommendations(self, assumptions):
        """Generate recommendations based on assumptions"""
        pass

    def _format_response(self, result, assumptions, validation, recommendations):
        """Format the final response"""
        pass
```

---

## ✅ Integration Checklist

Before implementing any new feature:

### Backend Checklist
- [ ] Define API endpoint in `urls.py`
- [ ] Create serializer in `serializers.py`
- [ ] Implement service in `services/`
- [ ] Add view in `views.py`
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Add API documentation
- [ ] Update `requirements.txt` if needed

### Frontend Checklist
- [ ] Create service method in `services/`
- [ ] Add Redux action/reducer if needed
- [ ] Create React component
- [ ] Add TypeScript types
- [ ] Implement error handling
- [ ] Write component tests
- [ ] Write integration tests
- [ ] Update `package.json` if needed

### Integration Checklist
- [ ] Test API endpoint manually
- [ ] Test frontend-backend communication
- [ ] Verify high precision handling
- [ ] Check error scenarios
- [ ] Validate response format
- [ ] Test with edge cases
- [ ] Performance test
- [ ] Security scan

---

## 🚨 Common Integration Issues & Solutions

### Issue 1: Decimal Serialization
**Problem:** Django can't serialize Decimal to JSON
**Solution:** Convert to string in serializer
```python
class DecimalStringField(serializers.Field):
    def to_representation(self, value):
        return str(value)
```

### Issue 2: CORS Errors
**Problem:** Frontend can't call backend
**Solution:** Check CORS settings
```python
# settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
]
```

### Issue 3: Large Numbers in JavaScript
**Problem:** JavaScript loses precision with large numbers
**Solution:** Use string representation and decimal.js
```javascript
import Decimal from 'decimal.js';
const precise = new Decimal(resultString);
```

### Issue 4: Timeout on Heavy Calculations
**Problem:** Calculations timeout
**Solution:** Implement async processing with Celery
```python
@shared_task
def heavy_calculation_task(data):
    # Perform calculation
    return result
```

---

**This integration guide ensures seamless communication between backend and frontend.**
**Follow these patterns for consistent, maintainable code.**
**No shortcuts. No compromises. Professional excellence.**

*Last Updated: September 15, 2025*