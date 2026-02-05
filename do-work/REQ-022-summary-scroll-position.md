---
id: REQ-022
title: Fix summary dialog losing scroll position on refresh
status: pending
created_at: 2026-02-05T19:00:00Z
related: [REQ-016]
---

# Fix Summary Dialog Scroll Position on Refresh

## What
The summary dialog auto-refreshes every few seconds, but each refresh resets the scroll position to the top. This makes it impossible to read projects further down the list. The dialog should preserve the current scroll position when it updates with new data.

## Context
When the summary popup refreshes its data, the DOM re-render causes the scroll to jump back to the top. The fix should save the scroll position before updating the content and restore it after, or use a more targeted DOM update strategy that doesn't reset scroll state.

---
*Source: "the summary dialog works, and updates after a few seconds. But when it updates it always scrolls back to the top. When I have lots of projects, and it takes me time to read about all of them I can't read to the bottom before it scrolls back to the top. Annoying. Please fix."*
