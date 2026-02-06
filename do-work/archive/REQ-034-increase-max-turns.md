---
id: REQ-034
title: Increase max turns and auto-retry on limit
status: completed
created_at: 2026-02-05T19:22:00Z
claimed_at: 2026-02-05T23:22:00Z
completed_at: 2026-02-05T23:30:00Z
route: B
---

# Increase Max Turns and Auto-Retry on Limit

## What
Two changes to the task dispatch system:

1. **Increase default max turns**: The spawned Claude Code processes currently hit a max turns limit of 10. Increase the default `--max-turns` to 25 or higher.
2. **Auto-retry on max turns exceeded**: When a task fails because max turns were exceeded, the system should automatically re-dispatch with a higher turn count rather than just reporting failure.

## Context
The `process-spawner.ts` currently calculates max turns from `maxBudget` as `Math.ceil(maxBudget * 10)`. With the default budget of ~1.0, that gives only 10 turns which is insufficient for many tasks. The retry logic should detect the "max turns exceeded" error in the output and re-spawn with a higher limit (e.g., double it, or use a fixed higher value).

---
*Source: "I'm hitting a limit on max turns (10). I believe you need to make your background calls with --max_turns 25 (or higher). And when your response gives an error that max turns have been exceeded, it should automatically re-try with a higher turn count."*

## Triage

**Route B** — Clear requirements, need to explore process-spawner and task-manager to understand existing patterns.

## Implementation Summary

- `src/services/process-spawner.ts` — Changed max turns formula to `Math.max(25, Math.ceil(maxBudget * 10))`, enforcing a floor of 25 turns
- `src/models/task.ts` — Added optional `retryCount` field to Task schema
- `src/services/task-manager.ts` — Added auto-retry logic: detects `/max.?turns/i` in error/output, doubles maxBudget (up to 2 retries), requeues the task with `task:retrying` event

Retry progression (default budget 1.0): 25 turns → 25 turns (budget 2.0) → 40 turns (budget 4.0)

*Completed by work action (Route B)*

## Testing

**Tests run:** `npm test`
**Result:** All 82 tests passing (8 test files)

*Verified by work action*
