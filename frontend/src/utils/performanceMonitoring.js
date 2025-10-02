/**
 * Performance Monitoring Utilities
 * 
 * This module provides comprehensive performance monitoring capabilities for the StickForStats app.
 * It includes functions for monitoring Web Vitals, user interactions, component rendering time,
 * and network requests.
 */
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

// Base performance metrics storage
let metricsStorage = {
  webVitals: {
    CLS: null, // Cumulative Layout Shift
    FID: null, // First Input Delay
    FCP: null, // First Contentful Paint
    LCP: null, // Largest Contentful Paint
    TTFB: null, // Time to First Byte
  },
  interactions: [],
  componentRenders: {},
  resources: [],
  customMarks: {},
  navigationTimings: null,
  jsErrors: [],
  apiCalls: []
};

// Options for the monitoring system
const defaultOptions = {
  logToConsole: false,
  sendToAnalytics: false,
  sendToBackend: false,
  samplingRate: 1.0, // 1.0 = 100% of sessions are tracked
  backendEndpoint: '/api/performance',
  includeResourceDetails: true,
  storageLimit: {
    interactions: 50,
    componentRenders: 30,
    resources: 100,
    jsErrors: 10,
    apiCalls: 50,
  }
};

let currentOptions = { ...defaultOptions };

/**
 * Initialize the performance monitoring system
 * @param {Object} options - Configuration options
 */
export function initPerformanceMonitoring(options = {}) {
  // Merge provided options with defaults
  currentOptions = { ...defaultOptions, ...options };
  
  // Only run if browser supports the Performance API
  if (typeof window !== 'undefined' && 'performance' in window) {
    // Start monitoring web vitals
    monitorWebVitals();
    
    // Set up performance observers
    setupPerformanceObservers();
    
    // Capture navigation timing
    captureNavigationTiming();
    
    // Set up resource timing collection
    monitorResourceTiming();
    
    // Monitor JS errors
    monitorJsErrors();
    
    // Monitor fetch/XHR calls
    monitorApiCalls();
    
    // Should we log that monitoring is active?
    if (currentOptions.logToConsole) {
      console.info('Performance monitoring initialized', currentOptions);
    }
  } else if (currentOptions.logToConsole) {
    console.warn('Performance API not supported in this browser. Monitoring disabled.');
  }
}

/**
 * Monitor Web Vitals metrics
 */
function monitorWebVitals() {
  // Sampling - only monitor a percentage of sessions
  if (Math.random() > currentOptions.samplingRate) return;
  
  const handleMetric = (metric) => {
    // Store the metric
    metricsStorage.webVitals[metric.name] = metric.value;
    
    // Log to console if enabled
    if (currentOptions.logToConsole) {
      console.info(`Web Vital: ${metric.name}`, metric);
    }
    
    // Send to analytics if enabled
    if (currentOptions.sendToAnalytics && window.gtag) {
      window.gtag('event', 'web_vitals', {
        event_category: 'Web Vitals',
        event_label: metric.name,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }
    
    // Send to backend if enabled
    if (currentOptions.sendToBackend) {
      sendMetricsToBackend({
        type: 'web_vital',
        name: metric.name,
        value: metric.value,
        id: metric.id
      });
    }
  };

  // Collect all vitals
  getCLS(handleMetric);
  getFID(handleMetric);
  getFCP(handleMetric);
  getLCP(handleMetric);
  getTTFB(handleMetric);
}

/**
 * Set up Performance Observers for various metrics
 */
function setupPerformanceObservers() {
  // Only run in supported browsers
  if (!('PerformanceObserver' in window)) return;

  try {
    // Long Task observer
    if ('LongTaskObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (currentOptions.logToConsole) {
            console.warn('Long task detected:', entry.duration, 'ms', entry);
          }
          
          // Add to interactions with type 'long-task'
          addInteraction({
            type: 'long-task',
            duration: entry.duration,
            startTime: entry.startTime,
            detail: currentOptions.includeResourceDetails ? entry : null
          });
        });
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    }

    // Paint timing observer
    const paintObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.name === 'first-paint' || entry.name === 'first-contentful-paint') {
          if (currentOptions.logToConsole) {
            console.info(`Paint timing: ${entry.name}`, entry.startTime);
          }
          
          addCustomMark(entry.name, entry.startTime);
        }
      });
    });
    
    paintObserver.observe({ entryTypes: ['paint'] });
    
    // Layout shift observer
    if ('LayoutShift' in window) {
      let cumulativeLayoutShift = 0;
      
      const layoutShiftObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          // Only count layout shifts without recent user input
          if (!entry.hadRecentInput) {
            cumulativeLayoutShift += entry.value;
            
            if (currentOptions.logToConsole && entry.value > 0.05) {
              console.warn('Significant layout shift:', entry.value, entry);
            }
            
            // Report significant layout shifts
            if (entry.value > 0.05) {
              addInteraction({
                type: 'layout-shift',
                value: entry.value,
                startTime: entry.startTime,
                detail: currentOptions.includeResourceDetails ? entry.sources : null
              });
            }
          }
        });
      });
      
      layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    }
  } catch (e) {
    if (currentOptions.logToConsole) {
      console.error('Error setting up performance observers:', e);
    }
  }
}

