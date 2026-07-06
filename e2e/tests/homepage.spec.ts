import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
  test('loads the landing page with the expected title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/StickForStats/i);
  });

  test('the root element mounts (no catastrophic render failure)', async ({ page }) => {
    await page.goto('/');
    const root = page.locator('#root');
    await expect(root).toBeVisible();
    // Something renders into #root — element count must be > 0.
    const childCount = await root.evaluate((node) => node.childElementCount);
    expect(childCount).toBeGreaterThan(0);
  });

  test('does not log uncaught errors to the console', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Drop known-benign console noise that is not an app defect:
        //  - React Router v7 future-flag / deprecation warnings.
        if (/Future Flag|deprecated/i.test(text)) return;
        //  - ServiceWorker registration failure: the PWA service worker
        //    registers correctly behind the production nginx build, but under
        //    the CI static server (`npx serve -s build`) the SW script fails
        //    to evaluate. This is an environment artifact, not a page error.
        if (/service.?worker/i.test(text)) return;
        errors.push(text);
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
