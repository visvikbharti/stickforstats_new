// API Configuration

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

export const endpoints = {
  // Test Recommender
  testRecommender: {
    uploadData: '/test-recommender/upload-data/',
    checkAssumptions: '/test-recommender/check-assumptions/',
    recommend: '/test-recommender/recommend/',
    runTest: '/test-recommender/run-test/',
  },

  // Guardian System
  // NOTE: the assumption-check endpoint is mounted at `/guardian/check/`
  // (backend/core/guardian/urls.py -> path("check/", GuardianCheckView)).
  // The former `/guardian/check-assumptions/` value was stale (no such route);
  // `services/GuardianService.js` is the canonical caller and already uses
  // `/guardian/check/`.
  guardian: {
    health: '/guardian/health/',
    preflight: '/guardian/preflight/',
    check: '/guardian/check/',
    checkAssumptions: '/guardian/check/',
  },

  // Assumptions
  assumptions: {
    checkAll: '/assumptions/check-all/',
  },

  // Statistical Tests
  stats: {
    ttest: '/v1/stats/ttest/',
    anova: '/v1/stats/anova/',
  },

  // Non-parametric Tests
  nonparametric: {
    mannWhitney: '/v1/nonparametric/mann-whitney/',
    kruskalWallis: '/v1/nonparametric/kruskal-wallis/',
    wilcoxon: '/v1/nonparametric/wilcoxon/',
    friedman: '/v1/nonparametric/friedman/',
  },

  // ANOVA variants
  anova: {
    repeatedMeasures: '/v1/anova/repeated-measures/',
    twoWay: '/v1/stats/anova/',
  },

  // Multivariate
  multivariate: {
    manova: '/v1/multivariate/manova/',
  },

  // Multiplicity Correction
  multiplicity: {
    correct: '/multiplicity/correct/',
  },

  // Power Analysis
  power: {
    calculate: '/power/calculate/',
    ttest: '/v1/power/t-test/',
    anova: '/v1/power/anova/',
    sampleSize: '/v1/power/sample-size/',
  },

  // Effect Sizes
  effectSizes: {
    calculate: '/effect-sizes/calculate/',
  },

  // Confidence Intervals
  confidenceIntervals: {
    calculate: '/confidence-intervals/calculate/',
    bootstrap: '/confidence-intervals/bootstrap/',
  },

  // PCA
  pca: {
    analyze: '/pca/analyze/',
    visualize: '/pca/visualize/',
  },

  // DOE
  doe: {
    design: '/doe/design/',
    analyze: '/doe/analyze/',
  },

  // Probability Distributions
  probability: {
    calculate: '/probability/calculate/',
    simulate: '/probability/simulate/',
  },
};

// Helper to get full API URL.
//
// Call sites use two conventions: most pass a path relative to the /api mount
// (as the `endpoints` map above does — '/v1/stats/anova/'), but a few pass the
// absolute path ('/api/v1/stats/ttest/'). Every deployment sets a base URL that
// already ends in '/api' (CI builds the prod image with REACT_APP_API_URL=/api),
// so naive concatenation turned the absolute form into '/api/api/v1/...', which
// Django has no route for. Collapse the duplicate so both conventions resolve.
export const getApiUrl = (endpoint) => {
  const base = API_BASE_URL.replace(/\/+$/, '');
  let path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  if (base.endsWith('/api') && (path === '/api' || path.startsWith('/api/'))) {
    path = path.slice('/api'.length) || '/';
  }

  return `${base}${path}`;
};

// WebSocket endpoints configuration
const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';

export const WS_ENDPOINTS = {
  // DOE WebSocket endpoints
  doe: {
    analysis: (analysisId) => `${WS_BASE_URL}/doe/analysis/${analysisId}/`,
    progress: (analysisId) => `${WS_BASE_URL}/doe/progress/${analysisId}/`,
  },
  
  // PCA WebSocket endpoints
  pca: {
    progress: (analysisId) => `${WS_BASE_URL}/pca/progress/${analysisId}/`,
    results: (analysisId) => `${WS_BASE_URL}/pca/results/${analysisId}/`,
  },
  
  // Workflow WebSocket endpoints
  workflow: {
    execution: (workflowId) => `${WS_BASE_URL}/workflow/execution/${workflowId}/`,
    status: (workflowId) => `${WS_BASE_URL}/workflow/status/${workflowId}/`,
  },
  
  // Report generation WebSocket endpoints
  reports: {
    generation: (reportId) => `${WS_BASE_URL}/reports/generation/${reportId}/`,
    status: (reportId) => `${WS_BASE_URL}/reports/status/${reportId}/`,
  },
  
  // Real-time collaboration
  collaboration: {
    analysis: (analysisId) => `${WS_BASE_URL}/collaboration/analysis/${analysisId}/`,
    workspace: (workspaceId) => `${WS_BASE_URL}/collaboration/workspace/${workspaceId}/`,
  },
  
  // System monitoring
  monitoring: {
    system: () => `${WS_BASE_URL}/monitoring/system/`,
    performance: () => `${WS_BASE_URL}/monitoring/performance/`,
  },
};

// Helper function to get WebSocket URL for a specific path
export const getWebSocketUrl = (path = '') => {
  const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';
  return path ? `${wsUrl}/${path}` : wsUrl;
};

export default apiConfig;