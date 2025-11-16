import { Page } from '@playwright/test';
import { VirtruOnboardingHelper } from '../helpers/VirtruOnboardingHelper';

export class GmailInboxPage {
  private virtru: VirtruOnboardingHelper;

  constructor(private page: Page) {
    this.virtru = new VirtruOnboardingHelper(page);
  }

  async goto() {
    await this.page.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded' });
  }

  async completeVirtruOnboarding() {
    await this.virtru.ensureOnboardingCleared();
  }

  async waitForVirtruActivatePrompt(timeoutMs = 5_000) {
    return this.virtru.waitForActivatePrompt(timeoutMs);
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.page.getByRole('button', { name: 'Compose' }).isVisible({ timeout: 5000 }).catch(() => false) as boolean;
  }

  async login(username: string, password: string) {
    await this.page.goto('https://mail.google.com/', { waitUntil: 'domcontentloaded' });
    // Email
    await this.page.getByRole('textbox', { name: /email|phone/i }).fill(username);
    await this.page.getByRole('button', { name: /next/i }).click();

    // Password
    await this.page.getByLabel(/enter your password/i, { exact: false }).fill(password);
    await this.page.getByRole('button', { name: /next/i }).click();

    // Wait for inbox landing
    await this.page.getByRole('button', { name: 'Compose' }).waitFor({ timeout: 30000 });
  }

  async openMessageBySubject(subject: string, timeoutMs = 60_000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const row = this.page.locator('tr[role="row"] td span[class][data-hovercard-id], tr[role="row"]')
        .filter({ hasText: subject })
        .first();

      if (await row.isVisible({ timeout: 2000 }).catch(() => false)) {
        await row.click();
        return;
      }
      await this.page.keyboard.press('r'); // small no-op
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.page.waitForTimeout(2000);
    }
    throw new Error(`Email with subject "${subject}" not found within ${timeoutMs}ms`);
  }
}
