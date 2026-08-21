/**
 * useGuardianReport Hook Tests
 * ============================
 *
 * Tests for the Guardian report extraction hook.
 *
 * Design Contract Compliance:
 * - "No statistical result may exist without an explicit, traceable assumption context."
 * - This hook ensures Guardian context is properly extracted from API responses
 *
 * @author StickForStats Development Team
 * @date 2026-01-26
 */

import { renderHook } from '@testing-library/react';
import useGuardianReport, {
  isGuardianCompliant,
  getViolationSummary,
  shouldSuggestExpertMode,
  getGuardianStatusMessage,
} from '../useGuardianReport';

describe('useGuardianReport Hook', () => {
  describe('Basic Functionality', () => {
    it('should return default values for null response', () => {
      const { result } = renderHook(() => useGuardianReport(null));

      expect(result.current.guardianProps).toBeNull();
      expect(result.current.hasGuardianContext).toBe(false);
      expect(result.current.isBlocked).toBe(false);
      expect(result.current.confidenceScore).toBe(0);
      expect(result.current.violations).toEqual([]);
      expect(result.current.canProceed).toBe(true);
    });

    it('should return default values for undefined response', () => {
      const { result } = renderHook(() => useGuardianReport(undefined));

      expect(result.current.hasGuardianContext).toBe(false);
      expect(result.current.guardianProps).toBeNull();
    });

    it('should detect Guardian context from _guardian_context flag', () => {
      const response = {
        _guardian_context: true,
        confidence_score: 85,
        assumptions_checked: ['normality'],
        violations: [],
      };

      const { result } = renderHook(() => useGuardianReport(response));

      expect(result.current.hasGuardianContext).toBe(true);
    });

    it('should detect Guardian context from guardian_report', () => {
      const response = {
        guardian_report: { test_type: 't_test' },
        confidence_score: 90,
      };

      const { result } = renderHook(() => useGuardianReport(response));

      expect(result.current.hasGuardianContext).toBe(true);
    });

    it('should detect Guardian context from assumptions_checked', () => {
      const response = {
        assumptions_checked: ['normality', 'homogeneity'],
        confidence_score: 75,
      };

      const { result } = renderHook(() => useGuardianReport(response));

      expect(result.current.hasGuardianContext).toBe(true);
    });
  });

  describe('Guardian Props Extraction', () => {
    it('should extract all Guardian props correctly', () => {
      const response = {
        _guardian_context: true,
        guardian_report: { test_type: 't_test' },
        assumptions_checked: ['normality', 'homogeneity'],
        assumptions_not_evaluated: ['independence'],
        assumption_coverage: 0.667,
        violations: [{ severity: 'warning', assumption: 'normality' }],
        confidence_score: 75.5,
        can_proceed: true,
        alternative_tests: ['welch_t_test'],
        expert_mode_override: false,
      };

      const { result } = renderHook(() => useGuardianReport(response));

      expect(result.current.guardianProps).toEqual({
        guardianReport: { test_type: 't_test' },
        assumptionsChecked: ['normality', 'homogeneity'],
        // Required but NOT examined, plus how much of the requirement set that leaves.
        // `assumptions_checked` used to be the REQUIREMENTS list, so it named checks nothing
        // had performed; now that it is truthful it is also narrower, and these two are what
        // stop the UI silently dropping a requirement instead of reporting it as unexamined.
        assumptionsNotEvaluated: ['independence'],
        assumptionCoverage: 0.667,
        violations: [{ severity: 'warning', assumption: 'normality' }],
        confidenceScore: 75.5,
        canProceed: true,
        alternativeTests: ['welch_t_test'],
        expertModeOverride: false,
      });
    });

    it('should handle missing optional fields with defaults', () => {
      const response = {
        _guardian_context: true,
        // Missing: guardian_report, violations, alternative_tests, etc.
      };

      const { result } = renderHook(() => useGuardianReport(response));

      expect(result.current.guardianProps.guardianReport).toBeNull();
      expect(result.current.guardianProps.assumptionsChecked).toEqual([]);
      expect(result.current.guardianProps.violations).toEqual([]);
      expect(result.current.guardianProps.confidenceScore).toBe(0);
      expect(result.current.guardianProps.canProceed).toBe(true);
      expect(result.current.guardianProps.alternativeTests).toEqual([]);
      expect(result.current.guardianProps.expertModeOverride).toBe(false);
    });
  });

  describe('Blocked Analysis Detection', () => {
    it('should detect blocked analysis', () => {
      const response = {
        blocked: true,
        _guardian_context: true,
      };

      const { result } = renderHook(() => useGuardianReport(response));

      expect(result.current.isBlocked).toBe(true);
    });

    it('should not flag as blocked when blocked is false', () => {
      const response = {
        blocked: false,
        _guardian_context: true,
      };

      const { result } = renderHook(() => useGuardianReport(response));

      expect(result.current.isBlocked).toBe(false);
    });
  });

  describe('Memoization', () => {
    it('should return same object reference for same response', () => {
      const response = { _guardian_context: true, confidence_score: 80 };
      const { result, rerender } = renderHook(() => useGuardianReport(response));

      const firstResult = result.current;
      rerender();
      const secondResult = result.current;

      expect(firstResult).toBe(secondResult);
    });
  });
});

