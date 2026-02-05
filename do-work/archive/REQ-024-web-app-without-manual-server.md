---
id: REQ-024
title: Launch web app from browser without pre-starting server
status: completed
created_at: 2026-02-05T19:02:00Z
claimed_at: 2026-02-05T21:55:00Z
route: A
completed_at: 2026-02-05T21:56:00Z
---

# Launch Web App Without Manual Server Start

## What
Explore options for launching the web app from a single URL in the browser without needing to manually start the server beforehand. Present the available approaches and their trade-offs.

## Context
Currently the user must run `npm run dev` or `npm start` from the terminal before opening `http://localhost:3000` in the browser. The user wants a more seamless experience — ideally just clicking a URL or bookmark. Options might include: a launchd/systemd service, a login item, a macOS `.command` script, a custom URL scheme handler, a lightweight launcher app, or a self-starting approach where visiting the URL triggers the server.

---
*Source: "I want to be able to launch the web app from a single URL in the browser without starting the server in advance. What are my options?"*

---

## Triage

**Route: A** - Simple

**Reasoning:** Research/analysis request — present options and trade-offs, no code implementation needed.

## Implementation Summary

### Options Analysis

#### Option 1: macOS `.command` Script (Easiest)

Create a `CCManager.command` file that starts the server and opens the browser:

```bash
#!/bin/bash
cd /Volumes/Sheridan/sandbox/ClaudeCodeManager
npm start &
sleep 2
open http://localhost:3000
```

**Pros:** Dead simple, double-clickable from Finder, no installation needed.
**Cons:** Opens a Terminal window (can be minimized). Server stays running until you close it. Must hardcode the project path.

#### Option 2: macOS `launchd` Service (Always Running)

Create a `~/Library/LaunchAgents/com.lpkralv.ccmanager.plist` that starts the server at login.

**Pros:** Server is always available — just bookmark `http://localhost:3000`. Survives reboots. No terminal window.
**Cons:** Server runs even when not needed (minimal resource cost). Requires a one-time `launchctl load` setup. Logs go to a file instead of terminal.

#### Option 3: Use the Electron App Instead

You already have `CCManager.app` — double-click it and you get the full dashboard with no terminal, no manual server start. It's effectively "one click to launch the web app."

**Pros:** Already built and working. Native Mac experience with dock icon. Self-contained — server starts/stops with the app.
**Cons:** Runs in an Electron window rather than your preferred browser. Slightly heavier than a browser tab.

#### Option 4: Shell Alias / Function

Add to `~/.zshrc`:
```bash
ccm() { cd /Volumes/Sheridan/sandbox/ClaudeCodeManager && npm start & sleep 2 && open http://localhost:3000; }
```

**Pros:** Quick if you're already in a terminal.
**Cons:** Requires terminal. Not a "click a URL" solution.

#### Option 5: Custom URL Scheme Handler (Over-engineered)

Register a `ccmanager://` URL scheme via a small helper app. Clicking the URL starts the server then redirects to `http://localhost:3000`.

**Pros:** True "click a link" experience.
**Cons:** Significant effort to build. Overkill for a single-user dev tool.

### Recommendation

**For your use case, Option 2 (launchd) or Option 3 (Electron app) are the best fits:**

- If you prefer using the browser: go with **launchd**. One-time setup, then `http://localhost:3000` always works. Just bookmark it.
- If you don't mind the Electron window: you already have **CCManager.app**. Just put it in your Dock.

If you'd like me to implement the launchd service (Option 2), create a follow-up request.

*Completed by work action (Route A)*

## Testing

**Tests run:** N/A
**Result:** Research deliverable, no code changes

*Verified by work action*
