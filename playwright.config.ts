import { defineConfig, devices } from '@playwright/test';

const PORT = 3100;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    ...devices['iPhone 13'],
    browserName: 'chromium',
    viewport: { width: 390, height: 844 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      REGI_DATA_DIR: '.data/e2e',
      REGI_RESET_DB: '1',
      ALLOW_DEV_AUTH: '1',
      ALLOW_TIME_TRAVEL: '1',
      DEV_AUTH_SECRET: 'e2e-secret-not-for-production',
    },
  },
});
