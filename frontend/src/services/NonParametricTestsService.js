/**
 * Non-Parametric Tests Service
 * ============================
 * Frontend service for non-parametric statistical tests with 50 decimal precision.
 * For data that doesn't meet parametric test assumptions.
 *
 * @module NonParametricTestsService
 * @requires axios
 * @requires decimal.js
 *
 * Supported Tests:
 * - Mann-Whitney U test (Wilcoxon rank-sum)
 * - Wilcoxon Signed-Rank test
 * - Kruskal-Wallis test
 * - Friedman test
 * - Sign test
 * - Mood's median test
 * - Jonckheere-Terpstra test
 * - Page's trend test
 * - Dunn's test (post-hoc)
 * - Nemenyi test (post-hoc)
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
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Create axios instance with authentication
const api = axios.create({
  baseURL: `${API_BASE_URL}/v1`,
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
 * Non-Parametric Tests Service Class
 */
class NonParametricTestsService {
  /**
   * Mann-Whitney U Test (Wilcoxon Rank-Sum Test)
   * For comparing two independent samples
   * @param {Array<number>} group1 - First group data
   * @param {Array<number>} group2 - Second group data
   * @param {Object} options - Test options
   * @param {string} options.alternative - 'two-sided', 'greater', or 'less'
   * @param {boolean} options.use_continuity - Continuity correction
   * @param {boolean} options.exact - Use exact p-value calculation
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async mannWhitneyU(group1, group2, options = {}) {
    try {
      // Backend reads parameters flat at the top level (see nonparametric_views.py).
      // Do NOT nest under data/parameters/options — the adapter would treat the
      // wrapper dict as the group list and np.isnan() would crash on its keys.
      const requestData = {
        group1: group1,
        group2: group2,
        alternative: options.alternative || 'two-sided',
        use_continuity: options.use_continuity !== false,
        exact: options.exact || false,
        confidence_level: options.confidence_level || 0.95,
        calculate_effect_size: options.include_effect_size !== false
      };

      const response = await api.post('/nonparametric/mann-whitney/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Mann-Whitney U test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Wilcoxon Signed-Rank Test
   * For comparing two paired samples
   * @param {Array<number>} data1 - First paired sample
   * @param {Array<number>} data2 - Second paired sample (or null for one-sample)
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async wilcoxonSignedRank(data1, data2 = null, options = {}) {
    try {
      // Wilcoxon view reads x/y (or data1/data2) flat from request.data.
      const requestData = {
        x: data1,
        y: data2,
        alternative: options.alternative || 'two-sided',
        mode: options.mode || 'auto',
        zero_method: options.zero_method || 'wilcox',
        correction: options.correction !== false,
        exact: options.exact || false
      };

      const response = await api.post('/nonparametric/wilcoxon/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Wilcoxon Signed-Rank test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Kruskal-Wallis Test
   * Non-parametric alternative to one-way ANOVA
   * @param {Array<Array<number>>} groups - Array of group data
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async kruskalWallis(groups, options = {}) {
    try {
      // Kruskal-Wallis view reads groups/nan_policy flat at the top level.
      const requestData = {
        groups: groups,
        group_names: options.group_names || groups.map((_, i) => `Group ${i + 1}`),
        nan_policy: options.nan_policy || 'omit',
        tie_correction: options.tie_correction !== false,
        calculate_effect_size: options.include_effect_size !== false
      };

      const response = await api.post('/nonparametric/kruskal-wallis/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Kruskal-Wallis test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Friedman Test
   * Non-parametric alternative to repeated measures ANOVA
   * @param {Array<Array<number>>} data - Data matrix (subjects x conditions)
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async friedmanTest(data, options = {}) {
    try {
      // Friedman view reads measurements flat at the top level.
      const requestData = {
        measurements: data,
        condition_names: options.condition_names || data[0].map((_, i) => `Condition ${i + 1}`),
        use_ranks: options.use_ranks !== false,
        tie_correction: options.tie_correction !== false,
        calculate_effect_size: options.include_effect_size !== false
      };

      const response = await api.post('/nonparametric/friedman/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Friedman test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Sign Test
   * Simple non-parametric test for paired data
   * @param {Array<number>} data1 - First sample
   * @param {Array<number>} data2 - Second sample (or expected value for one-sample)
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async signTest(data1, data2, options = {}) {
    try {
      // Sign test view reads x/y (or data1/data2) flat from request.data.
      const requestData = {
        x: data1,
        y: data2,
        alternative: options.alternative || 'two-sided',
        mu: options.mu || 0,
        exact: options.exact || true
      };

      const response = await api.post('/nonparametric/sign/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Sign test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Mood's Median Test
   * Test if samples have the same median
   * @param {Array<Array<number>>} groups - Array of group data
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async moodsMedianTest(groups, options = {}) {
    try {
      // Mood's median view reads groups/ties/nan_policy flat at the top level.
      const requestData = {
        groups: groups,
        ties: options.ties || 'average',
        nan_policy: options.nan_policy || 'omit',
        correction: options.correction !== false,
        lambda_: options.lambda_ || null
      };

      const response = await api.post('/nonparametric/mood/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Mood\'s Median test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Jonckheere-Terpstra Test
   * Test for ordered alternatives
   * @param {Array<Array<number>>} groups - Ordered groups
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async jonckheereTerpstraTest(groups, options = {}) {
    try {
      // Jonckheere-Terpstra view reads groups/alternative flat at the top level.
      const requestData = {
        groups: groups,
        alternative: options.alternative || 'increasing',
        exact: options.exact || false
      };

      const response = await api.post('/nonparametric/jonckheere/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Jonckheere-Terpstra test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Page's Trend Test
   * Test for monotonic trend in repeated measures
   * @param {Array<Array<number>>} data - Data matrix
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async pagesTrendTest(data, options = {}) {
    try {
      // Page's trend view reads data (or groups) + ranked flat at the top level.
      const requestData = {
        data: data,
        ranked: options.ranked || false,
        alternative: options.alternative || 'increasing'
      };

      const response = await api.post('/nonparametric/page/', requestData);
      return this.processTestResponse(response.data);
    } catch (error) {
      console.error('Error performing Page\'s Trend test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Dunn's Test (Post-hoc for Kruskal-Wallis)
   * @param {Array<Array<number>>} groups - Group data
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Post-hoc test results
   */
  async dunnsTest(groups, options = {}) {
    try {
      // Post-hoc view reads groups/test_type/p_adjust flat at the top level.
      const requestData = {
        groups: groups,
        test_type: 'dunn',
        p_adjust: options.p_adjust_method || 'bonferroni',
        use_rank: options.use_rank !== false,
        alpha: options.alpha || 0.05
      };

      const response = await api.post('/nonparametric/post-hoc/', requestData);
      return this.processPostHocResponse(response.data);
    } catch (error) {
      console.error('Error performing Dunn\'s test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Nemenyi Test (Post-hoc for Friedman)
   * @param {Array<Array<number>>} data - Data matrix
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Post-hoc test results
   */
  async nemenyiTest(data, options = {}) {
    try {
      const requestData = {
        data: {
          measurements: data
        },
        test: 'nemenyi',
        parameters: {
          dist: options.dist || 'chi2',
          alpha: options.alpha || 0.05
        },
        options: {
          include_critical_difference: options.include_critical_difference !== false,
          include_rank_matrix: options.include_rank_matrix !== false,
          include_visualization: options.include_visualization || false
        }
      };

      const response = await api.post('/nonparametric/nemenyi/', requestData);
      return this.processPostHocResponse(response.data);
    } catch (error) {
      console.error('Error performing Nemenyi test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Perform automatic non-parametric test selection
   * @param {Object} data - Data for analysis
   * @param {Object} options - Options for test selection
   * @returns {Promise<Object>} Recommended test and results
   */
  async automaticTestSelection(data, options = {}) {
    try {
      const requestData = {
        data: data,
        analysis_type: options.analysis_type || 'auto',
        parameters: {
          check_normality: options.check_normality !== false,
          check_homogeneity: options.check_homogeneity !== false,
          check_independence: options.check_independence !== false,
          significance_level: options.significance_level || 0.05
        }
      };

      const response = await api.post('/nonparametric/recommend/', requestData);
      return this.processRecommendationResponse(response.data);
    } catch (error) {
      console.error('Error in automatic test selection:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Process test response with high precision
   * @private
   */
  processTestResponse(data) {
    if (!data.success) {
      throw new Error(data.error || 'Test execution failed');
    }

    const results = data.results || data;
    const processed = { ...results };

    // Convert high-precision strings to Decimal objects
    const precisionFields = [
      'statistic', 'p_value', 'u_statistic', 'w_statistic', 'h_statistic',
      'chi_squared', 'z_score', 'effect_size', 'rank_sum', 'mean_rank',
      'hodges_lehmann_estimate', 'kendalls_w', 'epsilon_squared',
      'rank_biserial_correlation'
    ];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Process confidence intervals
    if (processed.confidence_interval) {
      processed.confidence_interval_decimal = {
        lower: new Decimal(processed.confidence_interval.lower),
        upper: new Decimal(processed.confidence_interval.upper)
      };
    }

    // Process effect sizes
    if (processed.effect_sizes) {
      processed.effect_sizes_decimal = {};
      Object.keys(processed.effect_sizes).forEach(key => {
        const value = processed.effect_sizes[key];
        if (typeof value === 'string') {
          processed.effect_sizes_decimal[key] = new Decimal(value);
        }
      });
    }

    return processed;
  }

  /**
   * Process post-hoc test response
   * @private
   */
  processPostHocResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // Process pairwise comparisons. The backend returns `comparisons` as an
    // object keyed by "Group_1_vs_Group_2" (not an array), so normalize to a
    // labelled array before rendering.
    if (processed.comparisons && typeof processed.comparisons === 'object') {
      const entries = Array.isArray(processed.comparisons)
        ? processed.comparisons.map((c, i) => [`Comparison ${i + 1}`, c])
        : Object.entries(processed.comparisons);

      processed.comparisons = entries.map(([label, comparison]) => {
        const comp = { label: String(label).replace(/_/g, ' '), ...comparison };

        // Convert any high-precision string values for display
        if (comp.p_value && typeof comp.p_value === 'string') {
          comp.p_value_decimal = new Decimal(comp.p_value);
          comp.p_value_display = this.formatHighPrecision(comp.p_value);
        }

        if (comp.statistic && typeof comp.statistic === 'string') {
          comp.statistic_decimal = new Decimal(comp.statistic);
          comp.statistic_display = this.formatHighPrecision(comp.statistic);
        }

        return comp;
      });
    }

    // Process critical difference
    if (processed.critical_difference && typeof processed.critical_difference === 'string') {
      processed.critical_difference_decimal = new Decimal(processed.critical_difference);
      processed.critical_difference_display = this.formatHighPrecision(processed.critical_difference);
    }

    return processed;
  }

  /**
   * Process recommendation response
   * @private
   */
  processRecommendationResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // Process test results if executed
    if (processed.test_results) {
      processed.test_results = this.processTestResponse(processed.test_results);
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

      // For very small p-values
      if (decimal.lt(0.0001)) {
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
                     'Non-parametric test failed';
      return new Error(message);
    } else if (error.request) {
      return new Error('No response from server. Please check your connection.');
    } else {
      return error;
    }
  }

  /**
   * Get test information and guidelines
   */
  getTestInformation() {
    return {
      mann_whitney: {
        name: 'Mann-Whitney U Test',
        alternative_names: ['Wilcoxon Rank-Sum Test'],
        use_case: 'Compare two independent samples',
        assumptions: ['Independent observations', 'Ordinal or continuous data'],
        parametric_equivalent: 'Independent samples t-test'
      },
      wilcoxon: {
        name: 'Wilcoxon Signed-Rank Test',
        use_case: 'Compare two paired samples or one sample to a value',
        assumptions: ['Paired observations', 'Symmetric distribution of differences'],
        parametric_equivalent: 'Paired samples t-test'
      },
      kruskal_wallis: {
        name: 'Kruskal-Wallis Test',
        use_case: 'Compare three or more independent samples',
        assumptions: ['Independent observations', 'Similar distribution shapes'],
        parametric_equivalent: 'One-way ANOVA'
      },
      friedman: {
        name: 'Friedman Test',
        use_case: 'Compare three or more repeated measures',
        assumptions: ['Repeated measures', 'Ordinal or continuous data'],
        parametric_equivalent: 'Repeated measures ANOVA'
      },
      sign: {
        name: 'Sign Test',
        use_case: 'Simple test for paired data or median',
        assumptions: ['Paired observations', 'No distribution assumptions'],
        parametric_equivalent: 'One-sample or paired t-test'
      },
      moods_median: {
        name: 'Mood\'s Median Test',
        use_case: 'Test equality of medians across groups',
        assumptions: ['Independent observations', 'Any distribution'],
        parametric_equivalent: 'One-way ANOVA'
      },
      jonckheere: {
        name: 'Jonckheere-Terpstra Test',
        use_case: 'Test for ordered alternatives',
        assumptions: ['Independent observations', 'Ordered groups'],
        note: 'More powerful than Kruskal-Wallis for ordered alternatives'
      },
      pages: {
        name: 'Page\'s Trend Test',
        use_case: 'Test for monotonic trend in repeated measures',
        assumptions: ['Repeated measures', 'Predicted ordering'],
        note: 'Extension of Friedman test for ordered alternatives'
      }
    };
  }

  /**
   * Get effect size interpretations
   */
  getEffectSizeGuidelines() {
    return {
      rank_biserial: {
        small: 0.1,
        medium: 0.3,
        large: 0.5,
        interpretation: 'Proportion of rank differences'
      },
      epsilon_squared: {
        small: 0.01,
        medium: 0.06,
        large: 0.14,
        interpretation: 'Proportion of variance explained'
      },
      kendalls_w: {
        small: 0.1,
        medium: 0.3,
        large: 0.5,
        interpretation: 'Agreement among raters (0 = no agreement, 1 = perfect)'
      },
      glass_rank_biserial: {
        small: 0.2,
        medium: 0.5,
        large: 0.8,
        interpretation: 'Standardized difference in ranks'
      }
    };
  }
}

// Create singleton instance
const nonParametricTestsService = new NonParametricTestsService();

// Export service
export default nonParametricTestsService;

// Export class for testing
export { NonParametricTestsService };

// Export test information
export const testInformation = nonParametricTestsService.getTestInformation();
export const effectSizeGuidelines = nonParametricTestsService.getEffectSizeGuidelines();