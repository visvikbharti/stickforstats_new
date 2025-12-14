/**
 * Guardian-AI Integration Utilities
 *
 * Bridges the Guardian Statistical Protection System with AI Advisor.
 * Formats Guardian warnings and assumption checks into AI-consumable context
 * so the AI can provide more targeted and relevant statistical guidance.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

/**
 * Severity levels for Guardian warnings
 */
export const GuardianSeverity = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  CRITICAL: 'critical'
};

/**
 * Assumption status constants
 */
export const AssumptionStatus = {
  MET: 'met',
  WARNING: 'warning',
  VIOLATED: 'violated',
  NOT_CHECKED: 'not_checked',
  NOT_APPLICABLE: 'not_applicable'
};

/**
 * Format a single Guardian assumption result for AI context
 *
 * @param {Object} assumption - Raw assumption check result from Guardian
 * @returns {Object} Formatted assumption for AI context
 */
export function formatAssumptionForAI(assumption) {
  if (!assumption) return null;

  // Normalize status
  const status = normalizeAssumptionStatus(assumption.status);

  // Build formatted object
  return {
    name: assumption.name || assumption.assumption_name || 'Unknown Assumption',
    status: status,
    severity: getAssumptionSeverity(status),
    testUsed: assumption.test_used || assumption.testUsed || null,
    statistic: assumption.statistic || assumption.test_statistic || null,
    pValue: assumption.p_value || assumption.pValue || null,
    threshold: assumption.threshold || assumption.alpha || 0.05,
    message: assumption.message || assumption.description || null,
    recommendation: assumption.recommendation || assumption.suggested_action || null,
    details: assumption.details || null
  };
}

/**
 * Normalize various status strings to standard format
 *
 * @param {string} status - Raw status from Guardian
 * @returns {string} Normalized status
 */
function normalizeAssumptionStatus(status) {
  if (!status) return AssumptionStatus.NOT_CHECKED;

  const lower = status.toLowerCase();

  if (['met', 'pass', 'passed', 'ok', 'satisfied', 'true'].includes(lower)) {
    return AssumptionStatus.MET;
  }
  if (['warning', 'marginal', 'borderline', 'caution'].includes(lower)) {
    return AssumptionStatus.WARNING;
  }
  if (['violated', 'fail', 'failed', 'error', 'false', 'not_met'].includes(lower)) {
    return AssumptionStatus.VIOLATED;
  }
  if (['not_applicable', 'na', 'n/a'].includes(lower)) {
    return AssumptionStatus.NOT_APPLICABLE;
  }

  return AssumptionStatus.NOT_CHECKED;
}

/**
 * Get severity level based on assumption status
 *
 * @param {string} status - Normalized assumption status
 * @returns {string} Severity level
 */
function getAssumptionSeverity(status) {
  switch (status) {
    case AssumptionStatus.VIOLATED:
      return GuardianSeverity.ERROR;
    case AssumptionStatus.WARNING:
      return GuardianSeverity.WARNING;
    case AssumptionStatus.MET:
      return GuardianSeverity.INFO;
    default:
      return GuardianSeverity.INFO;
  }
}

/**
 * Format a complete Guardian report for AI context
 *
 * @param {Object} guardianReport - Full Guardian validation report
 * @returns {Object} AI-ready context object
 */
export function formatGuardianReportForAI(guardianReport) {
  if (!guardianReport) return null;

  const violations = [];
  const warnings = [];
  const passed = [];

  // Process assumptions
  const assumptions = guardianReport.assumptions || guardianReport.checks || [];

  assumptions.forEach(assumption => {
    const formatted = formatAssumptionForAI(assumption);
    if (!formatted) return;

    switch (formatted.status) {
      case AssumptionStatus.VIOLATED:
        violations.push(formatted);
        break;
      case AssumptionStatus.WARNING:
        warnings.push(formatted);
        break;
      case AssumptionStatus.MET:
        passed.push(formatted);
        break;
      default:
        break;
    }
  });

  // Build summary
  const summary = buildGuardianSummary(violations, warnings, passed, guardianReport);

  return {
    // Structured data for the AI
    assumptions: [...violations, ...warnings, ...passed],
    violations: violations,
    warnings: warnings,
    passed: passed,

    // Summary info
    summary: summary,
    overallStatus: getOverallStatus(violations, warnings),
    recommendedAction: getRecommendedAction(violations, warnings, guardianReport),

    // Test context
    testType: guardianReport.test_type || guardianReport.testType || null,
    testBlocked: guardianReport.test_blocked || violations.length > 0,
    alternativeTests: guardianReport.alternative_tests || guardianReport.alternatives || [],

    // Timestamps
    checkedAt: new Date().toISOString()
  };
}

/**
 * Build a human-readable summary of Guardian findings
 *
 * @param {Array} violations - List of violated assumptions
 * @param {Array} warnings - List of assumption warnings
 * @param {Array} passed - List of passed assumptions
 * @param {Object} report - Original Guardian report
 * @returns {string} Summary text
 */
