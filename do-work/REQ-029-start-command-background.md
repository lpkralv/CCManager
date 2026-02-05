---
id: REQ-029
title: Start script should run server in background
status: pending
created_at: 2026-02-05T19:12:00Z
related: [REQ-027]
---

# Start Script Should Run Server in Background

## What
Modify `start_CCManager.command` to start the server in the background so the Terminal window can be closed without killing the server. The script should launch the server, verify it's up via the health endpoint, report success, and then exit cleanly.

## Context
Currently the script runs `node dist/server/index.js` in the foreground (line 56), requiring the Terminal window to stay open. The server should be backgrounded (e.g., with `nohup` or `&`), with stdout/stderr redirected to a log file. The companion `stop_CCManager.command` already exists to shut it down when needed.

---
*Source: "When I run the start_CCManager.command it opens a terminal window and displays a 'dashboard'. Does this window need to remain open?"*
