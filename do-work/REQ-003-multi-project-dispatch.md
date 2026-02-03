---
id: REQ-003
title: Multi-project selection and dispatch
status: pending
created_at: 2026-02-03T12:10:00Z
---

# Multi-Project Selection and Dispatch

## What
Add the ability to select multiple projects in the PROJECTS pane and dispatch the same task to all selected projects simultaneously.

## Detailed Requirements

### Selection Behavior
- Support SHIFT modifier key for range selection (select all projects between last selected and clicked)
- Support COMMAND (Mac) / CTRL (Windows/Linux) modifier key for toggle selection (add/remove individual projects from selection)
- Visual indication of selected projects (highlight, checkbox, or similar)
- Clicking without modifier clears previous selection and selects only the clicked project (current behavior)

### DISPATCH TASK Pane Updates
- When multiple projects are selected, display all project names in the "Project" field
- Consider how to display multiple projects (comma-separated list, count indicator, expandable list, etc.)
- Prompt textarea remains the same - single prompt for all selected projects

### Dispatch Behavior
- When DISPATCH TASK is pressed with multiple projects selected, send the prompt to ALL selected projects simultaneously
- Each project gets its own independent task execution
- Task status should be tracked independently for each dispatched task

## Context
- This enables batch operations across the project portfolio
- Useful for running the same maintenance task, update, or query across multiple projects
- Complex feature requiring planning due to UI state management and parallel dispatch logic

## Requirements
1. Plan the implementation (UI changes, state management, dispatch logic)
2. Verify the plan covers all requirements
3. Update plan if needed
4. Implement the verified plan

---
*Source: Sometimes I would like to be able to dispatch tasks to ALL projects or a subset of projects. Allow the use of the SHIFT and COMMAND/CTRL modifier keys when clicking on projects in the PROJECTS pane, to select multiple projects simultaneously. When this is done, add all project names to the "Project" entry in the DISPATCH TASK Pane. The prompt in that pane should then be sent to all the projects that were selected, simultaneously when DISPATCH TASK is pressed. This is a complex feature add, so planning will be needed. Build the plan, Verify the plan and update if needed. Then implement the verified plan.*
