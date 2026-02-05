---
id: REQ-027
title: Create start/stop .command files for server
status: completed
created_at: 2026-02-05T19:08:00Z
claimed_at: 2026-02-05T22:15:00Z
route: A
completed_at: 2026-02-05T22:18:00Z
related: [REQ-026]
---

# Start/Stop .command Files for Server

## What
Create two double-clickable macOS `.command` files for easy server management:

1. **start_CCManager.command** — Starts the server. Must be smart enough to detect and kill any already-running server instance before launching a new one.
2. **stop_CCManager.command** — Stops the server. Must exit gracefully with a friendly message if no server is currently running.

## Context
REQ-026 implemented a launchd service, but the user also wants simple clickable scripts as an alternative. The scripts should check for an existing server process (e.g., by checking the health endpoint at `http://localhost:3000/api/health` or finding the process on port 3000) before acting. The project root is `/Volumes/Sheridan/sandbox/ClaudeCodeManager` and the server runs via `node dist/server/index.js` or `npm start`.

---
*Source: "Per the results from REQ-026, I want an easy way to start and stop the server without remembering terminal commands. Create .command files for each. NOTE: the start_CCManager.command should be smart enough to close any server that is already running before launching another. Similarly, the stop_CCManager.command should be smart enough to end gracefully if no server is running."*

---

## Triage

**Route: A** - Simple

**Reasoning:** Two shell scripts with clear specs — no codebase exploration needed.

## Implementation Summary

- Created `start_CCManager.command` — detects/kills existing server on port 3000 via `lsof`, validates node/server paths, starts server in foreground
- Created `stop_CCManager.command` — finds server process on port 3000, graceful kill with force-kill fallback, friendly message if not running
- Both files are executable and double-clickable from Finder
- All 89 tests passing

*Completed by work action (Route A)*

## Testing

**Tests run:** `npx vitest run`
**Result:** 9 files, 89 tests, all passing

*Verified by work action*
