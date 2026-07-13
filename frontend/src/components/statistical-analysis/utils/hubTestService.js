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

import { getApiUrl, endpoints } from '../../../config/apiConfig';

const NORMALITY_URL = '/v1/stats/normality/';
const CORRELATION_URL = '/v1/stats/correlation/';
const CHI_SQUARE_URL = '/v1/categorical/chi-square/independence/';

const post = async (path, body) => {
  const response = await fetch(getApiUrl(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error || payload?.detail || `The server returned ${response.status} ${response.statusText}.`
    );
  }

  return payload;
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

// ---------------------------------------------------------------- power analysis
//
// Power analysis is the one calculation whose whole purpose is to be run BEFORE the data exist.
// If it returns a sample size that is too small, nothing downstream can detect that: the study
// gets run, it is underpowered, it misses the effect, and the result is filed as a negative
// finding. There is no residual to inspect and no diagnostic that fires. So it has to be right
// when it is printed, and it was not.
//
// What the browser was computing, and what it should have been:
//
//   * t-test power used the NORMAL critical value and the NORMAL CDF, not the non-central t.
//     Overstates power by up to ~4 points.
//
//   * ANOVA power used a normal approximation to the non-central F. At Cohen's f = 0.25 with 4
//     groups and n = 45 it reported 0.66 where the truth is 0.80 -- it told you that you were
//     underpowered when you were not. And `sqrt(2 * lambda - df1)` takes the square root of a
//     NEGATIVE number for small effects; the resulting NaN rendered as "Underpowered (< 80%)",
//     a confident verdict from a calculation that failed. The result was then clamped into
//     [0.001, 0.999], which is itself an invented claim.
//
//   * ANOVA sample size was off by a FACTOR of 2.3x to 3.3x. At f = 0.25 with 4 groups it
//     demanded 126 subjects per group -- 504 in total -- where 45 per group (180 total) reaches
//     80% power. That is not a rounding error; it is a study that cannot be funded.
//
//   * t-test sample size used ceil(2 * ((z_a + z_b) / d)^2), which returns 63 for the single
//     most common power analysis in the literature (d = 0.5, alpha = 0.05, power = 0.80). The
//     answer is 64. At 63 the true power is 0.795, not the 0.80 the researcher believes they
//     have. The formula drops the fact that the t critical value itself depends on n.
//
// All six now run on the backend, against the exact non-central distributions.

const POWER_URLS = {
  't-test': '/v1/power/t-test/',
  anova: '/v1/power/anova/',
  correlation: '/v1/power/correlation/',
};

const SAMPLE_SIZE_URLS = {
  't-test': '/v1/power/sample-size/t-test/',
  anova: '/v1/power/sample-size/anova/',
  correlation: '/v1/power/sample-size/correlation/',
};

/**
 * Power for a given effect size and n. `n` is per-group for the t-test and ANOVA.
 */
export const runPowerCalculation = async ({
  testType,
  effectSize,
  sampleSize,
  alpha = 0.05,
  groups = 2,
  alternative = 'two-sided',
}) => {
  const url = POWER_URLS[testType];
  if (!url) throw new Error(`No power calculation is available for "${testType}".`);

  const body = { effect_size: effectSize, alpha };
  if (testType === 'anova') {
    body.groups = groups;
    body.n_per_group = sampleSize;
  } else {
    body.sample_size = sampleSize;
    body.alternative = alternative;
    if (testType === 't-test') body.test_type = 'independent';
  }

  const results = (await post(url, body)).results || {};
  const power = num(results.power_float ?? results.power);

  return {
    mode: 'calculate-power',
    testType,
    effectSize,
    sampleSize,
    alpha,
    groups: testType === 'anova' ? groups : null,
    power,
    // 1 - null is NaN, and NaN renders as an em dash. beta does not exist when power does not.
    beta: power === null ? null : 1 - power,
    criticalValue: num(results.critical_t ?? results.critical_f ?? results.critical_z),
    nonCentrality: num(results.non_centrality),
    interpretation: results.interpretation || null,
    raw: results,
  };
};

/**
 * Required sample size for a target power. Per-group for the t-test and ANOVA; total for the
 * correlation, which has only one sample.
 */
export const runSampleSizeCalculation = async ({
  testType,
  effectSize,
  power = 0.8,
  alpha = 0.05,
  groups = 2,
  alternative = 'two-sided',
}) => {
  const url = SAMPLE_SIZE_URLS[testType];
  if (!url) throw new Error(`No sample-size calculation is available for "${testType}".`);

  const body = { effect_size: effectSize, power, alpha };
  if (testType === 'anova') body.groups = groups;
  else body.alternative = alternative;
  if (testType === 't-test') body.test_type = 'independent';

  const results = (await post(url, body)).results || {};
  const requiredN = num(results.required_sample_size);

  return {
    mode: 'calculate-n',
    testType,
    effectSize,
    alpha,
    groups: testType === 'anova' ? groups : null,
    desiredPower: power,
    requiredN,
    // The correlation is a single sample, so "per group" is meaningless for it and its total is
    // its n -- not n x 2, which is what the old code printed.
    perGroup: testType === 'correlation' ? null : requiredN,
    totalN: num(results.total_sample_size),
    // The power actually delivered at that integer n, which is what the study will have. It is
    // at or just above the target, never below -- that is the whole point of solving exactly.
    actualPower: num(results.actual_power_float ?? results.actual_power),
    raw: results,
  };
};

/**
 * Power as a function of n, for the chart.
 */
export const runPowerCurve = async ({
  testType,
  effectSize,
  alpha = 0.05,
  groups = 2,
  alternative = 'two-sided',
  nMin = 5,
  nMax = 200,
  step = 5,
}) => {
  const results =
    (
      await post('/v1/power/curve/', {
        test_type: testType,
        effect_size: effectSize,
        alpha,
        groups,
        alternative,
        n_min: nMin,
        n_max: nMax,
        step,
      })
    ).results || {};

  return (results.points || [])
    .map((point) => ({ n: num(point.n), power: num(point.power), target80: 0.8 }))
    .filter((point) => point.n !== null && point.power !== null);
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
  runPowerCalculation,
  runSampleSizeCalculation,
  runPowerCurve,
};

export default hubTestService;
