import { defineConfig, devices } from '@playwright/test';
import { loadE2eEnvFiles } from './tests/e2e/support/env-file';

loadE2eEnvFiles();

const baseURL = process.env.E2E_BASE_URL
  || process.env.NEXT_PUBLIC_SITE_URL
  || 'http://127.0.0.1:3001';
const browserChannel = process.env.E2E_BROWSER_CHANNEL?.trim() || undefined;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
    channel: browserChannel,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
      },
    },
  ],
  outputDir: 'test-results/e2e-artifacts',
});
