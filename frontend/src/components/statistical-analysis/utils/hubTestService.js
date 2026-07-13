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

/**
 * One spec per test the app offers. The `family` decides which endpoint answers, and `variant`
 * disambiguates within a family -- because the backend's t-test endpoint branches on `test_type`
 * and its `else` used to swallow every value it did not recognise, quietly computing a ONE-SAMPLE
 * power for a two-sample request. Nothing here may reach that `else`.
 */
const POWER_TESTS = {
  // t-tests
  't-test': { family: 't', variant: 'independent', grouped: true },
  'two-sample-t': { family: 't', variant: 'independent', grouped: true },
  'independent-t': { family: 't', variant: 'independent', grouped: true },
  'paired-t': { family: 't', variant: 'paired', grouped: false },
  'one-sample-t': { family: 't', variant: 'one-sample', grouped: false },

  // F / chi-square
  anova: { family: 'anova', grouped: true },
  'one-way-anova': { family: 'anova', grouped: true },
  'chi-square': { family: 'chi-square', grouped: false },

  // correlation -- ONE sample, no groups
  correlation: { family: 'correlation', grouped: false },
  pearson: { family: 'correlation', grouped: false },

  // rank tests: no distribution-free closed form (see below)
  'mann-whitney': { family: 'nonparametric', variant: 'mann-whitney', grouped: true },
  wilcoxon: { family: 'nonparametric', variant: 'wilcoxon', grouped: false },
  'kruskal-wallis': { family: 'nonparametric', variant: 'kruskal-wallis', grouped: true },
};

const POWER_URLS = {
  t: '/v1/power/t-test/',
  anova: '/v1/power/anova/',
  correlation: '/v1/power/correlation/',
  'chi-square': '/v1/power/chi-square/',
  nonparametric: '/v1/power/nonparametric/',
};

const SAMPLE_SIZE_URLS = {
  t: '/v1/power/sample-size/t-test/',
  anova: '/v1/power/sample-size/anova/',
  correlation: '/v1/power/sample-size/correlation/',
  'chi-square': '/v1/power/sample-size/chi-square/',
  nonparametric: '/v1/power/sample-size/nonparametric/',
};

const specFor = (testType) => {
  const spec = POWER_TESTS[testType];
  if (!spec) throw new Error(`No power calculation is available for "${testType}".`);
  return spec;
};

/**
 * Can we actually compute power for this test?
 *
 * This has to be askable, because the Study Design Wizard's calculator lookup ended in
 *
 *     return calculators[testType]?.[mode] || calculators['independent-t'][mode];
 *
 * so a user who selected logistic regression, a factorial ANOVA or a Friedman test was silently
 * handed a two-sample t-test sample size, labelled as the answer for the test they picked. A
 * design that we cannot compute must SAY we cannot compute it. Repeated-measures and factorial
 * ANOVA have different degrees of freedom from a one-way ANOVA and are genuinely not covered;
 * regression power needs an F-test on f-squared that the backend does not yet expose.
 */
export const isPowerTestSupported = (testType) => Boolean(POWER_TESTS[testType]);

export const supportedPowerTests = () => Object.keys(POWER_TESTS);

/**
 * Does this design have a second arm the caller can size independently?
 *
 * Only the independent t-test does: it is the one power endpoint that accepts `sample_size2`. The
 * rank tests are two-arm designs too, but their power goes through the ARE route, which has no
 * unequal-arm form -- so a second arm entered for one of them is a number we cannot use.
 *
 * This lives here, next to POWER_TESTS, because the alternative is every caller deciding for
 * itself -- and when PowerAnalysisTool did that, its power request and its total-N disagreed:
 * the request correctly dropped a stale group-2 value on a Mann-Whitney while the total N kept it,
 * so the exported file claimed 90 subjects for a power computed at 30/30. One rule, one place.
 */
export const acceptsSecondArm = (testType) => {
  const spec = POWER_TESTS[testType];
  return Boolean(spec && spec.family === 't' && spec.variant === 'independent');
};

/**
 * How many subjects the design actually needs in total.
 *
 * `n` means "per group" for the two-group and k-group tests and "the sample" for the rest, and
 * only the caller knows which arm sizes were entered. PowerAnalysisTool computed this itself as
 *
 *     totalN: backend.groups ? sampleSize * backend.groups : sampleSize
 *
 * where `groups` is the component's numGroups -- which DEFAULTS TO 3 and has no UI control unless
 * the test is an ANOVA or Kruskal-Wallis. So a two-sample t at n = 30 came out as a total N of 90
 * (the truth is 60), and the group-2 box was ignored even after it started working. That total is
 * not on screen in power mode, but it is written verbatim into the exported JSON.
 *
 * The shape of each test is POWER_TESTS' business, not the component's, so it is answered here.
 */
