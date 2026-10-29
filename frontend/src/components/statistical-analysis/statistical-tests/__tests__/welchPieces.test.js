/**
 * The pieces Welch's t-test adds outside the page: the request it sends, the code it exports,
 * the debugger content it looks up and the Guardian hand-off. The page test
 * (ParametricTests.welch.test.jsx) covers them together; these pin each one.
 */
import fs from 'fs';
import path from 'path';
import { runTTest } from '../../utils/hubTestService';
import { generateRCode, generatePythonCode } from '../../../../utils/codeExport/statisticalTestsCodeGenerator';
import { getPitfallsForTest, getChecklistForTest } from '../../../statistical-debugger/utils/pitfallsDatabase';
import { buildNonParametricHandoff, correctAlternatives } from '../guardianFallback';
import captured from './fixtures/welchDemoResponses.json';

const groups = {};
fs.readFileSync(path.join(__dirname, 'fixtures', 'guardian_demo_long.csv'), 'utf8')
  .trim()
  .split('\n')
  .slice(1)
  .forEach((line) => {
    const [group, measurement] = line.split(',');
    (groups[group] = groups[group] || []).push(Number(measurement));
  });

describe('runTTest', () => {
  let bodies;
  beforeEach(() => {
    bodies = [];
    global.fetch = jest.fn(async (url, init) => {
      const body = JSON.parse(init.body);
      bodies.push(body);
      return { ok: true, json: async () => (body.equal_variance === false ? captured.ttest_welch : captured.ttest_student) };
    });
  });
  afterEach(() => {
    delete global.fetch;
  });

  test("Welch's asks for the two-sample test without equal variances, and reads the CI", async () => {
    const result = await runTTest({ testType: 'welch_t_test', data1: groups.Treatment, data2: groups.Control });
    expect(bodies[0]).toMatchObject({ test_type: 'two_sample', equal_variance: false, data1: groups.Treatment, data2: groups.Control });
    expect(result.statistic).toBeCloseTo(-1.3449, 4);
    expect(result.df).toBeCloseTo(9.5521, 4);
    expect(result.pValue).toBeCloseTo(0.2097, 4);
    expect(result.ciLower).toBeCloseTo(-19.585, 3);
    expect(result.ciUpper).toBeCloseTo(4.9, 3);
    expect(result.ciLevel).toBe(0.95);
  });

  test('the independent t-test request is unchanged', async () => {
    await runTTest({ testType: 'independent', data1: groups.Treatment, data2: groups.Control });
    expect(bodies[0].test_type).toBe('two_sample');
    expect(bodies[0]).not.toHaveProperty('equal_variance');
  });
});

describe("Welch's code export", () => {
  const params = {
    testType: 'welch_t_test',
    data: { groups, columnName: 'measurement', groupColumn: 'group' },
    options: { alpha: 0.05 },
  };

  test('R: t.test on two vectors, in the order the page uses', () => {
    const code = generateRCode(params);
    expect(code).toContain('result <- t.test(group1, group2, var.equal = FALSE, conf.level = 0.95)');
    expect(code).toContain(`name1 <- "Treatment"`);
    expect(code).toContain(`group1 <- c(${groups.Treatment.join(', ')})`);
    expect(code).toContain(`group2 <- c(${groups.Control.join(', ')})`);
    expect(code).toMatch(/formula interface[\s\S]*alphabetical/);
  });

  test('Python: scipy ttest_ind with equal_var=False and the Welch-Satterthwaite df', () => {
    const code = generatePythonCode(params);
    expect(code).toContain('result = stats.ttest_ind(group1, group2, equal_var=False)');
    expect(code).toContain(`group1 = np.array([${groups.Treatment.join(', ')}])`);
    expect(code).toContain('t_crit = stats.t.ppf(0.975, df)');
    expect(code).toContain('d_star = mean_difference / np.sqrt((v1 + v2) / 2)');
  });

  test('a selection without exactly two groups says so instead of exporting code', () => {
    const three = { ...params, data: { groups: { a: [1, 2], b: [3, 4], c: [5, 6] } } };
    expect(() => generateRCode(three)).toThrow(/exactly two groups/);
    expect(() => generatePythonCode(three)).toThrow(/exactly two groups/);
  });

  test('other tests still take the general generator', () => {
    const code = generateRCode({ ...params, testType: 'independent_t_test' });
    expect(code).not.toContain("Welch's t-test (unequal variances)");
  });
});

describe("Welch's debugger content", () => {
  test('reuses the independent-samples content, less the advice to use Welch', () => {
    const welch = getPitfallsForTest('welch_t_test');
    const independent = getPitfallsForTest('independent_t_test');
    expect(welch.name).toBe("Welch's t-Test");
    expect(welch.commonPitfalls.map((p) => p.id)).toEqual(
      independent.commonPitfalls.map((p) => p.id).filter((id) => id !== 'unequal_variances')
    );
    expect(getChecklistForTest('welch_t_test')).toEqual(
      getChecklistForTest('independent_t_test').filter((item) => !/Welch/.test(item))
    );
    expect(independent.commonPitfalls.map((p) => p.id)).toContain('unequal_variances');
  });
});

describe("Welch's Guardian hand-off", () => {
  test('a rank-test suggestion becomes Mann-Whitney, which runs on the two groups', () => {
    expect(correctAlternatives(['mann_whitney', 'bootstrap'], 'welch_t_test')).toEqual(['mann_whitney', 'bootstrap']);
    const handoff = buildNonParametricHandoff({ testType: 'welch_t_test', groupedData: groups });
    expect(handoff.selectedTest).toBe('mann-whitney');
    expect(handoff.dataGroups.map((g) => g.name)).toEqual(['Treatment', 'Control']);
    expect(buildNonParametricHandoff({ testType: 'welch_t_test', groupedData: { a: [1, 2] } })).toBeNull();
  });
});
