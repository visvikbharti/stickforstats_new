/**
 * Backend test service for the /statistical-analysis-tools hub.
 * =============================================================
 *
 * Every inferential test on this page now runs on the backend.
 *
 * It used to run in the browser, in `statisticalUtils.js`, on jStat. That produced three
 * kinds of wrong number, all of them visible to the user:
 *
 *   1. A FABRICATED TEST. `shapiroWilkTest()` used W coefficients that are not Royston's and
 *      a normalizing transform that ignored the sample size (Royston's mu and sigma both
 *      depend on n), then floored the result: `Math.max(0.001, ...)`. No sample, however
 *      non-normal, could report p < 0.001. Its own comment conceded it was "an
 *      approximation -- for production, consider server-side calculation".
 *
 *   2. p = 0.0000. Every tail was computed as `1 - jStat.X.cdf(...)`, which cancels in
 *      floating point: `2 * (1 - jStat.studentt.cdf(40, 20))` is exactly 0. The screen then
 *      printed "p = 0.0000 < 0.05 -> significantly different". The backend now returns
 *      p = 1.4e-21 for that case, and renders it.
 *
 *   3. TWO ENGINES, TWO ANSWERS. The Guardian ran a real Shapiro-Wilk on the same data on
 *      the same screen, and could disagree with the JS one sitting above it.
 *
 * Descriptive statistics (mean, median, quartiles, histogram bins) stay in the browser --
 * they are exact arithmetic, there is no p-value to get wrong, and keeping them local keeps
 * the UI responsive while you pick columns.
 */

import axios from 'axios';

import { getApiUrl, endpoints } from '../../../config/apiConfig';

const NORMALITY_URL = '/v1/stats/normality/';
const CORRELATION_URL = '/v1/stats/correlation/';
const CHI_SQUARE_URL = '/v1/categorical/chi-square/independence/';

const post = async (path, body) => {
  const { data } = await axios.post(getApiUrl(path), body, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000,
  });
  return data;
};

/**
 * parseFloat(null) is NaN, which every formatter in this app renders as an em dash. That is
 * the correct outcome: a quantity the backend reports as null does not exist, and must not
 * be turned into a number on the way to the screen. Never use `|| 0` here.
 */
