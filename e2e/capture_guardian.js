// Capture a Guardian Assumption Report screenshot from the live beta for the manuscript (Fig 7).
// Usage: cd e2e && SFS_BETA_PW='...' node capture_guardian.js
const { chromium } = require('playwright');
const BASE = 'https://stickforstats.com';
const PW = process.env.SFS_BETA_PW;
const OUT = process.env.OUT_DIR || '/Users/vishalbharti/StickForStats_v1.0_Production/paper/plos_compbio/figures';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    httpCredentials: { username: 'beta', password: PW },
    ignoreHTTPSErrors: true,
    viewport: { width: 1280, height: 1600 },
    deviceScaleFactor: 2, // high-res for print
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });

  await page.goto(BASE + '/modules/t-test-real', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(3500);

  // Dismiss the "Welcome to StickForStats!" onboarding modal that overlays the controls.
  try { await page.getByRole('button', { name: /^Skip$/i }).click({ timeout: 8000 }); console.log('dismissed welcome modal'); }
  catch (e) { console.log('no welcome modal:', e.message.slice(0, 80)); }
  await page.waitForTimeout(1200);

  // Enter clearly right-skewed (non-normal) data so Guardian flags a normality violation
  // and recommends a nonparametric alternative (the full assumption -> cascade story).
  const s1 = '2, 2, 3, 3, 3, 4, 4, 5, 6, 9, 14, 22, 48, 95';
  const s2 = '3, 3, 4, 4, 4, 5, 5, 6, 8, 12, 19, 30, 60, 110';
  try {
    await page.getByLabel(/Sample 1/i).fill(s1);
    await page.getByLabel(/Sample 2/i).fill(s2);
    console.log('filled custom skewed data via labels');
  } catch (e) {
    console.log('label fill failed, trying textareas:', e.message.slice(0, 80));
    const tas = page.locator('textarea');
    try { await tas.nth(0).fill(s1); await tas.nth(1).fill(s2); console.log('filled via textareas'); }
    catch (e2) { console.log('textarea fill failed, falling back to Load Example:', e2.message.slice(0, 80));
      try { await page.getByRole('button', { name: /Load Example/i }).click({ timeout: 8000 }); } catch (e3) {} }
  }
  await page.waitForTimeout(1000);

  try { await page.getByRole('button', { name: /Calculate/i }).first().click({ timeout: 12000 }); }
  catch (e) { console.log('Calculate err:', e.message.slice(0, 110)); }

  try { await page.getByText(/Assumption Checks/i).first().waitFor({ timeout: 35000 }); }
  catch (e) { console.log('AssumptionChecks wait err:', e.message.slice(0, 110)); }
  await page.waitForTimeout(2500);

  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  const idx = body.search(/Assumption Checks/i);
  console.log('REPORT_PRESENT:', /Assumption Checks/i.test(body));
  console.log('VIOLATION_KEYWORDS:', /Violated|Warning|Recommend|Alternative|Mann-?Whitney|Check design|Normality|Equal Variance/i.test(body));
  console.log('REPORT_TEXT:', idx >= 0 ? body.slice(idx, idx + 600) : '(not found)');

  await page.screenshot({ path: OUT + '/_guardian_fullpage.png', fullPage: true });
  // Clean clip: from the "T-Test Analysis" title down through the green real-backend confirmation,
  // so the figure shows input data -> 50-decimal results -> assumption violations in one frame.
  try {
    const top = await page.getByText(/T-Test Analysis/i).first().boundingBox();
    let bottomEl = page.getByText(/REAL backend API/i).first();
    let bottom = await bottomEl.boundingBox().catch(() => null);
    if (!bottom) bottom = await page.getByText(/Assumption Checks/i).first().boundingBox();
    const x = 36, width = 1208;
    const y = Math.max(0, top.y - 16);
    const height = (bottom.y + bottom.height + 18) - y;
    await page.screenshot({ path: OUT + '/fig7_guardian_report.png', clip: { x, y, width, height } });
    console.log('SAVED fig7_guardian_report.png  clip h=', Math.round(height));
  } catch (e) { console.log('clip screenshot err:', e.message.slice(0, 140)); }

  if (errs.length) { console.log('console errors:'); [...new Set(errs)].slice(0, 6).forEach((e) => console.log('  -', e)); }
  await browser.close();
})();
