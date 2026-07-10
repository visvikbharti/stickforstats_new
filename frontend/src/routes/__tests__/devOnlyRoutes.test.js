/**
 * The six manual test harnesses must not ship in the production bundle.
 *
 * routeConfig reads process.env.NODE_ENV at module scope, so each case reloads
 * the module with a different value.
 */

const HARNESS_PATHS = [
  '/test-universe',
  '/test-runner',
  '/unified-test',
  '/test/calculator',
  '/test/performance',
  '/testing/browser-compatibility',
];

const loadRoutes = (nodeEnv) => {
  jest.resetModules();
  const previous = process.env.NODE_ENV;
  // NODE_ENV is read-only under some setups; redefine it explicitly.
  Object.defineProperty(process.env, 'NODE_ENV', { value: nodeEnv, configurable: true, writable: true });
  // eslint-disable-next-line global-require
  const routes = require('../routeConfig').default;
  Object.defineProperty(process.env, 'NODE_ENV', { value: previous, configurable: true, writable: true });
  return routes;
};

const pathsOf = (routes) => routes.map((r) => r.path);

describe('dev-only harness routes', () => {
  it('are absent from a production build', () => {
    const paths = pathsOf(loadRoutes('production'));
    const leaked = HARNESS_PATHS.filter((p) => paths.includes(p));

    expect(leaked).toEqual([]);
  });

  it('are present in a development build', () => {
    const paths = pathsOf(loadRoutes('development'));
    const missing = HARNESS_PATHS.filter((p) => !paths.includes(p));

    expect(missing).toEqual([]);
  });

  it('leaves the user-facing routes untouched in production', () => {
    const paths = pathsOf(loadRoutes('production'));

    [
      '/',
      '/statistical-analysis-tools',
      '/modules/t-test',
      '/modules/anova',
      '/modules/nonparametric-real',
      '/modules/power-analysis-real',
      '/genomics-analysis',
      '/enhanced-analysis',
    ].forEach((p) => expect(paths).toContain(p));
  });

  it('keeps the admin routes routed but role-gated in production', () => {
    const routes = loadRoutes('production');
    const admin = ['/security', '/monitoring/websocket', '/monitoring/rag-performance', '/admin/branding'];

    admin.forEach((path) => {
      const route = routes.find((r) => r.path === path);
      expect(route).toBeDefined();
      expect(route.protected).toBe(true);
      expect(route.requiredRole).toBe('admin');
    });
  });

  it('declares no duplicate paths in either build', () => {
    ['production', 'development'].forEach((env) => {
      const paths = pathsOf(loadRoutes(env));
      expect(paths.length).toBe(new Set(paths).size);
    });
  });
});
