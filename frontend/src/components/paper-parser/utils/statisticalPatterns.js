/**
 * Statistical Patterns for Paper Analysis
 *
 * Regex patterns and extraction functions for identifying statistical
 * content in scientific papers. Based on APA 7th edition reporting standards.
 *
 * References:
 * - APA (2020). Publication Manual (7th ed.)
 * - Cumming (2014). The New Statistics
 * - Lakens (2013). Calculating and reporting effect sizes
 *
 * @author StickForStats Team
 * @version 1.0.0
 */

/**
 * P-value patterns (multiple formats)
 */
export const P_VALUE_PATTERNS = {
  // Exact p-values: p = 0.032, p = .001
  exact: /p\s*[=]\s*\.?\d+\.?\d*/gi,

  // Inequality p-values: p < 0.05, p > .001, p ≤ 0.01
  inequality: /p\s*[<>≤≥]\s*\.?\d+\.?\d*/gi,

  // Range p-values: p < .001
  verySmall: /p\s*<\s*\.?0{0,2}1/gi,

  // ns (not significant)
  notSignificant: /\b(ns|n\.s\.|not\s+significant)\b/gi,

  // Combined pattern for all p-values
  all: /p\s*[=<>≤≥]\s*\.?\d+\.?\d*|\b(ns|n\.s\.)\b/gi
};

/**
 * Test statistic patterns
 */
