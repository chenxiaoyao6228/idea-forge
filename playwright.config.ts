import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

// Load environment variables from .env.test for testing
dotenv.config({ path: '.env' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/setup/global-setup'),
  globalTeardown: require.resolve('./tests/e2e/setup/global-teardown'),
  
  use: {
    baseURL: process.env.CLIENT_APP_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Set language to English for consistent test results
    locale: 'en-US',
    // Set timezone for consistent test results
    // timezoneId: 'UTC',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

});
