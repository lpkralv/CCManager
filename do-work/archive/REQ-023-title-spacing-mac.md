---
id: REQ-023
title: Fix app title overlapping window controls on Mac
status: completed
created_at: 2026-02-05T19:01:00Z
claimed_at: 2026-02-05T21:50:00Z
route: A
completed_at: 2026-02-05T21:50:00Z
---

# Fix App Title Spacing on Mac

## What
The app title "Claude Code Manager" is too close to the three traffic light buttons (close/minimize/fullscreen) in the upper left corner of the Mac app window. Add more left padding/margin to give it proper spacing.

## Context
The Electron app uses `titleBarStyle: "hiddenInset"` which overlays the traffic light buttons on the content area. The header/title text needs enough left margin to clear those buttons comfortably.

---
*Source: "the app title 'Claude Code Manager' is too close to the three buttons in the upper left of the window in the Mac app"*

---

## Triage

**Route: A** - Simple

**Reasoning:** CSS spacing fix — increase header left padding to clear macOS traffic light buttons.

## Implementation Summary

- Increased header left padding from `2rem` to `5rem` (80px) in `public/css/styles.css` to clear macOS traffic light buttons
- Added `-webkit-app-region: drag` to header for window dragging, with `no-drag` on buttons and status bar
- All 89 tests passing

*Completed by work action (Route A)*

## Testing

**Tests run:** `npx vitest run`
**Result:** 9 files, 89 tests, all passing

*Verified by work action*
