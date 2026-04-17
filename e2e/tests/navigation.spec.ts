import { expect, test } from '@playwright/test';

/**
 * Navigation smoke test — walks the main routes and asserts that each
 * lands on a page without crashing (root mounts, #root has children).
 *
 * Routes are taken from frontend/src/routes/ (the 25 primary pages). We
 * sample a handful of the highest-traffic ones so the test stays fast.
 */

const ROUTES = [
  { path: '/', label: 'home' },
  { path: '/dashboard', label: 'dashboard' },
  { path: '/modules/hypothesis-testing', label: 'hypothesis testing module' },
  { path: '/modules/t-test', label: 't-test module' },
  { path: '/test-selection', label: 'test selection' },
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

    // No uncaught JavaScript exceptions on mount.
    expect(errors, errors.join('\n')).toEqual([]);
  });
}
