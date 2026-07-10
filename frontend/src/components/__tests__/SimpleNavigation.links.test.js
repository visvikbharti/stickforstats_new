import fs from 'fs';
import path from 'path';
import ROUTE_CONFIG from '../../routes/routeConfig';

/**
 * The navigation is the only thing that makes a route discoverable, and nothing
 * type-checks the paths it hardcodes. A nav entry pointing at a route that does
 * not exist is a dead click; a route with no nav entry is unreachable except by
 * typing the URL. Both happened (see docs/IA_CONSOLIDATION_PLAN_2026-07-10.md).
 *
 * These tests read the nav paths straight out of the source so they cannot
 * drift from what ships.
 */

const navSource = fs.readFileSync(
  path.join(__dirname, '..', 'SimpleNavigation.jsx'),
  'utf8'
);

const navPaths = [...navSource.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);

// Routes are declared either in routeConfig or directly in AppRoutes.
const appRoutesSource = fs.readFileSync(
  path.join(__dirname, '..', '..', 'routes', 'AppRoutes.jsx'),
  'utf8'
);
const explicitPaths = [...appRoutesSource.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);

const declared = new Set([...ROUTE_CONFIG.map((r) => r.path), ...explicitPaths]);

// `/sqc-analysis/*` in routeConfig serves the nav's `/sqc-analysis`.
const isDeclared = (navPath) =>
  declared.has(navPath) || declared.has(`${navPath}/*`) || declared.has(`${navPath}/`);

describe('SimpleNavigation', () => {
  it('finds nav entries to check', () => {
    expect(navPaths.length).toBeGreaterThan(20);
  });

  it('points every nav entry at a declared route', () => {
    const dead = navPaths.filter((p) => !isDeclared(p));
    expect(dead).toEqual([]);
  });

  it('links the modules that were stranded behind the retired /dashboard', () => {
    ['/modules/t-test', '/modules/anova', '/modules/correlation-regression', '/enhanced-analysis'].forEach(
      (p) => expect(navPaths).toContain(p)
    );
  });

  it('sends the GDPR dashboard entry to /privacy-settings, not the policy page', () => {
    expect(navPaths).toContain('/privacy-settings');
    expect(navPaths).not.toContain('/privacy');
  });

  it('does not link the retired /dashboard', () => {
    expect(navPaths).not.toContain('/dashboard');
  });

  it('links the two working features that were reachable only by URL', () => {
    expect(navPaths).toContain('/modules/power-analysis-real');
    expect(navPaths).toContain('/genomics-analysis');
  });

  it('never links a dev-only test harness', () => {
    [
      '/test-universe',
      '/test-runner',
      '/unified-test',
      '/test/calculator',
      '/test/performance',
      '/testing/browser-compatibility',
    ].forEach((p) => expect(navPaths).not.toContain(p));
  });
});
