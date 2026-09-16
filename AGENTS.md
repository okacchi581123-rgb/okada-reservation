# Repository Guidelines

## Project Structure & Module Organization

- `index.html` is the production GitHub Pages entry point, connecting LINE LIFF authentication to a Google Apps Script (GAS) web app. HTML, CSS, and browser JavaScript are inline; there is no separate asset directory.
- `test-staging.html`, `reservation-api-test.html`, and `test-cors.html` are independent manual verification pages.
- `scripts/validate.mjs` checks production configuration; `scripts/openai-review.mjs` powers automated PR reviews.
- `.github/` contains workflows and the PR template. `docs/AUTOMATION.md` and `CLAUDE.md` describe operational rules.
- `tests/` and `gas/` contain placeholder READMEs only. GAS application source is not currently tracked here.

## Build, Test, and Development Commands

Use Node.js 20, matching CI. No package installation, bundler, or build step is configured.

- `node scripts/validate.mjs` — validate approved LIFF, GAS, and Pages values in `index.html`; reject local or staging references.
- `python -m http.server 8000` — optionally serve the static pages locally when Python is available. Local preview does not establish that LIFF authentication or GAS integration works.
- `git diff --check` — check changes for whitespace errors before committing.

## Coding Style & Naming Conventions

Match surrounding formatting: two-space indentation, JavaScript semicolons, and double-quoted strings. Use descriptive camelCase function/variable names and uppercase constants for configuration. Keep Node scripts as ES modules (`.mjs`) and diagnostic page names descriptive and hyphenated. Preserve Japanese user-facing text. No formatter or linter is configured; avoid unrelated reformatting.

## Testing Guidelines

Run production validation before every PR. It checks configuration text only, not runtime behavior, and excludes the diagnostic pages. For behavioral changes, manually verify the relevant staging page and record steps and results. No automated test framework, test-file naming convention, or coverage threshold exists; place future automated tests under `tests/`.

## Commit & Pull Request Guidelines

History mixes `feat:`/`chore:` prefixes with filename-prefixed descriptions; use concise, specific messages following those patterns. Fetch and inspect `origin/main` before branching. Never commit or push directly to `main`.

Complete `.github/pull_request_template.md`, including production impact, test results, rollback instructions, and LIFF/GAS/Pages change declarations. Require passing CI and human review; agents must not merge PRs.

## Security & Configuration

Obtain explicit human approval before changing production connection values. Never invent missing GAS source. Keep credentials and tokens out of files, commits, and PRs; use GitHub Actions secrets for automation.
