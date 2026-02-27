/**
 * Statistical Debugger Engine
 *
 * Core logic for analyzing statistical test results and identifying issues.
 * Provides comprehensive debugging for unexpected results, assumption violations,
 * power issues, and common pitfalls.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

import jstat from 'jstat';

/**
 * Main debugging analysis function
 * @param {Object} params - Analysis parameters
 * @returns {Object} Complete debug report
 */
export function analyzeTestResults(params) {
  const {
    testType,
    data,
    results,
    assumptions,
    options = {}
  } = params;

  const report = {
    timestamp: new Date().toISOString(),
    testType,
    overallStatus: 'unknown',
    issues: [],
    warnings: [],
    recommendations: [],
    insights: [],
    powerAnalysis: null,
    assumptionAnalysis: null,
    dataQuality: null,
    sensitivity: null
  };

  // 1. Analyze p-value and significance
  const pValueAnalysis = analyzePValue(results, options.alpha || 0.05);
  report.pValueAnalysis = pValueAnalysis;
  if (pValueAnalysis.issues.length > 0) {
    report.issues.push(...pValueAnalysis.issues);
  }
  if (pValueAnalysis.warnings.length > 0) {
    report.warnings.push(...pValueAnalysis.warnings);
  }

  // 2. Retrospective power analysis
  const powerAnalysis = analyzeRetrospectivePower(testType, data, results, options);
  report.powerAnalysis = powerAnalysis;
  if (powerAnalysis.issues.length > 0) {
    report.issues.push(...powerAnalysis.issues);
  }

  // 3. Assumption violation analysis
  const assumptionAnalysis = analyzeAssumptions(testType, assumptions, data);
  report.assumptionAnalysis = assumptionAnalysis;
  if (assumptionAnalysis.issues.length > 0) {
    report.issues.push(...assumptionAnalysis.issues);
  }

  // 4. Data quality analysis
  const dataQuality = analyzeDataQuality(data, testType);
  report.dataQuality = dataQuality;
  if (dataQuality.issues.length > 0) {
    report.issues.push(...dataQuality.issues);
  }

  // 5. Sensitivity analysis
  const sensitivity = performSensitivityAnalysis(testType, data, results, options);
  report.sensitivity = sensitivity;

  // 6. Generate test-specific insights
  report.insights = generateTestSpecificInsights(testType, report);

  // 7. Generate recommendations
  report.recommendations = generateRecommendations(report, testType);

  // 8. Determine overall status
  report.overallStatus = determineOverallStatus(report);

  return report;
}

/**
 * Analyze p-value for common issues
 */
