# Contributing to Awesome JS

Thanks for your interest in improving this monorepo. This project hosts Angular libraries under `packages/` and demo apps under `examples/`. The main library today is `@awesome/charts`.

## Prerequisites
- Node.js 20+
- npm 10+
- Git
- Windows PowerShell (or any POSIX shell)

Install dependencies per workspace you work in (there is no root install):
```bash
cd packages/charts && npm ci --no-audit --no-fund
cd ../../examples/charts && npm ci --no-audit --no-fund
```

## Project layout
- `packages/charts` — Angular library built with `ng-packagr`
- `dist/charts` — build output (generated)
- `examples/charts` — Angular demo app that consumes `@awesome/charts`

## Development workflow
1) Build the library locally
```bash
cd packages/charts
npm run build
```
This produces `dist/charts` with FESM bundles and typings.

2) Run the example app against your local build
```bash
cd ../../examples/charts
npm start
```
The app resolves `@awesome/charts` via a TS path mapped to `../../dist/charts`.

3) Watch mode (optional)
- Library: use your editor/TypeScript incremental builds; re-run `npm run build` as needed.
- App: `npm run watch` inside `examples/charts`.

## Coding standards
- Angular 20.x, TypeScript ~5.9
- Prefer explicit exports via `packages/charts/src/public-api.ts`
- Keep public APIs stable; avoid breaking changes unless justified and documented in the changelog section of the PR
- Keep code readable: meaningful names, early returns, minimal nesting
- Match existing formatting. The example workspace uses Prettier (printWidth 100, singleQuote). If you format, follow those settings
- Unit tests (if adding): place under the relevant package and use Angular/Jasmine/Karma defaults

## Commit messages
Use clear, conventional messages. Suggested types: `feat`, `fix`, `docs`, `refactor`, `test`, `build`, `chore`.
Examples:
- `feat(charts): add LLMService token configuration`
- `fix(charts): guard against empty series in echarts options`

If your change is breaking, include `!` and a short BREAKING CHANGE note in the PR description.

## Branching & PRs
- Create a feature branch from `main`
- Keep PRs focused and small when possible
- Include:
  - What/Why summary
  - Screenshots or GIFs for UI-ish changes (example app)
  - Notes on testing and any breaking changes
- Ensure the project builds:
  - Library: `cd packages/charts && npm run build`
  - Example: `cd examples/charts && npm run build` or `npm start` locally without runtime errors

## Testing
- Unit tests: `cd examples/charts && npm test` (Karma/Jasmine)
- Add or update tests when changing behavior

## Linting & formatting
- Follow the Prettier config found in `examples/charts/package.json`
- Keep import paths clean and use TypeScript path mapping as configured

## Adding a new library or example
Follow the instructions in `README.md` (section “Add another package and a matching example”). In short:
- New library under `packages/<name>` with its `ng-package.json` and `public-api.ts`
- Build it with `ng-packagr`
- Map it in the consuming example app via TS `paths` to `../../dist/<name>`

## Release & versioning (maintainers)
- Libraries are versioned in their own `package.json`
- Use semver. Bump versions when publishing; keep peerDependencies aligned with Angular versions in use
- `dist/` is generated and should not be committed

## Reporting issues
- Include environment (Node/npm/OS), reproduction steps, expected vs actual, and logs
- If related to the demo, attach a minimal reproduction or describe steps within `examples/charts`

## Code of Conduct
Be respectful and constructive. Assume good intent, prefer kindness, and help fellow contributors succeed.

---
Thank you for contributing! 🚀
