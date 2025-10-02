/**
 * High-Precision Statistical Service
 * ===================================
 * Handles all high-precision statistical calculations with the backend
 * Manages precision display and data formatting
 */

import axios from 'axios';
import Decimal from 'decimal.js';

// Configure Decimal.js for high precision
Decimal.set({ precision: 50, rounding: Decimal.ROUND_HALF_UP });

class HighPrecisionStatisticalService {
  constructor() {
    this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    this.token = localStorage.getItem('authToken');
    this.setupAxios();
  }

  /**
   * Setup axios instance with authentication
   */
  setupAxios() {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
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

  /**
   * Perform high-precision t-test
   */
  async performTTest(options) {
    const response = await this.client.post('/v1/stats/ttest/', options);
    return this.processHighPrecisionResult(response.data);
  }

  /**
   * Perform comprehensive ANOVA
   */
  async performANOVA(options) {
    const {
      groups,
      anovaType = 'one_way',
      postHoc = null,
      correction = null,
      visualizations = true
    } = options;

    const request = {
      anova_type: anovaType,
      groups: groups,
      post_hoc: postHoc,
      correction: correction,
      options: {
        check_assumptions: true,
        calculate_effect_sizes: true,
        generate_visualizations: visualizations
      }
    };

    const response = await this.client.post('/v1/stats/anova/', request);
    return this.processAnovaResult(response.data);
  }

  /**
   * Perform ANCOVA (Analysis of Covariance)
   */
  async performANCOVA(options) {
    const {
      groups,
      covariates,
      groupNames = null,
      covariateNames = null,
      dependentVariableName = 'Dependent Variable',
      alpha = 0.05,
      checkHomogeneitySlopes = true,
      postHoc = null,
      options: additionalOptions = {}
    } = options;

    const request = {
      groups: groups,
      covariates: covariates,
      group_names: groupNames || groups.map((_, i) => `Group ${i + 1}`),
      covariate_names: covariateNames || covariates.map((_, i) => `Covariate ${i + 1}`),
      dependent_variable_name: dependentVariableName,
      alpha: alpha,
      check_homogeneity_slopes: checkHomogeneitySlopes,
      post_hoc: postHoc,
      options: {
        check_assumptions: true,
        calculate_effect_sizes: true,
        generate_visualizations: true,
        ...additionalOptions
      }
    };

    const response = await this.client.post('/v1/stats/ancova/', request);
    return this.processAncovaResult(response.data);
  }

  /**
   * Perform MANOVA (Multivariate ANOVA)
   */
  async performMANOVA(options) {
    const response = await this.client.post('/v1/stats/manova/', options);
    return this.processManovaResult(response.data);
  }

  /**
   * Perform correlation analysis
   */
  async performCorrelation(options) {
    const response = await this.client.post('/v1/stats/correlation/', options);
    return this.processCorrelationResult(response.data);
  }

  /**
   * Get descriptive statistics
   */
  async getDescriptiveStatistics(data, options = {}) {
    const response = await this.client.post('/v1/stats/descriptive/', {
      data: data,
      ...options
    });
    return this.processHighPrecisionResult(response.data);
  }

  /**
   * Process high precision results from API
   */
  processHighPrecisionResult(data) {
    return data;
  }

  /**
   * Process ANOVA results
   */
  processAnovaResult(data) {
    return data;
  }

  /**
   * Process ANCOVA results
   */
  processAncovaResult(data) {
    return data;
  }

  /**
   * Process MANOVA results
   */
  processManovaResult(data) {
    return data;
  }

  /**
   * Process correlation results
   */
  processCorrelationResult(data) {
    return data;
  }

  /**
   * Import data from file
   */
  async importData(file, onProgress) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/v1/data/import/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (onProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(percentCompleted);
        }
      }
    });

    return response.data;
  }

  /**
   * Get validation dashboard metrics
   */
  async getValidationMetrics() {
    const response = await this.client.get('/v1/validation/dashboard/');
    return response.data;
  }

  /**
   * Process ANOVA results with high precision
   */
  processAnovaResult(result) {
    const processed = {
      ...result,
      display: {},
      visualization: {}
    };

    // Format main statistics for display
    if (result.anova_table) {
      processed.display.f_statistic = this.formatPrecisionNumber(
        result.anova_table.f_statistic, 6
      );
      processed.display.p_value = this.formatPrecisionNumber(
        result.anova_table.p_value, 6
      );
    }

    // Format effect sizes
    if (result.effect_sizes) {
      processed.display.effect_sizes = {
        eta_squared: this.formatPrecisionNumber(result.effect_sizes.eta_squared, 4),
        partial_eta_squared: this.formatPrecisionNumber(result.effect_sizes.partial_eta_squared, 4),
        omega_squared: this.formatPrecisionNumber(result.effect_sizes.omega_squared, 4),
        cohen_f: this.formatPrecisionNumber(result.effect_sizes.cohen_f, 4)
      };
    }

    // Process post-hoc results
    if (result.post_hoc_results) {
      processed.display.post_hoc = this.processPostHocResults(result.post_hoc_results);
    }

    // Process visualization data
    if (result.visualization_data) {
      processed.visualization = this.prepareVisualizationData(result.visualization_data);
    }

    return processed;
  }

  /**
   * Process ANCOVA results with high precision
   */
  processAncovaResult(result) {
    const processed = {
      ...result,
      display: {},
      visualization: {}
    };

    // Format ANCOVA statistics for display
    if (result.ancova_result) {
      processed.display.f_statistic_group = this.formatPrecisionNumber(
        result.ancova_result.f_statistic_group, 6
      );
      processed.display.p_value_group = this.formatPrecisionNumber(
        result.ancova_result.p_value_group, 6
      );
      processed.display.f_statistic_covariate = this.formatPrecisionNumber(
        result.ancova_result.f_statistic_covariate, 6
      );
      processed.display.p_value_covariate = this.formatPrecisionNumber(
        result.ancova_result.p_value_covariate, 6
      );
    }

    // Format adjusted means
    if (result.adjusted_means) {
      processed.display.adjusted_means = {};
      for (const [group, mean] of Object.entries(result.adjusted_means)) {
        processed.display.adjusted_means[group] = this.formatPrecisionNumber(mean, 6);
      }
    }

    // Format effect sizes
    if (result.effect_sizes) {
      processed.display.partial_eta_squared = this.formatPrecisionNumber(
        result.effect_sizes.partial_eta_squared, 6
      );
      if (result.effect_sizes.cohen_f) {
        processed.display.cohen_f = this.formatPrecisionNumber(
          result.effect_sizes.cohen_f, 6
        );
      }
    }

    // Format homogeneity test
    if (result.homogeneity_test) {
      processed.display.homogeneity_p_value = this.formatPrecisionNumber(
        result.homogeneity_test.p_value, 6
      );
    }

    // Process covariate effects
    if (result.covariate_effects) {
      processed.display.covariate_effects = {};
      for (const [cov, effects] of Object.entries(result.covariate_effects)) {
        processed.display.covariate_effects[cov] = {
          coefficient: this.formatPrecisionNumber(effects.coefficient, 6),
          p_value: this.formatPrecisionNumber(effects.p_value, 6)
        };
      }
    }

    return processed;
  }

  /**
   * Process MANOVA results
   */
  processManovaResult(result) {
    const processed = {
      ...result,
      display: {}
    };

    // Format test statistics
    if (result.test_statistics) {
      processed.display.test_statistics = {};
      for (const [test, value] of Object.entries(result.test_statistics)) {
        processed.display.test_statistics[test] = {
          statistic: this.formatPrecisionNumber(value.statistic, 6),
          f_statistic: this.formatPrecisionNumber(value.f_statistic, 6),
          p_value: this.formatPrecisionNumber(value.p_value, 6),
          effect_size: this.formatPrecisionNumber(value.effect_size, 4)
        };
      }
    }

    return processed;
  }

  /**
   * Process correlation results
   */
  processCorrelationResult(result) {
    const processed = {
      ...result,
      display: {}
    };

    if (result.correlation) {
      processed.display.correlation = this.formatPrecisionNumber(result.correlation, 6);
      processed.display.p_value = this.formatPrecisionNumber(result.p_value, 6);
      processed.display.confidence_interval = [
        this.formatPrecisionNumber(result.ci_lower, 6),
        this.formatPrecisionNumber(result.ci_upper, 6)
      ];
    }

    return processed;
  }

  /**
   * Process post-hoc test results
   */
  processPostHocResults(postHocData) {
    const processed = {};

    for (const [comparison, stats] of Object.entries(postHocData)) {
      processed[comparison] = {
        mean_difference: this.formatPrecisionNumber(stats.mean_difference, 6),
        p_value: this.formatPrecisionNumber(stats.p_value, 6),
        adjusted_p_value: stats.adjusted_p_value ?
          this.formatPrecisionNumber(stats.adjusted_p_value, 6) : null,
        significant: stats.significant,
        confidence_interval: stats.confidence_interval ? [
          this.formatPrecisionNumber(stats.confidence_interval[0], 6),
          this.formatPrecisionNumber(stats.confidence_interval[1], 6)
        ] : null
      };
    }

    return processed;
  }

  /**
   * Process high-precision results from any test
   */
  processHighPrecisionResult(result) {
    if (!result) return null;

    const processed = {
      ...result,
      display: {},
      full_precision: {}
    };

    // Process high-precision results
    if (result.high_precision_result) {
      for (const [key, value] of Object.entries(result.high_precision_result)) {
        if (this.isNumericString(value)) {
          const decimal = new Decimal(value);

          processed.full_precision[key] = value;
          processed.display[key] = {
            standard: decimal.toFixed(6),
            scientific: decimal.toExponential(4),
            full: value,
            precision: this.countDecimalPlaces(value)
          };
        } else {
          processed.display[key] = value;
        }
      }
    }

    // Process comparison if exists
    if (result.comparison) {
      processed.comparison_display = {
        absolute_difference: this.formatPrecisionNumber(result.comparison.absolute_difference, 10),
        relative_difference: this.formatPrecisionNumber(result.comparison.relative_difference, 10),
        decimal_places_gained: result.comparison.decimal_places_gained
      };
    }

    return processed;
  }

  /**
   * Prepare data for visualizations
   */
  prepareVisualizationData(vizData) {
    const prepared = {};

    // Mean plot data
    if (vizData.group_means) {
      prepared.meanPlot = {
        labels: Object.keys(vizData.group_means),
        values: Object.values(vizData.group_means).map(v => parseFloat(v)),
        error_bars: vizData.standard_errors ?
          Object.values(vizData.standard_errors).map(v => parseFloat(v)) : null
      };
    }

    // Box plot data
    if (vizData.group_data) {
      prepared.boxPlot = vizData.group_data.map((group, idx) => ({
        name: `Group ${idx + 1}`,
        y: group.map(v => parseFloat(v)),
        type: 'box',
        boxmean: 'sd'
      }));
    }

    // Interaction plot data (for two-way ANOVA)
    if (vizData.interaction_data) {
      prepared.interactionPlot = this.prepareInteractionPlot(vizData.interaction_data);
    }

    // Q-Q plot for normality
    if (vizData.qq_data) {
      prepared.qqPlot = vizData.qq_data;
    }

    // Residual plots
    if (vizData.residuals) {
      prepared.residualPlot = {
        x: vizData.fitted_values?.map(v => parseFloat(v)),
        y: vizData.residuals.map(v => parseFloat(v))
      };
    }

    return prepared;
  }

  /**
   * Prepare interaction plot for two-way ANOVA
   */
  prepareInteractionPlot(interactionData) {
    const traces = [];

    for (const [factor1Level, data] of Object.entries(interactionData)) {
      traces.push({
        x: Object.keys(data),
        y: Object.values(data).map(v => parseFloat(v)),
        name: factor1Level,
        type: 'scatter',
        mode: 'lines+markers'
      });
    }

    return traces;
  }

  /**
   * Format a high-precision number for display
   */
  formatPrecisionNumber(value, decimals = 6) {
    if (!value && value !== 0) return 'N/A';

    if (typeof value === 'string' && this.isNumericString(value)) {
      const decimal = new Decimal(value);
      return decimal.toFixed(decimals);
    }

    if (typeof value === 'number') {
      return value.toFixed(decimals);
    }

    return value;
  }

  /**
   * Count decimal places in a string number
   */
  countDecimalPlaces(value) {
    if (typeof value !== 'string') return 0;
    const parts = value.split('.');
    return parts.length > 1 ? parts[1].length : 0;
  }

  /**
   * Check if a value is a numeric string
   */
  isNumericString(value) {
    return typeof value === 'string' &&
           !isNaN(value) &&
           !isNaN(parseFloat(value));
  }

  /**
   * Generate comparison table data
   */
  generateComparisonTable(standardResult, highPrecisionResult) {
    const comparisons = [];

    for (const metric of ['t_statistic', 'p_value', 'f_statistic']) {
      if (standardResult[metric] !== undefined && highPrecisionResult[metric] !== undefined) {
        const standard = parseFloat(standardResult[metric]);
        const highPrecision = new Decimal(highPrecisionResult[metric]);
        const difference = highPrecision.minus(standard).abs();

        comparisons.push({
          metric: metric.replace('_', ' ').toUpperCase(),
          standard: standard.toFixed(6),
          highPrecision: highPrecision.toFixed(6),
          fullPrecision: highPrecisionResult[metric],
          difference: difference.toExponential(4),
          decimalGain: this.countDecimalPlaces(highPrecisionResult[metric]) -
                       this.countDecimalPlaces(standard.toString())
        });
      }
    }

    return comparisons;
  }

  /**
   * Export results to various formats
   */
  async exportResults(results, format = 'json') {
    const exportData = {
      results: results,
      format: format,
      timestamp: new Date().toISOString()
    };

    const response = await this.client.post('/v1/data/export/', exportData);

    // Handle file download
    if (format === 'csv' || format === 'excel') {
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `results_${Date.now()}.${format === 'excel' ? 'xlsx' : format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    }

    return response.data;
  }

  /**
   * Generate LaTeX code for results
   */
  generateLatex(result) {
    let latex = '\\begin{table}[h]\n\\centering\n';

    if (result.anova_table) {
      latex += '\\begin{tabular}{lrrrrr}\n';
      latex += '\\hline\n';
      latex += 'Source & SS & df & MS & F & p-value \\\\\n';
      latex += '\\hline\n';
      latex += `Between & ${result.anova_table.ss_between} & ${result.anova_table.df_between} & `;
      latex += `${result.anova_table.ms_between} & ${result.anova_table.f_statistic} & `;
      latex += `${result.anova_table.p_value} \\\\\n`;
      latex += `Within & ${result.anova_table.ss_within} & ${result.anova_table.df_within} & `;
      latex += `${result.anova_table.ms_within} & & \\\\\n`;
      latex += '\\hline\n';
      latex += '\\end{tabular}\n';
    }

    latex += '\\end{table}\n';

    return latex;
  }

  /**
   * Generate APA formatted results
   */
  generateAPA(result) {
    let apa = '';

    if (result.test_type === 'anova') {
      const f = this.formatPrecisionNumber(result.f_statistic, 2);
      const p = parseFloat(result.p_value);
      const pStr = p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`;

      apa = `F(${result.df_between}, ${result.df_within}) = ${f}, p ${pStr}`;

      if (result.effect_sizes?.eta_squared) {
        const eta = this.formatPrecisionNumber(result.effect_sizes.eta_squared, 2);
        apa += `, η² = ${eta}`;
      }
    } else if (result.test_type === 't_test') {
      const t = this.formatPrecisionNumber(result.t_statistic, 2);
      const p = parseFloat(result.p_value);
      const pStr = p < 0.001 ? '< .001' : `= ${p.toFixed(3)}`;

      apa = `t(${result.df}) = ${t}, p ${pStr}`;

      if (result.effect_size?.cohen_d) {
        const d = this.formatPrecisionNumber(result.effect_size.cohen_d, 2);
        apa += `, d = ${d}`;
      }
    }

    return apa;
  }
}

// Create singleton instance
const service = new HighPrecisionStatisticalService();

export default service;
export { HighPrecisionStatisticalService };