function analyzePValue(results, alpha = 0.05) {
  const analysis = {
    pValue: results.pValue,
    alpha,
    significant: results.pValue < alpha,
    issues: [],
    warnings: [],
    interpretation: ''
  };

  if (results.pValue === undefined || results.pValue === null) {
    analysis.issues.push({
      type: 'missing_pvalue',
      severity: 'error',
      message: 'No p-value available for analysis',
      explanation: 'The test did not produce a valid p-value. This may indicate a calculation error or invalid data.'
    });
    return analysis;
  }

  // Check for borderline significance
  const marginOfSignificance = Math.abs(results.pValue - alpha);

  if (marginOfSignificance < 0.01) {
    analysis.warnings.push({
      type: 'borderline_significance',
      severity: 'warning',
      message: `P-value (${results.pValue.toFixed(4)}) is very close to alpha (${alpha})`,
      explanation: 'Results this close to the significance threshold should be interpreted with caution. Small changes in data or analysis could flip the conclusion.',
      details: {
        pValue: results.pValue,
        alpha,
        difference: marginOfSignificance,
        percentFromThreshold: ((marginOfSignificance / alpha) * 100).toFixed(1)
      }
    });
  }

  // Check for p-hacking indicators
  if (results.pValue > 0.04 && results.pValue < 0.05) {
    analysis.warnings.push({
      type: 'suspicious_pvalue',
      severity: 'info',
      message: 'P-value falls in the "suspiciously significant" range (0.04-0.05)',
      explanation: 'P-values just below 0.05 are sometimes flagged in meta-analyses as potential indicators of selective reporting. This is not necessarily problematic but warrants transparency in reporting.'
    });
  }

  // Very small p-values
  if (results.pValue < 0.001) {
    analysis.interpretation = 'highly_significant';
    analysis.warnings.push({
      type: 'very_small_pvalue',
      severity: 'info',
      message: 'Very small p-value detected',
      explanation: 'Extremely small p-values often indicate either a large effect, large sample size, or both. Consider focusing on effect size for practical significance.'
    });
  } else if (results.pValue < 0.01) {
    analysis.interpretation = 'significant';
  } else if (results.pValue < 0.05) {
    analysis.interpretation = 'marginally_significant';
  } else if (results.pValue < 0.10) {
    analysis.interpretation = 'trend';
    analysis.warnings.push({
      type: 'marginal_trend',
      severity: 'info',
      message: `P-value (${results.pValue.toFixed(4)}) shows a trend (p < 0.10) but is not significant at α = ${alpha}`,
      explanation: 'This result may warrant further investigation with a larger sample size, but should not be reported as significant.'
    });
  } else {
    analysis.interpretation = 'not_significant';
  }

  // p = 1.0 or p = 0 (numerical issues)
  if (results.pValue === 0) {
    analysis.warnings.push({
      type: 'pvalue_zero',
      severity: 'warning',
      message: 'P-value is exactly 0 (likely numerical underflow)',
      explanation: 'A p-value of exactly 0 is mathematically impossible and indicates the true p-value is smaller than can be represented. Report as p < 0.001 or similar.'
    });
  }

  if (results.pValue === 1) {
    analysis.warnings.push({
      type: 'pvalue_one',
      severity: 'info',
      message: 'P-value is exactly 1.0',
      explanation: 'This typically indicates the observed data is very consistent with the null hypothesis. No effect is detected.'
    });
  }

  return analysis;
}

/**
 * Perform retrospective power analysis
 */
function analyzeRetrospectivePower(testType, data, results, options) {
  const analysis = {
    observedEffectSize: null,
    observedPower: null,
    requiredSampleSize: null,
    actualSampleSize: null,
    powerStatus: 'unknown',
    issues: [],
    recommendations: []
  };

  // Calculate observed effect size
  const effectSize = calculateObservedEffectSize(testType, data, results);
  analysis.observedEffectSize = effectSize;

  // Get sample size
  const n = getSampleSize(data, testType);
  analysis.actualSampleSize = n;

  if (effectSize === null || n === null) {
    return analysis;
  }

  // Calculate observed power
  const alpha = options.alpha || 0.05;
  const power = calculatePower(testType, effectSize, n, alpha);
  analysis.observedPower = power;

  // Calculate required sample size for 80% power
  const requiredN = calculateRequiredSampleSize(testType, effectSize, 0.80, alpha);
  analysis.requiredSampleSize = requiredN;

  // Determine power status
  if (power >= 0.80) {
    analysis.powerStatus = 'adequate';
  } else if (power >= 0.50) {
    analysis.powerStatus = 'moderate';
    analysis.issues.push({
      type: 'moderate_power',
      severity: 'warning',
      message: `Study power is moderate (${(power * 100).toFixed(1)}%)`,
      explanation: `With the observed effect size (${effectSize.toFixed(3)}), your study had only ${(power * 100).toFixed(1)}% power to detect this effect. The conventional threshold is 80%.`,
      details: {
        observedPower: power,
        observedEffectSize: effectSize,
        requiredN: requiredN,
        actualN: n,
        shortfall: requiredN - n
      }
    });
  } else {
    analysis.powerStatus = 'underpowered';
    analysis.issues.push({
      type: 'underpowered',
      severity: 'error',
      message: `Study is significantly underpowered (${(power * 100).toFixed(1)}%)`,
      explanation: `With only ${(power * 100).toFixed(1)}% power, there is a ${((1 - power) * 100).toFixed(1)}% chance of missing a true effect of this size. You would need approximately ${requiredN} participants for 80% power.`,
      details: {
        observedPower: power,
        observedEffectSize: effectSize,
        requiredN: requiredN,
        actualN: n,
        shortfall: requiredN - n,
        typeIIErrorRate: 1 - power
      }
    });
  }

  // Special case: significant result but low power
  if (results.pValue < alpha && power < 0.50) {
    analysis.issues.push({
      type: 'winner_curse',
      severity: 'warning',
      message: 'Significant result with low power - potential "winner\'s curse"',
      explanation: 'When a significant result is found in an underpowered study, the observed effect size is likely inflated. This is known as the "winner\'s curse" or Type M error. Replication studies often find smaller effects.'
    });
  }

  // Non-significant result interpretation
  if (results.pValue >= alpha && power < 0.80) {
    analysis.recommendations.push({
      type: 'inconclusive',
      message: 'Non-significant result may be due to insufficient power',
      action: `Consider this result inconclusive rather than evidence of no effect. A sample of ${requiredN} would be needed to adequately test this hypothesis.`
    });
  }

  return analysis;
}

