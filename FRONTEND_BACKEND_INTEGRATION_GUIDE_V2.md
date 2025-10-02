# 📚 Frontend-Backend Integration Guide V2
## Complete Technical Documentation for StickForStats

**Last Updated:** September 15, 2025
**Version:** 2.0.0
**Status:** Active Development

---

## 🎯 Overview

This document provides comprehensive technical documentation for integrating the high-precision statistical backend with the React frontend. It includes all API endpoints, data formats, module paths, and troubleshooting guides.

---

## 📦 Backend Module Structure

### Core Modules (Verified ✅)

```python
backend/
├── core/
│   ├── high_precision_calculator.py       ✅ Working (50 decimals)
│   ├── hp_anova_comprehensive.py          ✅ Working (48 decimals)
│   ├── hp_correlation_comprehensive.py    ✅ Working (50 decimals)
│   ├── automatic_test_selector.py         ✅ Working
│   ├── assumption_checker.py              ✅ Working
│   └── validation_framework.py            ✅ Working
├── api/
│   └── v1/
│       ├── views.py                       ✅ Django-dependent
│       ├── serializers.py                 ✅ Working
│       └── urls.py                        ✅ Working
```

### Import Examples

```python
# High-precision calculations
from core.high_precision_calculator import HighPrecisionCalculator

# ANOVA analysis
from core.hp_anova_comprehensive import HighPrecisionANOVA

# Correlation analysis
from core.hp_correlation_comprehensive import HighPrecisionCorrelation

# Automatic test selection
from core.automatic_test_selector import (
    AutomaticTestSelector,
    ResearchQuestion,
    DataType,
    TestRecommendation
)

# Assumption checking
from core.assumption_checker import AssumptionChecker
```

---

## 🔌 API Endpoints Documentation

### Base URL
```
Development: http://localhost:8000/api/v1
Production: https://api.stickforstats.com/api/v1
```

### Authentication
All endpoints require token authentication:
```javascript
headers: {
    'Authorization': 'Token <auth-token>',
    'Content-Type': 'application/json'
}
```

### 1. T-Test Endpoint ✅
```http
POST /api/v1/stats/ttest/
```

**Request:**
```json
{
    "test_type": "one_sample|two_sample|paired",
    "data1": [1.1, 2.2, 3.3],
    "data2": [2.1, 3.2, 4.3],  // Optional
    "parameters": {
        "mu": 0,              // For one_sample
        "equal_var": true,    // For two_sample
        "confidence": 0.95
    },
    "options": {
        "check_assumptions": true,
        "validate_results": true,
        "compare_standard": true
    }
}
```

**Response:**
```json
{
    "test_type": "two_sample",
    "high_precision_result": {
        "t_statistic": "0.54545454545454544741366877494734211659850611368030",
        "p_value": "0.30677478718522844",
        "df": "8"
    },
    "assumptions": {
        "normality_data1": { "is_met": true, "p_value": 0.85 },
        "normality_data2": { "is_met": true, "p_value": 0.92 }
    },
    "comparison": {
        "decimal_places_gained": 34
    }
}
```

### 2. ANOVA Endpoint ✅
```http
POST /api/v1/stats/anova/
```

**Request:**
```json
{
    "anova_type": "one_way|two_way|repeated_measures|manova",
    "groups": [[1.1, 2.2], [3.3, 4.4], [5.5, 6.6]],
    "post_hoc": "tukey|bonferroni|scheffe|games_howell",
    "correction": "bonferroni|holm|fdr_bh|fdr_by|sidak|none",
    "options": {
        "check_assumptions": true,
        "calculate_effect_sizes": true,
        "generate_visualizations": true
    }
}
```

### 3. Correlation Endpoint (To Be Created)
```http
POST /api/v1/stats/correlation/
```

**Request:**
```json
{
    "x": [1, 2, 3, 4, 5],
    "y": [2, 4, 6, 8, 10],
    "method": "auto|pearson|spearman|kendall",
    "confidence_level": 0.95,
    "options": {
        "auto_select": true,
        "compare_methods": true,
        "generate_visualizations": true
    }
}
```

