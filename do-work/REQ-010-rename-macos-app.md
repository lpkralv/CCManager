---
id: REQ-010
title: Rename MacOS app from Electron to CCManager
status: pending
created_at: 2026-02-05T18:46:00Z
---

# Rename MacOS App to CCManager

## What
The MacOS native app currently shows as "Electron" in the dock, menu bar, and About dialog. Change the app name to "CCManager" everywhere it appears.

## Context
The app name is likely set in the electron-builder config in `package.json` (under the `"build"` key) and possibly in `src/electron/main.ts` menu template. The `productName` field in electron-builder config and the first menu label ("Claude Code Manager") may both need updating.

---
*Source: "the name of the MacOS app appears to be 'Electron'. Can you change it to CCManager?"*
