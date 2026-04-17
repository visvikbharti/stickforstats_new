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
        // Drop React Router v7 deprecation warnings — they are noisy but
        // not indicative of a real problem.
        const text = msg.text();
        if (/Future Flag|deprecated/i.test(text)) return;
        errors.push(text);
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });
});
