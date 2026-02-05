---
id: REQ-023
title: Fix app title overlapping window controls on Mac
status: pending
created_at: 2026-02-05T19:01:00Z
---

# Fix App Title Spacing on Mac

## What
The app title "Claude Code Manager" is too close to the three traffic light buttons (close/minimize/fullscreen) in the upper left corner of the Mac app window. Add more left padding/margin to give it proper spacing.

## Context
The Electron app uses `titleBarStyle: "hiddenInset"` which overlays the traffic light buttons on the content area. The header/title text needs enough left margin to clear those buttons comfortably.

---
*Source: "the app title 'Claude Code Manager' is too close to the three buttons in the upper left of the window in the Mac app"*
