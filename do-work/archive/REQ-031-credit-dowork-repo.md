---
id: REQ-031
title: Credit do-work repo if dependency remains
status: completed
created_at: 2026-02-05T19:16:00Z
claimed_at: 2026-02-05T23:02:00Z
completed_at: 2026-02-05T23:02:00Z
related: [REQ-028, REQ-030]
route: A
---

# Credit do-work Repo If Dependency Remains

## What
If any dependency on the `/do-work` skill remains in the public CCManager repo after REQ-030, the project should give proper credit to the original do-work repo by bladnman at https://github.com/bladnman/do-work.

## Context
This should appear in the README and/or package.json acknowledgments of the public CCManager repo (REQ-028). Only needed if REQ-030 determines that some do-work functionality must be retained.

---
*Source: "if any /do-work dependency remains, the public repo should give credit to the /do-work repo from 'bladnman' at: https://github.com/bladnman/do-work"*

## Triage

**Route A** — Conditional request. REQ-030 completely removed all do-work dependencies from the codebase (deleted dowork-service.ts, removed from routes/UI/CSS/tests). No do-work functionality was retained, so this credit requirement does not apply.

## Implementation Summary

No changes needed. REQ-030 performed a complete removal of all do-work skill dependencies — the condition "if any dependency remains" is not met. The public CCManager repo has zero references to do-work.

*Completed by work action (Route A)*
