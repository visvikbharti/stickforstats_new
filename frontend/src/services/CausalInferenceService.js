/**
 * Causal Inference Service
 * =========================
 * Handles all causal inference API calls including:
 * - DAG creation and analysis
 * - Propensity score estimation
 * - Matching algorithms
 * - Treatment effect estimation
 * - Mediation analysis
 * - Difference-in-Differences
 *
 * Author: StickForStats Team
 * Created: December 27, 2025
 */

import axios from 'axios';

class CausalInferenceService {
  constructor() {
    // The causal routes live under /api/v1/core/causal/... . REACT_APP_API_URL
    // is the /api mount, so every '/core/causal/...' path below needs the /v1
    // segment; without it the requests hit /api/core/... which 404s.
    this.baseURL = `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/v1`;
    this.setupAxios();
  }

  /**
   * Setup axios instance with authentication
   */
  setupAxios() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 60000, // Longer timeout for complex causal analyses
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
      response => {
        // The causal endpoints wrap their payload in a
        // { success, method, results: {...} } envelope, but callers read the
        // fields directly (e.g. treatmentEffects.ate, didResults.did_estimate).
        // Flatten `results` into response.data so those reads resolve.
        const d = response.data;
        if (d && typeof d === 'object' && d.results && typeof d.results === 'object' && !Array.isArray(d.results)) {
          response.data = { ...d.results, success: d.success, method: d.method };
        }
        return response;
      },
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
  // DAG OPERATIONS
  // ========================================

  /**
   * Create a DAG from edges
   * @param {Array} edges - Array of {from, to} edge objects
   * @param {string} treatment - Treatment variable name
   * @param {string} outcome - Outcome variable name
   */
  async createDAG(edges, treatment, outcome) {
    const response = await this.client.post('/core/causal/dag/create/', {
      edges: edges.map(e => [e.from || e.source, e.to || e.target]),
      treatment,
      outcome
    });
    return response.data;
  }

  /**
   * Analyze DAG structure
   * @param {Array} edges - Array of edge tuples
   * @param {string} treatment - Treatment variable
   * @param {string} outcome - Outcome variable
   */
  async analyzeDAG(edges, treatment, outcome) {
    const response = await this.client.post('/core/causal/dag/analyze/', {
      edges: edges.map(e => [e.from || e.source, e.to || e.target]),
      treatment,
      outcome
    });
    return response.data;
  }

  /**
   * Find adjustment sets for causal effect identification
   * @param {Array} edges - DAG edges
   * @param {string} treatment - Treatment variable
   * @param {string} outcome - Outcome variable
   */
  async findAdjustmentSets(edges, treatment, outcome) {
    const response = await this.client.post('/core/causal/adjustment/', {
      edges: edges.map(e => [e.from || e.source, e.to || e.target]),
      treatment,
      outcome
    });
    return response.data;
  }

  // ========================================
  // PROPENSITY SCORE METHODS
  // ========================================

  /**
   * Estimate propensity scores
   * @param {Object} data - DataFrame as object with column arrays
   * @param {string} treatment - Treatment column name
   * @param {Array} covariates - Covariate column names
   * @param {string} method - 'logistic' or 'gbm'
   */
  async estimatePropensityScores(data, treatment, covariates, method = 'logistic') {
    const response = await this.client.post('/core/causal/propensity/', {
      data,
      treatment,
      covariates,
      method
    });
    return response.data;
  }

  /**
   * Perform propensity score matching
   * @param {Object} data - DataFrame as object
   * @param {string} treatment - Treatment column
   * @param {Array} covariates - Covariate columns
   * @param {Object} options - Matching options
   */
  async performMatching(data, treatment, covariates, options = {}) {
    const {
      method = 'nearest',
      caliper = null,
      ratio = 1,
      replacement = false
    } = options;

    const response = await this.client.post('/core/causal/match/', {
      data,
      treatment,
      covariates,
      method,
      caliper,
      ratio,
      replacement
    });
    return response.data;
  }

  // ========================================
  // TREATMENT EFFECT ESTIMATION
  // ========================================

