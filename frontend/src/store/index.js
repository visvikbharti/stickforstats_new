/**
 * Redux Store Configuration
 * =========================
 * Central state management for StickForStats
 */

import { configureStore } from '@reduxjs/toolkit';
import testRecommenderReducer from './slices/testRecommenderSlice';

// Create the Redux store
export const store = configureStore({
  reducer: {
    testRecommender: testRecommenderReducer,
    // Add other reducers here as we integrate more modules
    // multiplicity: multiplicityReducer,
    // powerAnalysis: powerAnalysisReducer,
    // effectSizes: effectSizesReducer,
    // reproducibility: reproducibilityReducer,
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