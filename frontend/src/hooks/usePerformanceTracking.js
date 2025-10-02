/**
 * Custom hook for tracking component performance
 * 
 * This hook provides utilities to measure and report component render times,
 * interaction timings, and other performance metrics.
 */
import { useRef, useEffect, useCallback } from 'react';
import { 
  trackComponentRender, 
  trackInteraction, 
  addCustomMark 
} from '../utils/performanceMonitoring';

/**
 * Hook for tracking component performance
 * @param {string} componentName - Name of the component for tracking
 * @param {Object} options - Configuration options
 * @returns {Object} Performance tracking utilities
 */
export default function usePerformanceTracking(componentName, options = {}) {
  // Store render start time
  const renderStartTime = useRef(performance.now());
  const lastRenderTime = useRef(0);
  const renderCount = useRef(0);
  
  // Track initial render
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    lastRenderTime.current = renderTime;
    renderCount.current += 1;
    
    // Only track if the render took a meaningful amount of time
    if (renderTime > 1) {
      trackComponentRender(componentName, renderTime, options.trackProps ? options.props : null);
    }
    
    // Add custom mark for initial render
    addCustomMark(`${componentName}:initialRender`, renderTime);
    
    // Track subsequent renders
    return () => {
      const unmountTime = performance.now();
      addCustomMark(`${componentName}:unmount`, {
        timeInDOM: unmountTime - renderStartTime.current,
        renderCount: renderCount.current
      });
    };
  }, [componentName, options.trackProps, options.props]);
  
  // Re-measure on dependency changes
  useEffect(() => {
    // Skip first render - already tracked in initial effect
    if (renderCount.current === 1) return;
    
    const reRenderTime = performance.now() - renderStartTime.current;
    lastRenderTime.current = reRenderTime;
    renderCount.current += 1;
    
    // Only track if the render took a meaningful amount of time
    if (reRenderTime > 1) {
      trackComponentRender(componentName, reRenderTime, options.trackProps ? options.props : null);
    }
    
    // Reset render start time for next render
    renderStartTime.current = performance.now();
  }, [componentName, options.dependencies, options.trackProps, options.props]);
  
  /**
   * Track a user interaction within this component
   * @param {string} name - Name/type of the interaction
   * @param {Function} callback - Function to call for the interaction
   * @returns {Function} Wrapped callback that tracks performance
   */
  const trackAction = useCallback((name, callback) => {
    return (...args) => {
      const startTime = performance.now();
      
      // Add beginning marker
      addCustomMark(`${componentName}:${name}:start`, startTime);
      
      try {
        // Execute the callback
        const result = callback(...args);
        
        // Handle Promises
        if (result instanceof Promise) {
          return result.then(value => {
            const duration = performance.now() - startTime;
            
            // Track the complete interaction
            trackInteraction({
              component: componentName,
              name,
              duration,
              success: true
            });
            
            // Add completion marker
            addCustomMark(`${componentName}:${name}:end`, {
              duration,
              success: true
            });
            
            return value;
          }).catch(error => {
            const duration = performance.now() - startTime;
            
            // Track the failed interaction
            trackInteraction({
              component: componentName,
              name,
              duration,
              success: false,
              error: error.message
            });
            
            // Add error marker
            addCustomMark(`${componentName}:${name}:error`, {
              duration,
              error: error.message
            });
            
            throw error;
          });
        }
        
        // Handle synchronous functions
        const duration = performance.now() - startTime;
        
        // Track the interaction
        trackInteraction({
          component: componentName,
          name,
          duration,
          success: true
        });
        
        // Add completion marker
        addCustomMark(`${componentName}:${name}:end`, {
          duration,
          success: true
        });
        
        return result;
      } catch (error) {
        // Handle synchronous errors
        const duration = performance.now() - startTime;
        
        // Track the failed interaction
        trackInteraction({
          component: componentName,
          name,
          duration,
          success: false,
          error: error.message
        });
        
        // Add error marker
        addCustomMark(`${componentName}:${name}:error`, {
          duration,
          error: error.message
        });
        
        throw error;
      }
    };
  }, [componentName]);
  
  /**
   * Mark a custom performance event
   * @param {string} name - Name of the mark
   * @param {any} value - Value to associate with the mark
   */
  const mark = useCallback((name, value) => {
    addCustomMark(`${componentName}:${name}`, value);
  }, [componentName]);
  
  /**
   * Measure time between two points
   * @param {string} name - Name of the measurement
   * @returns {Object} Timing utilities
   */
  const measure = useCallback((name) => {
    const startTime = performance.now();
    
    return {
      start: () => {
        // Reset start time
        startTime = performance.now();
        addCustomMark(`${componentName}:${name}:start`, startTime);
      },
      
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        addCustomMark(`${componentName}:${name}:end`, {
          start: startTime,
          end: endTime,
          duration
        });
        
        return duration;
      }
    };
  }, [componentName]);
  
  return {
    trackAction,
    mark,
    measure,
    getLastRenderTime: () => lastRenderTime.current,
    getRenderCount: () => renderCount.current
  };
}