/**
 * Error Detection Rules Database
 *
 * Evidence-based rules for detecting common statistical reporting errors.
 * Each rule includes academic references supporting the concern.
 *
 * Based on:
 * - APA (2020). Publication Manual (7th ed.)
 * - JARS (Journal Article Reporting Standards)
 * - Cumming (2014). The New Statistics
 * - Ioannidis (2005). Why Most Published Research Findings Are False
 * - Simmons et al. (2011). False-Positive Psychology
 * - Nuijten et al. (2016). The prevalence of statistical reporting errors
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

/**
 * Severity levels for detected issues
 */
export const SEVERITY = {
  CRITICAL: 'critical',    // Major issue that invalidates results
  HIGH: 'high',           // Significant issue affecting interpretation
  MEDIUM: 'medium',       // Notable concern worth addressing
  LOW: 'low',             // Minor issue or style preference
  INFO: 'info'            // Informational note
};

/**
 * Category types for issues
 */
export const CATEGORY = {
  REPORTING: 'reporting',         // Incomplete or incorrect reporting
  METHODOLOGY: 'methodology',     // Methodological concerns
  INTERPRETATION: 'interpretation', // Interpretation issues
  TRANSPARENCY: 'transparency',   // Transparency and replication concerns
  BEST_PRACTICE: 'best_practice'  // Deviation from best practices
};

/**
 * Error detection rules
 */
