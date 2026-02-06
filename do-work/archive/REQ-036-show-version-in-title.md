---
id: REQ-036
title: Display version number next to app title
status: completed
created_at: 2026-02-05T19:26:00Z
claimed_at: 2026-02-05T23:45:00Z
completed_at: 2026-02-05T23:50:00Z
related: [REQ-033]
route: A
---

# Display Version Number Next to App Title

## What
No version number is shown next to the "Claude Code Manager" title (in red) at the top of the web app window. The version should be displayed there.

## Screenshot Description
- Header bar shows: "Claude Code Manager" in red on the left, then "Connected", "Running: 0", "Pending: 0", "Summary" button, "Configure" button, "Stop Server" button
- No version number appears anywhere near the title
- The title area has plenty of space to show a version indicator

## Assets
Screenshot: [do-work/assets/REQ-036-no-version-in-title.png](./assets/REQ-036-no-version-in-title.png)

---
*Source: "No version is shown next to the web app title at the top of the window (in red)."*

## Triage

**Route A** — Simple UI wiring. The HTML template (`version-badge` span), CSS styling, and `/api/version` endpoint already existed. Only needed to add the fetch call in `init()`.

## Implementation Summary

- `public/js/app.js` — Added `loadVersion()` method that fetches `/api/version` and sets `appVersion`; called in `init()` alongside other loaders

The header already had `<span class="version-badge" x-text="appVersion ? 'v' + appVersion : ''">` and the server already had `GET /api/version`. Just needed to connect them.

*Completed by work action (Route A)*

## Testing

**Tests run:** `npm test`
**Result:** All 82 tests passing (8 test files)

*Verified by work action*
