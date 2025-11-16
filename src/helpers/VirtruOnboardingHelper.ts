import { Locator, Page } from '@playwright/test';

export const VIRTRU_TOGGLE_SELECTOR =
  '[aria-label*="Virtru secure toggle"], .virtru-toggle, [data-virtru-button="toggle"]';

const VIRTRU_MODAL_PATTERN =
  /(welcome to virtru|virtru|secure message|email address is activated|your email address is activated)/i;
const VIRTRU_ACTIVATION_PATTERN = /your email address is activated/i;

const VIRTRU_DIALOG_SELECTOR = [
  'div[role="dialog"]',
  'section[role="dialog"]',
  'div[role="alertdialog"]',
  'div[aria-modal="true"]',
  'div[role="presentation"]',
  '.virtru-modal',
  '.modal-dialog',
].join(', ');

const VIRTRU_BUTTON_PATTERNS = [
  /activate/i,
  /done/i,
  /continue/i,
  /got it/i,
  /start/i,
  /ok/i,
  /allow/i,
];

export class VirtruOnboardingHelper {
  constructor(private page: Page) {}

  private buttonLocator(pattern: RegExp): Locator {
    return this.page
      .locator('button, [role="button"], div[role="button"]')
      .filter({ hasText: pattern })
      .first();
  }

  private async clickIfVisible(locator: Locator, ensureVisible = false): Promise<boolean> {
    const visible = await locator.isVisible({ timeout: 1500 }).catch(() => false);
    if (!visible) return false;
    if (ensureVisible) {
      await locator.scrollIntoViewIfNeeded().catch(() => {});
    }
    await locator.click().catch(() => {});
    await this.page.waitForTimeout(500);
    return true;
  }

  async handlePermissionPrompts() {
    const permissionDialog = this.page
      .locator(VIRTRU_DIALOG_SELECTOR)
      .filter({ hasText: /mail\.google\.com wants to/i })
      .first();

    const allowButton = permissionDialog.getByRole('button', { name: /^allow$/i }).first();
    const blockButton = permissionDialog.getByRole('button', { name: /^block$/i }).first();
    await this.clickIfVisible(allowButton, true);
    await this.clickIfVisible(blockButton, true);

    await this.clickIfVisible(this.buttonLocator(/^allow$/i), true);
    await this.clickIfVisible(this.buttonLocator(/^block$/i), true);
  }

  private async findActivationModal(): Promise<Locator | null> {
    const dialogMatch = this.page
      .locator(VIRTRU_DIALOG_SELECTOR)
      .filter({ hasText: VIRTRU_ACTIVATION_PATTERN })
      .first();
    if (await dialogMatch.isVisible({ timeout: 200 }).catch(() => false)) {
      return dialogMatch;
    }

    const fallbackPanel = this.page
      .locator(
        'xpath=//*[contains(translate(normalize-space(.),"ABCDEFGHIJKLMNOPQRSTUVWXYZ","abcdefghijklmnopqrstuvwxyz"), "your email address is activated")]'
      )
      .locator(
        'xpath=ancestor-or-self::*[contains(@role,"dialog") or contains(@class,"modal") or contains(@class,"U26fgb") or contains(@class,"VfPpkd")]'
      )
      .first();
    if (await fallbackPanel.isVisible({ timeout: 200 }).catch(() => false)) {
      return fallbackPanel;
    }
    return null;
  }

