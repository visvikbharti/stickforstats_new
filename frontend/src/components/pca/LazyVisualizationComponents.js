/**
 * Lazy-loaded visualization components for PCA
 * This module dynamically imports visualization components when needed
 */
import React, { lazy } from 'react';

// Load the 2D scatter plot component only when used
export const ScatterPlot2D = lazy(() => 
  import('./visualizations/ScatterPlot2D')
);

// Load the 3D scatter plot component only when used and when 3D is enabled
export const ScatterPlot3D = lazy(() => {
  if (process.env.REACT_APP_DISABLE_3D === 'true') {
    // Return a stub component if 3D is disabled
    return Promise.resolve({
      default: ({ data, ...props }) => (
        <div style={{ padding: 16, textAlign: 'center' }}>
          3D visualization is disabled in this build
        </div>
      )
    });
  }
  return import('./visualizations/ScatterPlot3D');
});

// Lazy load other visualization components
export const LoadingPlot = lazy(() =>
  import('./visualizations/LoadingPlot')
);

export const GeneContributionPlot = lazy(() =>
  import('./visualizations/GeneContributionPlot')
);

export const ScreePlot = lazy(() =>
  import('./visualizations/ScreePlot')
);

// Load the PlotContainer component only when used
export const PlotContainer = lazy(() =>
  import('./visualizations/PlotContainer')
);