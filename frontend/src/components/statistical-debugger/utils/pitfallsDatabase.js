/**
 * Statistical Pitfalls Database
 *
 * Comprehensive knowledge base of common pitfalls, mistakes, and issues
 * for each statistical test type. Used by the Statistical Debugger to
 * provide test-specific guidance.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

/**
 * Common pitfalls by test type
 */
export const PITFALLS_BY_TEST = {
  // ============ T-TESTS ============
  one_sample_t_test: {
    name: 'One-Sample t-Test',
    commonPitfalls: [
      {
        id: 'non_normality',
        title: 'Non-Normal Distribution',
        description: 'The t-test assumes data is approximately normally distributed.',
        severity: 'medium',
        whenItMatters: 'Critical for small samples (n < 30). Less important for larger samples due to Central Limit Theorem.',
        howToDetect: 'Run Shapiro-Wilk test, examine Q-Q plot, check skewness/kurtosis.',
        solution: 'Use Wilcoxon signed-rank test, bootstrap, or transform data.',
        reference: 'Lumley et al. (2002). The importance of the normality assumption in large public health data sets.'
      },
      {
        id: 'outliers',
        title: 'Influential Outliers',
        description: 'Outliers can dramatically affect the mean and inflate/deflate the t-statistic.',
        severity: 'high',
        whenItMatters: 'Always important, especially with small samples.',
        howToDetect: 'Check boxplot, look for values beyond 1.5*IQR.',
        solution: 'Investigate outliers, use trimmed mean, or Winsorize data.',
        reference: 'Wilcox (2012). Introduction to Robust Estimation and Hypothesis Testing.'
      },
      {
        id: 'non_independence',
        title: 'Non-Independent Observations',
        description: 'Each observation must be independent of others.',
        severity: 'high',
        whenItMatters: 'Always critical. Violation inflates Type I error.',
        howToDetect: 'Consider data collection method. Repeated measures from same subjects violate this.',
        solution: 'Use paired t-test for repeated measures, multilevel models for clustered data.',
        reference: 'Kenny & Judd (1986). Consequences of violating the independence assumption.'
      }
    ],
    checklist: [
      'Data is approximately normal (or n > 30)',
      'No extreme outliers',
      'Observations are independent',
      'Comparison value is meaningful',
      'Sample represents target population'
    ]
  },

  independent_t_test: {
    name: 'Independent Samples t-Test',
    commonPitfalls: [
      {
        id: 'unequal_variances',
        title: 'Unequal Variances (Heteroscedasticity)',
        description: 'Standard t-test assumes equal variances in both groups.',
        severity: 'medium',
        whenItMatters: 'Especially problematic when sample sizes are unequal.',
        howToDetect: 'Run Levene\'s test, compare standard deviations.',
        solution: 'Use Welch\'s t-test (does not assume equal variances).',
        reference: 'Ruxton (2006). The unequal variance t-test is an underused alternative to Student\'s t-test.'
      },
      {
        id: 'pseudoreplication',
        title: 'Pseudoreplication',
        description: 'Treating non-independent observations as independent.',
        severity: 'high',
        whenItMatters: 'Common in biological and ecological studies.',
        howToDetect: 'Multiple measurements from same subject/unit treated as independent.',
        solution: 'Average within subjects first, use mixed models.',
        reference: 'Hurlbert (1984). Pseudoreplication and the design of ecological field experiments.'
      },
      {
        id: 'selection_bias',
        title: 'Group Selection Bias',
        description: 'Groups differ systematically in ways beyond the treatment.',
        severity: 'high',
        whenItMatters: 'In non-randomized studies.',
        howToDetect: 'Compare groups on potential confounders.',
        solution: 'Use ANCOVA, propensity score matching, or regression adjustment.',
        reference: 'Rosenbaum & Rubin (1983). The central role of the propensity score.'
      }
    ],
    checklist: [
      'Groups are truly independent',
      'Variances are approximately equal (or use Welch\'s)',
      'Both distributions are approximately normal',
      'No extreme outliers in either group',
      'Random assignment to groups (ideally)'
    ]
  },

  paired_t_test: {
    name: 'Paired Samples t-Test',
    commonPitfalls: [
      {
        id: 'carryover_effects',
        title: 'Carryover Effects',
        description: 'First measurement affects second measurement.',
        severity: 'high',
        whenItMatters: 'In repeated measures designs without proper washout.',
        howToDetect: 'Check for order effects, examine pattern of differences.',
        solution: 'Counterbalance order, include washout periods.',
        reference: 'Greenwald (1976). Within-subjects designs: To use or not to use?'
      },
      {
        id: 'regression_to_mean',
        title: 'Regression to the Mean',
        description: 'Extreme first measurements naturally move toward average on retest.',
        severity: 'medium',
        whenItMatters: 'When subjects are selected based on extreme initial scores.',
        howToDetect: 'Plot baseline vs change scores, check for negative correlation.',
        solution: 'Use control group, ANCOVA with baseline as covariate.',
        reference: 'Barnett et al. (2005). Regression to the mean: what it is and how to deal with it.'
      },
      {
        id: 'wrong_pairing',
        title: 'Incorrect Pairing',
        description: 'Pairing that doesn\'t reflect natural matching.',
        severity: 'high',
        whenItMatters: 'When pairing is arbitrary rather than meaningful.',
        howToDetect: 'Examine correlation between pairs - should be positive.',
        solution: 'If correlation is low/negative, independent t-test may be more appropriate.',
        reference: 'Zimmerman (1997). A note on interpretation of the paired-samples t test.'
      }
    ],
    checklist: [
      'Pairs are meaningfully matched',
      'Differences are approximately normal',
      'No extreme outliers in difference scores',
      'No carryover effects',
      'Measurements are truly dependent'
    ]
  },

  // ============ ANOVA ============
  one_way_anova: {
    name: 'One-Way ANOVA',
    commonPitfalls: [
      {
        id: 'multiple_comparisons',
        title: 'Multiple Comparisons Problem',
        description: 'Running pairwise comparisons without correction inflates Type I error.',
        severity: 'high',
        whenItMatters: 'When comparing more than 2 groups post-hoc.',
        howToDetect: 'Did you run multiple t-tests after ANOVA?',
        solution: 'Use Tukey HSD, Bonferroni, or other correction methods.',
        reference: 'Armstrong (2014). When to use the Bonferroni correction.'
      },
      {
        id: 'unequal_group_sizes',
        title: 'Unbalanced Design',
        description: 'Very unequal group sizes reduce power and robustness.',
        severity: 'medium',
        whenItMatters: 'When largest/smallest group ratio > 1.5 and variances differ.',
        howToDetect: 'Compare group ns and run homogeneity tests.',
        solution: 'Use Welch\'s ANOVA, consider weighting.',
        reference: 'Delacre et al. (2019). Taking parametric assumptions seriously.'
      },
      {
        id: 'violation_sphericity',
        title: 'Violating Independence Between Groups',
        description: 'Groups should be completely independent.',
        severity: 'high',
        whenItMatters: 'When same subjects appear in multiple groups.',
        howToDetect: 'Review study design - did subjects cross groups?',
        solution: 'Use repeated measures ANOVA or mixed models.',
        reference: 'Field (2013). Discovering Statistics Using IBM SPSS Statistics.'
      }
    ],
    checklist: [
      'Groups are independent',
      'Residuals are normally distributed',
      'Variances are homogeneous across groups',
      'No extreme outliers',
      'Post-hoc tests use appropriate corrections'
    ]
  },

  // ============ CORRELATION ============
  pearson_correlation: {
    name: 'Pearson Correlation',
    commonPitfalls: [
      {
        id: 'nonlinearity',
        title: 'Non-Linear Relationship',
        description: 'Pearson assumes a linear relationship.',
        severity: 'high',
        whenItMatters: 'When the true relationship is curvilinear.',
        howToDetect: 'Examine scatterplot for curved patterns.',
        solution: 'Use polynomial regression, Spearman correlation, or transform data.',
        reference: 'Anscombe (1973). Graphs in statistical analysis.'
      },
      {
        id: 'restricted_range',
        title: 'Restricted Range',
        description: 'Limited variability attenuates correlation.',
        severity: 'medium',
        whenItMatters: 'When sample is truncated on one or both variables.',
        howToDetect: 'Compare your range to the full population range.',
        solution: 'Use correction formulas, acknowledge limitation.',
        reference: 'Hunter & Schmidt (2004). Methods of Meta-Analysis.'
      },
      {
        id: 'outlier_influence',
        title: 'Outlier Influence',
        description: 'Single outliers can dramatically change correlation.',
        severity: 'high',
        whenItMatters: 'Small samples are especially vulnerable.',
        howToDetect: 'Look for points far from the cluster in scatterplot.',
        solution: 'Calculate correlation with and without outliers, use robust correlation.',
        reference: 'Wilcox (2012). Introduction to Robust Estimation and Hypothesis Testing.'
      },
      {
        id: 'causation_confusion',
        title: 'Correlation vs Causation',
        description: 'Correlation does not imply causation.',
        severity: 'interpretation',
        whenItMatters: 'When making causal claims from correlational data.',
        howToDetect: 'Are you claiming X causes Y based on correlation?',
        solution: 'Use causal language carefully, consider confounders.',
        reference: 'Pearl (2009). Causality: Models, Reasoning, and Inference.'
      }
    ],
    checklist: [
      'Relationship appears linear in scatterplot',
      'No extreme outliers',
      'Variables have adequate range',
      'Both variables are continuous',
      'Observations are independent'
    ]
  },

  spearman_correlation: {
    name: 'Spearman Correlation',
    commonPitfalls: [
      {
        id: 'ties',
        title: 'Many Tied Values',
        description: 'Too many ties reduce accuracy of rank-based methods.',
        severity: 'low',
        whenItMatters: 'When ordinal data has few categories.',
        howToDetect: 'Check for many identical values.',
        solution: 'Consider polychoric correlation for ordinal data.',
        reference: 'Kendall & Gibbons (1990). Rank Correlation Methods.'
      },
      {
        id: 'monotonic_assumption',
        title: 'Non-Monotonic Relationship',
        description: 'Spearman assumes monotonic (consistently increasing/decreasing) relationship.',
        severity: 'medium',
        whenItMatters: 'When relationship changes direction.',
        howToDetect: 'Examine scatterplot for U-shaped patterns.',
        solution: 'Use polynomial regression or segment the analysis.',
        reference: 'Hollander & Wolfe (1999). Nonparametric Statistical Methods.'
      }
    ],
    checklist: [
      'Relationship is monotonic (not U-shaped)',
      'Not too many tied values',
      'Observations are independent',
      'At least ordinal measurement level'
    ]
  },

  // ============ CHI-SQUARE ============
  chi_square: {
    name: 'Chi-Square Test',
    commonPitfalls: [
      {
        id: 'small_expected_counts',
        title: 'Small Expected Cell Counts',
        description: 'Chi-square approximation breaks down with small expected frequencies.',
        severity: 'high',
        whenItMatters: 'When any expected cell count < 5.',
        howToDetect: 'Examine expected frequencies in output.',
        solution: 'Use Fisher\'s exact test, combine categories, or collect more data.',
        reference: 'Agresti (2007). An Introduction to Categorical Data Analysis.'
      },
      {
        id: 'non_independence',
        title: 'Non-Independent Observations',
        description: 'Each observation should contribute to only one cell.',
        severity: 'high',
        whenItMatters: 'When same person appears in multiple categories.',
        howToDetect: 'Consider if observations could be linked.',
        solution: 'Use McNemar\'s test for paired data, multilevel models for clustered.',
        reference: 'Fleiss et al. (2003). Statistical Methods for Rates and Proportions.'
      },
      {
        id: 'post_hoc_comparisons',
        title: 'Post-Hoc Cell Comparisons',
        description: 'Comparing specific cells after seeing results inflates error.',
        severity: 'medium',
        whenItMatters: 'When making specific cell comparisons not planned a priori.',
        howToDetect: 'Were comparisons planned before analysis?',
        solution: 'Use adjusted residuals with Bonferroni correction.',
        reference: 'Beasley & Schumacker (1995). Multiple regression approach to analyzing contingency tables.'
      }
    ],
    checklist: [
      'All expected cell counts >= 5',
      'Observations are independent',
      'Categories are mutually exclusive',
      'Sample is randomly selected',
      'Post-hoc comparisons are corrected'
    ]
  },

  // ============ NON-PARAMETRIC ============
  mann_whitney_u: {
    name: 'Mann-Whitney U Test',
    commonPitfalls: [
      {
        id: 'tied_ranks',
        title: 'Many Tied Ranks',
        description: 'Ties affect the test statistic and p-value.',
        severity: 'low',
        whenItMatters: 'When many values are identical.',
        howToDetect: 'Check for ties warning in output.',
        solution: 'Use tie-corrected version (usually automatic).',
        reference: 'Hollander & Wolfe (1999). Nonparametric Statistical Methods.'
      },
      {
        id: 'shape_difference',
        title: 'Comparing Means vs Medians vs Distributions',
        description: 'Mann-Whitney tests if distributions differ, not just central tendency.',
        severity: 'interpretation',
        whenItMatters: 'When distributions have different shapes.',
        howToDetect: 'Compare histograms of both groups.',
        solution: 'Clarify what you\'re testing; consider Mood\'s median test.',
        reference: 'Divine et al. (2018). The Wilcoxon-Mann-Whitney procedure fails as a test of medians.'
      },
      {
        id: 'small_samples',
        title: 'Very Small Samples',
        description: 'With very small samples, the test has limited power.',
        severity: 'low',
        whenItMatters: 'When n < 10 per group.',
        howToDetect: 'Check sample sizes.',
        solution: 'Use exact p-value calculation, consider permutation test.',
        reference: 'Mundry & Fischer (1998). Use of statistical programs for nonparametric tests.'
      }
    ],
    checklist: [
      'Groups are independent',
      'Measurement is at least ordinal',
      'Similar distribution shapes (if comparing medians)',
      'Adequate sample size per group',
      'Random sampling'
    ]
  },

  // ============ NORMALITY TESTS ============
  shapiro_wilk: {
    name: 'Shapiro-Wilk Normality Test',
    commonPitfalls: [
      {
        id: 'overpowered',
        title: 'Significant with Large Samples',
        description: 'Large samples detect trivial deviations from normality.',
        severity: 'interpretation',
        whenItMatters: 'When n > 300.',
        howToDetect: 'Check sample size; significant result with large n.',
        solution: 'Rely on Q-Q plot visual inspection, consider practical significance.',
        reference: 'Ghasemi & Zahediasl (2012). Normality tests for statistical analysis.'
      },
      {
        id: 'underpowered',
        title: 'Non-Significant with Small Samples',
        description: 'Small samples may fail to detect real non-normality.',
        severity: 'interpretation',
        whenItMatters: 'When n < 20.',
        howToDetect: 'Check sample size; non-significant result with small n.',
        solution: 'Use conservative non-parametric alternatives.',
        reference: 'Razali & Wah (2011). Power comparisons of Shapiro-Wilk, Kolmogorov-Smirnov, Lilliefors and Anderson-Darling tests.'
      }
    ],
    checklist: [
      'Interpret result in context of sample size',
      'Combine with visual inspection (Q-Q plot)',
      'Consider purpose (which test will use this data)',
      'Report exact W statistic and p-value'
    ]
  }
};

