import { Locator, Page } from '@playwright/test';
import { VirtruOnboardingHelper } from '../helpers/VirtruOnboardingHelper';

export class GmailComposePage {
  private virtru: VirtruOnboardingHelper;

  constructor(private page: Page) {
    this.virtru = new VirtruOnboardingHelper(page);
  }

  async openCompose() {
    await this.page.getByRole('button', { name: 'Compose' }).click();
    await this.page
      .locator('div[role="dialog"]')
      .filter({ hasText: /new message/i })
      .waitFor({ timeout: 15000 })
      .catch(() => {});

    // Ensure the compose form is focused before interacting.
    await this.page.waitForSelector('input[aria-label="To recipients"], textarea[name="to"]', {
      timeout: 15000,
    });

    await this.ensureComposeViewport();
  }

  async toggleVirtruOn() {
    await this.virtru.ensureOnboardingCleared();
    await this.virtru.dismissActivationIfPresent();
    const composeDialog = this.page
      .locator('div[role="dialog"]')
      .filter({
        has: this.page.locator('textarea[name="to"], input[aria-label="To recipients"]'),
      })
      .last();
    await composeDialog.waitFor({ state: 'visible', timeout: 15000 });

    const toggle = await this.findVirtruToggle(composeDialog);
    await toggle.scrollIntoViewIfNeeded().catch(() => {});

    await this.ensureProtectionIsOn(toggle, composeDialog).catch(async (error) => {
      if (this.page.isClosed()) {
        throw error;
      }
      await this.virtru.ensureOnboardingCleared();
      await this.virtru.dismissActivationIfPresent();
      const retryToggle = await this.findVirtruToggle(composeDialog);
      await this.ensureProtectionIsOn(retryToggle, composeDialog);
    });
    await this.virtru.dismissModal(/done/i, /email address is activated/i);
  }

  private async findVirtruToggle(composeDialog: Locator): Promise<Locator> {
    const toggleLocator = composeDialog
      .locator('div.virtru-toggle[aria-label="Virtru secure toggle"]')
      .last();

    try {
      await toggleLocator.waitFor({ state: 'visible', timeout: 10_000 });
      return toggleLocator;
    } catch {
      throw new Error('Virtru secure toggle not found inside compose dialog. Selectors likely stale.');
    }
  }

  private async ensureProtectionIsOn(toggle: Locator, composeDialog: Locator) {
    const secureSendBtn = composeDialog.getByRole('button', { name: /(secure send|send securely)/i }).first();
    const statusContainer = composeDialog.locator('.virtru-secure-mode-on, .virtru-secure-mode-off').first();
    const protectionLabel = composeDialog.locator('.virtru-label', { hasText: /virtru protection/i }).first();

    const readToggleState = async (): Promise<'on' | 'off' | 'unknown'> => {
      const ariaPressed = await toggle.getAttribute('aria-pressed').catch(() => null);
      if (ariaPressed === 'true') return 'on';
      if (ariaPressed === 'false') return 'off';

      const className = (await toggle.getAttribute('class').catch(() => '')) ?? '';
      if (className.includes('virtru-on')) return 'on';
      if (className.includes('virtru-off')) return 'off';

      const containerClass = (await statusContainer.getAttribute('class').catch(() => '')) ?? '';
      if (containerClass.includes('virtru-secure-mode-on')) return 'on';
      if (containerClass.includes('virtru-secure-mode-off')) return 'off';

      const labelText = (await protectionLabel.textContent().catch(() => ''))?.toLowerCase() ?? '';
      if (labelText.includes('virtru protection on')) return 'on';
      if (labelText.includes('virtru protection off')) return 'off';

      const secureSendVisible = await secureSendBtn.isVisible({ timeout: 200 }).catch(() => false);
      if (secureSendVisible) return 'on';

      return 'unknown';
    };

    const waitForOn = async (timeoutMs: number): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
        if ((await readToggleState()) === 'on') {
          return true;
        }
        await this.page.waitForTimeout(200);
      }
      return false;
    };

    const initialState = await readToggleState();
    if (initialState === 'on') {
      return;
    }

    const clickCandidates: Locator[] = [
      toggle,
      statusContainer,
      composeDialog.locator('.virtru-secure-mode-off .virtru-label').first(),
    ];

    for (const candidate of clickCandidates) {
      const visible = await candidate.isVisible({ timeout: 200 }).catch(() => false);
      if (!visible) continue;
      await candidate.click({ force: true }).catch(() => {});
      if (await waitForOn(5_000)) {
        return;
      }
    }

    throw new Error('Virtru toggle did not report ON within 10s.');
  }

  async fillAndSend(to: string, subject: string, body: string) {
    await this.virtru.dismissModal(/activate/i);

    const toInput = this.page.locator('textarea[name="to"], input[aria-label="To recipients"]').first();
    await toInput.waitFor({ state: 'attached', timeout: 15000 });
    await toInput.fill(to);
    await this.page.keyboard.press('Enter');

    const subjectInput = this.page.getByPlaceholder('Subject').first();
    await subjectInput.fill(subject);

    const bodyEditable = this.page.locator('div[aria-label="Message Body"]').first();
    await bodyEditable.click();
    await bodyEditable.fill(body);

    const sendButton = this.page.getByRole('button', { name: /(secure send|send)/i }).first();
    await sendButton.scrollIntoViewIfNeeded().catch(() => {});

    const buttonVisible = await sendButton.isVisible({ timeout: 2000 }).catch(() => false);
    if (buttonVisible) {
      await sendButton.click();
    } else {
      const shortcut = process.platform === 'darwin' ? 'Meta+Enter' : 'Control+Enter';
      await this.page.keyboard.press(shortcut);
    }

    try {
      await this.page.getByText(/message sent/i).waitFor({ timeout: 15000 });
      await this.virtru.dismissModal(/done/i, /secure message/i);
    } catch (error) {
      // If send failed because the page was closed (modal reload), re-open Gmail compose and re-run flow.
      if (
        (error as Error).message.includes('page, context or browser has been closed') ||
        (error as Error).message.includes('Target closed')
      ) {
        await this.page.goto('https://mail.google.com/mail/u/0/#inbox', {
          waitUntil: 'domcontentloaded',
        });
        await this.virtru.ensureOnboardingCleared();
        await this.openCompose();
        await this.toggleVirtruOn();
        await this.fillAndSend(to, subject, body);
        return;
      }
      throw error;
    }
  }

  private async ensureComposeViewport() {
    const fullScreenButton = this.page.locator('[aria-label="Full screen"], [data-tooltip*="Full screen"]').first();
    if (await fullScreenButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await fullScreenButton.click().catch(() => {});
      await this.page.waitForTimeout(500);
    }
  }
}
