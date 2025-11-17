

## Prereqs
- Node 20+, Edge installed (Chrome is currently unreliable — see below).
- Internet access (needed to download the Virtru Chrome extension during setup).
- Optional: set `CHROME_PRODVERSION` with the Chrome build number if auto-detection fails (e.g. `export CHROME_PRODVERSION=$(google-chrome --product-version)`).
- Create `.env` from `.env.example` and fill values (local only). **Use throwaway Gmail/Virtru accounts**; never commit secrets.
- Read `docs/overview.md` + `docs/checklists/e2e.md` before changing flows (docs-first policy).

## Install & Run (local)
```bash
npm ci
npm run fetch:extension    # downloads + unpacks latest Virtru extension
npx playwright install
cp .env.example .env   # edit values
npm run test           # defaults to Edge (headful)

# Optional: run both channels (Chrome only works locally; **CI runs Edge only**)
BROWSER_CHANNELS=chrome,msedge npm test

## Allure (local)
npm run allure:generate
npm run allure:open

## Chrome automation note
Chrome’s current automation policy unloads developer-mode extensions when Playwright/Federated automation is detected, even with `--load-extension`. After extensive mitigation attempts (fake profiles, external extension manifests, storage state), the Virtru extension still disappears during Chrome runs unless the browser is managed via Chrome Policies / Group Policy with a force-installed, signed Virtru extension. Because we do not control that enterprise setup, **Edge is the only reliable channel** in CI. Mention this limitation explicitly during reviews.

## CI, Allure & GitHub Pages
- Workflow: `.github/workflows/e2e-edge-allure.yml`
- Runs Playwright tests on `windows-latest` using Edge with the Virtru extension.
- Restores Gmail storage state from the `GMAIL_STORAGE_STATE` secret, then executes `npm run test`.
- Generates and uploads the Allure report via `npx allure-commandline`.
- Publishes the report to GitHub Pages (artifact `github-pages`; Pages source must be set to GitHub Actions).
- Required secrets: `GMAIL_USER`, `GMAIL_PASS`, `EMAIL_TO`, `EMAIL_SUBJECT`, `EMAIL_BODY`, `GMAIL_STORAGE_STATE`.

## Docs & Workflow
- Architecture & repo map: `docs/overview.md`
- Operational checklist: `docs/checklists/e2e.md`
- Contribution guidance (commits, PR template, testing expectations): `CONTRIBUTING.md`
- Cursor guardrails live in `.cursor/rules/`

Whenever flows or selectors change:
1. Update docs + checklist first.
2. Adjust helpers/tests.
3. Reference updated docs in PR body per internal rules.
