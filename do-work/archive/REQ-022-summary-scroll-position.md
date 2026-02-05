---
id: REQ-022
title: Fix summary dialog losing scroll position on refresh
status: completed
created_at: 2026-02-05T19:00:00Z
claimed_at: 2026-02-05T21:48:00Z
route: A
completed_at: 2026-02-05T21:48:00Z
related: [REQ-016]
---

# Fix Summary Dialog Scroll Position on Refresh

## What
The summary dialog auto-refreshes every few seconds, but each refresh resets the scroll position to the top. This makes it impossible to read projects further down the list. The dialog should preserve the current scroll position when it updates with new data.

## Context
When the summary popup refreshes its data, the DOM re-render causes the scroll to jump back to the top. The fix should save the scroll position before updating the content and restore it after, or use a more targeted DOM update strategy that doesn't reset scroll state.

---
*Source: "the summary dialog works, and updates after a few seconds. But when it updates it always scrolls back to the top. When I have lots of projects, and it takes me time to read about all of them I can't read to the bottom before it scrolls back to the top. Annoying. Please fix."*

---

## Triage

**Route: A** - Simple

**Reasoning:** Bug fix with clear behavior — save/restore scroll position during data refresh in summary dialog.

## Implementation Summary

- In `loadProjectsSummary()` in `public/js/app.js`: captures `scrollTop`/`scrollLeft` of `.summary-table-wrapper` before data update, restores via `$nextTick` after
- Only shows loading indicator on initial load (when `projectsSummary` is empty), avoids visual flash on subsequent refreshes
- All 89 tests passing

*Completed by work action (Route A)*

## Testing

**Tests run:** `npx vitest run`
**Result:** 9 files, 89 tests, all passing

*Verified by work action*
