// Browser render check for the public /verify page.
// Run: RID=<receipt-id> SFS_BETA_PW=<beta pw> node verify_check.js
const { chromium } = require('playwright');
const RID = process.env.RID;
const PW = process.env.SFS_BETA_PW;
const BASE = 'https://stickforstats.com';

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({
    httpCredentials: { username: 'beta', password: PW },
    ignoreHTTPSErrors: true,
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 140)); });
  page.on('pageerror', (e) => errs.push('JS: ' + e.message.slice(0, 140)));

  await page.goto(`${BASE}/verify?id=${RID}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4500); // auto-verify fires on ?id=
  const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

  const verified = /\bVerified\b/.test(body) && !/Not verified/i.test(body);
  console.log('renders "Verified":', verified);
  console.log('shows receipt id :', body.includes(RID.slice(0, 8)));
  console.log('shows checks     :', /Signature valid|Contents unmodified|Not revoked/i.test(body));
  console.log('snippet          :', body.slice(0, 260));
  if (errs.length) console.log('console errors   :', [...new Set(errs)].slice(0, 4));
  await b.close();
})();