/**
 * Analyze assumption violations
 */
function analyzeAssumptions(testType, assumptions, data) {
  const analysis = {
    violations: [],
    passed: [],
    issues: [],
    overallValidity: 'valid'
  };

  if (!assumptions || Object.keys(assumptions).length === 0) {
    analysis.issues.push({
      type: 'no_assumptions_checked',
      severity: 'warning',
      message: 'No assumption checks were performed',
      explanation: 'Statistical tests have assumptions that should be verified. Without checking, results may be invalid.'
    });
    analysis.overallValidity = 'unknown';
    return analysis;
  }

  // Process Guardian report format
  const guardianViolations = assumptions.violations || [];
  const guardianWarnings = assumptions.warnings || [];

  // Map violations to issues
  guardianViolations.forEach(violation => {
    analysis.violations.push(violation);

    const severity = getViolationSeverity(violation, testType);
    const impact = getViolationImpact(violation, testType, data);

    analysis.issues.push({
      type: `assumption_${violation.type || 'violation'}`,
      severity: severity,
      message: violation.message || `Assumption violation: ${violation.type}`,
      explanation: impact.explanation,
      recommendation: impact.recommendation,
      details: violation
    });
  });

  // Process warnings
  guardianWarnings.forEach(warning => {
    analysis.issues.push({
      type: `assumption_warning_${warning.type || 'general'}`,
      severity: 'warning',
      message: warning.message,
      explanation: warning.explanation || 'This may affect the validity of your results.',
      details: warning
    });
  });

  // Determine overall validity
  const criticalViolations = analysis.issues.filter(i => i.severity === 'error').length;
  const warnings = analysis.issues.filter(i => i.severity === 'warning').length;

  if (criticalViolations > 0) {
    analysis.overallValidity = 'invalid';
  } else if (warnings > 0) {
    analysis.overallValidity = 'caution';
  } else {
    analysis.overallValidity = 'valid';
  }

  return analysis;
}

/**
 * Analyze data quality
 */
