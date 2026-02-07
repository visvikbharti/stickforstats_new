/**
 * Effect Size Redux Slice
 * =======================
 * State management for effect size calculations and conversions
 */

import { createSlice, createSelector } from '@reduxjs/toolkit';

const initialState = {
  // Input mode
  inputMode: 'statistics', // 'statistics', 'rawData', 'testResult'

  // Test type for context
  testType: 'independent_t',

  // Statistics input
  statistics: {
    mean1: null,
    mean2: null,
    sd1: null,
    sd2: null,
    sdPooled: null,
    n1: null,
    n2: null,
    tValue: null,
    fValue: null,
    rValue: null,
    chiSquare: null,
    dfNum: null,
    dfDenom: null
  },

  // Calculated effect sizes
  effectSizes: {
    cohensD: null,
    hedgesG: null,
    glasssDelta: null,
    etaSquared: null,
    omegaSquared: null,
    partialEtaSquared: null,
    rSquared: null,
    cramersV: null,
    oddsRatio: null,
    riskRatio: null,
    phi: null,
    cliff: null,
    commonLanguage: null
  },

  // Confidence intervals
  confidenceLevel: 0.95,
  confidenceIntervals: {},

  // Interpretations
  interpretations: {},

  // Conversion target
  conversionTarget: null,
  conversionResult: null,

  // History
  calculationHistory: [],

  // UI state
  showFormulas: false,
  showInterpretation: true,
  isCalculating: false,
  error: null
};

const effectSizeSlice = createSlice({
  name: 'effectSize',
  initialState,
  reducers: {
    setInputMode: (state, action) => {
      state.inputMode = action.payload;
    },

    setTestType: (state, action) => {
      state.testType = action.payload;
    },

    setStatistic: (state, action) => {
      const { key, value } = action.payload;
      state.statistics[key] = value;
    },

    setStatistics: (state, action) => {
      state.statistics = { ...state.statistics, ...action.payload };
    },

    setEffectSizes: (state, action) => {
      state.effectSizes = { ...state.effectSizes, ...action.payload };
    },

    setEffectSize: (state, action) => {
      const { key, value } = action.payload;
      state.effectSizes[key] = value;
    },

    setConfidenceLevel: (state, action) => {
      state.confidenceLevel = action.payload;
    },

    setConfidenceIntervals: (state, action) => {
      state.confidenceIntervals = action.payload;
    },

    setInterpretations: (state, action) => {
      state.interpretations = action.payload;
    },

    setConversionTarget: (state, action) => {
      state.conversionTarget = action.payload;
    },

    setConversionResult: (state, action) => {
      state.conversionResult = action.payload;
    },

    addToHistory: (state, action) => {
      state.calculationHistory.push({
        timestamp: new Date().toISOString(),
        ...action.payload
      });
    },

    clearHistory: (state) => {
      state.calculationHistory = [];
    },

    toggleFormulas: (state) => {
      state.showFormulas = !state.showFormulas;
    },

    toggleInterpretation: (state) => {
      state.showInterpretation = !state.showInterpretation;
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

    resetState: () => initialState,

    clearCalculation: (state) => {
      state.effectSizes = initialState.effectSizes;
      state.confidenceIntervals = {};
      state.interpretations = {};
    }
  }
});

// Selectors
export const selectInputMode = state => state.effectSize?.inputMode || 'statistics';
export const selectTestType = state => state.effectSize?.testType || 'independent_t';
export const selectStatistics = state => state.effectSize?.statistics || initialState.statistics;
export const selectEffectSizes = state => state.effectSize?.effectSizes || initialState.effectSizes;
export const selectConfidenceLevel = state => state.effectSize?.confidenceLevel || 0.95;
export const selectConfidenceIntervals = state => state.effectSize?.confidenceIntervals || {};
export const selectInterpretations = state => state.effectSize?.interpretations || {};
export const selectConversionTarget = state => state.effectSize?.conversionTarget;
export const selectConversionResult = state => state.effectSize?.conversionResult;
export const selectCalculationHistory = state => state.effectSize?.calculationHistory || [];
export const selectShowFormulas = state => state.effectSize?.showFormulas || false;
export const selectShowInterpretation = state => state.effectSize?.showInterpretation || true;
export const selectIsCalculating = state => state.effectSize?.isCalculating || false;
export const selectError = state => state.effectSize?.error;

// Derived selectors
export const selectPrimaryEffectSize = createSelector(
  [selectEffectSizes, selectTestType],
  (effectSizes, testType) => {
    switch (testType) {
      case 'independent_t':
      case 'paired_t':
      case 'one_sample_t':
        return { name: "Cohen's d", value: effectSizes.cohensD };
      case 'anova':
      case 'one_way_anova':
        return { name: 'η²', value: effectSizes.etaSquared };
      case 'correlation':
        return { name: 'r', value: effectSizes.rSquared ? Math.sqrt(effectSizes.rSquared) : null };
      case 'chi_square':
        return { name: "Cramér's V", value: effectSizes.cramersV };
      default:
        return { name: "Cohen's d", value: effectSizes.cohensD };
    }
  }
);

export const {
  setInputMode,
  setTestType,
  setStatistic,
  setStatistics,
  setEffectSizes,
  setEffectSize,
  setConfidenceLevel,
  setConfidenceIntervals,
  setInterpretations,
  setConversionTarget,
  setConversionResult,
  addToHistory,
  clearHistory,
  toggleFormulas,
  toggleInterpretation,
  setCalculating,
  setError,
  clearError,
  resetState,
  clearCalculation
} = effectSizeSlice.actions;

export default effectSizeSlice.reducer;