export const ERROR_RULES = [
  // ============================================
  // CRITICAL REPORTING ERRORS
  // ============================================
  {
    id: 'missing_sample_size',
    name: 'Missing Sample Size',
    description: 'No sample size (N or n) was reported in the paper.',
    severity: SEVERITY.CRITICAL,
    category: CATEGORY.REPORTING,
    check: (stats) => stats.sampleSizes.length === 0,
    recommendation: 'Report the total sample size and sample sizes for each group or condition. This is essential for interpreting results and assessing statistical power.',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 3.6',
      'JARS: Sample size determination must be described'
    ],
    jarsStandard: true
  },

  {
    id: 'missing_test_statistics',
    name: 'Missing Test Statistics',
    description: 'P-values were reported without accompanying test statistics.',
    severity: SEVERITY.CRITICAL,
    category: CATEGORY.REPORTING,
    check: (stats) => {
      // Has p-values but no test statistics
      return stats.pValues.length > 0 && stats.testStatistics.length === 0;
    },
    recommendation: 'Report the test statistic (e.g., t, F, χ²) along with degrees of freedom for every p-value. Example: t(28) = 2.45, p = .021',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 6.36',
      'Nuijten et al. (2016). Prevalence of statistical reporting errors'
    ],
    jarsStandard: true
  },

  {
    id: 'missing_effect_sizes',
    name: 'Missing Effect Sizes',
    description: 'Statistical tests were reported without effect size measures.',
    severity: SEVERITY.HIGH,
    category: CATEGORY.REPORTING,
    check: (stats) => {
      // Has test statistics but no effect sizes
      return stats.testStatistics.length > 0 && stats.effectSizes.length === 0;
    },
    recommendation: 'Report effect sizes (e.g., Cohen\'s d, η², r) for all statistical tests. Effect sizes indicate practical significance beyond statistical significance.',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 6.35',
      'Cohen (1988). Statistical Power Analysis for the Behavioral Sciences',
      'Cumming (2014). The New Statistics'
    ],
    jarsStandard: true
  },

  {
    id: 'missing_confidence_intervals',
    name: 'Missing Confidence Intervals',
    description: 'No confidence intervals were reported for effect estimates.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.REPORTING,
    check: (stats) => stats.confidenceIntervals.length === 0 && stats.testStatistics.length > 0,
    recommendation: 'Report 95% confidence intervals for effect sizes and mean differences. CIs provide information about precision and allow readers to assess the range of plausible values.',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 6.35',
      'Cumming & Finch (2005). Inference by Eye',
      'JARS: CIs should be reported for effect estimates'
    ],
    jarsStandard: true
  },

  // ============================================
  // P-VALUE REPORTING ISSUES
  // ============================================
  {
    id: 'p_value_inequality_only',
    name: 'Inexact P-Values',
    description: 'P-values reported only as inequalities (p < 0.05) rather than exact values.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.REPORTING,
    check: (stats) => {
      const exactCount = stats.pValues.filter(p => /p\s*=/.test(p)).length;
      const inequalityCount = stats.pValues.filter(p => /p\s*[<>]/.test(p)).length;
      return inequalityCount > 0 && exactCount === 0;
    },
    recommendation: 'Report exact p-values (e.g., p = .032) except when p < .001. This provides more information and allows readers to make their own judgments about significance.',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 6.36',
      'Appelbaum et al. (2018). Journal Article Reporting Standards'
    ],
    jarsStandard: true
  },

  {
    id: 'borderline_significance',
    name: 'Borderline Significance Concerns',
    description: 'Results near the significance threshold (p between .04 and .06) may warrant caution.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.INTERPRETATION,
    check: (stats) => {
      return stats.pValues.some(p => {
        const match = p.match(/p\s*[=<]\s*\.?0?(\d{2,3})/);
        if (match) {
          const value = parseFloat('0.' + match[1]);
          return value >= 0.04 && value <= 0.06;
        }
        return false;
      });
    },
    recommendation: 'Results near the significance boundary should be interpreted with caution. Consider effect size and confidence intervals rather than relying solely on the p < .05 cutoff.',
    references: [
      'Wasserstein & Lazar (2016). ASA Statement on Statistical Significance',
      'Lakens (2017). Equivalence Tests'
    ]
  },

  {
    id: 'very_small_p_values',
    name: 'Extremely Small P-Values May Indicate Issues',
    description: 'Extremely small p-values (p < .0001) detected.',
    severity: SEVERITY.INFO,
    category: CATEGORY.INTERPRETATION,
    check: (stats) => {
      return stats.pValues.some(p => /p\s*<\s*\.?0001/.test(p) || /p\s*=\s*\.?0{4,}/.test(p));
    },
    recommendation: 'Very small p-values are often legitimate with large samples or strong effects. However, verify these are not due to: (1) violations of assumptions, (2) pseudoreplication, or (3) data errors.',
    references: [
      'Simonsohn et al. (2014). P-Curve analysis'
    ]
  },

  // ============================================
  // SAMPLE SIZE CONCERNS
  // ============================================
  {
    id: 'small_sample_parametric',
    name: 'Small Sample with Parametric Tests',
    description: 'Parametric tests may be used with small sample sizes (n < 30).',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.METHODOLOGY,
    check: (stats) => {
      const hasParametric = stats.testNames.some(t =>
        /t-?test|ANOVA|regression|pearson/i.test(t.name)
      );
      const smallSample = stats.sampleSizes.some(s => s.value < 30);
      return hasParametric && smallSample;
    },
    recommendation: 'With small samples (n < 30), verify that normality assumptions are met. Consider non-parametric alternatives if normality is violated. Report results of normality tests.',
    references: [
      'Fagerland (2012). t-tests, non-parametric tests, and large studies',
      'Lumley et al. (2002). The importance of the normality assumption'
    ]
  },

  {
    id: 'no_power_analysis',
    name: 'No Power Analysis Mentioned',
    description: 'No mention of statistical power or sample size justification.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.METHODOLOGY,
    check: (stats, text) => {
      const hasPowerMention = /power\s*(analysis|calculation)?|sample\s*size\s*(justification|determination|calculation)/i.test(text);
      return !hasPowerMention;
    },
    recommendation: 'Report an a priori power analysis or justify the sample size. Underpowered studies have inflated false negative rates and exaggerated effect sizes in significant results.',
    references: [
      'Button et al. (2013). Power failure in neuroscience',
      'Perugini et al. (2018). Safeguard Power',
      'JARS: Sample size rationale should be provided'
    ],
    jarsStandard: true
  },

  {
    id: 'unequal_group_sizes',
    name: 'Potentially Unequal Group Sizes',
    description: 'Different sample sizes detected which may indicate unequal groups.',
    severity: SEVERITY.LOW,
    category: CATEGORY.METHODOLOGY,
    check: (stats) => {
      const sizes = stats.sampleSizes.filter(s => s.type === 'subgroup').map(s => s.value);
      if (sizes.length < 2) return false;
      const max = Math.max(...sizes);
      const min = Math.min(...sizes);
      return max / min > 1.5; // More than 50% difference
    },
    recommendation: 'Unbalanced designs can affect statistical power and assumption robustness. Consider using Welch\'s t-test for unequal variances or report how unbalanced data was handled.',
    references: [
      'Delacre et al. (2017). Why Psychologists Should by Default Use Welch\'s t-test'
    ]
  },

  // ============================================
  // METHODOLOGY CONCERNS
  // ============================================
  {
    id: 'no_assumption_checks',
    name: 'No Assumption Checks Reported',
    description: 'Statistical tests reported without mentioning assumption verification.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.METHODOLOGY,
    check: (stats, text) => {
      const hasParametric = stats.testNames.some(t =>
        /t-?test|ANOVA|regression|pearson/i.test(t.name)
      );
      const hasAssumptionCheck = /normality|homogeneity|homoscedasticity|Levene|Shapiro|Kolmogorov|assumption|sphericity|Mauchly/i.test(text);
      return hasParametric && !hasAssumptionCheck;
    },
    recommendation: 'Report assumption checks for parametric tests: normality (Shapiro-Wilk), homogeneity of variance (Levene\'s test), and for repeated measures ANOVA, sphericity (Mauchly\'s test).',
    references: [
      'APA (2020). Publication Manual, Section 6.34',
      'Hoekstra et al. (2012). Robust misinterpretation of confidence intervals'
    ]
  },

  {
    id: 'multiple_comparisons_uncorrected',
    name: 'Multiple Comparisons Without Correction',
    description: 'Multiple statistical tests may have been conducted without adjustment.',
    severity: SEVERITY.HIGH,
    category: CATEGORY.METHODOLOGY,
    check: (stats, text) => {
      const manyTests = stats.pValues.length > 3;
      const hasCorrectionMention = /Bonferroni|Holm|Tukey|Scheff[eé]|False Discovery|FDR|family-?wise|correction|adjusted|multiple\s*comparison/i.test(text);
      return manyTests && !hasCorrectionMention;
    },
    recommendation: 'When conducting multiple tests, apply corrections (e.g., Bonferroni, Holm, FDR) or clearly state these are exploratory analyses. Without correction, the family-wise error rate is inflated.',
    references: [
      'Benjamini & Hochberg (1995). False Discovery Rate',
      'Cabin & Mitchell (2000). To Bonferroni or Not to Bonferroni'
    ]
  },

  {
    id: 'one_tailed_without_justification',
    name: 'One-Tailed Test Potential',
    description: 'Consider whether one-tailed tests were used appropriately.',
    severity: SEVERITY.LOW,
    category: CATEGORY.METHODOLOGY,
    check: (stats, text) => {
      return /one-?tailed|directional\s*hypothesis|directional\s*test/i.test(text);
    },
    recommendation: 'One-tailed tests should only be used when there is strong theoretical justification for a directional prediction made before data collection. Two-tailed tests are generally preferred.',
    references: [
      'Ruxton & Neuhäuser (2010). When should we use one-tailed hypothesis testing?'
    ]
  },

  // ============================================
  // INTERPRETATION ISSUES
  // ============================================
  {
    id: 'significance_as_importance',
    name: 'Statistical Significance Conflated with Importance',
    description: 'Language suggests statistical significance equals practical importance.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.INTERPRETATION,
    check: (stats, text) => {
      const problematicPhrases = /(highly\s+significant|very\s+significant|extremely\s+significant|strongly\s+significant)\s*\(?p/i;
      return problematicPhrases.test(text);
    },
    recommendation: 'A smaller p-value does not indicate a larger or more important effect. Use effect sizes to discuss practical significance. "Statistically significant" and "meaningful" are not synonyms.',
    references: [
      'Wasserstein & Lazar (2016). ASA Statement on Statistical Significance',
      'Sullivan & Feinn (2012). Using Effect Size'
    ]
  },

  {
    id: 'absence_of_evidence_fallacy',
    name: 'Absence of Evidence Fallacy',
    description: 'Non-significant results interpreted as "no effect" or "no difference."',
    severity: SEVERITY.HIGH,
    category: CATEGORY.INTERPRETATION,
    check: (stats, text) => {
      const hasNS = stats.pValues.some(p => /ns|not\s*significant|p\s*[>≥]\s*\.?0?5/i.test(p));
      const hasFallacy = /no\s+(effect|difference|relationship|association|impact)|proves?\s+(null|no\s+effect)|accept\s+the\s+null/i.test(text);
      return hasNS && hasFallacy;
    },
    recommendation: 'A non-significant result does not prove "no effect" - it means the effect could not be distinguished from zero given the data. Consider equivalence testing or Bayesian approaches to make claims about null effects.',
    references: [
      'Lakens (2017). Equivalence Tests for TOST',
      'Altman & Bland (1995). Absence of evidence is not evidence of absence'
    ]
  },

  {
    id: 'causation_from_correlation',
    name: 'Causal Language for Correlational Data',
    description: 'Causal language used when describing correlational results.',
    severity: SEVERITY.HIGH,
    category: CATEGORY.INTERPRETATION,
    check: (stats, text) => {
      const hasCorrelation = stats.testNames.some(t =>
        /correlat|pearson|spearman|association/i.test(t.name)
      );
      const hasCausalLanguage = /(caused?|leads?\s+to|results?\s+in|produces?|affects?|impacts?|influences?)\s+(?!by|in)/i.test(text);
      return hasCorrelation && hasCausalLanguage;
    },
    recommendation: 'Correlation does not imply causation. Use appropriate language (e.g., "associated with," "related to") unless the study design supports causal inference (e.g., RCT, experimental manipulation).',
    references: [
      'Pearl (2009). Causality',
      'Rohrer (2018). Thinking Clearly About Correlations and Causation'
    ]
  },

  // ============================================
  // TRANSPARENCY CONCERNS
  // ============================================
  {
    id: 'no_preregistration_mention',
    name: 'No Pre-registration Mentioned',
    description: 'No mention of pre-registration or analysis plan.',
    severity: SEVERITY.LOW,
    category: CATEGORY.TRANSPARENCY,
    check: (stats, text) => {
      const hasPreregMention = /pre-?regist|OSF|aspredicted|registered\s*report|analysis\s*plan|protocol\s*registration/i.test(text);
      return !hasPreregMention;
    },
    recommendation: 'Consider pre-registering hypotheses and analysis plans to distinguish confirmatory from exploratory analyses and reduce researcher degrees of freedom.',
    references: [
      'Nosek et al. (2018). The preregistration revolution',
      'Wagenmakers et al. (2012). An agenda for purely confirmatory research'
    ]
  },

  {
    id: 'no_data_availability',
    name: 'No Data Availability Statement',
    description: 'No mention of data sharing or availability.',
    severity: SEVERITY.LOW,
    category: CATEGORY.TRANSPARENCY,
    check: (stats, text) => {
      const hasDataMention = /data\s*(availab|sharing|repositor|OSF|upon\s*request|supplement)/i.test(text);
      return !hasDataMention;
    },
    recommendation: 'Include a data availability statement. Open data facilitates replication and increases trust in findings.',
    references: [
      'Kidwell et al. (2016). Badges to Acknowledge Open Practices',
      'JARS: Data access should be described'
    ],
    jarsStandard: true
  },

  {
    id: 'selective_reporting_risk',
    name: 'Potential Selective Reporting',
    description: 'Reporting pattern suggests possible selective outcome reporting.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.TRANSPARENCY,
    check: (stats) => {
      // All p-values are significant
      const allSignificant = stats.pValues.every(p => {
        const match = p.match(/p\s*[=<]\s*\.?0?(\d{2,3})/);
        if (match) {
          const value = parseFloat('0.' + match[1]);
          return value < 0.05;
        }
        return /p\s*<\s*\.?0?5/i.test(p);
      });
      return stats.pValues.length > 2 && allSignificant;
    },
    recommendation: 'All reported results being significant may indicate selective reporting. Report all planned analyses, including non-significant results, to provide a complete picture.',
    references: [
      'Franco et al. (2014). Publication bias in the social sciences',
      'Simmons et al. (2011). False-Positive Psychology'
    ]
  },

  // ============================================
  // ADDITIONAL EFFECT SIZE AND PRECISION RULES
  // ============================================
  {
    id: 'effect_size_without_ci',
    name: 'Effect Size Without Confidence Interval',
    description: 'Effect sizes were reported without accompanying confidence intervals.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.REPORTING,
    check: (stats) => {
      // Has effect sizes but no CIs for them
      const hasEffectSizes = stats.effectSizes.length > 0;
      const hasCIsForEffects = stats.confidenceIntervals.some(ci =>
        /d|g|η|omega|r²|R²|OR|RR/i.test(ci)
      );
      return hasEffectSizes && !hasCIsForEffects;
    },
    recommendation: 'Report confidence intervals for all effect sizes. CIs indicate precision of effect estimates and are required by JARS-Quant guidelines.',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 6.35',
      'Cumming (2014). The New Statistics: Why and How',
      'JARS-Quant: Effect sizes should include CIs'
    ],
    jarsStandard: true
  },

  {
    id: 'missing_descriptive_statistics',
    name: 'Missing Descriptive Statistics',
    description: 'No means or standard deviations were reported for continuous variables.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.REPORTING,
    check: (stats, text) => {
      // Check for parametric tests without descriptive statistics
      const hasParametricTests = stats.testNames.some(t =>
        /t-?test|ANOVA|regression|correlation/i.test(t.name)
      );
      const hasDescriptives = /[Mm]\s*=\s*[\d.]+|[Mm]ean\s*[=:]\s*[\d.]+|SD\s*=\s*[\d.]+|[Ss]tandard\s*[Dd]eviation/i.test(text);
      return hasParametricTests && !hasDescriptives;
    },
    recommendation: 'Report means (M) and standard deviations (SD) for all continuous variables. Example: M = 4.56, SD = 1.23. This allows readers to understand data distributions and calculate effect sizes.',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 6.34',
      'Wilkinson & Task Force (1999). Statistical methods in psychology journals'
    ],
    jarsStandard: true
  },

  {
    id: 'sphericity_not_reported',
    name: 'Sphericity Not Reported for Repeated Measures',
    description: 'Repeated measures ANOVA results lack sphericity assumption check.',
    severity: SEVERITY.MEDIUM,
    category: CATEGORY.METHODOLOGY,
    check: (stats, text) => {
      // Check for repeated measures without sphericity reporting
      const hasRepeatedMeasures = /repeated\s*measures?|within[- ]subjects?|RM[- ]?ANOVA/i.test(text);
      const hasSphericityCheck = /[Mm]auchly|sphericity|[Gg]reenhouse[- ]?[Gg]eisser|[Hh]uynh[- ]?[Ff]eldt|epsilon/i.test(text);
      return hasRepeatedMeasures && !hasSphericityCheck;
    },
    recommendation: 'For repeated measures ANOVA, report Mauchly\'s test of sphericity. If violated (p < .05), apply Greenhouse-Geisser or Huynh-Feldt correction and report the epsilon value.',
    references: [
      'APA (2020). Publication Manual, 7th ed., Section 6.34',
      'Field (2018). Discovering Statistics Using IBM SPSS Statistics',
      'Keselman et al. (1998). Statistical practices of educational researchers'
    ]
  },

  {
    id: 'effect_size_not_interpreted',
    name: 'Effect Size Magnitude Not Interpreted',
    description: 'Effect sizes were reported numerically but their practical magnitude was not discussed.',
    severity: SEVERITY.LOW,
    category: CATEGORY.INTERPRETATION,
    check: (stats, text) => {
      const hasEffectSizes = stats.effectSizes.length > 0;
      const hasInterpretation = /(small|medium|moderate|large|negligible|trivial)\s+(effect|d|η|omega)/i.test(text) ||
                               /effect\s+(size\s+)?(was|is|were)\s+(small|medium|moderate|large)/i.test(text);
      return hasEffectSizes && !hasInterpretation;
    },
    recommendation: 'Interpret the magnitude of effect sizes using established benchmarks (e.g., Cohen\'s guidelines: d = 0.2 small, 0.5 medium, 0.8 large). Context-specific interpretation is preferred over generic benchmarks.',
    references: [
      'Cohen (1988). Statistical Power Analysis for the Behavioral Sciences',
      'Fritz et al. (2012). Effect size estimates: Current use, calculations, and interpretation',
      'Thompson (2007). Effect sizes, confidence intervals, and confidence intervals for effect sizes'
    ]
  }
];

