import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { makeTestTask } from "../../test-helpers.js";

// Mock task-manager (singleton)
vi.mock("../../services/task-manager.js", () => {
  return {
    taskManager: {
      createTask: vi.fn(),
      getActiveTasks: vi.fn(),
      getTask: vi.fn(),
      cancelTask: vi.fn(),
      on: vi.fn(),
      emit: vi.fn(),
    },
  };
});

// Mock history-service
vi.mock("../../services/history-service.js", () => ({
  getCompletedTasks: vi.fn(),
  loadHistory: vi.fn(),
  saveHistory: vi.fn(),
  addTaskToHistory: vi.fn(),
}));

// Mock project-service (transitive)
vi.mock("../../services/project-service.js", () => ({
  getAllProjects: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn(),
  addProject: vi.fn(),
  updateProject: vi.fn(),
  loadInventory: vi.fn(),
  saveInventory: vi.fn(),
}));

// Mock project-creator (transitive)
vi.mock("../../services/project-creator.js", () => ({
  createProject: vi.fn(),
}));

// Mock git-service (transitive)
vi.mock("../../services/git-service.js", () => ({
  getGitStatus: vi.fn(),
  getRecentCommits: vi.fn(),
  fetchRemote: vi.fn(),
}));

// Mock dowork-service (transitive)
vi.mock("../../services/dowork-service.js", () => ({
  getDoWorkQueue: vi.fn(),
}));

// Mock settings-service (transitive)
vi.mock("../../services/settings-service.js", () => ({
  loadSettings: vi.fn().mockResolvedValue({}),
  saveSettings: vi.fn(),
  getProjectsRoot: vi.fn(),
  getProjectsRootSource: vi.fn(),
}));

// Mock fs/promises
vi.mock("fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { taskManager } from "../../services/task-manager.js";
import { getCompletedTasks } from "../../services/history-service.js";
import { createApp } from "../app.js";

const mockTaskManager = vi.mocked(taskManager);
const mockGetCompletedTasks = vi.mocked(getCompletedTasks);

const app = createApp();

describe("tasks routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("POST /api/tasks", () => {
    it("should create a task and return 201", async () => {
      const task = makeTestTask({ status: "pending" });
      mockTaskManager.createTask.mockResolvedValue(task);

      const res = await request(app)
        .post("/api/tasks")
        .send({ projectId: "test-project", prompt: "Do something" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(task.id);
      expect(res.body.status).toBe("pending");
    });

    it("should return 400 when projectId is missing", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ prompt: "Do something" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid input");
    });

    it("should return 400 when prompt is missing", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ projectId: "test-project" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when prompt is empty", async () => {
      const res = await request(app)
        .post("/api/tasks")
        .send({ projectId: "test-project", prompt: "" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when createTask throws (project not found)", async () => {
      mockTaskManager.createTask.mockRejectedValue(
        new Error("Project not found: bad-id")
      );

      const res = await request(app)
        .post("/api/tasks")
        .send({ projectId: "bad-id", prompt: "Do something" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Project not found: bad-id");
    });

    it("should accept optional maxBudget", async () => {
      const task = makeTestTask({ maxBudget: 5.0 });
      mockTaskManager.createTask.mockResolvedValue(task);

      const res = await request(app)
        .post("/api/tasks")
        .send({ projectId: "test-project", prompt: "Work", maxBudget: 5.0 });

      expect(res.status).toBe(201);
      expect(mockTaskManager.createTask).toHaveBeenCalledWith({
        projectId: "test-project",
        prompt: "Work",
        maxBudget: 5.0,
      });
    });
  });

  describe("GET /api/tasks", () => {
    it("should return list of active tasks", async () => {
      const tasks = [
        makeTestTask({ id: "550e8400-e29b-41d4-a716-446655440001", status: "running" }),
        makeTestTask({ id: "550e8400-e29b-41d4-a716-446655440002", status: "pending" }),
      ];
      mockTaskManager.getActiveTasks.mockReturnValue(tasks);

      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("should return empty array when no active tasks", async () => {
      mockTaskManager.getActiveTasks.mockReturnValue([]);

      const res = await request(app).get("/api/tasks");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  describe("GET /api/tasks/history", () => {
    it("should return completed tasks from history", async () => {
      const tasks = [
        makeTestTask({ id: "550e8400-e29b-41d4-a716-446655440001", status: "completed" }),
        makeTestTask({ id: "550e8400-e29b-41d4-a716-446655440002", status: "failed" }),
      ];
      mockGetCompletedTasks.mockResolvedValue(tasks);

      const res = await request(app).get("/api/tasks/history");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    it("should return 500 on service error", async () => {
      mockGetCompletedTasks.mockRejectedValue(new Error("read error"));

      const res = await request(app).get("/api/tasks/history");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("read error");
    });
  });

  describe("GET /api/tasks/:id", () => {
    it("should return task when found", async () => {
      const task = makeTestTask();
      mockTaskManager.getTask.mockReturnValue(task);

      const res = await request(app).get(`/api/tasks/${task.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(task.id);
    });

    it("should return 404 when task not found", async () => {
      mockTaskManager.getTask.mockReturnValue(undefined);

      const res = await request(app).get("/api/tasks/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found");
    });
  });

  describe("DELETE /api/tasks/:id", () => {
    it("should cancel task and return success", async () => {
      mockTaskManager.cancelTask.mockReturnValue(true);

      const res = await request(app).delete("/api/tasks/some-task-id");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it("should return 404 when task cannot be cancelled", async () => {
      mockTaskManager.cancelTask.mockReturnValue(false);

      const res = await request(app).delete("/api/tasks/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Task not found or already completed");
    });
  });
});
