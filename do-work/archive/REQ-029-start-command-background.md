---
id: REQ-029
title: Start script should run server in background
status: completed
created_at: 2026-02-05T19:12:00Z
claimed_at: 2026-02-05T22:32:00Z
route: A
completed_at: 2026-02-05T22:33:00Z
related: [REQ-027]
---

# Start Script Should Run Server in Background

## What
Modify `start_CCManager.command` to start the server in the background so the Terminal window can be closed without killing the server. The script should launch the server, verify it's up via the health endpoint, report success, and then exit cleanly.

## Context
Currently the script runs `node dist/server/index.js` in the foreground (line 56), requiring the Terminal window to stay open. The server should be backgrounded (e.g., with `nohup` or `&`), with stdout/stderr redirected to a log file. The companion `stop_CCManager.command` already exists to shut it down when needed.

---
*Source: "When I run the start_CCManager.command it opens a terminal window and displays a 'dashboard'. Does this window need to remain open?"*

## Triage

**Route A** — Small, well-scoped change to an existing script. Replace the foreground `node` invocation with `nohup ... &`, add health-check polling, and exit cleanly.

## Implementation Summary

Modified `start_CCManager.command`:
- Server launched with `nohup "$NODE" "$SERVER" >> "$LOG_FILE" 2>&1 &`
- Polls `http://localhost:3000/api/health` up to 10 times (1s interval)
- On success: prints PID, URL, log path, and stop instructions, then exits
- On failure: warns user and points to log file
- Logs written to `logs/ccmanager.log` (directory auto-created)