/**
 * Capture navigation timing metrics
 */
function captureNavigationTiming() {
  if (window.performance && window.performance.timing) {
    // Use newer Navigation Timing API Level 2 if available
    if (window.performance.getEntriesByType && window.performance.getEntriesByType('navigation').length) {
      const navTiming = window.performance.getEntriesByType('navigation')[0];
      
      metricsStorage.navigationTimings = {
        dnsLookup: navTiming.domainLookupEnd - navTiming.domainLookupStart,
        tcpConnect: navTiming.connectEnd - navTiming.connectStart,
        requestStart: navTiming.requestStart,
        responseStart: navTiming.responseStart,
        responseEnd: navTiming.responseEnd,
        domInteractive: navTiming.domInteractive,
        domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
        domComplete: navTiming.domComplete,
        loadEvent: navTiming.loadEventEnd - navTiming.loadEventStart,
        firstByte: navTiming.responseStart - navTiming.requestStart,
        pageLoad: navTiming.loadEventEnd - navTiming.startTime,
        redirectTime: navTiming.redirectEnd - navTiming.redirectStart,
        navType: navTiming.type
      };
    } else {
      // Fallback to older Navigation Timing API
      const timing = window.performance.timing;
      
      metricsStorage.navigationTimings = {
        dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
        tcpConnect: timing.connectEnd - timing.connectStart,
        requestStart: timing.requestStart,
        responseStart: timing.responseStart,
        responseEnd: timing.responseEnd,
        domInteractive: timing.domInteractive,
        domContentLoaded: timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart,
        domComplete: timing.domComplete,
        loadEvent: timing.loadEventEnd - timing.loadEventStart,
        firstByte: timing.responseStart - timing.requestStart,
        pageLoad: timing.loadEventEnd - timing.navigationStart,
        redirectTime: timing.redirectEnd - timing.redirectStart,
      };
    }
    
    // Log if enabled
    if (currentOptions.logToConsole) {
      console.info('Navigation timing:', metricsStorage.navigationTimings);
    }
    
    // Send to backend if enabled
    if (currentOptions.sendToBackend) {
      sendMetricsToBackend({
        type: 'navigation',
        metrics: metricsStorage.navigationTimings
      });
    }
  }
}

/**
 * Monitor resource timing (scripts, stylesheets, images, etc.)
 */
function monitorResourceTiming() {
  if (window.performance && window.performance.getEntriesByType) {
    // Get initial resources
    collectResourceTimings();
    
    // Set up observer for future resources
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        collectResourceTimings(list.getEntries());
      });
      
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (e) {
      if (currentOptions.logToConsole) {
        console.error('Error setting up resource timing observer:', e);
      }
    }
  }
}

/**
 * Collect resource timing data
 * @param {Array} entries - Performance entries to collect (optional)
 */
