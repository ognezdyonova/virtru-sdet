import { test, expect } from '@playwright/test';
import { launchWithVirtruExtension } from '../launchers/withExtension';
import { sendAndVerifyEncryptedEmail } from '../flows/sendAndVerifyEncryptedEmail';
import { normalize } from '../utils/normalize';

const channels = (process.env.BROWSER_CHANNELS ?? 'msedge').split(',') as ('chrome' | 'msedge')[];

for (const channel of channels) {
  test.describe(`Virtru Gmail E2E (${channel})`, () => {
    let ctx: any;

    test.beforeAll(async () => {
      ctx = await launchWithVirtruExtension(channel);
    });

    test.afterAll(async () => {
      await ctx?.close();
    });

    test('send encrypted mail and verify decrypted content', async () => {
      const page = await ctx.newPage();
      await page.bringToFront();
      const expectedSubject = process.env.EMAIL_SUBJECT;
      const expectedBody = process.env.EMAIL_BODY;

      if (!expectedSubject || !expectedBody) {
        throw new Error('EMAIL_SUBJECT and EMAIL_BODY env vars must be defined');
      }

      const { subject, body, protected: isProtected } = await sendAndVerifyEncryptedEmail(page);

      expect(subject, `Expected subject to equal\nExpected: ${expectedSubject}\nReceived: ${subject}`).toBe(
        expectedSubject
      );
      expect(isProtected, 'Virtru protection badge should be present').toBe(true);
      expect(
        normalize(body),
        `Decrypted body mismatch\nExpected to contain: ${normalize(expectedBody)}\nReceived: ${normalize(body)}`
      ).toContain(normalize(expectedBody));
    });
  });
}