export const TEST_STATISTIC_PATTERNS = {
  // t-test: t(28) = 2.45, t = 3.21
  tTest: /t\s*\(?\s*\d*\.?\d*\s*\)?\s*=\s*[-−]?\d+\.?\d*/gi,

  // F-test/ANOVA: F(2, 45) = 3.21, F(2,45) = 3.21
  fTest: /F\s*\(\s*\d+\s*,\s*\d+\.?\d*\s*\)\s*=\s*\d+\.?\d*/gi,

  // Chi-square: χ²(4) = 12.3, χ2(4) = 12.3, chi-square(4) = 12.3
  chiSquare: /(χ²?|chi-?square)\s*\(?\s*\d+\s*\)?\s*=\s*\d+\.?\d*/gi,

  // Correlation: r = 0.45, r(48) = .67, ρ = 0.55
  correlation: /[rρ]\s*\(?\s*\d*\s*\)?\s*=\s*[-−]?\.?\d+\.?\d*/gi,

  // Mann-Whitney: U = 245, z = 2.34
  mannWhitney: /U\s*=\s*\d+\.?\d*|z\s*=\s*[-−]?\d+\.?\d*/gi,

  // Wilcoxon: W = 123, T = 45
  wilcoxon: /[WT]\s*=\s*\d+\.?\d*/gi,

  // Cohen's d: d = 0.8, Cohen's d = 0.45
  cohensD: /(Cohen'?s?\s*)?d\s*=\s*[-−]?\d+\.?\d*/gi,

  // Eta squared: η² = 0.14, eta² = .12, partial η² = 0.08
  etaSquared: /(partial\s*)?(η²?|eta\s*squared?|ηp²)\s*=\s*\.?\d+\.?\d*/gi,

  // R-squared: R² = 0.45, R2 = .67, adjusted R² = 0.43
  rSquared: /(adjusted\s*)?R²?\s*=\s*\.?\d+\.?\d*/gi,

  // Beta coefficients: β = 0.34, b = 1.23
  beta: /[βbB]\s*=\s*[-−]?\d+\.?\d*/gi,

  // Odds ratio: OR = 2.3, odds ratio = 1.5
  oddsRatio: /(OR|odds\s*ratio)\s*=\s*\d+\.?\d*/gi,

  // Hazard ratio: HR = 1.8
  hazardRatio: /HR\s*=\s*\d+\.?\d*/gi
};

/**
 * Sample size patterns
 */
export const SAMPLE_SIZE_PATTERNS = {
  // N = 150, n = 30
  explicit: /[Nn]\s*=\s*\d+/gi,

  // Subgroup: n1 = 25, n2 = 30
  subgroup: /n\d?\s*=\s*\d+/gi,

  // Descriptive: "150 participants", "30 subjects"
  participants: /\d+\s*(participants?|subjects?|patients?|respondents?|individuals?|cases?|samples?)/gi,

  // In parentheses: (n = 30), (N = 150)
  inParentheses: /\(\s*[Nn]\s*=\s*\d+\s*\)/gi
};

/**
 * Confidence interval patterns
 */
export const CI_PATTERNS = {
  // 95% CI [0.23, 0.67], 95% CI = [1.2, 3.4]
  standard: /\d{2,3}\s*%?\s*CI\s*[=:]?\s*\[?\s*[-−]?\d+\.?\d*\s*[,;to−-]\s*[-−]?\d+\.?\d*\s*\]?/gi,

  // CI: 0.23-0.67, CI: (1.2, 3.4)
  bracketed: /CI\s*[:=]?\s*[[(]?\s*[-−]?\d+\.?\d*\s*[,;to−-]\s*[-−]?\d+\.?\d*\s*[\])]?/gi,

  // Any percentage CI
  anyPercent: /\d{2,3}\s*%\s*confidence\s*interval/gi
};

/**
 * Mean and SD patterns
 */
export const DESCRIPTIVE_PATTERNS = {
  // M = 25.3, SD = 4.2
  meanSD: /M\s*=\s*[-−]?\d+\.?\d*\s*,?\s*SD\s*=\s*\d+\.?\d*/gi,

  // Mean = 25.3 (SD = 4.2)
  meanSDParens: /[Mm]ean\s*=?\s*[-−]?\d+\.?\d*\s*\(?\s*SD\s*=?\s*\d+\.?\d*\s*\)?/gi,

  // M ± SD format
  plusMinus: /M\s*=\s*[-−]?\d+\.?\d*\s*[±]\s*\d+\.?\d*/gi,

  // SE = 0.45, SEM = 0.32
  standardError: /SE[M]?\s*=\s*\d+\.?\d*/gi,

  // Median = 23, Mdn = 23
  median: /(Median|Mdn)\s*=\s*[-−]?\d+\.?\d*/gi,

  // Range: 10-50, range = 10 to 50
  range: /[Rr]ange\s*[=:]?\s*[-−]?\d+\.?\d*\s*[-−to]+\s*[-−]?\d+\.?\d*/gi
};

/**
 * Statistical test names
 */
export const TEST_NAME_PATTERNS = {
  tTests: /\b(independent[- ]samples?\s*t[- ]?test|paired[- ]samples?\s*t[- ]?test|one[- ]sample\s*t[- ]?test|two[- ]sample\s*t[- ]?test|Student'?s?\s*t[- ]?test|Welch'?s?\s*t[- ]?test)\b/gi,

  anova: /\b(one[- ]way\s*ANOVA|two[- ]way\s*ANOVA|repeated[- ]measures?\s*ANOVA|mixed\s*ANOVA|factorial\s*ANOVA|ANCOVA|MANOVA|MANCOVA|analysis\s*of\s*variance)\b/gi,

  nonParametric: /\b(Mann[- ]Whitney|Wilcoxon|Kruskal[- ]Wallis|Friedman|Spearman|Kendall|sign\s*test|binomial\s*test)\b/gi,

  correlation: /\b(Pearson|Spearman|Kendall|point[- ]biserial|partial\s*correlation|bivariate\s*correlation)\b/gi,

  regression: /\b(linear\s*regression|multiple\s*regression|logistic\s*regression|hierarchical\s*regression|stepwise\s*regression|polynomial\s*regression|ridge\s*regression|lasso)\b/gi,

  chiSquare: /\b(chi[- ]square|χ²|goodness[- ]of[- ]fit|Fisher'?s?\s*exact|McNemar)\b/gi,

  effectSize: /\b(Cohen'?s?\s*[dDfF]|Hedges'?\s*[gG]|Glass'?\s*[Δδ]|eta[- ]squared|partial\s*eta[- ]squared|omega[- ]squared|Cramer'?s?\s*V|phi\s*coefficient|effect\s*size)\b/gi,

  power: /\b(power\s*analysis|statistical\s*power|a\s*priori\s*power|post[- ]hoc\s*power|achieved\s*power|required\s*sample\s*size)\b/gi
};

/**
 * Degrees of freedom patterns
 */
export const DF_PATTERNS = {
  // df = 28, df = 2, 45
  explicit: /df\s*=\s*\d+\s*,?\s*\d*/gi,

  // In parentheses: t(28), F(2, 45)
  inStatistic: /[tF]\s*\(\s*\d+\s*(?:,\s*\d+)?\s*\)/gi
};

/**
 * Alpha level patterns
 */
export const ALPHA_PATTERNS = {
  // α = 0.05, alpha = .01
  explicit: /(α|alpha)\s*=\s*\.?\d+\.?\d*/gi,

  // significance level of 0.05
  level: /significance\s*level\s*(?:of\s*)?\s*\.?\d+\.?\d*/gi,

  // p < 0.05 criterion
  criterion: /p\s*<\s*\.?\d+\.?\d*\s*(?:criterion|threshold|level)/gi
};

/**
 * Extract all statistical content from text
 * @param {string} text - Text to analyze
 * @returns {Object} - Extracted statistical elements
 */
export function extractStatisticalContent(text) {
  const results = {
    pValues: [],
    testStatistics: [],
    sampleSizes: [],
    confidenceIntervals: [],
    descriptives: [],
    testNames: [],
    effectSizes: [],
    degreesOfFreedom: [],
    alphaLevels: []
  };

  // Extract p-values
  const pMatches = text.match(P_VALUE_PATTERNS.all) || [];
  results.pValues = [...new Set(pMatches.map(m => normalizeStatistic(m)))];

  // Extract test statistics
  for (const [testType, pattern] of Object.entries(TEST_STATISTIC_PATTERNS)) {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      results.testStatistics.push({
        type: testType,
        value: normalizeStatistic(match),
        raw: match
      });
    });
  }

  // Extract sample sizes
  for (const [sizeType, pattern] of Object.entries(SAMPLE_SIZE_PATTERNS)) {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      const numMatch = match.match(/\d+/);
      if (numMatch) {
        results.sampleSizes.push({
          type: sizeType,
          value: parseInt(numMatch[0]),
          raw: match
        });
      }
    });
  }

  // Extract confidence intervals
  for (const [ciType, pattern] of Object.entries(CI_PATTERNS)) {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      results.confidenceIntervals.push({
        type: ciType,
        value: normalizeStatistic(match),
        raw: match
      });
    });
  }

  // Extract descriptive statistics
  for (const [descType, pattern] of Object.entries(DESCRIPTIVE_PATTERNS)) {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      results.descriptives.push({
        type: descType,
        value: normalizeStatistic(match),
        raw: match
      });
    });
  }

  // Extract test names
  for (const [testCategory, pattern] of Object.entries(TEST_NAME_PATTERNS)) {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      results.testNames.push({
        category: testCategory,
        name: match.trim(),
        raw: match
      });
    });
  }

  // Extract effect sizes (special handling)
  const effectSizePatterns = [
    TEST_STATISTIC_PATTERNS.cohensD,
    TEST_STATISTIC_PATTERNS.etaSquared,
    TEST_STATISTIC_PATTERNS.rSquared
  ];
  effectSizePatterns.forEach(pattern => {
    const matches = text.match(pattern) || [];
    matches.forEach(match => {
      results.effectSizes.push(normalizeStatistic(match));
    });
  });

  // Extract degrees of freedom
  const dfMatches = text.match(DF_PATTERNS.explicit) || [];
  results.degreesOfFreedom = [...new Set(dfMatches.map(m => normalizeStatistic(m)))];

  // Extract alpha levels
  const alphaMatches = text.match(ALPHA_PATTERNS.explicit) || [];
  results.alphaLevels = [...new Set(alphaMatches.map(m => normalizeStatistic(m)))];

  // Deduplicate test statistics
  results.testStatistics = deduplicateByRaw(results.testStatistics);

  // Deduplicate sample sizes
  results.sampleSizes = deduplicateSampleSizes(results.sampleSizes);

  // Deduplicate test names
  results.testNames = deduplicateByName(results.testNames);

  return results;
}

