/**
 * Power Analysis Service
 * ======================
 * Frontend service for statistical power analysis with 50 decimal precision.
 * Integrates with high-precision backend power analysis endpoints.
 *
 * @module PowerAnalysisService
 * @requires axios
 * @requires decimal.js
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
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Power Analysis Service Class
 * Provides methods for all power analysis calculations
 */
class PowerAnalysisService {
  /**
   * Calculate power for t-tests
   * @param {Object} params - Calculation parameters
   * @param {number|string} params.effect_size - Cohen's d effect size
   * @param {number} params.sample_size - Sample size per group or total
   * @param {number} params.alpha - Significance level (default: 0.05)
   * @param {string} params.alternative - 'two-sided', 'greater', or 'less'
   * @param {string} params.test_type - 'independent', 'paired', or 'one-sample'
   * @returns {Promise<Object>} Power calculation results with 50 decimal precision
   */
  async calculatePowerTTest(params) {
    try {
      const response = await api.post('/power/t-test/', params);
      return this.processHighPrecisionResponse(response.data);
    } catch (error) {
      console.error('Error calculating t-test power:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate required sample size for t-tests
   * @param {Object} params - Calculation parameters
   * @param {number|string} params.effect_size - Cohen's d effect size
   * @param {number} params.power - Desired power (default: 0.8)
   * @param {number} params.alpha - Significance level (default: 0.05)
   * @param {string} params.alternative - Alternative hypothesis
   * @param {string} params.test_type - Type of t-test
   * @returns {Promise<Object>} Sample size calculation results
   */
  async calculateSampleSizeTTest(params) {
    try {
      const response = await api.post('/power/sample-size/t-test/', params);
      return this.processHighPrecisionResponse(response.data);
    } catch (error) {
      console.error('Error calculating sample size:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate detectable effect size for t-tests
   * @param {Object} params - Calculation parameters
   * @param {number} params.sample_size - Sample size
   * @param {number} params.power - Desired power (default: 0.8)
   * @param {number} params.alpha - Significance level (default: 0.05)
   * @param {string} params.alternative - Alternative hypothesis
   * @param {string} params.test_type - Type of t-test
   * @returns {Promise<Object>} Effect size calculation results
   */
  async calculateEffectSizeTTest(params) {
    try {
      const response = await api.post('/power/effect-size/t-test/', params);
      return this.processHighPrecisionResponse(response.data);
    } catch (error) {
      console.error('Error calculating effect size:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate power for ANOVA
   * @param {Object} params - Calculation parameters
   * @param {number|string} params.effect_size - Cohen's f effect size
   * @param {number} params.groups - Number of groups
   * @param {number} params.n_per_group - Sample size per group
   * @param {number} params.alpha - Significance level (default: 0.05)
   * @returns {Promise<Object>} ANOVA power calculation results
   */
  async calculatePowerANOVA(params) {
    try {
      const response = await api.post('/power/anova/', params);
      return this.processHighPrecisionResponse(response.data);
    } catch (error) {
      console.error('Error calculating ANOVA power:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate power for correlation tests
   * @param {Object} params - Calculation parameters
   * @param {number|string} params.effect_size - Correlation coefficient (r)
   * @param {number} params.sample_size - Sample size
   * @param {number} params.alpha - Significance level (default: 0.05)
   * @param {string} params.alternative - Alternative hypothesis
   * @returns {Promise<Object>} Correlation power calculation results
   */
  async calculatePowerCorrelation(params) {
    try {
      const response = await api.post('/power/correlation/', params);
      return this.processHighPrecisionResponse(response.data);
    } catch (error) {
      console.error('Error calculating correlation power:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate power for chi-square tests
   * @param {Object} params - Calculation parameters
   * @param {number|string} params.effect_size - Cohen's w effect size
   * @param {number} params.df - Degrees of freedom
   * @param {number} params.sample_size - Total sample size
   * @param {number} params.alpha - Significance level (default: 0.05)
   * @returns {Promise<Object>} Chi-square power calculation results
   */
  async calculatePowerChiSquare(params) {
    try {
      const response = await api.post('/power/chi-square/', params);
      return this.processHighPrecisionResponse(response.data);
    } catch (error) {
      console.error('Error calculating chi-square power:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate power curves for visualization
   * @param {Object} params - Curve generation parameters
   * @param {string} params.test_type - Type of test
   * @param {Array<number>} params.effect_sizes - Range of effect sizes
   * @param {Array<number>} params.sample_sizes - Range of sample sizes
   * @param {number} params.alpha - Significance level
   * @param {Object} params.additional_params - Test-specific parameters
   * @returns {Promise<Object>} Power curves data and visualizations
   */
  async createPowerCurves(params) {
    try {
      const response = await api.post('/power/curves/', params);
      return this.processVisualizationResponse(response.data);
    } catch (error) {
      console.error('Error creating power curves:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate optimal sample allocation across groups
   * @param {Object} params - Allocation parameters
   * @param {number} params.total_sample_size - Total available sample size
   * @param {Array<number>} params.group_costs - Cost per observation in each group
   * @param {Array<number>} params.group_variances - Variance in each group
   * @param {number} params.n_groups - Number of groups
   * @returns {Promise<Object>} Optimal allocation results
   */
  async calculateOptimalAllocation(params) {
    try {
      const response = await api.post('/power/allocation/', params);
      return this.processHighPrecisionResponse(response.data);
    } catch (error) {
      console.error('Error calculating optimal allocation:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Perform sensitivity analysis
   * @param {Object} params - Sensitivity analysis parameters
   * @param {string} params.test_type - Type of test
   * @param {Object} params.base_params - Base parameters for the test
   * @param {string} params.vary_param - Parameter to vary
   * @param {Array<number>} params.vary_range - Range of values
   * @param {number} params.n_points - Number of points to evaluate
   * @returns {Promise<Object>} Sensitivity analysis results
   */
  async performSensitivityAnalysis(params) {
    try {
      const response = await api.post('/power/sensitivity/', params);
      return this.processVisualizationResponse(response.data);
    } catch (error) {
      console.error('Error performing sensitivity analysis:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Generate comprehensive power report
   * @param {Object} params - Report parameters
   * @param {string} params.test_type - Type of test
   * @param {Object} params.params - Test-specific parameters
   * @returns {Promise<Object>} Comprehensive power analysis report
   */
  async generatePowerReport(params) {
    try {
      const response = await api.post('/power/report/', params);
      return this.processReportResponse(response.data);
    } catch (error) {
      console.error('Error generating power report:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get power analysis information and guidelines
   * @returns {Promise<Object>} Power analysis methods and guidelines
   */
  async getPowerAnalysisInfo() {
    try {
      const response = await api.get('/power/info/');
      return response.data;
    } catch (error) {
      console.error('Error getting power analysis info:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Process high-precision response from backend
   * Converts string representations to Decimal.js objects
   * @private
   */
  processHighPrecisionResponse(data) {
    if (!data.success) {
      throw new Error(data.error || 'Calculation failed');
    }

    const results = data.results || data;
    const processed = { ...results };

    // Convert high-precision strings to Decimal objects
    const precisionFields = [
      'power', 'effect_size', 'critical_value', 'non_centrality',
      'actual_power', 'detectable_effect_size', 'fisher_z',
      'standard_error', 'critical_f', 'critical_chi2'
    ];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    return processed;
  }

  /**
   * Process visualization response
   * @private
   */
  processVisualizationResponse(data) {
    if (!data.success) {
      throw new Error(data.error || 'Visualization generation failed');
    }

    const results = data.results || data;

    // Ensure figure data is properly formatted
    if (results.figure) {
      results.plotlyConfig = {
        responsive: true,
        displayModeBar: true,
        toImageButtonOptions: {
          format: 'svg',
          filename: 'power_analysis',
          height: 600,
          width: 1000,
          scale: 1
        }
      };
    }

    return results;
  }

  /**
   * Process report response
   * @private
   */
  processReportResponse(data) {
    const report = data.report || data;

    // Process high-precision values in the report
    if (report.power_analysis) {
      report.power_analysis = this.processHighPrecisionResponse(report.power_analysis);
    }

    return report;
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
      // Server responded with error
      const message = error.response.data?.error ||
                     error.response.data?.detail ||
                     'Server error occurred';
      return new Error(message);
    } else if (error.request) {
      // Request made but no response
      return new Error('No response from server. Please check your connection.');
    } else {
      // Other errors
      return error;
    }
  }

  /**
   * Validate parameters before sending to backend
   * @private
   */
  validateParams(params, requiredFields) {
    const missing = requiredFields.filter(field =>
      params[field] === undefined || params[field] === null || params[field] === ''
    );

    if (missing.length > 0) {
      throw new Error(`Missing required parameters: ${missing.join(', ')}`);
    }

    return true;
  }

  /**
   * Get recommended sample size for common scenarios
   */
  getRecommendedSampleSizes() {
    return {
      small_effect: {
        t_test: { d: 0.2, n: 394 },
        anova: { f: 0.1, n: 969 },
        correlation: { r: 0.1, n: 783 },
        chi_square: { w: 0.1, n: 785 }
      },
      medium_effect: {
        t_test: { d: 0.5, n: 64 },
        anova: { f: 0.25, n: 159 },
        correlation: { r: 0.3, n: 85 },
        chi_square: { w: 0.3, n: 88 }
      },
      large_effect: {
        t_test: { d: 0.8, n: 26 },
        anova: { f: 0.4, n: 64 },
        correlation: { r: 0.5, n: 30 },
        chi_square: { w: 0.5, n: 32 }
      }
    };
  }

  /**
   * Get effect size guidelines
   */
  getEffectSizeGuidelines() {
    return {
      t_test: {
        small: 0.2,
        medium: 0.5,
        large: 0.8,
        very_large: 1.2
      },
      anova: {
        small: 0.1,
        medium: 0.25,
        large: 0.4
      },
      correlation: {
        small: 0.1,
        medium: 0.3,
        large: 0.5
      },
      chi_square: {
        small: 0.1,
        medium: 0.3,
        large: 0.5
      }
    };
  }
}

// Create singleton instance
const powerAnalysisService = new PowerAnalysisService();

// Export service
export default powerAnalysisService;

// Export class for testing
export { PowerAnalysisService };

// Export utility functions
export const effectSizeGuidelines = powerAnalysisService.getEffectSizeGuidelines();
export const recommendedSampleSizes = powerAnalysisService.getRecommendedSampleSizes();