---
id: REQ-015
title: Add Configure button in header bar next to Stop Server
status: completed
created_at: 2026-02-05T18:52:00Z
related: [REQ-013]
claimed_at: 2026-02-05T20:00:00Z
route: A
completed_at: 2026-02-05T20:02:00Z
---

# Configure Button in Header Bar

## What
Add a "Configure" button in the top header area of the window, alongside the existing "Stop Server" button. The configuration UI should not be part of the main dashboard content area.

## Context
REQ-013 adds a configurable projects root directory. This request specifies where the configuration entry point should live in the UI — as a header-level button on par with "Stop Server", not embedded in the dashboard panels. The header bar currently contains the connection status, running/pending counts, and the Stop Server button.

---
*Source: "the configuration button should not be part of the dashboard, but a simple 'configure' button in the top part of the window, on par with the 'Stop Server' button"*

---

## Triage

**Route: A** - Simple

**Reasoning:** REQ-013 already added a Settings button and modal. This is a UI placement adjustment — verify the button is in the header bar next to Stop Server, and rename to "Configure" if needed.

## Implementation Summary

- Renamed header button label from "Settings" to "Configure" in `public/index.html`
- Updated title attribute to match
- Button was already correctly placed in `.status-bar` next to Stop Server (from REQ-013)
- No other changes needed

*Completed by work action (Route A)*

## Testing

**Tests run:** N/A
**Result:** Label rename only, no logic change

*Verified by work action*