function collectResourceTimings(entries) {
  const resources = entries || window.performance.getEntriesByType('resource');
  
  resources.forEach(resource => {
    // Skip Data URLs and internal performance markers
    if (resource.name.startsWith('data:') || resource.name.includes('chrome-extension://')) {
      return;
    }
    
    // Create a simplified resource entry
    const resourceEntry = {
      name: resource.name,
      type: resource.initiatorType,
      startTime: resource.startTime,
      duration: resource.duration,
      transferSize: resource.transferSize || 0,
      mimeType: resource.name.split('?')[0].split('.').pop(), // best guess at mime type
    };
    
    // Add full resource details if enabled
    if (currentOptions.includeResourceDetails) {
      resourceEntry.detail = {
        fetchStart: resource.fetchStart,
        domainLookupStart: resource.domainLookupStart,
        domainLookupEnd: resource.domainLookupEnd,
        connectStart: resource.connectStart,
        connectEnd: resource.connectEnd,
        requestStart: resource.requestStart,
        responseStart: resource.responseStart,
        responseEnd: resource.responseEnd,
        decodedBodySize: resource.decodedBodySize,
        encodedBodySize: resource.encodedBodySize
      };
    }
    
    // Apply storage limits
    if (metricsStorage.resources.length >= currentOptions.storageLimit.resources) {
      metricsStorage.resources.shift(); // Remove oldest entry
    }
    
    // Add to storage
    metricsStorage.resources.push(resourceEntry);
    
    // Log slow resources
    if (currentOptions.logToConsole && resource.duration > 500) {
      console.warn(`Slow resource load: ${resource.name} (${Math.round(resource.duration)}ms)`);
    }
  });
}

/**
 * Monitor JavaScript errors
 */
function monitorJsErrors() {
  if (typeof window !== 'undefined') {
    const originalOnError = window.onerror;
    
    window.onerror = function(message, source, line, column, error) {
      // Call original handler if it exists
      if (typeof originalOnError === 'function') {
        originalOnError.apply(this, arguments);
      }
      
      // Create error entry
      const errorEntry = {
        message,
        source,
        line,
        column,
        stack: error && error.stack ? error.stack : null,
        timestamp: Date.now()
      };
      
      // Apply storage limits
      if (metricsStorage.jsErrors.length >= currentOptions.storageLimit.jsErrors) {
        metricsStorage.jsErrors.shift(); // Remove oldest entry
      }
      
      // Add to storage
      metricsStorage.jsErrors.push(errorEntry);
      
      // Log if enabled
      if (currentOptions.logToConsole) {
        console.error('Caught error:', errorEntry);
      }
      
      // Send to backend if enabled
      if (currentOptions.sendToBackend) {
        sendMetricsToBackend({
          type: 'error',
          error: errorEntry
        });
      }
    };
    
    // Also capture unhandled promise rejections
    window.addEventListener('unhandledrejection', function(event) {
      const errorEntry = {
        message: event.reason ? (event.reason.message || 'Unhandled Promise rejection') : 'Unhandled Promise rejection',
        stack: event.reason && event.reason.stack ? event.reason.stack : null,
        timestamp: Date.now()
      };
      
      // Apply storage limits
      if (metricsStorage.jsErrors.length >= currentOptions.storageLimit.jsErrors) {
        metricsStorage.jsErrors.shift(); // Remove oldest entry
      }
      
      // Add to storage
      metricsStorage.jsErrors.push(errorEntry);
      
      // Log if enabled
      if (currentOptions.logToConsole) {
        console.error('Unhandled promise rejection:', errorEntry);
      }
      
      // Send to backend if enabled
      if (currentOptions.sendToBackend) {
        sendMetricsToBackend({
          type: 'error',
          error: errorEntry,
          isPromiseRejection: true
        });
      }
    });
  }
}

/**
 * Monitor API calls (fetch and XMLHttpRequest)
 */
