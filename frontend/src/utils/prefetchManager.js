/**
 * Predictive Prefetching Manager
 * 
 * This utility manages intelligent prefetching of resources based on user navigation patterns.
 * It tracks navigation paths, predicts likely next pages, and prefetches resources
 * to improve perceived performance.
 */

// Configuration options with defaults
const defaultOptions = {
  // Navigation pattern tracking
  maxPathLength: 10,                // Maximum length of navigation path to track
  maxPathsToStore: 100,             // Maximum number of unique paths to remember
  minimumVisitThreshold: 2,         // Minimum visits to a path before prediction is made
  
  // Prefetching behavior
  prefetchThreshold: 0.25,          // Probability threshold for prefetching (0.0 to 1.0)
  maxPrefetchResources: 5,          // Maximum resources to prefetch at once
  prefetchDocuments: true,          // Whether to prefetch HTML documents
  prefetchAssets: true,             // Whether to prefetch assets (JS, CSS, images)
  
  // Prefetching constraints
  respectDataSaver: true,           // Respect data-saver mode
  onlyFastConnections: true,        // Only prefetch on fast connections (4G+)
  idleTimeout: 3000,                // Milliseconds of idle time before prefetching starts
  connectionTypes: ['4g', 'wifi'],  // Connection types suitable for prefetching
  
  // Storage keys
  navigationPathKey: 'navpath',     // LocalStorage key for navigation paths
  prefetchedResourcesKey: 'prefetched', // LocalStorage key for prefetched resources
  
  // Debug
  debug: false                      // Enable debug logging
};

// Module state
let options = { ...defaultOptions };
let currentPath = [];
let navigationPatterns = {};
let prefetchedResources = new Set();
let idleCallbackId = null;
let observer = null;
let isInitialized = false;

/**
 * Initialize the prefetching manager
 * @param {Object} customOptions - Override default configuration
 */
export function initPrefetchManager(customOptions = {}) {
  // Only initialize once
  if (isInitialized) return;
  
  // Merge options
  options = { ...defaultOptions, ...customOptions };
  
  // Load stored navigation patterns from localStorage
  loadNavigationPatterns();
  
  // Set up link hover observation
  setupLinkObserver();
  
  // Track current page visit
  trackPageVisit(window.location.pathname);
  
  // Register navigation event listeners
  setupNavigationTracking();
  
  // Mark as initialized
  isInitialized = true;
  
  debugLog('Prefetch Manager initialized', options);
}

/**
 * Set up navigation tracking
 */
function setupNavigationTracking() {
  // Track navigation events using History API
  const historyObj = window.history;
  const originalPushState = historyObj.pushState;
  const originalReplaceState = historyObj.replaceState;
  
  // Override pushState
  historyObj.pushState = function() {
    originalPushState.apply(this, arguments);
    handleLocationChange();
  };
  
  // Override replaceState
  historyObj.replaceState = function() {
    originalReplaceState.apply(this, arguments);
    handleLocationChange();
  };
  
  // Listen for popstate events (back/forward navigation)
  window.addEventListener('popstate', handleLocationChange);
  
  // Initial page load tracking
  handleLocationChange();
}

/**
 * Handle location changes (navigation)
 */
function handleLocationChange() {
  // Get current path
  const path = window.location.pathname;
  
  // Track the visit
  trackPageVisit(path);
  
  // Update prefetch candidates when navigating
  updatePrefetchCandidates();
}

/**
 * Track a page visit and update navigation patterns
 * @param {string} path - The path being visited
 */
function trackPageVisit(path) {
  // Add to current path
  if (currentPath.length >= options.maxPathLength) {
    currentPath.shift(); // Remove oldest entry
  }
  currentPath.push(path);
  
  // Create path string (for last 3 pages of current path)
  const pathString = currentPath.slice(-3).join('->');
  
  // Update navigation patterns
  if (!navigationPatterns[pathString]) {
    navigationPatterns[pathString] = {
      count: 0,
      nextPages: {}
    };
  }
  
  navigationPatterns[pathString].count += 1;
  
  // Prune navigation patterns if needed
  pruneNavigationPatterns();
  
  // Store updated patterns
  saveNavigationPatterns();
  
  debugLog('Page visit tracked', { path, currentPath, pathString });
}

/**
 * Update the list of resources that should be prefetched
 */
