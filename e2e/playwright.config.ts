import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for StickForStats end-to-end tests.
 *
 * Usage (local):
 *   cd e2e && npm install && npm run install-browsers
 *   # In two other terminals:
 *   #   cd backend && DJANGO_DEBUG=True python manage.py runserver 0.0.0.0:8000
 *   #   cd frontend && HOST=0.0.0.0 PORT=3000 BROWSER=none npm start
 *   npm test
 *
 * The tests assume the frontend is reachable at PLAYWRIGHT_BASE_URL
 * (default http://localhost:3000) and the backend at /api/v1/.
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['list'], ['junit', { outputFile: 'results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
