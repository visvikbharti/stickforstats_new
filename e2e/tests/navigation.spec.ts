import { expect, test } from '@playwright/test';

/**
 * Navigation smoke test — walks the main routes and asserts that each lands on
 * a real page without crashing.
 *
 * A retired route still returns HTTP 200 (the SPA serves index.html for
 * everything) and still mounts #root with children, because the catch-all
 * renders NotFoundPage. So "it rendered" is not enough: assert we did NOT land
 * on the 404. Without that check this file silently walked /dashboard and
 * /test-selection long after both stopped existing.
 */

const ROUTES = [
  { path: '/', label: 'home' },
  { path: '/statistical-analysis-tools', label: 'analysis hub' },
  { path: '/modules/hypothesis-testing', label: 'hypothesis testing module' },
  { path: '/modules/t-test', label: 't-test module' },
  { path: '/modules/anova', label: 'anova module' },
  { path: '/modules/nonparametric-real', label: 'non-parametric module' },
];

for (const { path, label } of ROUTES) {
  test(`visits ${label} (${path}) and renders`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(`${err.name}: ${err.message}`));

    const resp = await page.goto(path);
    // 200 via the dev server; SPA routes also resolve via index.html with 200.
    expect(resp?.status() ?? 200).toBeLessThan(400);

    const root = page.locator('#root');
    await expect(root).toBeVisible();
    const count = await root.evaluate((node) => node.childElementCount);
    expect(count).toBeGreaterThan(0);

    // The route must exist: the catch-all NotFoundPage must not be what mounted.
    await expect(page.getByText('Page Not Found')).toHaveCount(0);

    // No uncaught JavaScript exceptions on mount.
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('a retired route lands on the 404 page rather than a blank screen', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Page Not Found')).toBeVisible();
});
