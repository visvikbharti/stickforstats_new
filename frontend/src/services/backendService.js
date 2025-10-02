/**
 * REAL Backend Service Integration Layer
 * Connects to actual Django REST APIs with 50-decimal precision
 * NO MOCK DATA - Everything is real calculations from backend
 *
 * Following Working Principles:
 * 1. No assumptions - verify each response
 * 2. No placeholders - complete implementation
 * 3. No mock data - only real API calls
 * 4. Scientific accuracy with evidence
 * 5. Simple and grounded approach
 * 6. Real-world use, not demos
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Helper function to handle API responses
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }
  const data = await response.json();

  // Verify we have high precision data
  if (data.precision && data.precision !== '50') {
    console.warn(`Expected 50-decimal precision, got ${data.precision}`);
  }

  return data;
};

// Helper function to make API calls
const apiCall = async (endpoint, method = 'GET', body = null) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    credentials: 'include' // Include cookies for authentication
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    return await handleResponse(response);
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
};

/**
 * Descriptive Statistics Service
 * Real calculations with 50-decimal precision
 */
export const descriptiveStatisticsService = {
  calculate: async (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      throw new Error('Valid data array required');
    }

    // Verify all data points are numbers
    const validData = data.filter(d => typeof d === 'number' && !isNaN(d));
    if (validData.length === 0) {
      throw new Error('No valid numeric data provided');
    }

    return await apiCall('/stats/descriptive/', 'POST', {
      data: validData,
      precision: 50
    });
  }
};

/**
 * T-Test Service
 * Real hypothesis testing with exact p-values
 */
export const tTestService = {
  // One-sample t-test
  oneSample: async (data, populationMean) => {
    if (!data || !Array.isArray(data) || data.length < 2) {
      throw new Error('At least 2 data points required for t-test');
    }

    if (typeof populationMean !== 'number' || isNaN(populationMean)) {
      throw new Error('Valid population mean required');
    }

    return await apiCall('/stats/ttest/', 'POST', {
      test_type: 'one_sample',
      data: data,
      population_mean: populationMean,
      precision: 50
    });
  },

  // Two-sample independent t-test
  twoSample: async (data1, data2, equalVariance = true) => {
    if (!data1 || !Array.isArray(data1) || data1.length < 2) {
      throw new Error('Group 1 needs at least 2 data points');
    }

    if (!data2 || !Array.isArray(data2) || data2.length < 2) {
      throw new Error('Group 2 needs at least 2 data points');
    }

    return await apiCall('/stats/ttest/', 'POST', {
      test_type: 'two_sample',
      group1: data1,
      group2: data2,
      equal_variance: equalVariance,
      precision: 50
    });
  },

  // Paired t-test
  paired: async (before, after) => {
    if (!before || !Array.isArray(before) || before.length < 2) {
      throw new Error('Before data needs at least 2 data points');
    }

    if (!after || !Array.isArray(after) || after.length < 2) {
      throw new Error('After data needs at least 2 data points');
    }

    if (before.length !== after.length) {
      throw new Error('Paired data must have equal lengths');
    }

    return await apiCall('/stats/ttest/', 'POST', {
      test_type: 'paired',
      before: before,
      after: after,
      precision: 50
    });
  }
};

/**
 * ANOVA Service
 * Real variance analysis with post-hoc tests
 */
export const anovaService = {
  oneWay: async (groups) => {
    if (!groups || !Array.isArray(groups) || groups.length < 2) {
      throw new Error('At least 2 groups required for ANOVA');
    }

    // Verify each group has data
    for (let i = 0; i < groups.length; i++) {
      if (!Array.isArray(groups[i]) || groups[i].length < 2) {
        throw new Error(`Group ${i + 1} needs at least 2 data points`);
      }
    }

    return await apiCall('/stats/anova/', 'POST', {
      test_type: 'one_way',
      groups: groups,
      post_hoc: 'tukey',
      precision: 50
    });
  },

  twoWay: async (data, factor1, factor2, interaction = true) => {
    return await apiCall('/stats/anova/', 'POST', {
      test_type: 'two_way',
      data: data,
      factor1: factor1,
      factor2: factor2,
      interaction: interaction,
      precision: 50
    });
  }
};

/**
 * Correlation Service
 * Real correlation calculations with multiple methods
 */