  /**
   * Estimate treatment effects
   * @param {Object} data - DataFrame as object
   * @param {string} treatment - Treatment column
   * @param {string} outcome - Outcome column
   * @param {Array} covariates - Covariate columns
   * @param {string} method - Estimation method
   */
  async estimateTreatmentEffect(data, treatment, outcome, covariates, method = 'doubly_robust') {
    const response = await this.client.post('/core/causal/effect/', {
      data,
      treatment,
      outcome,
      covariates,
      method
    });
    return response.data;
  }

  /**
   * Perform sensitivity analysis for unmeasured confounding
   * @param {Object} data - DataFrame as object
   * @param {string} treatment - Treatment column
   * @param {string} outcome - Outcome column
   * @param {Array} covariates - Covariate columns
   * @param {Array} gammaValues - Gamma values for Rosenbaum bounds
   */
  async sensitivityAnalysis(data, treatment, outcome, covariates, gammaValues = null) {
    const response = await this.client.post('/core/causal/sensitivity/', {
      data,
      treatment,
      outcome,
      covariates,
      gamma_values: gammaValues
    });
    return response.data;
  }

  // ========================================
  // MEDIATION ANALYSIS
  // ========================================

  /**
   * Perform Baron-Kenny mediation analysis
   * @param {Object} data - DataFrame as object
   * @param {string} treatment - Treatment/exposure variable
   * @param {string} mediator - Mediator variable
   * @param {string} outcome - Outcome variable
   * @param {Array} covariates - Optional covariates
   * @param {number} nBootstrap - Number of bootstrap samples
   */
  async baronKennyMediation(data, treatment, mediator, outcome, covariates = [], nBootstrap = 1000) {
    const response = await this.client.post('/core/causal/mediation/baron-kenny/', {
      data,
      treatment,
      mediator,
      outcome,
      covariates,
      n_bootstrap: nBootstrap
    });
    return response.data;
  }

  /**
   * Perform causal mediation analysis (Imai et al. approach)
   * @param {Object} data - DataFrame as object
   * @param {string} treatment - Treatment variable
   * @param {string} mediator - Mediator variable
   * @param {string} outcome - Outcome variable
   * @param {Array} covariates - Covariates
   * @param {number} nSimulations - Number of simulations
   */
  async causalMediation(data, treatment, mediator, outcome, covariates = [], nSimulations = 1000) {
    const response = await this.client.post('/core/causal/mediation/causal/', {
      data,
      treatment,
      mediator,
      outcome,
      covariates,
      n_simulations: nSimulations
    });
    return response.data;
  }

  /**
   * Perform mediation sensitivity analysis
   * @param {Object} data - DataFrame as object
   * @param {string} treatment - Treatment variable
   * @param {string} mediator - Mediator variable
   * @param {string} outcome - Outcome variable
   * @param {Array} rhoValues - Correlation values for sensitivity
   */
  async mediationSensitivity(data, treatment, mediator, outcome, rhoValues = null) {
    const response = await this.client.post('/core/causal/mediation/sensitivity/', {
      data,
      treatment,
      mediator,
      outcome,
      rho_values: rhoValues
    });
    return response.data;
  }

  /**
   * Analyze multiple parallel mediators
   * @param {Object} data - DataFrame as object
   * @param {string} treatment - Treatment variable
   * @param {Array} mediators - Array of mediator variable names
   * @param {string} outcome - Outcome variable
   * @param {Array} covariates - Optional covariates
   */
  async multipleMediators(data, treatment, mediators, outcome, covariates = []) {
    const response = await this.client.post('/core/causal/mediation/multiple/', {
      data,
      treatment,
      mediators,
      outcome,
      covariates
    });
    return response.data;
  }

  // ========================================
  // DIFFERENCE-IN-DIFFERENCES
  // ========================================

  /**
   * Perform basic 2x2 Difference-in-Differences
   * @param {Object} data - DataFrame as object
   * @param {string} outcome - Outcome variable
   * @param {string} treatment - Treatment group indicator
   * @param {string} post - Post-treatment period indicator
   * @param {Array} covariates - Optional covariates
   */
  async differenceInDifferences(data, outcome, treatment, post, covariates = []) {
    const response = await this.client.post('/core/causal/did/', {
      data,
      outcome,
      treatment,
      post,
      covariates
    });
    return response.data;
  }

