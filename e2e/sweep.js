// Proactive browser sweep of the live beta + a real manuscript-upload test.
// Run: SFS_BETA_PW=... node sweep.js
const { chromium } = require('playwright');

const BASE = 'https://stickforstats.com';
const PW = process.env.SFS_BETA_PW;
if (!PW) { console.error('SFS_BETA_PW not set'); process.exit(2); }
const TEST_TEX = require('path').join(__dirname, 'manuscript_review_test.tex');

const routes = [
  '/', '/dashboard', '/manuscript-review', '/smart-analysis',
  '/modules/t-test-real', '/modules/anova-real',
  '/confidence-intervals/', '/pca-analysis/', '/statistical-analysis-tools',
  '/meta-analysis', '/genomics-analysis', '/sqc-analysis/', '/privacy',
];
const uniq = (a) => [...new Set(a)];
const trim = (s, n = 150) => (s || '').replace(/\s+/g, ' ').slice(0, n);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    httpCredentials: { username: 'beta', password: PW },
    ignoreHTTPSErrors: true,
  });

  // ---- 1) page sweep ----
  console.log('=== PAGE SWEEP ===');
  for (const route of routes) {
    const page = await context.newPage();
    const errs = [], failed = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(trim(m.text())); });
    page.on('pageerror', (e) => errs.push('JS: ' + trim(e.message)));
    page.on('response', (r) => { if (r.status() >= 400) failed.push(r.status() + ' ' + trim(r.url().replace(BASE, ''), 90)); });
    page.on('requestfailed', (r) => failed.push('FAIL ' + trim(r.url().replace(BASE, ''), 70)));
    let status = 'ok';
    try {
      const resp = await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      status = resp ? resp.status() : '?';
      await page.waitForTimeout(3500);
    } catch (e) { status = 'NAV-ERR'; }
    const e2 = uniq(errs), f2 = uniq(failed);
    console.log(`${route} [${status}] ${(!e2.length && !f2.length) ? 'CLEAN' : ''}`);
    e2.slice(0, 5).forEach((e) => console.log('   err: ' + e));
    f2.slice(0, 8).forEach((f) => console.log('   ' + f));
    await page.close();
  }

  // ---- 2) manuscript upload test ----
  console.log('\n=== MANUSCRIPT UPLOAD TEST (' + TEST_TEX.split('/').pop() + ') ===');
  const page = await context.newPage();
  let analyzeStatus = null;
  const upErrs = [];
  page.on('response', (r) => { if (r.url().includes('/manuscript/analyze')) analyzeStatus = r.status(); });
  page.on('console', (m) => { if (m.type() === 'error') upErrs.push(trim(m.text())); });
  try {
    await page.goto(BASE + '/manuscript-review', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.setInputFiles('input[type="file"]', TEST_TEX);
    await page.waitForTimeout(1000);
    await page.getByRole('button', { name: /Analyze Manuscript/i }).click({ timeout: 8000 });
    // wait for the analyze response (up to 30s)
    for (let i = 0; i < 30 && analyzeStatus === null; i++) await page.waitForTimeout(1000);
    await page.waitForTimeout(1500);
    const bodyText = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    const gotScore = /SQS|Grade|Consistency|claims/i.test(bodyText);
    console.log('  POST /manuscript/analyze/ status: ' + analyzeStatus);
    console.log('  report rendered (SQS/Grade/claims visible): ' + gotScore);
    if (upErrs.length) { console.log('  console errors during upload:'); uniq(upErrs).slice(0, 5).forEach((e) => console.log('   - ' + e)); }
  } catch (e) {
    console.log('  upload-test error: ' + trim(e.message, 200));
    console.log('  (analyze status so far: ' + analyzeStatus + ')');
  }
  await page.close();
  await browser.close();
})();
