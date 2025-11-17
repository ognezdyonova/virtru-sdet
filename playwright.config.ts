import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve } from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

const storageStateEnv = process.env.PLAYWRIGHT_STORAGE_STATE;
const resolvedStorageState =
  storageStateEnv && storageStateEnv.trim().length > 0 ? resolve(storageStateEnv) : undefined;
const hasStorageState = resolvedStorageState ? existsSync(resolvedStorageState) : false;
if (storageStateEnv && !hasStorageState) {
  console.warn(
    `PLAYWRIGHT_STORAGE_STATE=${storageStateEnv} was provided but file not found; falling back to interactive login.`
  );
}

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
    viewport: { width: 1400, height: 900 },
    storageState: hasStorageState ? resolvedStorageState : undefined
  },
  // We’ll select the browser channel (chrome|msedge) in code when launching the persistent context.
  projects: [
    { name: 'chromium' }, // dummy; actual channel routed by launcher
  ]
});