function updatePrefetchCandidates() {
  // Don't prefetch if network conditions aren't suitable
  if (!shouldPrefetch()) return;
  
  // Cancel any previous idle callback
  if (idleCallbackId !== null) {
    window.cancelIdleCallback(idleCallbackId);
  }
  
  // Set up new idle callback
  idleCallbackId = window.requestIdleCallback(
    () => predictAndPrefetch(),
    { timeout: options.idleTimeout }
  );
}

/**
 * Determine if prefetching should happen based on network conditions
 * @returns {boolean} Whether prefetching should happen
 */
function shouldPrefetch() {
  // Don't prefetch if document is not visible
  if (document.visibilityState !== 'visible') return false;
  
  // Check connection type
  if (options.onlyFastConnections && navigator.connection) {
    const connection = navigator.connection;
    
    // Respect data-saver mode
    if (options.respectDataSaver && connection.saveData) {
      debugLog('Prefetching disabled due to data-saver mode');
      return false;
    }
    
    // Check connection type
    if (connection.effectiveType && 
        !options.connectionTypes.includes(connection.effectiveType)) {
      debugLog(`Prefetching disabled due to connection type: ${connection.effectiveType}`);
      return false;
    }
  }
  
  return true;
}

/**
 * Predict next pages and prefetch resources
 */
function predictAndPrefetch() {
  // Get latest path segments (up to 3)
  const currentPathString = currentPath.slice(-3).join('->');
  
  // Find matching patterns
  const predictions = predictNextPages(currentPathString);
  
  // Prefetch top predictions
  if (predictions.length > 0) {
    prefetchResources(predictions);
  }
}

/**
 * Predict the most likely next pages based on navigation history
 * @param {string} pathString - Current path string
 * @returns {Array} Predicted next pages with probabilities
 */
function predictNextPages(pathString) {
  // Check if we have this path in our patterns
  if (!navigationPatterns[pathString] || 
      navigationPatterns[pathString].count < options.minimumVisitThreshold) {
    debugLog('Not enough data to make predictions', { pathString });
    return [];
  }
  
  const pattern = navigationPatterns[pathString];
  const totalNextPageVisits = Object.values(pattern.nextPages)
    .reduce((sum, count) => sum + count, 0);
  
  // No next pages recorded yet
  if (totalNextPageVisits === 0) return [];
  
  // Calculate probabilities for each next page
  const predictions = Object.entries(pattern.nextPages)
    .map(([nextPage, count]) => ({
      path: nextPage,
      probability: count / totalNextPageVisits
    }))
    .filter(prediction => prediction.probability >= options.prefetchThreshold)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, options.maxPrefetchResources);
  
  debugLog('Predictions generated', { pathString, predictions });
  
  return predictions;
}

/**
 * Prefetch resources for predicted next pages
 * @param {Array} predictions - Array of predicted next pages
 */
function prefetchResources(predictions) {
  predictions.forEach(prediction => {
    const path = prediction.path;
    
    // Skip if already prefetched
    if (prefetchedResources.has(path)) return;
    
    // Prefetch HTML document
    if (options.prefetchDocuments) {
      prefetchDocument(path);
    }
    
    // Mark as prefetched
    prefetchedResources.add(path);
  });
  
  // Update prefetched resources in storage
  localStorage.setItem(
    options.prefetchedResourcesKey, 
    JSON.stringify([...prefetchedResources])
  );
}

/**
 * Prefetch an HTML document
 * @param {string} path - Path to prefetch
 */
function prefetchDocument(path) {
  // Create link element
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = path;
  link.as = 'document';
  
  // Append to head
  document.head.appendChild(link);
  
  debugLog('Prefetching document', path);
}

/**
 * Set up link hover observation for just-in-time prefetching
 */
function setupLinkObserver() {
  // Only run in browsers
  if (typeof window === 'undefined') return;
  
  // Set up intersection observer for links
  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const link = entry.target;
        
        // Get href attribute
        const href = link.getAttribute('href');
        
        // Skip invalid, external, or already prefetched links
        if (!href || 
            href.startsWith('http') || 
            href.startsWith('#') || 
            prefetchedResources.has(href)) {
          return;
        }
        
        // Add hover listener
        link.addEventListener('mouseenter', () => {
          // Only prefetch in good network conditions
          if (shouldPrefetch()) {
            prefetchDocument(href);
            prefetchedResources.add(href);
          }
        }, { once: true });
        
        // Stop observing once we've added the listener
        observer.unobserve(link);
      }
    });
  }, {
    threshold: 0.1 // Trigger when 10% of the link is visible
  });
  
  // Start observing links
  observeLinks();
  
  // Set up a MutationObserver to watch for new links
  const mutationObserver = new MutationObserver(() => {
    observeLinks();
  });
  
  // Start observing the document for added nodes
  mutationObserver.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
}