/**
 * Normalize a statistical expression
 * @param {string} stat - Statistical expression
 * @returns {string} - Normalized expression
 */
function normalizeStatistic(stat) {
  return stat
    .replace(/\s+/g, ' ')
    .replace(/−/g, '-')
    .trim();
}

/**
 * Deduplicate array of objects by raw value
 * @param {Array} arr - Array to deduplicate
 * @returns {Array} - Deduplicated array
 */
function deduplicateByRaw(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const key = item.raw.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicate sample sizes
 * @param {Array} arr - Array to deduplicate
 * @returns {Array} - Deduplicated array
 */
function deduplicateSampleSizes(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const key = `${item.type}-${item.value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Deduplicate test names
 * @param {Array} arr - Array to deduplicate
 * @returns {Array} - Deduplicated array
 */
function deduplicateByName(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const key = item.name.toLowerCase().replace(/\s+/g, '');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Parse a p-value string and return numeric value
 * @param {string} pString - P-value string (e.g., "p = 0.032", "p < .001")
 * @returns {Object} - Parsed p-value with type
 */
export function parsePValue(pString) {
  const normalized = pString.toLowerCase().replace(/\s+/g, '');

  // Check for "ns" or "not significant"
  if (/ns|n\.s\.|notsignificant/.test(normalized)) {
    return { value: null, type: 'ns', original: pString };
  }

  // Extract operator and value
  const match = normalized.match(/p([=<>≤≥])\.?(\d+\.?\d*)/);
  if (match) {
    const operator = match[1];
    const value = parseFloat(match[2].startsWith('.') ? '0' + match[2] : match[2]);
    return {
      value,
      operator,
      type: operator === '=' ? 'exact' : 'inequality',
      original: pString
    };
  }

  return { value: null, type: 'unknown', original: pString };
}

/**
 * Categorize p-value significance
 * @param {number} pValue - P-value
 * @param {number} alpha - Alpha level (default 0.05)
 * @returns {Object} - Significance categorization
 */
export function categorizePValue(pValue, alpha = 0.05) {
  if (pValue === null || isNaN(pValue)) {
    return { significant: null, category: 'unknown' };
  }

  if (pValue < 0.001) {
    return { significant: true, category: 'highly significant', stars: '***' };
  }
  if (pValue < 0.01) {
    return { significant: true, category: 'very significant', stars: '**' };
  }
  if (pValue < alpha) {
    return { significant: true, category: 'significant', stars: '*' };
  }
  if (pValue < 0.10) {
    return { significant: false, category: 'marginally significant', stars: '†' };
  }
  return { significant: false, category: 'not significant', stars: '' };
}

/**
 * Extract the primary sample size from results
 * @param {Array} sampleSizes - Array of sample size objects
 * @returns {number|null} - Primary sample size
 */
export function getPrimarySampleSize(sampleSizes) {
  if (!sampleSizes || sampleSizes.length === 0) return null;

  // Prefer explicit N = values
  const explicit = sampleSizes.find(s => s.type === 'explicit');
  if (explicit) return explicit.value;

  // Return largest value as likely total N
  return Math.max(...sampleSizes.map(s => s.value));
}

const statisticalPatterns = {
  P_VALUE_PATTERNS,
  TEST_STATISTIC_PATTERNS,
  SAMPLE_SIZE_PATTERNS,
  CI_PATTERNS,
  DESCRIPTIVE_PATTERNS,
  TEST_NAME_PATTERNS,
  DF_PATTERNS,
  ALPHA_PATTERNS,
  extractStatisticalContent,
  parsePValue,
  categorizePValue,
  getPrimarySampleSize
};

export default statisticalPatterns;
