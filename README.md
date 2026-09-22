<div align="center">
  <img src="brand/imagelens-mark.svg" width="112" height="112" alt="ImageLens aperture and image frame logo">
  <h1>ImageLens</h1>
  <p><strong>Every image. A clearer picture.</strong></p>
  <p>A local-first browser application for image integrity, responsive-resource, and text-alternative auditing.</p>
  <p>
    <a href="#installation">Installation</a> ·
    <a href="#how-it-works">How It Works</a> ·
    <a href="#reports">Reports</a> ·
    <a href="#validation">Validation</a>
  </p>
  <sub>Version 1.1.0 · Node.js 20+ · Playwright / Chromium</sub>
</div>

---

## Overview

ImageLens inspects images in a real browser and connects each finding to the page, viewport, resource, element, and recorded markup behind it. It helps quality engineers, developers, accessibility specialists, and web teams investigate broken resources and text-alternative issues without losing the context needed to act.

The app supports public pages and browser-based sign-in, flexible page selection, desktop and mobile viewport checks, visual evidence, and self-contained reports. ImageLens runs on your machine and binds its workspace to the loopback interface.

> [!IMPORTANT]
> ImageLens supports investigation; it does not establish accessibility conformance. Image purpose, text-alternative quality, keyboard behavior, and application-specific journeys still require human review.

## Screenshots

### Home

![ImageLens home with URL entry and the Discover, Inspect, Resolve workflow](docs/screenshots/home-light.png)

### Audit Overview and Visual Gallery

![ImageLens audit overview in dark mode with outcome metrics, charts, filters, and image gallery](docs/screenshots/audit-gallery-dark.png)

<table>
  <tr>
    <td width="70%"><strong>Image Evidence Inspector</strong></td>
    <td width="30%"><strong>Responsive Home</strong></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/image-inspector.png" alt="ImageLens inspector showing resource, selector, alt text, dimensions, findings, and markup"></td>
    <td><img src="docs/screenshots/mobile-home-dark.png" alt="ImageLens home in a narrow mobile viewport and dark theme"></td>
  </tr>
</table>

The screenshots use controlled local fixture data and demonstrate the interface rather than customer results.

## Key Features

- **Flexible page scope:** inspect the current page, every discovered same-origin page, or a selected set of pages and path sections.
- **Public and signed-in workflows:** connect a real browser session for sites that require authentication; credentials are entered only in the target browser.
- **Real browser inspection:** audit desktop (1366×900) and mobile (390×844) viewports in Chromium.
- **Broad image discovery:** inspect `img`, image inputs, responsive candidates, inline SVG, CSS backgrounds, open shadow DOM, accessible frames, lazy-loaded images, disclosures, and supported tab states.
- **Integrity evidence:** record loading, decoding, observable HTTP status, source candidates, intrinsic and rendered dimensions, and transfer-size evidence when available.
- **Text-alternative checks:** identify missing alternatives, tooltip-only alternatives, unnamed image controls, generic or unusually long text, and cases requiring contextual review.
- **Visual review:** switch between gallery and list views, view captured previews where browser rules allow, and use clear placeholders where preview capture is unavailable.
- **Combined filters:** narrow results by outcome, issue type, page, viewport, and search text.
- **Coverage reporting:** keep checked content, traversal limits, errors, and unverified states distinct.
- **Recovery and history:** reconnect to active scans after refresh, merge report history across tabs, and warn when browser storage cannot save a completed report.
- **Light, dark, and system themes:** share one persistent LENS appearance preference with responsive layouts and keyboard-accessible controls.

## Requirements

- Node.js 20 or newer
- npm
- Playwright Chromium
- A macOS, Linux, or Windows environment supported by Playwright

## Installation

```bash
git clone https://github.com/manjunathnp/ImageLens.git
cd ImageLens
npm install
npx playwright install chromium
npm start
```

