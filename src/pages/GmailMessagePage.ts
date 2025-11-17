import { Page } from '@playwright/test';
import type { Frame } from '@playwright/test';

export class GmailMessagePage {
  constructor(private page: Page) {}

  async getSubject(timeoutMs = 30_000): Promise<string> {
    const subject = this.page
      .locator('h2[data-attribute="subject"], h2.hP, div[role="heading"][data-legacy-message-id]')
      .first();
    await subject.waitFor({ state: 'visible', timeout: timeoutMs });
    return (await subject.textContent())?.trim() ?? '';
  }

  async waitForVirtruDecryption(timeoutMs = 90_000): Promise<string> {
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const frameText = await this.readVirtruFrameBody();
      if (frameText) return frameText;

      await this.tryUnlockVirtru(this.page);

      const inlineSecureText = await this.readInlineVirtruBody();
      if (inlineSecureText) return inlineSecureText;

      const fallbackText = await this.readFallbackGmailBody();
      if (fallbackText) return fallbackText;

      const unlockButtonStillVisible = await this.tryUnlockVirtru(this.page);
      if (!unlockButtonStillVisible) {
        await this.page.waitForTimeout(1000);
      }
    }
    throw new Error('Decryption timeout: body text did not appear');
  }

  private async readVirtruFrameBody(): Promise<string | null> {
    const virtruIframe = this.page
      .locator('iframe[src*="secure.virtru.com"], iframe[title*="Virtru"]')
      .first();

    if (!(await virtruIframe.isVisible({ timeout: 500 }).catch(() => false))) {
      return null;
    }

    const frame = await virtruIframe.contentFrame();
    if (!frame) return null;

    await this.tryUnlockVirtru(frame);
    const text = await frame
      .locator('[data-testid="secure-message-body"], .formatted-text, .virtru-sender-body, [data-virtru-component="secure-message-body"]')
      .first()
      .innerText()
      .catch(() => '');
    const trimmed = text?.trim() ?? '';
    if (!trimmed || this.isEncryptedInstruction(trimmed)) {
      return null;
    }
    return trimmed;
  }

  private async readInlineVirtruBody(): Promise<string | null> {
    const container = this.page
      .locator(
        '.virtru-sender-body, .virtru-email-body, .virtru-secure-message-body, [data-testid="virtru-message-body"], [data-virtru-component="secure-message-body"]'
      )
      .first();
    const visible = await container.isVisible({ timeout: 500 }).catch(() => false);
    if (!visible) {
      return null;
    }
    const text = await container.innerText().catch(() => '');
    const trimmed = text?.trim() ?? '';
    if (!trimmed || this.isEncryptedInstruction(trimmed)) {
      return null;
    }
    return trimmed;
  }

  private async readFallbackGmailBody(): Promise<string | null> {
    const candidates = [
      'div[role="listitem"] div[dir="ltr"]',
      'div[data-message-id] div[dir="ltr"]',
      'div[role="article"] div[dir="ltr"]',
      '.a3s.aiL div[dir="ltr"]',
      '.a3s.aiL',
      'div[aria-label="Message Body"]',
    ];

    for (const selector of candidates) {
      const body = this.page.locator(selector).first();
      const exists = await body.isVisible({ timeout: 500 }).catch(() => false);
      if (!exists) continue;
      const text = await body.innerText().catch(() => '');
      const trimmed = text?.trim() ?? '';
      if (!trimmed || this.isEncryptedInstruction(trimmed)) {
        continue;
      }
      return trimmed;
    }
    return null;
  }

  private isEncryptedInstruction(text: string): boolean {
    return /unlock message|virtru metadata|unencrypted introduction|view my encrypted message/i.test(text);
  }

  private async tryUnlockVirtru(context: Page | Frame): Promise<boolean> {
    const selectors = [
      'role=button[name="Unlock Message"i]',
      'role=button[name="View Secure Message"i]',
      'role=button[name="View Message"i]',
      'role=link[name="Unlock Message"i]',
      'role=link[name="View Secure Message"i]',
      'text=/unlock message/i',
      'text=/view secure message/i',
      '[data-testid*="unlock"]',
    ];

    for (const selector of selectors) {
      const candidate = context.locator(selector).first();
      const visible = await candidate.isVisible({ timeout: 200 }).catch(() => false);
      if (!visible) continue;
      await candidate.scrollIntoViewIfNeeded().catch(() => {});
      await candidate.click().catch(() => {});
      return true;
    }
    return false;
  }

  async hasVirtruProtectionBadge(timeoutMs = 10_000): Promise<boolean> {
    const badge = this.page.getByText(/your message,\s*protected by virtru/i).first();
    const watermark = this.page.getByText(/secured by virtru/i).first();
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await badge.isVisible({ timeout: 500 }).catch(() => false)) return true;
      if (await watermark.isVisible({ timeout: 500 }).catch(() => false)) return true;
      await this.page.waitForTimeout(250);
    }
    return false;
  }
}