export const correlationService = {
  calculate: async (x, y, method = 'pearson') => {
    if (!x || !Array.isArray(x) || x.length < 3) {
      throw new Error('X data needs at least 3 points');
    }

    if (!y || !Array.isArray(y) || y.length < 3) {
      throw new Error('Y data needs at least 3 points');
    }

    if (x.length !== y.length) {
      throw new Error('X and Y must have equal lengths');
    }

    const validMethods = ['pearson', 'spearman', 'kendall'];
    if (!validMethods.includes(method)) {
      throw new Error(`Method must be one of: ${validMethods.join(', ')}`);
    }

    return await apiCall('/stats/correlation/', 'POST', {
      x: x,
      y: y,
      method: method,
      precision: 50
    });
  },

  // Correlation matrix for multiple variables
  matrix: async (data, method = 'pearson') => {
    if (!data || typeof data !== 'object') {
      throw new Error('Data object with variables required');
    }

    const variables = Object.keys(data);
    if (variables.length < 2) {
      throw new Error('At least 2 variables required for correlation matrix');
    }

    return await apiCall('/stats/correlation/', 'POST', {
      data: data,
      method: method,
      matrix: true,
      precision: 50
    });
  }
};

/**
 * Regression Service
 * Real regression analysis with diagnostics
 */
export const regressionService = {
  linear: async (x, y) => {
    if (!x || !Array.isArray(x) || x.length < 3) {
      throw new Error('X data needs at least 3 points for regression');
    }

    if (!y || !Array.isArray(y) || y.length < 3) {
      throw new Error('Y data needs at least 3 points for regression');
    }

    if (x.length !== y.length) {
      throw new Error('X and Y must have equal lengths');
    }

    return await apiCall('/stats/regression/', 'POST', {
      regression_type: 'linear',
      x: x,
      y: y,
      diagnostics: true,
      precision: 50
    });
  },

  multiple: async (X, y) => {
    if (!X || !Array.isArray(X) || X.length === 0) {
      throw new Error('Feature matrix X required');
    }

    if (!y || !Array.isArray(y) || y.length < 3) {
      throw new Error('Target variable y needs at least 3 points');
    }

    return await apiCall('/stats/regression/', 'POST', {
      regression_type: 'multiple',
      X: X,
      y: y,
      diagnostics: true,
      precision: 50
    });
  },

  polynomial: async (x, y, degree = 2) => {
    if (!x || !Array.isArray(x) || x.length < degree + 2) {
      throw new Error(`Need at least ${degree + 2} points for degree ${degree} polynomial`);
    }

    if (!y || !Array.isArray(y) || y.length < degree + 2) {
      throw new Error(`Need at least ${degree + 2} points for degree ${degree} polynomial`);
    }

    if (x.length !== y.length) {
      throw new Error('X and Y must have equal lengths');
    }

    return await apiCall('/stats/regression/', 'POST', {
      regression_type: 'polynomial',
      x: x,
      y: y,
      degree: degree,
      diagnostics: true,
      precision: 50
    });
  },

  logistic: async (X, y, binary = true) => {
    return await apiCall('/stats/regression/', 'POST', {
      regression_type: 'logistic',
      X: X,
      y: y,
      binary: binary,
      diagnostics: true,
      precision: 50
    });
  }
};

/**
 * Non-parametric Tests Service
 * Real non-parametric testing for non-normal data
 */
export const nonParametricService = {
  mannWhitney: async (group1, group2) => {
    if (!group1 || !Array.isArray(group1) || group1.length < 3) {
      throw new Error('Group 1 needs at least 3 data points');
    }

    if (!group2 || !Array.isArray(group2) || group2.length < 3) {
      throw new Error('Group 2 needs at least 3 data points');
    }

    return await apiCall('/nonparametric/mann-whitney/', 'POST', {
      group1: group1,
      group2: group2,
      precision: 50
    });
  },

  wilcoxon: async (data1, data2 = null) => {
    if (!data1 || !Array.isArray(data1) || data1.length < 5) {
      throw new Error('At least 5 data points required for Wilcoxon test');
    }

    const payload = {
      data1: data1,
      precision: 50
    };

    if (data2) {
      if (!Array.isArray(data2) || data2.length !== data1.length) {
        throw new Error('Paired data must have equal lengths');
      }
      payload.data2 = data2;
      payload.paired = true;
    }

    return await apiCall('/nonparametric/wilcoxon/', 'POST', payload);
  },

  kruskalWallis: async (groups) => {
    if (!groups || !Array.isArray(groups) || groups.length < 3) {
      throw new Error('At least 3 groups required for Kruskal-Wallis test');
    }

    for (let i = 0; i < groups.length; i++) {
      if (!Array.isArray(groups[i]) || groups[i].length < 3) {
        throw new Error(`Group ${i + 1} needs at least 3 data points`);
      }
    }

    return await apiCall('/nonparametric/kruskal-wallis/', 'POST', {
      groups: groups,
      precision: 50
    });
  }
};

/**
 * Categorical Tests Service
 * Real chi-square and Fisher's exact tests
 */