function analyzeDataQuality(data, testType) {
  const analysis = {
    sampleSize: null,
    outliers: [],
    distributionIssues: [],
    issues: [],
    quality: 'good'
  };

  if (!data) return analysis;

  // Get all numeric values from data
  const values = extractNumericValues(data);

  if (values.length === 0) {
    analysis.issues.push({
      type: 'no_data',
      severity: 'error',
      message: 'No numeric data available for analysis',
      explanation: 'The debugger could not extract numeric values from the provided data.'
    });
    analysis.quality = 'poor';
    return analysis;
  }

  analysis.sampleSize = values.length;

  // Check sample size adequacy
  const minSampleSize = getMinimumSampleSize(testType);
  if (values.length < minSampleSize) {
    analysis.issues.push({
      type: 'small_sample',
      severity: 'warning',
      message: `Sample size (n=${values.length}) is below recommended minimum (n=${minSampleSize})`,
      explanation: `For ${testType}, a sample size of at least ${minSampleSize} is generally recommended for reliable results.`
    });
  }

  // Detect outliers using Tukey's method
  const outliers = detectOutliers(values);
  analysis.outliers = outliers;

  if (outliers.length > 0) {
    const outlierPercentage = (outliers.length / values.length) * 100;

    if (outlierPercentage > 10) {
      analysis.issues.push({
        type: 'many_outliers',
        severity: 'error',
        message: `High proportion of outliers detected (${outlierPercentage.toFixed(1)}%)`,
        explanation: `${outliers.length} values are outside the expected range. This may indicate data entry errors, a non-normal distribution, or genuine extreme values that require special handling.`,
        details: {
          outlierCount: outliers.length,
          outlierPercentage,
          outlierValues: outliers.slice(0, 5) // First 5 for display
        }
      });
    } else if (outliers.length > 0) {
      analysis.issues.push({
        type: 'outliers_present',
        severity: 'warning',
        message: `${outliers.length} potential outlier(s) detected`,
        explanation: 'Outliers can strongly influence parametric tests. Consider robust methods or sensitivity analysis.',
        details: {
          outlierCount: outliers.length,
          outlierValues: outliers
        }
      });
    }
  }

  // Check for floor/ceiling effects
  const floorCeiling = detectFloorCeilingEffects(values);
  if (floorCeiling.floor || floorCeiling.ceiling) {
    analysis.issues.push({
      type: 'floor_ceiling',
      severity: 'warning',
      message: floorCeiling.floor ? 'Potential floor effect detected' : 'Potential ceiling effect detected',
      explanation: 'A large proportion of values are at the minimum or maximum, which can restrict variance and affect statistical power.',
      details: floorCeiling
    });
  }

  // Check for restricted range
  const _range = Math.max(...values) - Math.min(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const cv = (Math.sqrt(values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length)) / Math.abs(mean);

  if (cv < 0.1 && testType.includes('correlation')) {
    analysis.issues.push({
      type: 'restricted_range',
      severity: 'warning',
      message: 'Low variability detected - potential restricted range',
      explanation: 'When variables have restricted ranges, correlations are attenuated. The true correlation may be stronger than observed.'
    });
  }

  // Determine overall quality
  const errorCount = analysis.issues.filter(i => i.severity === 'error').length;
  const warningCount = analysis.issues.filter(i => i.severity === 'warning').length;

  if (errorCount > 0) {
    analysis.quality = 'poor';
  } else if (warningCount > 2) {
    analysis.quality = 'moderate';
  } else if (warningCount > 0) {
    analysis.quality = 'acceptable';
  } else {
    analysis.quality = 'good';
  }

  return analysis;
}

/**
 * Perform sensitivity analysis
 */
function performSensitivityAnalysis(testType, data, results, options) {
  const analysis = {
    outlierSensitivity: null,
    alphaLevelSensitivity: null,
    methodSensitivity: null
  };

  // How would removing outliers affect results?
  const values = extractNumericValues(data);
  const outliers = detectOutliers(values);

  if (outliers.length > 0 && outliers.length < values.length * 0.2) {
    const cleanValues = values.filter(v => !outliers.includes(v));
    // Note: We can't recalculate the full test here, but we can note the potential impact
    analysis.outlierSensitivity = {
      originalN: values.length,
      cleanN: cleanValues.length,
      outliersRemoved: outliers.length,
      recommendation: 'Consider running the analysis with and without outliers to assess their impact.'
    };
  }

  // How would different alpha levels change conclusion?
  const pValue = results.pValue;
  if (pValue !== undefined) {
    analysis.alphaLevelSensitivity = {
      significantAt: {
        alpha_0_10: pValue < 0.10,
        alpha_0_05: pValue < 0.05,
        alpha_0_01: pValue < 0.01,
        alpha_0_001: pValue < 0.001
      },
      currentAlpha: options.alpha || 0.05,
      recommendation: pValue > 0.01 && pValue < 0.10
        ? 'Result sensitivity to alpha level suggests careful interpretation is needed.'
        : null
    };
  }

  return analysis;
}

/**
 * Generate test-specific insights
 */
function generateTestSpecificInsights(testType, report) {
  const insights = [];

  // Effect size interpretation
  if (report.powerAnalysis?.observedEffectSize) {
    const es = report.powerAnalysis.observedEffectSize;
    const interpretation = interpretEffectSize(es, testType);
    insights.push({
      type: 'effect_size',
      title: 'Effect Size Interpretation',
      content: interpretation
    });
  }

  // Practical significance
  if (report.pValueAnalysis?.significant && report.powerAnalysis?.observedEffectSize) {
    const es = report.powerAnalysis.observedEffectSize;
    if (es < 0.2) {
      insights.push({
        type: 'practical_significance',
        title: 'Statistical vs Practical Significance',
        content: 'While statistically significant, the effect size is small. Consider whether this effect is meaningful in your research context.'
      });
    }
  }

  // Sample size reflection
  if (report.dataQuality?.sampleSize) {
    const n = report.dataQuality.sampleSize;
    if (n > 1000 && report.pValueAnalysis?.significant) {
      insights.push({
        type: 'large_sample',
        title: 'Large Sample Note',
        content: 'With large samples, even trivial effects can be statistically significant. Focus on effect size and confidence intervals for practical interpretation.'
      });
    }
  }

  return insights;
}

/**
 * Generate recommendations based on analysis
 */
function generateRecommendations(report, testType) {
  const recommendations = [];

  // Based on assumption violations
  if (report.assumptionAnalysis?.violations?.length > 0) {
    const alternatives = getAlternativeTests(testType, report.assumptionAnalysis.violations);
    if (alternatives.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'alternative_test',
        title: 'Consider Alternative Tests',
        content: `Given the assumption violations, consider using: ${alternatives.join(', ')}`,
        tests: alternatives
      });
    }
  }

  // Based on power issues
  if (report.powerAnalysis?.powerStatus === 'underpowered') {
    recommendations.push({
      priority: 'high',
      category: 'sample_size',
      title: 'Increase Sample Size',
      content: `For adequate power (80%), approximately ${report.powerAnalysis.requiredSampleSize} participants would be needed.`
    });
  }

  // Based on data quality
  if (report.dataQuality?.outliers?.length > 0) {
    recommendations.push({
      priority: 'medium',
      category: 'outliers',
      title: 'Address Outliers',
      content: 'Consider: (1) Verify outliers are not data entry errors, (2) Run analysis with and without outliers, (3) Use robust statistical methods.'
    });
  }

  // Based on borderline significance
  if (report.pValueAnalysis?.warnings?.some(w => w.type === 'borderline_significance')) {
    recommendations.push({
      priority: 'medium',
      category: 'replication',
      title: 'Consider Replication',
      content: 'Borderline results benefit from replication. Consider pre-registering a follow-up study with adequate power.'
    });
  }

  // General recommendations
  recommendations.push({
    priority: 'low',
    category: 'reporting',
    title: 'Complete Reporting',
    content: 'Report effect sizes, confidence intervals, and exact p-values. Include assumption check results in supplementary materials.'
  });

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Determine overall status
 */