  private async dismissActivationConfirmation(): Promise<boolean> {
    const modal = await this.findActivationModal();
    if (!modal) {
      return false;
    }

    const dontShow = modal.getByRole('checkbox', { name: /don't show again/i }).first();
    await this.clickIfVisible(dontShow, true);

    const buttonCandidates: Locator[] = [
      modal.getByRole('button', { name: /^done$/i }).first(),
      modal
        .locator('button, [role="button"], div[role="button"], .VfPpkd-LgbsSe')
        .filter({ hasText: /^done$/i })
        .first(),
      modal.getByRole('button', { name: /close|okay/i }).first(),
      modal.getByText(/^done$/i).first(),
      this.page.getByRole('button', { name: /^done$/i }).first(),
      this.page.locator('text=/^done$/i').first(),
    ];

    for (const candidate of buttonCandidates) {
      const ok = await candidate.isVisible({ timeout: 500 }).catch(() => false);
      if (!ok) continue;
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click().catch(() => {});
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return true;
    }

    // As a last resort, attempt keyboard dismissal.
    await this.page.keyboard.press('Enter').catch(() => {});
    if (!(await modal.isVisible({ timeout: 1000 }).catch(() => false))) {
      return true;
    }
    await this.page.keyboard.press('Escape').catch(() => {});
    if (!(await modal.isVisible({ timeout: 1000 }).catch(() => false))) {
      return true;
    }

    return false;
  }

  async dismissActivationIfPresent(): Promise<boolean> {
    return this.dismissActivationConfirmation();
  }

  async dismissModal(buttonPattern: RegExp, modalPattern: RegExp = VIRTRU_MODAL_PATTERN): Promise<boolean> {
    const modal = this.page
      .locator(VIRTRU_DIALOG_SELECTOR)
      .filter({ hasText: modalPattern })
      .first();
    const isVisible = await modal.isVisible({ timeout: 1000 }).catch(() => false);
    if (!isVisible) {
      return this.clickIfVisible(this.buttonLocator(buttonPattern), true);
    }

    const dontShow = modal.getByRole('checkbox', { name: /don't show again/i }).first();
    await this.clickIfVisible(dontShow, true);

    // Prefer explicit Done button inside the dialog if present
    const explicitButton = modal
      .locator('button, [role="button"], div[role="button"]')
      .filter({ hasText: buttonPattern })
      .first();
    if (await this.clickIfVisible(explicitButton, true)) {
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return true;
    }

    const explicitDone = modal.getByRole('button', { name: /^done$/i }).first();
    if (await this.clickIfVisible(explicitDone, true)) {
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return true;
    }

    const globalDone = this.page.getByRole('button', { name: /^done$/i }).first();
    if (await this.clickIfVisible(globalDone, true)) {
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return true;
    }

    // Optionally tick "Don't show again" to reduce flakiness
    const button = modal.locator('button, [role="button"]').filter({ hasText: buttonPattern }).first();
    if (await this.clickIfVisible(button, true)) {
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return true;
    }

    const textButton = modal.getByText(buttonPattern).first();
    if (await this.clickIfVisible(textButton, true)) {
      await modal.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      return true;
    }
    return this.clickIfVisible(this.buttonLocator(buttonPattern), true);
  }

  async ensureOnboardingCleared(iterations = 10, refreshOnStall = true) {
    await this.handlePermissionPrompts();
    await this.dismissActivationConfirmation();

    for (let i = 0; i < iterations; i++) {
      let handled = false;
      for (const pattern of VIRTRU_BUTTON_PATTERNS) {
        if (await this.dismissModal(pattern)) {
          handled = true;
          break;
        }
      }

      if (handled) {
        await this.dismissActivationConfirmation();
      }

      if (!handled) break;
    }

    // Fallback: try clicking a global "Activate" button if it lingers outside dialogs.
    const clickedGlobalActivate = await this.clickIfVisible(this.buttonLocator(/activate/i), true);

    if (!clickedGlobalActivate && refreshOnStall) {
      // Temporarily no-op to avoid disrupting compose flow.
    }
  }

  async ensureToggleVisible(timeoutMs = 30_000, allowRefresh = false): Promise<Locator> {
    const toggle = this.page.locator(VIRTRU_TOGGLE_SELECTOR).first();
    const activateLink = this.page.getByRole('link', { name: /activate virtru/i }).first();
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      if (await toggle.isVisible({ timeout: 1000 }).catch(() => false)) {
        return toggle;
      }

      await this.ensureOnboardingCleared(2, allowRefresh);

      if (await activateLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        await activateLink.click().catch(() => {});
        await this.page.waitForTimeout(1000);
        continue;
      }

      await this.page.waitForTimeout(500);
    }

    throw new Error('Virtru secure toggle did not appear within expected time.');
  }

  async waitForActivatePrompt(timeoutMs = 5_000): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const modalButton = this.page
        .locator('div[role="dialog"]')
        .filter({ hasText: /(welcome to virtru|activate)/i })
        .locator('button, [role="button"]')
        .filter({ hasText: /activate/i })
        .first();

      if (await modalButton.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }

      if (await this.buttonLocator(/activate/i).isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }

      await this.page.waitForTimeout(250);
    }
    return false;
  }
}
