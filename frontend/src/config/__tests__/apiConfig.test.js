/**
 * getApiUrl() path-joining contract.
 *
 * Two conventions coexist in the codebase: most call sites pass a path relative
 * to the /api mount (endpoints.stats.anova === '/v1/stats/anova/'), while a few
 * pass it absolute ('/api/v1/stats/ttest/'). Because REACT_APP_API_URL already
 * ends in '/api' in every deployment (CI builds with REACT_APP_API_URL=/api),
 * the absolute form used to produce '/api/api/v1/...', which Django 404s.
 */

describe('getApiUrl', () => {
  const load = (apiUrl) => {
    jest.resetModules();
    const prev = process.env.REACT_APP_API_URL;
    process.env.REACT_APP_API_URL = apiUrl;
    // eslint-disable-next-line global-require
    const mod = require('../apiConfig');
    process.env.REACT_APP_API_URL = prev;
    return mod;
  };

  describe('when the base URL already ends in /api (dev + production)', () => {
    it.each(['/api', 'http://localhost:8000/api', 'https://stickforstats.com/api'])(
      'does not double the /api prefix for base %s',
      (base) => {
        const { getApiUrl } = load(base);
        expect(getApiUrl('/api/v1/stats/ttest/')).toBe(`${base}/v1/stats/ttest/`);
      }
    );

    it('leaves mount-relative paths untouched', () => {
      const { getApiUrl } = load('/api');
      expect(getApiUrl('/v1/stats/anova/')).toBe('/api/v1/stats/anova/');
      expect(getApiUrl('/guardian/check/')).toBe('/api/guardian/check/');
    });

    it('resolves both conventions to the same URL', () => {
      const { getApiUrl } = load('/api');
      expect(getApiUrl('/api/v1/stats/ttest/')).toBe(getApiUrl('/v1/stats/ttest/'));
    });

    it('does not strip a path that merely starts with the letters "api"', () => {
      const { getApiUrl } = load('/api');
      expect(getApiUrl('/api-docs/')).toBe('/api/api-docs/');
    });
  });

  describe('when the base URL does not end in /api', () => {
    it('preserves an absolute /api path', () => {
      const { getApiUrl } = load('https://api.stickforstats.com');
      expect(getApiUrl('/api/v1/stats/ttest/')).toBe('https://api.stickforstats.com/api/v1/stats/ttest/');
    });
  });

  it('tolerates a trailing slash on the base URL', () => {
    const { getApiUrl } = load('http://localhost:8000/api/');
    expect(getApiUrl('/v1/stats/anova/')).toBe('http://localhost:8000/api/v1/stats/anova/');
    expect(getApiUrl('/api/v1/stats/anova/')).toBe('http://localhost:8000/api/v1/stats/anova/');
  });

  it('every endpoint in the shared map is mount-relative, not absolute', () => {
    const { endpoints } = load('/api');
    const absolute = [];

    const walk = (node, trail = []) => {
      Object.entries(node).forEach(([key, value]) => {
        if (typeof value === 'string') {
          if (value.startsWith('/api/')) absolute.push(`${[...trail, key].join('.')} = ${value}`);
        } else if (value && typeof value === 'object') {
          walk(value, [...trail, key]);
        }
      });
    };
    walk(endpoints);

    expect(absolute).toEqual([]);
  });
});
