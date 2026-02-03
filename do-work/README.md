# Do-Work Queue

This folder contains work requests for the Claude Code Manager project.

## Structure

```
do-work/
  REQ-*.md        # Pending requests (picked up by work action)
  CONTEXT-*.md    # Context documents for complex requests
  assets/         # Screenshots and attached files
  working/        # Requests currently being worked on
  archive/        # Completed requests
```

## Usage

- **Add a request**: `/do-work add dark mode` or `/do-work [description]`
- **Process queue**: `/do-work work` or `/do-work run`

## File Naming

- Requests: `REQ-001-short-slug.md`
- Context docs: `CONTEXT-001-topic-name.md`
- Assets: `REQ-001-short-slug.png`