/**
 * Observe all links in the document
 */
function observeLinks() {
  // Find all internal links
  document.querySelectorAll('a[href^="/"]').forEach(link => {
    observer.observe(link);
  });
}

/**
 * Load navigation patterns from localStorage
 */
function loadNavigationPatterns() {
  try {
    const stored = localStorage.getItem(options.navigationPathKey);
    
    if (stored) {
      navigationPatterns = JSON.parse(stored);
      debugLog('Loaded navigation patterns from storage', navigationPatterns);
    }
  } catch (err) {
    console.error('Error loading navigation patterns', err);
    // Start with empty patterns
    navigationPatterns = {};
  }
  
  // Also load prefetched resources
  try {
    const stored = localStorage.getItem(options.prefetchedResourcesKey);
    
    if (stored) {
      prefetchedResources = new Set(JSON.parse(stored));
    }
  } catch (err) {
    console.error('Error loading prefetched resources', err);
    // Start with empty set
    prefetchedResources = new Set();
  }
}

/**
 * Save navigation patterns to localStorage
 */
function saveNavigationPatterns() {
  try {
    localStorage.setItem(
      options.navigationPathKey, 
      JSON.stringify(navigationPatterns)
    );
  } catch (err) {
    console.error('Error saving navigation patterns', err);
  }
}

/**
 * Prune navigation patterns if we're storing too many
 */
function pruneNavigationPatterns() {
  const patternCount = Object.keys(navigationPatterns).length;
  
  if (patternCount <= options.maxPathsToStore) return;
  
  // Sort patterns by count
  const sortedPatterns = Object.entries(navigationPatterns)
    .sort(([, a], [, b]) => b.count - a.count);
  
  // Keep only the top patterns
  navigationPatterns = sortedPatterns
    .slice(0, options.maxPathsToStore)
    .reduce((obj, [path, data]) => {
      obj[path] = data;
      return obj;
    }, {});
}

/**
 * Record a navigation between pages
 * @param {string} fromPath - Path navigated from
 * @param {string} toPath - Path navigated to
 */
export function recordNavigation(fromPath, toPath) {
  // Only if initialized
  if (!isInitialized) return;
  
  // Create path string with these two pages
  const pathString = fromPath;
  
  // Update patterns
  if (!navigationPatterns[pathString]) {
    navigationPatterns[pathString] = {
      count: 0,
      nextPages: {}
    };
  }
  
  navigationPatterns[pathString].count += 1;
  
  // Update next pages
  if (!navigationPatterns[pathString].nextPages[toPath]) {
    navigationPatterns[pathString].nextPages[toPath] = 0;
  }
  
  navigationPatterns[pathString].nextPages[toPath] += 1;
  
  // Save updated patterns
  saveNavigationPatterns();
  
  debugLog('Navigation recorded', { fromPath, toPath });
}

/**
 * Manually prefetch a path (useful for critical resources)
 * @param {string} path - Path to prefetch
 */
export function prefetch(path) {
  // Skip if already prefetched
  if (prefetchedResources.has(path)) return;
  
  // Only prefetch in good network conditions
  if (shouldPrefetch()) {
    prefetchDocument(path);
    prefetchedResources.add(path);
    
    // Update prefetched resources in storage
    localStorage.setItem(
      options.prefetchedResourcesKey, 
      JSON.stringify([...prefetchedResources])
    );
  }
}

/**
 * Get current navigation statistics
 * @returns {Object} Navigation statistics
 */
export function getNavigationStats() {
  return {
    patterns: { ...navigationPatterns },
    currentPath: [...currentPath],
    prefetchedResources: [...prefetchedResources],
  };
}

/**
 * Reset all navigation patterns and prefetched resources
 */
export function resetPrefetchManager() {
  navigationPatterns = {};
  prefetchedResources.clear();
  currentPath = [];
  
  // Clear storage
  localStorage.removeItem(options.navigationPathKey);
  localStorage.removeItem(options.prefetchedResourcesKey);
  
  debugLog('Prefetch manager reset');
}

/**
 * Debug log helper
 * @param {string} message - Log message
 * @param {Object} data - Optional data to log
 */
function debugLog(message, data) {
  if (!options.debug) return;
  
  if (data) {
    console.log(`[PrefetchManager] ${message}`, data);
  } else {
    console.log(`[PrefetchManager] ${message}`);
  }
}