function determineOverallStatus(report) {
  const errorCount = report.issues.filter(i => i.severity === 'error').length;
  const warningCount = report.issues.filter(i => i.severity === 'warning').length;

  if (errorCount > 0) {
    return 'critical';
  } else if (warningCount > 2) {
    return 'warning';
  } else if (warningCount > 0) {
    return 'caution';
  } else {
    return 'good';
  }
}

// ============ Helper Functions ============

/**
 * Calculate observed effect size
 */
function calculateObservedEffectSize(testType, data, results) {
  // Return effect size if already calculated
  if (results.effectSize !== undefined) return results.effectSize;
  if (results.cohensD !== undefined) return results.cohensD;
  if (results.etaSquared !== undefined) return Math.sqrt(results.etaSquared);
  if (results.coefficient !== undefined) return Math.abs(results.coefficient);

  // Try to calculate from data
  try {
    const values = extractNumericValues(data);
    if (values.length === 0) return null;

    if (testType.includes('t_test') || testType.includes('ttest')) {
      // For t-tests, estimate Cohen's d from t and n
      if (results.statistic && values.length > 0) {
        const n = values.length;
        return results.statistic / Math.sqrt(n);
      }
    }

    if (testType.includes('correlation')) {
      // For correlation, r is the effect size
      if (results.coefficient !== undefined) {
        return Math.abs(results.coefficient);
      }
    }

    if (testType.includes('anova')) {
      // For ANOVA, convert eta-squared to f
      if (results.etaSquared !== undefined) {
        return Math.sqrt(results.etaSquared / (1 - results.etaSquared));
      }
    }
  } catch (e) {
    console.warn('Could not calculate effect size:', e);
  }

  return null;
}

/**
 * Get sample size from data
 */
function getSampleSize(data, testType) {
  if (!data) return null;

  // Handle different data formats
  if (data.n !== undefined) return data.n;
  if (data.values && Array.isArray(data.values)) return data.values.length;
  if (Array.isArray(data)) return data.length;

  // Handle grouped data
  if (data.groups) {
    return Object.values(data.groups).reduce((sum, group) => sum + group.length, 0);
  }

  // Extract and count all numeric values
  const values = extractNumericValues(data);
  return values.length > 0 ? values.length : null;
}

