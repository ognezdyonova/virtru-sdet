## Virtru SDET Overview

### Purpose
- Validate Virtru Gmail extension end-to-end via Playwright.
- Exercise Gmail compose, encryption toggle, send, and verification flows (Edge only; see Chrome note below).
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
2. **Headful only**: Extensions require headful mode, so CI runs fully headed in Edge.
3. **Virtru onboarding variability**: Multiple modals/prompts appear (Activate, Done, Secure message). Page objects call shared helpers to clear them before continuing.
4. **Environment-driven data**: Gmail credentials, recipients, and Virtru extension path provided via `.env`/GitHub secrets.
5. **Automation limits in Chrome**: Chrome currently unloads developer-mode extensions when it detects automation (even with `--load-extension`). After extensive mitigation attempts (fake profiles, external manifests, storage state), the Virtru extension still disappears on Chrome unless the browser is managed via Chrome Policies / Group Policy with a force-installed, signed Virtru extension. Because we do not control that enterprise configuration, **Edge and Playwright’s bundled Chromium are the only reliable channels**.
6. **Doc-first workflow**: This overview + checklists must be updated whenever flows or tooling change.

### CI, Allure & GitHub Pages
- Workflow: `.github/workflows/e2e-edge-allure.yml`
- Runs two jobs:
  - `windows-latest` + `BROWSER_CHANNELS=msedge` (verifies Virtru in `edge://extensions`, generates Allure, deploys Pages)
  - `ubuntu-latest` + `BROWSER_CHANNELS=chromium` (validates the flow with Playwright’s bundled Chromium)
- Steps overview (per job):
  1. Checkout & install dependencies (including Virtru extension via `npm run fetch:extension`).
  2. Restore Gmail storage state from the `GMAIL_STORAGE_STATE` secret (base64 `storageState.json`).
  3. Run Playwright tests with the configured channel.
  4. Edge job generates Allure via `npx allure-commandline`, uploads artifacts, and publishes GitHub Pages (`github-pages` artifact).
- Required repository secrets:
  - `GMAIL_USER`, `GMAIL_PASS`, `EMAIL_TO`, `EMAIL_SUBJECT`, `EMAIL_BODY`
  - `GMAIL_STORAGE_STATE` (base64-encoded `storageState.json`)
- GitHub Pages configuration:
  - Settings → Pages → Source: **GitHub Actions**
  - The deployed Allure dashboard is available at `https://<github-username>.github.io/<repo>/`.

### Next Steps (Maintainers)
- Keep `docs/checklists/e2e.md` updated when onboarding sequences change.
- Capture new Virtru UI states (screenshots + selectors) in this doc to avoid regressions.
- Expand helper unit tests (`src/tests/unit`) as utilities grow.