describe('isGuardianCompliant Helper', () => {
  it('should return false for null response', () => {
    expect(isGuardianCompliant(null)).toBe(false);
  });

  it('should return true when _contract_compliant is true', () => {
    expect(isGuardianCompliant({ _contract_compliant: true })).toBe(true);
  });

  it('should return true when both guardian_report and assumptions_checked exist', () => {
    expect(
      isGuardianCompliant({
        guardian_report: {},
        assumptions_checked: [],
      })
    ).toBe(true);
  });

  it('should return false when only one field exists', () => {
    expect(isGuardianCompliant({ guardian_report: {} })).toBe(false);
    expect(isGuardianCompliant({ assumptions_checked: [] })).toBe(false);
  });
});

describe('getViolationSummary Helper', () => {
  it('should return zero counts for empty array', () => {
    const summary = getViolationSummary([]);

    expect(summary).toEqual({
      critical: 0,
      warning: 0,
      info: 0,
      total: 0,
    });
  });

  it('should count violations by severity', () => {
    const violations = [
      { severity: 'critical' },
      { severity: 'critical' },
      { severity: 'warning' },
      { severity: 'info' },
    ];

    const summary = getViolationSummary(violations);

    expect(summary.critical).toBe(2);
    expect(summary.warning).toBe(1);
    expect(summary.info).toBe(1);
    expect(summary.total).toBe(4);
  });

  it('should treat missing severity as info', () => {
    const violations = [{ assumption: 'normality' }]; // No severity

    const summary = getViolationSummary(violations);

    expect(summary.info).toBe(1);
    expect(summary.total).toBe(1);
  });

  it('should handle undefined violations', () => {
    const summary = getViolationSummary(undefined);

    expect(summary.total).toBe(0);
  });
});

describe('shouldSuggestExpertMode Helper', () => {
  it('should return false for null props', () => {
    expect(shouldSuggestExpertMode(null)).toBe(false);
  });

  it('should return false when canProceed is true', () => {
    expect(
      shouldSuggestExpertMode({ canProceed: true, confidenceScore: 60 })
    ).toBe(false);
  });

  it('should return true when blocked but confidence >= 50', () => {
    expect(
      shouldSuggestExpertMode({ canProceed: false, confidenceScore: 50 })
    ).toBe(true);
  });

  it('should return false when blocked and confidence < 50', () => {
    expect(
      shouldSuggestExpertMode({ canProceed: false, confidenceScore: 49 })
    ).toBe(false);
  });
});

