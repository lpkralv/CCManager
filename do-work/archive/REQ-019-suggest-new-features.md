---
id: REQ-019
title: Suggest new features for multi-project management
status: completed
created_at: 2026-02-05T18:57:00Z
claimed_at: 2026-02-05T20:26:00Z
route: A
completed_at: 2026-02-05T20:28:00Z
---

# Suggest New Features for Multi-Project Management

## What
Analyze the use case for this app and suggest new features that would make it more useful. The core goal is to juggle multiple local Claude Code projects simultaneously, similar to the experience of Claude Code online where you can manage multiple conversations/projects at once.

## Context
The user wants CCManager to be a powerful local multi-project management tool. Think about what workflows a developer managing several Claude Code projects needs: switching context between projects, seeing activity across projects at a glance, orchestrating work across repos, comparing states, batch operations, etc. The suggestions should be practical and grounded in what the existing codebase can support or be extended to support.

---
*Source: "think about the use case for this app. Suggest new features to make it more useful. I want to be able to juggle multiple local projects simultaneously, much as with Claude Code online."*

---

## Triage

**Route: A** - Simple

**Reasoning:** Research/ideation task — no code changes, just analysis of the codebase and feature suggestions.

## Feature Suggestions

### Tier 1: High-Impact, Builds on Existing Infrastructure

**1. Multi-Project Batch Prompts**
Dispatch the same prompt to multiple projects at once. The UI already supports multi-select in the project list (`selectedProjects[]`). Extend the dispatch form to send to all selected projects in parallel. Use case: "Run tests across all projects" or "Update all READMEs with the new API key format."

**2. Project Auto-Discovery from PROJECTS_ROOT**
Automatically scan the configured `PROJECTS_ROOT` directory and register any new project folders found. Currently projects must be manually added via API. A background scan on startup (or triggered by the refresh button) would detect new folders, classify them by technology (check for `package.json`, `Cargo.toml`, `pyproject.toml`), and add them to the inventory.

**3. Cross-Project Search**
Add a search bar that greps across all project codebases. Useful for: finding where an API is consumed, locating shared patterns, tracking down a bug that spans repos. The backend would run `grep -r` across all project paths and aggregate results.

**4. Project Health Dashboard**
Extend the Summary modal with a health score per project: uncommitted changes, how far behind remote, failing CI, stale branches, dependency audit status. Color-code projects red/yellow/green for at-a-glance triage.

### Tier 2: Workflow Orchestration

**5. Project Groups / Tags**
Group projects by category (e.g., "Backend Services", "Frontend Apps", "Libraries"). Filter the project list by group. Dispatch batch prompts to a group. Useful when managing 10+ projects.

**6. Prompt Templates**
Save reusable prompts ("Run tests and report failures", "Summarize recent changes", "Check for security vulnerabilities"). Quick-dispatch from a template library instead of typing the same prompts repeatedly.

**7. Cross-Project Task Chains**
Define workflows that span projects: "Build library A, then update its dependency in project B, then run B's tests." Sequential or conditional task chains that pass context between projects.

**8. Activity Timeline**
A unified timeline view showing all activity across all projects: commits, task dispatches, completions, errors. Filter by project, time range, or status. This gives the "what happened while I was away" view.

### Tier 3: Developer Experience

**9. Inline Terminal / REPL per Project**
Embed a terminal panel in the dashboard that connects to a project's directory. Run quick commands without leaving CCManager. The Electron app could use `node-pty` for a real terminal experience.

**10. Project Diff Viewer**
Show a visual diff of uncommitted changes for any project, right in the dashboard. Use a lightweight diff viewer (Monaco editor or similar) to review changes before committing or dispatching tasks.

**11. Notification System**
Desktop notifications (via Electron) when tasks complete or fail. Especially useful when running long tasks across multiple projects — get notified when each finishes without watching the dashboard.

**12. Keyboard Shortcuts**
Global keyboard shortcuts for power users: Cmd+1-9 to select projects, Cmd+Enter to dispatch, Cmd+S for Summary, Cmd+K for quick search. Electron's `globalShortcut` API makes this straightforward.

### Tier 4: Advanced Features

**13. Project Dependency Graph**
Visualize which projects depend on each other (via package.json dependencies, imports, or manual configuration). Show the graph in the dashboard. Highlight when an upstream change might affect downstream projects.

**14. Git Operations Panel**
Pull, push, create branches, and switch branches for any project from the dashboard. Batch git operations: "pull all projects", "push all clean projects". The git-service already has the foundation.

**15. Scheduled Tasks / Cron**
Schedule recurring prompts: "Every morning at 9am, run tests on all projects and email me the results." Use node-cron for scheduling, persist schedules in settings.

**16. Project Templates**
When creating a new project, choose from templates (e.g., "Express API", "React App", "CLI Tool"). The existing `CCSTARTUP` mechanism could be extended to support multiple templates.

### Implementation Priority (Recommended Order)

1. **Project Auto-Discovery** (#2) — eliminates manual project setup friction
2. **Multi-Project Batch Prompts** (#1) — the core multi-project workflow
3. **Prompt Templates** (#6) — reduces repetitive typing
4. **Notification System** (#11) — essential for async multi-project work
5. **Project Groups** (#5) — scales to many projects
6. **Activity Timeline** (#8) — unified cross-project awareness
7. **Git Operations Panel** (#14) — reduces context-switching to terminal
8. **Keyboard Shortcuts** (#12) — power user productivity
