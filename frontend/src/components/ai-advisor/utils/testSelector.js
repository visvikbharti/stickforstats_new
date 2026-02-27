/**
 * Statistical Test Selector
 *
 * Decision tree logic for recommending appropriate statistical tests
 * based on research question, data characteristics, and assumptions.
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

/**
 * Complete test catalog with metadata
 */
export const TEST_CATALOG = {
  // T-tests
  'independent-t-test': {
    name: 'Independent Samples t-test',
    category: 'Parametric',
    purpose: 'Compare means between two independent groups',
    requirements: {
      dvType: 'continuous',
      ivType: 'categorical',
      groups: 2,
      independent: true,
    },
    assumptions: ['normality', 'homogeneity', 'independence'],
    effectSize: 'cohens_d',
    nonParametricAlternative: 'mann-whitney',
  },

  'paired-t-test': {
    name: 'Paired Samples t-test',
    category: 'Parametric',
    purpose: 'Compare means for matched/repeated measurements',
    requirements: {
      dvType: 'continuous',
      ivType: 'categorical',
      groups: 2,
      independent: false,
    },
    assumptions: ['normality_of_differences', 'independence_of_pairs'],
    effectSize: 'cohens_d',
    nonParametricAlternative: 'wilcoxon',
  },

  'one-sample-t-test': {
    name: 'One-Sample t-test',
    category: 'Parametric',
    purpose: 'Compare sample mean to a known/hypothesized value',
    requirements: {
      dvType: 'continuous',
      groups: 1,
    },
    assumptions: ['normality'],
    effectSize: 'cohens_d',
    nonParametricAlternative: 'wilcoxon-one-sample',
  },

  // Non-parametric alternatives
  'mann-whitney': {
    name: 'Mann-Whitney U Test',
    category: 'Non-parametric',
    purpose: 'Compare distributions between two independent groups',
    requirements: {
      dvType: ['continuous', 'ordinal'],
      ivType: 'categorical',
      groups: 2,
      independent: true,
    },
    assumptions: ['independence'],
    effectSize: 'rank_biserial',
    parametricAlternative: 'independent-t-test',
  },

  'wilcoxon': {
    name: 'Wilcoxon Signed-Rank Test',
    category: 'Non-parametric',
    purpose: 'Compare distributions for matched/repeated measurements',
    requirements: {
      dvType: ['continuous', 'ordinal'],
      groups: 2,
      independent: false,
    },
    assumptions: ['symmetry_of_differences'],
    effectSize: 'rank_biserial',
    parametricAlternative: 'paired-t-test',
  },

  // ANOVA family
  'one-way-anova': {
    name: 'One-Way ANOVA',
    category: 'Parametric',
    purpose: 'Compare means across 3+ independent groups',
    requirements: {
      dvType: 'continuous',
      ivType: 'categorical',
      groups: [3, Infinity],
      independent: true,
    },
    assumptions: ['normality', 'homogeneity', 'independence'],
    effectSize: 'eta_squared',
    nonParametricAlternative: 'kruskal-wallis',
    postHoc: ['tukey', 'bonferroni', 'scheffe'],
  },

  'two-way-anova': {
    name: 'Two-Way ANOVA',
    category: 'Parametric',
    purpose: 'Examine effects of two factors and their interaction',
    requirements: {
      dvType: 'continuous',
      ivType: 'categorical',
      factors: 2,
      independent: true,
    },
    assumptions: ['normality', 'homogeneity', 'independence'],
    effectSize: 'partial_eta_squared',
    postHoc: ['tukey', 'bonferroni'],
  },

  'repeated-measures-anova': {
    name: 'Repeated Measures ANOVA',
    category: 'Parametric',
    purpose: 'Compare means across 3+ related groups/timepoints',
    requirements: {
      dvType: 'continuous',
      groups: [3, Infinity],
      independent: false,
    },
    assumptions: ['normality', 'sphericity'],
    effectSize: 'partial_eta_squared',
    nonParametricAlternative: 'friedman',
    postHoc: ['bonferroni'],
  },

  'kruskal-wallis': {
    name: 'Kruskal-Wallis H Test',
    category: 'Non-parametric',
    purpose: 'Compare distributions across 3+ independent groups',
    requirements: {
      dvType: ['continuous', 'ordinal'],
      groups: [3, Infinity],
      independent: true,
    },
    assumptions: ['independence'],
    effectSize: 'epsilon_squared',
    parametricAlternative: 'one-way-anova',
    postHoc: ['dunn'],
  },

  'friedman': {
    name: 'Friedman Test',
    category: 'Non-parametric',
    purpose: 'Compare distributions across 3+ related groups',
    requirements: {
      dvType: ['continuous', 'ordinal'],
      groups: [3, Infinity],
      independent: false,
    },
    assumptions: [],
    effectSize: 'kendalls_w',
    parametricAlternative: 'repeated-measures-anova',
    postHoc: ['nemenyi'],
  },

  // Correlation
  'pearson-correlation': {
    name: 'Pearson Correlation',
    category: 'Parametric',
    purpose: 'Measure linear relationship between two continuous variables',
    requirements: {
      variableTypes: ['continuous', 'continuous'],
      relationship: 'linear',
    },
    assumptions: ['normality', 'linearity', 'homoscedasticity'],
    effectSize: 'r',
    nonParametricAlternative: 'spearman-correlation',
  },

  'spearman-correlation': {
    name: 'Spearman Correlation',
    category: 'Non-parametric',
    purpose: 'Measure monotonic relationship between two variables',
    requirements: {
      variableTypes: ['continuous', 'ordinal'],
      relationship: 'monotonic',
    },
    assumptions: [],
    effectSize: 'rho',
    parametricAlternative: 'pearson-correlation',
  },

  'kendall-correlation': {
    name: "Kendall's Tau",
    category: 'Non-parametric',
    purpose: 'Measure ordinal association, robust to ties',
    requirements: {
      variableTypes: ['ordinal', 'ordinal'],
    },
    assumptions: [],
    effectSize: 'tau',
  },

  // Regression
  'linear-regression': {
    name: 'Linear Regression',
    category: 'Parametric',
    purpose: 'Predict continuous outcome from predictor(s)',
    requirements: {
      dvType: 'continuous',
      predictors: [1, Infinity],
    },
    assumptions: ['linearity', 'normality_of_residuals', 'homoscedasticity', 'independence'],
    effectSize: 'r_squared',
    diagnostics: ['vif', 'durbin_watson', 'residual_plots'],
  },

  'logistic-regression': {
    name: 'Logistic Regression',
    category: 'Parametric',
    purpose: 'Predict binary outcome from predictor(s)',
    requirements: {
      dvType: 'binary',
      predictors: [1, Infinity],
    },
    assumptions: ['independence', 'no_multicollinearity'],
    effectSize: 'odds_ratio',
  },

  // Chi-square tests
  'chi-square-independence': {
    name: 'Chi-Square Test of Independence',
    category: 'Non-parametric',
    purpose: 'Test association between two categorical variables',
    requirements: {
      variableTypes: ['categorical', 'categorical'],
    },
    assumptions: ['expected_frequencies_5'],
    effectSize: 'cramers_v',
    alternativeForSmallN: 'fisher-exact',
  },

  'chi-square-goodness': {
    name: 'Chi-Square Goodness of Fit',
    category: 'Non-parametric',
    purpose: 'Compare observed frequencies to expected distribution',
    requirements: {
      variableType: 'categorical',
      groups: 1,
    },
    assumptions: ['expected_frequencies_5'],
    effectSize: 'w',
  },

  'fisher-exact': {
    name: "Fisher's Exact Test",
    category: 'Non-parametric',
    purpose: 'Test association for 2x2 tables with small samples',
    requirements: {
      variableTypes: ['categorical', 'categorical'],
      tableSize: '2x2',
      smallSample: true,
    },
    assumptions: [],
    effectSize: 'odds_ratio',
  },
};

