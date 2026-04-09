# 📚 StickForStats Complete API Documentation
## High-Precision Statistical Analysis Platform

---

## 🔐 Authentication

All API endpoints require authentication using JWT tokens.

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN',
  'Content-Type': 'application/json'
}
```

---

## 📊 Statistical Test Endpoints

### 1. T-Test Analysis
**Endpoint:** `POST /api/v1/stats/ttest/`

**Description:** Performs high-precision t-tests with 50 decimal places accuracy.

**Request Body:**
```json
{
  "data": {
    "group1": [1.2, 2.3, 3.4, ...],
    "group2": [2.1, 3.2, 4.3, ...],  // Optional for one-sample test
    "paired": false
  },
  "test_type": "two-sample",  // "one-sample", "two-sample", "paired", "welch"
  "parameters": {
    "alternative": "two-sided",  // "two-sided", "less", "greater"
    "confidence_level": 0.95,
    "mu": 0,  // For one-sample test
    "equal_variance": true
  },
  "options": {
    "include_assumptions": true,
    "include_visualization": true,
    "compare_with_standard": true
  }
}
```

**Response:**
```json
{
  "test_type": "two-sample",
  "statistics": {
    "t_statistic": "2.34567890123456789012345678901234567890123456789",
    "p_value": "0.02345678901234567890123456789012345678901234567",
    "degrees_of_freedom": "98"
  },
  "effect_size": {
    "cohens_d": "0.47234567890123456789012345678901234567890123456",
    "interpretation": "Small to medium effect"
  },
  "confidence_interval": {
    "lower": "-0.12345678901234567890123456789012345678901234567",
    "upper": "1.23456789012345678901234567890123456789012345678"
  },
  "assumptions": {
    "normality": {
      "passed": true,
      "shapiro_p": "0.234567890"
    },
    "equal_variance": {
      "passed": true,
      "levene_p": "0.567890123"
    }
  },
  "visualization": {
    "box_plot": "base64_encoded_image_or_plotly_json",
    "distribution_plot": "base64_encoded_image_or_plotly_json"
  },
  "precision_comparison": {
    "high_precision": "50 decimal places",
    "standard_precision": "15 decimal places",
    "difference": "0.00000000000000123456789012345678901234567890123"
  }
}
```

---

### 2. ANOVA Analysis
**Endpoint:** `POST /api/v1/stats/anova/`

**Description:** Comprehensive ANOVA with all variants and post-hoc tests.

**Request Body:**
```json
{
  "data": {
    "groups": [
      {"name": "Group1", "values": [1, 2, 3, ...]},
      {"name": "Group2", "values": [2, 3, 4, ...]},
      {"name": "Group3", "values": [3, 4, 5, ...]}
    ],
    "factors": {
      "factor1": ["A", "A", "B", ...],  // For two-way ANOVA
      "factor2": ["X", "Y", "X", ...]
    },
    "subject_ids": [1, 2, 3, ...]  // For repeated measures
  },
  "anova_type": "one-way",  // "one-way", "two-way", "repeated-measures", "manova"
  "post_hoc": {
    "tests": ["tukey", "bonferroni", "scheffe"],
    "correction": "fdr"  // "bonferroni", "holm", "fdr"
  },
  "options": {
    "include_effect_size": true,
    "include_power": true,
    "include_assumptions": true,
    "include_visualization": true
  }
}
```

**Response:**
```json
{
  "anova_type": "one-way",
  "anova_table": {
    "between_groups": {
      "sum_squares": "123.456789012345678901234567890123456789012345678",
      "df": 2,
      "mean_square": "61.7283945061728395061728395061728395061728395061",
      "f_statistic": "15.234567890123456789012345678901234567890123456",
      "p_value": "0.00001234567890123456789012345678901234567890123"
    },
    "within_groups": {
      "sum_squares": "234.567890123456789012345678901234567890123456789",
      "df": 97,
      "mean_square": "2.41823608375901957554705490674459638897623850671"
    }
  },
  "effect_size": {
    "eta_squared": "0.23456789012345678901234567890123456789012345678",
    "omega_squared": "0.21345678901234567890123456789012345678901234567",
    "interpretation": "Large effect"
  },
  "post_hoc_results": {
    "tukey": [
      {
        "group1": "Group1",
        "group2": "Group2",
        "mean_diff": "2.34567890123456789012345678901234567890123456789",
        "p_adj": "0.01234567890123456789012345678901234567890123456",
        "ci_lower": "1.23456789012345678901234567890123456789012345678",
        "ci_upper": "3.45678901234567890123456789012345678901234567890",
        "significant": true
      }
    ]
  },
  "assumptions": {
    "normality": {
      "passed": true,
      "test": "Shapiro-Wilk",
      "p_values": {"Group1": "0.234", "Group2": "0.567", "Group3": "0.890"}
    },
    "homogeneity": {
      "passed": true,
      "levene_p": "0.345678901234567890123456789012345678901234567890"
    }
  },
  "visualization": {
    "means_plot": "plotly_json_object",
    "interaction_plot": "plotly_json_object",  // For two-way ANOVA
    "post_hoc_plot": "plotly_json_object"
  }
}
```

---

### 3. Correlation Analysis
**Endpoint:** `POST /api/v1/stats/correlation/`

**Description:** High-precision correlation analysis with automatic method selection.

**Request Body:**
```json
{
  "data": {
    "x": [1, 2, 3, 4, 5, ...],
    "y": [2, 4, 6, 8, 10, ...],
    "variables": {  // For correlation matrix
      "var1": [1, 2, 3, ...],
      "var2": [2, 3, 4, ...],
      "var3": [3, 4, 5, ...]
    }
  },
  "method": "auto",  // "pearson", "spearman", "kendall", "auto"
  "options": {
    "confidence_level": 0.95,
    "handle_missing": "pairwise",  // "complete", "pairwise"
    "include_p_values": true,
    "include_confidence_intervals": true,
    "include_visualization": true
  }
}
```

**Response:**
```json
{
  "method_used": "spearman",
  "reason": "Data is not normally distributed",
  "correlation": {
    "coefficient": "0.89234567890123456789012345678901234567890123456",
    "p_value": "0.00001234567890123456789012345678901234567890123",
    "confidence_interval": {
      "lower": "0.78901234567890123456789012345678901234567890123",
      "upper": "0.94567890123456789012345678901234567890123456789"
    }
  },
  "interpretation": {
    "strength": "Strong positive correlation",
    "significance": "Highly significant (p < 0.001)",
    "r_squared": "0.79628395061728395061728395061728395061728395061"
  },
  "assumptions": {
    "normality": {
      "x_normal": false,
      "y_normal": true,
      "test_used": "Shapiro-Wilk"
    },
    "linearity": {
      "passed": true,
      "test": "Rainbow test"
    },
    "outliers": {
      "detected": 2,
      "indices": [15, 47]
    }
  },
  "correlation_matrix": {  // If multiple variables
    "coefficients": [[1, 0.89, 0.45], [0.89, 1, 0.67], [0.45, 0.67, 1]],
    "p_values": [[0, 0.001, 0.05], [0.001, 0, 0.01], [0.05, 0.01, 0]]
  },
  "visualization": {
    "scatter_plot": "plotly_json",
    "correlation_heatmap": "plotly_json",
    "regression_line": "plotly_json"
  }
}
```

---

### 4. Regression Analysis
**Endpoint:** `POST /api/v1/stats/regression/`

**Description:** Comprehensive regression analysis with multiple methods.

**Request Body:**
```json
{
  "data": {
    "X": [[1, 2], [2, 3], [3, 4], ...],  // Independent variables
    "y": [10, 20, 30, ...],              // Dependent variable
    "feature_names": ["feature1", "feature2"]
  },
  "method": "linear",  // "linear", "ridge", "lasso", "polynomial", "logistic", "quantile", "robust", "stepwise"
  "parameters": {
    "confidence_level": 0.95,
    "handle_missing": "drop",
    "robust_standard_errors": false,
    "alpha": 1.0,           // For Ridge/Lasso
    "degree": 2,            // For polynomial
    "quantile": 0.5,        // For quantile regression
    "cv_folds": 5,          // Cross-validation folds
    "stepwise_method": "both",  // "forward", "backward", "both"
    "alpha_in": 0.05,       // For stepwise
    "alpha_out": 0.10       // For stepwise
  },
  "options": {
    "include_diagnostics": true,
    "include_visualization": true,
    "compare_with_standard": true
  }
}
```

**Response:**
```json
{
  "method": "linear",
  "coefficients": {
    "feature1": "1.23456789012345678901234567890123456789012345678",
    "feature2": "-0.98765432109876543210987654321098765432109876543"
  },
  "intercept": "5.43210987654321098765432109876543210987654321098",
  "metrics": {
    "r_squared": "0.94567890123456789012345678901234567890123456789",
    "adjusted_r_squared": "0.93456789012345678901234567890123456789012345678",
    "mse": "12.3456789012345678901234567890123456789012345678",
    "rmse": "3.51364182849228757869643130698173883929173019503",
    "mae": "2.98765432109876543210987654321098765432109876543",
    "mape": "8.76543210987654321098765432109876543210987654321",
    "aic": "234.567890123456789012345678901234567890123456789",
    "bic": "245.678901234567890123456789012345678901234567890"
  },
  "statistics": {
    "f_statistic": "156.789012345678901234567890123456789012345678901",
    "f_p_value": "0.00000001234567890123456789012345678901234567890"
  },
  "standard_errors": {
    "feature1": "0.12345678901234567890123456789012345678901234567",
    "feature2": "0.09876543210987654321098765432109876543210987654"
  },
  "p_values": {
    "feature1": "0.00012345678901234567890123456789012345678901234",
    "feature2": "0.00098765432109876543210987654321098765432109876"
  },
  "confidence_intervals": {
    "feature1": ["0.98765432109876543210987654321098765432109876543", "1.48148148148148148148148148148148148148148148148"],
    "feature2": ["-1.18518518518518518518518518518518518518518518518", "-0.79012345679012345679012345679012345679012345679"]
  },
  "diagnostics": {
    "multicollinearity": {
      "detected": false,
      "vif": {
        "feature1": "1.23456789012345678901234567890123456789012345678",
        "feature2": "1.34567890123456789012345678901234567890123456789"
      }
    },
    "heteroscedasticity": {
      "detected": false,
      "breusch_pagan": {
        "statistic": "2.34567890123456789012345678901234567890123456789",
        "p_value": "0.30987654321098765432109876543210987654321098765"
      }
    },
    "autocorrelation": {
      "detected": false,
      "durbin_watson": "1.98765432109876543210987654321098765432109876543"
    },
    "normality": {
      "violated": false,
      "jarque_bera": {
        "statistic": "1.23456789012345678901234567890123456789012345678",
        "p_value": "0.54321098765432109876543210987654321098765432109"
      }
    },
    "outliers": [5, 23, 67],
    "influential_points": [12, 45],
    "condition_number": "15.6789012345678901234567890123456789012345678901"
  },
  "selected_features": ["feature1", "feature2"],  // For stepwise/lasso
  "feature_importance": {  // For regularized methods
    "feature1": "0.65432109876543210987654321098765432109876543210",
    "feature2": "0.34567890123456789012345678901234567890123456789"
  },
  "visualization": {
    "residual_plot": "plotly_json",
    "qq_plot": "plotly_json",
    "leverage_plot": "plotly_json",
    "feature_importance_plot": "plotly_json"
  },
  "interpretation": {
    "model_fit": "The model explains 94.6% of the variance",
    "significant_predictors": "Both feature1 and feature2 are significant",
    "warnings": "3 outliers detected that may influence results"
  }
}
```

---

### 5. Automatic Test Selection
**Endpoint:** `POST /api/v1/stats/recommend/`

**Description:** Automatically recommends the best statistical test based on data characteristics.

**Request Body:**
```json
{
  "data": {
    "samples": [
      [1, 2, 3, 4, 5, ...],
      [2, 3, 4, 5, 6, ...]
    ],
    "variable_types": ["continuous", "continuous"],
    "study_design": "independent"  // "independent", "paired", "repeated"
  },
  "analysis_goal": "compare_means",  // "compare_means", "correlation", "regression", "compare_distributions"
  "preferences": {
    "parametric_preferred": true,
    "significance_level": 0.05
  }
}
```

**Response:**
```json
{
  "recommended_test": "welch_ttest",
  "confidence_score": "0.92345678901234567890123456789012345678901234567",
  "reasoning": {
    "data_characteristics": {
      "sample_size": "adequate",
      "normality": "violated in group 2",
      "equal_variance": "violated",
      "outliers": "2 detected"
    },
    "why_recommended": "Welch's t-test is robust to unequal variances and mild departures from normality"
  },
  "alternatives": [
    {
      "test": "mann_whitney_u",
      "confidence": "0.87654321098765432109876543210987654321098765432",
      "when_to_use": "If normality assumption is strongly violated"
    },
    {
      "test": "student_ttest",
      "confidence": "0.65432109876543210987654321098765432109876543210",
      "when_to_use": "If variances become equal after transformation"
    }
  ],
  "preprocessing_suggestions": [
    "Consider log transformation to improve normality",
    "Remove outliers at indices [15, 47] for better results"
  ],
  "interpretation_guide": {
    "if_significant": "Reject null hypothesis of equal means",
    "effect_size_interpretation": "Calculate Cohen's d for practical significance",
    "report_format": "Report as: t(df) = X.XX, p = .XXX, d = X.XX"
  }
}
```

---

### 6. Missing Data Analysis
**Endpoint:** `POST /api/v1/stats/missing-data/analyze/`

**Description:** Analyzes missing data patterns and provides recommendations.

**Request Body:**
```json
{
  "data": [[1, 2, null], [3, null, 5], ...],
  "column_names": ["var1", "var2", "var3"],
  "perform_tests": true
}
```

**Response:**
```json
{
  "summary": {
    "total_missing": 25,
    "total_observations": 300,
    "missing_percentage": "8.33333333333333333333333333333333333333333333333"
  },
  "pattern": {
    "type": "Missing At Random",
    "confidence": "0.78901234567890123456789012345678901234567890123"
  },
  "by_column": {
    "var1": {
      "count": 5,
      "percentage": "5.00000000000000000000000000000000000000000000000",
      "pattern": "random"
    },
    "var2": {
      "count": 10,
      "percentage": "10.0000000000000000000000000000000000000000000000",
      "pattern": "missing_at_end"
    }
  },
  "little_mcar_test": {
    "chi2_statistic": "12.3456789012345678901234567890123456789012345678",
    "degrees_of_freedom": "8",
    "p_value": "0.13579246801357924680135792468013579246801357924",
    "is_mcar": true
  },
  "recommendations": [
    "MAR pattern detected: Use model-based imputation (MICE, regression)",
    "Moderate missing data (5-20%): Consider mean/median imputation or KNN"
  ],
  "warnings": [
    "Column 'var3' has >30% missing data"
  ],
  "visualization": {
    "heatmap": [[1, 1, 0], [1, 0, 1], ...],
    "correlations": {
      "var1": {"var1": 1, "var2": 0.2, "var3": 0.1},
      "var2": {"var1": 0.2, "var2": 1, "var3": 0.3}
    }
  }
}
```

---

### 7. Data Imputation
**Endpoint:** `POST /api/v1/stats/missing-data/impute/`

**Description:** Imputes missing data using various methods.

**Request Body:**
```json
{
  "data": [[1, 2, null], [3, null, 5], ...],
  "method": "mice",  // "drop", "mean", "median", "knn", "mice", etc.
  "column_strategies": {
    "var1": "mean",
    "var2": "median",
    "var3": "mice"
  },
  "parameters": {
    "n_neighbors": 5,     // For KNN
    "max_iter": 10,       // For MICE
    "constant_value": 0   // For constant imputation
  }
}
```

**Response:**
```json
{
  "imputed_data": [[1, 2, 3.5], [3, 4.2, 5], ...],
  "method_used": "mice",
  "imputation_details": {
    "rows_before": 100,
    "rows_after": 100,
    "columns_affected": ["var2", "var3"],
    "total_values_imputed": 25
  },
  "quality_metrics": {
    "mean_shift_col_0": "0.02345678901234567890123456789012345678901234567",
    "std_shift_col_0": "0.01234567890123456789012345678901234567890123456",
    "overall_quality": "0.97654321098765432109876543210987654321098765432"
  },
  "convergence_info": {
    "converged": true,
    "iterations": 7
  }
}
```

---

### 8. Model Comparison
**Endpoint:** `POST /api/v1/stats/regression/compare/`

**Description:** Compares multiple regression models on the same dataset.

**Request Body:**
```json
{
  "data": {
    "X": [[1, 2], [2, 3], ...],
    "y": [10, 20, ...],
    "feature_names": ["feature1", "feature2"]
  },
  "models": [
    {"method": "linear", "parameters": {}},
    {"method": "ridge", "parameters": {"alpha": 1.0}},
    {"method": "lasso", "parameters": {"alpha": 0.1}},
    {"method": "polynomial", "parameters": {"degree": 2}}
  ],
  "comparison_metrics": ["r_squared", "mse", "aic", "bic"]
}
```

**Response:**
```json
{
  "models": [
    {
      "method": "linear",
      "parameters": {},
      "r_squared": "0.94567890123456789012345678901234567890123456789",
      "mse": "12.3456789012345678901234567890123456789012345678",
      "aic": "234.567890123456789012345678901234567890123456789",
      "bic": "245.678901234567890123456789012345678901234567890"
    },
    {
      "method": "ridge",
      "parameters": {"alpha": 1.0},
      "r_squared": "0.93456789012345678901234567890123456789012345678",
      "mse": "13.4567890123456789012345678901234567890123456789",
      "aic": "236.789012345678901234567890123456789012345678901",
      "bic": "247.890123456789012345678901234567890123456789012"
    }
  ],
  "best_models": {
    "r_squared": "linear",
    "mse": "linear",
    "aic": "linear",
    "bic": "linear"
  },
  "recommendation": "Based on the comparison, linear performs best on most metrics. It is the best model for 4 out of 4 metrics."
}
```

---

### 9. Non-Parametric Tests
**Endpoint:** `POST /api/v1/stats/nonparametric/`

**Description:** Performs non-parametric tests with high precision.

**Request Body:**
```json
{
  "data": {
    "samples": [
      [1, 2, 3, 4, 5],
      [2, 3, 4, 5, 6]
    ]
  },
  "test": "mann_whitney",  // "mann_whitney", "wilcoxon", "kruskal_wallis", "friedman"
  "parameters": {
    "alternative": "two-sided",
    "continuity_correction": true,
    "exact": false
  },
  "options": {
    "include_effect_size": true,
    "include_confidence_interval": true,
    "include_visualization": true
  }
}
```

---

### 10. Chi-Square Tests
**Endpoint:** `POST /api/v1/stats/chi-square/`

**Description:** Performs chi-square and related categorical tests.

**Request Body:**
```json
{
  "data": {
    "contingency_table": [[10, 20], [30, 40]],
    "observed": [10, 15, 20, 25],
    "expected": [12, 13, 22, 23]
  },
  "test_type": "independence",  // "independence", "goodness_of_fit", "homogeneity"
  "parameters": {
    "correction": true,  // Yates correction
    "lambda": null       // For G-test
  },
  "options": {
    "include_effect_size": true,
    "include_post_hoc": true,
    "include_visualization": true
  }
}
```

---

## 🎨 Visualization Endpoints

### 11. Generate Statistical Plots
**Endpoint:** `POST /api/v1/visualization/create/`

**Description:** Creates various statistical visualizations.

**Request Body:**
```json
{
  "plot_type": "box",  // "box", "violin", "histogram", "qq", "scatter", "heatmap", etc.
  "data": {
    "values": [[1, 2, 3], [4, 5, 6]],
    "labels": ["Group A", "Group B"]
  },
  "customization": {
    "title": "Distribution Comparison",
    "x_label": "Groups",
    "y_label": "Values",
    "color_scheme": "viridis",
    "interactive": true,
    "show_outliers": true,
    "add_mean_line": true
  },
  "format": "plotly"  // "plotly", "matplotlib", "base64"
}
```

---

## 📈 Data Processing Endpoints

### 12. Data Import and Validation
**Endpoint:** `POST /api/v1/data/import/`

**Description:** Imports and validates data from various formats.

**Request Body:**
```json
{
  "format": "csv",  // "csv", "excel", "json", "spss", "stata"
  "data": "base64_encoded_file_content",
  "options": {
    "delimiter": ",",
    "header_row": 0,
    "na_values": ["NA", "null", ""],
    "date_columns": ["date_col1"],
    "index_column": null
  },
  "validation": {
    "check_types": true,
    "check_missing": true,
    "check_outliers": true,
    "check_duplicates": true
  }
}
```

---

## 💪 Power Analysis Endpoints

### 13. Statistical Power Calculation
**Endpoint:** `POST /api/v1/stats/power/`

**Description:** Calculates statistical power and sample size.

**Request Body:**
```json
{
  "test_type": "t-test",  // "t-test", "anova", "correlation", "regression"
  "calculation_type": "power",  // "power", "sample_size", "effect_size"
  "parameters": {
    "effect_size": 0.5,
    "alpha": 0.05,
    "power": 0.8,
    "sample_size": null,  // Specify for power calculation
    "groups": 2,
    "predictors": 3        // For regression
  }
}
```

---

## 🔄 Response Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid input data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Permission denied
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## 📝 Frontend Integration Examples

### React/TypeScript Example

```typescript
// services/StatisticsService.ts
import axios from 'axios';
import Decimal from 'decimal.js';

