import { chromium, BrowserContext, Page } from '@playwright/test';
import { existsSync, mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const EXTENSION_READY_TIMEOUT = 10_000;
const DEFAULT_EXTENSION_PATH = 'extensions/virtru';

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

  // Do not auto-open Gmail here to avoid duplicate tabs; tests will navigate explicitly.

  return context;
}
