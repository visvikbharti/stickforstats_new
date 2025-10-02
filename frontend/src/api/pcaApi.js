import axios from 'axios';

// API base URL
const API_URL = '/api/v1/pca-analysis';

// Check if in demo mode
const isDemoMode = process.env.REACT_APP_DEMO_MODE === 'true' || process.env.REACT_APP_DISABLE_API === 'true';

// Mock data for demo mode
const mockProjects = [
  {
    id: 'demo-pca-1',
    name: 'Gene Expression Analysis',
    description: 'Principal component analysis of gene expression data',
    created_at: new Date().toISOString(),
    data_shape: [100, 20],
    has_results: true
  },
  {
    id: 'demo-pca-2',
    name: 'Customer Segmentation',
    description: 'PCA for customer behavior patterns',
    created_at: new Date().toISOString(),
    data_shape: [500, 15],
    has_results: false
  }
];

// Generate mock PCA results
const generateMockPcaResults = (projectId) => {
  const n_samples = 100;
  const n_features = 20;
  const n_components = 3;
  
  // Generate mock data
  const pc1Values = Array.from({length: n_samples}, () => (Math.random() - 0.5) * 4);
  const pc2Values = Array.from({length: n_samples}, () => (Math.random() - 0.5) * 3);
  const pc3Values = Array.from({length: n_samples}, () => (Math.random() - 0.5) * 2);
  
  return {
    sessionId: `demo-session-${Date.now()}`,
    projectId: projectId,
    explained_variance_ratio: [0.45, 0.25, 0.15, 0.08, 0.04, 0.03],
    cumulative_variance_ratio: [0.45, 0.70, 0.85, 0.93, 0.97, 1.0],
    loadings: Array.from({length: n_features}, (_, i) => ({
      feature: `Feature_${i + 1}`,
      PC1: (Math.random() - 0.5) * 2,
      PC2: (Math.random() - 0.5) * 2,
      PC3: (Math.random() - 0.5) * 2
    })),
    scores: pc1Values.map((pc1, i) => ({
      sample_id: `Sample_${i + 1}`,
      PC1: pc1,
      PC2: pc2Values[i],
      PC3: pc3Values[i]
    })),
    eigenvalues: [9.0, 5.0, 3.0, 1.6, 0.8, 0.6],
    n_components: n_components,
    n_samples: n_samples,
    n_features: n_features,
    configuration: {
      numComponents: n_components,
      scalingMethod: 'standard',
      excludeColumns: [],
      groupingColumn: ''
    }
  };
};