/**
 * Run all error checks on extracted statistics
 * @param {Object} stats - Extracted statistical content
 * @param {string} fullText - Full paper text
 * @returns {Array} - Array of detected issues
 */
export function detectErrors(stats, fullText) {
  const detectedIssues = [];

  for (const rule of ERROR_RULES) {
    try {
      const triggered = rule.check(stats, fullText);
      if (triggered) {
        detectedIssues.push({
          id: rule.id,
          name: rule.name,
          description: rule.description,
          severity: rule.severity,
          category: rule.category,
          recommendation: rule.recommendation,
          references: rule.references,
          jarsStandard: rule.jarsStandard || false
        });
      }
    } catch (error) {
      console.error(`Error checking rule ${rule.id}:`, error);
    }
  }

  // Sort by severity
  const severityOrder = {
    [SEVERITY.CRITICAL]: 0,
    [SEVERITY.HIGH]: 1,
    [SEVERITY.MEDIUM]: 2,
    [SEVERITY.LOW]: 3,
    [SEVERITY.INFO]: 4
  };

  detectedIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return detectedIssues;
}

/**
 * Get severity color for display
 * @param {string} severity - Severity level
 * @returns {string} - Color code
 */
export function getSeverityColor(severity) {
  const colors = {
    [SEVERITY.CRITICAL]: '#d32f2f', // Red
    [SEVERITY.HIGH]: '#f57c00',     // Orange
    [SEVERITY.MEDIUM]: '#fbc02d',   // Yellow
    [SEVERITY.LOW]: '#388e3c',      // Green
    [SEVERITY.INFO]: '#1976d2'      // Blue
  };
  return colors[severity] || '#757575';
}