Open [http://127.0.0.1:4190](http://127.0.0.1:4190) in your browser.

To use another port:

```bash
PORT=4200 npm start
```

The server binds to `127.0.0.1` only.

## How It Works

1. **Enter a website or page URL.** Choose public access or a browser sign-in session.
2. **Choose the scope.** Inspect the current page, all discovered pages, or selected pages and sections.
3. **Review and run.** Confirm the selected pages and the validation checkpoints.
4. **Explore the result.** Review outcome metrics, page coverage, the visual gallery, overlapping findings, and element-level evidence.
5. **Export the audit.** Create an interactive HTML report, PDF, CSV, or structured JSON evidence.

For signed-in sites, complete authentication in the browser opened by ImageLens, return to the app, and confirm the session. The scanner retains that browser context through discovery and inspection. Use a suitable test account and environment for authenticated exploration.

## What ImageLens Checks

| Area | Examples |
| --- | --- |
| Resource integrity | Empty sources, loading and decoding failures, observable HTTP errors, corrupt image bodies, lazy content |
| Responsive images | `srcset`, `picture` candidates, source fallbacks, viewport-specific failures |
| Text alternatives | Missing or empty `alt`, accessible names, unnamed image controls, tooltip-only alternatives |
| Visual quality signals | Intrinsic vs. rendered dimensions, potentially insufficient resolution, large transfer headers |
| Embedded image surfaces | Inline SVG, CSS backgrounds and pseudo-elements, open shadow roots, accessible frames |
| Coverage | Selected pages, checked viewports, bounded interactions, timeouts, traversal failures and unverified content |

One image occurrence can carry multiple findings. Summary categories assign a primary outcome, while filters and exported evidence retain secondary issues.

## Reports

| Format | Purpose |
| --- | --- |
| **Interactive HTML** | Self-contained report with category, issue, page, viewport, and text filters; expandable evidence; filtered CSV download |
| **PDF** | Locally generated, print-ready report rendered with scripts disabled and external network access blocked |
| **CSV** | One row per observation with all issue codes; spreadsheet-formula prefixes are escaped |
| **JSON** | Complete structured audit result, responsive candidates, limits, page outcomes, and coverage gaps |

Full-audit exports contain target URLs and may contain DOM evidence and captured previews. Review reports before sharing them.

## Data and Privacy

- The ImageLens interface is served locally and listens only on the loopback address.
- Credentials are never requested by the ImageLens dashboard or written to report history.
- Signed-in browser contexts remain in server memory, expire after 30 minutes of inactivity, and close when the workflow is completed or dismissed.
- The latest ten completed audits are stored in the browser's local storage.
- Recent jobs are held in server memory; restarting the server clears unfinished jobs.
- Scanning a target website sends browser requests to that site. Use an authorized test environment and account.

## Coverage and Limitations

- Discovery is bounded to 200 pages and 3,000 queued candidates.
- Each page uses up to 24 scroll steps, 16 supported interaction attempts, and 18 retained states.
- Page navigation has a 20-second timeout; individual resource decoding has a 7-second timeout.
- “All pages” means all pages discovered within these limits, not every possible application state.
- Mobile checks use a browser viewport and are not physical-device or cross-browser validation.
- Closed shadow roots, canvas semantics, unsupported controls, and exhaustive carousel or application journeys are not guaranteed.
- Preview capture depends on browser canvas and cross-origin rules. A missing preview is not automatically an image failure.
- Automated checks cannot determine whether alternative text is appropriate for its context.

## Validation

The repository includes isolated Playwright fixtures and browser-based regression suites for scanner behavior, interface workflows, exports, recovery, themes, accessibility checks, and responsive layouts.

```bash
npm test
npm run test:scenarios
npm run test:design
```

The suites cover broken and corrupt resources, overlapping findings, responsive candidates, shadow DOM, lazy loading, supported interactions, basic authenticated-cookie persistence, cancellation, report exports and filters, active-scan refresh recovery, multi-tab history, storage exhaustion, temporary polling failures, expired sessions, keyboard interaction, themes, enlarged text, and responsive reflow.

Automated accessibility checks are development evidence; they do not certify the application or scanned websites as conformant.

## Project Structure

```text
ImageLens/
├── app.js                     # Client application and reporting UI
├── server.js                  # Loopback HTTP server and job/session API
├── index.html                 # Application entry point
├── styles.css                 # Application and responsive styling
├── lens-tokens.css            # Shared LENS semantic design tokens
├── theme.js                   # System/light/dark preference handling
├── src/
│   ├── authentication.js      # Browser-session authentication checks
│   └── scanner.js             # Discovery, browser traversal and image checks
├── tests/                     # Integration, design and scenario suites
├── brand/                     # Approved ImageLens SVG mark
├── assets/fonts/              # Self-hosted Geist font and license
└── docs/screenshots/          # Curated README screenshots
```

## Development

The application uses native HTML, CSS, and JavaScript with a Node.js server and Playwright browser engine. There is no frontend build step.

Useful commands:

```bash
npm start                 # Start ImageLens on port 4190
npm test                  # Scanner, UI, authentication and export regression suite
npm run test:scenarios    # Recovery and unexpected-user-scenario suite
npm run test:design       # Theme, responsive, keyboard and UI accessibility checks
```

Test artifacts are written to `test-output/` and excluded from version control.

## Contributing

Contributions and issue reports are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Security-sensitive reports should follow [SECURITY.md](SECURITY.md).

## License

Copyright © 2026 Manjunath N P. All rights reserved. See [LICENSE.md](LICENSE.md).

## Author

**Developed By Manjunath N P**

- Website: [manjunathnp.in](https://manjunathnp.in)
- LinkedIn: [linkedin.com/in/manjunathnp](https://www.linkedin.com/in/manjunathnp/)
- GitHub: [github.com/manjunathnp](https://github.com/manjunathnp)