/**
 * Decision tree for test selection
 */
export const selectAppropriateTest = (context) => {
  const {
    questionType, // 'difference', 'relationship', 'prediction'
    dvType,       // 'continuous', 'ordinal', 'nominal', 'binary'
    ivType,       // 'continuous', 'categorical'
    numGroups,
    independent,
    normalityMet,
    homogeneityMet,
    sampleSize,
    numPredictors: _numPredictors,
  } = context;

  const recommendations = [];

  // Question Type: DIFFERENCE (comparing groups)
  if (questionType === 'difference') {
    // Two groups
    if (numGroups === 2) {
      if (independent) {
        // Independent groups
        if (dvType === 'continuous') {
          if (normalityMet && homogeneityMet) {
            recommendations.push({
              test: TEST_CATALOG['independent-t-test'],
              confidence: 95,
              reason: 'Comparing two independent groups with continuous, normally distributed data',
            });
          } else {
            recommendations.push({
              test: TEST_CATALOG['mann-whitney'],
              confidence: 90,
              reason: 'Non-parametric alternative due to assumption violations',
            });
            recommendations.push({
              test: TEST_CATALOG['independent-t-test'],
              confidence: 70,
              reason: 'T-test is robust to moderate violations with larger samples',
              caveat: 'Consider if n > 30 per group',
            });
          }
        } else if (dvType === 'ordinal') {
          recommendations.push({
            test: TEST_CATALOG['mann-whitney'],
            confidence: 95,
            reason: 'Appropriate for ordinal dependent variable',
          });
        }
      } else {
        // Related/paired groups
        if (dvType === 'continuous') {
          if (normalityMet) {
            recommendations.push({
              test: TEST_CATALOG['paired-t-test'],
              confidence: 95,
              reason: 'Comparing matched pairs with normally distributed differences',
            });
          } else {
            recommendations.push({
              test: TEST_CATALOG['wilcoxon'],
              confidence: 90,
              reason: 'Non-parametric alternative for non-normal differences',
            });
          }
        }
      }
    }

    // Three or more groups
    if (numGroups >= 3) {
      if (independent) {
        if (dvType === 'continuous') {
          if (normalityMet && homogeneityMet) {
            recommendations.push({
              test: TEST_CATALOG['one-way-anova'],
              confidence: 95,
              reason: 'Comparing 3+ independent groups with normal, homogeneous data',
            });
          } else {
            recommendations.push({
              test: TEST_CATALOG['kruskal-wallis'],
              confidence: 90,
              reason: 'Non-parametric alternative for assumption violations',
            });
          }
        }
      } else {
        // Repeated measures
        if (dvType === 'continuous') {
          if (normalityMet) {
            recommendations.push({
              test: TEST_CATALOG['repeated-measures-anova'],
              confidence: 90,
              reason: 'Comparing 3+ related measurements',
            });
          } else {
            recommendations.push({
              test: TEST_CATALOG['friedman'],
              confidence: 90,
              reason: 'Non-parametric alternative for repeated measures',
            });
          }
        }
      }
    }
  }

  // Question Type: RELATIONSHIP (correlation)
  if (questionType === 'relationship') {
    if (dvType === 'continuous' && ivType === 'continuous') {
      if (normalityMet) {
        recommendations.push({
          test: TEST_CATALOG['pearson-correlation'],
          confidence: 95,
          reason: 'Measuring linear relationship between continuous variables',
        });
      }
      recommendations.push({
        test: TEST_CATALOG['spearman-correlation'],
        confidence: normalityMet ? 80 : 95,
        reason: normalityMet
          ? 'Alternative that handles non-linearity'
          : 'Appropriate when normality is not met',
      });
    }

    if (dvType === 'categorical' && ivType === 'categorical') {
      if (sampleSize >= 5 * numGroups) {
        recommendations.push({
          test: TEST_CATALOG['chi-square-independence'],
          confidence: 95,
          reason: 'Testing association between categorical variables',
        });
      } else {
        recommendations.push({
          test: TEST_CATALOG['fisher-exact'],
          confidence: 95,
          reason: 'Small sample size requires exact test',
        });
      }
    }
  }

  // Question Type: PREDICTION
  if (questionType === 'prediction') {
    if (dvType === 'continuous') {
      recommendations.push({
        test: TEST_CATALOG['linear-regression'],
        confidence: 90,
        reason: 'Predicting continuous outcome from predictor(s)',
      });
    } else if (dvType === 'binary') {
      recommendations.push({
        test: TEST_CATALOG['logistic-regression'],
        confidence: 90,
        reason: 'Predicting binary outcome',
      });
    }
  }

  // Sort by confidence
  recommendations.sort((a, b) => b.confidence - a.confidence);

  return recommendations;
};

