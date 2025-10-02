/**
 * Categorical Analysis Service
 * ============================
 * Frontend service for categorical data analysis with 50 decimal precision.
 * Integrates with high-precision categorical tests backend.
 *
 * @module CategoricalAnalysisService
 * @requires axios
 * @requires decimal.js
 *
 * Supported Tests:
 * - Chi-square test of independence
 * - Chi-square goodness of fit
 * - Fisher's exact test
 * - McNemar's test
 * - Cochran's Q test
 * - G-test (Likelihood ratio)
 * - Binomial test
 * - Multinomial test
 *
 * Effect Sizes:
 * - Cramér's V
 * - Phi coefficient
 * - Odds ratio
 * - Risk ratio
 * - Cohen's kappa
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
 * Categorical Analysis Service Class
 */
class CategoricalAnalysisService {
  /**
   * Chi-square test of independence
   * Tests if two categorical variables are independent
   * @param {Array<Array<number>>} contingencyTable - 2D array of observed frequencies
   * @param {Object} options - Test options
   * @param {boolean} options.correction - Yates' continuity correction for 2x2 tables
   * @param {number} options.lambda_ - Lambda for log-linear analysis
   * @param {Array<string>} options.row_labels - Labels for rows
   * @param {Array<string>} options.col_labels - Labels for columns
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async chiSquareIndependence(contingencyTable, options = {}) {
    try {
      const requestData = {
        data: {
          contingency_table: contingencyTable,
          row_labels: options.row_labels || null,
          col_labels: options.col_labels || null
        },
        test_type: 'independence',
        parameters: {
          correction: options.correction || false,
          lambda_: options.lambda_ || null,
          confidence_level: options.confidence_level || 0.95
        },
        options: {
          include_expected: options.include_expected !== false,
          include_residuals: options.include_residuals || false,
          include_effect_sizes: options.include_effect_sizes !== false,
          include_post_hoc: options.include_post_hoc || false,
          include_visualization: options.include_visualization || false
        }
      };

      const response = await api.post('/categorical/chi-square/', requestData);
      return this.processChiSquareResponse(response.data);
    } catch (error) {
      console.error('Error performing chi-square independence test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Chi-square goodness of fit test
   * Tests if observed frequencies match expected distribution
   * @param {Array<number>} observed - Observed frequencies
   * @param {Array<number>} expected - Expected frequencies (or null for uniform)
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async chiSquareGoodnessOfFit(observed, expected = null, options = {}) {
    try {
      const requestData = {
        data: {
          observed: observed,
          expected: expected,
          categories: options.categories || null
        },
        test_type: 'goodness_of_fit',
        parameters: {
          ddof: options.ddof || 0,
          confidence_level: options.confidence_level || 0.95
        },
        options: {
          include_residuals: options.include_residuals !== false,
          include_visualization: options.include_visualization || false
        }
      };

      const response = await api.post('/categorical/chi-square/', requestData);
      return this.processChiSquareResponse(response.data);
    } catch (error) {
      console.error('Error performing chi-square goodness of fit test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Fisher's exact test
   * Exact test for 2x2 contingency tables
   * @param {Array<Array<number>>} table - 2x2 contingency table
   * @param {Object} options - Test options
   * @param {string} options.alternative - 'two-sided', 'greater', or 'less'
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async fishersExactTest(table, options = {}) {
    try {
      const requestData = {
        data: {
          contingency_table: table
        },
        parameters: {
          alternative: options.alternative || 'two-sided',
          confidence_level: options.confidence_level || 0.95
        },
        options: {
          include_odds_ratio: options.include_odds_ratio !== false,
          include_confidence_interval: options.include_confidence_interval !== false,
          include_all_p_values: options.include_all_p_values || false
        }
      };

      const response = await api.post('/categorical/fishers-exact/', requestData);
      return this.processFishersResponse(response.data);
    } catch (error) {
      console.error('Error performing Fisher\'s exact test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * McNemar's test
   * Test for paired nominal data
   * @param {Array<Array<number>>} table - 2x2 table of paired observations
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async mcnemarsTest(table, options = {}) {
    try {
      const requestData = {
        data: {
          contingency_table: table
        },
        parameters: {
          correction: options.correction !== false,
          exact: options.exact || false
        },
        options: {
          include_odds_ratio: options.include_odds_ratio !== false,
          include_confidence_interval: options.include_confidence_interval !== false,
          confidence_level: options.confidence_level || 0.95
        }
      };

      const response = await api.post('/categorical/mcnemars/', requestData);
      return this.processMcNemarResponse(response.data);
    } catch (error) {
      console.error('Error performing McNemar\'s test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Cochran's Q test
   * Extension of McNemar's test for multiple treatments
   * @param {Array<Array<number>>} data - Binary data matrix (subjects x treatments)
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async cochransQTest(data, options = {}) {
    try {
      const requestData = {
        data: {
          measurements: data,
          treatment_names: options.treatment_names || null
        },
        parameters: {
          alpha: options.alpha || 0.05
        },
        options: {
          include_post_hoc: options.include_post_hoc || false,
          post_hoc_method: options.post_hoc_method || 'mcnemar',
          include_effect_size: options.include_effect_size !== false
        }
      };

      const response = await api.post('/categorical/cochrans-q/', requestData);
      return this.processCochransResponse(response.data);
    } catch (error) {
      console.error('Error performing Cochran\'s Q test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * G-test (Likelihood Ratio Test)
   * Alternative to chi-square test
   * @param {Array<Array<number>>} contingencyTable - Contingency table
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async gTest(contingencyTable, options = {}) {
    try {
      const requestData = {
        data: {
          contingency_table: contingencyTable
        },
        test_type: options.test_type || 'independence',
        parameters: {
          williams_correction: options.williams_correction || false,
          confidence_level: options.confidence_level || 0.95
        },
        options: {
          include_effect_sizes: options.include_effect_sizes !== false,
          include_expected: options.include_expected !== false,
          include_comparison_with_chi2: options.include_comparison_with_chi2 || false
        }
      };

      const response = await api.post('/categorical/g-test/', requestData);
      return this.processGTestResponse(response.data);
    } catch (error) {
      console.error('Error performing G-test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Binomial test
   * Test if success probability equals hypothesized value
   * @param {number} successes - Number of successes
   * @param {number} n - Number of trials
   * @param {number} p - Hypothesized probability
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async binomialTest(successes, n, p = 0.5, options = {}) {
    try {
      const requestData = {
        data: {
          successes: successes,
          n: n,
          p: p
        },
        parameters: {
          alternative: options.alternative || 'two-sided',
          confidence_level: options.confidence_level || 0.95
        },
        options: {
          include_confidence_interval: options.include_confidence_interval !== false,
          interval_method: options.interval_method || 'wilson',
          include_exact_p: options.include_exact_p !== false
        }
      };

      const response = await api.post('/categorical/binomial/', requestData);
      return this.processBinomialResponse(response.data);
    } catch (error) {
      console.error('Error performing binomial test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Multinomial test
   * Generalization of binomial test for multiple categories
   * @param {Array<number>} observed - Observed frequencies
   * @param {Array<number>} probabilities - Expected probabilities
   * @param {Object} options - Test options
   * @returns {Promise<Object>} Test results with 50 decimal precision
   */
  async multinomialTest(observed, probabilities, options = {}) {
    try {
      const requestData = {
        data: {
          observed: observed,
          probabilities: probabilities,
          categories: options.categories || null
        },
        parameters: {
          n_simulations: options.n_simulations || 10000,
          method: options.method || 'exact'
        },
        options: {
          include_expected: options.include_expected !== false,
          include_residuals: options.include_residuals || false,
          include_p_value_components: options.include_p_value_components || false
        }
      };

      const response = await api.post('/categorical/multinomial/', requestData);
      return this.processMultinomialResponse(response.data);
    } catch (error) {
      console.error('Error performing multinomial test:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate effect sizes for categorical data
   * @param {Array<Array<number>>} contingencyTable - Contingency table
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Effect sizes with 50 decimal precision
   */
  async calculateEffectSizes(contingencyTable, options = {}) {
    try {
      const requestData = {
        data: {
          contingency_table: contingencyTable
        },
        metrics: options.metrics || ['all'],
        parameters: {
          confidence_level: options.confidence_level || 0.95,
          bias_correction: options.bias_correction || false
        }
      };

      const response = await api.post('/categorical/effect-sizes/', requestData);
      return this.processEffectSizesResponse(response.data);
    } catch (error) {
      console.error('Error calculating effect sizes:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Calculate Cohen's kappa for inter-rater agreement
   * @param {Array<Array<number>>} ratings - Agreement matrix
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Kappa statistics with 50 decimal precision
   */
  async calculateCohensKappa(ratings, options = {}) {
    try {
      const requestData = {
        data: {
          ratings: ratings
        },
        parameters: {
          weights: options.weights || null,
          confidence_level: options.confidence_level || 0.95
        },
        options: {
          include_agreement_matrix: options.include_agreement_matrix !== false,
          include_confidence_interval: options.include_confidence_interval !== false,
          include_interpretation: options.include_interpretation !== false
        }
      };

      const response = await api.post('/categorical/cohens-kappa/', requestData);
      return this.processKappaResponse(response.data);
    } catch (error) {
      console.error('Error calculating Cohen\'s kappa:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Perform power analysis for categorical tests
   * @param {Object} params - Power analysis parameters
   * @returns {Promise<Object>} Power analysis results
   */
  async powerAnalysis(params) {
    try {
      const requestData = {
        test_type: params.test_type,
        parameters: {
          effect_size: params.effect_size,
          sample_size: params.sample_size,
          alpha: params.alpha || 0.05,
          power: params.power || 0.8,
          df: params.df
        },
        calculation_type: params.calculation_type || 'power'
      };

      const response = await api.post('/categorical/power/', requestData);
      return this.processPowerResponse(response.data);
    } catch (error) {
      console.error('Error in power analysis:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Process chi-square test response
   * @private
   */
  processChiSquareResponse(data) {
    if (!data.success) {
      throw new Error(data.error || 'Chi-square test failed');
    }

    const results = data.results || data;
    const processed = { ...results };

    // Convert high-precision strings to Decimal objects
    const precisionFields = [
      'chi2_statistic', 'p_value', 'cramers_v', 'phi_coefficient',
      'contingency_coefficient', 'likelihood_ratio', 'critical_value'
    ];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Process residuals if present
    if (processed.residuals) {
      processed.residuals_decimal = this.processMatrix(processed.residuals);
    }

    // Process expected frequencies
    if (processed.expected) {
      processed.expected_decimal = this.processMatrix(processed.expected);
    }

    return processed;
  }

  /**
   * Process Fisher's exact test response
   * @private
   */
  processFishersResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['p_value', 'odds_ratio', 'p_left', 'p_right', 'p_two_sided'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Process confidence interval
    if (processed.confidence_interval) {
      processed.confidence_interval_decimal = {
        lower: new Decimal(processed.confidence_interval.lower),
        upper: new Decimal(processed.confidence_interval.upper)
      };
    }

    return processed;
  }

  /**
   * Process McNemar's test response
   * @private
   */
  processMcNemarResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['statistic', 'p_value', 'odds_ratio', 'chi2_statistic'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    return processed;
  }

  /**
   * Process Cochran's Q test response
   * @private
   */
  processCochransResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['q_statistic', 'p_value', 'kendalls_w'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Process post-hoc results
    if (processed.post_hoc) {
      processed.post_hoc = processed.post_hoc.map(result => {
        const pairwise = { ...result };
        if (pairwise.p_value && typeof pairwise.p_value === 'string') {
          pairwise.p_value_decimal = new Decimal(pairwise.p_value);
          pairwise.p_value_display = this.formatHighPrecision(pairwise.p_value);
        }
        return pairwise;
      });
    }

    return processed;
  }

  /**
   * Process G-test response
   * @private
   */
  processGTestResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['g_statistic', 'p_value', 'williams_corrected_g'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    return processed;
  }

  /**
   * Process binomial test response
   * @private
   */
  processBinomialResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['p_value', 'proportion', 'expected_proportion'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Process confidence interval
    if (processed.confidence_interval) {
      processed.confidence_interval_decimal = {
        lower: new Decimal(processed.confidence_interval.lower),
        upper: new Decimal(processed.confidence_interval.upper)
      };
    }

    return processed;
  }

  /**
   * Process multinomial test response
   * @private
   */
  processMultinomialResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['chi2_statistic', 'p_value', 'likelihood_ratio'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Process expected frequencies
    if (processed.expected) {
      processed.expected_decimal = processed.expected.map(val =>
        typeof val === 'string' ? new Decimal(val) : val
      );
    }

    return processed;
  }

  /**
   * Process effect sizes response
   * @private
   */
  processEffectSizesResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // All effect size fields
    const effectSizeFields = [
      'cramers_v', 'phi_coefficient', 'contingency_coefficient',
      'odds_ratio', 'risk_ratio', 'relative_risk',
      'cohens_h', 'cohens_w', 'eta_squared'
    ];

    effectSizeFields.forEach(field => {
      if (processed[field]) {
        if (typeof processed[field] === 'string') {
          processed[`${field}_decimal`] = new Decimal(processed[field]);
          processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
        }
        // Add interpretation
        processed[`${field}_interpretation`] = this.interpretEffectSize(field, processed[field]);
      }
    });

    // Process confidence intervals
    if (processed.confidence_intervals) {
      processed.confidence_intervals_decimal = {};
      Object.keys(processed.confidence_intervals).forEach(key => {
        const ci = processed.confidence_intervals[key];
        processed.confidence_intervals_decimal[key] = {
          lower: new Decimal(ci.lower),
          upper: new Decimal(ci.upper)
        };
      });
    }

    return processed;
  }

  /**
   * Process Cohen's kappa response
   * @private
   */
  processKappaResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['kappa', 'standard_error', 'z_score', 'p_value'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    // Process confidence interval
    if (processed.confidence_interval) {
      processed.confidence_interval_decimal = {
        lower: new Decimal(processed.confidence_interval.lower),
        upper: new Decimal(processed.confidence_interval.upper)
      };
    }

    // Add interpretation
    if (processed.kappa) {
      processed.interpretation = this.interpretKappa(processed.kappa);
    }

    return processed;
  }

  /**
   * Process power analysis response
   * @private
   */
  processPowerResponse(data) {
    const results = data.results || data;
    const processed = { ...results };

    // High-precision fields
    const precisionFields = ['power', 'effect_size', 'critical_value'];

    precisionFields.forEach(field => {
      if (processed[field] && typeof processed[field] === 'string') {
        processed[`${field}_decimal`] = new Decimal(processed[field]);
        processed[`${field}_display`] = this.formatHighPrecision(processed[field]);
      }
    });

    return processed;
  }

  /**
   * Process matrix data for high precision
   * @private
   */
  processMatrix(matrix) {
    return matrix.map(row =>
      row.map(val => typeof val === 'string' ? new Decimal(val) : val)
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

      // For very small p-values
      if (decimal.lt(0.0001)) {
        return decimal.toExponential(decimals);
      }

      // For odds ratios and risk ratios
      if (decimal.gt(1000)) {
        return decimal.toExponential(decimals);
      }

      return decimal.toFixed(decimals);
    } catch (error) {
      return value.toString();
    }
  }

  /**
   * Interpret effect size magnitude
   * @private
   */
  interpretEffectSize(metric, value) {
    const val = typeof value === 'string' ? parseFloat(value) : value;

    const thresholds = {
      cramers_v: { small: 0.1, medium: 0.3, large: 0.5 },
      phi_coefficient: { small: 0.1, medium: 0.3, large: 0.5 },
      cohens_w: { small: 0.1, medium: 0.3, large: 0.5 },
      cohens_h: { small: 0.2, medium: 0.5, large: 0.8 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return 'No standard interpretation';

    if (val < threshold.small) return 'Very small effect';
    if (val < threshold.medium) return 'Small effect';
    if (val < threshold.large) return 'Medium effect';
    return 'Large effect';
  }

  /**
   * Interpret Cohen's kappa value
   * @private
   */
  interpretKappa(value) {
    const kappa = typeof value === 'string' ? parseFloat(value) : value;

    if (kappa < 0) return 'Poor agreement (worse than chance)';
    if (kappa <= 0.20) return 'Slight agreement';
    if (kappa <= 0.40) return 'Fair agreement';
    if (kappa <= 0.60) return 'Moderate agreement';
    if (kappa <= 0.80) return 'Substantial agreement';
    return 'Almost perfect agreement';
  }

  /**
   * Handle and format errors
   * @private
   */
  handleError(error) {
    if (error.response) {
      const message = error.response.data?.error ||
                     error.response.data?.detail ||
                     'Categorical analysis failed';
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
      chi_square: {
        name: 'Chi-square Test',
        variants: ['Independence', 'Goodness of Fit'],
        use_cases: 'Test association between categorical variables',
        assumptions: [
          'Random sampling',
          'Expected frequency ≥ 5 in each cell',
          'Independent observations'
        ],
        effect_sizes: ['Cramér\'s V', 'Phi coefficient']
      },
      fishers_exact: {
        name: 'Fisher\'s Exact Test',
        use_cases: 'Exact test for 2x2 tables, especially with small samples',
        assumptions: ['Fixed marginals', 'Independence'],
        advantages: 'No minimum expected frequency requirement'
      },
      mcnemars: {
        name: 'McNemar\'s Test',
        use_cases: 'Paired nominal data, before-after studies',
        assumptions: ['Paired observations', 'Binary outcomes'],
        note: 'Focus on discordant pairs'
      },
      cochrans_q: {
        name: 'Cochran\'s Q Test',
        use_cases: 'Multiple treatments on same subjects',
        assumptions: ['Binary outcomes', 'Related samples'],
        extension: 'Generalization of McNemar\'s test'
      },
      g_test: {
        name: 'G-test (Likelihood Ratio)',
        use_cases: 'Alternative to chi-square test',
        advantages: 'Better for complex models',
        note: 'Asymptotically equivalent to chi-square'
      },
      binomial: {
        name: 'Binomial Test',
        use_cases: 'Test if proportion equals hypothesized value',
        assumptions: ['Independent trials', 'Constant probability'],
        confidence_methods: ['Wilson', 'Clopper-Pearson', 'Normal approximation']
      },
      multinomial: {
        name: 'Multinomial Test',
        use_cases: 'Multiple categories with expected probabilities',
        extension: 'Generalization of binomial test',
        methods: ['Exact', 'Monte Carlo', 'Chi-square approximation']
      }
    };
  }

  /**
   * Get effect size guidelines
   */
  getEffectSizeGuidelines() {
    return {
      cramers_v: {
        formula: 'sqrt(χ²/(n * min(r-1, c-1)))',
        interpretation: {
          small: 0.1,
          medium: 0.3,
          large: 0.5
        },
        use: 'Association strength for any size table'
      },
      phi_coefficient: {
        formula: 'sqrt(χ²/n)',
        interpretation: {
          small: 0.1,
          medium: 0.3,
          large: 0.5
        },
        use: '2x2 tables only'
      },
      odds_ratio: {
        formula: '(a*d)/(b*c)',
        interpretation: {
          no_association: 1,
          weak: [0.5, 2],
          moderate: [0.33, 3],
          strong: [0.2, 5]
        },
        use: '2x2 tables, effect size for binary outcomes'
      },
      cohens_kappa: {
        formula: '(Po - Pe)/(1 - Pe)',
        interpretation: {
          poor: [-1, 0],
          slight: [0, 0.20],
          fair: [0.21, 0.40],
          moderate: [0.41, 0.60],
          substantial: [0.61, 0.80],
          almost_perfect: [0.81, 1]
        },
        use: 'Inter-rater agreement'
      }
    };
  }
}

// Create singleton instance
const categoricalAnalysisService = new CategoricalAnalysisService();

// Export service
export default categoricalAnalysisService;

// Export class for testing
export { CategoricalAnalysisService };

// Export information
export const testInformation = categoricalAnalysisService.getTestInformation();
export const effectSizeGuidelines = categoricalAnalysisService.getEffectSizeGuidelines();