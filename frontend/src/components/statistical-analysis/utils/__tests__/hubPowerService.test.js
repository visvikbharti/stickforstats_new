/**
 * The power analysis the browser used to do itself.
 *
 * Power analysis is the one calculation whose whole purpose is to be run BEFORE the data exist.
 * If it hands back a sample size that is too small, nothing downstream can catch it: the study is
 * run, it is underpowered, it misses the effect, and the result is filed as a negative finding.
 * There is no residual to inspect and no diagnostic that fires. It has to be right when it is
 * printed.
 *
 * These tests pin the service to the backend and pin the two ways the old code lied:
 *
 *   1. It computed the numbers itself, with the wrong distributions.
 *   2. When a computation failed it produced NaN, and NaN rendered as a confident verdict.
 */

import { runPowerCalculation, runSampleSizeCalculation, runPowerCurve } from '../hubTestService';

const mockJson = (body, ok = true, statusText = 'OK') => {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 400,
    statusText,
    json: () => Promise.resolve(body),
  });
};

const bodyOf = (call = 0) => JSON.parse(global.fetch.mock.calls[call][1].body);
const urlOf = (call = 0) => global.fetch.mock.calls[call][0];

afterEach(() => jest.resetAllMocks());

describe('the calculations happen on the backend, not in the browser', () => {
  test('t-test power posts to the exact non-central t endpoint', async () => {
    mockJson({ results: { power_float: 0.8014595579222541, non_centrality: '2.0' } });

    const result = await runPowerCalculation({
      testType: 't-test',
      effectSize: 0.5,
      sampleSize: 64,
      alpha: 0.05,
    });

    expect(urlOf()).toContain('/v1/power/t-test/');
    expect(bodyOf()).toMatchObject({ effect_size: 0.5, sample_size: 64, test_type: 'independent' });
    expect(result.power).toBeCloseTo(0.80146, 5);
    expect(result.beta).toBeCloseTo(0.19854, 5);
  });

  test('ANOVA power posts n_per_group and groups, not sample_size', async () => {
    // The browser's own version needed neither, because it was approximating.
    mockJson({ results: { power_float: 0.8039869128651757 } });

    await runPowerCalculation({
      testType: 'anova',
      effectSize: 0.25,
      sampleSize: 45,
      groups: 4,
      alpha: 0.05,
    });

    expect(urlOf()).toContain('/v1/power/anova/');
    expect(bodyOf()).toMatchObject({ effect_size: 0.25, groups: 4, n_per_group: 45 });
  });

  test('ANOVA sample size posts to the endpoint that solves it exactly', async () => {
    // The browser used ceil(k * ((za + zb) / (f * sqrt(k)))^2), which for f = 0.25 and k = 4
    // demands 126 per group -- 504 subjects. The exact answer is 45 per group, 180 total. That
    // is not a rounding error; it is a study that cannot be funded.
    mockJson({
      results: {
        required_sample_size: 45,
        sample_size_per_group: 45,
        total_sample_size: 180,
        actual_power_float: 0.8039869128651757,
      },
    });

    const result = await runSampleSizeCalculation({
      testType: 'anova',
      effectSize: 0.25,
      groups: 4,
      power: 0.8,
    });

    expect(urlOf()).toContain('/v1/power/sample-size/anova/');
    expect(result.requiredN).toBe(45);
    expect(result.totalN).toBe(180);
    expect(result.requiredN).not.toBe(126); // the number the app used to print
    expect(result.actualPower).toBeGreaterThanOrEqual(0.8);
  });

  test('the t-test sample size is 64, not the 63 the closed form gives', async () => {
    mockJson({
      results: { required_sample_size: 64, total_sample_size: 128, actual_power_float: 0.801459 },
    });

    const result = await runSampleSizeCalculation({ testType: 't-test', effectSize: 0.5, power: 0.8 });

    expect(result.requiredN).toBe(64);
    // ...and the power it reports is the power AT 64, which is at or above the target. Never
    // below it -- that is the whole reason the backend solves this instead of rounding.
    expect(result.actualPower).toBeGreaterThanOrEqual(0.8);
  });
});

describe('a correlation has one sample, not two groups', () => {
  test('its total N is its N, not N x 2, and it has no per-group size', async () => {
    // The old code printed "Need 85 per group" and a total of 170 for a correlation, which has
    // no groups at all.
    mockJson({ results: { required_sample_size: 85, total_sample_size: 85, actual_power_float: 0.8003 } });

    const result = await runSampleSizeCalculation({ testType: 'correlation', effectSize: 0.3, power: 0.8 });

    expect(result.requiredN).toBe(85);
    expect(result.totalN).toBe(85);
    expect(result.totalN).not.toBe(170);
    expect(result.perGroup).toBeNull();
    expect(result.groups).toBeNull();
  });
});

describe('a power that does not exist stays missing', () => {
  test('a null power does not become 0, and beta does not become 1', async () => {
    // The old ANOVA branch took sqrt(2 * ncp - dfBetween), which is the square root of a
    // NEGATIVE number whenever the effect is small. The NaN it returned was then rendered as
    // "Underpowered (< 80%)": a confident verdict about a study, from a calculation that failed.
    mockJson({ results: { power_float: null } });

    const result = await runPowerCalculation({
      testType: 'anova',
      effectSize: 0.02,
      sampleSize: 30,
      groups: 2,
    });

    expect(result.power).toBeNull();
    expect(result.power).not.toBe(0);
    expect(result.beta).toBeNull(); // NOT 1 - null === 1
  });

  test('a backend error surfaces as an error, not as a number', async () => {
    mockJson({ error: 'No sample size gives power against a true correlation of exactly 0.' }, false);

    await expect(runSampleSizeCalculation({ testType: 'correlation', effectSize: 0 })).rejects.toThrow(
      /exactly 0/
    );
  });

  test('an unknown test type is refused rather than silently defaulted', async () => {
    await expect(runPowerCalculation({ testType: 'banana', effectSize: 0.5, sampleSize: 20 })).rejects.toThrow(
      /banana/
    );
  });
});

describe('the power curve', () => {
  test('undefined points are dropped, not plotted at a placeholder value', async () => {
    // A gap in a line is honest. A point at 0.001 -- which is what the old `Math.max(0.001, ...)`
    // clamp produced -- is a claim that the design has essentially no chance of detecting the
    // effect, which is a different statement from "this is not defined here".
    mockJson({
      results: {
        points: [
          { n: 5, power: 0.1 },
          { n: 10, power: 0.2 },
          { n: 15, power: null },
          { n: 20, power: 0.35 },
        ],
      },
    });

    const curve = await runPowerCurve({ testType: 't-test', effectSize: 0.5 });

    expect(curve).toHaveLength(3);
    expect(curve.map((point) => point.n)).toEqual([5, 10, 20]);
    expect(curve.every((point) => point.power !== null)).toBe(true);
    expect(curve[0].target80).toBe(0.8);
  });

  test('it asks the backend, and passes the groups an ANOVA curve needs', async () => {
    mockJson({ results: { points: [] } });

    await runPowerCurve({ testType: 'anova', effectSize: 0.25, groups: 4, alpha: 0.05 });

    expect(urlOf()).toContain('/v1/power/curve/');
    expect(bodyOf()).toMatchObject({ test_type: 'anova', effect_size: 0.25, groups: 4 });
  });
});
