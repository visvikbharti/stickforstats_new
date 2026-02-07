/**
 * Reproducibility Redux Slice
 * ===========================
 * State management for reproducibility bundles and analysis tracking
 */

import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  // Current bundle
  currentBundle: null,
  bundleId: null,

  // Bundle contents
  analysisSteps: [],
  dataSnapshots: [],
  codeBlocks: [],
  environmentInfo: null,

  // Pipeline recording
  isRecording: false,
  recordingStartTime: null,
  recordingEvents: [],

  // Saved bundles
  savedBundles: [],

  // Methods section generation
  methodsSection: null,
  methodsFormat: 'apa', // 'apa', 'chicago', 'nature', 'custom'

  // Environment capture
  environment: {
    browser: null,
    os: null,
    timestamp: null,
    libraries: [],
    dataVersion: null
  },

  // Comparison
  comparisonBundles: [],
  comparisonResults: null,

  // Export settings
  exportFormat: 'json', // 'json', 'pdf', 'html', 'rmarkdown'
  includeData: false,
  includeCode: true,
  includeResults: true,

  // UI state
  isLoading: false,
  error: null,
  activeTab: 'overview'
};

const reproducibilitySlice = createSlice({
  name: 'reproducibility',
  initialState,
  reducers: {
    // Bundle management
    createBundle: (state) => {
      state.bundleId = `bundle_${Date.now()}`;
      state.currentBundle = {
        id: state.bundleId,
        createdAt: new Date().toISOString(),
        version: 1
      };
      state.analysisSteps = [];
      state.dataSnapshots = [];
      state.codeBlocks = [];
    },

    setBundle: (state, action) => {
      state.currentBundle = action.payload;
      state.bundleId = action.payload?.id;
    },

    // Analysis step tracking
    addAnalysisStep: (state, action) => {
      const step = {
        id: `step_${state.analysisSteps.length + 1}`,
        timestamp: new Date().toISOString(),
        ...action.payload
      };
      state.analysisSteps.push(step);
    },

    updateAnalysisStep: (state, action) => {
      const { stepId, updates } = action.payload;
      const index = state.analysisSteps.findIndex(s => s.id === stepId);
      if (index !== -1) {
        state.analysisSteps[index] = { ...state.analysisSteps[index], ...updates };
      }
    },

    removeAnalysisStep: (state, action) => {
      state.analysisSteps = state.analysisSteps.filter(s => s.id !== action.payload);
    },

    // Data snapshots
    addDataSnapshot: (state, action) => {
      const snapshot = {
        id: `snapshot_${state.dataSnapshots.length + 1}`,
        timestamp: new Date().toISOString(),
        ...action.payload
      };
      state.dataSnapshots.push(snapshot);
    },

    // Code blocks
    addCodeBlock: (state, action) => {
      const block = {
        id: `code_${state.codeBlocks.length + 1}`,
        timestamp: new Date().toISOString(),
        ...action.payload
      };
      state.codeBlocks.push(block);
    },

    // Pipeline recording
    startRecording: (state) => {
      state.isRecording = true;
      state.recordingStartTime = new Date().toISOString();
      state.recordingEvents = [];
    },

    stopRecording: (state) => {
      state.isRecording = false;
    },

    addRecordingEvent: (state, action) => {
      if (state.isRecording) {
        state.recordingEvents.push({
          timestamp: new Date().toISOString(),
          ...action.payload
        });
      }
    },

    // Environment
    setEnvironmentInfo: (state, action) => {
      state.environmentInfo = action.payload;
    },

    captureEnvironment: (state) => {
      state.environment = {
        browser: navigator.userAgent,
        os: navigator.platform,
        timestamp: new Date().toISOString(),
        libraries: [],
        dataVersion: state.currentBundle?.version || 1
      };
    },

    // Bundle saving
    saveBundle: (state) => {
      if (state.currentBundle) {
        const bundle = {
          ...state.currentBundle,
          analysisSteps: state.analysisSteps,
          dataSnapshots: state.dataSnapshots,
          codeBlocks: state.codeBlocks,
          environment: state.environment,
          savedAt: new Date().toISOString()
        };

        const existingIndex = state.savedBundles.findIndex(b => b.id === bundle.id);
        if (existingIndex !== -1) {
          state.savedBundles[existingIndex] = bundle;
        } else {
          state.savedBundles.push(bundle);
        }
      }
    },

    loadBundle: (state, action) => {
      const bundle = state.savedBundles.find(b => b.id === action.payload);
      if (bundle) {
        state.currentBundle = bundle;
        state.bundleId = bundle.id;
        state.analysisSteps = bundle.analysisSteps || [];
        state.dataSnapshots = bundle.dataSnapshots || [];
        state.codeBlocks = bundle.codeBlocks || [];
        state.environment = bundle.environment || initialState.environment;
      }
    },

    deleteBundle: (state, action) => {
      state.savedBundles = state.savedBundles.filter(b => b.id !== action.payload);
    },

    // Methods section
    setMethodsSection: (state, action) => {
      state.methodsSection = action.payload;
    },

    setMethodsFormat: (state, action) => {
      state.methodsFormat = action.payload;
    },

    // Comparison
    setComparisonBundles: (state, action) => {
      state.comparisonBundles = action.payload;
    },

    setComparisonResults: (state, action) => {
      state.comparisonResults = action.payload;
    },

    // Export settings
    setExportFormat: (state, action) => {
      state.exportFormat = action.payload;
    },

    setExportOptions: (state, action) => {
      const { includeData, includeCode, includeResults } = action.payload;
      if (includeData !== undefined) state.includeData = includeData;
      if (includeCode !== undefined) state.includeCode = includeCode;
      if (includeResults !== undefined) state.includeResults = includeResults;
    },

    // UI state
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },

    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    resetState: () => initialState
  }
});

