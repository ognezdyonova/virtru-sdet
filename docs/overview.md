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
5. **Automation limits in Chrome**: Chrome currently unloads developer-mode extensions when it detects automation (even with `--load-extension`). After extensive mitigation attempts (fake profiles, external manifests, storage state), the Virtru extension still disappears on Chrome. **Result: Edge is the only reliable channel**. 
6. **Doc-first workflow**: This overview + checklists must be updated whenever flows or tooling change.

### CI, Allure & GitHub Pages
- Workflow: `.github/workflows/e2e-edge-allure.yml`
- Runs on Windows (Edge channel) to ensure the Virtru extension can load under automation.
- Steps overview:
  1. Checkout & install dependencies (including Virtru extension via `npm run fetch:extension`).
  2. Restore Gmail storage state from the `GMAIL_STORAGE_STATE` secret (base64 `storageState.json`).
  3. Run Playwright tests with `BROWSER_CHANNELS=msedge`.
  4. Generate Allure report using `npx allure-commandline`.
  5. Upload artifacts (Allure results, Playwright HTML report, test results, videos).
  6. Upload `allure-report/` as the `github-pages` artifact and deploy via `actions/deploy-pages@v4`.
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

