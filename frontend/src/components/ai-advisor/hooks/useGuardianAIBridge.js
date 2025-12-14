/**
 * useGuardianAIBridge Hook
 *
 * Bridges the Guardian Statistical Protection System with AI Advisor.
 * Automatically collects Guardian warnings and injects them into AI context.
 *
 * Features:
 * - Collects Guardian check results from across the app
 * - Formats results for AI consumption
 * - Provides methods to manually register Guardian findings
 * - Exposes warning status for UI indicators
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  formatGuardianReportForAI,
  mergeGuardianIntoContext,
  checkGuardianWarningStatus,
  generateGuardianPromptContext,
  createGuardianSummaryCard,
  AssumptionStatus
} from '../../../utils/guardianAIIntegration';

/**
 * Hook for bridging Guardian with AI Advisor
 *
 * @param {Object} options - Configuration options
 * @param {Function} options.onContextUpdate - Callback when context is updated
 * @param {Object} options.initialDataContext - Initial data context
 * @returns {Object} Bridge state and methods
 */
export const useGuardianAIBridge = (options = {}) => {
  const { onContextUpdate, initialDataContext = null } = options;

  // State
  const [dataContext, setDataContext] = useState(initialDataContext);
  const [guardianHistory, setGuardianHistory] = useState([]);
  const [latestGuardianReport, setLatestGuardianReport] = useState(null);
  const [warningStatus, setWarningStatus] = useState({
    hasIssues: false,
    violations: 0,
    warnings: 0,
    message: 'No Guardian checks performed'
  });

  // Refs for tracking
  const contextUpdateCallback = useRef(onContextUpdate);

  // Update callback ref when prop changes
  useEffect(() => {
    contextUpdateCallback.current = onContextUpdate;
  }, [onContextUpdate]);

  /**
   * Register a new Guardian check result
   * This is the main method components use to report Guardian findings
   *
   * @param {Object} guardianReport - Raw Guardian report from API
   * @param {Object} dataInfo - Optional additional data info
   */
  const registerGuardianResult = useCallback((guardianReport, dataInfo = null) => {
    if (!guardianReport) return;

    // Format the report
    const formattedReport = formatGuardianReportForAI(guardianReport);
    setLatestGuardianReport(formattedReport);

    // Add to history
    setGuardianHistory(prev => [
      ...prev,
      {
        ...formattedReport,
        registeredAt: new Date().toISOString()
      }
    ].slice(-10)); // Keep last 10 checks

    // Update data context
    setDataContext(prev => {
      const updated = mergeGuardianIntoContext(prev, guardianReport);

      // Add additional data info if provided
      if (dataInfo) {
        Object.assign(updated, {
          datasetName: dataInfo.name || dataInfo.datasetName || updated.datasetName,
          rows: dataInfo.rows || dataInfo.rowCount || updated.rows,
          columns: dataInfo.columns || dataInfo.columnCount || updated.columns,
          variables: dataInfo.variables || updated.variables
        });
      }

      // Notify parent
      if (contextUpdateCallback.current) {
        contextUpdateCallback.current(updated);
      }

      return updated;
    });

    // Update warning status
    setWarningStatus(checkGuardianWarningStatus({
      guardianContext: formattedReport
    }));

  }, []);

  /**
   * Register a single assumption check result
   * Useful for incremental checks
   *
   * @param {Object} assumption - Single assumption check result
   */
  const registerAssumptionCheck = useCallback((assumption) => {
    if (!assumption) return;

    setDataContext(prev => {
      const existing = prev?.assumptions || [];

      // Check if this assumption already exists (by name)
      const index = existing.findIndex(a => a.name === assumption.name);

      let updated;
      if (index >= 0) {
        // Update existing
        updated = {
          ...prev,
          assumptions: [
            ...existing.slice(0, index),
            {
              ...assumption,
              updatedAt: new Date().toISOString()
            },
            ...existing.slice(index + 1)
          ]
        };
      } else {
        // Add new
        updated = {
          ...prev,
          assumptions: [
            ...existing,
            {
              ...assumption,
              registeredAt: new Date().toISOString()
            }
          ]
        };
      }

      // Update warning status
      const violations = updated.assumptions.filter(
        a => a.status === AssumptionStatus.VIOLATED
      ).length;
      const warnings = updated.assumptions.filter(
        a => a.status === AssumptionStatus.WARNING
      ).length;

      setWarningStatus({
        hasIssues: violations > 0 || warnings > 0,
        violations,
        warnings,
        message: violations > 0
          ? `${violations} assumption violation${violations > 1 ? 's' : ''} detected`
          : warnings > 0
            ? `${warnings} assumption warning${warnings > 1 ? 's' : ''}`
            : 'All assumptions met'
      });

      // Notify parent
      if (contextUpdateCallback.current) {
        contextUpdateCallback.current(updated);
      }

      return updated;
    });
  }, []);

  /**
   * Clear all Guardian data
   */
  const clearGuardianData = useCallback(() => {
    setLatestGuardianReport(null);
    setGuardianHistory([]);
    setWarningStatus({
      hasIssues: false,
      violations: 0,
      warnings: 0,
      message: 'No Guardian checks performed'
    });

    setDataContext(prev => {
      const updated = {
        ...prev,
        assumptions: [],
        guardianContext: null
      };

      if (contextUpdateCallback.current) {
        contextUpdateCallback.current(updated);
      }

      return updated;
    });
  }, []);

  /**
   * Update base data context (without Guardian data)
   *
   * @param {Object} newDataInfo - New dataset information
   */
  const updateDataInfo = useCallback((newDataInfo) => {
    setDataContext(prev => {
      const updated = {
        ...prev,
        datasetName: newDataInfo.name || newDataInfo.datasetName || prev?.datasetName,
        rows: newDataInfo.rows || newDataInfo.rowCount || prev?.rows,
        columns: newDataInfo.columns || newDataInfo.columnCount || prev?.columns,
        variables: newDataInfo.variables || prev?.variables || [],
        summary: newDataInfo.summary || prev?.summary || {}
      };

      if (contextUpdateCallback.current) {
        contextUpdateCallback.current(updated);
      }

      return updated;
    });
  }, []);

  /**
   * Get the AI prompt context string for current Guardian data
   * This can be prepended to user messages
   *
   * @returns {string} Prompt context string
   */
  const getAIPromptContext = useCallback(() => {
    if (!dataContext?.guardianContext) {
      return '';
    }
    return generateGuardianPromptContext(dataContext.guardianContext);
  }, [dataContext]);

  /**
   * Get summary card data for UI display
   *
   * @returns {Object|null} Summary card data
   */
  const getSummaryCard = useCallback(() => {
    if (!latestGuardianReport) {
      return null;
    }
    return createGuardianSummaryCard(latestGuardianReport);
  }, [latestGuardianReport]);

  /**
   * Check if there are any critical violations that should block the test
   *
   * @returns {boolean} True if test should be blocked
   */
  const shouldBlockTest = useCallback(() => {
    return warningStatus.violations > 0;
  }, [warningStatus]);

  /**
   * Get recommended alternative tests based on Guardian findings
   *
   * @returns {Array} List of alternative test names
   */
  const getAlternativeTests = useCallback(() => {
    return latestGuardianReport?.alternativeTests || [];
  }, [latestGuardianReport]);

  /**
   * Get list of all violated assumptions
   *
   * @returns {Array} List of violated assumptions
   */
  const getViolations = useCallback(() => {
    return latestGuardianReport?.violations || [];
  }, [latestGuardianReport]);

  /**
   * Get list of all warnings
   *
   * @returns {Array} List of assumption warnings
   */
  const getWarnings = useCallback(() => {
    return latestGuardianReport?.warnings || [];
  }, [latestGuardianReport]);

  return {
    // State
    dataContext,
    latestGuardianReport,
    guardianHistory,
    warningStatus,

    // Registration methods
    registerGuardianResult,
    registerAssumptionCheck,
    updateDataInfo,
    clearGuardianData,

    // Query methods
    getAIPromptContext,
    getSummaryCard,
    shouldBlockTest,
    getAlternativeTests,
    getViolations,
    getWarnings,

    // Direct setters (for external control)
    setDataContext
  };
};

export default useGuardianAIBridge;
