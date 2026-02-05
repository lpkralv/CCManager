---
id: REQ-010
title: Rename MacOS app from Electron to CCManager
status: completed
created_at: 2026-02-05T18:46:00Z
claimed_at: 2026-02-05T18:53:00Z
route: A
completed_at: 2026-02-05T18:56:00Z
---

# Rename MacOS App to CCManager

## What
The MacOS native app currently shows as "Electron" in the dock, menu bar, and About dialog. Change the app name to "CCManager" everywhere it appears.

## Context
The app name is likely set in the electron-builder config in `package.json` (under the `"build"` key) and possibly in `src/electron/main.ts` menu template. The `productName` field in electron-builder config and the first menu label ("Claude Code Manager") may both need updating.

---
*Source: "the name of the MacOS app appears to be 'Electron'. Can you change it to CCManager?"*

---

## Triage

**Route: A** - Simple

**Reasoning:** Config/name change with specific files identified — `package.json` productName and `src/electron/main.ts` menu label.

## Implementation Summary

- `package.json`: `build.productName` changed from `"ClaudeCodeManager"` to `"CCManager"`
- `src/electron/main.ts`: Menu template first item label changed from `"Claude Code Manager"` to `"CCManager"`
- `src/electron/main.ts`: Window title changed from `"Claude Code Manager"` to `"CCManager"`
- Rebuilt TypeScript (`npm run build`) — no errors
- Rebuilt macOS app (`npm run build:mac`) — output at `dist-electron/mac-arm64/CCManager.app`
- Verified Info.plist: `CFBundleName` and `CFBundleDisplayName` both set to `"CCManager"`

*Completed by work action (Route A)*

## Testing

**Tests run:** N/A
**Result:** Config/name change — verified via built app Info.plist inspection

*Verified by work action*
