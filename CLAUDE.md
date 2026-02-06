# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

This is a **Node.js/TypeScript project** for a repository of knowledge about sibling Claude Code projects, with the ability to answer questions, perform periodic maintenance across all projects, and create Web tools for management and maintenance.

**Project Type**: Web API/Server with CLI capabilities

## Development Setup

### Node.js Version
- **Required**: Node.js 22.x LTS
- **Check**: `node --version`
- **Manage**: Use nvm: `nvm use` (reads from .nvmrc if present)

### Package Manager
- **Tool**: npm
- **Lock file**: package-lock.json

### Installation
```bash
# Install dependencies
npm install

# Install dev dependencies
npm install --include=dev
```

### Project Structure
```
src/                  - Source code (TypeScript)
  index.ts           - Entry point
  api/               - API routes and handlers
  services/          - Business logic services
  knowledge/         - Knowledge base and project data
  maintenance/       - Periodic maintenance tasks
  utils/             - Utility functions
tests/               - Test files
dist/                - Compiled output (TypeScript)
docs/                - Documentation
background/          - Reference materials
package.json         - Project metadata and scripts
tsconfig.json        - TypeScript configuration
.env                 - Environment variables (not committed)
.env.example         - Environment template
```

## Technology Stack

### Runtime & Language
- **Language**: TypeScript
- **TypeScript**: 5.x
- **Target**: ES2022
- **Module system**: ESM

### Framework/Library
- **Express**: Web server framework for API endpoints
- **Commander/yargs**: CLI interface (if needed)

### Key Dependencies
- express: Web server
- typescript: Type checking and compilation
- tsx: TypeScript execution for development
- zod: Schema validation
- dotenv: Environment variable loading

## Common Development Tasks

### Running the Application
```bash
# Development mode (with hot reload)
npm run dev
# tsx watch src/index.ts

# Production mode
npm start
# node dist/index.js
```

### Building
```bash
# Build for production
npm run build
# tsc

# Watch mode (rebuild on change)
npm run build:watch
# tsc --watch
```

### Testing
```bash
# Run all tests
npm test
# vitest run

# Watch mode
npm run test:watch
# vitest

# Coverage
npm run test:coverage
# vitest --coverage
```

### Linting & Formatting
```bash
# Lint code
npm run lint
# eslint src/

# Fix linting issues
npm run lint:fix
# eslint src/ --fix

# Format code
npm run format
# prettier --write src/
```

## Code Style & Standards

### Style Guide
- **Standard**: ESLint recommended + TypeScript strict
- **Formatter**: Prettier
- **Linter**: ESLint

### TypeScript Configuration
- **Strict mode**: Enabled
- **No implicit any**: Enforced
- **Path aliases**: @/* → src/*
- **Declaration files**: Generated in dist/types/

### Naming Conventions
- **Files**: kebab-case.ts
- **Classes**: PascalCase
- **Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase (no 'I' prefix)

### Code Organization
- One component/class per file
- Index files for barrel exports
- Co-locate tests with source files (*.test.ts)
- Group by feature, not by type

## Environment Configuration

### Environment Variables
- `NODE_ENV`: development | production | test
- `PORT`: Server port (default: 3000)
- `LOG_LEVEL`: Logging verbosity (debug, info, warn, error)
- `PROJECTS_ROOT`: Root directory for sibling Claude Code projects

Store in `.env` file (not committed)
Use `.env.example` as template

### Configuration Loading
- **Tool**: dotenv
- **Files**: .env, .env.local
- **Validation**: zod schema

## Testing Strategy

### Test Framework
- **Framework**: Vitest
- **Assertion**: expect (built-in)
- **Coverage target**: 80%

### Test Types
- **Unit tests**: Pure function tests (*.test.ts)
- **Integration tests**: API endpoint tests
- **E2E tests**: Full workflow tests

### Mocking
- **Library**: vi.mock (Vitest built-in)
- **Strategy**: Mock external APIs, file system operations

## Build & Bundle

### Bundler
- **Tool**: tsc (TypeScript compiler)
- **Output**: dist/
- **Source maps**: Generated for debugging

### Build Outputs
- `dist/index.js`: Main entry point
- `dist/types/`: TypeScript declaration files

## Security

- **Dependency scanning**: npm audit
- **Secrets**: Use environment variables, never commit
- **Input validation**: Validate all inputs with zod

## Version Control

- **Repository**: https://github.com/lpkralv/ClaudeCodeManager
- **User**: lpkralv
- **Branch strategy**: main + feature branches
- **Commit format**: Conventional Commits

## Scripts (package.json)

- `dev`: Start development server with hot reload
- `build`: Build for production
- `start`: Start production server
- `test`: Run tests
- `test:watch`: Run tests in watch mode
- `test:coverage`: Run tests with coverage
- `lint`: Lint code
- `lint:fix`: Fix linting issues
- `format`: Format code
- `typecheck`: Run TypeScript compiler

## Troubleshooting

### Common Issues
1. **Module not found**: Run `npm install`
2. **Type errors**: Check tsconfig.json, run `npm run typecheck`
3. **Port already in use**: Change PORT in .env
4. **Build fails**: Clear dist/ and node_modules/, reinstall

## Dashboard

The project includes a web-based dashboard for managing Claude Code projects.

### Running the Dashboard
```bash
npm run dev    # Development mode at http://localhost:3000
npm start      # Production mode
```

### Dashboard Features
- **Project List**: View all projects with status indicators
- **Project Details Modal**: Click the info button (i) on any project to see:
  - Git status (branch, ahead/behind, uncommitted changes)
  - Recent commits (hash, message, date, author)
  - Do-work queue (pending/working/archive) if present
- **Task Dispatch**: Select a project and dispatch Claude Code tasks
- **Task Monitoring**: Real-time task status via WebSocket
- **Server Shutdown**: Stop server button in header

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check with uptime |
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get single project |
| GET | `/api/projects/:id/details` | Get project with git status, commits, do-work queue |
| POST | `/api/projects` | Create new project |
| GET | `/api/tasks/history` | Get task history |
| POST | `/api/tasks` | Dispatch a new task |
| DELETE | `/api/tasks/:id` | Cancel a task |
| POST | `/api/shutdown` | Gracefully shutdown server |

### Git Safe Directory Configuration

When accessing projects owned by different users, Git requires adding them to the safe directory list:
```bash
# Add all sandbox projects to git safe directories
for dir in /Volumes/Sheridan/sandbox/*/; do
  git config --global --add safe.directory "$dir"
done
```

This is required for the project details endpoint to show git information.

## Additional Resources

- **Documentation**: docs/
- **Background Info**: background/info/

---

**Notes for Claude Code:**
- ALWAYS use subagents to perform parallel tasks in parallel when possible
- Run `npm run typecheck` after TypeScript changes
- Run tests before committing
- Use code-reviewer agent for quality checks
- Use test-generator agent for comprehensive test coverage
- This project manages knowledge about sibling projects - be mindful of cross-project dependencies
- Push all changes to both public and private repos
- Always run tests related to a change before concluding a /do-work request
