/**
 * API Service Configuration
 * Enterprise-grade API client for StickForStats
 *
 * Features:
 * - Axios interceptors for auth and errors
 * - Request/response transformation
 * - Automatic retry logic
 * - Progress tracking for uploads
 * - Centralized error handling
 * - 50 decimal precision support
 *
 * Updated: September 16, 2025
 * Version: 2.0.0
 */

import axios from 'axios';
import Decimal from 'decimal.js';

// Configure Decimal.js for 50 decimal places
Decimal.set({ precision: 50 });

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

// Create axios instance with defaults
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }

    // Add request ID for tracking
    config.headers['X-Request-ID'] = generateRequestId();

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] Response:`, response.data);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Handle network errors
    if (!error.response) {
      console.error('[API] Network error:', error.message);
      throw new ApiError('Network error. Please check your connection.', 'NETWORK_ERROR');
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear token and redirect to login
      localStorage.removeItem('authToken');

      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      throw new ApiError('Authentication failed. Please login again.', 'AUTH_FAILED');
    }

    // Handle other HTTP errors
    const errorMessage = error.response.data?.error || error.response.data?.detail || 'An error occurred';
    const errorCode = error.response.data?.code || `HTTP_${error.response.status}`;

    console.error(`[API] HTTP ${error.response.status}:`, errorMessage);
    throw new ApiError(errorMessage, errorCode, error.response.status);
  }
);

// Custom API Error class
class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.timestamp = new Date().toISOString();
  }
}

// Helper functions
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

async function refreshAuthToken() {
  const refreshToken = localStorage.getItem('refresh_token');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
    refresh_token: refreshToken
  });

  const { access_token, refresh_token: newRefreshToken } = response.data;
  localStorage.setItem('authToken', access_token);
  localStorage.setItem('refresh_token', newRefreshToken);

  return access_token;
}

// Retry logic for failed requests
async function retryRequest(requestFn, retries = MAX_RETRIES) {
  try {
    return await requestFn();
  } catch (error) {
    if (retries > 0 && error.status >= 500) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return retryRequest(requestFn, retries - 1);
    }
    throw error;
  }
}

// File upload with progress tracking
function uploadFile(url, file, onProgress) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_type', getFileType(file.name));

  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percentCompleted);
      }
    },
  });
}

function getFileType(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  const typeMap = {
    'csv': 'csv',
    'xlsx': 'excel',
    'xls': 'excel',
    'sav': 'spss',
    'json': 'json'
  };
  return typeMap[extension] || 'csv';
}

/**
 * Process high-precision response
 * Converts string representations to Decimal.js objects
 */
function processHighPrecisionResponse(data) {
  if (!data) return data;

  const processed = { ...data };

  // List of fields that contain high-precision values
  const precisionFields = [
    'p_value', 'statistic', 'test_statistic', 'effect_size',
    'power', 'coefficient', 'r_squared', 'chi2_statistic',
    'u_statistic', 'w_statistic', 'h_statistic'
  ];

  // Convert high-precision strings to Decimal objects
  Object.keys(processed).forEach(key => {
    if (precisionFields.some(field => key.includes(field))) {
      if (typeof processed[key] === 'string' && processed[key].includes('.')) {
        try {
          processed[`${key}_decimal`] = new Decimal(processed[key]);
          processed[`${key}_display`] = formatHighPrecision(processed[key]);
        } catch (e) {
          // Keep original value if conversion fails
        }
      }
    }
  });

  return processed;
}

/**
 * Format high-precision number for display
 */
function formatHighPrecision(value, decimals = 6) {
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

// API Service Methods
const ApiService = {
  // Generic methods
  get: (url, params) => retryRequest(() => apiClient.get(url, { params })),
  post: (url, data) => retryRequest(() => apiClient.post(url, data)),
  put: (url, data) => retryRequest(() => apiClient.put(url, data)),
  delete: (url) => retryRequest(() => apiClient.delete(url)),
  upload: uploadFile,

  // Authentication endpoints
  auth: {
    login: (username, password) =>
      apiClient.post('/auth/login/', { username, password }),

    logout: () =>
      apiClient.post('/auth/logout/'),

    getUser: () =>
      apiClient.get('/auth/me/'),

    refresh: () => refreshAuthToken(),
  },

  // High-Precision Statistical Tests (50 decimal places)
  stats: {
    ttest: (data) =>
      apiClient.post('/v1/stats/ttest/', data).then(processHighPrecisionResponse),

    anova: (data) =>
      apiClient.post('/v1/stats/anova/', data).then(processHighPrecisionResponse),

    correlation: (data) =>
      apiClient.post('/v1/stats/correlation/', data).then(processHighPrecisionResponse),

    comparison: (data) =>
      apiClient.post('/v1/stats/comparison/', data).then(processHighPrecisionResponse),

    recommend: (data) =>
      apiClient.post('/v1/stats/recommend/', data),
  },

  // Power Analysis endpoints (comprehensive)
  power: {
    // T-test power
    tTest: (data) =>
      apiClient.post('/v1/power/t-test/', data).then(processHighPrecisionResponse),

    // Sample size for t-test
    sampleSizeTTest: (data) =>
      apiClient.post('/v1/power/sample-size/t-test/', data).then(processHighPrecisionResponse),

    // Effect size for t-test
    effectSizeTTest: (data) =>
      apiClient.post('/v1/power/effect-size/t-test/', data).then(processHighPrecisionResponse),

    // ANOVA power
    anova: (data) =>
      apiClient.post('/v1/power/anova/', data).then(processHighPrecisionResponse),

    // Correlation power
    correlation: (data) =>
      apiClient.post('/v1/power/correlation/', data).then(processHighPrecisionResponse),

    // Chi-square power
    chiSquare: (data) =>
      apiClient.post('/v1/power/chi-square/', data).then(processHighPrecisionResponse),

    // Power curves
    curves: (data) =>
      apiClient.post('/v1/power/curves/', data),

    // Optimal allocation
    allocation: (data) =>
      apiClient.post('/v1/power/allocation/', data).then(processHighPrecisionResponse),

    // Sensitivity analysis
    sensitivity: (data) =>
      apiClient.post('/v1/power/sensitivity/', data),

    // Comprehensive report
    report: (data) =>
      apiClient.post('/v1/power/report/', data),

    // Get power info
    info: () =>
      apiClient.get('/v1/power/info/'),
  },

  // Regression Analysis endpoints
  regression: {
    // Main regression analysis
    analyze: (data) =>
      apiClient.post('/v1/regression/analyze/', data).then(processHighPrecisionResponse),

    // Model comparison
    compare: (data) =>
      apiClient.post('/v1/regression/compare/', data).then(processHighPrecisionResponse),

    // Diagnostics
    diagnostics: (data) =>
      apiClient.post('/v1/regression/diagnostics/', data).then(processHighPrecisionResponse),

    // Specific regression methods (if needed)
    linear: (data) =>
      apiClient.post('/v1/regression/linear/', data).then(processHighPrecisionResponse),

    polynomial: (data) =>
      apiClient.post('/v1/regression/polynomial/', data).then(processHighPrecisionResponse),

    logistic: (data) =>
      apiClient.post('/v1/regression/logistic/', data).then(processHighPrecisionResponse),

    ridge: (data) =>
      apiClient.post('/v1/regression/ridge/', data).then(processHighPrecisionResponse),

    lasso: (data) =>
      apiClient.post('/v1/regression/lasso/', data).then(processHighPrecisionResponse),
  },

  // Non-Parametric Tests endpoints
  nonparametric: {
    // Mann-Whitney U
    mannWhitney: (data) =>
      apiClient.post('/v1/nonparametric/mann-whitney/', data).then(processHighPrecisionResponse),

    // Wilcoxon Signed-Rank
    wilcoxon: (data) =>
      apiClient.post('/v1/nonparametric/wilcoxon/', data).then(processHighPrecisionResponse),

    // Kruskal-Wallis
    kruskalWallis: (data) =>
      apiClient.post('/v1/nonparametric/kruskal-wallis/', data).then(processHighPrecisionResponse),

    // Friedman
    friedman: (data) =>
      apiClient.post('/v1/nonparametric/friedman/', data).then(processHighPrecisionResponse),

    // Sign test
    sign: (data) =>
      apiClient.post('/v1/nonparametric/sign/', data).then(processHighPrecisionResponse),

    // Mood's median
    moodsMedian: (data) =>
      apiClient.post('/v1/nonparametric/moods-median/', data).then(processHighPrecisionResponse),

    // Jonckheere-Terpstra
    jonckheere: (data) =>
      apiClient.post('/v1/nonparametric/jonckheere/', data).then(processHighPrecisionResponse),

    // Post-hoc tests
    dunns: (data) =>
      apiClient.post('/v1/nonparametric/dunns/', data).then(processHighPrecisionResponse),

    nemenyi: (data) =>
      apiClient.post('/v1/nonparametric/nemenyi/', data).then(processHighPrecisionResponse),

    // Recommendation
    recommend: (data) =>
      apiClient.post('/v1/nonparametric/recommend/', data),
  },

  // Categorical Analysis endpoints
  categorical: {
    // Chi-square tests
    chiSquare: (data) =>
      apiClient.post('/v1/categorical/chi-square/', data).then(processHighPrecisionResponse),

    // Fisher's exact
    fishersExact: (data) =>
      apiClient.post('/v1/categorical/fishers-exact/', data).then(processHighPrecisionResponse),

    // McNemar's test
    mcnemars: (data) =>
      apiClient.post('/v1/categorical/mcnemars/', data).then(processHighPrecisionResponse),

    // Cochran's Q
    cochransQ: (data) =>
      apiClient.post('/v1/categorical/cochrans-q/', data).then(processHighPrecisionResponse),

    // G-test
    gTest: (data) =>
      apiClient.post('/v1/categorical/g-test/', data).then(processHighPrecisionResponse),

    // Binomial test
    binomial: (data) =>
      apiClient.post('/v1/categorical/binomial/', data).then(processHighPrecisionResponse),

    // Multinomial test
    multinomial: (data) =>
      apiClient.post('/v1/categorical/multinomial/', data).then(processHighPrecisionResponse),

    // Effect sizes
    effectSizes: (data) =>
      apiClient.post('/v1/categorical/effect-sizes/', data).then(processHighPrecisionResponse),

    // Cohen's kappa
    cohensKappa: (data) =>
      apiClient.post('/v1/categorical/cohens-kappa/', data).then(processHighPrecisionResponse),

    // Power analysis
    power: (data) =>
      apiClient.post('/v1/categorical/power/', data).then(processHighPrecisionResponse),
  },

  // Missing Data endpoints
  missing: {
    // Analyze patterns
    analyze: (data) =>
      apiClient.post('/v1/missing/analyze/', data).then(processHighPrecisionResponse),

    // Little's MCAR test
    littlesTest: (data) =>
      apiClient.post('/v1/missing/littles-test/', data).then(processHighPrecisionResponse),

    // Impute data
    impute: (data) =>
      apiClient.post('/v1/missing/impute/', data).then(processHighPrecisionResponse),

    // Compare methods
    compareMethods: (data) =>
      apiClient.post('/v1/missing/compare-methods/', data),

    // Visualize patterns
    visualize: (data) =>
      apiClient.post('/v1/missing/visualize/', data),
  },

  // Visualization endpoints
  visualization: {
    // Create visualization
    create: (data) =>
      apiClient.post('/v1/visualization/create/', data),

    // Get visualization types
    getTypes: () =>
      apiClient.get('/v1/visualization/types/'),

    // Export visualization
    export: (data) =>
      apiClient.post('/v1/visualization/export/', data),
  },

  // Data Management endpoints
  data: {
    // Import data
    import: (file, onProgress) =>
      uploadFile('/v1/data/import/', file, onProgress),

    // Get data info
    info: (dataId) =>
      apiClient.get(`/v1/data/info/${dataId}/`),

    // Transform data
    transform: (data) =>
      apiClient.post('/v1/data/transform/', data),

    // Validate data
    validate: (data) =>
      apiClient.post('/v1/data/validate/', data),
  },

  // Validation Dashboard
  validation: {
    // Get dashboard data
    dashboard: () =>
      apiClient.get('/v1/validation/dashboard/'),

    // Run validation
    validate: (data) =>
      apiClient.post('/v1/validation/validate/', data),
  },

  // Test Recommender endpoints (updated)
  testRecommender: {
    uploadData: (file, onProgress) =>
      uploadFile('/test-recommender/upload-data/', file, onProgress),

    checkAssumptions: (dataId, testType, variables, alpha = 0.05) =>
      apiClient.post('/test-recommender/check-assumptions/', {
        data_id: dataId,
        test_type: testType,
        variables,
        alpha
      }),

    recommendTest: (dataId, dependentVar, independentVars, hypothesisType, isPaired = false, alpha = 0.05) =>
      apiClient.post('/test-recommender/recommend/', {
        data_id: dataId,
        dependent_var: dependentVar,
        independent_vars: independentVars,
        hypothesis_type: hypothesisType,
        is_paired: isPaired,
        alpha
      }),

    runTest: (dataId, testType, dependentVar, independentVars, parameters = {}, options = {}) =>
      apiClient.post('/test-recommender/run-test/', {
        data_id: dataId,
        test_type: testType,
        dependent_var: dependentVar,
        independent_vars: independentVars,
        parameters,
        options
      }).then(processHighPrecisionResponse),
  },

  // Multiplicity Correction endpoints
  multiplicity: {
    correct: (pValues, method = 'holm', alpha = 0.05, hypothesisNames = null) =>
      apiClient.post('/multiplicity/correct/', {
        p_values: pValues,
        method,
        alpha,
        hypothesis_names: hypothesisNames
      }).then(processHighPrecisionResponse),

    getMethods: () =>
      apiClient.get('/multiplicity/methods/'),
  },

  // Effect Sizes endpoints
  effectSizes: {
    calculate: (dataId, testType, groups, confidenceLevel = 0.95) =>
      apiClient.post('/effect-sizes/calculate/', {
        data_id: dataId,
        test_type: testType,
        groups,
        confidence_level: confidenceLevel
      }).then(processHighPrecisionResponse),

    convert: (value, fromType, toType, sampleSize) =>
      apiClient.post('/effect-sizes/convert/', {
        value,
        from_type: fromType,
        to_type: toType,
        sample_size: sampleSize
      }).then(processHighPrecisionResponse),
  },

  // Reproducibility endpoints
  reproducibility: {
    createBundle: (analysisId, options = {}) =>
      apiClient.post('/reproducibility/create-bundle/', {
        analysis_id: analysisId,
        include_data: options.includeData !== false,
        include_code: options.includeCode !== false,
        include_environment: options.includeEnvironment !== false,
        include_results: options.includeResults !== false,
        compression: options.compression || 'gzip'
      }),

    validateBundle: (bundleFile) => {
      const formData = new FormData();
      formData.append('bundle_file', bundleFile);
      return apiClient.post('/reproducibility/validate-bundle/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },

    reproduce: (bundleId) =>
      apiClient.post(`/reproducibility/reproduce/${bundleId}/`),
  },
};

export default ApiService;
export { ApiError, apiClient, processHighPrecisionResponse, formatHighPrecision };