function monitorApiCalls() {
  // Monitor Fetch API
  if (typeof window !== 'undefined' && window.fetch) {
    const originalFetch = window.fetch;
    
    window.fetch = function(...args) {
      const startTime = performance.now();
      const url = args[0] instanceof Request ? args[0].url : args[0];
      
      // Track request start
      const trackingInfo = {
        url,
        method: args[1]?.method || 'GET',
        startTime,
        endTime: null,
        duration: null,
        status: null,
        success: null
      };
      
      return originalFetch.apply(this, args)
        .then(response => {
          // Track response details
          const endTime = performance.now();
          trackingInfo.endTime = endTime;
          trackingInfo.duration = endTime - startTime;
          trackingInfo.status = response.status;
          trackingInfo.success = response.ok;
          
          // Apply storage limits
          if (metricsStorage.apiCalls.length >= currentOptions.storageLimit.apiCalls) {
            metricsStorage.apiCalls.shift(); // Remove oldest entry
          }
          
          // Add to storage
          metricsStorage.apiCalls.push(trackingInfo);
          
          // Log slow API calls
          if (currentOptions.logToConsole && trackingInfo.duration > 1000) {
            console.warn(`Slow API call: ${url} (${Math.round(trackingInfo.duration)}ms)`);
          }
          
          return response;
        })
        .catch(error => {
          // Track error details
          const endTime = performance.now();
          trackingInfo.endTime = endTime;
          trackingInfo.duration = endTime - startTime;
          trackingInfo.success = false;
          trackingInfo.error = error.message;
          
          // Apply storage limits
          if (metricsStorage.apiCalls.length >= currentOptions.storageLimit.apiCalls) {
            metricsStorage.apiCalls.shift(); // Remove oldest entry
          }
          
          // Add to storage
          metricsStorage.apiCalls.push(trackingInfo);
          
          // Log error
          if (currentOptions.logToConsole) {
            console.error(`API call error: ${url}`, error);
          }
          
          throw error;
        });
    };
  }
  
  // Monitor XMLHttpRequest
  if (typeof window !== 'undefined' && window.XMLHttpRequest) {
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(method, url) {
      this._perfTracking = {
        method,
        url,
        startTime: null
      };
      return originalOpen.apply(this, arguments);
    };
    
    XMLHttpRequest.prototype.send = function() {
      const xhr = this;
      const startTime = performance.now();
      
      this._perfTracking.startTime = startTime;
      
      // Add listeners to track timing
      this.addEventListener('load', function() {
        const endTime = performance.now();
        const trackingInfo = {
          ...xhr._perfTracking,
          endTime,
          duration: endTime - startTime,
          status: xhr.status,
          success: xhr.status >= 200 && xhr.status < 300
        };
        
        // Apply storage limits
        if (metricsStorage.apiCalls.length >= currentOptions.storageLimit.apiCalls) {
          metricsStorage.apiCalls.shift(); // Remove oldest entry
        }
        
        // Add to storage
        metricsStorage.apiCalls.push(trackingInfo);
        
        // Log slow API calls
        if (currentOptions.logToConsole && trackingInfo.duration > 1000) {
          console.warn(`Slow XHR call: ${trackingInfo.url} (${Math.round(trackingInfo.duration)}ms)`);
        }
      });
      
      this.addEventListener('error', function() {
        const endTime = performance.now();
        const trackingInfo = {
          ...xhr._perfTracking,
          endTime,
          duration: endTime - startTime,
          success: false,
          error: 'Network error'
        };
        
        // Apply storage limits
        if (metricsStorage.apiCalls.length >= currentOptions.storageLimit.apiCalls) {
          metricsStorage.apiCalls.shift(); // Remove oldest entry
        }
        
        // Add to storage
        metricsStorage.apiCalls.push(trackingInfo);
        
        // Log error
        if (currentOptions.logToConsole) {
          console.error(`XHR error: ${trackingInfo.url}`);
        }
      });
      
      this.addEventListener('timeout', function() {
        const endTime = performance.now();
        const trackingInfo = {
          ...xhr._perfTracking,
          endTime,
          duration: endTime - startTime,
          success: false,
          error: 'Timeout'
        };
        
        // Apply storage limits
        if (metricsStorage.apiCalls.length >= currentOptions.storageLimit.apiCalls) {
          metricsStorage.apiCalls.shift(); // Remove oldest entry
        }
        
        // Add to storage
        metricsStorage.apiCalls.push(trackingInfo);
        
        // Log timeout
        if (currentOptions.logToConsole) {
          console.error(`XHR timeout: ${trackingInfo.url}`);
        }
      });
      
      return originalSend.apply(this, arguments);
    };
  }
}

/**
 * Track user interaction timing
 * @param {Object} interactionData - Details about the interaction
 */
export function trackInteraction(interactionData) {
  const interaction = {
    ...interactionData,
    timestamp: Date.now()
  };
  
  // Apply storage limits
  if (metricsStorage.interactions.length >= currentOptions.storageLimit.interactions) {
    metricsStorage.interactions.shift(); // Remove oldest entry
  }
  
  // Add to storage
  addInteraction(interaction);
  
  // Send to backend if enabled
  if (currentOptions.sendToBackend) {
    sendMetricsToBackend({
      type: 'interaction',
      interaction
    });
  }
  
  return interaction;
}

/**
 * Add an interaction to the metrics storage
 * @param {Object} interaction - The interaction data
 */
function addInteraction(interaction) {
  metricsStorage.interactions.push(interaction);
  
  // Keep interaction array within limits
  if (metricsStorage.interactions.length > currentOptions.storageLimit.interactions) {
    metricsStorage.interactions.shift();
  }
}

/**
 * Track component render timing
 * @param {string} componentName - Name of the component
 * @param {number} renderTime - Time taken to render (ms)
 * @param {Object} props - Component props (optional)
 */
