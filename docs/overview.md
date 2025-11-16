## Virtru SDET Overview

### Purpose
- Validate Virtru Gmail extension end-to-end via Playwright.
- Exercise Gmail compose, encryption toggle, send, and verification flows in both Chrome and Edge (default Edge).
- Capture diagnostics (video, trace, Allure) for CI + GitHub Pages publishing.

### Repository Map
- `src/launchers/withExtension.ts`: launches persistent Chromium context with Virtru extension installed.
- `src/pages/*`: Gmail page objects (Inbox, Compose, Message) encapsulating UI interactions.
- `src/flows/sendAndVerifyEncryptedEmail.ts`: end-to-end flow orchestrating login, Virtru onboarding, compose, send, and verification.
- `src/utils/*`: cross-cutting helpers (`normalize`, `waitForEmailBySubject`, soon Virtru onboarding utilities).
- `src/tests/virtru.encryption.spec.ts`: Playwright spec running the end-to-end scenario across configured channels/projects.
- `scripts/downloadVirtruExtension.mjs`: downloads unpacked Virtru extension before runs (used locally & CI).
- `docs/checklists/*`: operational checklists for setup, debugging, and review.

### Key Decisions / Constraints
1. **Persistent context**: Gmail/extension require a real Chrome/Edge profile; we use `chromium.launchPersistentContext`.
2. **Headful only**: Extensions require headful mode, so CI wraps commands in `xvfb-run`.
3. **Virtru onboarding variability**: Multiple modals/prompts appear (Activate, Done, Secure message). Page objects call shared helpers to clear them before continuing.
4. **Environment-driven data**: Gmail credentials, recipients, and Virtru extension path provided via `.env`/GitHub secrets.
5. **Doc-first workflow**: This overview + checklists must be updated whenever flows or tooling change.

### Next Steps (Maintainers)
- Keep `docs/checklists/e2e.md` updated when onboarding sequences change.
- Capture new Virtru UI states (screenshots + selectors) in this doc to avoid regressions.
- Expand helper unit tests (`src/tests/unit`) as utilities grow.