describe('getGuardianStatusMessage Helper', () => {
  it('should return warning for null props', () => {
    const status = getGuardianStatusMessage(null);

    expect(status.severity).toBe('warning');
    expect(status.message).toContain('No assumption validation');
  });

  it('should return warning for expert mode override', () => {
    const status = getGuardianStatusMessage({
      expertModeOverride: true,
      violations: [],
      confidenceScore: 80,
      canProceed: true,
    });

    expect(status.severity).toBe('warning');
    expect(status.message).toContain('Expert mode override');
  });

  it('should return error when analysis blocked', () => {
    const status = getGuardianStatusMessage({
      canProceed: false,
      violations: [{ severity: 'critical' }],
      confidenceScore: 30,
    });

    expect(status.severity).toBe('error');
    expect(status.message).toContain('blocked');
  });

  it('should return error for critical violations', () => {
    const status = getGuardianStatusMessage({
      canProceed: true,
      violations: [{ severity: 'critical' }],
      confidenceScore: 60,
    });

    expect(status.severity).toBe('error');
    expect(status.message).toContain('critical');
  });

  it('should return warning for warning violations', () => {
    const status = getGuardianStatusMessage({
      canProceed: true,
      violations: [{ severity: 'warning' }],
      confidenceScore: 70,
    });

    expect(status.severity).toBe('warning');
    expect(status.message).toContain('warning');
  });

  it('should return success for high confidence with no issues', () => {
    const status = getGuardianStatusMessage({
      canProceed: true,
      violations: [],
      confidenceScore: 85,
    });

    expect(status.severity).toBe('success');
    expect(status.message).toContain('85%');
  });

  it('should return info for moderate confidence', () => {
    const status = getGuardianStatusMessage({
      canProceed: true,
      violations: [],
      confidenceScore: 70,
    });

    expect(status.severity).toBe('info');
    expect(status.message).toContain('70%');
  });
});

describe('Design Contract Compliance', () => {
  it('should enforce "No statistical result without Guardian context"', () => {
    // Non-compliant response (no Guardian context)
    const nonCompliantResponse = {
      t_statistic: 2.5,
      p_value: 0.01,
      // Missing all Guardian context
    };

    const { result } = renderHook(() => useGuardianReport(nonCompliantResponse));

    // Should indicate no Guardian context
    expect(result.current.hasGuardianContext).toBe(false);
    expect(result.current.guardianProps).toBeNull();

    // Compliant response
    const compliantResponse = {
      t_statistic: 2.5,
      p_value: 0.01,
      _guardian_context: true,
      guardian_report: { test_type: 't_test' },
      assumptions_checked: ['normality'],
      violations: [],
      confidence_score: 90,
      can_proceed: true,
    };

    const { result: compliantResult } = renderHook(() =>
      useGuardianReport(compliantResponse)
    );

    expect(compliantResult.current.hasGuardianContext).toBe(true);
    expect(compliantResult.current.guardianProps).not.toBeNull();
  });
});

describe('useGuardianReport — unexamined assumptions and coverage', () => {
  it('preserves a coverage of 0 instead of collapsing it to "unknown"', () => {
    // THE FALSY TRAP, at the mapping layer. Coverage 0.0 is a real and important value --
    // "we examined NOTHING" -- and it is exactly what cox_regression, survival, iv, psm,
    // propensity_score, did, difference_in_differences and bayesian_correlation return.
    // `??` keeps it; `||` would turn the single worst case into the same value as "the backend
    // did not tell us", which the UI then hides.
    // MUTATION: `response.assumption_coverage ?? null` -> `|| null` -> this returns null and fails.
    const { result } = renderHook(() =>
      useGuardianReport({
        _guardian_context: true,
        assumptions_checked: [],
        assumptions_not_evaluated: ['independence'],
        assumption_coverage: 0,
        confidence_score: 44.4,
      })
    );
    expect(result.current.guardianProps.assumptionCoverage).toBe(0);
    expect(result.current.guardianProps.assumptionsNotEvaluated).toEqual(['independence']);
  });

  it('defaults to an empty list and an unknown coverage when the backend omits them', () => {
    // A response from an older backend (or a cached one) must not crash the panel, and must
    // not claim coverage it was never told about.
    // MUTATION: default assumptionCoverage to 0 instead of null -> a report with no coverage
    // information renders as "0% examined", which is a lie in the damaging direction, and this
    // fails.
    const { result } = renderHook(() =>
      useGuardianReport({ _guardian_context: true, assumptions_checked: ['normality'] })
    );
    expect(result.current.guardianProps.assumptionsNotEvaluated).toEqual([]);
    expect(result.current.guardianProps.assumptionCoverage).toBeNull();
  });
});
