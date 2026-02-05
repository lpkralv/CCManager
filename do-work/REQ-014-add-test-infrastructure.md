---
id: REQ-014
title: Add test infrastructure and comprehensive tests
status: pending
created_at: 2026-02-05T18:51:00Z
---

# Add Test Infrastructure and Comprehensive Tests

## What
Set up a working test infrastructure for the project and write thorough tests covering all existing functionality — API endpoints, services, utilities, and the web dashboard behavior.

## Context
The project's `package.json` references vitest (`"test": "vitest run"`) and the CLAUDE.md describes a vitest-based testing strategy, but no actual test files or vitest config appear to exist yet. This request covers both setting up the infrastructure (vitest config, any needed test utilities/helpers) and writing comprehensive tests for everything that currently exists: API routes, project discovery/management services, task dispatch, WebSocket connections, and static file serving.

---
*Source: "Apparently there is no test infrastructure for this project. Add one and thoroughly test everything."*