/**
 * Get test by ID
 */
export const getTestById = (testId) => {
  return TEST_CATALOG[testId] || null;
};

/**
 * Get all tests in a category
 */
export const getTestsByCategory = (category) => {
  return Object.entries(TEST_CATALOG)
    .filter(([_, test]) => test.category === category)
    .map(([id, test]) => ({ id, ...test }));
};

/**
 * Get non-parametric alternative for a test
 */
export const getNonParametricAlternative = (testId) => {
  const test = TEST_CATALOG[testId];
  if (test?.nonParametricAlternative) {
    return {
      id: test.nonParametricAlternative,
      ...TEST_CATALOG[test.nonParametricAlternative],
    };
  }
  return null;
};

/**
 * Get required sample size guidance
 */
export const getSampleSizeGuidance = (testId, effectSize = 'medium') => {
  const _effectSizes = {
    small: { d: 0.2, f: 0.1, r: 0.1 },
    medium: { d: 0.5, f: 0.25, r: 0.3 },
    large: { d: 0.8, f: 0.4, r: 0.5 },
  };

  const sampleSizeTable = {
    'independent-t-test': { small: 394, medium: 64, large: 26 },
    'paired-t-test': { small: 199, medium: 34, large: 15 },
    'one-way-anova': { small: 322, medium: 53, large: 22 }, // per group, k=3
    'pearson-correlation': { small: 783, medium: 85, large: 29 },
    'chi-square-independence': { small: 785, medium: 88, large: 32 },
  };

  return sampleSizeTable[testId]?.[effectSize] || null;
};

const testSelector = {
  TEST_CATALOG,
  selectAppropriateTest,
  getTestById,
  getTestsByCategory,
  getNonParametricAlternative,
  getSampleSizeGuidance,
};

export default testSelector;