export function trackComponentRender(componentName, renderTime, props = null) {
  if (!metricsStorage.componentRenders[componentName]) {
    metricsStorage.componentRenders[componentName] = {
      count: 0,
      totalTime: 0,
      averageTime: 0,
      maxTime: 0,
      lastRender: null
    };
  }
  
  const component = metricsStorage.componentRenders[componentName];
  
  // Update stats
  component.count += 1;
  component.totalTime += renderTime;
  component.averageTime = component.totalTime / component.count;
  component.maxTime = Math.max(component.maxTime, renderTime);
  component.lastRender = {
    time: renderTime,
    timestamp: Date.now(),
    props: props && currentOptions.includeResourceDetails ? props : null
  };
  
  // Log to console if enabled and render time is significant
  if (currentOptions.logToConsole && renderTime > 16) { // 16ms = 60fps threshold
    console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms to render`);
  }
  
  // Send to backend if enabled
  if (currentOptions.sendToBackend) {
    sendMetricsToBackend({
      type: 'component_render',
      componentName,
      renderTime,
      props: props && currentOptions.includeResourceDetails ? props : null
    });
  }
}

/**
 * Add a custom performance mark
 * @param {string} name - Name of the mark
 * @param {any} value - Value to store
 */
export function addCustomMark(name, value) {
  metricsStorage.customMarks[name] = {
    value,
    timestamp: Date.now()
  };
  
  // Log to console if enabled
  if (currentOptions.logToConsole) {
    console.info(`Custom mark: ${name}`, value);
  }
  
  // Send to backend if enabled
  if (currentOptions.sendToBackend) {
    sendMetricsToBackend({
      type: 'custom_mark',
      name,
      value
    });
  }
}

/**
 * Send metrics to backend API
 * @param {Object} data - The metrics data to send
 */
function sendMetricsToBackend(data) {
  // Don't send data if not enabled
  if (!currentOptions.sendToBackend) return;
  
  // Add timestamp and session ID
  const payload = {
    ...data,
    timestamp: Date.now(),
    sessionId: getSessionId()
  };
  
  // Use sendBeacon if available for better reliability
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      currentOptions.backendEndpoint,
      JSON.stringify(payload)
    );
  } else {
    // Fallback to fetch
    fetch(currentOptions.backendEndpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      },
      // Use keepalive to ensure the request completes even if the page is unloading
      keepalive: true
    }).catch(err => {
      if (currentOptions.logToConsole) {
        console.error('Error sending metrics to backend:', err);
      }
    });
  }
}

/**
 * Get or create a session ID
 * @returns {string} Session ID
 */
function getSessionId() {
  // Check if we already have a session ID
  if (localStorage.getItem('perf_session_id')) {
    return localStorage.getItem('perf_session_id');
  }
  
  // Create a new one
  const sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem('perf_session_id', sessionId);
  return sessionId;
}

/**
 * Get all collected metrics
 * @returns {Object} Metrics data
 */
export function getMetrics() {
  return { ...metricsStorage };
}

/**
 * Get metrics for a specific category
 * @param {string} category - Category name
 * @returns {Object} Category metrics
 */
export function getCategoryMetrics(category) {
  return { ...metricsStorage[category] };
}

/**
 * Clear all metrics
 */
export function clearMetrics() {
  metricsStorage = {
    webVitals: {
      CLS: null,
      FID: null,
      FCP: null,
      LCP: null,
      TTFB: null,
    },
    interactions: [],
    componentRenders: {},
    resources: [],
    customMarks: {},
    navigationTimings: null,
    jsErrors: [],
    apiCalls: []
  };
}

/**
 * Get performance summary with key metrics
 * @returns {Object} Performance summary
 */
export function getPerformanceSummary() {
  return {
    webVitals: metricsStorage.webVitals,
    pageLoad: metricsStorage.navigationTimings?.pageLoad || null,
    resourceCount: metricsStorage.resources.length,
    slowResources: metricsStorage.resources.filter(r => r.duration > 500).length,
    errorCount: metricsStorage.jsErrors.length,
    apiCallsCount: metricsStorage.apiCalls.length,
    slowApiCalls: metricsStorage.apiCalls.filter(a => a.duration > 1000).length,
    timestamp: Date.now()
  };
}

// Provide Web Vitals directly for convenience
export { getCLS, getFID, getFCP, getLCP, getTTFB };