function buildGuardianSummary(violations, warnings, passed, report) {
  const parts = [];

  if (violations.length > 0) {
    parts.push(`${violations.length} assumption${violations.length > 1 ? 's' : ''} violated: ${violations.map(v => v.name).join(', ')}.`);
  }

  if (warnings.length > 0) {
    parts.push(`${warnings.length} assumption${warnings.length > 1 ? 's' : ''} showing warnings: ${warnings.map(w => w.name).join(', ')}.`);
  }

  if (violations.length === 0 && warnings.length === 0 && passed.length > 0) {
    parts.push(`All ${passed.length} assumptions met.`);
  }

  if (report.test_type) {
    parts.unshift(`Guardian check for ${report.test_type}:`);
  }

  return parts.join(' ');
}

/**
 * Determine overall status from violations and warnings
 *
 * @param {Array} violations - List of violated assumptions
 * @param {Array} warnings - List of assumption warnings
 * @returns {string} Overall status
 */
function getOverallStatus(violations, warnings) {
  if (violations.length > 0) return 'critical';
  if (warnings.length > 0) return 'warning';
  return 'ok';
}

/**
 * Get recommended action based on Guardian findings
 *
 * @param {Array} violations - List of violated assumptions
 * @param {Array} warnings - List of assumption warnings
 * @param {Object} report - Original Guardian report
 * @returns {string} Recommended action
 */
function getRecommendedAction(violations, warnings, report) {
  if (violations.length > 0) {
    if (report.alternative_tests && report.alternative_tests.length > 0) {
      return `Consider using ${report.alternative_tests[0]} or transform your data`;
    }
    return 'Do not proceed with this test. Consider non-parametric alternatives or data transformation.';
  }

  if (warnings.length > 0) {
    return 'Proceed with caution. Consider reporting assumption check results and sensitivity analyses.';
  }

  return 'Proceed with the analysis. Assumptions appear satisfied.';
}

/**
 * Generate an AI prompt prefix that includes Guardian context
 * This is prepended to user messages when Guardian data is available
 *
 * @param {Object} guardianContext - Formatted Guardian context from formatGuardianReportForAI
 * @returns {string} Prompt prefix for AI
 */
export function generateGuardianPromptContext(guardianContext) {
  if (!guardianContext || !guardianContext.assumptions || guardianContext.assumptions.length === 0) {
    return '';
  }

  const parts = ['[GUARDIAN STATISTICAL PROTECTION CONTEXT]'];
  parts.push('The following assumption checks have been performed on the user\'s data:\n');

  // List violations (highest priority)
  if (guardianContext.violations.length > 0) {
    parts.push('**VIOLATIONS (Action Required):**');
    guardianContext.violations.forEach(v => {
      parts.push(`- ${v.name}: VIOLATED`);
      if (v.pValue !== null) parts.push(`  Test p-value: ${v.pValue.toFixed(4)}`);
      if (v.message) parts.push(`  Details: ${v.message}`);
      if (v.recommendation) parts.push(`  Recommendation: ${v.recommendation}`);
    });
    parts.push('');
  }

  // List warnings
  if (guardianContext.warnings.length > 0) {
    parts.push('**WARNINGS (Proceed with Caution):**');
    guardianContext.warnings.forEach(w => {
      parts.push(`- ${w.name}: WARNING`);
      if (w.pValue !== null) parts.push(`  Test p-value: ${w.pValue.toFixed(4)}`);
      if (w.message) parts.push(`  Details: ${w.message}`);
    });
    parts.push('');
  }

  // List passed assumptions
  if (guardianContext.passed.length > 0) {
    parts.push('**PASSED:**');
    parts.push(guardianContext.passed.map(p => p.name).join(', '));
    parts.push('');
  }

  // Add test context
  if (guardianContext.testType) {
    parts.push(`Planned statistical test: ${guardianContext.testType}`);
  }

  if (guardianContext.alternativeTests && guardianContext.alternativeTests.length > 0) {
    parts.push(`Guardian-recommended alternatives: ${guardianContext.alternativeTests.join(', ')}`);
  }

  parts.push('\nPlease consider these Guardian findings when providing statistical guidance.');
  parts.push('[END GUARDIAN CONTEXT]\n');

  return parts.join('\n');
}

/**
 * Create a data context object with Guardian information for AI Advisor
 *
 * @param {Object} dataInfo - Basic dataset information
 * @param {Object} guardianReport - Guardian check results
 * @returns {Object} Complete data context for AI
 */
export function createAIDataContext(dataInfo, guardianReport = null) {
  const context = {
    // Dataset basics
    datasetName: dataInfo?.name || dataInfo?.datasetName || 'Unnamed Dataset',
    rows: dataInfo?.rows || dataInfo?.rowCount || 0,
    columns: dataInfo?.columns || dataInfo?.columnCount || 0,

    // Variables
    variables: (dataInfo?.variables || []).map(v => ({
      name: v.name,
      type: v.type || 'unknown',
      role: v.role || 'unknown', // DV, IV, covariate, etc.
      stats: v.stats || {}
    })),

    // Summary statistics
    summary: dataInfo?.summary || {},

    // Guardian assumptions
    assumptions: [],

    // Guardian context
    guardianContext: null
  };

  // Add Guardian data if available
  if (guardianReport) {
    const guardianContext = formatGuardianReportForAI(guardianReport);
    if (guardianContext) {
      context.assumptions = guardianContext.assumptions;
      context.guardianContext = guardianContext;
    }
  }

  return context;
}

