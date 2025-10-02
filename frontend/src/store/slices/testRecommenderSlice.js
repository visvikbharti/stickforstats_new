/**
 * Test Recommender Redux Slice
 * ============================
 * Manages state for statistical test recommendations and assumption checking
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import ApiService from '../../services/api';

// Async thunks for API calls
export const uploadData = createAsyncThunk(
  'testRecommender/uploadData',
  async ({ file, onProgress }, { rejectWithValue }) => {
    try {
      const response = await ApiService.testRecommender.uploadData(
        file,
        (progress) => {
          if (onProgress) onProgress(progress);
        }
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to upload data');
    }
  }
);

export const checkAssumptions = createAsyncThunk(
  'testRecommender/checkAssumptions',
  async ({ testType, variables, alpha }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const dataId = state.testRecommender.dataId;
      
      if (!dataId) {
        throw new Error('No data uploaded. Please upload data first.');
      }
      
      const response = await ApiService.testRecommender.checkAssumptions(
        dataId,
        testType || 'normality',
        variables || [],
        alpha || 0.05
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to check assumptions');
    }
  }
);

export const getRecommendations = createAsyncThunk(
  'testRecommender/getRecommendations',
  async ({ dependentVar, independentVars, hypothesisType, isPaired, alpha }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const dataId = state.testRecommender.dataId;
      
      if (!dataId) {
        throw new Error('No data uploaded. Please upload data first.');
      }
      
      const response = await ApiService.testRecommender.recommendTest(
        dataId,
        dependentVar,
        independentVars,
        hypothesisType || 'difference',
        isPaired || false,
        alpha || 0.05
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to get recommendations');
    }
  }
);

export const runRecommendedTest = createAsyncThunk(
  'testRecommender/runTest',
  async ({ testType, dependentVar, independentVars, parameters }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const dataId = state.testRecommender.dataId;
      
      if (!dataId) {
        throw new Error('No data uploaded. Please upload data first.');
      }
      
      const response = await ApiService.testRecommender.runTest(
        dataId,
        testType,
        dependentVar,
        independentVars,
        parameters || {}
      );
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data || error.message);
    }
  }
);

const initialState = {
  // Data management
  dataId: null,
  dataSummary: null,
  variables: [],
  uploadProgress: 0,
  
  // Data characteristics
  dataCharacteristics: {
    sampleSize: null,
    numberOfGroups: null,
    dataType: null, // 'continuous', 'categorical', 'ordinal', 'mixed'
    isNormal: null,
    hasEqualVariances: null,
    isIndependent: null,
    hasPairedData: null,
    hasOutliers: null,
    missingDataPattern: null
  },
  
  // Assumption check results
  assumptionChecks: {
    normality: {
      test: null,
      statistic: null,
      pValue: null,
      passed: null,
      details: null
    },
    homogeneity: {
      test: null,
      statistic: null,
      pValue: null,
      passed: null,
      details: null
    },
    independence: {
      test: null,
      statistic: null,
      pValue: null,
      passed: null,
      details: null
    },
    outliers: {
      method: null,
      count: null,
      indices: [],
      details: null
    }
  },
  
  // Test recommendations
  recommendations: {
    primary: {
      testName: null,
      confidence: null,
      rationale: null,
      assumptions: [],
      alternativesIfViolated: []
    },
    alternatives: [],
    warnings: [],
    suggestions: []
  },
  
  // Test execution results
  testResults: {
    testName: null,
    statistic: null,
    pValue: null,
    effectSize: null,
    confidenceInterval: null,
    degreesOfFreedom: null,
    interpretation: null,
    additionalMetrics: {}
  },
  
  // UI state
  ui: {
    isAnalyzing: false,
    isCheckingAssumptions: false,
    isRunningTest: false,
    error: null,
    warnings: [],
    activeStep: 'data_input', // 'data_input', 'assumption_check', 'test_selection', 'results'
    expandedSections: {
      assumptions: true,
      recommendations: true,
      results: false
    }
  },
  
  // History tracking
  history: {
    analyses: [],
    lastAnalysis: null
  }
};

const testRecommenderSlice = createSlice({
  name: 'testRecommender',
  initialState,
  reducers: {
    // UI actions
    setActiveStep: (state, action) => {
      state.ui.activeStep = action.payload;
    },
    
    toggleSection: (state, action) => {
      const section = action.payload;
      state.ui.expandedSections[section] = !state.ui.expandedSections[section];
    },
    
    clearError: (state) => {
      state.ui.error = null;
    },
    
    clearWarnings: (state) => {
      state.ui.warnings = [];
    },
    
    // Data actions
    updateDataCharacteristics: (state, action) => {
      state.dataCharacteristics = {
        ...state.dataCharacteristics,
        ...action.payload
      };
    },
    
    // History actions
    saveToHistory: (state) => {
      const analysis = {
        timestamp: new Date().toISOString(),
        dataCharacteristics: state.dataCharacteristics,
        assumptionChecks: state.assumptionChecks,
        recommendations: state.recommendations,
        testResults: state.testResults
      };
      state.history.analyses.unshift(analysis);
      state.history.lastAnalysis = analysis.timestamp;
      
      // Keep only last 10 analyses
      if (state.history.analyses.length > 10) {
        state.history.analyses = state.history.analyses.slice(0, 10);
      }
    },
    
    loadFromHistory: (state, action) => {
      const analysis = state.history.analyses.find(
        a => a.timestamp === action.payload
      );
      if (analysis) {
        state.dataCharacteristics = analysis.dataCharacteristics;
        state.assumptionChecks = analysis.assumptionChecks;
        state.recommendations = analysis.recommendations;
        state.testResults = analysis.testResults;
      }
    },
    
    // Reset actions
    resetAnalysis: (state) => {
      state.dataCharacteristics = initialState.dataCharacteristics;
      state.assumptionChecks = initialState.assumptionChecks;
      state.recommendations = initialState.recommendations;
      state.testResults = initialState.testResults;
      state.ui.activeStep = 'data_input';
    }
  },
  extraReducers: (builder) => {
    // Upload data
    builder
      .addCase(uploadData.pending, (state) => {
        state.ui.isAnalyzing = true;
        state.ui.error = null;
        state.uploadProgress = 0;
      })
      .addCase(uploadData.fulfilled, (state, action) => {
        state.ui.isAnalyzing = false;
        state.dataId = action.payload.data_id;
        state.dataSummary = action.payload;
        state.variables = action.payload.variables;
        state.dataCharacteristics.sampleSize = action.payload.n_rows;
        state.uploadProgress = 100;
        state.ui.activeStep = 'assumption_check';
      })
      .addCase(uploadData.rejected, (state, action) => {
        state.ui.isAnalyzing = false;
        state.ui.error = action.payload;
        state.uploadProgress = 0;
      });
    
    // Check assumptions
    builder
      .addCase(checkAssumptions.pending, (state) => {
        state.ui.isCheckingAssumptions = true;
        state.ui.error = null;
      })
      .addCase(checkAssumptions.fulfilled, (state, action) => {
        state.ui.isCheckingAssumptions = false;
        // Handle array of assumption results
        if (Array.isArray(action.payload)) {
          action.payload.forEach(result => {
            if (result.test_name.includes('normality')) {
              state.assumptionChecks.normality = {
                test: result.test_name,
                statistic: result.statistic,
                pValue: result.p_value,
                passed: result.passed,
                details: result.interpretation
              };
            }
          });
        }
        state.ui.warnings = action.payload.warnings || [];
      })
      .addCase(checkAssumptions.rejected, (state, action) => {
        state.ui.isCheckingAssumptions = false;
        state.ui.error = action.payload;
      });
    
    // Get recommendations
    builder
      .addCase(getRecommendations.pending, (state) => {
        state.ui.isAnalyzing = true;
        state.ui.error = null;
      })
      .addCase(getRecommendations.fulfilled, (state, action) => {
        state.ui.isAnalyzing = false;
        if (action.payload.length > 0) {
          const primary = action.payload[0];
          state.recommendations.primary = {
            testName: primary.test_name,
            confidence: primary.suitability_score,
            rationale: primary.reasons.join('; '),
            assumptions: primary.assumptions_met,
            alternativesIfViolated: primary.alternatives || []
          };
          state.recommendations.alternatives = action.payload.slice(1);
        }
        state.ui.activeStep = 'test_selection';
      })
      .addCase(getRecommendations.rejected, (state, action) => {
        state.ui.isAnalyzing = false;
        state.ui.error = action.payload;
      });
    
    // Run test
    builder
      .addCase(runRecommendedTest.pending, (state) => {
        state.ui.isRunningTest = true;
        state.ui.error = null;
      })
      .addCase(runRecommendedTest.fulfilled, (state, action) => {
        state.ui.isRunningTest = false;
        state.testResults = action.payload.results;
        state.ui.activeStep = 'results';
        state.ui.expandedSections.results = true;
      })
      .addCase(runRecommendedTest.rejected, (state, action) => {
        state.ui.isRunningTest = false;
        state.ui.error = action.payload;
      });
  }
});

// Export actions
export const {
  setActiveStep,
  toggleSection,
  clearError,
  clearWarnings,
  updateDataCharacteristics,
  saveToHistory,
  loadFromHistory,
  resetAnalysis
} = testRecommenderSlice.actions;

// Selectors
export const selectDataCharacteristics = (state) => state.testRecommender.dataCharacteristics;
export const selectAssumptionChecks = (state) => state.testRecommender.assumptionChecks;
export const selectRecommendations = (state) => state.testRecommender.recommendations;
export const selectTestResults = (state) => state.testRecommender.testResults;
export const selectUI = (state) => state.testRecommender.ui;
export const selectHistory = (state) => state.testRecommender.history;

export default testRecommenderSlice.reducer;