import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  globalSetup: './e2e/globalSetup.ts',
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'html',
  use: {
    trace: 'on-first-retry',
    testIdAttribute: 'data-testid',
  },
});