/**
 * General statistical pitfalls (apply to multiple tests)
 */
export const GENERAL_PITFALLS = {
  p_hacking: {
    title: 'P-Hacking / Data Dredging',
    description: 'Trying multiple analyses until finding p < 0.05.',
    severity: 'high',
    signs: [
      'Running many different tests on same data',
      'Selectively removing outliers until significant',
      'Stopping data collection when p < 0.05',
      'Trying multiple ways to define variables'
    ],
    solution: 'Pre-register analyses, report all tests, use appropriate corrections.',
    reference: 'Simmons et al. (2011). False-positive psychology.'
  },

  harking: {
    title: 'HARKing (Hypothesizing After Results Known)',
    description: 'Presenting post-hoc findings as a priori predictions.',
    severity: 'high',
    signs: [
      'Hypothesis matches results too perfectly',
      'No mention of unexpected findings',
      'Theory conveniently explains exact pattern'
    ],
    solution: 'Clearly distinguish confirmatory from exploratory analyses.',
    reference: 'Kerr (1998). HARKing: Hypothesizing after the results are known.'
  },

  multiple_testing: {
    title: 'Multiple Testing Without Correction',
    description: 'Running many tests increases false positive rate.',
    severity: 'high',
    formula: 'P(at least one false positive) = 1 - (1 - α)^k',
    example: 'With 20 tests at α=0.05: 1 - 0.95^20 = 64% chance of false positive',
    solution: 'Use Bonferroni, Holm, FDR, or other correction methods.',
    reference: 'Benjamini & Hochberg (1995). Controlling the false discovery rate.'
  },

  confusing_significance: {
    title: 'Statistical vs Practical Significance',
    description: 'A statistically significant result may not be practically meaningful.',
    severity: 'interpretation',
    signs: [
      'Focusing only on p-value',
      'Ignoring effect size',
      'Not considering confidence interval width'
    ],
    solution: 'Always report and interpret effect sizes and confidence intervals.',
    reference: 'Sullivan & Feinn (2012). Using effect size.'
  },

  base_rate_neglect: {
    title: 'Base Rate Neglect',
    description: 'Ignoring prior probability when interpreting results.',
    severity: 'interpretation',
    example: 'A "95% accurate" test still produces many false positives if the condition is rare.',
    solution: 'Consider positive/negative predictive values, use Bayesian reasoning.',
    reference: 'Gigerenzer & Hoffrage (1995). How to improve Bayesian reasoning without instruction.'
  },

  ecological_fallacy: {
    title: 'Ecological Fallacy',
    description: 'Inferring individual relationships from group-level data.',
    severity: 'interpretation',
    example: 'Countries with higher chocolate consumption have more Nobel laureates, but this doesn\'t mean eating chocolate makes individuals smarter.',
    solution: 'Analyze at the appropriate level, be cautious about cross-level inferences.',
    reference: 'Robinson (1950). Ecological correlations and the behavior of individuals.'
  }
};