// Selectors
export const selectCurrentBundle = state => state.reproducibility?.currentBundle;
export const selectBundleId = state => state.reproducibility?.bundleId;
export const selectAnalysisSteps = state => state.reproducibility?.analysisSteps || [];
export const selectDataSnapshots = state => state.reproducibility?.dataSnapshots || [];
export const selectCodeBlocks = state => state.reproducibility?.codeBlocks || [];
export const selectEnvironmentInfo = state => state.reproducibility?.environmentInfo;
export const selectEnvironment = state => state.reproducibility?.environment || initialState.environment;
export const selectIsRecording = state => state.reproducibility?.isRecording || false;
export const selectRecordingEvents = state => state.reproducibility?.recordingEvents || [];
export const selectSavedBundles = state => state.reproducibility?.savedBundles || [];
export const selectMethodsSection = state => state.reproducibility?.methodsSection;
export const selectMethodsFormat = state => state.reproducibility?.methodsFormat || 'apa';
export const selectComparisonBundles = state => state.reproducibility?.comparisonBundles || [];
export const selectComparisonResults = state => state.reproducibility?.comparisonResults;
export const selectExportFormat = state => state.reproducibility?.exportFormat || 'json';
export const selectExportOptions = createSelector(
  [state => state.reproducibility],
  (reproducibility) => ({
    includeData: reproducibility?.includeData || false,
    includeCode: reproducibility?.includeCode || true,
    includeResults: reproducibility?.includeResults || true
  })
);
export const selectIsLoading = state => state.reproducibility?.isLoading || false;
export const selectError = state => state.reproducibility?.error;
export const selectActiveTab = state => state.reproducibility?.activeTab || 'overview';

// Derived selectors
export const selectStepCount = createSelector(
  [selectAnalysisSteps],
  (steps) => steps.length
);

export const selectBundleComplete = createSelector(
  [selectAnalysisSteps, selectEnvironment],
  (steps, environment) => steps.length > 0 && environment.timestamp !== null
);

export const {
  createBundle,
  setBundle,
  addAnalysisStep,
  updateAnalysisStep,
  removeAnalysisStep,
  addDataSnapshot,
  addCodeBlock,
  startRecording,
  stopRecording,
  addRecordingEvent,
  setEnvironmentInfo,
  captureEnvironment,
  saveBundle,
  loadBundle,
  deleteBundle,
  setMethodsSection,
  setMethodsFormat,
  setComparisonBundles,
  setComparisonResults,
  setExportFormat,
  setExportOptions,
  setActiveTab,
  setLoading,
  setError,
  clearError,
  resetState
} = reproducibilitySlice.actions;

export default reproducibilitySlice.reducer;
