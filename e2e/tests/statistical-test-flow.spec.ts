import { expect, test } from '@playwright/test';

/**
 * Hypothesis-testing module flow smoke test — navigates to the module
 * page and verifies the key workflow affordances are present. Does not
 * actually execute a test (the module uses jStat + backend cascades
 * that require more setup); this is a "the page loads and its primary
 * controls are on-screen" check.
 */

test.describe('Hypothesis testing module', () => {
  test('renders the module page with tabs and module copy', async ({ page }) => {
    await page.goto('/modules/hypothesis-testing');
    await page.waitForLoadState('networkidle');

    // Tabs from HypothesisTestingModule's tab list. Exact labels are part
    // of the module's UX contract; this pins that at least one is reachable.
    const tabRegion = page.locator('[role="tablist"]').first();
    await expect(tabRegion).toBeVisible();

    // Verify that the module renders at least one button — interactivity
    // is present, not just static text.
    const buttonCount = await page.locator('button').count();
    expect(buttonCount).toBeGreaterThan(0);
  });
});
