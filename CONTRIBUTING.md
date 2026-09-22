# Contributing to ImageLens

Thank you for helping improve ImageLens. Contributions should preserve the product's local-first behavior, evidence model, and explicit distinction between automated findings and human review.

## Before You Start

1. Search existing issues before opening a new one.
2. For a substantial change, open an issue describing the user problem, expected behavior, and validation approach.
3. Keep changes focused. Avoid combining scanner behavior, reporting, and unrelated visual changes in one pull request.

## Local Setup

```bash
git clone https://github.com/manjunathnp/ImageLens.git
cd ImageLens
npm install
npx playwright install chromium
npm start
```

## Development Guidelines

- Preserve per-occurrence evidence: page, viewport, state, selector, resource, and issue details.
- Keep failures, review items, and unverified content separate.
- Do not describe automated results as accessibility conformance.
- Avoid external runtime dependencies for reports; HTML exports must remain self-contained.
- Keep credentials out of application storage, logs, fixtures, and reports.
- Preserve keyboard access, visible focus, reduced-motion behavior, and 375px responsive layouts.
- Add or update meaningful regression coverage for scanner, lifecycle, or interaction changes.

## Validation

Run the applicable checks before submitting a pull request:

```bash
npm test
npm run test:scenarios
npm run test:design
```

## Pull Requests

Describe:

- the concrete problem and resulting behavior;
- the affected workflow or scanner boundary;
- the tests you ran;
- any coverage limit or risk a reviewer should understand.

Do not include customer credentials, private target URLs, production audit data, or generated `test-output/` files.
