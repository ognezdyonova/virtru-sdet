# Virtru SDET — Playwright + Allure + GitHub Pages

## Prereqs
- Node 20+, Chrome/Edge installed.
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

# Optional: run both channels
BROWSER_CHANNELS=chrome,msedge npm test

## Allure (local)
npm run allure:generate
npm run allure:open

## Docs & Workflow
- Architecture & repo map: `docs/overview.md`
- Operational checklist: `docs/checklists/e2e.md`
- Contribution guidance (commits, PR template, testing expectations): `CONTRIBUTING.md`
- Cursor guardrails live in `.cursor/rules/`

Whenever flows or selectors change:
1. Update docs + checklist first.
2. Adjust helpers/tests.
3. Reference updated docs in PR body per internal rules.
