---
id: REQ-033
title: Sync version numbers between public and private repos
status: completed
created_at: 2026-02-05T19:18:00Z
claimed_at: 2026-02-05T23:20:00Z
completed_at: 2026-02-05T23:21:00Z
related: [REQ-028]
route: A
---

# Sync Version Numbers Between Public and Private Repos

## What
Ensure that both the public CCManager repo (REQ-028) and the private ClaudeCodeManager repo have corresponding version numbers. When changes are published to the public repo, the version numbers should match or clearly correspond so it's easy to track which private build maps to which public release.

## Context
The version is currently `0.1.0` in `package.json`. A versioning strategy is needed — whether semantic versioning, matching version numbers across repos, or a version bump workflow that keeps them in sync. This may also involve updating the Electron app's displayed version (About dialog) to match.

---
*Source: "make sure both public and private versions have corresponding version numbers"*

## Triage

**Route A** — Verification task. Both repos already at 0.1.0; no code changes needed.

## Implementation Summary

Verified both repos are already in sync:
- Private (`lpkralv/ClaudeCodeManager`): `0.1.0`
- Public (`lpkralv/CCManager`): `0.1.0`

No Electron About dialog exists, so no version display to update. The Electron app reads version from `package.json` automatically.

**Versioning strategy going forward:** Both repos use semver in `package.json`. When syncing changes to the public repo, bump the version in both repos together. The version number is the single source of truth for tracking which private build maps to which public release.

*Completed by work action (Route A)*
