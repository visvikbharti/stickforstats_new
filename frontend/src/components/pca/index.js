// This file dynamically exports either the full PcaVisualization with 3D support
// or a fallback version without Three.js dependencies based on the environment variable

// Use dynamic imports to ensure Three.js is not imported when disabled
let PcaVisualization;

// Check if 3D is disabled
if (process.env.REACT_APP_DISABLE_3D === 'true') {
  // Use require for server-side rendering compatibility
  PcaVisualization = require('./fallback/FallbackPcaVisualization').default;
} else {
  try {
    // Try to use the real visualization with 3D support
    PcaVisualization = require('./PcaVisualization').default;
  } catch (error) {
    console.warn('Error loading 3D visualization, falling back to 2D only:', error);
    PcaVisualization = require('./fallback/FallbackPcaVisualization').default;
  }
}

export default PcaVisualization;