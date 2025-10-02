/**
 * Preload - Module for preloading critical components
 * 
 * This module handles preloading of critical components to improve user experience
 * by loading important but non-essential modules after the main page has loaded.
 */

// Function to preload a component by dynamic import
const preloadComponent = (importFn) => {
  // Start the import in the background
  const promise = importFn();
  
  // Return a function that gives access to the loaded module
  return () => promise;
};

// Preload strategy for frequently used components
export const preloadProbabilityCalculator = () => {
  // Only preload in production to avoid affecting development reloading
  if (process.env.NODE_ENV === 'production') {
    // Preload after a short delay to prioritize initial page load
    setTimeout(() => {
      preloadComponent(() => import('./ProbabilityCalculator'));
      console.log('Preloaded ProbabilityCalculator component');
    }, 3000);
  }
};

// Preload key simulation components
export const preloadPopularSimulations = () => {
  if (process.env.NODE_ENV === 'production') {
    // Preload most commonly used simulations
    setTimeout(() => {
      preloadComponent(() => import('./simulations/EmailArrivalsD3'));
      console.log('Preloaded EmailArrivalsD3 simulation');
    }, 5000);
    
    // Preload with longer delay for less frequently used simulations
    setTimeout(() => {
      preloadComponent(() => import('./simulations/QualityControlD3'));
      console.log('Preloaded QualityControlD3 simulation');
    }, 10000);
  }
};

// Preload multiple components at once with a specified delay
export const preloadComponents = (importFunctions, delay = 5000) => {
  if (process.env.NODE_ENV === 'production') {
    setTimeout(() => {
      importFunctions.forEach(importFn => {
        preloadComponent(importFn);
      });
      console.log('Preloaded multiple components');
    }, delay);
  }
};

// Preload a component when a link is hovered
export const setupPreloadOnHover = () => {
  // Find tab links for probability distributions
  const tabLinks = document.querySelectorAll('a[href*="probability-distributions"]');
  
  // Add hover listeners to preload the destination component
  tabLinks.forEach(link => {
    link.addEventListener('mouseenter', () => {
      const path = link.getAttribute('href');
      
      // Preload based on the path
      if (path.includes('/calculator')) {
        preloadComponent(() => import('./ProbabilityCalculator'));
      } else if (path.includes('/applications')) {
        preloadComponent(() => import('./LazyApplicationSimulations'));
      } else if (path.includes('/learn')) {
        preloadComponent(() => import('./EducationalContent'));
      }
    });
  });
};

// Preload components based on current route
export const preloadBasedOnRoute = (route) => {
  if (process.env.NODE_ENV === 'production') {
    if (route.includes('/probability-distributions')) {
      // If on the main distributions page, preload calculator as it's likely to be used next
      if (!route.includes('/calculator')) {
        preloadComponent(() => import('./ProbabilityCalculator'));
      }
      
      // If on calculator, preload applications as they're often viewed next
      if (route.includes('/calculator')) {
        preloadComponent(() => import('./LazyApplicationSimulations'));
      }
    }
  }
};

export default {
  preloadProbabilityCalculator,
  preloadPopularSimulations,
  preloadComponents,
  setupPreloadOnHover,
  preloadBasedOnRoute
};