import React, { useState, useEffect } from 'react';
import { trackComponentRender } from './performanceMonitoring';

/**
 * Higher-Order Component that tracks the render performance of components
 * 
 * @param {React.ComponentType} Component - The component to wrap
 * @param {Object} options - Configuration options
 * @param {string} options.name - Name to use for tracking (defaults to displayName or component name)
 * @param {boolean} options.trackProps - Whether to include props in tracking data
 * @param {boolean} options.trackUpdates - Whether to track re-renders
 * @returns {React.ComponentType} - Enhanced component with performance tracking
 */
const withPerformanceTracking = (Component, options = {}) => {
  // Get component name
  const componentName = options.name || Component.displayName || Component.name || 'UnknownComponent';
  
  // Create wrapped component
  const WrappedComponent = (props) => {
    // Store render start time
    const [renderStart] = useState(performance.now());
    const [renderCount, setRenderCount] = useState(0);
    
    // Track initial render
    useEffect(() => {
      const renderTime = performance.now() - renderStart;
      
      // Track component render
      trackComponentRender(
        componentName,
        renderTime,
        options.trackProps ? props : undefined
      );
      
      // Update render count
      setRenderCount(1);
    }, []);
    
    // Track updates if enabled
    useEffect(() => {
      if (!options.trackUpdates || renderCount === 0) return;
      
      const updateRenderTime = performance.now() - renderStart;
      
      // Track component update
      trackComponentRender(
        `${componentName}:update`,
        updateRenderTime,
        options.trackProps ? props : undefined
      );
      
      // Update render count
      setRenderCount(count => count + 1);
    }, [props]);
    
    return <Component {...props} />;
  };
  
  // Set display name for dev tools
  WrappedComponent.displayName = `WithPerformanceTracking(${componentName})`;
  
  return WrappedComponent;
};

export default withPerformanceTracking;