**Response:**
```json
{
    "recommendation": {
        "test": "pearson",
        "confidence": 0.95,
        "reasoning": ["Data is normally distributed", "Linear relationship detected"]
    },
    "primary_result": {
        "correlation_coefficient": "0.99999999999999999999999999999999999999999999999999",
        "p_value": "0.00000000000000000000000000000000000000000000000001",
        "confidence_interval": [-0.5, 1.0]
    },
    "all_results": {
        "pearson": {...},
        "spearman": {...},
        "kendall": {...}
    },
    "interpretation_guide": {
        "what_it_means": "Measures linear relationship between continuous variables",
        "strength_interpretation": "Very strong positive correlation"
    }
}
```

### 4. Automatic Test Selection Endpoint (To Be Created)
```http
POST /api/v1/stats/recommend/
```

**Request:**
```json
{
    "data": [[1, 2, 3], [4, 5, 6]],
    "research_question": "difference|correlation|prediction|association",
    "context": {
        "paired_data": false,
        "repeated_measures": false
    }
}
```

---

## 🎨 Frontend Integration

### Service Layer Pattern

```javascript
// services/HighPrecisionStatisticalService.js
import axios from 'axios';
import Decimal from 'decimal.js';

class HighPrecisionStatisticalService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
        this.setupAxios();
    }

    setupAxios() {
        this.client = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Authorization': `Token ${localStorage.getItem('authToken')}`,
                'Content-Type': 'application/json'
            }
        });
    }

    // Correlation with automatic test selection
    async performCorrelation(x, y, method = 'auto') {
        const response = await this.client.post('/stats/correlation/', {
            x: x,
            y: y,
            method: method,
            options: {
                auto_select: method === 'auto',
                compare_methods: true,
                generate_visualizations: true
            }
        });

        return this.processCorrelationResult(response.data);
    }

    processCorrelationResult(result) {
        // Convert string numbers to Decimal for display
        if (result.primary_result) {
            const coef = new Decimal(result.primary_result.correlation_coefficient);
            result.display = {
                coefficient: coef.toFixed(6),
                coefficient_full: result.primary_result.correlation_coefficient,
                interpretation: result.interpretation_guide
            };
        }
        return result;
    }

    // Automatic test recommendation
    async getTestRecommendation(data, researchQuestion) {
        const response = await this.client.post('/stats/recommend/', {
            data: data,
            research_question: researchQuestion
        });

        return response.data;
    }
}

export default new HighPrecisionStatisticalService();
```

### Component Example

```javascript
// components/CorrelationAnalysis.jsx
import React, { useState } from 'react';
import HighPrecisionStatisticalService from '../services/HighPrecisionStatisticalService';
import { Card, Select, Button, Alert, Table } from '@mui/material';

const CorrelationAnalysis = ({ xData, yData }) => {
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [method, setMethod] = useState('auto');

    const performAnalysis = async () => {
        setLoading(true);
        try {
            const response = await HighPrecisionStatisticalService.performCorrelation(
                xData, yData, method
            );
            setResult(response);
        } catch (error) {
            console.error('Correlation analysis failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderRecommendation = () => {
        if (!result?.recommendation) return null;

        return (
            <Alert severity="info">
                <h4>Recommended Test: {result.recommendation.test}</h4>
                <p>Confidence: {(result.recommendation.confidence * 100).toFixed(0)}%</p>
                <ul>
                    {result.recommendation.reasoning.map(reason => (
                        <li key={reason}>{reason}</li>
                    ))}
                </ul>
            </Alert>
        );
    };

    const renderResults = () => {
        if (!result?.primary_result) return null;

        return (
            <Table>
                <tbody>
                    <tr>
                        <td>Correlation Coefficient:</td>
                        <td>{result.display.coefficient}</td>
                    </tr>
                    <tr>
                        <td>P-value:</td>
                        <td>{result.primary_result.p_value}</td>
                    </tr>
                    <tr>
                        <td>Interpretation:</td>
                        <td>{result.interpretation_guide.strength_interpretation}</td>
                    </tr>
                </tbody>
            </Table>
        );
    };

    return (
        <Card>
            <h2>Correlation Analysis</h2>

            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="auto">Automatic Selection</option>
                <option value="pearson">Pearson</option>
                <option value="spearman">Spearman</option>
                <option value="kendall">Kendall's Tau</option>
            </Select>

            <Button onClick={performAnalysis} disabled={loading}>
                Analyze Correlation
            </Button>

            {renderRecommendation()}
            {renderResults()}
        </Card>
    );
};

export default CorrelationAnalysis;
```

---

## 🔧 Troubleshooting Guide

### Common Issues and Solutions

#### 1. Import Errors
**Problem:** `ModuleNotFoundError: No module named 'core.xxx'`

