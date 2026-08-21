/**
 * useGuardianReport Hook
 * ======================
 *
 * A React hook for handling Guardian report display from API responses.
 *
 * This hook extracts Guardian context from API responses and provides
 * ready-to-use props for the GuardianReportDisplay component.
 *
 * Design Contract Compliance:
 * - "No statistical result may exist without an explicit, traceable assumption context."
 * - This hook ensures Guardian context is always extracted and displayed
 *
 * Usage:
 * ```jsx
 * const { guardianProps, hasGuardianContext, isBlocked } = useGuardianReport(apiResponse);
 *
 * return (
 *   <>
 *     {hasGuardianContext && <GuardianReportDisplay {...guardianProps} />}
 *     {!isBlocked && <StatisticalResults data={apiResponse} />}
 *   </>
 * );
 * ```
 *
 * @author StickForStats Development Team
 * @date 2026-01-26
 */

import { useMemo } from 'react';

/**
 * Extract Guardian context from an API response
 *
 * @param {Object|null} response - API response that may contain Guardian context
 * @returns {Object} Extracted Guardian props and state flags
 */
const useGuardianReport = (response) => {
  return useMemo(() => {
    // Handle null/undefined response
    if (!response) {
      return {
        guardianProps: null,
        hasGuardianContext: false,
        isBlocked: false,
        confidenceScore: 0,
        violations: [],
        canProceed: true,
      };
    }

    // Check for Guardian context presence
    const hasGuardianContext = Boolean(
      response._guardian_context ||
      response.guardian_report ||
      response.assumptions_checked
    );

    // Check if analysis was blocked
    const isBlocked = Boolean(response.blocked);

    // Extract Guardian props for display component
    const guardianProps = hasGuardianContext
      ? {
          guardianReport: response.guardian_report || null,
          assumptionsChecked: response.assumptions_checked || [],
          // Required by the test but NOT examined on this data, and how much of the
          // requirement set that leaves. `assumptions_checked` used to be the requirements
          // list itself, so it named checks nothing had performed -- independence on 22 of 25
          // test types. Now that it is truthful it is also NARROWER, and without these two the
          // UI would silently drop a requirement rather than report it as unexamined.
          assumptionsNotEvaluated: response.assumptions_not_evaluated || [],
          // null (not 0) when the backend does not supply it: 0.0 is a real, meaningful
          // coverage value ("nothing was examined") and must not be confused with "unknown".
          assumptionCoverage: response.assumption_coverage ?? null,
          violations: response.violations || [],
          confidenceScore: response.confidence_score ?? 0,
          canProceed: response.can_proceed ?? true,
          alternativeTests: response.alternative_tests || [],
          expertModeOverride: response.expert_mode_override ?? false,
        }
      : null;

    return {
      guardianProps,
      hasGuardianContext,
      isBlocked,
      confidenceScore: response.confidence_score ?? 0,
      violations: response.violations || [],
      canProceed: response.can_proceed ?? true,
    };
  }, [response]);
};

/**
 * Helper function to check if a response is Guardian-compliant
 *
 * @param {Object} response - API response to check
 * @returns {boolean} True if response includes Guardian context
 */
export const isGuardianCompliant = (response) => {
  if (!response) return false;
  return Boolean(
    response._contract_compliant ||
    (response.guardian_report && response.assumptions_checked)
  );
};

/**
 * Helper function to get severity level summary from violations
 *
 * @param {Array} violations - Array of violation objects
 * @returns {Object} Counts by severity level
 */
export const getViolationSummary = (violations = []) => {
  return violations.reduce(
    (acc, v) => {
      const severity = v.severity || 'info';
      acc[severity] = (acc[severity] || 0) + 1;
      acc.total += 1;
      return acc;
    },
    { critical: 0, warning: 0, info: 0, total: 0 }
  );
};

/**
 * Helper function to determine if expert mode should be suggested
 *
 * @param {Object} guardianProps - Extracted Guardian props
 * @returns {boolean} True if expert mode would help
 */
export const shouldSuggestExpertMode = (guardianProps) => {
  if (!guardianProps) return false;
  if (guardianProps.canProceed) return false;

  // Suggest expert mode if blocked but confidence is reasonable
  return guardianProps.confidenceScore >= 50;
};

/**
 * Helper function to get a user-friendly message about Guardian status
 *
 * @param {Object} guardianProps - Extracted Guardian props
 * @returns {Object} Status message and severity
 */
export const getGuardianStatusMessage = (guardianProps) => {
  if (!guardianProps) {
    return {
      message: 'No assumption validation available',
      severity: 'warning',
    };
  }

  const { violations, confidenceScore, canProceed, expertModeOverride } = guardianProps;
  const summary = getViolationSummary(violations);

  if (expertModeOverride) {
    return {
      message: `Expert mode override active. Results should be interpreted with caution.`,
      severity: 'warning',
    };
  }

  if (!canProceed) {
    return {
      message: `Analysis blocked due to ${summary.critical} critical violation(s). Enable expert mode to proceed.`,
      severity: 'error',
    };
  }

  if (summary.critical > 0) {
    return {
      message: `${summary.critical} critical assumption violation(s) detected.`,
      severity: 'error',
    };
  }

  if (summary.warning > 0) {
    return {
      message: `${summary.warning} assumption warning(s). Results may require careful interpretation.`,
      severity: 'warning',
    };
  }

  if (confidenceScore >= 80) {
    return {
      message: `All assumptions validated. Confidence: ${confidenceScore.toFixed(0)}%`,
      severity: 'success',
    };
  }

  return {
    message: `Assumptions checked. Confidence: ${confidenceScore.toFixed(0)}%`,
    severity: 'info',
  };
};

export default useGuardianReport;
