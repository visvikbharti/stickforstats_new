import { expect, test } from '@playwright/test';

/**
 * Backend reachability smoke test. Verifies that the Django API is up
 * and that a representative statistical endpoint returns a well-formed
 * success response. Uses Playwright's APIRequest so we don't depend on
 * the frontend render path.
 */

const BACKEND = process.env.PLAYWRIGHT_BACKEND_URL ?? 'http://localhost:8000';

test.describe('Backend API', () => {
  test('/api/v1/health/ returns 200 (DEBUG mode, no SSL redirect)', async ({ request }) => {
    const res = await request.get(`${BACKEND}/api/v1/health/`);
    expect(res.status(), await res.text()).toBe(200);
  });

  test('/api/v1/stats/ttest/ computes a two-sample t-test', async ({ request }) => {
    const res = await request.post(`${BACKEND}/api/v1/stats/ttest/`, {
      data: {
        test_type: 'two_sample',
        data1: [23.1, 24.2, 25.3, 26.4, 27.5],
        data2: [22.5, 23.6, 24.7, 25.8, 26.9],
        parameters: { equal_var: true, confidence: 0.95 },
        options: {
          check_assumptions: false,
          validate_results: false,
          compare_standard: false,
        },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('high_precision_result');
    expect(body.high_precision_result).toHaveProperty('t_statistic');
  });

  test('/api/v1/stats/anova/ supports post_hoc=tukey (regression)', async ({ request }) => {
    // Pins the fix from commit c249838 — prior to that, any post_hoc value
    // returned HTTP 500 because HighPrecisionANOVA exposed no post_hoc_test.
    const res = await request.post(`${BACKEND}/api/v1/stats/anova/`, {
      data: {
        anova_type: 'one_way',
        groups: [
          [1.1, 2.2, 3.3, 4.4, 5.5],
          [3.2, 4.3, 5.4, 6.5, 7.6],
          [5.3, 6.4, 7.5, 8.6, 9.7],
        ],
        alpha: 0.05,
        post_hoc: 'tukey',
        correction: 'none',
        options: {
          check_assumptions: false,
          generate_visualizations: false,
          compare_standard: false,
        },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.post_hoc_results).toBeTruthy();
    expect(Object.keys(body.post_hoc_results)).toEqual(
      expect.arrayContaining([
        'Group_1_vs_Group_2',
        'Group_1_vs_Group_3',
        'Group_2_vs_Group_3',
      ])
    );
  });
});
