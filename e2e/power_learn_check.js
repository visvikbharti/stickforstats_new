// Click each Power Analysis lesson and report which ones crash.
// Run: SFS_BETA_PW=<pw> node power_learn_check.js
const { chromium } = require('playwright');
const PW = process.env.SFS_BETA_PW;
const BASE = 'https://stickforstats.com';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ httpCredentials: { username: 'beta', password: PW }, ignoreHTTPSErrors: true });
  for (let n = 1; n <= 11; n++) {
    const page = await ctx.newPage();
    const errs = [];
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
    page.on('pageerror', (e) => errs.push('JS: ' + e.message.slice(0, 120)));
    try {
      await page.goto(`${BASE}/power-learn`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(1500);
      // Click the lesson card whose heading contains "Lesson N"
      const card = page.locator(`text=/^Lesson ${n}\\b/`).first();
      await card.click({ timeout: 8000 });
      await page.waitForTimeout(2500);
      const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
      const crashed = /Something went wrong|Application Error|is not a function/i.test(body);
      const wErr = errs.find((e) => /is not a function/.test(e)) || '';
      console.log(`Lesson ${n}: ${crashed ? 'CRASH' : 'ok'} ${wErr}`);
    } catch (e) {
      console.log(`Lesson ${n}: nav/click err ${String(e.message).slice(0, 60)}`);
    }
    await page.close();
  }
  await b.close();
})();
