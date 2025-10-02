/**
 * Lazy Simulations - Lazy loading strategy for probability distribution simulation components
 * 
 * This module provides lazy-loaded versions of all simulation components,
 * reducing the initial bundle size and improving loading performance.
 */
import React, { lazy, Suspense } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

// Lazy load simulation components
const EmailArrivalsD3 = lazy(() => import('./EmailArrivalsD3'));
const QualityControlD3 = lazy(() => import('./QualityControlD3'));
const ClinicalTrialD3 = lazy(() => import('./ClinicalTrialD3'));
const NetworkTrafficD3 = lazy(() => import('./NetworkTrafficD3'));
const ManufacturingDefectsD3 = lazy(() => import('./ManufacturingDefectsD3'));

/**
 * Loading state component for simulations
 */
const SimulationLoadingFallback = ({ simulationName }) => (
  <Paper
    sx={{
      p: 4,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px'
    }}
  >
    <CircularProgress size={50} sx={{ mb: 2 }} />
    <Typography variant="h6">
      Loading {simulationName || 'Simulation'}...
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center', maxWidth: '80%' }}>
      This simulation demonstrates probability distributions in real-world applications
      with interactive visualizations and educational content.
    </Typography>
  </Paper>
);

/**
 * Creates a lazy-loaded wrapper for a simulation component
 * 
 * @param {React.Component} Component - The simulation component to wrap
 * @param {string} name - Name of the simulation for display in loading state
 * @returns {React.Component} Wrapped component with loading state
 */
const createLazySimulation = (Component, name) => {
  return (props) => (
    <Suspense fallback={<SimulationLoadingFallback simulationName={name} />}>
      <Component {...props} />
    </Suspense>
  );
};

// Create lazy-loaded simulation components
const LazyEmailArrivalsD3 = createLazySimulation(EmailArrivalsD3, 'Email Arrivals Simulation');
const LazyQualityControlD3 = createLazySimulation(QualityControlD3, 'Quality Control Simulation');
const LazyClinicalTrialD3 = createLazySimulation(ClinicalTrialD3, 'Clinical Trial Simulation');
const LazyNetworkTrafficD3 = createLazySimulation(NetworkTrafficD3, 'Network Traffic Simulation');
const LazyManufacturingDefectsD3 = createLazySimulation(ManufacturingDefectsD3, 'Manufacturing Defects Simulation');

/**
 * Get lazy-loaded simulation component by name
 * 
 * @param {string} name - Simulation component name
 * @returns {React.Component} Lazy-loaded simulation component
 */
export const getLazySimulationComponent = (name) => {
  switch (name) {
    case 'EmailArrivals':
      return LazyEmailArrivalsD3;
    case 'QualityControl':
      return LazyQualityControlD3;
    case 'ClinicalTrial':
      return LazyClinicalTrialD3;
    case 'NetworkTraffic':
      return LazyNetworkTrafficD3;
    case 'ManufacturingDefects':
      return LazyManufacturingDefectsD3;
    default:
      return null;
  }
};

// Export individual components
export {
  LazyEmailArrivalsD3,
  LazyQualityControlD3,
  LazyClinicalTrialD3,
  LazyNetworkTrafficD3,
  LazyManufacturingDefectsD3
};

// Default export
export default {
  getLazySimulationComponent,
  LazyEmailArrivalsD3,
  LazyQualityControlD3,
  LazyClinicalTrialD3,
  LazyNetworkTrafficD3,
  LazyManufacturingDefectsD3
};