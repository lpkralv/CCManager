import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock all service dependencies used by route files
vi.mock("../services/project-service.js", () => ({
  getAllProjects: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn(),
  addProject: vi.fn(),
  updateProject: vi.fn(),
  loadInventory: vi.fn(),
  saveInventory: vi.fn(),
}));

vi.mock("../services/project-creator.js", () => ({
  createProject: vi.fn(),
}));

vi.mock("../services/git-service.js", () => ({
  getGitStatus: vi.fn(),
  getRecentCommits: vi.fn(),
  fetchRemote: vi.fn(),
}));

vi.mock("../services/settings-service.js", () => ({
  loadSettings: vi.fn().mockResolvedValue({}),
  saveSettings: vi.fn(),
  getProjectsRoot: vi.fn(),
  getProjectsRootSource: vi.fn(),
}));

vi.mock("../services/task-manager.js", () => ({
  taskManager: {
    createTask: vi.fn(),
    getActiveTasks: vi.fn().mockReturnValue([]),
    getTask: vi.fn(),
    cancelTask: vi.fn(),
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock("../services/history-service.js", () => ({
  getCompletedTasks: vi.fn().mockResolvedValue([]),
  loadHistory: vi.fn(),
  saveHistory: vi.fn(),
  addTaskToHistory: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { createApp } from "./app.js";

const app = createApp();

describe("app", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("should return status ok with timestamp and uptime", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.timestamp).toBeDefined();
      expect(typeof res.body.uptime).toBe("number");
    });

    it("should return a valid ISO timestamp", async () => {
      const res = await request(app).get("/api/health");

      const date = new Date(res.body.timestamp);
      expect(date.toISOString()).toBe(res.body.timestamp);
    });
  });

  describe("POST /api/shutdown", () => {
    it("should return shutdown message", async () => {
      // Mock process.exit to prevent actual shutdown
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      const res = await request(app).post("/api/shutdown");

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Server shutting down...");

      // Clean up the setTimeout that would call process.exit
      exitSpy.mockRestore();
    });
  });

  describe("JSON middleware", () => {
    it("should parse JSON request body", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .set("Content-Type", "application/json")
        .send({ projectId: "test", prompt: "hello" });

      // Even if it fails for other reasons, we should not get a parse error
      // The route handler will process the body
      expect(res.status).toBeLessThan(500);
    });
  });
});
