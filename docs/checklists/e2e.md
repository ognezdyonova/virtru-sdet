## Virtru Gmail E2E Checklist

### Pre-run
1. ✅ `npm ci`
2. ✅ `npm run fetch:extension` (ensures latest Virtru CRX unpacked to `extensions/virtru`)
3. ✅ `npx playwright install` (Chrome + dependencies)
4. ✅ `.env` populated (`GMAIL_USER`, `GMAIL_PASS`, `EMAIL_TO`, `EMAIL_SUBJECT`, `EMAIL_BODY`, optional `VIRTRU_EXT_PATH`)
5. ✅ Verify Virtru onboarding screenshots match current UI; update selectors if needed.

### Local Execution
1. Export desired browser channels, e.g. `BROWSER_CHANNELS=msedge` (default) or `chrome,msedge`.
2. Run `npm test` (headful by design).
3. If failure occurs:
   - Collect trace: `npx playwright show-trace test-results/<run>/trace.zip`.
   - Capture screenshot(s) of any new Virtru modal and update helpers.
   - Confirm extension folder exists and contains latest build.

### CI Publishing
1. GitHub Actions workflow installs deps, runs `npm run fetch:extension`, executes Playwright via `xvfb-run`, then publishes Allure report to Pages.
2. Ensure Allure CLI step stays compatible (Java installed, binary path on `GITHUB_PATH`).
3. After merging to `main`, confirm Pages deploy succeeded (link in workflow summary).

### Regression Checklist (before merge)
- [ ] Docs (README + overview + checklist) updated for any flow/UI changes.
- [ ] Added/updated helper unit tests if selectors or flows changed.
- [ ] Playwright traces/snapshots reviewed for flakiness (no extra modals left open).
- [ ] Security review: no plaintext secrets committed; `.env` excluded; instructions remind users to use dedicated Gmail accounts.

