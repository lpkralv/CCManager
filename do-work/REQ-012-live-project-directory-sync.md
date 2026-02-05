---
id: REQ-012
title: Live sync of project directory changes to Projects pane
status: pending
created_at: 2026-02-05T18:49:00Z
---

# Live Project Directory Sync

## What
Confirm that live changes to the directory containing the Claude Code projects (adding, removing, or renaming project folders) are reflected in the Projects pane list without requiring a manual refresh or server restart.

## Context
The projects are discovered from a root directory (configured via `PROJECTS_ROOT`). If a user adds or removes a project folder on disk, the Projects pane should pick up the change automatically or on next load. This may require filesystem watching or periodic polling on the server side, or simply re-fetching the project list on the client side.

---
*Source: "confirm that live changes to the directory containing the claude code projects are reflected in the PROJECTS pane list"*
