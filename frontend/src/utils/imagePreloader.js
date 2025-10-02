/**
 * Utility for preloading images to improve user experience
 */

/**
 * Preload a single image
 * 
 * @param {string} src - The image URL to preload
 * @returns {Promise} - Promise that resolves when the image is loaded
 */
export const preloadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error(`Failed to preload image: ${src}`));
    img.src = src;
  });
};

/**
 * Preload multiple images
 * 
 * @param {string[]} sources - Array of image URLs to preload
 * @param {Function} [progressCallback] - Optional callback for progress updates
 * @returns {Promise<Image[]>} - Promise that resolves with array of loaded images
 */
export const preloadImages = (sources, progressCallback) => {
  const total = sources.length;
  let loaded = 0;

  // Function to update progress
  const updateProgress = () => {
    loaded++;
    if (progressCallback) {
      progressCallback(loaded / total);
    }
  };

  // Create an array of promises for each image
  const promises = sources.map(src => 
    preloadImage(src)
      .then(img => {
        updateProgress();
        return img;
      })
      .catch(err => {
        console.warn(err);
        updateProgress();
        return null; // Return null for failed images but don't reject the whole batch
      })
  );

  return Promise.all(promises);
};

/**
 * Check if an image URL exists
 * 
 * @param {string} url - The image URL to check
 * @returns {Promise<boolean>} - Promise that resolves to true if the image exists
 */
export const imageExists = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
};

/**
 * Preload critical images for a specific route or component
 * 
 * @param {string} routeKey - Key identifying the route or component
 * @returns {Promise} - Promise that resolves when critical images are loaded
 */
export const preloadCriticalImages = (routeKey) => {
  // Define critical images for different routes
  const criticalImagesByRoute = {
    'home': [
      '/images/hero-background.jpg',
      '/images/feature-preview.png'
    ],
    'probability-distributions': [
      '/images/probability/normal-distribution.svg',
      '/images/probability/distribution-comparison.png'
    ],
    // Add more routes as needed
  };

  const imagesToPreload = criticalImagesByRoute[routeKey] || [];
  return preloadImages(imagesToPreload);
};

/**
 * Priority levels for image preloading
 */
export const PRELOAD_PRIORITY = {
  CRITICAL: 'critical',   // Preload immediately
  HIGH: 'high',           // Preload after critical images
  MEDIUM: 'medium',       // Preload when idle
  LOW: 'low',             // Preload only on demand
};

/**
 * Queue images for preloading with different priority levels
 */
class PreloadQueue {
  constructor() {
    this.queues = {
      [PRELOAD_PRIORITY.CRITICAL]: [],
      [PRELOAD_PRIORITY.HIGH]: [],
      [PRELOAD_PRIORITY.MEDIUM]: [],
      [PRELOAD_PRIORITY.LOW]: [],
    };
    this.isProcessing = false;
  }

  /**
   * Add images to preload queue
   * 
   * @param {string[]} sources - Image URLs to preload
   * @param {string} priority - Priority level from PRELOAD_PRIORITY
   */
  add(sources, priority = PRELOAD_PRIORITY.MEDIUM) {
    if (!Array.isArray(sources)) {
      sources = [sources];
    }
    
    // Add to appropriate queue, avoiding duplicates
    sources.forEach(src => {
      if (!this.queues[priority].includes(src)) {
        this.queues[priority].push(src);
      }
    });
    
    // Start processing if not already running
    if (!this.isProcessing) {
      this.process();
    }
  }

  /**
   * Process queued images based on priority
   */
  async process() {
    this.isProcessing = true;
    
    // Process critical images immediately
    if (this.queues[PRELOAD_PRIORITY.CRITICAL].length > 0) {
      await preloadImages(this.queues[PRELOAD_PRIORITY.CRITICAL]);
      this.queues[PRELOAD_PRIORITY.CRITICAL] = [];
    }
    
    // Process high priority images next
    if (this.queues[PRELOAD_PRIORITY.HIGH].length > 0) {
      const highPriorityImages = [...this.queues[PRELOAD_PRIORITY.HIGH]];
      this.queues[PRELOAD_PRIORITY.HIGH] = [];
      await preloadImages(highPriorityImages);
    }
    
    // For medium and low priority, use requestIdleCallback if available
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => this.processLowerPriority());
    } else {
      // Fallback to setTimeout with a delay
      setTimeout(() => this.processLowerPriority(), 1000);
    }
  }

  /**
   * Process medium and low priority images when browser is idle
   */
  async processLowerPriority() {
    // Process medium priority images
    if (this.queues[PRELOAD_PRIORITY.MEDIUM].length > 0) {
      const mediumPriorityImages = [...this.queues[PRELOAD_PRIORITY.MEDIUM]];
      this.queues[PRELOAD_PRIORITY.MEDIUM] = [];
      
      // Load in batches of 5
      for (let i = 0; i < mediumPriorityImages.length; i += 5) {
        const batch = mediumPriorityImages.slice(i, i + 5);
        await preloadImages(batch);
        
        // Give time for other tasks between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Low priority images are only loaded if browser is very idle
    if (this.queues[PRELOAD_PRIORITY.LOW].length > 0) {
      const checkIdle = () => {
        if (typeof window.requestIdleCallback !== 'undefined') {
          window.requestIdleCallback(
            async (deadline) => {
              if (deadline.timeRemaining() > 100) {
                // If we have plenty of idle time, load a batch
                const batch = this.queues[PRELOAD_PRIORITY.LOW].splice(0, 3);
                if (batch.length > 0) {
                  await preloadImages(batch);
                }
              }
              
              // If we still have images to load, schedule another check
              if (this.queues[PRELOAD_PRIORITY.LOW].length > 0) {
                checkIdle();
              } else {
                this.isProcessing = false;
              }
            },
            { timeout: 1000 }
          );
        } else {
          // Basic fallback if requestIdleCallback isn't available
          setTimeout(async () => {
            const batch = this.queues[PRELOAD_PRIORITY.LOW].splice(0, 3);
            if (batch.length > 0) {
              await preloadImages(batch);
            }
            
            if (this.queues[PRELOAD_PRIORITY.LOW].length > 0) {
              checkIdle();
            } else {
              this.isProcessing = false;
            }
          }, 2000);
        }
      };
      
      checkIdle();
    } else {
      this.isProcessing = false;
    }
  }
}

// Create and export a singleton instance
export const imagePreloader = new PreloadQueue();