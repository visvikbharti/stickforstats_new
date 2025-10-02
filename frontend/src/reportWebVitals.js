// Web Vitals Reporting - Performance monitoring for production applications
// Measures and reports Core Web Vitals and other performance metrics

const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      // Core Web Vitals
      getCLS(onPerfEntry); // Cumulative Layout Shift
      getFID(onPerfEntry); // First Input Delay
      getLCP(onPerfEntry); // Largest Contentful Paint
      
      // Additional metrics
      getFCP(onPerfEntry); // First Contentful Paint
      getTTFB(onPerfEntry); // Time to First Byte
    }).catch((error) => {
      console.warn('Web Vitals library not available:', error);
      
      // Fallback performance monitoring using Performance API
      if (window.performance && window.performance.getEntriesByType) {
        const navigationEntries = window.performance.getEntriesByType('navigation');
        const paintEntries = window.performance.getEntriesByType('paint');
        
        if (navigationEntries.length > 0) {
          const nav = navigationEntries[0];
          
          // Report basic timing metrics
          onPerfEntry({
            name: 'DOM-Content-Loaded',
            value: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
            id: 'dom-content-loaded'
          });
          
          onPerfEntry({
            name: 'Load-Complete',
            value: nav.loadEventEnd - nav.loadEventStart,
            id: 'load-complete'
          });
        }
        
        if (paintEntries.length > 0) {
          paintEntries.forEach(entry => {
            onPerfEntry({
              name: entry.name,
              value: entry.startTime,
              id: entry.name.toLowerCase().replace(/\s+/g, '-')
            });
          });
        }
      }
    });
  }
};

// Default performance entry handler for production monitoring
export const defaultPerfHandler = (metric) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('Performance Metric:', metric);
  }
  
  // Send to analytics service in production
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics 4
    if (typeof window !== 'undefined' && typeof window.gtag !== 'undefined') {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        metric_id: metric.id,
        metric_value: metric.value,
        metric_delta: metric.delta,
        custom_parameter_1: window.location.pathname,
      });
    }
    
    // Example: Send to custom analytics endpoint
    if (window.analyticsEndpoint) {
      fetch(window.analyticsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'web_vitals',
          metric: metric.name,
          value: metric.value,
          id: metric.id,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      }).catch(error => {
        console.warn('Failed to send performance metric:', error);
      });
    }
  }
};

// Enhanced performance monitoring with additional metrics
export const reportEnhancedWebVitals = (onPerfEntry = defaultPerfHandler) => {
  // Report standard web vitals
  reportWebVitals(onPerfEntry);
  
  // Additional custom metrics
  if (window.performance) {
    // Memory usage (if available)
    if (window.performance.memory) {
      onPerfEntry({
        name: 'Memory-Usage',
        value: window.performance.memory.usedJSHeapSize,
        id: 'memory-usage',
        unit: 'bytes'
      });
    }
    
    // Connection information
    if (navigator.connection) {
      onPerfEntry({
        name: 'Connection-Type',
        value: navigator.connection.effectiveType || 'unknown',
        id: 'connection-type',
        unit: 'type'
      });
      
      if (navigator.connection.downlink) {
        onPerfEntry({
          name: 'Connection-Speed',
          value: navigator.connection.downlink,
          id: 'connection-speed',
          unit: 'mbps'
        });
      }
    }
    
    // Device information
    onPerfEntry({
      name: 'Hardware-Concurrency',
      value: navigator.hardwareConcurrency || 1,
      id: 'hardware-concurrency',
      unit: 'cores'
    });
  }
  
  // React-specific performance monitoring
  if (window.React && window.React.Profiler) {
    // This would be set up in the React component tree
    console.log('React Profiler available for detailed component performance monitoring');
  }
};

// Performance observer for custom metrics
export const observeCustomMetrics = (onMetric = defaultPerfHandler) => {
  if ('PerformanceObserver' in window) {
    try {
      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          onMetric({
            name: 'Long-Task',
            value: entry.duration,
            id: 'long-task',
            startTime: entry.startTime,
            unit: 'ms'
          });
        });
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      
      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          onMetric({
            name: 'LCP-Element',
            value: entry.startTime,
            id: 'lcp-element',
            element: entry.element?.tagName || 'unknown',
            unit: 'ms'
          });
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      
      // Observe layout shifts
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (!entry.hadRecentInput) {
            onMetric({
              name: 'Layout-Shift',
              value: entry.value,
              id: 'layout-shift',
              sources: entry.sources?.length || 0,
              unit: 'score'
            });
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      
    } catch (error) {
      console.warn('Performance Observer not fully supported:', error);
    }
  }
};

export default reportWebVitals;