# CCManager

A web dashboard for managing multiple [Claude Code](https://docs.anthropic.com/en/docs/claude-code) projects from a single interface.

## Features

- **Project Inventory** -- Auto-discovers projects from a configurable root directory
- **Task Dispatch** -- Launch Claude Code tasks against any project with a prompt, then monitor output in real time via WebSocket
- **Git Integration** -- View per-project branch, ahead/behind status, uncommitted changes, and recent commits
- **Do-Work Queue** -- Inspect pending, in-progress, and archived work requests for projects that use a `do-work/` convention
- **Task History** -- Browse completed tasks with full output logs
- **Project Summary** -- Dashboard overview of all managed projects
- **Settings UI** -- Configure the projects root directory and other options from the browser
- **Electron App** -- Optional native macOS desktop wrapper
- **launchd Service** -- Auto-start the server at login on macOS

## Prerequisites

- **Node.js** 22.x or later
- **npm** (ships with Node.js)
- **Claude Code CLI** -- installed and authenticated (`claude` must be on your PATH)
- **Git** -- for project status features

## Quick Start

```bash
# Clone the repository
git clone https://github.com/lpkralv/CCManager.git
cd CCManager

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env and set PROJECTS_ROOT to your projects directory

# Build and start
npm run build
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Development Mode

```bash
npm run dev
```

This starts the server with hot-reload via `tsx watch`.

## Architecture

```
Browser (Alpine.js + vanilla CSS)
   |
   +-- REST API (Express)  -- project CRUD, task dispatch, history, settings
   |
   +-- WebSocket (ws)      -- real-time task output streaming
   |
   +-- Static files        -- public/ served by Express
```

**Backend**: TypeScript / Express / ws
**Frontend**: Single-page HTML with Alpine.js (no build step)
**Data**: JSON files in `data/` (inventory, task history, settings)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check with uptime |
| `GET` | `/api/projects` | List all projects |
| `GET` | `/api/projects/:id` | Get a single project |
| `GET` | `/api/projects/:id/details` | Git status, recent commits, do-work queue |
| `POST` | `/api/projects` | Add a new project |
| `GET` | `/api/tasks/history` | Get task history |
| `POST` | `/api/tasks` | Dispatch a new Claude Code task |
| `DELETE` | `/api/tasks/:id` | Cancel a running task |
| `GET` | `/api/settings` | Get current settings |
| `PUT` | `/api/settings` | Update settings |
| `POST` | `/api/shutdown` | Gracefully shut down the server |

## macOS Desktop App (Electron)

Build a native macOS app that wraps the dashboard:

```bash
npm run build:mac
```

The output is placed in `dist-electron/`. Launch with:

```bash
npm run start:electron
```

The Electron shell starts the Express server automatically and opens the dashboard in a native window.

## macOS launchd Service

Start the server automatically at login:

```bash
npm run service:install    # Install and start
npm run service:status     # Check if running
npm run service:logs       # Tail the log file
npm run service:uninstall  # Stop and remove
```

Alternatively, double-click `start_CCManager.command` or `stop_CCManager.command` in Finder.

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | `development` or `production` |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error` |
| `PROJECTS_ROOT` | -- | Root directory containing your Claude Code projects |

Copy `.env.example` to `.env` and edit as needed. The projects root can also be changed from the Settings page in the dashboard.

## Development

### Build

```bash
npm run build          # Compile TypeScript
npm run build:watch    # Compile in watch mode
```

### Test

```bash
npm test               # Run all tests (Vitest)
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

### Type Check

```bash
npm run typecheck
```

### Project Structure

```
src/
  server/          Express app, routes, WebSocket handler
  services/        Business logic (projects, tasks, git, history, settings)
  models/          TypeScript type definitions and schemas
  electron/        Electron main process
  types/           Shared type declarations
public/
  index.html       Single-page dashboard (Alpine.js)
  css/             Stylesheets
  js/              Client-side JavaScript
data/              Runtime JSON data (inventory, task history)
scripts/
  launchd/         macOS service install/uninstall
  generate-icon.mjs  Icon generator for Electron build
```

## License

[MIT](LICENSE)