/**
 * Merge Guardian results into existing data context
 * Useful for updating context after Guardian checks complete
 *
 * @param {Object} existingContext - Current AI data context
 * @param {Object} guardianReport - New Guardian check results
 * @returns {Object} Updated data context
 */
export function mergeGuardianIntoContext(existingContext, guardianReport) {
  if (!existingContext) {
    return createAIDataContext({}, guardianReport);
  }

  const guardianContext = formatGuardianReportForAI(guardianReport);

  return {
    ...existingContext,
    assumptions: guardianContext?.assumptions || existingContext.assumptions || [],
    guardianContext: guardianContext || existingContext.guardianContext
  };
}

/**
 * Check if data context has Guardian warnings that need attention
 *
 * @param {Object} dataContext - AI data context
 * @returns {Object} Warning status info
 */
export function checkGuardianWarningStatus(dataContext) {
  if (!dataContext?.guardianContext) {
    return {
      hasIssues: false,
      violations: 0,
      warnings: 0,
      message: 'No Guardian checks performed'
    };
  }

  const gc = dataContext.guardianContext;
  const violations = gc.violations?.length || 0;
  const warnings = gc.warnings?.length || 0;

  return {
    hasIssues: violations > 0 || warnings > 0,
    violations: violations,
    warnings: warnings,
    overallStatus: gc.overallStatus,
    message: gc.summary || 'Guardian check completed'
  };
}

/**
 * Get assumption checks for a specific test type
 * This returns the typical assumptions that should be checked
 *
 * @param {string} testType - Statistical test type
 * @returns {Array} List of assumptions to check
 */
export function getAssumptionsForTest(testType) {
  const assumptionsByTest = {
    't_test': ['normality', 'homogeneity_of_variance', 'independence'],
    'independent_t': ['normality', 'homogeneity_of_variance', 'independence'],
    'paired_t': ['normality_of_differences', 'independence'],
    'one_sample_t': ['normality', 'independence'],
    'anova': ['normality', 'homogeneity_of_variance', 'independence'],
    'one_way_anova': ['normality', 'homogeneity_of_variance', 'independence'],
    'two_way_anova': ['normality', 'homogeneity_of_variance', 'independence', 'no_interaction_if_testing_main_effects'],
    'repeated_measures_anova': ['normality', 'sphericity', 'independence_between_subjects'],
    'pearson': ['normality', 'linearity', 'homoscedasticity'],
    'spearman': ['monotonic_relationship'],
    'chi_square': ['expected_frequencies', 'independence'],
    'mann_whitney': ['similar_distributions', 'independence'],
    'wilcoxon': ['symmetric_distribution', 'independence'],
    'kruskal_wallis': ['similar_distributions', 'independence'],
    'regression': ['linearity', 'normality_of_residuals', 'homoscedasticity', 'independence', 'no_multicollinearity']
  };

  const normalized = testType?.toLowerCase()?.replace(/[-\s]/g, '_');
  return assumptionsByTest[normalized] || ['normality', 'independence'];
}

/**
 * Create a quick summary card data structure for UI display
 *
 * @param {Object} guardianContext - Formatted Guardian context
 * @returns {Object} Summary card data
 */
export function createGuardianSummaryCard(guardianContext) {
  if (!guardianContext) {
    return null;
  }

  const { violations, warnings, passed, testType, overallStatus } = guardianContext;

  // Determine card color/severity
  let cardColor, cardIcon;
  switch (overallStatus) {
    case 'critical':
      cardColor = '#f44336'; // Red
      cardIcon = 'error';
      break;
    case 'warning':
      cardColor = '#ff9800'; // Orange
      cardIcon = 'warning';
      break;
    default:
      cardColor = '#4caf50'; // Green
      cardIcon = 'check_circle';
  }

  return {
    title: testType ? `Guardian: ${testType}` : 'Guardian Check',
    color: cardColor,
    icon: cardIcon,
    status: overallStatus,
    stats: {
      violations: violations.length,
      warnings: warnings.length,
      passed: passed.length,
      total: violations.length + warnings.length + passed.length
    },
    summary: guardianContext.summary,
    recommendedAction: guardianContext.recommendedAction,
    alternativeTests: guardianContext.alternativeTests || []
  };
}

// Export default object with all utilities
export default {
  GuardianSeverity,
  AssumptionStatus,
  formatAssumptionForAI,
  formatGuardianReportForAI,
  generateGuardianPromptContext,
  createAIDataContext,
  mergeGuardianIntoContext,
  checkGuardianWarningStatus,
  getAssumptionsForTest,
  createGuardianSummaryCard
};
