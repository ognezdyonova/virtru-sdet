import { Page } from '@playwright/test';
import { GmailComposePage } from '../pages/GmailComposePage';
import { GmailInboxPage } from '../pages/GmailInboxPage';
import { GmailMessagePage } from '../pages/GmailMessagePage';
import { waitForEmailBySubject } from '../utils/waitForEmail';

export async function sendAndVerifyEncryptedEmail(page: Page): Promise<{
  subject: string;
  body: string;
  protected: boolean;
}> {
  const inbox = new GmailInboxPage(page);

  await inbox.goto();

  if (!(await inbox.isLoggedIn())) {
    await inbox.login(process.env.GMAIL_USER!, process.env.GMAIL_PASS!);
  }

  await inbox.completeVirtruOnboarding();
  if (await inbox.waitForVirtruActivatePrompt(5_000)) {
    await inbox.completeVirtruOnboarding();
  }

  const compose = new GmailComposePage(page);
  await compose.openCompose();
  await inbox.completeVirtruOnboarding();
  await compose.toggleVirtruOn(); // must exist in your extension UI
  await compose.fillAndSend(
    process.env.EMAIL_TO!,
    process.env.EMAIL_SUBJECT!,
    process.env.EMAIL_BODY!
  );

  await inbox.goto();
  await inbox.completeVirtruOnboarding();
  await waitForEmailBySubject(inbox, process.env.EMAIL_SUBJECT!, 90_000);

  const message = new GmailMessagePage(page);
  const subject = await message.getSubject();
  const body = await message.waitForVirtruDecryption(90_000);
  const protectedFlag = await message.hasVirtruProtectionBadge(10_000);
  return { subject, body, protected: protectedFlag };
}
