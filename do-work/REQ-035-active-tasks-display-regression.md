---
id: REQ-035
title: Active Tasks pane display regression - tasks not visible
status: pending
created_at: 2026-02-05T19:24:00Z
related: [REQ-008, REQ-006, REQ-004]
---

# Active Tasks Pane Display Regression

## What
The Active Tasks pane still has display issues when multiple tasks are dispatched:

1. Only one task appears in the pane, even though vertical space is allocated for all of them (suggesting the data is there but rendering fails).
2. Once the first visible task completes, the pane goes blank even though other dispatched tasks are still running.

## Context
This was previously reported and fixed in REQ-008, which addressed a merge-vs-overwrite issue in the WebSocket `initial` message handler in `public/js/app.js`. The symptoms are similar but the bug persists or has regressed. The fix from REQ-008 may not have fully addressed all code paths, or there may be an additional rendering issue (e.g., Alpine.js reactivity not triggering, template iteration bug, or task removal logic clearing the array when one task completes).

---
*Source: "This has been reported previously. When multiple tasks are dispatched, only one appears in the ACTIVE TASKS pane (though it appears vertical space is allocated for all). Once the first task completes, the pane remains blank, even though other dispatched tasks are running."*
