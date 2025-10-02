// DOE (Design of Experiments) Service
import axios from 'axios';
import apiConfig from '../config/apiConfig';

const doeService = {
  // Create a new DOE design
  createDesign: async (designParams) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/doe/design/`,
        designParams,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error creating DOE design:', error);
      throw error;
    }
  },

  // Analyze DOE results
  analyzeDesign: async (designData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/doe/analyze/`,
        designData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error analyzing DOE design:', error);
      throw error;
    }
  },

  // Get design types
  getDesignTypes: async () => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/doe/design-types/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching design types:', error);
      throw error;
    }
  },

  // Generate factorial design
  generateFactorialDesign: async (factors, levels) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/doe/factorial/`,
        { factors, levels },
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error generating factorial design:', error);
      throw error;
    }
  },

  // Generate response surface design
  generateResponseSurfaceDesign: async (params) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/doe/response-surface/`,
        params,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error generating response surface design:', error);
      throw error;
    }
  },

  // Optimize design
  optimizeDesign: async (designData, criteria) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/doe/optimize/`,
        { design: designData, criteria },
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error optimizing design:', error);
      throw error;
    }
  },

  // Calculate power analysis
  calculatePower: async (designData, effectSize, alpha = 0.05) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/doe/power-analysis/`,
        { design: designData, effect_size: effectSize, alpha },
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error calculating power:', error);
      throw error;
    }
  },

  // Get saved designs
  getSavedDesigns: async () => {
    try {
      const response = await axios.get(
        `${apiConfig.baseURL}/doe/saved-designs/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching saved designs:', error);
      throw error;
    }
  },

  // Save design
  saveDesign: async (designData) => {
    try {
      const response = await axios.post(
        `${apiConfig.baseURL}/doe/save-design/`,
        designData,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error saving design:', error);
      throw error;
    }
  },

  // Delete design
  deleteDesign: async (designId) => {
    try {
      const response = await axios.delete(
        `${apiConfig.baseURL}/doe/design/${designId}/`,
        apiConfig
      );
      return response.data;
    } catch (error) {
      console.error('Error deleting design:', error);
      throw error;
    }
  }
};

// Named exports for backward compatibility
export const fetchAnalysisData = async (analysisId) => {
  try {
    const response = await axios.get(
      `${apiConfig.baseURL}/doe/analysis/${analysisId}/`,
      apiConfig
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching analysis data:', error);
    throw error;
  }
};

export const generateDesign = doeService.createDesign;

export const uploadExperimentData = async (data) => {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}/doe/upload/`,
      data,
      apiConfig
    );
    return response.data;
  } catch (error) {
    console.error('Error uploading experiment data:', error);
    throw error;
  }
};

export const runModelAnalysis = doeService.analyzeDesign;

export const optimizeResponse = async (designData, criteria) => {
  try {
    const response = await axios.post(
      `${apiConfig.baseURL}/doe/optimize-response/`,
      { design: designData, criteria },
      apiConfig
    );
    return response.data;
  } catch (error) {
    console.error('Error optimizing response:', error);
    throw error;
  }
};

// Additional exports required by DOE components
export const {
  createDesign,
  analyzeDesign,
  getDesignTypes,
  generateFactorialDesign,
  generateResponseSurfaceDesign,
  optimizeDesign,
  calculatePower,
  getSavedDesigns,
  saveDesign,
  deleteDesign
} = doeService;

export default doeService;