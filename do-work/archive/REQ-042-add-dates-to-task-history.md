---
id: REQ-042
title: Add dates to task history timestamps
status: completed
created_at: 2025-02-19T19:48:00Z
claimed_at: 2026-02-19T20:22:00Z
route: A
completed_at: 2026-02-19T20:25:00Z
---

# Add Dates to Task History Timestamps

## What
Add date information to task history items. Currently they only show timestamps, but need to include dates as well.

## Context
Task history entries currently display time-only information. Users need to see the full date along with the time to understand when tasks were executed, especially for tasks from previous days.

## Assets
None

---
*Source: "Items in the task history do not have datestamps along with their timestamps. They need dates."*

---

## Triage

**Route: A** - Simple

**Reasoning:** UI display change - add date to existing timestamp formatting in the frontend.

## Implementation Summary

- Updated `formatTime()` in `public/js/app.js` to include date: now shows "Feb 19, 8:03:18 PM" instead of just "8:03:18 PM"
- Uses `toLocaleDateString(undefined, { month: 'short', day: 'numeric' })` for locale-aware date formatting
- Affects both active tasks and task history timestamps

*Completed by work action (Route A)*

## Testing

**Tests run:** `npm test` (vitest)
**Result:** All 166 tests passing

**Note:** No frontend unit tests exist for `formatTime()`. Backend tests unaffected.

*Verified by work action*