export const categoricalService = {
  chiSquareGoodness: async (observed, expected = null) => {
    if (!observed || !Array.isArray(observed) || observed.length < 2) {
      throw new Error('At least 2 categories required');
    }

    const payload = {
      observed: observed,
      precision: 50
    };

    if (expected) {
      if (!Array.isArray(expected) || expected.length !== observed.length) {
        throw new Error('Expected frequencies must match observed length');
      }
      payload.expected = expected;
    }

    return await apiCall('/categorical/chi-square/goodness/', 'POST', payload);
  },

  chiSquareIndependence: async (contingencyTable) => {
    if (!contingencyTable || !Array.isArray(contingencyTable) || contingencyTable.length < 2) {
      throw new Error('At least 2x2 contingency table required');
    }

    for (let row of contingencyTable) {
      if (!Array.isArray(row) || row.length < 2) {
        throw new Error('Each row must have at least 2 columns');
      }
    }

    return await apiCall('/categorical/chi-square/independence/', 'POST', {
      table: contingencyTable,
      precision: 50
    });
  },

  fishersExact: async (contingencyTable) => {
    if (!contingencyTable || !Array.isArray(contingencyTable) || contingencyTable.length !== 2) {
      throw new Error('2x2 contingency table required for Fisher\'s exact test');
    }

    for (let row of contingencyTable) {
      if (!Array.isArray(row) || row.length !== 2) {
        throw new Error('2x2 table required');
      }
    }

    return await apiCall('/categorical/fishers/', 'POST', {
      table: contingencyTable,
      precision: 50
    });
  }
};

/**
 * Power Analysis Service
 * Real power calculations for sample size determination
 */
export const powerAnalysisService = {
  tTest: async (effectSize, alpha = 0.05, power = 0.80, testType = 'two-tailed') => {
    if (effectSize <= 0 || effectSize > 3) {
      throw new Error('Effect size must be between 0 and 3');
    }

    if (alpha <= 0 || alpha >= 1) {
      throw new Error('Alpha must be between 0 and 1');
    }

    if (power <= 0 || power >= 1) {
      throw new Error('Power must be between 0 and 1');
    }

    return await apiCall('/power/t-test/', 'POST', {
      effect_size: effectSize,
      alpha: alpha,
      power: power,
      test_type: testType,
      precision: 50
    });
  },

  anova: async (groups, effectSize, alpha = 0.05, power = 0.80) => {
    if (groups < 2 || groups > 10) {
      throw new Error('Number of groups must be between 2 and 10');
    }

    return await apiCall('/power/anova/', 'POST', {
      groups: groups,
      effect_size: effectSize,
      alpha: alpha,
      power: power,
      precision: 50
    });
  }
};

/**
 * Data Validation Service
 * Ensures data quality before analysis
 */
export const dataValidationService = {
  validateNumeric: (data) => {
    if (!data || !Array.isArray(data)) {
      return { valid: false, error: 'Data must be an array' };
    }

    const validData = data.filter(d => typeof d === 'number' && !isNaN(d) && isFinite(d));

    if (validData.length === 0) {
      return { valid: false, error: 'No valid numeric data found' };
    }

    if (validData.length < data.length) {
      return {
        valid: true,
        warning: `${data.length - validData.length} invalid values removed`,
        data: validData
      };
    }

    return { valid: true, data: validData };
  },

  checkNormality: async (data) => {
    if (!data || !Array.isArray(data) || data.length < 8) {
      throw new Error('At least 8 data points required for normality test');
    }

    return await apiCall('/diagnostics/normality/', 'POST', {
      data: data,
      tests: ['shapiro', 'jarque_bera', 'anderson_darling'],
      precision: 50
    });
  },

  checkOutliers: async (data, method = 'iqr') => {
    if (!data || !Array.isArray(data) || data.length < 4) {
      throw new Error('At least 4 data points required for outlier detection');
    }

    return await apiCall('/diagnostics/outliers/', 'POST', {
      data: data,
      method: method,
      precision: 50
    });
  }
};

/**
 * Export Service
 * Export results in various formats
 */
export const exportService = {
  toPDF: async (results, moduleName) => {
    return await apiCall('/export/pdf/', 'POST', {
      results: results,
      module: moduleName,
      timestamp: new Date().toISOString()
    });
  },

  toExcel: async (results, moduleName) => {
    return await apiCall('/export/excel/', 'POST', {
      results: results,
      module: moduleName,
      timestamp: new Date().toISOString()
    });
  },

  toJSON: (results) => {
    return JSON.stringify(results, null, 2);
  }
};

// Export all services as default
export default {
  descriptiveStatistics: descriptiveStatisticsService,
  tTest: tTestService,
  anova: anovaService,
  correlation: correlationService,
  regression: regressionService,
  nonParametric: nonParametricService,
  categorical: categoricalService,
  powerAnalysis: powerAnalysisService,
  dataValidation: dataValidationService,
  export: exportService
};