/**
 * Calculate power for a test
 */
function calculatePower(testType, effectSize, n, alpha) {
  try {
    // Use jstat for power calculations
    if (testType.includes('t_test') || testType.includes('ttest')) {
      // Two-sample t-test power approximation
      const df = n - 2;
      const ncp = effectSize * Math.sqrt(n / 2);
      const criticalT = jstat.studentt.inv(1 - alpha / 2, df);
      // Approximate power using non-central t
      const power = 1 - jstat.studentt.cdf(criticalT - ncp, df);
      return Math.min(Math.max(power, 0), 1);
    }

    if (testType.includes('correlation')) {
      // Correlation power
      const z = 0.5 * Math.log((1 + effectSize) / (1 - effectSize)); // Fisher z
      const se = 1 / Math.sqrt(n - 3);
      const criticalZ = jstat.normal.inv(1 - alpha / 2, 0, 1);
      const power = 1 - jstat.normal.cdf(criticalZ - z / se, 0, 1);
      return Math.min(Math.max(power, 0), 1);
    }

    // Default approximation
    const se = 1 / Math.sqrt(n);
    const criticalZ = jstat.normal.inv(1 - alpha / 2, 0, 1);
    const power = 1 - jstat.normal.cdf(criticalZ - effectSize / se, 0, 1);
    return Math.min(Math.max(power, 0), 1);
  } catch (e) {
    console.warn('Power calculation error:', e);
    return null;
  }
}

/**
 * Calculate required sample size for target power
 */
function calculateRequiredSampleSize(testType, effectSize, targetPower, alpha) {
  if (!effectSize || effectSize === 0) return null;

  try {
    // Iterative search for required n
    for (let n = 10; n <= 10000; n += 5) {
      const power = calculatePower(testType, effectSize, n, alpha);
      if (power >= targetPower) {
        return n;
      }
    }
    return 10000; // Max
  } catch (e) {
    return null;
  }
}

/**
 * Extract numeric values from various data formats
 */
function extractNumericValues(data) {
  const values = [];

  if (!data) return values;

  // If data is already an array of numbers
  if (Array.isArray(data)) {
    data.forEach(v => {
      if (typeof v === 'number' && !isNaN(v)) {
        values.push(v);
      }
    });
    return values;
  }

  // If data has a values array
  if (data.values && Array.isArray(data.values)) {
    data.values.forEach(v => {
      if (typeof v === 'number' && !isNaN(v)) {
        values.push(v);
      }
    });
    return values;
  }

  // If data has groups
  if (data.groups) {
    Object.values(data.groups).forEach(group => {
      if (Array.isArray(group)) {
        group.forEach(v => {
          if (typeof v === 'number' && !isNaN(v)) {
            values.push(v);
          }
        });
      }
    });
    return values;
  }

  // If data has xValues and yValues
  if (data.xValues) {
    data.xValues.forEach(v => {
      if (typeof v === 'number' && !isNaN(v)) {
        values.push(v);
      }
    });
  }
  if (data.yValues) {
    data.yValues.forEach(v => {
      if (typeof v === 'number' && !isNaN(v)) {
        values.push(v);
      }
    });
  }

  return values;
}

/**
 * Detect outliers using Tukey's method
 */
function detectOutliers(values) {
  if (values.length < 4) return [];

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  return values.filter(v => v < lowerFence || v > upperFence);
}

/**
 * Detect floor/ceiling effects
 */
function detectFloorCeilingEffects(values) {
  if (values.length < 10) return { floor: false, ceiling: false };

  const min = Math.min(...values);
  const max = Math.max(...values);
  const atMin = values.filter(v => v === min).length;
  const atMax = values.filter(v => v === max).length;

  return {
    floor: atMin / values.length > 0.15,
    ceiling: atMax / values.length > 0.15,
    minValue: min,
    maxValue: max,
    atMin,
    atMax
  };
}

/**
 * Get minimum recommended sample size for test type
 */
