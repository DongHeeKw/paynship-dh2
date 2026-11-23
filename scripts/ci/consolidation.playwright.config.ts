import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: '../../e2e', testMatch: ['consolidation.spec.ts', 'commerce-home.spec.ts'],
  fullyParallel: false, workers: 1, forbidOnly: Boolean(process.env.CI), retries: 0,
  reporter: [['list']], outputDir: '../../test-results/consolidation',
  use: { baseURL: 'http://127.0.0.1:3102', trace: 'retain-on-failure', screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: { command: 'node scripts/ci/start-consolidation-preview.mjs',
    cwd: '../..', url: 'http://127.0.0.1:3102/dev/consolidation', reuseExistingServer: false, timeout: 120000 },
  timeout: 60000,
  // The isolated dev server compiles each destination on its first visit.
  expect: { timeout: 20000 },
});