  /**
   * Perform event study analysis
   * @param {Object} data - Panel data
   * @param {string} outcome - Outcome variable
   * @param {string} unit - Unit identifier
   * @param {string} time - Time variable
   * @param {string} eventTime - Event time variable (relative to treatment)
   * @param {Array} covariates - Optional covariates
   */
  async eventStudy(data, outcome, unit, time, eventTime, covariates = []) {
    const response = await this.client.post('/core/causal/did/event-study/', {
      data,
      outcome,
      unit,
      time,
      event_time: eventTime,
      covariates
    });
    return response.data;
  }

  /**
   * Test parallel trends assumption
   * @param {Object} data - Panel data
   * @param {string} outcome - Outcome variable
   * @param {string} treatment - Treatment group indicator
   * @param {string} time - Time variable
   * @param {number} treatmentTime - Time of treatment
   */
  async testParallelTrends(data, outcome, treatment, time, treatmentTime) {
    const response = await this.client.post('/core/causal/did/parallel-trends/', {
      data,
      outcome,
      treatment,
      time,
      treatment_time: treatmentTime
    });
    return response.data;
  }

  /**
   * Perform staggered DiD (Callaway & Sant'Anna)
   * @param {Object} data - Panel data
   * @param {string} outcome - Outcome variable
   * @param {string} unit - Unit identifier
   * @param {string} time - Time variable
   * @param {string} treatmentTime - Treatment timing variable
   * @param {Array} covariates - Optional covariates
   */
  async staggeredDiD(data, outcome, unit, time, treatmentTime, covariates = []) {
    const response = await this.client.post('/core/causal/did/staggered/', {
      data,
      outcome,
      unit,
      time,
      treatment_time: treatmentTime,
      covariates
    });
    return response.data;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Convert DataFrame to API format
   * @param {Array} data - Array of row objects
   * @returns {Object} Column-oriented data object
   */
  dataFrameToColumns(data) {
    if (!data || data.length === 0) return {};

    const columns = Object.keys(data[0]);
    const result = {};

    columns.forEach(col => {
      result[col] = data.map(row => row[col]);
    });

    return result;
  }

  /**
   * Convert column data back to rows
   * @param {Object} columnData - Column-oriented data
   * @returns {Array} Array of row objects
   */
  columnsToDataFrame(columnData) {
    const columns = Object.keys(columnData);
    if (columns.length === 0) return [];

    const numRows = columnData[columns[0]].length;
    const result = [];

    for (let i = 0; i < numRows; i++) {
      const row = {};
      columns.forEach(col => {
        row[col] = columnData[col][i];
      });
      result.push(row);
    }

    return result;
  }

  /**
   * Process balance statistics for visualization
   * @param {Object} balanceData - Balance data from matching
   * @returns {Array} Formatted for BalancePlot component
   */
  processBalanceData(balanceData) {
    if (!balanceData || !balanceData.covariates) return [];

    return balanceData.covariates.map(cov => ({
      variable: cov.name,
      smdBefore: cov.smd_before || cov.std_diff_before,
      smdAfter: cov.smd_after || cov.std_diff_after,
      varianceRatioBefore: cov.var_ratio_before,
      varianceRatioAfter: cov.var_ratio_after,
      balanced: Math.abs(cov.smd_after || cov.std_diff_after) < 0.1
    }));
  }

  /**
   * Process event study results for visualization
   * @param {Object} eventStudyData - Event study results
   * @returns {Array} Formatted for EventStudyPlot component
   */
  processEventStudyData(eventStudyData, alpha = 0.05) {
    if (!eventStudyData || !eventStudyData.coefficients) return [];

    return eventStudyData.coefficients.map(coef => ({
      period: coef.period || coef.event_time,
      estimate: coef.estimate || coef.coefficient,
      se: coef.se || coef.std_error,
      ciLower: coef.ci_lower,
      ciUpper: coef.ci_upper,
      pValue: coef.p_value,
      significant: coef.p_value < alpha
    }));
  }
}

// Export singleton instance
const causalInferenceService = new CausalInferenceService();
export default causalInferenceService;

// Also export class for testing
export { CausalInferenceService };
