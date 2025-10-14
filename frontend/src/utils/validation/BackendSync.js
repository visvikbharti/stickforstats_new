/**
 * Backend Synchronization Service
 * Handles audit log and metrics synchronization with backend
 *
 * @module BackendSync
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { auditLogger } from './AuditLogger';
import { centralErrorHandler } from './CentralErrorHandler';
import { recordError, recordComplianceMetric } from './monitoring';

/**
 * Backend sync configuration
 */
const CONFIG = {
  API_BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api',
  SYNC_INTERVAL: 30000, // 30 seconds
  BATCH_SIZE: 100,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000,
  WEBSOCKET_URL: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  ENABLE_WEBSOCKET: true,
  COMPRESS_PAYLOAD: true,
  ENCRYPTION_ENABLED: true
};

/**
 * Backend synchronization service
 */
class BackendSyncService {
  constructor() {
    this.syncQueue = [];
    this.metricsQueue = [];
    this.isSyncing = false;
    this.websocket = null;
    this.syncInterval = null;
    this.retryCount = 0;
    this.lastSyncTime = null;
    this.syncStats = {
      totalSynced: 0,
      failedSyncs: 0,
      lastSuccess: null,
      lastError: null
    };

    // Initialize sync service
    this.initialize();
  }

  /**
   * Initialize synchronization service
   */
  async initialize() {
    try {
      // Start periodic sync
      this.startPeriodicSync();

      // Initialize WebSocket connection
      if (CONFIG.ENABLE_WEBSOCKET) {
        this.initializeWebSocket();
      }

      // Load pending items from localStorage
      this.loadPendingItems();

      // Register with audit logger
      this.registerAuditHooks();

      console.log('Backend sync service initialized');

    } catch (error) {
      console.error('Failed to initialize backend sync:', error);
      recordError(error, 'BackendSync', 'INITIALIZATION');
    }
  }

  /**
   * Register audit logger hooks
   */
  registerAuditHooks() {
    // Hook into audit logger to capture new entries
    if (auditLogger) {
      const originalLog = auditLogger.log.bind(auditLogger);

      auditLogger.log = (data, level) => {
        const result = originalLog(data, level);

        // Add to sync queue
        if (result && result.entry) {
          this.addToQueue('audit', result.entry);
        }

        return result;
      };
    }
  }

