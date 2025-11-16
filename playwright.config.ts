import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
dotenv.config();

export default defineConfig({
  testDir: 'src/tests',
  timeout: 120_000,
  workers: 1, // Keep serial to avoid Gmail concurrency issues
  reporter: [
    ['line'],
    ['allure-playwright'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  use: {
    headless: false,                  // required for extensions
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1400, height: 900 }
  },
  // We’ll select the browser channel (chrome|msedge) in code when launching the persistent context.
  projects: [
    { name: 'chromium' }, // dummy; actual channel routed by launcher
  ]
});
