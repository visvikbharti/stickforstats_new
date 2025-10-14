/**
 * Performance Optimization Layer
 * Caching, memoization, and optimization strategies for validation system
 *
 * @module PerformanceOptimizer
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { recordCacheMetric } from './monitoring';

/**
 * LRU Cache implementation
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (this.cache.has(key)) {
      // Move to front (most recently used)
      this.updateAccessOrder(key);
      this.hits++;
      recordCacheMetric(true);
      return this.cache.get(key);
    }

    this.misses++;
    recordCacheMetric(false);
    return null;
  }

  /**
   * Set value in cache
   */
  set(key, value, ttl = null) {
    // Remove oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const oldest = this.accessOrder.shift();
      this.cache.delete(oldest);
    }

    // Add or update
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });

    this.updateAccessOrder(key);
  }

  /**
   * Update access order
   */
  updateAccessOrder(key) {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Clear expired entries
   */
  clearExpired() {
    const now = Date.now();
    const expired = [];

    this.cache.forEach((entry, key) => {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        expired.push(key);
      }
    });

    expired.forEach(key => {
      this.cache.delete(key);
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    });
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? (this.hits / total) * 100 : 0
    };
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Memoization decorator
 */
class Memoizer {
  constructor() {
    this.cache = new LRUCache(500);
    this.pendingPromises = new Map();
  }

  /**
   * Memoize function results
   */
  memoize(fn, options = {}) {
    const {
      keyGenerator = (...args) => JSON.stringify(args),
      ttl = 60000, // 1 minute default
      maxArgs = 100,
      excludeFromCache = () => false
    } = options;

    return async (...args) => {
      // Check if should exclude from cache
      if (excludeFromCache(...args)) {
        return fn(...args);
      }

      // Limit args to prevent memory issues
      if (args.length > maxArgs) {
        return fn(...args);
      }

      // Generate cache key
      const key = keyGenerator(...args);

      // Check cache
      const cached = this.cache.get(key);
      if (cached && cached.value !== undefined) {
        return cached.value;
      }

      // Check for pending promise (deduplication)
      if (this.pendingPromises.has(key)) {
        return this.pendingPromises.get(key);
      }

      // Execute function
      const promise = fn(...args);
      this.pendingPromises.set(key, promise);

      try {
        const result = await promise;
        this.cache.set(key, result, ttl);
        return result;
      } finally {
        this.pendingPromises.delete(key);
      }
    };
  }

  /**
   * Clear memoization cache
   */
  clear() {
    this.cache.clear();
    this.pendingPromises.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cache.getStats(),
      pendingPromises: this.pendingPromises.size
    };
  }
}

/**
 * Request deduplication
 */
class RequestDeduplicator {
  constructor() {
    this.activeRequests = new Map();
    this.requestCount = 0;
    this.deduplicatedCount = 0;
  }

  /**
   * Deduplicate requests
   */
  async deduplicate(key, requestFn) {
    // Check for active request
    if (this.activeRequests.has(key)) {
      this.deduplicatedCount++;
      return this.activeRequests.get(key);
    }

    // Create new request
    this.requestCount++;
    const promise = requestFn();
    this.activeRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // Clean up after completion
      setTimeout(() => {
        this.activeRequests.delete(key);
      }, 100);
    }
  }

  /**
   * Get deduplication stats
   */
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      totalRequests: this.requestCount,
      deduplicated: this.deduplicatedCount,
      deduplicationRate: this.requestCount > 0
        ? (this.deduplicatedCount / this.requestCount) * 100
        : 0
    };
  }
}

/**
 * Lazy loader for heavy computations
 */
class LazyLoader {
  constructor() {
    this.loaded = new Map();
    this.loading = new Map();
    this.priorities = new Map();
  }

  /**
   * Load resource lazily
   */
  async load(key, loader, options = {}) {
    const {
      priority = 'normal', // 'high', 'normal', 'low'
      preload = false,
      timeout = 30000
    } = options;

    // Already loaded
    if (this.loaded.has(key)) {
      return this.loaded.get(key);
    }

    // Currently loading
    if (this.loading.has(key)) {
      return this.loading.get(key);
    }

    // Set priority
    this.priorities.set(key, priority);

    // Create loading promise
    const loadPromise = this.createLoadPromise(key, loader, timeout);
    this.loading.set(key, loadPromise);

    // Preload in background if specified
    if (preload) {
      loadPromise.catch(() => {}); // Prevent unhandled rejection
      return null;
    }

    try {
      const result = await loadPromise;
      this.loaded.set(key, result);
      return result;
    } finally {
      this.loading.delete(key);
    }
  }