class StatisticsService {
  private baseURL = 'https://api.stickforstats.com/api/v1';
  private token = localStorage.getItem('jwt_token');

  private headers = {
    'Authorization': `Bearer ${this.token}`,
    'Content-Type': 'application/json'
  };

  async performTTest(data: {
    group1: number[],
    group2?: number[],
    testType: string,
    parameters?: any
  }) {
    const response = await axios.post(
      `${this.baseURL}/stats/ttest/`,
      {
        data: {
          group1: data.group1,
          group2: data.group2
        },
        test_type: data.testType,
        parameters: data.parameters || {},
        options: {
          include_assumptions: true,
          include_visualization: true,
          compare_with_standard: true
        }
      },
      { headers: this.headers }
    );

    // Handle high-precision numbers
    const result = response.data;
    result.statistics.t_statistic = new Decimal(result.statistics.t_statistic);
    result.statistics.p_value = new Decimal(result.statistics.p_value);

    return result;
  }

  async performRegression(data: {
    X: number[][],
    y: number[],
    method: string,
    parameters?: any
  }) {
    const response = await axios.post(
      `${this.baseURL}/stats/regression/`,
      {
        data: {
          X: data.X,
          y: data.y
        },
        method: data.method,
        parameters: data.parameters || {},
        options: {
          include_diagnostics: true,
          include_visualization: true
        }
      },
      { headers: this.headers }
    );

    return this.processHighPrecisionResponse(response.data);
  }

