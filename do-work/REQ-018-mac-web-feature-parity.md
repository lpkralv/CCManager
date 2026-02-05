---
id: REQ-018
title: Ensure Mac and Web app feature parity
status: pending
created_at: 2026-02-05T18:56:00Z
---

# Mac and Web App Feature Parity

## What
Ensure that the Mac (Electron) app and the web app have identical functionality. All features available in one should work the same way in the other.

## Context
Both apps share the same frontend (served from the Express server), so they should already be largely in sync. However, differences could arise from port configuration (web on 3000, Electron on 3001), Electron-specific behaviors, or features that were only tested in one context. This request is to verify and fix any discrepancies so both apps behave identically.

---
*Source: "make sure that the functionality of the Mac and Web apps are in sync"*
