import React, { Suspense, lazy } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

// Lazy load the main page component
const ProbabilityDistributionsPage = lazy(() => import('./ProbabilityDistributionsPage'));

/**
 * Loading component shown while the module is being loaded
 */
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '50vh',
      p: 4 
    }}
  >
    <CircularProgress size={60} thickness={4} />
    <Typography variant="h6" sx={{ mt: 2 }}>
      Loading Probability Distributions Module...
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
      This module provides interactive tools for visualizing and working with probability distributions.
    </Typography>
  </Box>
);

/**
 * Lazy-loaded wrapper for the ProbabilityDistributionsPage
 * This component handles the loading state and error boundaries
 */
const LazyProbabilityDistributionsPage = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ProbabilityDistributionsPage />
    </Suspense>
  );
};

export default LazyProbabilityDistributionsPage;