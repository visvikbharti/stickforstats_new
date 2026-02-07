/**
 * Multiplicity Correction Redux Slice
 * ====================================
 * State management for multiple hypothesis testing correction
 * Prevents p-hacking by tracking all tests in a session
 */

import { createSlice, createSelector } from '@reduxjs/toolkit';

// Initial state
const initialState = {
  // Hypothesis registry
  hypotheses: [],
  hypothesisGroups: {},
  nextHypothesisId: 1,

  // Session tracking
  sessionTests: [],
  sessionStartTime: null,
  sessionId: null,

  // Correction settings
  correctionMethod: 'benjamini_hochberg',
  alphaLevel: 0.05,

  // Corrected results
  correctedPValues: {},
  significanceAfterCorrection: {},

  // Registry settings
  registrySettings: {
    autoLockAfterTest: false,
    requireCategory: true,
    requireJustification: false,
    allowDeletion: false,
    trackModifications: true
  },

  // UI state
  isLoading: false,
  error: null
};

// Slice
const multiplicityCorrectionSlice = createSlice({
  name: 'multiplicityCorrection',
  initialState,
  reducers: {
    // === Hypothesis Management ===

    registerHypothesis: (state, action) => {
      const hypothesis = {
        id: `H${state.nextHypothesisId}`,
        registeredAt: new Date().toISOString(),
        status: 'REGISTERED',
        category: 'exploratory',
        tags: [],
        locked: false,
        ...action.payload
      };
      state.hypotheses.push(hypothesis);
      state.nextHypothesisId += 1;
    },

    updateHypothesis: (state, action) => {
      const { id, updates } = action.payload;
      const index = state.hypotheses.findIndex(h => h.id === id);
      if (index !== -1) {
        state.hypotheses[index] = { ...state.hypotheses[index], ...updates };
      }
    },

    deleteHypothesis: (state, action) => {
      if (state.registrySettings.allowDeletion) {
        state.hypotheses = state.hypotheses.filter(h => h.id !== action.payload);
      }
    },

    lockHypothesis: (state, action) => {
      const index = state.hypotheses.findIndex(h => h.id === action.payload);
      if (index !== -1) {
        state.hypotheses[index].locked = true;
        state.hypotheses[index].lockedAt = new Date().toISOString();
      }
    },

    tagHypothesis: (state, action) => {
      const { id, tag } = action.payload;
      const index = state.hypotheses.findIndex(h => h.id === id);
      if (index !== -1) {
        if (!state.hypotheses[index].tags.includes(tag)) {
          state.hypotheses[index].tags.push(tag);
        }
      }
    },

    groupHypotheses: (state, action) => {
      const { groupName, hypothesisIds } = action.payload;
      state.hypothesisGroups[groupName] = hypothesisIds;
    },

    // === Session Management ===

    startSession: (state) => {
      state.sessionId = `session_${Date.now()}`;
      state.sessionStartTime = new Date().toISOString();
      state.sessionTests = [];
    },

    addSessionTest: (state, action) => {
      const test = {
        id: `T${state.sessionTests.length + 1}`,
        addedAt: new Date().toISOString(),
        corrected: false,
        ...action.payload
      };
      state.sessionTests.push(test);
    },

    // Legacy alias
    addHypothesis: (state, action) => {
      const hypothesis = {
        id: `H${state.nextHypothesisId}`,
        registeredAt: new Date().toISOString(),
        status: 'REGISTERED',
        ...action.payload
      };
      state.hypotheses.push(hypothesis);
      state.nextHypothesisId += 1;
    },

    removeHypothesis: (state, action) => {
      state.hypotheses = state.hypotheses.filter(h => h.id !== action.payload);
    },

    // === Correction Settings ===

    setCorrectionMethod: (state, action) => {
      state.correctionMethod = action.payload;
    },

    setAlphaLevel: (state, action) => {
      state.alphaLevel = action.payload;
    },

    updateRegistrySettings: (state, action) => {
      state.registrySettings = { ...state.registrySettings, ...action.payload };
    },

    // === Apply Corrections ===

    applyCorrection: (state) => {
      const pValues = state.hypotheses
        .filter(h => h.pValue !== undefined)
        .map(h => ({ id: h.id, pValue: h.pValue }));

      if (pValues.length === 0) return;

      const m = pValues.length;
      const alpha = state.alphaLevel;
      const method = state.correctionMethod;

      // Sort by p-value for step procedures
      const sorted = [...pValues].sort((a, b) => a.pValue - b.pValue);

      // Apply correction based on method
      sorted.forEach((item, i) => {
        let adjustedP;
        const rank = i + 1;

        switch (method) {
          case 'bonferroni':
            adjustedP = Math.min(item.pValue * m, 1);
            break;

          case 'holm':
            adjustedP = Math.min(item.pValue * (m - rank + 1), 1);
            break;

          case 'hochberg':
            // Step-up: work backwards
            if (i === m - 1) {
              adjustedP = item.pValue;
            } else {
              const nextP = state.correctedPValues[sorted[i + 1].id] || 1;
              adjustedP = Math.min(item.pValue * (m - rank + 1), nextP);
            }
            break;

          case 'benjamini_hochberg':
            adjustedP = Math.min(item.pValue * m / rank, 1);
            break;

          case 'benjamini_yekutieli':
            const cm = Array.from({ length: m }, (_, j) => 1 / (j + 1)).reduce((a, b) => a + b, 0);
            adjustedP = Math.min(item.pValue * m * cm / rank, 1);
            break;

          default:
            adjustedP = item.pValue;
        }

        state.correctedPValues[item.id] = adjustedP;
        state.significanceAfterCorrection[item.id] = adjustedP < alpha;
      });

      // Enforce monotonicity for step procedures
      if (['holm', 'benjamini_hochberg', 'benjamini_yekutieli'].includes(method)) {
        let maxP = 0;
        sorted.forEach(item => {
          maxP = Math.max(maxP, state.correctedPValues[item.id]);
          state.correctedPValues[item.id] = maxP;
        });
      }
    },

    // === Export ===

    exportRegistry: (state) => {
      // This action triggers a side effect in middleware
      // Returns the current state for export
      state.lastExportTime = new Date().toISOString();
    },

    // === Reset ===

    resetSession: (state) => {
      return initialState;
    },

    setError: (state, action) => {
      state.error = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    }
  }
});

