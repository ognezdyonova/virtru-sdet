import { test, expect } from '@playwright/test';
import { waitForEmailBySubject } from '../../utils/waitForEmail';

class MockInbox {
  public opened: Array<{ subject: string; timeout: number }> = [];

  async openMessageBySubject(subject: string, timeoutMs: number) {
    this.opened.push({ subject, timeout: timeoutMs });
  }
}

test.describe('waitForEmailBySubject', () => {
  test('delegates to inbox with provided subject and timeout', async () => {
    const inbox = new MockInbox();
    await waitForEmailBySubject(inbox as any, 'Subject', 1234);
    expect(inbox.opened).toEqual([{ subject: 'Subject', timeout: 1234 }]);
  });

  test('throws when subject is empty', async () => {
    const inbox = new MockInbox();
    await expect(waitForEmailBySubject(inbox as any, '')).rejects.toThrow(
      /non-empty subject/i
    );
  });
});

