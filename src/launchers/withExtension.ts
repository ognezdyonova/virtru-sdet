import { chromium, BrowserContext, Page } from '@playwright/test';
import { existsSync, mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const EXTENSION_READY_TIMEOUT = 10_000;
const DEFAULT_EXTENSION_PATH = 'extensions/virtru';
const STORAGE_STATE_PATH = process.env.PLAYWRIGHT_STORAGE_STATE
  ? resolve(process.env.PLAYWRIGHT_STORAGE_STATE)
  : undefined;

type StorageState = {
  cookies?: Parameters<BrowserContext['addCookies']>[0];
  origins?: Array<{
    origin: string;
    localStorage?: Array<{ name: string; value: string }>;
    sessionStorage?: Array<{ name: string; value: string }>;
  }>;
};

async function applyStorageState(context: BrowserContext): Promise<void> {
  if (!STORAGE_STATE_PATH) {
    return;
  }
  if (!existsSync(STORAGE_STATE_PATH)) {
    console.warn(
      `PLAYWRIGHT_STORAGE_STATE was set to "${STORAGE_STATE_PATH}", but the file does not exist. Skipping state restore.`
    );
    return;
  }

  try {
    const rawState = readFileSync(STORAGE_STATE_PATH, 'utf-8');
    const state = JSON.parse(rawState) as StorageState;

    if (state.cookies?.length) {
      await context.addCookies(state.cookies).catch(error => {
        console.warn(`Failed to apply cookies from storage state: ${(error as Error).message}`);
      });
    }

    if (state.origins?.length) {
      const bootstrapPage = await context.newPage();
      for (const origin of state.origins) {
        if (!origin.origin) continue;
        try {
          await bootstrapPage.goto(origin.origin, { waitUntil: 'domcontentloaded', timeout: 15_000 }).catch(() => {});
          if (origin.localStorage?.length) {
            await bootstrapPage.evaluate(entries => {
              for (const entry of entries) {
                try {
                  window.localStorage.setItem(entry.name, entry.value);
                } catch {
                  // ignore per-entry failures
                }
              }
            }, origin.localStorage);
          }
          if (origin.sessionStorage?.length) {
            await bootstrapPage.evaluate(entries => {
              for (const entry of entries) {
                try {
                  window.sessionStorage.setItem(entry.name, entry.value);
                } catch {
                  // ignore per-entry failures
                }
              }
            }, origin.sessionStorage);
          }
        } catch (error) {
          console.warn(`Failed to bootstrap storage for ${origin.origin}: ${(error as Error).message}`);
        }
      }
      await bootstrapPage.close().catch(() => {});
    }

    console.log(`Applied storage state from ${STORAGE_STATE_PATH}`);
  } catch (error) {
    console.warn(`Failed to parse/apply storage state (${(error as Error).message}). Continuing without it.`);
  }
}

export async function launchWithVirtruExtension(
  channel: 'chrome' | 'msedge' = 'chrome'
): Promise<BrowserContext> {
  const userDataDir = mkdtempSync(join(tmpdir(), 'pw-virtru-'));
  const resolvedExtensionPath = resolve(process.env.VIRTRU_EXT_PATH ?? DEFAULT_EXTENSION_PATH);

  if (!existsSync(resolvedExtensionPath)) {
    throw new Error(
      `Virtru extension not found at ${resolvedExtensionPath}. Did you run "npm run fetch:extension"?`
    );
  }

  // Persist the resolved path so downstream code (and Playwright traces) refer to the same location.
  process.env.VIRTRU_EXT_PATH = resolvedExtensionPath;

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel,                 // 'chrome' or 'msedge'
    headless: false,         // extensions require headful
    args: [
      `--disable-extensions-except=${resolvedExtensionPath}`,
      `--load-extension=${resolvedExtensionPath}`,
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1200',
      '--start-maximized'
    ],
    acceptDownloads: true,
    recordVideo: { dir: 'videos/', size: { width: 1280, height: 720 } },
    viewport: null
  });

  await applyStorageState(context);

  // Best-effort: wait briefly for Virtru extension to surface, then continue.
  const extPage = await Promise.race<Page | null>([
    context.waitForEvent('backgroundpage', { timeout: EXTENSION_READY_TIMEOUT }).catch(() => null) as any,
    context
      .waitForEvent('page', {
        timeout: EXTENSION_READY_TIMEOUT,
        predicate: (page: Page) => page.url().startsWith('chrome-extension://'),
      })
      .catch(() => null),
  ]);
  if (extPage) {
    await extPage.waitForLoadState('domcontentloaded').catch(() => {});
    await extPage.waitForSelector('text=/virtru/i', { timeout: 2000 }).catch(() => {});
  }

  const shouldAutoClose = (url: string): boolean => {
    const isExtensionTab = url.startsWith('chrome-extension://');
    const isWelcomeTab =
      url.startsWith('chrome://welcome') ||
      url.startsWith('chrome://newtab') ||
      url.startsWith('edge://welcome') ||
      url.startsWith('edge://newtab') ||
      url.includes('microsoftedge.microsoft.com/addons');
    return isExtensionTab || isWelcomeTab;
  };

  // Close any welcome/setup tabs opened at startup.
  for (const page of context.pages()) {
    if (shouldAutoClose(page.url())) {
      await page.close().catch(() => {});
    }
  }

  // Also auto-close any future extension / welcome tabs that appear later.
  context.on('page', (page: Page) => {
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame() && shouldAutoClose(frame.url())) {
        page.close().catch(() => {});
      }
    });
  });

  // Verify that the Virtru extension is listed on the extensions page (Edge only for now).
  if (channel === 'msedge') {
    const verificationPage = await context.newPage();
    try {
      await verificationPage.goto('edge://extensions/', { waitUntil: 'domcontentloaded', timeout: 10_000 });
      const virtruCard = verificationPage.getByText(/virtru/i).first();
      await virtruCard.waitFor({ state: 'visible', timeout: 5_000 });
      console.log('Verified Virtru extension appears in edge://extensions');
    } catch (error) {
      console.warn(`Unable to verify extension in edge://extensions: ${(error as Error).message}`);
    } finally {
      await verificationPage.close().catch(() => {});
    }
  }

  // Do not auto-open Gmail here to avoid duplicate tabs; tests will navigate explicitly.

  if (channel === 'msedge') {
    const extensionsPage = await context.newPage();
    try {
      await extensionsPage.goto('edge://extensions/', { waitUntil: 'domcontentloaded', timeout: 10_000 });
      await extensionsPage.getByText(/virtru/i).first().waitFor({ state: 'visible', timeout: 5_000 });
      console.log('✅ Virtru extension visible in edge://extensions');
    } catch (error) {
      console.warn(`⚠️ Unable to verify Virtru extension in edge://extensions: ${(error as Error).message}`);
    } finally {
      await extensionsPage.close().catch(() => {});
    }
  }

  return context;
}
