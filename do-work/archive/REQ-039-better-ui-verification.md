---
id: REQ-039
title: Implement reliable UI verification for localhost
status: done
claimed_at: 2026-02-06T00:35:00Z
route: B
created_at: 2026-02-05T19:32:00Z
related: [REQ-037, REQ-036]
---

# Implement Reliable UI Verification for Localhost

## What
Find and implement a reliable way to verify that UI changes are actually rendering correctly on localhost. The current approach (curl) is insufficient — it missed that version numbers weren't appearing in two consecutive attempts. We need something that can actually inspect the rendered page, not just the raw HTML.

## Context
The problem: curl fetches raw HTML, but many UI elements are rendered dynamically via Alpine.js. A version number might be in the JavaScript but never make it to the DOM due to a bug in the reactive binding, a missing API call, or a timing issue. curl can't catch that.

Options to investigate:
- **Firecrawl MCP** — may work with localhost, renders JavaScript
- **Puppeteer/Playwright script** — headless browser that can inspect the rendered DOM, take screenshots, and assert on visible text
- **A simple test endpoint** — e.g., `/api/version` that the work loop can curl to verify the data is at least available
- **Playwright-based integration tests** — as part of the test suite (REQ-038), add tests that actually open the page and check for rendered elements

The goal is: after making a UI change, the work loop should be able to programmatically confirm the change is visible to the user, not just present in source code.

---
*Source: "whatever you're doing with curl is insufficient, because clearly you missed that the version numbers were not appearing in two previous attempts to do so. I'm not being judgemental, just pointing out the need for something different to test these things."*

## Triage

**Route: B** — Requires installing a browser testing framework and writing E2E tests.

### Decision: Playwright

Chose Playwright over the other options because:
- **Firecrawl MCP** — Uncertain localhost support, external dependency
- **Puppeteer** — Less integrated test runner, no built-in assertions
- **Simple API endpoint** — Already exists (/api/health), but doesn't verify DOM rendering
- **Playwright** — Industry standard, built-in test runner, headless Chromium, assertions on DOM elements, integrates with existing test infrastructure

### Implementation

1. **Installed `@playwright/test`** as dev dependency + Chromium headless browser
2. **Created `playwright.config.ts`** — Configured for `http://localhost:3000`, auto-starts server via `npm start`, uses Chromium
3. **Created `e2e/dashboard.spec.ts`** — 11 E2E tests that open the real page in a headless browser and verify:
   - Page title loads correctly
   - Header renders with app title
   - **Version badge renders from API** (the exact scenario that curl missed — waits for Alpine.js to hydrate and fetch version from /api/health, asserts `v0.1.0` pattern)
   - WebSocket connection status shows "Connected" (green dot)
   - Running/Pending counters render
   - Projects, Active Tasks, Task History sections visible
   - Empty state messages display correctly
   - Navigation buttons in header are present
   - Health API returns valid JSON with version
4. **Added `npm run test:e2e`** script to package.json

### Usage

```bash
# Run E2E tests (starts server automatically if not running)
npm run test:e2e

# Run unit tests (unchanged)
npm test

# Both together
npm test && npm run test:e2e
```

### Result

- 11 E2E tests passing in headless Chromium
- Key verification: version badge dynamically rendered by Alpine.js is confirmed visible (the exact failure that prompted this request)
- Work loop can now run `npm run test:e2e` after any UI change to verify rendering
