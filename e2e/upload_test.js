const { chromium } = require('playwright');
const BASE = 'https://stickforstats.com';
const PW = process.env.SFS_BETA_PW;
const TEST = process.env.TEST_FILE || '/Users/vishalbharti/StickForStats_v1.0_Production/sfs_manuscript_review_test.tex';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ httpCredentials: { username: 'beta', password: PW }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  let analyzeStatus = null;
  const errs = [];
  page.on('response', (r) => { if (r.url().includes('/manuscript/analyze')) analyzeStatus = r.status(); });
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });

  await page.goto(BASE + '/manuscript-review', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);

  // Upload via the dropzone's file chooser (handles react-dropzone), fallback to direct input.
  let how = 'filechooser';
  try {
    const [fc] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 8000 }),
      page.locator('text=/Drag and drop|click to browse/i').first().click({ timeout: 8000 }),
    ]);
    await fc.setFiles(TEST);
  } catch (e) {
    how = 'setInputFiles';
    try { await page.setInputFiles('input[type="file"]', TEST); } catch (e2) { how = 'FAILED:' + e2.message.slice(0, 80); }
  }
  await page.waitForTimeout(1500);
  const body1 = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log('upload method:', how);
  console.log('file registered:', /\.tex|\.pdf|replace/i.test(body1));

  // Click Analyze (waits for it to be enabled/actionable).
  try {
    await page.getByRole('button', { name: /Analyze Manuscript/i }).click({ timeout: 15000 });
  } catch (e) {
    console.log('Analyze click error:', e.message.slice(0, 120));
  }
  for (let i = 0; i < 35 && analyzeStatus === null; i++) await page.waitForTimeout(1000);
  await page.waitForTimeout(2000);
  const body2 = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  console.log('POST /manuscript/analyze status:', analyzeStatus);
  console.log('report visible:', /SQS|Grade|Consistency|discrepancy|recomputed|claims/i.test(body2));
  console.log('page snippet:', body2.slice(0, 500));
  if (errs.length) { console.log('console errors:'); [...new Set(errs)].slice(0, 6).forEach((e) => console.log('  - ' + e)); }
  await browser.close();
})();
