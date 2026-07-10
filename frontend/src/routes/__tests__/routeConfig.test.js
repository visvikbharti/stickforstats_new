import ROUTE_CONFIG from '../routeConfig';

const byPath = (path) => ROUTE_CONFIG.find((r) => r.path === path);

describe('ROUTE_CONFIG', () => {
  it('gives every entry either a component or a redirect, never both and never neither', () => {
    const malformed = ROUTE_CONFIG.filter(
      (r) => Boolean(r.component) === Boolean(r.redirect)
    ).map((r) => r.path);

    expect(malformed).toEqual([]);
  });

  it('declares no duplicate paths', () => {
    const seen = new Map();
    const duplicates = [];
    ROUTE_CONFIG.forEach(({ path }) => {
      if (seen.has(path)) duplicates.push(path);
      seen.set(path, true);
    });

    expect(duplicates).toEqual([]);
  });

  it('points every redirect at a path that actually exists', () => {
    const paths = new Set(ROUTE_CONFIG.map((r) => r.path));
    const dangling = ROUTE_CONFIG.filter((r) => r.redirect && !paths.has(r.redirect)).map(
      (r) => `${r.path} -> ${r.redirect}`
    );

    expect(dangling).toEqual([]);
  });

  it('never redirects a path to itself', () => {
    const selfReferential = ROUTE_CONFIG.filter((r) => r.redirect === r.path).map((r) => r.path);
    expect(selfReferential).toEqual([]);
  });

  it('retires /analysis onto the canonical hub', () => {
    expect(byPath('/analysis')).toEqual({
      path: '/analysis',
      redirect: '/statistical-analysis-tools',
    });
    expect(byPath('/statistical-analysis-tools').component).toBeDefined();
  });

  it('no longer routes the retired /dashboard', () => {
    expect(byPath('/dashboard')).toBeUndefined();
  });

  it('still routes /enhanced-analysis, whose only inbound link was /dashboard', () => {
    // Retiring the dashboard stranded this page; the nav now links it directly.
    expect(byPath('/enhanced-analysis').component).toBeDefined();
  });

  it('keeps /debug-login as a real page, not a redirect', () => {
    // It is an intentional legacy alias whose component is the login page.
    expect(byPath('/debug-login').component).toBeDefined();
    expect(byPath('/debug-login').redirect).toBeUndefined();
  });

  describe('/privacy is served by the legal policy page, not the GDPR dashboard', () => {
    it('does not declare /privacy in routeConfig', () => {
      // AppRoutes declares <Route path="/privacy" element={<PrivacyPolicyPage/>} />.
      // A competing routeConfig entry silently won the match, so the footer and
      // the register-page consent link showed the data dashboard instead.
      expect(byPath('/privacy')).toBeUndefined();
    });

    it('serves the GDPR dashboard from /privacy-settings', () => {
      expect(byPath('/privacy-settings').component).toBeDefined();
    });
  });

  describe('the -real modules are distinct surfaces, not duplicates', () => {
    it.each(['/modules/t-test-real', '/modules/anova-real'])('keeps %s routed to its own component', (path) => {
      expect(byPath(path).component).toBeDefined();
      expect(byPath(path).redirect).toBeUndefined();
    });

    it('keeps the canonical modules routed too', () => {
      expect(byPath('/modules/t-test').component).toBeDefined();
      expect(byPath('/modules/anova').component).toBeDefined();
    });
  });
});
