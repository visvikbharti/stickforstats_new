/**
 * Redux Store Configuration
 * =========================
 * Central state management for StickForStats
 */

import { configureStore } from '@reduxjs/toolkit';
import testRecommenderReducer from './slices/testRecommenderSlice';
import multiplicityCorrectionReducer from './slices/multiplicityCorrectionSlice';
import powerAnalysisReducer from './slices/powerAnalysisSlice';
import effectSizeReducer from './slices/effectSizeSlice';
import reproducibilityReducer from './slices/reproducibilitySlice';

// Create the Redux store
export const store = configureStore({
  reducer: {
    testRecommender: testRecommenderReducer,
    multiplicityCorrection: multiplicityCorrectionReducer,
    powerAnalysis: powerAnalysisReducer,
    effectSize: effectSizeReducer,
    reproducibility: reproducibilityReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types
        ignoredActions: [
          'testRecommender/uploadData/pending',
          'testRecommender/uploadData/fulfilled',
        ],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.file', 'payload.onProgress'],
        // Ignore these paths in the state
        ignoredPaths: ['testRecommender.uploadProgress'],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export default store;