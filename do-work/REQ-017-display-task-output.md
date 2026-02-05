---
id: REQ-017
title: Display task output back to user in CCManager
status: pending
created_at: 2026-02-05T18:55:00Z
---

# Display Task Output Back to User

## What
When a prompt dispatched to a project generates output (e.g., an answer to a question, a summary, or any textual response), that output should be visible to the user within CCManager. The task history is one possible location, but the implementation may use a better approach if one exists.

## Context
Currently tasks can be dispatched and their status is tracked, but the actual output/response from Claude Code may not be surfaced clearly to the user. The user needs to see what came back — especially for prompts that ask questions rather than perform actions. This could be shown in the task history detail view, a dedicated output panel, or a popup when a task completes.

---
*Source: "When the prompt sent to a project generates an output (e.g., when the user asks a question) that information should come back to the CCManager for the user to see. I presume this would be in the task history, though you may have a better idea."*
