import { Page } from '@playwright/test';
import { allure } from 'allure-playwright';
import { GmailComposePage } from '../pages/GmailComposePage';
import { GmailInboxPage } from '../pages/GmailInboxPage';
import { GmailMessagePage } from '../pages/GmailMessagePage';
import { waitForEmailBySubject } from '../utils/waitForEmail';

async function stepWithScreenshot<T>(
  page: Page,
  title: string,
  body: () => Promise<T>
): Promise<T> {
  const capture = async (suffix: string) => {
    if (page.isClosed()) return;
    try {
      const image = await page.screenshot({ fullPage: true });
      await allure.attachment(`Screenshot • ${title} ${suffix}`, image, 'image/png');
    } catch {
      // Best effort; ignore screenshot errors
    }
  };

  return allure.step(title, async () => {
    try {
      const result = await body();
      await capture('(success)');
      return result;
    } catch (error) {
      await capture('(failure)');
      throw error;
    }
  });
}

export async function sendAndVerifyEncryptedEmail(page: Page): Promise<{
  subject: string;
  body: string;
  protected: boolean;
}> {
  const inbox = new GmailInboxPage(page);

  await stepWithScreenshot(page, 'Ensure Gmail inbox is ready', async () => {
    await inbox.goto();
    if (!(await inbox.isLoggedIn())) {
      await inbox.login(process.env.GMAIL_USER!, process.env.GMAIL_PASS!);
    }
    await inbox.completeVirtruOnboarding();
    if (await inbox.waitForVirtruActivatePrompt(5_000)) {
      await inbox.completeVirtruOnboarding();
    }
  });

  const compose = new GmailComposePage(page);
  await stepWithScreenshot(page, 'Compose and send a secure Virtru email', async () => {
    await compose.openCompose();
    await inbox.completeVirtruOnboarding();
    await compose.toggleVirtruOn(); // must exist in your extension UI
    await compose.fillAndSend(
      process.env.EMAIL_TO!,
      process.env.EMAIL_SUBJECT!,
      process.env.EMAIL_BODY!
    );
  });

  await stepWithScreenshot(page, 'Await secure email delivery', async () => {
    await inbox.goto();
    await inbox.completeVirtruOnboarding();
    await waitForEmailBySubject(inbox, process.env.EMAIL_SUBJECT!, 90_000);
  });

  return stepWithScreenshot(page, 'Decrypt and read secure email', async () => {
    const message = new GmailMessagePage(page);
    const subject = await message.getSubject();
    const body = await message.waitForVirtruDecryption(90_000);
    const protectedFlag = await message.hasVirtruProtectionBadge(10_000);
    return { subject, body, protected: protectedFlag };
  });
}
