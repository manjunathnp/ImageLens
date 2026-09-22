# ImageLens: unexpected-user-scenario validation

Validated 2026-09-13 using the requested `unexpected-user-scenarios` skill.

## Evidence and scope

Reviewed the running application, `app.js`, `server.js`, scanner/authentication code, and the existing integration suite. Tests run in real Chromium against isolated local fixture servers; no production accounts or data were modified. The original integration suite covered a normal current-page scan, scanner checkpoints, authentication, exports, filtering, cancellation at the API, accessibility and mobile reflow. It did not exercise refresh recovery, multiple stale tabs saving history, or a storage write failing at completion: those were confirmed coverage gaps before reproduction.

Journey: enter a target, optionally authenticate, choose scope, start a browser job, inspect the result, retain history, and export. The invariants are that the chosen scope remains clear, a completed job stays retrievable, cancellation cannot later publish a result, existing history is preserved, and unsaved/partial outcomes are not presented as durable success.

## Highest-value findings

### 1. Refresh while the scan is running

- **Status:** Observed failure, fixed and verified. **Priority:** P1.
- **Intent / starting state:** A user has submitted a current-page audit and is waiting for Chromium to finish.
- **Unexpected action:** Refresh the browser tab to check whether progress is stuck.
- **Steps / data:** Scan fixture `/second`; refresh immediately after the job-start response; allow the server job to finish.
- **Expected invariant:** The existing job can be reattached and its completed report retained, without a duplicate scan.
- **Before:** The progress view disappeared, the server completed, and saved history remained at zero reports.
- **Fix / result:** Persist the active request in tab session storage, give jobs stable request identities, and reconnect on reload. Reproduction now restores progress and saves one report.
- **Coverage boundary:** Original tests waited on one uninterrupted page instance.
- **Regression:** Browser lifecycle integration in `tests/scenario-audit.mjs`. Server request identity also prevents duplicate jobs when a start confirmation is retried.

### 2. Two tabs finish separate audits

- **Status:** Observed failure, fixed and verified. **Priority:** P1.
- **Intent / starting state:** Two tabs share one browser profile and start with the same history snapshot.
- **Unexpected action:** Finish a scan in tab A, then finish another scan in previously opened tab B.
- **Steps / data:** Open both tabs before running `/second` from each.
- **Expected invariant:** Both distinct reports remain in shared history.
- **Before:** Tab B saved its stale in-memory history; only one report remained.
- **Fix / result:** Merge against the latest stored history under a browser Web Lock, deduplicate by report ID, and listen for storage changes. Both reports now remain.
- **Coverage boundary:** Original browser tests used a single page for history.
- **Regression:** Shared-context, multi-tab integration. Web Locks are available in the tested Chromium runtime; browsers without Web Locks use a merge fallback and strict simultaneous-write guarantees remain unverified.

### 3. Storage fills exactly when an audit completes

- **Status:** Observed failure, fixed and verified. **Priority:** P1.
- **Intent / starting state:** A user completes an audit with browser storage at quota.
- **Unexpected action:** The report-storage write throws `QuotaExceededError`.
- **Steps / data:** Fail only the `imagelens-audits-v1` storage write; complete a `/second` audit.
- **Expected invariant:** Keep the report usable and explicitly state that it has not been saved.
- **Before:** A transient quota warning was replaced by the normal completion toast. No persistent warning remained.
- **Fix / result:** A persistent “Report not saved” notice and export instruction now accompany the in-memory report. The completion message also identifies it as unsaved.
- **Coverage boundary:** Original tests assumed writable browser storage.
- **Regression:** Browser fault injection scoped to the audit-history key.

### 4. A brief interruption in progress polling

- **Status:** Passed after recovery implementation. **Priority:** P2.
- **Intent / starting state:** A scan is running while the dashboard remains open.
- **Unexpected action:** Two consecutive progress requests fail.
- **Steps / data:** Abort the first two GET requests to the job endpoint; then allow requests through.
- **Expected invariant:** Recover the same job and display its result.
- **Observed:** The dashboard reconnects and displays the two desktop/mobile observations from `/second`.
- **Coverage boundary:** Original tests assumed successful polling responses.
- **Regression:** Browser network interception. Longer outages offer explicit reconnection; server-restart persistence is outside the current in-memory job design.

### 5. Cancel before the start confirmation arrives

- **Status:** Passed. **Priority:** P1.
- **Intent / starting state:** The user submits a scan but immediately changes their mind.
- **Unexpected action:** Cancel while the POST response is delayed by 800 ms.
- **Steps / data:** Let the server receive the start request, delay its response, and dismiss the scan before the response returns.
- **Expected invariant:** A late response cannot reopen progress or publish an unwanted report.
- **Observed:** The server job reaches `cancelled`; no progress dialog remains open.
- **Coverage boundary:** Prior API cancellation coverage began only after a job ID had been delivered.
- **Regression:** End-to-end delayed-response test.

### 6. Authentication expires after page selection

- **Status:** Passed with explicit reconnect recovery. **Priority:** P1.
- **Intent / starting state:** A user connects a signed-in fixture browser and selects a current-page scope.
- **Unexpected action:** The browser session disappears before scan submission.
- **Steps / data:** Close the prepared `/account` session through the session API, then submit the audit.
- **Expected invariant:** Explain the failure, retain the target, and allow a new sign-in; never audit logged-out content as protected content.
- **Observed:** The flow returns to reconnectable sign-in setup with the `/account` URL preserved.
- **Coverage boundary:** Original tests checked login rejection and cookie persistence, not expiry between steps.
- **Regression:** Authenticated-browser lifecycle integration.

## Additional completed validation

`tests/integration.mjs` verifies broken resources that also lack alt text, corrupt HTTP-200 image bodies, tooltip-only alternatives, unnamed image links, responsive candidates, mobile sources, shadow DOM, gallery reveals, lazy images, backgrounds and SVGs. It validates real private-page cookie persistence, all export formats, overlapping HTML filters, mobile overflow, and automated accessibility checks on the dashboard and standalone report.

Raw before/after scenario evidence is generated in `test-output/scenario-audit-before.json` and `test-output/scenario-audit.json`. This directory is intentionally excluded from version control because future runs may contain audit data.

## Remaining candidate gaps / not run

- Real third-party identity providers, MFA and enterprise SSO redirects: only local fixture authentication was exercised. Validate against the intended application before relying on that integration.
- Browser/server termination together and long offline intervals: completed reports persist in browser history, but unfinished jobs are server-memory objects and cannot survive a server restart. The app reports an expired job rather than reconstructing the previous browser session.
- Exhaustive custom carousels, closed shadow roots and application-specific interaction journeys remain explicitly outside guaranteed discovery. Coverage reports identify observed limits; they cannot enumerate unknown hidden content.

## Reproduce

Run `npm test` for scanner/UI/export checks and `npm run test:scenarios` for the six journey scenarios. Test servers are isolated from the live app at port 4190.
