---
id: REQ-043
title: Improve failed task error details and fix workflow
status: pending
created_at: 2025-02-19T19:50:00Z
---

# Improve Failed Task Error Details and Fix Workflow

## What
Enhance failed task entries in the task history to provide sufficient debugging information and enable easy fix requests.

## Context
When tasks fail, the task history entry needs enough information to diagnose and fix the issue.

**Minimum required information:**
- Error codes
- Error messages
- Error locations (file paths, line numbers if applicable)

**Ideal enhancement:**
- Add a button to failed history entries
- Button formats the original prompt and error result information into a prompt
- Sends formatted prompt to CLAUDECODEMANAGER project to be fixed
- This creates a seamless workflow from failure → fix request

## Assets
None

---
*Source: "When tasks fail, the task history entry needs sufficient information to allow for a a fix. A minimum of error codes, messages and locations are required. Ideally, the failed history entry would also have a button that would allow all original prompt and error result information to be formatted into a prompt and sent to this (CLAUDECODEMANAGER) project to be fixed."*
