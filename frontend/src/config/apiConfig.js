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
  
  // Multiplicity Correction
  multiplicity: {
    correct: '/multiplicity/correct/',
  },
  
  // Power Analysis
  power: {
    calculate: '/power/calculate/',
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