/**
 * Get pitfalls for a specific test type
 */
export function getPitfallsForTest(testType) {
  // Normalize test type
  const normalizedType = testType.toLowerCase().replace(/[- ]/g, '_');

  // Direct match
  if (PITFALLS_BY_TEST[normalizedType]) {
    return PITFALLS_BY_TEST[normalizedType];
  }

  // Partial matches
  for (const [key, value] of Object.entries(PITFALLS_BY_TEST)) {
    if (normalizedType.includes(key) || key.includes(normalizedType)) {
      return value;
    }
  }

  // Return generic pitfalls
  return {
    name: testType,
    commonPitfalls: [],
    checklist: [
      'Check all assumptions',
      'Examine data quality',
      'Consider effect size',
      'Report exact p-values'
    ]
  };
}

/**
 * Get checklist for a test type
 */
export function getChecklistForTest(testType) {
  const pitfalls = getPitfallsForTest(testType);
  return pitfalls.checklist || [];
}

/**
 * Get all general pitfalls
 */
export function getGeneralPitfalls() {
  return Object.values(GENERAL_PITFALLS);
}

/**
 * Check if a specific pitfall applies based on analysis results
 */
export function checkPitfall(pitfallId, analysisResults) {
  // Implementation for specific pitfall detection
  const checks = {
    small_expected_counts: () => {
      return analysisResults.expectedCounts?.some(c => c < 5);
    },
    borderline_significance: () => {
      const p = analysisResults.pValue;
      const alpha = analysisResults.alpha || 0.05;
      return Math.abs(p - alpha) < 0.01;
    },
    underpowered: () => {
      return analysisResults.power && analysisResults.power < 0.80;
    },
    outliers_present: () => {
      return analysisResults.outliers && analysisResults.outliers.length > 0;
    }
  };

  return checks[pitfallId] ? checks[pitfallId]() : false;
}

export default {
  PITFALLS_BY_TEST,
  GENERAL_PITFALLS,
  getPitfallsForTest,
  getChecklistForTest,
  getGeneralPitfalls,
  checkPitfall
};
