import type { Project } from "./models/project.js";
import type { Task } from "./models/task.js";

/**
 * Create a valid test Project with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 */
export function makeTestProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "test-project",
    name: "Test Project",
    path: "/tmp/test-project",
    description: "A test project",
    projectType: "utility",
    status: "active",
    technology: {
      primaryLanguage: "typescript",
      buildSystem: "tsc",
    },
    git: {
      initialized: true,
      defaultBranch: "main",
    },
    configuration: {
      files: {
        claudeMd: true,
        mcpJson: false,
        gitignore: true,
        readme: false,
      },
      directories: {
        src: true,
        docs: false,
        tests: true,
        background: false,
      },
    },
    relationships: [],
    metadata: {
      hasClaudeMd: true,
      lastScanned: new Date("2024-01-01"),
      lastModified: new Date("2024-01-01"),
    },
    ...overrides,
  };
}

/**
 * Create a valid test Task with sensible defaults.
 * All fields can be overridden via the overrides parameter.
 */
export function makeTestTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    projectId: "test-project",
    prompt: "Test prompt",
    status: "pending",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    output: "",
    ...overrides,
  };
}
