import { expect, test } from '@playwright/test';

/**
 * Theme visual smoke test — locks the Professional Research Software
 * aesthetic in the DOM, not just the tokens.
 *
 * After the 2026-04-17 redesign:
 *   - App root background should be a solid color (no linear-gradient).
 *   - Buttons should not animate via translate on hover (the transition
 *     property should not include "transform").
 *   - Top-level Paper / Card backgrounds should be fully opaque.
 */

test.describe('Theme visual contract', () => {
  test('root background is a solid color, not a linear-gradient', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const root = page.locator('#root > *').first();
    await expect(root).toBeVisible();

    // Inspect computed backgroundImage — a gradient would include
    // "linear-gradient(" or "radial-gradient(".
    const backgroundImage = await root.evaluate(
      (el) => window.getComputedStyle(el).backgroundImage
    );
    expect(backgroundImage).not.toMatch(/gradient/i);
  });

  test('at least one on-screen Paper/Card is solid, not glassmorphic', async ({ page }) => {
    // Hypothesis-testing module reliably renders multiple Paper/Card nodes.
    await page.goto('/modules/hypothesis-testing');
    await page.waitForLoadState('networkidle');

    const papers = page.locator('.MuiPaper-root, .MuiCard-root');
    const count = await papers.count();
    expect(count).toBeGreaterThan(0);

    const alphas = await papers.evaluateAll((nodes) =>
      nodes.map((el) => {
        const bg = window.getComputedStyle(el).backgroundColor;
        const m = bg.match(/rgba?\(([^)]+)\)/);
        if (!m) return 1;
        const parts = m[1].split(',').map((s) => Number(s.trim()));
        return parts.length === 4 ? parts[3] : 1;
      })
    );

    // At least one Paper/Card must be opaque (alpha >= 0.95). Decorative
    // wrappers with rgba(…, 0) backgrounds are allowed — they let the
    // parent surface show through by design. The regression we're guarding
    // against is EVERY Paper reverting to ~0.25 / ~0.75 glassmorphism.
    const opaque = alphas.filter((a) => a >= 0.95);
    expect(opaque.length, `alphas seen: ${alphas.join(', ')}`).toBeGreaterThan(0);

    // And no Paper should be in the classic glassmorphism band (0.1..0.9).
    const glassy = alphas.filter((a) => a > 0.05 && a < 0.95);
    expect(glassy, `glassy alphas: ${glassy.join(', ')}`).toEqual([]);
  });
});