function getMinimumSampleSize(testType) {
  const minimums = {
    'one_sample_t_test': 20,
    'independent_t_test': 30,
    'paired_t_test': 20,
    'one_way_anova': 45,
    'chi_square': 30,
    'pearson_correlation': 30,
    'spearman_correlation': 20,
    'mann_whitney_u': 20,
    'shapiro_wilk': 20
  };

  return minimums[testType] || 30;
}

/**
 * Get violation severity
 */
function getViolationSeverity(violation, testType) {
  // Normality violations are less severe for large samples
  if (violation.type === 'normality') {
    return 'warning'; // t-tests are robust to normality violations
  }

  // Homogeneity of variance is critical for ANOVA
  if (violation.type === 'homogeneity' && testType.includes('anova')) {
    return 'error';
  }

  // Independence is always critical
  if (violation.type === 'independence') {
    return 'error';
  }

  return 'warning';
}

/**
 * Get impact explanation for violation
 */
function getViolationImpact(violation, testType, data) {
  const impacts = {
    normality: {
      explanation: 'Non-normal data can inflate Type I error rates in parametric tests, though t-tests are generally robust with n > 30.',
      recommendation: 'Consider non-parametric alternatives or bootstrap methods.'
    },
    homogeneity: {
      explanation: 'Unequal variances can seriously bias F-tests and inflate Type I error rates.',
      recommendation: 'Use Welch\'s correction or robust ANOVA methods.'
    },
    independence: {
      explanation: 'Non-independent observations violate the fundamental assumption of most statistical tests.',
      recommendation: 'Consider multilevel models or repeated-measures designs.'
    }
  };

  return impacts[violation.type] || {
    explanation: 'This violation may affect the validity of your results.',
    recommendation: 'Consult a statistician for guidance.'
  };
}

/**
 * Get alternative tests based on violations
 */
function getAlternativeTests(testType, violations) {
  const alternatives = [];
  const violationTypes = violations.map(v => v.type);

  if (testType.includes('t_test')) {
    if (violationTypes.includes('normality')) {
      alternatives.push('Mann-Whitney U test', 'Wilcoxon signed-rank test', 'Bootstrap t-test');
    }
    if (violationTypes.includes('homogeneity')) {
      alternatives.push('Welch\'s t-test');
    }
  }

  if (testType.includes('anova')) {
    if (violationTypes.includes('normality') || violationTypes.includes('homogeneity')) {
      alternatives.push('Kruskal-Wallis test', 'Welch\'s ANOVA', 'Bootstrap ANOVA');
    }
  }

  if (testType.includes('correlation') && testType.includes('pearson')) {
    if (violationTypes.includes('normality') || violationTypes.includes('linearity')) {
      alternatives.push('Spearman correlation', 'Kendall\'s tau');
    }
  }

  return alternatives;
}

/**
 * Interpret effect size
 */
function interpretEffectSize(effectSize, testType) {
  let interpretation = '';
  let magnitude = '';

  // Cohen's conventions
  if (testType.includes('t_test') || testType.includes('anova')) {
    if (effectSize < 0.2) magnitude = 'negligible';
    else if (effectSize < 0.5) magnitude = 'small';
    else if (effectSize < 0.8) magnitude = 'medium';
    else magnitude = 'large';

    interpretation = `Cohen's d = ${effectSize.toFixed(3)} is considered a ${magnitude} effect by conventional standards (Cohen, 1988).`;
  } else if (testType.includes('correlation')) {
    if (effectSize < 0.1) magnitude = 'negligible';
    else if (effectSize < 0.3) magnitude = 'small';
    else if (effectSize < 0.5) magnitude = 'medium';
    else magnitude = 'large';

    interpretation = `r = ${effectSize.toFixed(3)} is considered a ${magnitude} correlation by conventional standards.`;
  } else {
    if (effectSize < 0.2) magnitude = 'small';
    else if (effectSize < 0.5) magnitude = 'medium';
    else magnitude = 'large';

    interpretation = `Effect size = ${effectSize.toFixed(3)} is considered ${magnitude} by conventional standards.`;
  }

  return interpretation;
}

// Export all functions
export {
  analyzePValue,
  analyzeRetrospectivePower,
  analyzeAssumptions,
  analyzeDataQuality,
  performSensitivityAnalysis,
  generateRecommendations,
  calculateObservedEffectSize,
  detectOutliers,
  getAlternativeTests,
  interpretEffectSize
};

export default analyzeTestResults;