  /**
   * Create load promise with timeout
   */
  createLoadPromise(key, loader, timeout) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Lazy load timeout for ${key}`));
      }, timeout);

      try {
        const result = await loader();
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Preload multiple resources
   */
  async preloadMultiple(resources) {
    const promises = resources.map(({ key, loader, priority = 'low' }) =>
      this.load(key, loader, { preload: true, priority })
    );

    // Load high priority first
    const highPriority = resources.filter(r => r.priority === 'high');
    const normalPriority = resources.filter(r => r.priority === 'normal');
    const lowPriority = resources.filter(r => r.priority === 'low');

    await Promise.all(highPriority.map(r => this.load(r.key, r.loader)));
    await Promise.all(normalPriority.map(r => this.load(r.key, r.loader)));
    await Promise.all(lowPriority.map(r => this.load(r.key, r.loader)));
  }

  /**
   * Clear loaded resources
   */
  clear(key = null) {
    if (key) {
      this.loaded.delete(key);
      this.loading.delete(key);
      this.priorities.delete(key);
    } else {
      this.loaded.clear();
      this.loading.clear();
      this.priorities.clear();
    }
  }

  /**
   * Get loader statistics
   */
  getStats() {
    return {
      loaded: this.loaded.size,
      loading: this.loading.size,
      priorities: {
        high: Array.from(this.priorities.values()).filter(p => p === 'high').length,
        normal: Array.from(this.priorities.values()).filter(p => p === 'normal').length,
        low: Array.from(this.priorities.values()).filter(p => p === 'low').length
      }
    };
  }
}

/**
 * Batch processor for bulk operations
 */
class BatchProcessor {
  constructor() {
    this.batches = new Map();
    this.processedCount = 0;
  }

  /**
   * Process items in batches
   */
  async processBatch(items, processor, options = {}) {
    const {
      batchSize = 10,
      delay = 0,
      onProgress = null,
      parallel = false
    } = options;

    const results = [];
    const batches = this.createBatches(items, batchSize);
    const totalBatches = batches.length;

    for (let i = 0; i < totalBatches; i++) {
      const batch = batches[i];

      // Process batch
      const batchResults = parallel
        ? await Promise.all(batch.map(processor))
        : await this.processSequential(batch, processor);

      results.push(...batchResults);
      this.processedCount += batch.length;

      // Report progress
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: totalBatches,
          processed: (i + 1) * batchSize,
          percentage: ((i + 1) / totalBatches) * 100
        });
      }

      // Delay between batches
      if (delay > 0 && i < totalBatches - 1) {
        await this.delay(delay);
      }
    }

    return results;
  }

  /**
   * Create batches from items
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Process items sequentially
   */
  async processSequential(items, processor) {
    const results = [];
    for (const item of items) {
      results.push(await processor(item));
    }
    return results;
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get batch statistics
   */
  getStats() {
    return {
      processedCount: this.processedCount
    };
  }
}

/**
 * Performance monitor
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = new Map();
  }

  /**
   * Measure function performance
   */
  measure(name, fn) {
    return async (...args) => {
      const startTime = performance.now();
      const startMemory = this.getMemoryUsage();

      try {
        const result = await fn(...args);

        const duration = performance.now() - startTime;
        const memoryDelta = this.getMemoryUsage() - startMemory;

        this.recordMetric(name, {
          duration,
          memoryDelta,
          timestamp: Date.now(),
          success: true
        });

        // Check threshold
        this.checkThreshold(name, duration);

        return result;

      } catch (error) {
        const duration = performance.now() - startTime;

        this.recordMetric(name, {
          duration,
          timestamp: Date.now(),
          success: false,
          error: error.message
        });

        throw error;
      }
    };
  }

  /**
   * Record metric
   */
  recordMetric(name, metric) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name);
    metrics.push(metric);

    // Keep only last 100 metrics
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Set performance threshold
   */
  setThreshold(name, threshold, callback) {
    this.thresholds.set(name, { threshold, callback });
  }

  /**
   * Check threshold
   */
  checkThreshold(name, duration) {
    const threshold = this.thresholds.get(name);
    if (threshold && duration > threshold.threshold) {
      threshold.callback({
        name,
        duration,
        threshold: threshold.threshold,
        exceeded: duration - threshold.threshold
      });
    }
  }

  /**
   * Get memory usage
   */
  getMemoryUsage() {
    if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
      return window.performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Get performance statistics
   */
  getStats(name = null) {
    if (name) {
      const metrics = this.metrics.get(name) || [];
      return this.calculateStats(metrics);
    }

    const allStats = {};
    this.metrics.forEach((metrics, key) => {
      allStats[key] = this.calculateStats(metrics);
    });
    return allStats;
  }

  /**
   * Calculate statistics
   */
  calculateStats(metrics) {
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const successful = metrics.filter(m => m.success);

    return {
      count: metrics.length,
      successRate: (successful.length / metrics.length) * 100,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99)
    };
  }

  /**
   * Calculate percentile
   */
  percentile(arr, p) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }
}

/**
 * Web Worker manager for heavy computations
 */
class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.maxWorkers = navigator.hardwareConcurrency || 4;
    this.taskQueue = [];
    this.activeWorkers = 0;
  }

  /**
   * Execute task in worker
   */
  async executeInWorker(task, workerScript) {
    return new Promise((resolve, reject) => {
      // Queue task if at capacity
      if (this.activeWorkers >= this.maxWorkers) {
        this.taskQueue.push({ task, workerScript, resolve, reject });
        return;
      }

      // Create or reuse worker
      const worker = this.getOrCreateWorker(workerScript);
      this.activeWorkers++;

      // Set up message handler
      const messageHandler = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.result);
        }

        worker.removeEventListener('message', messageHandler);
        this.activeWorkers--;

        // Process queued tasks
        this.processQueue();
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage(task);
    });
  }

  /**
   * Get or create worker
   */
  getOrCreateWorker(script) {
    if (!this.workers.has(script)) {
      const blob = new Blob([script], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      const worker = new Worker(workerUrl);
      this.workers.set(script, worker);
    }
    return this.workers.get(script);
  }

  /**
   * Process task queue
   */
  processQueue() {
    if (this.taskQueue.length > 0 && this.activeWorkers < this.maxWorkers) {
      const { task, workerScript, resolve, reject } = this.taskQueue.shift();
      this.executeInWorker(task, workerScript).then(resolve).catch(reject);
    }
  }

  /**
   * Terminate all workers
   */
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers.clear();
    this.taskQueue = [];
    this.activeWorkers = 0;
  }
}

// Create singleton instances
const validationCache = new LRUCache(1000);
const memoizer = new Memoizer();
const deduplicator = new RequestDeduplicator();
const lazyLoader = new LazyLoader();
const batchProcessor = new BatchProcessor();
const performanceMonitor = new PerformanceMonitor();
const workerManager = new WorkerManager();

/**
 * Performance optimization API
 */
export const PerformanceOptimizer = {
  // Caching
  cache: validationCache,
  getCached: (key) => validationCache.get(key),
  setCached: (key, value, ttl) => validationCache.set(key, value, ttl),

  // Memoization
  memoize: (fn, options) => memoizer.memoize(fn, options),
  clearMemoization: () => memoizer.clear(),

  // Deduplication
  deduplicate: (key, fn) => deduplicator.deduplicate(key, fn),

  // Lazy loading
  lazyLoad: (key, loader, options) => lazyLoader.load(key, loader, options),
  preload: (resources) => lazyLoader.preloadMultiple(resources),

  // Batch processing
  processBatch: (items, processor, options) => batchProcessor.processBatch(items, processor, options),

  // Performance monitoring
  measure: (name, fn) => performanceMonitor.measure(name, fn),
  setThreshold: (name, threshold, callback) => performanceMonitor.setThreshold(name, threshold, callback),

  // Web Workers
  runInWorker: (task, script) => workerManager.executeInWorker(task, script),

  // Statistics
  getStats: () => ({
    cache: validationCache.getStats(),
    memoization: memoizer.getStats(),
    deduplication: deduplicator.getStats(),
    lazyLoading: lazyLoader.getStats(),
    batchProcessing: batchProcessor.getStats(),
    performance: performanceMonitor.getStats()
  }),

  // Cleanup
  clearAll: () => {
    validationCache.clear();
    memoizer.clear();
    lazyLoader.clear();
    workerManager.terminate();
  }
};

// Auto-cleanup expired cache entries
setInterval(() => {
  validationCache.clearExpired();
}, 60000); // Every minute

export default PerformanceOptimizer;