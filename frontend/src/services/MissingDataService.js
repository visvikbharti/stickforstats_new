/**
 * Missing Data Service
 * ====================
 * Frontend service for missing data analysis and imputation with 50 decimal precision.
 * Integrates with comprehensive missing data handler backend.
 *
 * @module MissingDataService
 * @requires axios
 * @requires decimal.js
 *
 * Pattern Detection:
 * - MCAR (Missing Completely At Random)
 * - MAR (Missing At Random)
 * - MNAR (Missing Not At Random)
 *
 * Imputation Methods (14 total):
 * - Mean/Median/Mode
 * - Forward/Backward fill
 * - Linear interpolation
 * - KNN imputation
 * - MICE (Multiple Imputation by Chained Equations)
 * - Hot deck/Cold deck
 * - Regression-based
 * - EM algorithm
 * - Random forest
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
 * Missing Data Service Class
 */
class MissingDataService {
  /**
   * Analyze missing data patterns
   * @param {Array<Array<any>>} data - Data matrix with potential missing values
   * @param {Object} options - Analysis options
   * @param {Array<string>} options.column_names - Names of columns
   * @param {Array<string>} options.column_types - Types of columns ('numeric', 'categorical')
   * @returns {Promise<Object>} Missing data analysis results
   */
  async analyzeMissingPatterns(data, options = {}) {
    try {
      const requestData = {
        data: {
          values: data,
          column_names: options.column_names || null,
          column_types: options.column_types || null
        },
        analysis: {
          check_mcar: options.check_mcar !== false,
          check_mar: options.check_mar !== false,
          check_mnar: options.check_mnar !== false,
          perform_littles_test: options.perform_littles_test !== false,
          calculate_correlations: options.calculate_correlations !== false
        },
        options: {
          include_visualization: options.include_visualization || false,
          include_recommendations: options.include_recommendations !== false,
          significance_level: options.significance_level || 0.05
        }
      };

      const response = await api.post('/missing/analyze/', requestData);
      return this.processAnalysisResponse(response.data);
    } catch (error) {
      console.error('Error analyzing missing data patterns:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Little's MCAR Test
   * Tests if data is Missing Completely At Random
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Little's test results with 50 decimal precision
   */
  async littlesMCARTest(data, options = {}) {
    try {
      const requestData = {
        data: {
          values: data,
          column_names: options.column_names || null
        },
        parameters: {
          significance_level: options.significance_level || 0.05,
          max_iterations: options.max_iterations || 100,
          tolerance: options.tolerance || 1e-8
        },
        options: {
          include_pattern_matrix: options.include_pattern_matrix || false,
          include_covariance_matrices: options.include_covariance_matrices || false
        }
      };

      const response = await api.post('/missing/littles-test/', requestData);
      return this.processLittlesTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Little\'s MCAR test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Impute missing data
   * @param {Array<Array<any>>} data - Data matrix with missing values
   * @param {string} method - Imputation method
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data and statistics
   */
  async imputeData(data, method = 'mean', options = {}) {
    try {
      const requestData = {
        data: {
          values: data,
          column_names: options.column_names || null,
          column_types: options.column_types || null
        },
        method: method,
        parameters: this.getImputationParameters(method, options),
        options: {
          return_statistics: options.return_statistics !== false,
          return_uncertainty: options.return_uncertainty || false,
          validate_imputation: options.validate_imputation !== false,
          maintain_precision: true  // Always maintain 50 decimal precision
        }
      };

      const response = await api.post('/missing/impute/', requestData);
      return this.processImputationResponse(response.data);
    } catch (error) {
      console.error(`Error imputing data with ${method}:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * Mean imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeMean(data, options = {}) {
    return this.imputeData(data, 'mean', options);
  }

  /**
   * Median imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeMedian(data, options = {}) {
    return this.imputeData(data, 'median', options);
  }

  /**
   * Mode imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeMode(data, options = {}) {
    return this.imputeData(data, 'mode', options);
  }

  /**
   * Forward fill imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeForwardFill(data, options = {}) {
    return this.imputeData(data, 'forward_fill', {
      ...options,
      limit: options.limit || null
    });
  }

  /**
   * Backward fill imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeBackwardFill(data, options = {}) {
    return this.imputeData(data, 'backward_fill', {
      ...options,
      limit: options.limit || null
    });
  }

  /**
   * Linear interpolation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeLinearInterpolation(data, options = {}) {
    return this.imputeData(data, 'linear_interpolation', {
      ...options,
      order: options.order || 1,
      limit_direction: options.limit_direction || 'both'
    });
  }

  /**
   * KNN (K-Nearest Neighbors) imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeKNN(data, options = {}) {
    return this.imputeData(data, 'knn', {
      ...options,
      n_neighbors: options.n_neighbors || 5,
      weights: options.weights || 'uniform',
      metric: options.metric || 'euclidean'
    });
  }

  /**
   * MICE (Multiple Imputation by Chained Equations)
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Multiple imputed datasets
   */
  async imputeMICE(data, options = {}) {
    return this.imputeData(data, 'mice', {
      ...options,
      n_imputations: options.n_imputations || 5,
      max_iterations: options.max_iterations || 10,
      estimator: options.estimator || 'bayesian_ridge',
      random_state: options.random_state || null
    });
  }

  /**
   * Hot deck imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeHotDeck(data, options = {}) {
    return this.imputeData(data, 'hot_deck', {
      ...options,
      deck_size: options.deck_size || null,
      matching_variables: options.matching_variables || null
    });
  }

  /**
   * Cold deck imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Array<Array<any>>} externalData - External dataset for imputation
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeColdDeck(data, externalData, options = {}) {
    return this.imputeData(data, 'cold_deck', {
      ...options,
      external_data: externalData,
      matching_method: options.matching_method || 'nearest'
    });
  }

  /**
   * Regression imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeRegression(data, options = {}) {
    return this.imputeData(data, 'regression', {
      ...options,
      add_noise: options.add_noise || true,
      predictor_columns: options.predictor_columns || null,
      method: options.method || 'ols'
    });
  }

  /**
   * EM (Expectation-Maximization) algorithm imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeEM(data, options = {}) {
    return this.imputeData(data, 'em', {
      ...options,
      max_iterations: options.max_iterations || 100,
      tolerance: options.tolerance || 1e-8,
      covariance_type: options.covariance_type || 'full'
    });
  }

  /**
   * Random Forest imputation
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Imputation options
   * @returns {Promise<Object>} Imputed data
   */
  async imputeRandomForest(data, options = {}) {
    return this.imputeData(data, 'random_forest', {
      ...options,
      n_estimators: options.n_estimators || 100,
      max_depth: options.max_depth || null,
      min_samples_split: options.min_samples_split || 2
    });
  }

  /**
   * Compare multiple imputation methods
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Array<string>} methods - Methods to compare
   * @param {Object} options - Comparison options
   * @returns {Promise<Object>} Comparison results
   */
  async compareImputationMethods(data, methods, options = {}) {
    try {
      const requestData = {
        data: {
          values: data,
          column_names: options.column_names || null
        },
        methods: methods,
        evaluation: {
          metrics: options.metrics || ['rmse', 'mae', 'bias'],
          cross_validation: options.cross_validation || false,
          cv_folds: options.cv_folds || 5
        },
        options: {
          include_visualization: options.include_visualization || false,
          include_recommendations: options.include_recommendations !== false
        }
      };

      const response = await api.post('/missing/compare-methods/', requestData);
      return this.processComparisonResponse(response.data);
    } catch (error) {
      console.error('Error comparing imputation methods:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Visualize missing data patterns
   * @param {Array<Array<any>>} data - Data matrix
   * @param {Object} options - Visualization options
   * @returns {Promise<Object>} Visualization data
   */
  async visualizeMissingPatterns(data, options = {}) {
    try {
      const requestData = {
        data: {
          values: data,
          column_names: options.column_names || null
        },
        visualization_types: options.types || ['matrix', 'bar', 'heatmap', 'dendrogram'],
        options: {
          color_scheme: options.color_scheme || 'default',
          include_statistics: options.include_statistics !== false,
          interactive: options.interactive !== false
        }
      };

      const response = await api.post('/missing/visualize/', requestData);
      return this.processVisualizationResponse(response.data);
    } catch (error) {
      console.error('Error visualizing missing patterns:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get imputation parameters based on method
   * @private
   */
  getImputationParameters(method, options) {
    const baseParams = {
      handle_categorical: options.handle_categorical || 'mode',
      maintain_data_types: options.maintain_data_types !== false
    };

    const methodParams = {
      mean: {},
      median: {},
      mode: {},
      forward_fill: {
        limit: options.limit || null
      },
      backward_fill: {
        limit: options.limit || null
      },
      linear_interpolation: {
        order: options.order || 1,
        limit_direction: options.limit_direction || 'both'
      },
      knn: {
        n_neighbors: options.n_neighbors || 5,
        weights: options.weights || 'uniform',
        metric: options.metric || 'euclidean'
      },
      mice: {
        n_imputations: options.n_imputations || 5,
        max_iterations: options.max_iterations || 10,
        estimator: options.estimator || 'bayesian_ridge'
      },
      hot_deck: {
        deck_size: options.deck_size || null,
        matching_variables: options.matching_variables || null
      },
      cold_deck: {
        external_data: options.external_data || null,
        matching_method: options.matching_method || 'nearest'
      },
      regression: {
        add_noise: options.add_noise !== false,
        predictor_columns: options.predictor_columns || null,
        method: options.regression_method || 'ols'
      },
      em: {
        max_iterations: options.max_iterations || 100,
        tolerance: options.tolerance || 1e-8,
        covariance_type: options.covariance_type || 'full'
      },
      random_forest: {
        n_estimators: options.n_estimators || 100,
        max_depth: options.max_depth || null,
        min_samples_split: options.min_samples_split || 2
      }
    };

    return { ...baseParams, ...methodParams[method] };
  }

  /**
   * Process analysis response
   * @private
   */
  processAnalysisResponse(data) {
    if (!data.success) {
      throw new Error(data.error || 'Missing data analysis failed');
    }

    const results = data.results || data;
    const processed = { ...results };

    // Process statistics with high precision
    if (processed.statistics) {
      const stats = processed.statistics;

      // Missing percentages
      if (stats.missing_percentages) {
        processed.missing_percentages_decimal = {};
        Object.keys(stats.missing_percentages).forEach(col => {
          const value = stats.missing_percentages[col];
          if (typeof value === 'string') {
            processed.missing_percentages_decimal[col] = new Decimal(value);
          }
        });
      }

      // Correlations
      if (stats.missing_correlations) {
        processed.missing_correlations_decimal = this.processMatrix(stats.missing_correlations);
      }
    }

    // Process test results
    if (processed.pattern_tests) {
      processed.pattern_tests = this.processPatternTests(processed.pattern_tests);
    }

    return processed;
  }

  /**
   * Process Little's test response
   * @private
   */
  processLittlesTestResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['chi2_statistic', 'p_value', 'critical_value'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Add interpretation
    if (processed.p_value) {
      const pVal = typeof processed.p_value === 'string'
        ? parseFloat(processed.p_value)
        : processed.p_value;

      processed.is_mcar = pVal > 0.05;
      processed.interpretation = pVal > 0.05
        ? 'Data appears to be Missing Completely At Random (MCAR)'
        : 'Data is likely not Missing Completely At Random';
    }

    return processed;
  }

  /**
   * Process imputation response
   * @private
   */
  processImputationResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // Process imputed data with high precision
    if (processed.imputed_data) {
      processed.imputed_data_decimal = this.processMatrix(processed.imputed_data);
    }

    // Process statistics
    if (processed.imputation_statistics) {
      const stats = processed.imputation_statistics;

      // Imputed values statistics
      if (stats.mean_imputed) {
        processed.mean_imputed_decimal = new Decimal(stats.mean_imputed);
      }
      if (stats.std_imputed) {
        processed.std_imputed_decimal = new Decimal(stats.std_imputed);
      }

      // Quality metrics
      if (stats.quality_metrics) {
        processed.quality_metrics_decimal = {};
        Object.keys(stats.quality_metrics).forEach(metric => {
          const value = stats.quality_metrics[metric];
          if (typeof value === 'string') {
            processed.quality_metrics_decimal[metric] = new Decimal(value);
          }
        });
      }
    }

    // Process uncertainty (for MICE)
    if (processed.uncertainty_estimates) {
      processed.uncertainty_estimates_decimal = this.processMatrix(processed.uncertainty_estimates);
    }

    return processed;
  }

  /**
   * Process comparison response
   * @private
   */
  processComparisonResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // Process comparison metrics
    if (processed.comparison_results) {
      processed.comparison_results = processed.comparison_results.map(result => {
        const methodResult = { ...result };

        // Convert metrics to high precision
        if (methodResult.metrics) {
          methodResult.metrics_decimal = {};
          Object.keys(methodResult.metrics).forEach(metric => {
            const value = methodResult.metrics[metric];
            if (typeof value === 'string') {
              methodResult.metrics_decimal[metric] = new Decimal(value);
              methodResult[`${metric}_display`] = this.formatHighPrecision(value);
            }
          });
        }

        return methodResult;
      });
    }

    // Process best method recommendation
    if (processed.best_method) {
      processed.recommendation = this.generateRecommendation(processed.best_method, processed.comparison_results);
    }

    return processed;
  }

  /**
   * Process visualization response
   * @private
   */
  processVisualizationResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // Process visualization data
    if (processed.visualizations) {
      processed.visualizations = processed.visualizations.map(viz => ({
        ...viz,
        interactive: viz.plotly_json ? JSON.parse(viz.plotly_json) : null
      }));
    }

    return processed;
  }

  /**
   * Process pattern test results
   * @private
   */
  processPatternTests(tests) {
    const processed = { ...tests };

    // Process each test result
    ['mcar_test', 'mar_test', 'mnar_test'].forEach(test => {
      if (processed[test]) {
        const testResult = processed[test];
        if (testResult.p_value && typeof testResult.p_value === 'string') {
          testResult.p_value_decimal = new Decimal(testResult.p_value);
          testResult.p_value_display = this.formatHighPrecision(testResult.p_value);
        }
        if (testResult.statistic && typeof testResult.statistic === 'string') {
          testResult.statistic_decimal = new Decimal(testResult.statistic);
          testResult.statistic_display = this.formatHighPrecision(testResult.statistic);
        }
      }
    });

    return processed;
  }

  /**
   * Process matrix data for high precision
   * @private
   */
  processMatrix(matrix) {
    if (!matrix) return null;
    return matrix.map(row =>
      Array.isArray(row)
        ? row.map(val => typeof val === 'string' ? new Decimal(val) : val)
        : typeof row === 'string' ? new Decimal(row) : row
    );
  }

  /**
   * Format high-precision number for display
   * @private
   */
  formatHighPrecision(value, decimals = 6) {
    if (!value) return 'N/A';

    try {
      const decimal = new Decimal(value);

      // For very small values
      if (decimal.abs().lt(0.0001)) {
        return decimal.toExponential(decimals);
      }

      return decimal.toFixed(decimals);
    } catch (error) {
      return value.toString();
    }
  }

  /**
   * Generate recommendation based on comparison
   * @private
   */
  generateRecommendation(bestMethod, comparisonResults) {
    const recommendations = {
      mean: 'Mean imputation is suitable for normally distributed data with MCAR pattern',
      median: 'Median imputation is robust to outliers and suitable for skewed data',
      mode: 'Mode imputation is best for categorical variables',
      knn: 'KNN imputation preserves local patterns and relationships',
      mice: 'MICE provides the most sophisticated imputation with uncertainty quantification',
      regression: 'Regression imputation maintains relationships between variables',
      em: 'EM algorithm is optimal for multivariate normal data',
      random_forest: 'Random Forest handles non-linear relationships and mixed data types well'
    };

    return {
      method: bestMethod,
      rationale: recommendations[bestMethod] || 'Selected based on performance metrics',
      caution: 'Always validate imputation results against domain knowledge'
    };
  }

  /**
   * Handle and format errors
   * @private
   */
  handleError(error) {
    if (error.response) {
      const message = error.response.data?.error ||
                     error.response.data?.detail ||
                     'Missing data operation failed';
      return new Error(message);
    } else if (error.request) {
      return new Error('No response from server. Please check your connection.');
    } else {
      return error;
    }
  }

  /**
   * Get imputation method information
   */
  getImputationMethods() {
    return {
      mean: {
        name: 'Mean Imputation',
        description: 'Replace with column mean',
        pros: 'Simple, preserves mean',
        cons: 'Reduces variance, ignores relationships',
        best_for: 'MCAR data, small missing percentages'
      },
      median: {
        name: 'Median Imputation',
        description: 'Replace with column median',
        pros: 'Robust to outliers',
        cons: 'Reduces variance',
        best_for: 'Skewed distributions'
      },
      mode: {
        name: 'Mode Imputation',
        description: 'Replace with most frequent value',
        pros: 'Works for categorical data',
        cons: 'Can create artificial modes',
        best_for: 'Categorical variables'
      },
      forward_fill: {
        name: 'Forward Fill',
        description: 'Propagate last valid observation',
        pros: 'Preserves temporal patterns',
        cons: 'Not suitable for non-temporal data',
        best_for: 'Time series data'
      },
      knn: {
        name: 'K-Nearest Neighbors',
        description: 'Impute based on similar observations',
        pros: 'Preserves local patterns',
        cons: 'Computationally intensive',
        best_for: 'Data with clear clusters'
      },
      mice: {
        name: 'Multiple Imputation',
        description: 'Iterative imputation with uncertainty',
        pros: 'Accounts for uncertainty, maintains relationships',
        cons: 'Complex, computationally intensive',
        best_for: 'MAR data, research applications'
      },
      regression: {
        name: 'Regression Imputation',
        description: 'Predict missing values using regression',
        pros: 'Maintains relationships',
        cons: 'Can overfit',
        best_for: 'Linear relationships'
      },
      em: {
        name: 'EM Algorithm',
        description: 'Maximum likelihood estimation',
        pros: 'Theoretically sound',
        cons: 'Assumes multivariate normal',
        best_for: 'Multivariate normal data'
      },
      random_forest: {
        name: 'Random Forest',
        description: 'Ensemble tree-based imputation',
        pros: 'Handles non-linear, mixed types',
        cons: 'Can be slow, black box',
        best_for: 'Complex relationships, mixed data'
      }
    };
  }

  /**
   * Get missing data pattern descriptions
   */
  getMissingPatterns() {
    return {
      MCAR: {
        name: 'Missing Completely At Random',
        description: 'Missingness is independent of all variables',
        test: 'Little\'s MCAR test',
        implications: 'Most imputation methods are valid'
      },
      MAR: {
        name: 'Missing At Random',
        description: 'Missingness depends on observed variables',
        test: 'Logistic regression analysis',
        implications: 'Multiple imputation recommended'
      },
      MNAR: {
        name: 'Missing Not At Random',
        description: 'Missingness depends on unobserved values',
        test: 'Sensitivity analysis required',
        implications: 'Specialized methods needed, consider selection models'
      }
    };
  }
}

// Create singleton instance
const missingDataService = new MissingDataService();

// Export service
export default missingDataService;

// Export class for testing
export { MissingDataService };

// Export information
export const imputationMethods = missingDataService.getImputationMethods();
export const missingPatterns = missingDataService.getMissingPatterns();