export const totalSampleSize = (testType, sampleSize, sampleSize2 = null, numGroups = 2) => {
  const spec = POWER_TESTS[testType];
  const n = num(sampleSize);
  if (!spec || n == null) return null;

  // A k-group design: n is per group, and k is a real, user-supplied number.
  if (spec.family === 'anova' || spec.variant === 'kruskal-wallis') {
    const k = num(numGroups);
    return k == null ? null : n * k;
  }

  // A two-group design: exactly two arms, which may be unequal.
  if (spec.grouped) {
    const n2 = num(sampleSize2);
    return n + (n2 ?? n);
  }

  // One sample: paired, one-sample t, correlation, chi-square, Wilcoxon signed-rank.
  return n;
};

/**
 * The rank tests carry an assumption the browser never mentioned.
 *
 * The power of a rank test has no distribution-free closed form -- it depends on the shape of
 * the distribution the data actually came from. The old code used Pitman's asymptotic relative
 * efficiency with ARE = 3/pi and said nothing about it. But 3/pi is the ARE for a NORMAL parent,
 * which is an absurd assumption for a test you reached for precisely BECAUSE normality failed --
 * and it points the wrong way. Under normality the rank test needs about 5% MORE subjects; under
 * the heavy tails that made you abandon the t-test it needs far FEWER (43 per group for a
 * Laplace parent, 22 for an exponential one, against 68 for a normal one). Quoting the
 * normal-parent number to a user with skewed data does not merely add error, it inverts the
 * conclusion.
 *
 * The backend now returns the ARE it used, the parent distribution it assumed, and a note saying
 * so. All three are carried through to the caller, and the UI must show them.
 */
const nonparametricMeta = (results) => ({
  method: results.method || null,
  are: num(results.are),
  parentDistribution: results.parent_distribution || null,
  note: results.note || null,
  parametricSampleSize: num(results.parametric_sample_size),
});

/**
 * Power for a given effect size and n. `n` is per-group where the test has groups.
 */
export const runPowerCalculation = async ({
  testType,
  effectSize,
  sampleSize,
  // Unequal group sizes are a real design, and the UI has always had a "Sample Size (Group 2)"
  // box. It was never sent: a user who entered n1 = 30, n2 = 60 was shown the power for 30/30.
  sampleSize2 = null,
  alpha = 0.05,
  groups = 2,
  df = 1,
  alternative = 'two-sided',
  parentDistribution = 'normal',
}) => {
  const spec = specFor(testType);
  const body = { effect_size: effectSize, alpha };

  if (spec.family === 'anova') {
    body.groups = groups;
    body.n_per_group = sampleSize;
  } else if (spec.family === 'nonparametric') {
    body.test = spec.variant;
    body.sample_size = sampleSize;
    body.groups = groups;
    body.parent_distribution = parentDistribution;
    body.alternative = alternative;
  } else if (spec.family === 'chi-square') {
    body.sample_size = sampleSize;
    body.df = df;
  } else {
    body.sample_size = sampleSize;
    body.alternative = alternative;
    if (spec.family === 't') {
      body.test_type = spec.variant;
      // Only the two-sample test has a second group.
      if (spec.variant === 'independent' && sampleSize2) body.sample_size2 = sampleSize2;
    }
  }

  const results = (await post(POWER_URLS[spec.family], body)).results || {};
  const power = num(results.power_float ?? results.power);

  return {
    mode: 'calculate-power',
    testType,
    effectSize,
    sampleSize,
    alpha,
    groups: spec.grouped ? groups : null,
    power,
    // 1 - null is NaN, and NaN renders as an em dash. beta does not exist when power does not.
    beta: power === null ? null : 1 - power,
    criticalValue: num(results.critical_t ?? results.critical_f ?? results.critical_chi2 ?? results.critical_z),
    nonCentrality: num(results.non_centrality),
    interpretation: results.interpretation || null,
    ...(spec.family === 'nonparametric' ? nonparametricMeta(results) : {}),
    raw: results,
  };
};

