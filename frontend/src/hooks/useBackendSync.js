/**
 * React Hook for Backend Synchronization
 * Provides sync status and controls to React components
 *
 * @module useBackendSync
 * @version 1.0.0
 * @author StickForStats Platform
 * @license MIT
 */

import { useState, useEffect, useCallback } from 'react';
import backendSync, { getSyncStatus, forceSync, clearSyncQueue } from '../utils/validation/BackendSync';

/**
 * Custom hook for backend synchronization
 */
export function useBackendSync() {
  const [syncStatus, setSyncStatus] = useState(getSyncStatus());
  const [isForcing, setIsForcing] = useState(false);

  /**
   * Update sync status periodically
   */
  useEffect(() => {
    const updateStatus = () => {
      setSyncStatus(getSyncStatus());
    };

    // Update immediately
    updateStatus();

    // Set up periodic updates
    const interval = setInterval(updateStatus, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Force synchronization
   */
  const forceSynchronization = useCallback(async () => {
    setIsForcing(true);
    try {
      await forceSync();
      setSyncStatus(getSyncStatus());
      return { success: true };
    } catch (error) {
      console.error('Force sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      setIsForcing(false);
    }
  }, []);

  /**
   * Clear pending items
   */
  const clearPending = useCallback(() => {
    clearSyncQueue();
    setSyncStatus(getSyncStatus());
  }, []);

  /**
   * Calculate sync health
   */
  const syncHealth = useCallback(() => {
    if (!syncStatus) return 'unknown';

    if (syncStatus.isConnected && syncStatus.pendingAuditLogs === 0) {
      return 'healthy';
    }

    if (syncStatus.pendingAuditLogs > 100 || syncStatus.retryCount > 2) {
      return 'degraded';
    }

    if (!syncStatus.isConnected || syncStatus.stats.failedSyncs > 5) {
      return 'unhealthy';
    }

    return 'normal';
  }, [syncStatus]);

  return {
    // Status
    isConnected: syncStatus.isConnected,
    isSyncing: syncStatus.isSyncing || isForcing,
    lastSyncTime: syncStatus.lastSyncTime,
    pendingAuditLogs: syncStatus.pendingAuditLogs,
    pendingMetrics: syncStatus.pendingMetrics,
    syncStats: syncStatus.stats,
    retryCount: syncStatus.retryCount,
    health: syncHealth(),

    // Actions
    forceSync: forceSynchronization,
    clearQueue: clearPending,

    // Computed
    hasPendingItems: syncStatus.pendingAuditLogs > 0 || syncStatus.pendingMetrics > 0,
    isHealthy: syncHealth() === 'healthy',
    requiresAttention: syncHealth() === 'degraded' || syncHealth() === 'unhealthy'
  };
}

/**
 * Hook for sync status indicator
 */
export function useSyncIndicator() {
  const { isConnected, isSyncing, health, pendingAuditLogs } = useBackendSync();

  const getIndicatorColor = () => {
    if (!isConnected) return 'error';
    if (health === 'unhealthy') return 'error';
    if (health === 'degraded') return 'warning';
    if (isSyncing) return 'info';
    return 'success';
  };

  const getIndicatorText = () => {
    if (!isConnected) return 'Disconnected';
    if (isSyncing) return 'Syncing...';
    if (pendingAuditLogs > 0) return `${pendingAuditLogs} pending`;
    return 'Synced';
  };

  return {
    color: getIndicatorColor(),
    text: getIndicatorText(),
    pulse: isSyncing
  };
}

export default useBackendSync;