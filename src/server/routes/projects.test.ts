import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { makeTestProject } from "../../test-helpers.js";

// Mock all service dependencies before importing the app
vi.mock("../../services/project-service.js", () => ({
  getAllProjects: vi.fn(),
  getProjectById: vi.fn(),
  addProject: vi.fn(),
  updateProject: vi.fn(),
  loadInventory: vi.fn(),
  saveInventory: vi.fn(),
}));

vi.mock("../../services/project-creator.js", () => ({
  createProject: vi.fn(),
}));

vi.mock("../../services/git-service.js", () => ({
  getGitStatus: vi.fn(),
  getRecentCommits: vi.fn(),
  fetchRemote: vi.fn(),
}));

vi.mock("../../services/dowork-service.js", () => ({
  getDoWorkQueue: vi.fn(),
}));

// Also mock settings-service (transitive dependency)
vi.mock("../../services/settings-service.js", () => ({
  loadSettings: vi.fn().mockResolvedValue({}),
  saveSettings: vi.fn(),
  getProjectsRoot: vi.fn(),
  getProjectsRootSource: vi.fn(),
}));

// Mock fs/promises used by settings route
vi.mock("fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import {
  getAllProjects,
  getProjectById,
} from "../../services/project-service.js";
import { createProject } from "../../services/project-creator.js";
import { getGitStatus, getRecentCommits, fetchRemote } from "../../services/git-service.js";
import { getDoWorkQueue } from "../../services/dowork-service.js";
import { createApp } from "../app.js";

const mockGetAllProjects = vi.mocked(getAllProjects);
const mockGetProjectById = vi.mocked(getProjectById);
const mockCreateProject = vi.mocked(createProject);
const mockGetGitStatus = vi.mocked(getGitStatus);
const mockGetRecentCommits = vi.mocked(getRecentCommits);
const mockFetchRemote = vi.mocked(fetchRemote);
const mockGetDoWorkQueue = vi.mocked(getDoWorkQueue);

const app = createApp();

describe("projects routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRemote.mockResolvedValue(undefined);
  });

  describe("GET /api/projects", () => {
    it("should return list of all projects", async () => {
      const projects = [
        makeTestProject({ id: "p1", name: "Project 1" }),
        makeTestProject({ id: "p2", name: "Project 2" }),
      ];
      mockGetAllProjects.mockResolvedValue(projects);

      const res = await request(app).get("/api/projects");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe("p1");
    });

    it("should return empty array when no projects", async () => {
      mockGetAllProjects.mockResolvedValue([]);

      const res = await request(app).get("/api/projects");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });

    it("should return 500 on service error", async () => {
      mockGetAllProjects.mockRejectedValue(new Error("db error"));

      const res = await request(app).get("/api/projects");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("db error");
    });
  });

  describe("GET /api/projects/:id", () => {
    it("should return project when found", async () => {
      const project = makeTestProject({ id: "my-project" });
      mockGetProjectById.mockResolvedValue(project);

      const res = await request(app).get("/api/projects/my-project");

      expect(res.status).toBe(200);
      expect(res.body.id).toBe("my-project");
    });

    it("should return 404 when project not found", async () => {
      mockGetProjectById.mockResolvedValue(undefined);

      const res = await request(app).get("/api/projects/nonexistent");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Project not found");
    });
  });

  describe("GET /api/projects/:id/details", () => {
    it("should return project with git status, commits, and dowork queue", async () => {
      const project = makeTestProject({ id: "detail-proj" });
      mockGetProjectById.mockResolvedValue(project);
      mockGetGitStatus.mockResolvedValue({
        localBranch: "main",
        remoteBranch: "origin/main",
        isClean: true,
        ahead: 0,
        behind: 0,
        uncommittedChanges: 0,
      });
      mockGetRecentCommits.mockResolvedValue([
        {
          hash: "abc123",
          message: "initial commit",
          date: "2024-01-01",
          author: "Dev",
        },
      ]);
      mockGetDoWorkQueue.mockResolvedValue({
        pending: [],
        working: [],
        recentArchive: [],
      });

      const res = await request(app).get("/api/projects/detail-proj/details");

      expect(res.status).toBe(200);
      expect(res.body.project.id).toBe("detail-proj");
      expect(res.body.git.localBranch).toBe("main");
      expect(res.body.recentCommits).toHaveLength(1);
      expect(res.body.doWork).toBeDefined();
    });

    it("should return 404 when project not found", async () => {
      mockGetProjectById.mockResolvedValue(undefined);

      const res = await request(app).get("/api/projects/nonexistent/details");

      expect(res.status).toBe(404);
    });

    it("should return fallback values when git commands fail", async () => {
      const project = makeTestProject({ id: "failing-git" });
      mockGetProjectById.mockResolvedValue(project);
      mockGetGitStatus.mockRejectedValue(new Error("git error"));
      mockGetRecentCommits.mockRejectedValue(new Error("git error"));
      mockGetDoWorkQueue.mockRejectedValue(new Error("fs error"));

      const res = await request(app).get("/api/projects/failing-git/details");

      expect(res.status).toBe(200);
      // Should have fallback values
      expect(res.body.git.localBranch).toBe("unknown");
      expect(res.body.recentCommits).toEqual([]);
      expect(res.body.doWork).toBeNull();
    });
  });

  describe("GET /api/projects/summary", () => {
    it("should return project summaries with git info", async () => {
      const projects = [makeTestProject({ id: "sum-proj" })];
      mockGetAllProjects.mockResolvedValue(projects);
      mockGetGitStatus.mockResolvedValue({
        localBranch: "main",
        remoteBranch: "origin/main",
        isClean: true,
        ahead: 1,
        behind: 0,
        uncommittedChanges: 0,
      });
      mockGetRecentCommits.mockResolvedValue([
        {
          hash: "abc123",
          message: "latest commit",
          date: "2024-01-15",
          author: "Dev",
        },
      ]);

      const res = await request(app).get("/api/projects/summary");

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe("sum-proj");
      expect(res.body[0].gitBranch).toBe("main");
      expect(res.body[0].ahead).toBe(1);
      expect(res.body[0].lastCommitMessage).toBe("latest commit");
    });
  });

  describe("POST /api/projects", () => {
    it("should create a project and return 201", async () => {
      const project = makeTestProject({ id: "new-proj" });
      mockCreateProject.mockResolvedValue({
        success: true,
        project,
      });

      const res = await request(app)
        .post("/api/projects")
        .send({ name: "New Project", description: "A new project" });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe("new-proj");
    });

    it("should return 400 on validation error (missing name)", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ description: "No name provided" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid input");
    });

    it("should return 400 on validation error (empty description)", async () => {
      const res = await request(app)
        .post("/api/projects")
        .send({ name: "Test", description: "" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when creation fails", async () => {
      mockCreateProject.mockResolvedValue({
        success: false,
        error: "Directory already exists",
      });

      const res = await request(app)
        .post("/api/projects")
        .send({ name: "Existing", description: "Existing project" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Directory already exists");
    });
  });
});
