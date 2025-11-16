## Contributing Guide

### Docs-First Workflow
1. Review `.cursor/rules/` to understand expectations (docs-first, testing, security, PR hygiene).
2. For any change, update `docs/overview.md` and/or `docs/checklists/e2e.md` **before** editing code.
3. Reference the updated doc sections in your PR description.

### Development Checklist
- `npm ci`
- `npm run fetch:extension`
- `npx playwright install`
- `npm test` (defaults to `msedge`; override with `BROWSER_CHANNELS=chrome,msedge`)
- Add/refresh unit tests in `src/tests/unit` for new utilities or complex logic.
- Capture Playwright traces for new flows and attach failures to PR when debugging.

### Commit & PR Expectations
- Conventional commit-style summaries (e.g., `feat: add virtru onboarding helper`).
- One logical change per commit when possible; reference issue/ticket IDs.
- PR template should include:
  - ✅ Docs updated
  - ✅ Tests added/updated
  - ✅ `npm test` (or targeted command) output
  - ✅ Security review (no secrets / PII)

### Security Notes
- Never commit `.env` or credentials; `.env.example` should only contain placeholders.
- Use dedicated Gmail/Virtru accounts for automation.
- Scrub logs of PII before attaching to tickets/PRs.

### Contact / Help
- For new Virtru UI states, capture screenshots and extend `VirtruOnboardingHelper`.
- For rule questions, ping the maintainers listed in `.cursor/rules/00-foundations.mdc`.

