import { GmailInboxPage } from '../pages/GmailInboxPage';

/**
 * Polls the inbox until an email with the desired subject appears and opens it.
 * GmailInboxPage.openMessageBySubject already implements polling + reload logic,
 * so this helper simply delegates while enforcing a subject and timeout.
 */
export async function waitForEmailBySubject(
  inbox: GmailInboxPage,
  subject: string,
  timeoutMs = 60_000
): Promise<void> {
  if (!subject) {
    throw new Error('waitForEmailBySubject requires a non-empty subject');
  }

  await inbox.openMessageBySubject(subject, timeoutMs);
}