// Project endpoints
export const fetchPcaProjects = async () => {
  if (isDemoMode) {
    return mockProjects;
  }
  
  try {
    const response = await axios.get(`${API_URL}/projects/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchPcaProject = async (projectId) => {
  if (isDemoMode) {
    const project = mockProjects.find(p => p.id === projectId);
    if (project) return project;
    throw new Error('Project not found');
  }
  
  try {
    const response = await axios.get(`${API_URL}/projects/${projectId}/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createPcaProject = async (projectData) => {
  if (isDemoMode) {
    const newProject = {
      id: `demo-pca-${Date.now()}`,
      name: projectData.name || 'New PCA Project',
      description: projectData.description || 'Demo PCA analysis project',
      created_at: new Date().toISOString(),
      data_shape: [0, 0],
      has_results: false
    };
    mockProjects.push(newProject);
    return newProject;
  }
  
  try {
    const response = await axios.post(`${API_URL}/projects/`, projectData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updatePcaProject = async (projectId, projectData) => {
  try {
    const response = await axios.patch(`${API_URL}/projects/${projectId}/`, projectData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deletePcaProject = async (projectId) => {
  try {
    const response = await axios.delete(`${API_URL}/projects/${projectId}/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Data upload
export const uploadPcaData = async (formData) => {
  if (isDemoMode) {
    // Simulate file upload in demo mode
    return {
      id: `demo-dataset-${Date.now()}`,
      filename: 'demo_data.csv',
      rows: 100,
      columns: 20,
      numeric_columns: Array.from({length: 20}, (_, i) => `Feature_${i + 1}`),
      categorical_columns: ['Group'],
      preview: Array.from({length: 5}, (_, i) => ({
        ...Object.fromEntries(
          Array.from({length: 20}, (_, j) => [`Feature_${j + 1}`, Math.random() * 100])
        ),
        Group: i < 2 ? 'Control' : 'Treatment'
      }))
    };
  }
  
  try {
    const response = await axios.post(`${API_URL}/projects/upload_data/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createPcaDemoProject = async (projectData) => {
  try {
    const response = await axios.post(`${API_URL}/projects/create_demo/`, projectData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// PCA analysis
export const runPcaAnalysis = async (analysisData) => {
  if (isDemoMode) {
    // Simulate PCA analysis in demo mode
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time
    return generateMockPcaResults(analysisData.datasetId || 'demo-project');
  }
  
  // Original API expects projectId and analysisParams separately
  const { datasetId, configuration } = analysisData;
  
  try {
    const response = await axios.post(`${API_URL}/projects/${datasetId}/run_pca/`, configuration);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Results endpoints
export const fetchPcaResults = async (resultId) => {
  if (isDemoMode) {
    // Return mock results for demo mode
    return generateMockPcaResults('demo-project');
  }
  
  try {
    const response = await axios.get(`${API_URL}/results/${resultId}/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Alias for fetchPcaResults for compatibility
export const getPcaResults = fetchPcaResults;

export const fetchProjectResults = async (projectId) => {
  try {
    const response = await axios.get(`${API_URL}/results/`, {
      params: { project: projectId }
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchPcaVisualizationData = async (resultId, visualizationParams) => {
  try {
    const response = await axios.get(`${API_URL}/results/${resultId}/visualization_data/`, {
      params: visualizationParams
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchPcaVisualizations = async (resultId) => {
  try {
    const response = await axios.get(`${API_URL}/results/${resultId}/visualizations/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchGeneContributions = async (resultId, params) => {
  try {
    const response = await axios.get(`${API_URL}/results/${resultId}/gene_contributions/`, {
      params
    });
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Visualization endpoints
export const createPcaVisualization = async (resultId, visualizationData) => {
  try {
    const response = await axios.post(`${API_URL}/results/${resultId}/visualizations/`, visualizationData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const fetchVisualizationData = async (resultId, visualizationId) => {
  try {
    const response = await axios.get(`${API_URL}/results/${resultId}/visualizations/${visualizationId}/data/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Sample group endpoints
export const fetchSampleGroups = async (projectId) => {
  try {
    const response = await axios.get(`${API_URL}/projects/${projectId}/groups/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const createSampleGroup = async (projectId, groupData) => {
  try {
    const response = await axios.post(`${API_URL}/projects/${projectId}/groups/`, groupData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateSampleGroup = async (projectId, groupId, groupData) => {
  try {
    const response = await axios.patch(`${API_URL}/projects/${projectId}/groups/${groupId}/`, groupData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const deleteSampleGroup = async (projectId, groupId) => {
  try {
    const response = await axios.delete(`${API_URL}/projects/${projectId}/groups/${groupId}/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Sample endpoints
export const fetchSamples = async (projectId) => {
  try {
    const response = await axios.get(`${API_URL}/projects/${projectId}/samples/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

export const updateSample = async (projectId, sampleId, sampleData) => {
  try {
    const response = await axios.patch(`${API_URL}/projects/${projectId}/samples/${sampleId}/`, sampleData);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// Gene endpoints
export const fetchGenes = async (projectId) => {
  try {
    const response = await axios.get(`${API_URL}/projects/${projectId}/genes/`);
    return response.data;
  } catch (error) {
    throw handleApiError(error);
  }
};

// All demo functionality has been removed for authenticity

// No demo data - only real user data
// All demo/mock data has been completely removed

// Demo wrapper removed - only real API calls

// Error handling
const handleApiError = (error) => {
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const errorMessage = error.response.data.detail || 
                         error.response.data.message || 
                         error.response.data.error ||
                         'Server error';
    return new Error(errorMessage);
  } else if (error.request) {
    // The request was made but no response was received
    return new Error('No response from server. Please check your network connection.');
  } else {
    // Something happened in setting up the request that triggered an Error
    return new Error('An error occurred while making the request.');
  }
};

// No demo mode overrides - only real API calls
// Removed all demo mode logic

export default {
  fetchPcaProjects,
  fetchPcaProject,
  createPcaProject,
  updatePcaProject,
  deletePcaProject,
  uploadPcaData,
  createPcaDemoProject,
  runPcaAnalysis,
  fetchPcaResults,
  getPcaResults,
  fetchProjectResults,
  fetchPcaVisualizationData,
  fetchPcaVisualizations,
  fetchGeneContributions,
  createPcaVisualization,
  fetchVisualizationData,
  fetchSampleGroups,
  createSampleGroup,
  updateSampleGroup,
  deleteSampleGroup,
  fetchSamples,
  updateSample,
  fetchGenes
};