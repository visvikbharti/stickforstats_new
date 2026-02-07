/**
 * Power Analysis Redux Slice
 * ==========================
 * State management for power analysis calculations
 */

import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  // Calculation type
  calculationType: 'power', // 'power', 'sampleSize', 'effectSize'
  testType: 't_test',

  // Parameters
  parameters: {
    alpha: 0.05,
    power: 0.80,
    effectSize: 0.5,
    sampleSize: 30,
    sampleSize1: 30,
    sampleSize2: 30,
    allocationRatio: 1,
    tails: 2,
    groups: 2,
    correlation: 0.3
  },

  // Results
  result: null,
  calculationHistory: [],

  // Sensitivity analysis
  sensitivityRange: {
    effectSize: { min: 0.2, max: 1.0, step: 0.1 },
    sampleSize: { min: 10, max: 200, step: 10 },
    alpha: { min: 0.01, max: 0.10, step: 0.01 }
  },
  sensitivityResults: [],

  // UI state
  showFormulas: false,
  isCalculating: false,
  error: null
};

const powerAnalysisSlice = createSlice({
  name: 'powerAnalysis',
  initialState,
  reducers: {
    setCalculationType: (state, action) => {
      state.calculationType = action.payload;
    },

    setTestType: (state, action) => {
      state.testType = action.payload;
    },

    setParameter: (state, action) => {
      const { key, value } = action.payload;
      state.parameters[key] = value;
    },

    setParameters: (state, action) => {
      state.parameters = { ...state.parameters, ...action.payload };
    },

    setResult: (state, action) => {
      state.result = action.payload;
      state.calculationHistory.push({
        timestamp: new Date().toISOString(),
        type: state.calculationType,
        testType: state.testType,
        parameters: { ...state.parameters },
        result: action.payload
      });
    },

    clearResult: (state) => {
      state.result = null;
    },

    setSensitivityRange: (state, action) => {
      const { parameter, range } = action.payload;
      state.sensitivityRange[parameter] = range;
    },

    setSensitivityResults: (state, action) => {
      state.sensitivityResults = action.payload;
    },

    toggleFormulas: (state) => {
      state.showFormulas = !state.showFormulas;
    },

    setCalculating: (state, action) => {
      state.isCalculating = action.payload;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },

    clearHistory: (state) => {
      state.calculationHistory = [];
    },

    resetState: () => initialState
  }
});

// Selectors
export const selectCalculationType = state => state.powerAnalysis?.calculationType || 'power';
export const selectTestType = state => state.powerAnalysis?.testType || 't_test';
export const selectParameters = state => state.powerAnalysis?.parameters || initialState.parameters;
export const selectResult = state => state.powerAnalysis?.result;
export const selectCalculationHistory = state => state.powerAnalysis?.calculationHistory || [];
export const selectSensitivityRange = state => state.powerAnalysis?.sensitivityRange || initialState.sensitivityRange;
export const selectSensitivityResults = state => state.powerAnalysis?.sensitivityResults || [];
export const selectShowFormulas = state => state.powerAnalysis?.showFormulas || false;
export const selectIsCalculating = state => state.powerAnalysis?.isCalculating || false;
export const selectError = state => state.powerAnalysis?.error;

// Derived selectors
export const selectLastCalculation = createSelector(
  [selectCalculationHistory],
  (history) => history.length > 0 ? history[history.length - 1] : null
);

export const {
  setCalculationType,
  setTestType,
  setParameter,
  setParameters,
  setResult,
  clearResult,
  setSensitivityRange,
  setSensitivityResults,
  toggleFormulas,
  setCalculating,
  setError,
  clearError,
  clearHistory,
  resetState
} = powerAnalysisSlice.actions;

export default powerAnalysisSlice.reducer;
