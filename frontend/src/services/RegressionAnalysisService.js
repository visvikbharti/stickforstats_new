/**
 * Regression Analysis Service
 * ===========================
 * Frontend service for high-precision regression analysis with 50 decimal precision.
 * Integrates with comprehensive regression backend supporting 10+ methods.
 *
 * @module RegressionAnalysisService
 * @requires axios
 * @requires decimal.js
 *
 * Supported Methods:
 * - Linear Regression
 * - Multiple Regression
 * - Polynomial Regression
 * - Logistic Regression (Binary & Multinomial)
 * - Ridge Regression (L2)
 * - Lasso Regression (L1)
 * - Elastic Net
 * - Robust Regression (Huber, RANSAC, Theil-Sen)
 * - Quantile Regression
 * - Stepwise Regression
 *
 * Author: StickForStats Development Team
 * Date: September 2025
 * Version: 1.0.0
 */

import axios from 'axios';
import Decimal from 'decimal.js';

// Configure Decimal.js for 50 decimal places
Decimal.set({ precision: 50 });

// Get the API base URL from environment or use default
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance with authentication
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Regression Analysis Service Class
 * Provides methods for all regression analysis types
 */
class RegressionAnalysisService {
  /**
   * Perform regression analysis with specified method
   * @param {Object} params - Analysis parameters
   * @param {Array<Array<number>>} params.X - Independent variables (n_samples x n_features)
   * @param {Array<number>} params.y - Dependent variable (n_samples)
   * @param {string} params.method - Regression method
   * @param {Array<string>} params.feature_names - Names of features
   * @param {Object} params.parameters - Method-specific parameters
   * @param {Object} params.options - Analysis options
   * @returns {Promise<Object>} Regression results with 50 decimal precision
   */
  async performRegression(params) {
    try {
      const requestData = {
        data: {
          X: params.X,
          y: params.y,
          feature_names: params.feature_names || []
        },
        method: params.method || 'linear',
        parameters: {
          confidence_level: params.confidence_level || 0.95,
          handle_missing: params.handle_missing || 'drop',
          robust_standard_errors: params.robust_standard_errors || false,
          alpha: params.alpha,  // For regularized methods
          degree: params.degree, // For polynomial
          quantile: params.quantile, // For quantile regression
          cv_folds: params.cv_folds || 5
        },
        options: {
          include_diagnostics: params.include_diagnostics !== false,
          include_visualization: params.include_visualization !== false,
          compare_with_standard: params.compare_with_standard || false
        }
      };

      const response = await api.post('/regression/analyze/', requestData);
      return this.processRegressionResponse(response.data);
    } catch (error) {
      console.error('Error performing regression:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Linear Regression
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Linear regression results
   */
  async linearRegression(X, y, options = {}) {
    return this.performRegression({
      X,
      y,
      method: 'linear',
      ...options
    });
  }

  /**
   * Multiple Regression
   * @param {Array<Array<number>>} X - Multiple independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {Array<string>} feature_names - Names of features
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Multiple regression results
   */
  async multipleRegression(X, y, feature_names, options = {}) {
    return this.performRegression({
      X,
      y,
      method: 'multiple',
      feature_names,
      ...options
    });
  }

  /**
   * Polynomial Regression
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {number} degree - Polynomial degree
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Polynomial regression results
   */
  async polynomialRegression(X, y, degree = 2, options = {}) {
    return this.performRegression({
      X,
      y,
      method: 'polynomial',
      degree,
      ...options
    });
  }

  /**
   * Logistic Regression
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Binary or categorical dependent variable
   * @param {string} type - 'binary' or 'multinomial'
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Logistic regression results
   */
  async logisticRegression(X, y, type = 'binary', options = {}) {
    return this.performRegression({
      X,
      y,
      method: type === 'binary' ? 'logistic_binary' : 'logistic_multinomial',
      ...options
    });
  }

  /**
   * Ridge Regression (L2 Regularization)
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {number} alpha - Regularization strength
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Ridge regression results
   */
  async ridgeRegression(X, y, alpha = 1.0, options = {}) {
    return this.performRegression({
      X,
      y,
      method: 'ridge',
      alpha,
      ...options
    });
  }

  /**
   * Lasso Regression (L1 Regularization)
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {number} alpha - Regularization strength
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Lasso regression results
   */
  async lassoRegression(X, y, alpha = 1.0, options = {}) {
    return this.performRegression({
      X,
      y,
      method: 'lasso',
      alpha,
      ...options
    });
  }

  /**
   * Elastic Net Regression
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {number} alpha - Regularization strength
   * @param {number} l1_ratio - Balance between L1 and L2 (0 to 1)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Elastic Net regression results
   */
  async elasticNetRegression(X, y, alpha = 1.0, l1_ratio = 0.5, options = {}) {
    return this.performRegression({
      X,
      y,
      method: 'elastic_net',
      alpha,
      l1_ratio,
      ...options
    });
  }

  /**
   * Robust Regression
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {string} estimator - 'huber', 'ransac', or 'theil_sen'
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Robust regression results
   */
  async robustRegression(X, y, estimator = 'huber', options = {}) {
    return this.performRegression({
      X,
      y,
      method: `robust_${estimator}`,
      ...options
    });
  }

  /**
   * Quantile Regression
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {number} quantile - Quantile to predict (0 to 1)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Quantile regression results
   */
  async quantileRegression(X, y, quantile = 0.5, options = {}) {
    return this.performRegression({
      X,
      y,
      method: 'quantile',
      quantile,
      ...options
    });
  }

  /**
   * Stepwise Regression
   * @param {Array<Array<number>>} X - Independent variables
   * @param {Array<number>} y - Dependent variable
   * @param {string} direction - 'forward', 'backward', or 'both'
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Stepwise regression results
   */
  async stepwiseRegression(X, y, direction = 'both', options = {}) {
    return this.performRegression({
      X,
      y,
      method: `stepwise_${direction}`,
      ...options
    });
  }

  /**
   * Compare multiple regression models
   * @param {Array<Object>} models - Array of model configurations
   * @returns {Promise<Object>} Model comparison results
   */
  async compareModels(models) {
    try {
      const response = await api.post('/regression/compare/', { models });
      return this.processComparisonResponse(response.data);
    } catch (error) {
      console.error('Error comparing models:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get regression diagnostics
   * @param {Object} model - Fitted model from regression
   * @returns {Promise<Object>} Comprehensive diagnostics
   */
  async getDiagnostics(model) {
    try {
      const response = await api.post('/regression/diagnostics/', { model });
      return this.processDiagnosticsResponse(response.data);
    } catch (error) {
      console.error('Error getting diagnostics:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Process regression response with high precision
   * @private
   */
  processRegressionResponse(data) {
    if (!data.success) {
      throw new Error(data.error || 'Regression analysis failed');
    }

    const results = data.results || data;
    const processed = { ...results };

    // Convert high-precision strings to Decimal objects
    if (processed.coefficients) {
      processed.coefficients_decimal = {};
      processed.coefficients_display = {};

      Object.keys(processed.coefficients).forEach(key => {
        const value = processed.coefficients[key];
        if (typeof value === 'string' && value.includes('.')) {
          processed.coefficients_decimal[key] = new Decimal(value);
          processed.coefficients_display[key] = this.formatHighPrecision(value);
        }
      });
    }

    // Process R-squared and other metrics
    const precisionMetrics = [
      'r_squared', 'adjusted_r_squared', 'mse', 'rmse', 'mae',
      'aic', 'bic', 'log_likelihood', 'f_statistic', 'f_p_value'
    ];

    precisionMetrics.forEach(metric => {
      if (processed[metric] && typeof processed[metric] === 'string') {
        processed[`${metric}_decimal`] = new Decimal(processed[metric]);
        processed[`${metric}_display`] = this.formatHighPrecision(processed[metric]);
      }
    });

    // Process diagnostics
    if (processed.diagnostics) {
      processed.diagnostics = this.processDiagnostics(processed.diagnostics);
    }

    return processed;
  }

  /**
   * Process diagnostics with high precision
   * @private
   */
  processDiagnostics(diagnostics) {
    const processed = { ...diagnostics };

    // VIF scores
    if (processed.vif_scores) {
      processed.vif_scores_decimal = {};
      Object.keys(processed.vif_scores).forEach(key => {
        const value = processed.vif_scores[key];
        if (typeof value === 'string') {
          processed.vif_scores_decimal[key] = new Decimal(value);
        }
      });
    }

    // Test statistics
    const tests = [
      'durbin_watson', 'breusch_pagan_statistic', 'jarque_bera_statistic',
      'white_statistic', 'goldfeld_quandt_statistic'
    ];

    tests.forEach(test => {
      if (processed[test] && typeof processed[test] === 'string') {
        processed[`${test}_decimal`] = new Decimal(processed[test]);
        processed[`${test}_display`] = this.formatHighPrecision(processed[test]);
      }
    });

    return processed;
  }

  /**
   * Process model comparison response
   * @private
   */
  processComparisonResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // Process each model's metrics
    if (processed.models) {
      processed.models = processed.models.map(model =>
        this.processRegressionResponse(model)
      );
    }

    // Process comparison metrics
    if (processed.comparison) {
      processed.comparison = this.processComparisonMetrics(processed.comparison);
    }

    return processed;
  }

  /**
   * Process comparison metrics
   * @private
   */
  processComparisonMetrics(comparison) {
    const processed = { ...comparison };

    // Process likelihood ratio tests, AIC differences, etc.
    if (processed.likelihood_ratio) {
      processed.likelihood_ratio_decimal = new Decimal(processed.likelihood_ratio);
    }

    if (processed.aic_differences) {
      processed.aic_differences_decimal = processed.aic_differences.map(
        diff => new Decimal(diff)
      );
    }

    return processed;
  }

  /**
   * Format high-precision number for display
   * @private
   */
  formatHighPrecision(value, decimals = 6) {
    if (!value) return 'N/A';

    try {
      const decimal = new Decimal(value);

      // For very small or very large numbers, use exponential notation
      if (decimal.abs().lt(0.0001) || decimal.abs().gt(1000000)) {
        return decimal.toExponential(decimals);
      }

      return decimal.toFixed(decimals);
    } catch (error) {
      return value.toString();
    }
  }

  /**
   * Handle and format errors
   * @private
   */
  handleError(error) {
    if (error.response) {
      const message = error.response.data?.error ||
                     error.response.data?.detail ||
                     'Regression analysis failed';
      return new Error(message);
    } else if (error.request) {
      return new Error('No response from server. Please check your connection.');
    } else {
      return error;
    }
  }

  /**
   * Get regression method information
   */
  getRegressionMethods() {
    return {
      linear: {
        name: 'Linear Regression',
        description: 'Simple linear relationship between variables',
        parameters: [],
        assumptions: ['Linearity', 'Independence', 'Homoscedasticity', 'Normality']
      },
      multiple: {
        name: 'Multiple Regression',
        description: 'Linear relationship with multiple predictors',
        parameters: [],
        assumptions: ['Linearity', 'Independence', 'Homoscedasticity', 'Normality', 'No multicollinearity']
      },
      polynomial: {
        name: 'Polynomial Regression',
        description: 'Non-linear relationships using polynomial terms',
        parameters: ['degree'],
        assumptions: ['Independence', 'Homoscedasticity']
      },
      logistic_binary: {
        name: 'Binary Logistic Regression',
        description: 'Binary classification with probability predictions',
        parameters: [],
        assumptions: ['Binary outcome', 'Independence', 'Linearity of logit']
      },
      logistic_multinomial: {
        name: 'Multinomial Logistic Regression',
        description: 'Multi-class classification',
        parameters: [],
        assumptions: ['Categorical outcome', 'Independence', 'IIA assumption']
      },
      ridge: {
        name: 'Ridge Regression',
        description: 'L2 regularization to prevent overfitting',
        parameters: ['alpha'],
        assumptions: ['Can handle multicollinearity']
      },
      lasso: {
        name: 'Lasso Regression',
        description: 'L1 regularization with feature selection',
        parameters: ['alpha'],
        assumptions: ['Performs variable selection']
      },
      elastic_net: {
        name: 'Elastic Net',
        description: 'Combines L1 and L2 regularization',
        parameters: ['alpha', 'l1_ratio'],
        assumptions: ['Handles correlated features']
      },
      robust_huber: {
        name: 'Huber Regression',
        description: 'Robust to outliers',
        parameters: ['epsilon'],
        assumptions: ['Less sensitive to outliers']
      },
      robust_ransac: {
        name: 'RANSAC Regression',
        description: 'Random sample consensus for outlier detection',
        parameters: ['min_samples', 'max_trials'],
        assumptions: ['Handles high outlier proportion']
      },
      robust_theil_sen: {
        name: 'Theil-Sen Regression',
        description: 'Median-based robust estimator',
        parameters: [],
        assumptions: ['Robust to up to 29% outliers']
      },
      quantile: {
        name: 'Quantile Regression',
        description: 'Predict conditional quantiles',
        parameters: ['quantile'],
        assumptions: ['No distributional assumptions']
      },
      stepwise_forward: {
        name: 'Forward Stepwise',
        description: 'Add predictors incrementally',
        parameters: ['p_enter'],
        assumptions: ['Feature selection based on significance']
      },
      stepwise_backward: {
        name: 'Backward Stepwise',
        description: 'Remove predictors incrementally',
        parameters: ['p_remove'],
        assumptions: ['Starts with all features']
      },
      stepwise_both: {
        name: 'Bidirectional Stepwise',
        description: 'Add and remove predictors',
        parameters: ['p_enter', 'p_remove'],
        assumptions: ['Flexible feature selection']
      }
    };
  }

  /**
   * Get diagnostic test descriptions
   */
  getDiagnosticTests() {
    return {
      vif: {
        name: 'Variance Inflation Factor',
        description: 'Detects multicollinearity',
        threshold: 'VIF > 10 indicates high multicollinearity'
      },
      durbin_watson: {
        name: 'Durbin-Watson Test',
        description: 'Tests for autocorrelation',
        threshold: 'Value near 2 indicates no autocorrelation'
      },
      breusch_pagan: {
        name: 'Breusch-Pagan Test',
        description: 'Tests for heteroscedasticity',
        threshold: 'p < 0.05 indicates heteroscedasticity'
      },
      jarque_bera: {
        name: 'Jarque-Bera Test',
        description: 'Tests residual normality',
        threshold: 'p < 0.05 indicates non-normality'
      },
      cooks_distance: {
        name: "Cook's Distance",
        description: 'Identifies influential observations',
        threshold: 'Value > 4/n indicates high influence'
      },
      white: {
        name: 'White Test',
        description: 'General heteroscedasticity test',
        threshold: 'p < 0.05 indicates heteroscedasticity'
      }
    };
  }
}

// Create singleton instance
const regressionAnalysisService = new RegressionAnalysisService();

// Export service
export default regressionAnalysisService;

// Export class for testing
export { RegressionAnalysisService };

// Export method information
export const regressionMethods = regressionAnalysisService.getRegressionMethods();
export const diagnosticTests = regressionAnalysisService.getDiagnosticTests();