  private processHighPrecisionResponse(data: any) {
    // Convert string representations to Decimal for precision
    if (data.coefficients) {
      Object.keys(data.coefficients).forEach(key => {
        data.coefficients[key] = new Decimal(data.coefficients[key]);
      });
    }

    if (data.metrics) {
      Object.keys(data.metrics).forEach(key => {
        data.metrics[key] = new Decimal(data.metrics[key]);
      });
    }

    return data;
  }
}

export default new StatisticsService();
```

### Component Example

```tsx
// components/RegressionAnalysis.tsx
import React, { useState } from 'react';
import StatisticsService from '../services/StatisticsService';
import { Plot } from 'react-plotly.js';

const RegressionAnalysis: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runRegression = async () => {
    setLoading(true);
    try {
      const data = {
        X: [[1, 2], [2, 3], [3, 4], [4, 5]],
        y: [10, 20, 30, 40],
        method: 'linear',
        parameters: {
          confidence_level: 0.95,
          handle_missing: 'drop'
        }
      };

      const result = await StatisticsService.performRegression(data);
      setResult(result);
    } catch (error) {
      console.error('Regression failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={runRegression} disabled={loading}>
        Run Regression Analysis
      </button>

      {result && (
        <div>
          <h3>Results</h3>
          <p>R²: {result.metrics.r_squared.toString()}</p>
          <p>MSE: {result.metrics.mse.toString()}</p>

          <h4>Coefficients</h4>
          {Object.entries(result.coefficients).map(([key, value]: [string, any]) => (
            <p key={key}>{key}: {value.toString()}</p>
          ))}

          {result.visualization?.residual_plot && (
            <Plot
              data={result.visualization.residual_plot.data}
              layout={result.visualization.residual_plot.layout}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default RegressionAnalysis;
```

---

## 🔑 Important Notes

1. **High Precision Numbers**: All statistical calculations return results with up to 50 decimal places. These are returned as strings to preserve precision. Use libraries like `decimal.js` in frontend.

2. **Missing Data**: All endpoints automatically handle missing data based on the `handle_missing` parameter.

3. **Caching**: Results are cached for 1 hour to improve performance for repeated calculations.

4. **Rate Limiting**: API has rate limiting of 100 requests per minute per user.

5. **File Size Limits**: Maximum upload size is 50MB for data files.

6. **Batch Processing**: For large datasets, use the batch processing endpoints (coming soon).

---

## 📚 Additional Resources

- **Postman Collection**: [Download](https://api.stickforstats.com/postman-collection.json)
- **OpenAPI Specification**: [View](https://api.stickforstats.com/openapi.json)
- **Python SDK**: `pip install stickforstats-sdk`
- **R Package**: `install.packages("stickforstats")`
- **Support**: support@stickforstats.com

---

## 🚀 Quick Start

```bash
# Get authentication token
curl -X POST https://api.stickforstats.com/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "your_username", "password": "your_password"}'

# Perform t-test
curl -X POST https://api.stickforstats.com/api/v1/stats/ttest/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "group1": [1, 2, 3, 4, 5],
      "group2": [2, 3, 4, 5, 6]
    },
    "test_type": "two-sample",
    "parameters": {
      "alternative": "two-sided"
    }
  }'
```

---

**Version:** 2.0.0
**Last Updated:** September 15, 2025
**Precision Level:** 50 Decimal Places
**Status:** Production Ready