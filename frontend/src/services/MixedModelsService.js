/**
 * Mixed Models Service
 * ====================
 * Handles all mixed effects model API calls including:
 * - ICC calculation
 * - Linear Mixed Models (LMM)
 * - Random effects extraction
 * - Model comparison
 * - Diagnostics
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import axios from 'axios';
import jStat from 'jstat';

class MixedModelsService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    this.setupAxios();
  }

  /**
   * Setup axios instance with authentication
   */
  setupAxios() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 120000, // Longer timeout for complex model fitting
      headers: {
        'Content-Type': 'application/json'
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
          localStorage.removeItem('authToken');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // ========================================
  // ICC CALCULATION
  // ========================================

  /**
   * Calculate Intraclass Correlation Coefficient
   * @param {Object} data - Data matrix or DataFrame
   * @param {string} iccType - ICC type ('ICC(1)', 'ICC(2,1)', etc.)
   * @param {Object} options - Additional options
   */
  async calculateICC(data, iccType = 'ICC(2,1)', options = {}) {
    const response = await this.client.post('/core/mixed/icc/', {
      data,
      icc_type: iccType,
      ...options
    });
    return response.data;
  }

  /**
   * Calculate all ICC types at once
   * @param {Object} data - Data matrix
   */
  async calculateAllICCs(data) {
    const iccTypes = ['ICC(1)', 'ICC(2)', 'ICC(3)', 'ICC(1,k)', 'ICC(2,k)', 'ICC(3,k)'];
    const results = {};

    for (const iccType of iccTypes) {
      try {
        results[iccType] = await this.calculateICC(data, iccType);
      } catch (error) {
        results[iccType] = { error: error.message };
      }
    }

    return results;
  }

  // ========================================
  // LINEAR MIXED MODELS
  // ========================================

  /**
   * Fit a Linear Mixed Model
   * @param {Object} data - DataFrame as object
   * @param {string} outcome - Dependent variable name
   * @param {Array} fixedEffects - Fixed effect variable names
   * @param {Object} randomEffects - Random effects specification
   * @param {string} groupingVar - Grouping variable for random effects
   * @param {Object} options - Additional fitting options
   */
  async fitLMM(data, outcome, fixedEffects, randomEffects, groupingVar, options = {}) {
    const {
      method = 'powell',
      reml = true,
      maxIterations = 100,
      tolerance = 1e-8
    } = options;

    const response = await this.client.post('/core/mixed/lmm/fit/', {
      data,
      outcome,
      fixed_effects: fixedEffects,
      random_effects: randomEffects,
      grouping_var: groupingVar,
      method,
      reml,
      max_iterations: maxIterations,
      tolerance
    });
    return response.data;
  }

  /**
   * Fit a simple random intercept model
   * @param {Object} data - DataFrame as object
   * @param {string} outcome - Dependent variable
   * @param {Array} fixedEffects - Fixed effect variables
   * @param {string} groupingVar - Grouping variable
   */
  async fitRandomInterceptModel(data, outcome, fixedEffects, groupingVar) {
    return this.fitLMM(data, outcome, fixedEffects, { intercept: true }, groupingVar);
  }

  /**
   * Fit a random slopes model
   * @param {Object} data - DataFrame as object
   * @param {string} outcome - Dependent variable
   * @param {Array} fixedEffects - Fixed effect variables
   * @param {Array} randomSlopes - Variables with random slopes
   * @param {string} groupingVar - Grouping variable
   */
  async fitRandomSlopesModel(data, outcome, fixedEffects, randomSlopes, groupingVar) {
    return this.fitLMM(
      data,
      outcome,
      fixedEffects,
      { intercept: true, slopes: randomSlopes },
      groupingVar
    );
  }

  // ========================================
  // RANDOM EFFECTS
  // ========================================

  /**
   * Extract random effects from a fitted model
   * @param {Object} data - DataFrame as object
   * @param {string} outcome - Dependent variable
   * @param {Array} fixedEffects - Fixed effects
   * @param {Object} randomEffects - Random effects specification
   * @param {string} groupingVar - Grouping variable
   */
  async extractRandomEffects(data, outcome, fixedEffects, randomEffects, groupingVar) {
    const response = await this.client.post('/core/mixed/lmm/random-effects/', {
      data,
      outcome,
      fixed_effects: fixedEffects,
      random_effects: randomEffects,
      grouping_var: groupingVar
    });
    return response.data;
  }

  // ========================================
  // MODEL COMPARISON
  // ========================================

  /**
   * Compare two nested models using Likelihood Ratio Test
   * @param {Object} data - DataFrame as object
   * @param {Object} model1Spec - Full model specification
   * @param {Object} model2Spec - Reduced model specification
   */
  async compareLMMs(data, model1Spec, model2Spec) {
    const response = await this.client.post('/core/mixed/lmm/compare/', {
      data,
      model1: model1Spec,
      model2: model2Spec
    });
    return response.data;
  }

  /**
   * Get AIC and BIC for model selection
   * @param {Object} data - DataFrame as object
   * @param {Array} modelSpecs - Array of model specifications to compare
   */
  async getModelFitIndices(data, modelSpecs) {
    const results = [];

    for (const spec of modelSpecs) {
      try {
        const result = await this.fitLMM(
          data,
          spec.outcome,
          spec.fixedEffects,
          spec.randomEffects,
          spec.groupingVar
        );
        results.push({
          model: spec.name || `Model ${results.length + 1}`,
          aic: result.aic,
          bic: result.bic,
          logLikelihood: result.log_likelihood,
          converged: result.converged
        });
      } catch (error) {
        results.push({
          model: spec.name || `Model ${results.length + 1}`,
          error: error.message
        });
      }
    }

    return results;
  }

  // ========================================
  // DIAGNOSTICS
  // ========================================

  /**
   * Get comprehensive model diagnostics
   * @param {Object} data - DataFrame as object
   * @param {string} outcome - Dependent variable
   * @param {Array} fixedEffects - Fixed effects
   * @param {Object} randomEffects - Random effects
   * @param {string} groupingVar - Grouping variable
   */
  async getDiagnostics(data, outcome, fixedEffects, randomEffects, groupingVar) {
    const response = await this.client.post('/core/mixed/lmm/diagnostics/', {
      data,
      outcome,
      fixed_effects: fixedEffects,
      random_effects: randomEffects,
      grouping_var: groupingVar
    });
    return response.data;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Process random effects for caterpillar plot
   * @param {Object} randomEffectsData - Random effects from API
   * @returns {Array} Formatted for CaterpillarPlot component
   */
  processCaterpillarData(randomEffectsData) {
    if (!randomEffectsData || !randomEffectsData.effects) return [];

    const effects = randomEffectsData.effects;
    const processed = [];

    // Handle intercept random effects
    if (effects.intercept) {
      Object.entries(effects.intercept).forEach(([group, value]) => {
        processed.push({
          group,
          effect: 'Intercept',
          estimate: value.estimate || value,
          se: value.se || value.std_error || 0,
          ciLower: value.ci_lower || (value.estimate - jStat.normal.inv(0.975, 0, 1) * (value.se || 0)),
          ciUpper: value.ci_upper || (value.estimate + jStat.normal.inv(0.975, 0, 1) * (value.se || 0))
        });
      });
    }

    // Handle slope random effects
    if (effects.slopes) {
      Object.entries(effects.slopes).forEach(([variable, groupEffects]) => {
        Object.entries(groupEffects).forEach(([group, value]) => {
          processed.push({
            group,
            effect: variable,
            estimate: value.estimate || value,
            se: value.se || value.std_error || 0,
            ciLower: value.ci_lower || (value.estimate - jStat.normal.inv(0.975, 0, 1) * (value.se || 0)),
            ciUpper: value.ci_upper || (value.estimate + jStat.normal.inv(0.975, 0, 1) * (value.se || 0))
          });
        });
      });
    }

    // Sort by estimate value
    return processed.sort((a, b) => a.estimate - b.estimate);
  }

  /**
   * Process diagnostics for visualization
   * @param {Object} diagnosticsData - Diagnostics from API
   * @returns {Object} Formatted diagnostic plots data
   */
  processDiagnosticsData(diagnosticsData) {
    if (!diagnosticsData) return {};

    return {
      residualsVsFitted: diagnosticsData.residuals_vs_fitted || [],
      qqPlot: diagnosticsData.qq_plot || [],
      scaleLocation: diagnosticsData.scale_location || [],
      cooksDistance: diagnosticsData.cooks_distance || [],
      influentialPoints: diagnosticsData.influential_points || [],
      normalityTest: diagnosticsData.normality_test || {},
      homoscedasticityTest: diagnosticsData.homoscedasticity_test || {}
    };
  }

  /**
   * Format variance components for display
   * @param {Object} modelResult - Model fitting result
   * @returns {Array} Formatted variance components
   */
  formatVarianceComponents(modelResult) {
    if (!modelResult || !modelResult.variance_components) return [];

    const vc = modelResult.variance_components;
    const components = [];

    if (vc.random_intercept !== undefined) {
      components.push({
        component: 'Random Intercept',
        variance: vc.random_intercept,
        sd: Math.sqrt(vc.random_intercept),
        percentOfTotal: null // Will be calculated
      });
    }

    if (vc.random_slopes) {
      Object.entries(vc.random_slopes).forEach(([variable, variance]) => {
        components.push({
          component: `Random Slope (${variable})`,
          variance: variance,
          sd: Math.sqrt(variance),
          percentOfTotal: null
        });
      });
    }

    if (vc.residual !== undefined) {
      components.push({
        component: 'Residual',
        variance: vc.residual,
        sd: Math.sqrt(vc.residual),
        percentOfTotal: null
      });
    }

    // Calculate percentages
    const totalVariance = components.reduce((sum, c) => sum + c.variance, 0);
    components.forEach(c => {
      c.percentOfTotal = (c.variance / totalVariance * 100).toFixed(1);
    });

    return components;
  }

  /**
   * Convert wide format data to long format for mixed models
   * @param {Array} data - Wide format data
   * @param {Array} timeVars - Column names representing time points
   * @param {string} idVar - Subject/group ID variable
   * @param {string} valueVar - Name for the value column in long format
   * @param {string} timeVar - Name for the time column in long format
   */
  wideToLong(data, timeVars, idVar, valueVar = 'value', timeVar = 'time') {
    const longData = [];

    data.forEach(row => {
      timeVars.forEach((tv, index) => {
        longData.push({
          [idVar]: row[idVar],
          [timeVar]: index + 1,
          [valueVar]: row[tv],
          ...Object.fromEntries(
            Object.entries(row).filter(([key]) => !timeVars.includes(key) && key !== idVar)
          )
        });
      });
    });

    return longData;
  }

  /**
   * Calculate design effect for cluster sampling
   * @param {number} icc - Intraclass correlation
   * @param {number} clusterSize - Average cluster size
   * @returns {number} Design effect
   */
  calculateDesignEffect(icc, clusterSize) {
    return 1 + (clusterSize - 1) * icc;
  }

  /**
   * Calculate effective sample size
   * @param {number} n - Total sample size
   * @param {number} designEffect - Design effect
   * @returns {number} Effective sample size
   */
  calculateEffectiveSampleSize(n, designEffect) {
    return n / designEffect;
  }
}

// Export singleton instance
const mixedModelsService = new MixedModelsService();
export default mixedModelsService;

// Also export class for testing
export { MixedModelsService };
