import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 4321);
const base = (process.env.SITE_BASE ?? '/HabitatBlueprint').replace(/\/+$/, '');
const baseURL = `http://localhost:${port}${base}/`;

// Locally, set PW_ALL_BROWSERS=1 to run Firefox and WebKit too. CI always runs all three.
const allBrowsers = Boolean(process.env.CI || process.env.PW_ALL_BROWSERS);

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `node scripts/serve.mjs --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(allBrowsers
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
});