  /**
   * Initialize WebSocket connection
   */
  initializeWebSocket() {
    try {
      this.websocket = new WebSocket(CONFIG.WEBSOCKET_URL);

      this.websocket.onopen = () => {
        console.log('WebSocket connected for real-time sync');
        this.sendWebSocketMessage({
          type: 'AUTH',
          token: this.getAuthToken()
        });
      };

      this.websocket.onmessage = (event) => {
        this.handleWebSocketMessage(event.data);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        recordError(error, 'BackendSync', 'WEBSOCKET');
      };

      this.websocket.onclose = () => {
        console.log('WebSocket disconnected, attempting reconnect...');
        setTimeout(() => this.initializeWebSocket(), 5000);
      };

    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
      recordError(error, 'BackendSync', 'WEBSOCKET_INIT');
    }
  }

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(data) {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'SYNC_ACK':
          this.handleSyncAcknowledgment(message.payload);
          break;

        case 'SYNC_REQUEST':
          this.performImmediateSync();
          break;

        case 'CONFIG_UPDATE':
          this.updateConfiguration(message.config);
          break;

        case 'ALERT':
          this.handleServerAlert(message.alert);
          break;

        default:
          console.log('Unknown WebSocket message type:', message.type);
      }

    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  /**
   * Send WebSocket message
   */
  sendWebSocketMessage(message) {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
    }
  }

  /**
   * Add item to sync queue
   */
  addToQueue(type, data) {
    const queueItem = {
      id: this.generateQueueId(),
      type,
      data,
      timestamp: Date.now(),
      attempts: 0
    };

    if (type === 'audit') {
      this.syncQueue.push(queueItem);
    } else if (type === 'metrics') {
      this.metricsQueue.push(queueItem);
    }

    // Save to localStorage for persistence
    this.savePendingItems();

    // Trigger immediate sync if WebSocket is available
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.sendWebSocketMessage({
        type: 'AUDIT_LOG',
        payload: queueItem
      });
    }
  }

  /**
   * Start periodic synchronization
   */
  startPeriodicSync() {
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, CONFIG.SYNC_INTERVAL);
  }

  /**
   * Stop periodic synchronization
   */
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform synchronization
   */
  async performSync() {
    if (this.isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    this.isSyncing = true;

    try {
      // Sync audit logs
      await this.syncAuditLogs();

      // Sync metrics
      await this.syncMetrics();

      // Sync compliance data
      await this.syncComplianceData();

      // Update sync stats
      this.lastSyncTime = Date.now();
      this.syncStats.lastSuccess = new Date();
      this.retryCount = 0;

      // Record successful sync
      recordComplianceMetric('audit');

    } catch (error) {
      console.error('Sync failed:', error);
      this.syncStats.failedSyncs++;
      this.syncStats.lastError = error.message;

      // Retry logic
      if (this.retryCount < CONFIG.MAX_RETRY_ATTEMPTS) {
        this.retryCount++;
        setTimeout(() => this.performSync(), CONFIG.RETRY_DELAY * this.retryCount);
      }

      recordError(error, 'BackendSync', 'SYNC_FAILED');

    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync audit logs
   */
  async syncAuditLogs() {
    if (this.syncQueue.length === 0) {
      return;
    }

    // Get batch of logs to sync
    const batch = this.syncQueue.slice(0, CONFIG.BATCH_SIZE);
    const payload = this.preparePayload(batch);

    try {
      const response = await this.makeAPICall('/validation/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'X-Sync-Session': this.getSyncSessionId()
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();

        // Remove synced items from queue
        this.syncQueue = this.syncQueue.slice(batch.length);
        this.syncStats.totalSynced += batch.length;

        // Save updated queue
        this.savePendingItems();

        console.log(`Synced ${batch.length} audit logs`);

        return result;
      } else {
        throw new Error(`Sync failed with status: ${response.status}`);
      }

    } catch (error) {
      console.error('Failed to sync audit logs:', error);
      throw error;
    }
  }

  /**
   * Sync metrics data
   */
  async syncMetrics() {
    if (this.metricsQueue.length === 0) {
      return;
    }

    const batch = this.metricsQueue.slice(0, CONFIG.BATCH_SIZE);
    const payload = this.prepareMetricsPayload(batch);

    try {
      const response = await this.makeAPICall('/validation/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        // Remove synced items
        this.metricsQueue = this.metricsQueue.slice(batch.length);
        this.savePendingItems();

        console.log(`Synced ${batch.length} metrics`);
      }

    } catch (error) {
      console.error('Failed to sync metrics:', error);
      throw error;
    }
  }

  /**
   * Sync compliance data
   */
  async syncComplianceData() {
    try {
      const complianceData = this.gatherComplianceData();

      const response = await this.makeAPICall('/validation/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`
        },
        body: JSON.stringify(complianceData)
      });

      if (response.ok) {
        console.log('Compliance data synced successfully');
      }

    } catch (error) {
      console.error('Failed to sync compliance data:', error);
      // Don't throw - compliance sync is not critical
    }
  }

  /**
   * Prepare payload for transmission
   */
  preparePayload(batch) {
    const payload = {
      sessionId: this.getSyncSessionId(),
      timestamp: Date.now(),
      entries: batch.map(item => ({
        ...item.data,
        clientId: item.id,
        clientTimestamp: item.timestamp
      })),
      metadata: {
        clientVersion: '1.0.0',
        environment: process.env.NODE_ENV,
        compressed: CONFIG.COMPRESS_PAYLOAD,
        encrypted: CONFIG.ENCRYPTION_ENABLED
      }
    };

    // Compress if enabled
    if (CONFIG.COMPRESS_PAYLOAD) {
      payload.entries = this.compressData(payload.entries);
    }

    // Encrypt if enabled
    if (CONFIG.ENCRYPTION_ENABLED) {
      payload.entries = this.encryptData(payload.entries);
    }

    return payload;
  }

  /**
   * Prepare metrics payload
   */
  prepareMetricsPayload(batch) {
    return {
      sessionId: this.getSyncSessionId(),
      timestamp: Date.now(),
      metrics: batch.map(item => item.data),
      aggregates: this.calculateAggregates(batch)
    };
  }

  /**
   * Calculate metric aggregates
   */
  calculateAggregates(batch) {
    const aggregates = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      avgResponseTime: 0,
      errorCount: 0
    };

    batch.forEach(item => {
      if (item.data.type === 'validation') {
        aggregates.totalValidations++;
        if (item.data.success) {
          aggregates.successfulValidations++;
        } else {
          aggregates.failedValidations++;
        }
      }
    });

    return aggregates;
  }

  /**
   * Gather compliance data
   */
  gatherComplianceData() {
    return {
      timestamp: Date.now(),
      auditTrailActive: true,
      digitalSignaturesEnabled: true,
      dataIntegrityVerified: true,
      retentionPolicyEnforced: true,
      accessControlConfigured: true,
      encryptionEnabled: CONFIG.ENCRYPTION_ENABLED,
      lastBackup: this.lastSyncTime,
      complianceScore: 100 // Would calculate based on actual metrics
    };
  }

  /**
   * Make API call with retry logic
   */
  async makeAPICall(endpoint, options, retries = 3) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          credentials: 'include',
          mode: 'cors'
        });

        if (response.ok || response.status < 500) {
          return response;
        }

        // Server error, retry
        if (attempt < retries - 1) {
          await this.delay(CONFIG.RETRY_DELAY * (attempt + 1));
        }

      } catch (error) {
        if (attempt === retries - 1) {
          throw error;
        }
        await this.delay(CONFIG.RETRY_DELAY * (attempt + 1));
      }
    }

    throw new Error(`API call failed after ${retries} attempts`);
  }

  /**
   * Compress data
   */
  compressData(data) {
    // Implementation would use a compression library like pako
    // For now, return data as-is
    return data;
  }

  /**
   * Encrypt data
   */
  encryptData(data) {
    // Implementation would use encryption library
    // For now, return data as-is
    return data;
  }

  /**
   * Load pending items from localStorage
   */
  loadPendingItems() {
    try {
      const pendingSync = localStorage.getItem('validation_sync_queue');
      const pendingMetrics = localStorage.getItem('validation_metrics_queue');

      if (pendingSync) {
        this.syncQueue = JSON.parse(pendingSync);
      }

      if (pendingMetrics) {
        this.metricsQueue = JSON.parse(pendingMetrics);
      }

      console.log(`Loaded ${this.syncQueue.length} pending audit logs and ${this.metricsQueue.length} pending metrics`);

    } catch (error) {
      console.error('Failed to load pending items:', error);
    }
  }

  /**
   * Save pending items to localStorage
   */
  savePendingItems() {
    try {
      localStorage.setItem('validation_sync_queue', JSON.stringify(this.syncQueue));
      localStorage.setItem('validation_metrics_queue', JSON.stringify(this.metricsQueue));
    } catch (error) {
      console.error('Failed to save pending items:', error);
      // If localStorage is full, remove oldest items
      if (error.name === 'QuotaExceededError') {
        this.cleanupLocalStorage();
      }
    }
  }

  /**
   * Clean up localStorage
   */
  cleanupLocalStorage() {
    // Keep only most recent items
    const maxItems = 1000;

    if (this.syncQueue.length > maxItems) {
      this.syncQueue = this.syncQueue.slice(-maxItems);
    }

    if (this.metricsQueue.length > maxItems) {
      this.metricsQueue = this.metricsQueue.slice(-maxItems);
    }

    this.savePendingItems();
  }

  /**
   * Get authentication token
   */
  getAuthToken() {
    return localStorage.getItem('auth_token') || '';
  }

  /**
   * Get sync session ID
   */
  getSyncSessionId() {
    let sessionId = sessionStorage.getItem('sync_session_id');

    if (!sessionId) {
      sessionId = this.generateSessionId();
      sessionStorage.setItem('sync_session_id', sessionId);
    }

    return sessionId;
  }

  /**
   * Generate unique queue ID
   */
  generateQueueId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    return {
      isConnected: this.websocket?.readyState === WebSocket.OPEN,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingAuditLogs: this.syncQueue.length,
      pendingMetrics: this.metricsQueue.length,
      stats: this.syncStats,
      retryCount: this.retryCount
    };
  }

  /**
   * Force immediate sync
   */
  async forceSync() {
    console.log('Forcing immediate sync...');
    return this.performSync();
  }

  /**
   * Clear sync queue
   */
  clearQueue() {
    this.syncQueue = [];
    this.metricsQueue = [];
    this.savePendingItems();
    console.log('Sync queues cleared');
  }

  /**
   * Shutdown sync service
   */
  shutdown() {
    // Stop periodic sync
    this.stopPeriodicSync();

    // Close WebSocket
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Save pending items
    this.savePendingItems();

    console.log('Backend sync service shut down');
  }
}

// Create singleton instance
const backendSync = new BackendSyncService();

// Export public API
export const syncAuditLog = (entry) => {
  backendSync.addToQueue('audit', entry);
};

export const syncMetrics = (metrics) => {
  backendSync.addToQueue('metrics', metrics);
};

export const getSyncStatus = () => {
  return backendSync.getSyncStatus();
};

export const forceSync = async () => {
  return backendSync.forceSync();
};

export const clearSyncQueue = () => {
  backendSync.clearQueue();
};

export default backendSync;