**Solution:**
```python
# Add backend to Python path
import sys
sys.path.append('/path/to/backend')

# Or set PYTHONPATH environment variable
export PYTHONPATH="${PYTHONPATH}:/path/to/backend"
```

#### 2. Decimal Precision Loss
**Problem:** Numbers losing precision in JSON

**Solution:**
```javascript
// Frontend: Use string representation
const highPrecisionNumber = "3.141592653589793238462643383279502884197169399375105820974944";
const decimal = new Decimal(highPrecisionNumber);

// Backend: Return as string
return JsonResponse({
    "value": str(decimal_value)
})
```

#### 3. Django Settings Error
**Problem:** `ImproperlyConfigured: Requested setting REST_FRAMEWORK`

**Solution:**
```bash
# Set Django settings module
export DJANGO_SETTINGS_MODULE=backend.settings

# Or in Python
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'backend.settings'
```

#### 4. CORS Issues
**Problem:** Cross-origin requests blocked

**Solution:**
```python
# backend/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
```

---

## 📊 Data Format Standards

### High-Precision Numbers
- **Backend:** Store as Decimal, transmit as string
- **API:** JSON strings for precision preservation
- **Frontend:** Parse with Decimal.js library

### Array Data
- **Format:** Always use arrays of numbers
- **Missing Values:** Use null, filter before processing
- **Groups:** Array of arrays for multiple groups

### Categorical Data
- **Format:** String arrays or numeric codes
- **Mapping:** Include label dictionary when needed

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] Run `verify_all_modules.py` before deployment
- [ ] Test each API endpoint with Postman/curl
- [ ] Verify precision is maintained (50 decimals)
- [ ] Check assumption testing works
- [ ] Validate automatic test selection

### Frontend Testing
- [ ] Test data import from CSV/Excel
- [ ] Verify number precision display
- [ ] Check visualization rendering
- [ ] Test error handling
- [ ] Validate user guidance display

### Integration Testing
- [ ] End-to-end test for each statistical test
- [ ] Verify authentication flow
- [ ] Test large dataset handling
- [ ] Check concurrent requests
- [ ] Validate export functionality

---

## 📈 Performance Optimization

### Backend
```python
# Use caching for repeated calculations
from django.core.cache import cache

def cached_calculation(data_hash):
    result = cache.get(data_hash)
    if result is None:
        result = perform_expensive_calculation()
        cache.set(data_hash, result, 3600)  # Cache for 1 hour
    return result
```

### Frontend
```javascript
// Use React.memo for expensive components
const ExpensiveVisualization = React.memo(({ data }) => {
    // Component code
}, (prevProps, nextProps) => {
    return prevProps.data === nextProps.data;
});

// Debounce user input
const debouncedCalculation = debounce(performCalculation, 500);
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
1. Run module verification script
2. Update API documentation
3. Test all endpoints
4. Check error logging
5. Verify environment variables

### Environment Variables
```bash
# Backend (.env)
DJANGO_SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com
DATABASE_URL=postgresql://...
REDIS_URL=redis://...

# Frontend (.env)
REACT_APP_API_URL=https://api.your-domain.com/api/v1
REACT_APP_VERSION=1.0.0
```

---

## 📝 Quick Reference

### Statistical Test Selection Logic
```
IF data is continuous AND normally distributed:
    IF comparing 2 groups:
        USE t-test
    ELIF comparing 3+ groups:
        USE ANOVA
    ELIF examining relationship:
        USE Pearson correlation

ELIF data is ordinal OR not normally distributed:
    IF comparing 2 groups:
        USE Mann-Whitney U
    ELIF comparing 3+ groups:
        USE Kruskal-Wallis
    ELIF examining relationship:
        USE Spearman correlation

ELIF data is categorical:
    USE Chi-square test
```

### API Response Status Codes
- `200`: Success
- `400`: Bad request (invalid input)
- `401`: Unauthorized (auth required)
- `422`: Unprocessable (assumption violation)
- `500`: Server error

---

## 🔄 Version History

- **v2.0.0** (Sept 15, 2025): Added correlation, auto test selection
- **v1.0.0** (Sept 15, 2025): Initial implementation with t-test, ANOVA

---

## 📞 Support

For integration issues:
1. Check this guide first
2. Run `verify_all_modules.py`
3. Check server logs
4. Contact development team

---

**Remember:** Always maintain scientific integrity and precision throughout the data pipeline!