/**
 * Required sample size for a target power. Per-group where the test has groups; total otherwise.
 */
export const runSampleSizeCalculation = async ({
  testType,
  effectSize,
  power = 0.8,
  alpha = 0.05,
  groups = 2,
  df = 1,
  alternative = 'two-sided',
  parentDistribution = 'normal',
}) => {
  const spec = specFor(testType);
  const body = { effect_size: effectSize, power, alpha };

  if (spec.family === 'anova') {
    body.groups = groups;
  } else if (spec.family === 'nonparametric') {
    body.test = spec.variant;
    body.groups = groups;
    body.parent_distribution = parentDistribution;
    body.alternative = alternative;
  } else if (spec.family === 'chi-square') {
    body.df = df;
  } else {
    body.alternative = alternative;
    if (spec.family === 't') body.test_type = spec.variant;
  }

  const results = (await post(SAMPLE_SIZE_URLS[spec.family], body)).results || {};
  const requiredN = num(results.required_sample_size);

  return {
    mode: 'calculate-n',
    testType,
    effectSize,
    alpha,
    groups: spec.grouped ? groups : null,
    desiredPower: power,
    requiredN,
    // A correlation, a one-sample t and a chi-square each have ONE sample, so "per group" is
    // meaningless for them and the total is n -- not n x 2, which is what the old code printed.
    perGroup: spec.grouped ? requiredN : null,
    totalN: num(results.total_sample_size),
    // The power actually delivered at that integer n, which is what the study will have. It is
    // at or just above the target, never below -- that is the whole point of solving exactly.
    actualPower: num(results.actual_power_float ?? results.actual_power),
    ...(spec.family === 'nonparametric' ? nonparametricMeta(results) : {}),
    raw: results,
  };
};

/**
 * Power as a function of n, for the chart.
 */
const CURVE_FAMILY = { t: 't-test', anova: 'anova', correlation: 'correlation' };

/**
 * The smallest effect a design can detect at a given power.
 *
 * This is what to report instead of observed (post-hoc) power. Feeding the OBSERVED effect back
 * into the power formula produces a number that is a monotone function of the p-value (Hoenig &
 * Heisey 2001) -- a non-significant result ALWAYS comes back "underpowered", by construction, so
 * the calculation cannot tell you anything the p-value did not already say. The minimum
 * detectable effect answers the question people actually mean: given the n I had, how big would
 * the effect have to have been for me to have caught it?
 */
export const runMinimumDetectableEffect = async ({
  testType,
  sampleSize,
  power = 0.8,
  alpha = 0.05,
  groups = 2,
  alternative = 'two-sided',
}) => {
  const spec = specFor(testType);
  const family = CURVE_FAMILY[spec.family];
  if (!family) {
    throw new Error(`A minimum detectable effect is not available for "${testType}".`);
  }

  const body = { test_type: family, sample_size: sampleSize, power, alpha, alternative };
  if (spec.family === 'anova') body.groups = groups;
  if (spec.family === 't') body.t_test_type = spec.variant;

  const results = (await post('/v1/power/mde/', body)).results || {};

  return {
    effect: num(results.minimum_detectable_effect_float),
    achievedPower: num(results.achieved_power_float),
    sampleSize: num(results.sample_size),
    alpha: num(results.alpha),
    interpretation: results.note || null,
    note: results.note || null,
    raw: results,
  };
};


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
  // The curve is drawn for the parametric families. A rank test has no closed-form curve, and a
  // chi-square curve would need its df; rather than draw an approximation of an approximation,
  // those simply get no curve -- the headline number still comes back from the exact endpoint.
  const spec = specFor(testType);
  const curveTest = CURVE_FAMILY[spec.family];
  if (!curveTest) return [];

  const body = {
    test_type: curveTest,
    effect_size: effectSize,
    alpha,
    groups,
    alternative,
    n_min: nMin,
    n_max: nMax,
    step,
  };

  // The curve endpoint used to pin the t-test variant to "independent", so a curve requested for
  // a PAIRED or one-sample design came back as the independent one and was drawn under the label
  // of the design the user actually chose. A paired t reaches a given power at roughly half the
  // sample size, so the two curves are nowhere near each other.
  if (spec.family === 't') body.t_test_type = spec.variant;

  const results = (await post('/v1/power/curve/', body)).results || {};

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
  runMinimumDetectableEffect,
  isPowerTestSupported,
  supportedPowerTests,
};

export default hubTestService;