// Selectors
export const selectHypotheses = state => state.multiplicityCorrection?.hypotheses || [];
export const selectAllHypotheses = state => state.multiplicityCorrection?.hypotheses || [];
export const selectHypothesisGroups = state => state.multiplicityCorrection?.hypothesisGroups || {};
export const selectCorrectionMethod = state => state.multiplicityCorrection?.correctionMethod || 'benjamini_hochberg';
export const selectAlphaLevel = state => state.multiplicityCorrection?.alphaLevel || 0.05;
export const selectSessionTests = state => state.multiplicityCorrection?.sessionTests || [];
export const selectRegistrySettings = state => state.multiplicityCorrection?.registrySettings || initialState.registrySettings;
export const selectCorrectedPValues = state => state.multiplicityCorrection?.correctedPValues || {};
export const selectSignificanceAfterCorrection = state => state.multiplicityCorrection?.significanceAfterCorrection || {};

// Derived selectors
export const selectHypothesisCount = createSelector(
  [selectHypotheses],
  (hypotheses) => hypotheses.length
);

export const selectSignificantCount = createSelector(
  [selectSignificanceAfterCorrection],
  (significance) => Object.values(significance).filter(Boolean).length
);

export const selectHypothesesByCategory = createSelector(
  [selectHypotheses],
  (hypotheses) => {
    const byCategory = {};
    hypotheses.forEach(h => {
      const cat = h.category || 'uncategorized';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(h);
    });
    return byCategory;
  }
);

// Export actions
export const {
  registerHypothesis,
  updateHypothesis,
  deleteHypothesis,
  lockHypothesis,
  tagHypothesis,
  groupHypotheses,
  startSession,
  addSessionTest,
  addHypothesis,
  removeHypothesis,
  setCorrectionMethod,
  setAlphaLevel,
  updateRegistrySettings,
  applyCorrection,
  exportRegistry,
  resetSession,
  setError,
  clearError
} = multiplicityCorrectionSlice.actions;

export default multiplicityCorrectionSlice.reducer;
