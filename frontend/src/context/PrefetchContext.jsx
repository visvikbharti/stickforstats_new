import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { 
  initPrefetchManager, 
  prefetch, 
  recordNavigation, 
  getNavigationStats, 
  resetPrefetchManager 
} from '../utils/prefetchManager';

// Create context
const PrefetchContext = createContext({
  prefetch: () => {},
  recordNavigation: () => {},
  getStats: () => ({}),
  stats: {},
  resetPrefetching: () => {},
  isPrefetchingEnabled: true,
  setPrefetchingEnabled: () => {},
  prefetchOptions: {},
  setPrefetchOptions: () => {},
});

// Custom hook to use prefetch context
export const usePrefetch = () => useContext(PrefetchContext);

/**
 * PrefetchProvider Component
 * 
 * Context provider that initializes the prefetch manager and provides
 * prefetching functionality to the app.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.options - Prefetch manager options
 * @param {ReactNode} props.children - Child components
 */
export const PrefetchProvider = ({ children, options = {} }) => {
  // State for prefetching options
  const [prefetchOptions, setPrefetchOptions] = useState(options);
  
  // State for whether prefetching is enabled
  const [isPrefetchingEnabled, setIsPrefetchingEnabled] = useState(true);
  
  // State for prefetching stats
  const [stats, setStats] = useState({});
  
  // Initialize prefetch manager
  useEffect(() => {
    if (isPrefetchingEnabled) {
      initPrefetchManager(prefetchOptions);
    }
  }, [isPrefetchingEnabled, prefetchOptions]);
  
  // Periodically update stats
  useEffect(() => {
    if (!isPrefetchingEnabled) return;
    
    // Update stats immediately
    setStats(getNavigationStats());
    
    // Set up interval to update stats
    const interval = setInterval(() => {
      setStats(getNavigationStats());
    }, 10000); // Update every 10 seconds
    
    // Clean up interval
    return () => clearInterval(interval);
  }, [isPrefetchingEnabled]);
  
  // Prefetch a specific path
  const prefetchPath = useCallback((path) => {
    if (isPrefetchingEnabled && path) {
      prefetch(path);
      // Update stats after prefetch
      setStats(getNavigationStats());
    }
  }, [isPrefetchingEnabled]);
  
  // Record navigation between paths
  const recordPathNavigation = useCallback((fromPath, toPath) => {
    if (isPrefetchingEnabled && fromPath && toPath) {
      recordNavigation(fromPath, toPath);
      // Update stats after recording
      setStats(getNavigationStats());
    }
  }, [isPrefetchingEnabled]);
  
  // Get current navigation stats
  const getStats = useCallback(() => {
    return getNavigationStats();
  }, []);
  
  // Reset prefetching
  const resetPrefetching = useCallback(() => {
    resetPrefetchManager();
    setStats({});
  }, []);
  
  // Update prefetching options
  const updatePrefetchOptions = useCallback((newOptions) => {
    setPrefetchOptions(prev => ({
      ...prev,
      ...newOptions
    }));
  }, []);
  
  // Toggle prefetching
  const togglePrefetching = useCallback((enabled) => {
    setIsPrefetchingEnabled(enabled);
  }, []);
  
  // Context value
  const contextValue = {
    prefetch: prefetchPath,
    recordNavigation: recordPathNavigation,
    getStats,
    stats,
    resetPrefetching,
    isPrefetchingEnabled,
    setPrefetchingEnabled: togglePrefetching,
    prefetchOptions,
    setPrefetchOptions: updatePrefetchOptions,
  };
  
  return (
    <PrefetchContext.Provider value={contextValue}>
      {children}
    </PrefetchContext.Provider>
  );
};

PrefetchProvider.propTypes = {
  children: PropTypes.node.isRequired,
  options: PropTypes.object,
};

export default PrefetchContext;