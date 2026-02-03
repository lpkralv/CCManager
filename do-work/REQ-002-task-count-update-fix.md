---
id: REQ-002
title: Fix task counts not updating after completion
status: pending
created_at: 2026-02-03T12:05:00Z
---

# Fix Task Counts Not Updating After Completion

## What
After sending a prompt to a project, the running and pending counts update correctly during execution. However, when the task completes, the counts fail to update - it continues showing "pending: 0, running: 1" instead of resetting to reflect the completed state.

## Context
- Running/pending counts update appropriately when task starts
- After task completion, counts are stale (still shows running: 1)
- Likely a WebSocket event or state update issue

## Requirements
1. Investigate the task completion flow and count update mechanism
2. Plan the fix to ensure counts update properly on task completion
3. Verify the plan addresses the issue
4. Implement the fix

---
*Source: Previously, after sending a prompt to a project, the running and pending counts updated appropriately. But after the task completed, it still showed pending: 0, running: 1. Investigate this. Plan the fix. Verify the plan. Then execute the verified plan.*