const num = (value) => {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// ---------------------------------------------------------------- normality

export const runNormalityTests = async (data, alpha = 0.05) => {
  const response = await post(NORMALITY_URL, { data, alpha });
  return {
    n: response.n,
    alpha: response.alpha,
    primaryTest: response.primary_test ?? null,
    isNormal: response.is_normal,
    summary: response.summary,
    descriptives: response.descriptives,
    tests: (response.tests || []).map((test) => ({
      name: test.name,
      statistic: num(test.statistic),
      statisticLabel: test.statistic_label,
      pValue: num(test.p_value),
      normal: test.normal,
      note: test.note,
      criticalValues: test.critical_values || null,
    })),
  };
};

// ---------------------------------------------------------------- t-tests

const T_TEST_TYPES = {
  'one-sample': 'one_sample',
  independent: 'two_sample',
  paired: 'paired',
};

export const runTTest = async ({ testType, data1, data2, populationMean = 0, alternative = 'two-sided' }) => {
  const body = {
    test_type: T_TEST_TYPES[testType] || 'two_sample',
    data1,
    alternative,
    parameters: { mu: populationMean },
  };
  if (testType !== 'one-sample') body.data2 = data2;

  const response = await post(endpoints.stats.ttest, body);
  const hp = response.high_precision_result || {};

  return {
    testName: response.test_type || testType,
    // A null t-statistic means the test is UNDEFINED for this input (e.g. both groups are
    // constant, so t = 0/0). It stays null all the way to the screen.
    statistic: num(hp.t_statistic),
    pValue: num(hp.p_value),
    df: num(hp.df),
    alternative: hp.alternative || alternative,
    meanDifference: num(hp.mean_diff),
    standardError: num(hp.se),
    mean1: num(hp.mean1),
    mean2: num(hp.mean2),
    n1: num(hp.n1),
    n2: num(hp.n2),
    interpretation: hp.interpretation || null,
    assumptions: response.assumptions || null,
    raw: response,
  };
};

// ---------------------------------------------------------------- one-way ANOVA

export const runOneWayAnova = async (groups) => {
  const response = await post(endpoints.stats.anova, {
    anova_type: 'one_way',
    groups,
    options: { check_assumptions: true, calculate_effect_sizes: true },
  });
  const hp = response.high_precision_result || {};

  return {
    fStatistic: num(hp.f_statistic),
    pValue: num(hp.p_value),
    dfBetween: num(hp.df_between),
    dfWithin: num(hp.df_within),
    ssBetween: num(hp.ss_between),
    ssWithin: num(hp.ss_within),
    msBetween: num(hp.ms_between),
    msWithin: num(hp.ms_within),
    etaSquared: num(hp.eta_squared),
    omegaSquared: num(hp.omega_squared),
    cohenF: num(hp.cohen_f),
    assumptions: response.assumptions || null,
    raw: response,
  };
};

// ---------------------------------------------------------------- correlation

export const runCorrelation = async (x, y, method = 'pearson', confidenceLevel = 0.95) => {
  const response = await post(CORRELATION_URL, {
    x,
    y,
    method,
    confidence_level: confidenceLevel,
  });
  const hp = response.high_precision_result || response;

  return {
    method,
    // null when a variable is constant: r is 0/0 there, and the backend now says so instead
    // of reporting "r = 0, p = 1.0, a negligible correlation that is not significant".
    r: num(hp.correlation_coefficient),
    pValue: num(hp.p_value),
    df: num(hp.df),
    n: num(hp.sample_size),
    ciLower: num(hp.confidence_interval_lower),
    ciUpper: num(hp.confidence_interval_upper),
    interpretation: hp.interpretation || null,
    raw: response,
  };
};

// ---------------------------------------------------------------- chi-square

export const runChiSquareIndependence = async (contingencyTable, alpha = 0.05) => {
  const response = await post(CHI_SQUARE_URL, {
    contingency_table: contingencyTable,
    alpha,
  });
  const hp = response.results || {};

  return {
    testName: hp.test_name || 'Chi-square test of independence',
    statistic: num(hp.test_statistic),
    pValue: num(hp.p_value),
    df: num(hp.degrees_of_freedom),
    cramersV: num(hp.cramers_v),
    phi: num(hp.phi_coefficient),
    // null when the table has an empty row or column: the odds ratio is 0/0 there. It used
    // to come back as 1 ("no association") from a table with no information in it.
    oddsRatio: num(hp.odds_ratio),
    yatesCorrection: hp.yates_correction ?? null,
    expected: hp.expected_frequencies || null,
    assumptionsMet: hp.assumptions_met || null,
    recommendations: hp.recommendations || [],
    interpretation: hp.interpretation || null,
    raw: response,
  };
};

// ---------------------------------------------------------------- non-parametric

export const runMannWhitney = async (group1, group2, alternative = 'two-sided') => {
  const response = await post(endpoints.nonparametric.mannWhitney, {
    group1,
    group2,
    alternative,
  });
  const hp = response.high_precision_result || {};
  return {
    statistic: num(hp.u_statistic ?? hp.test_statistic),
    pValue: num(hp.p_value),
    zScore: num(hp.z_score),
    effectSize: num(hp.effect_size),
    interpretation: hp.interpretation || null,
    raw: response,
  };
};

export const runKruskalWallis = async (groups) => {
  const response = await post(endpoints.nonparametric.kruskalWallis, { groups });
  const hp = response.high_precision_result || {};
  return {
    statistic: num(hp.h_statistic ?? hp.test_statistic),
    pValue: num(hp.p_value),
    df: num(hp.degrees_of_freedom),
    effectSize: num(hp.effect_size),
    interpretation: hp.interpretation || null,
    raw: response,
  };
};

export const runWilcoxon = async (x, y, alternative = 'two-sided') => {
  const response = await post(endpoints.nonparametric.wilcoxon, { x, y, alternative });
  const hp = response.high_precision_result || {};
  return {
    statistic: num(hp.w_statistic ?? hp.test_statistic),
    pValue: num(hp.p_value),
    zScore: num(hp.z_score),
    effectSize: num(hp.effect_size),
    interpretation: hp.interpretation || null,
    raw: response,
  };
};

const hubTestService = {
  runNormalityTests,
  runTTest,
  runOneWayAnova,
  runCorrelation,
  runChiSquareIndependence,
  runMannWhitney,
  runKruskalWallis,
  runWilcoxon,
};

export default hubTestService;
