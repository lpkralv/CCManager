---
id: REQ-013
title: Configurable projects root directory for portability
status: pending
created_at: 2026-02-05T18:50:00Z
---

# Configurable Projects Root Directory

## What
Add a configuration capability so the user can specify where the folder containing Claude Code project folders lives. This is needed to make the Mac app portable across different Macs and different users on the same Mac.

## Context
Currently `PROJECTS_ROOT` is set via `.env` file, which is tied to the development environment. For a distributed Mac app, there needs to be a user-facing way to configure this path — either through a settings UI within the app, a first-run setup prompt, or a preferences dialog. The path will differ per machine/user (e.g. `/Volumes/Sheridan/sandbox/` vs `/Users/someone/projects/`).

---
*Source: "I want to be able to move the Mac app to other Macs and other users on this Mac. I believe I will need to have some sort of configuration capability to identify where the folder containing Claude Code project folders lives."*
