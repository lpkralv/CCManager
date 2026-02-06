import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

// Mock dependencies before importing the module under test
vi.mock("fs/promises", () => ({
  cp: vi.fn().mockResolvedValue(undefined),
  access: vi.fn(),
  rm: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

vi.mock("./project-service.js", () => ({
  addProject: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./settings-service.js", () => ({
  getProjectsRoot: vi.fn(),
}));

import { cp, access, rm, writeFile } from "fs/promises";
import { spawn, exec } from "child_process";
import { addProject } from "./project-service.js";
import { getProjectsRoot } from "./settings-service.js";
import { createProject, CreateProjectInput } from "./project-creator.js";

const mockCp = vi.mocked(cp);
const mockAccess = vi.mocked(access);
const mockRm = vi.mocked(rm);
const mockWriteFile = vi.mocked(writeFile);
const mockSpawn = vi.mocked(spawn);
const mockExec = vi.mocked(exec);
const mockAddProject = vi.mocked(addProject);
const mockGetProjectsRoot = vi.mocked(getProjectsRoot);

/**
 * Sets up exec mock so that promisify(exec) calls resolve successfully.
 * The exec mock must call its callback to work with promisify.
 */
function setupExecSuccess(): void {
  mockExec.mockImplementation((_cmd: unknown, _opts: unknown, cb: unknown) => {
    if (typeof cb === "function") {
      cb(null, { stdout: "", stderr: "" });
    }
    return {} as ReturnType<typeof exec>;
  });
}

/**
 * Sets up exec mock so that all commands fail with the given error.
 */
function setupExecFailure(errorMessage = "git command failed"): void {
  mockExec.mockImplementation((_cmd: unknown, _opts: unknown, cb: unknown) => {
    if (typeof cb === "function") {
      cb(new Error(errorMessage), { stdout: "", stderr: "" });
    }
    return {} as ReturnType<typeof exec>;
  });
}

/**
 * Sets up the spawn mock to create a process that emits an exit event.
 * The process is created lazily when spawn is called, ensuring that the
 * setTimeout fires after the caller has registered its event handlers.
 */
function setupSpawnMock(exitCode = 0): void {
  mockSpawn.mockImplementation(() => {
    const mockProc = new EventEmitter() as EventEmitter & {
      killed: boolean;
      kill: ReturnType<typeof vi.fn>;
      stderr: EventEmitter;
    };
    mockProc.killed = false;
    mockProc.kill = vi.fn();
    mockProc.stderr = new EventEmitter();

    // Emit exit on next tick so the promise handlers are registered first
    setTimeout(() => mockProc.emit("exit", exitCode), 0);

    return mockProc as any;
  });
}

/**
 * Sets up the spawn mock to create a process that emits an error event.
 */
function setupSpawnErrorMock(errorMessage = "spawn failed"): void {
  mockSpawn.mockImplementation(() => {
    const mockProc = new EventEmitter() as EventEmitter & {
      killed: boolean;
      kill: ReturnType<typeof vi.fn>;
      stderr: EventEmitter;
    };
    mockProc.killed = false;
    mockProc.kill = vi.fn();
    mockProc.stderr = new EventEmitter();

    setTimeout(() => mockProc.emit("error", new Error(errorMessage)), 0);

    return mockProc as any;
  });
}

describe("project-creator", () => {
  const defaultInput: CreateProjectInput = {
    name: "My Test Project",
    description: "A project for testing",
  };

  const projectsRoot = "/projects";
  const projectPath = `/projects/${defaultInput.name}`;
  const ccstartupPath = "/projects/CCSTARTUP";

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: projectsRoot is configured
    mockGetProjectsRoot.mockResolvedValue(projectsRoot);

    // Default: fs operations succeed
    mockCp.mockResolvedValue(undefined);
    mockRm.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    // Default: exec succeeds (for git init, git add, git commit)
    setupExecSuccess();

    // Default: spawn creates a process that exits successfully
    setupSpawnMock(0);

    // Default access mock:
    // - Project directory does NOT exist (rejects)
    // - CCSTARTUP template DOES exist (resolves)
    // - .git directory does NOT exist (rejects) for removeTemplateGit
    // - CLAUDE.md does NOT exist (rejects) for ensureMinimalSetup
    mockAccess.mockImplementation((p: unknown) => {
      const pathStr = String(p);
      if (pathStr === ccstartupPath) {
        return Promise.resolve(undefined) as any;
      }
      // Everything else does not exist
      return Promise.reject(new Error("ENOENT: no such file or directory"));
    });
  });

  describe("createProject", () => {
    it("should return error when projectsRoot is not configured", async () => {
      mockGetProjectsRoot.mockResolvedValue(undefined as any);

      const result = await createProject(defaultInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "Projects root directory is not configured. Please set it in Settings."
      );
      expect(result.project).toBeUndefined();
    });

    it("should return error when project directory already exists", async () => {
      mockAccess.mockImplementation((p: unknown) => {
        const pathStr = String(p);
        // Both project path and CCSTARTUP exist
        if (pathStr === projectPath || pathStr === ccstartupPath) {
          return Promise.resolve(undefined) as any;
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const result = await createProject(defaultInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Project directory already exists");
      expect(result.error).toContain(projectPath);
    });

    it("should return error when CCSTARTUP template is not found", async () => {
      // Nothing exists at all
      mockAccess.mockRejectedValue(new Error("ENOENT"));

      const result = await createProject(defaultInput);

      expect(result.success).toBe(false);
      expect(result.error).toContain("CCSTARTUP template not found");
      expect(result.error).toContain(ccstartupPath);
    });

    it("should complete successfully with all steps", async () => {
      const result = await createProject(defaultInput);

      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();
      expect(result.project!.name).toBe(defaultInput.name);
      expect(result.project!.description).toBe(defaultInput.description);
    });

    it("should copy CCSTARTUP template to the new project directory", async () => {
      await createProject(defaultInput);

      expect(mockCp).toHaveBeenCalledWith(ccstartupPath, projectPath, {
        recursive: true,
      });
    });

    it("should write project info file with correct content", async () => {
      await createProject(defaultInput);

      // writeFile is called for .project-info.json and possibly CLAUDE.md
      const projectInfoCall = mockWriteFile.mock.calls.find(
        (call) => String(call[0]).endsWith(".project-info.json")
      );
      expect(projectInfoCall).toBeDefined();

      const infoPath = String(projectInfoCall![0]);
      expect(infoPath).toBe(`${projectPath}/.project-info.json`);

      const infoContent = JSON.parse(String(projectInfoCall![1]));
      expect(infoContent.name).toBe(defaultInput.name);
      expect(infoContent.description).toBe(defaultInput.description);
      expect(infoContent.createdBy).toBe("ClaudeCodeManager");
      expect(infoContent.createdAt).toBeDefined();
    });

    it("should remove template .git and initialize a fresh git repo", async () => {
      // Make .git directory exist so removeTemplateGit actually calls rm
      mockAccess.mockImplementation((p: unknown) => {
        const pathStr = String(p);
        if (pathStr === ccstartupPath) return Promise.resolve(undefined) as any;
        if (pathStr === `${projectPath}/.git`) return Promise.resolve(undefined) as any;
        return Promise.reject(new Error("ENOENT"));
      });

      await createProject(defaultInput);

      // rm should be called to remove .git
      expect(mockRm).toHaveBeenCalledWith(`${projectPath}/.git`, {
        recursive: true,
        force: true,
      });

      // exec should be called for git init, add, commit
      const execCalls = mockExec.mock.calls.map((call) => String(call[0]));
      expect(execCalls).toContain("git init");
      expect(execCalls).toContain("git add -A");
      expect(execCalls.some((cmd) => cmd.includes("git commit"))).toBe(true);
    });

    it("should continue when runClaudeInit fails", async () => {
      // Spawn a process that exits with non-zero code
      setupSpawnMock(1);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await createProject(defaultInput);

      // Should still succeed overall
      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();

      // Should have logged a warning
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Claude /init warning")
      );

      warnSpy.mockRestore();
    });

    it("should create the correct project entry via addProject", async () => {
      await createProject(defaultInput);

      expect(mockAddProject).toHaveBeenCalledOnce();
      const project = mockAddProject.mock.calls[0]![0];

      expect(project.id).toBe("my-test-project");
      expect(project.name).toBe(defaultInput.name);
      expect(project.path).toBe(projectPath);
      expect(project.description).toBe(defaultInput.description);
      expect(project.projectType).toBe("utility");
      expect(project.status).toBe("active");
      expect(project.technology.primaryLanguage).toBe("python");
      expect(project.technology.buildSystem).toBe("scripts");
      expect(project.git.initialized).toBe(true);
      expect(project.git.defaultBranch).toBe("master");
      expect(project.configuration.files.claudeMd).toBe(true);
      expect(project.relationships).toHaveLength(1);
      expect(project.relationships[0]!.type).toBe("part-of");
      expect(project.relationships[0]!.targetProject).toBe("ccstartup");
    });

    it("should handle file system errors gracefully", async () => {
      // cp fails with a file system error
      mockCp.mockRejectedValue(new Error("EACCES: permission denied"));

      const result = await createProject(defaultInput);

      expect(result.success).toBe(false);
      expect(result.error).toBe("EACCES: permission denied");
      expect(result.project).toBeUndefined();
    });

    it("should slugify the project name correctly for the project ID", async () => {
      const input: CreateProjectInput = {
        name: "My Cool Project!!!",
        description: "Testing slugify",
      };

      // Adjust access mock for the new project name
      mockAccess.mockImplementation((p: unknown) => {
        const pathStr = String(p);
        if (pathStr === ccstartupPath) return Promise.resolve(undefined) as any;
        return Promise.reject(new Error("ENOENT"));
      });

      await createProject(input);

      expect(mockAddProject).toHaveBeenCalledOnce();
      const project = mockAddProject.mock.calls[0]![0];
      expect(project.id).toBe("my-cool-project");
    });

    it("should continue when git init fails", async () => {
      setupExecFailure("git init failed");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const result = await createProject(defaultInput);

      // Should still succeed because ensureMinimalSetup handles failures
      // and the outer try/catch catches any remaining errors
      expect(result.success).toBe(true);
      expect(result.project).toBeDefined();

      // Should have logged a git initialization warning
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Git initialization warning")
      );

      warnSpy.mockRestore();
    });

    it("should ensure minimal setup as fallback when init fails", async () => {
      // Make runClaudeInit fail
      setupSpawnMock(1);

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      await createProject(defaultInput);

      // ensureMinimalSetup should write CLAUDE.md since fileExists returns false
      const claudeMdCall = mockWriteFile.mock.calls.find(
        (call) => String(call[0]).endsWith("CLAUDE.md")
      );
      expect(claudeMdCall).toBeDefined();

      const claudeMdContent = String(claudeMdCall![1]);
      expect(claudeMdContent).toContain(defaultInput.name);
      expect(claudeMdContent).toContain(defaultInput.description);
      expect(claudeMdContent).toContain("CCSTARTUP template");

      warnSpy.mockRestore();
    });

    it("should return project with correct structure on success", async () => {
      const result = await createProject(defaultInput);

      expect(result.success).toBe(true);
      const project = result.project!;

      // Verify top-level fields
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("path");
      expect(project).toHaveProperty("description");
      expect(project).toHaveProperty("projectType");
      expect(project).toHaveProperty("status");

      // Verify nested objects
      expect(project).toHaveProperty("technology");
      expect(project).toHaveProperty("git");
      expect(project).toHaveProperty("configuration");
      expect(project).toHaveProperty("relationships");
      expect(project).toHaveProperty("metadata");

      // Verify configuration sub-structure
      expect(project.configuration).toHaveProperty("files");
      expect(project.configuration).toHaveProperty("directories");
      expect(project.configuration.files).toEqual({
        claudeMd: true,
        mcpJson: true,
        gitignore: true,
        readme: false,
      });

      // Verify metadata has date fields
      expect(project.metadata.hasClaudeMd).toBe(true);
      expect(project.metadata.lastScanned).toBeInstanceOf(Date);
      expect(project.metadata.lastModified).toBeInstanceOf(Date);
    });
  });
});
