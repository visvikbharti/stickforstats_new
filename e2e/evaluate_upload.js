const { chromium } = require('playwright');
const BASE = 'https://stickforstats.com';
const PW = process.env.SFS_BETA_PW;

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ httpCredentials: { username: 'beta', password: PW }, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/manuscript-review', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(1500);
  // Fire the SAME request the app's axios makes post-fix: a real browser multipart FormData POST.
  const res = await page.evaluate(async () => {
    const tex = '\\documentclass{article}\\begin{document}\nA main effect, F(2, 87) = 3.15, p = 0.001, and t(58) = 2.01, p = 0.049.\n\\end{document}';
    const fd = new FormData();
    fd.append('file', new Blob([tex], { type: 'application/x-tex' }), 'test.tex');
    fd.append('field', 'general');
    try {
      const r = await fetch('/api/v1/manuscript/analyze/', { method: 'POST', body: fd, credentials: 'include' });
      const t = await r.text();
      return { status: r.status, ct: r.headers.get('content-type'), body: t.slice(0, 500) };
    } catch (e) { return { error: e.message }; }
  });
  console.log('browser multipart POST -> status:', res.status, res.error || '');
  console.log('response (first 500):', res.body || '');
  await b.close();
})();