/**
 * Get severity label for display
 * @param {string} severity - Severity level
 * @returns {string} - Label
 */
export function getSeverityLabel(severity) {
  const labels = {
    [SEVERITY.CRITICAL]: 'Critical Issue',
    [SEVERITY.HIGH]: 'High Concern',
    [SEVERITY.MEDIUM]: 'Moderate Concern',
    [SEVERITY.LOW]: 'Minor Issue',
    [SEVERITY.INFO]: 'Information'
  };
  return labels[severity] || severity;
}

/**
 * Get category icon for display
 * @param {string} category - Category type
 * @returns {string} - Emoji icon
 */
export function getCategoryIcon(category) {
  const icons = {
    [CATEGORY.REPORTING]: '📝',
    [CATEGORY.METHODOLOGY]: '🔬',
    [CATEGORY.INTERPRETATION]: '🎯',
    [CATEGORY.TRANSPARENCY]: '🔍',
    [CATEGORY.BEST_PRACTICE]: '✅'
  };
  return icons[category] || '📋';
}

/**
 * Calculate overall quality score
 * @param {Array} issues - Detected issues
 * @returns {Object} - Quality score and grade
 */
export function calculateQualityScore(issues) {
  // Point deductions by severity
  const deductions = {
    [SEVERITY.CRITICAL]: 25,
    [SEVERITY.HIGH]: 15,
    [SEVERITY.MEDIUM]: 8,
    [SEVERITY.LOW]: 3,
    [SEVERITY.INFO]: 0
  };

  let score = 100;
  for (const issue of issues) {
    score -= deductions[issue.severity] || 0;
  }

  // Ensure score is between 0 and 100
  score = Math.max(0, Math.min(100, score));

  // Calculate grade
  let grade, gradeColor;
  if (score >= 90) {
    grade = 'A';
    gradeColor = '#4caf50';
  } else if (score >= 80) {
    grade = 'B';
    gradeColor = '#8bc34a';
  } else if (score >= 70) {
    grade = 'C';
    gradeColor = '#ffc107';
  } else if (score >= 60) {
    grade = 'D';
    gradeColor = '#ff9800';
  } else {
    grade = 'F';
    gradeColor = '#f44336';
  }

  return {
    score: Math.round(score),
    grade,
    gradeColor,
    totalIssues: issues.length,
    criticalCount: issues.filter(i => i.severity === SEVERITY.CRITICAL).length,
    highCount: issues.filter(i => i.severity === SEVERITY.HIGH).length,
    mediumCount: issues.filter(i => i.severity === SEVERITY.MEDIUM).length,
    lowCount: issues.filter(i => i.severity === SEVERITY.LOW).length,
    infoCount: issues.filter(i => i.severity === SEVERITY.INFO).length,
    jarsViolations: issues.filter(i => i.jarsStandard).length
  };
}

const errorRules = {
  SEVERITY,
  CATEGORY,
  ERROR_RULES,
  detectErrors,
  getSeverityColor,
  getSeverityLabel,
  getCategoryIcon,
  calculateQualityScore
};

export default errorRules;
