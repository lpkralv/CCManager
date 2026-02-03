# Claude Code Manager

A web-based dashboard and API for managing multiple Claude Code projects in a sandbox environment.

## Features

- **Project Inventory**: Track and manage multiple Claude Code projects
- **Project Details**: View git status, recent commits, and do-work queues
- **Task Dispatch**: Send prompts to projects via Claude Code CLI
- **Real-time Monitoring**: WebSocket-based task status updates
- **Electron App**: Optional desktop application wrapper

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Dashboard

The dashboard provides:

- **Project List** (left sidebar): All projects with status badges
- **Project Details Modal**: Click the (i) button on any project to see:
  - Git branch and sync status
  - Recent commits
  - Do-work queue (if present)
- **Task Dispatch Form**: Select a project and enter a prompt
- **Active Tasks**: Real-time task output streaming
- **Task History**: Completed tasks with duration

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get project by ID |
| GET | `/api/projects/:id/details` | Get project with git info and do-work queue |
| POST | `/api/projects` | Create new project |
| POST | `/api/tasks` | Dispatch a task |
| DELETE | `/api/tasks/:id` | Cancel a task |
| GET | `/api/tasks/history` | Get task history |
| POST | `/api/shutdown` | Shutdown server |

## Configuration

### Environment Variables

Create a `.env` file:

```
PORT=3000
NODE_ENV=development
PROJECTS_ROOT=/Volumes/Sheridan/sandbox
```

### Git Safe Directories

For projects owned by different users, add them to Git's safe directory list:

```bash
for dir in /Volumes/Sheridan/sandbox/*/; do
  git config --global --add safe.directory "$dir"
done
```

## Tech Stack

- **Backend**: Node.js, Express, TypeScript
- **Frontend**: Alpine.js, HTMX
- **Real-time**: WebSocket
- **Desktop**: Electron (optional)
- **Validation**: Zod

## Scripts

```bash
npm run dev          # Development server with hot reload
npm run build        # Build TypeScript
npm start            # Production server
npm run typecheck    # Type checking
npm test             # Run tests
```

## License

MIT
