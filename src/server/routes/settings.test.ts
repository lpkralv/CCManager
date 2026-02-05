import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock services before importing app
vi.mock("../../services/settings-service.js", () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  getProjectsRoot: vi.fn(),
  getProjectsRootSource: vi.fn(),
  inferProjectsRoot: vi.fn(),
}));

// Mock fs/promises (used by settings route for access check)
vi.mock("fs/promises", () => ({
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import {
  loadSettings,
  saveSettings,
  getProjectsRoot,
  getProjectsRootSource,
  inferProjectsRoot,
} from "../../services/settings-service.js";
import { access } from "fs/promises";
import { createApp } from "../app.js";

const mockLoadSettings = vi.mocked(loadSettings);
const mockSaveSettings = vi.mocked(saveSettings);
const mockGetProjectsRoot = vi.mocked(getProjectsRoot);
const mockGetProjectsRootSource = vi.mocked(getProjectsRootSource);
const mockInferProjectsRoot = vi.mocked(inferProjectsRoot);
const mockAccess = vi.mocked(access);

const app = createApp();

describe("settings routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/settings", () => {
    it("should return settings with effective root and source", async () => {
      mockLoadSettings.mockResolvedValue({ projectsRoot: "/my/path" });
      mockGetProjectsRoot.mockResolvedValue("/my/path");
      mockGetProjectsRootSource.mockResolvedValue("settings");

      const res = await request(app).get("/api/settings");

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        settings: { projectsRoot: "/my/path" },
        effectiveProjectsRoot: "/my/path",
        projectsRootSource: "settings",
        inferredProjectsRoot: null,
      });
    });

    it("should return null for effectiveProjectsRoot when not configured and no projects", async () => {
      mockLoadSettings.mockResolvedValue({});
      mockGetProjectsRoot.mockResolvedValue(undefined);
      mockGetProjectsRootSource.mockResolvedValue("none");
      mockInferProjectsRoot.mockResolvedValue(undefined);

      const res = await request(app).get("/api/settings");

      expect(res.status).toBe(200);
      expect(res.body.effectiveProjectsRoot).toBeNull();
      expect(res.body.projectsRootSource).toBe("none");
      expect(res.body.inferredProjectsRoot).toBeNull();
    });

    it("should return inferredProjectsRoot when source is none but projects exist", async () => {
      mockLoadSettings.mockResolvedValue({});
      mockGetProjectsRoot.mockResolvedValue(undefined);
      mockGetProjectsRootSource.mockResolvedValue("none");
      mockInferProjectsRoot.mockResolvedValue("/inferred/path");

      const res = await request(app).get("/api/settings");

      expect(res.status).toBe(200);
      expect(res.body.effectiveProjectsRoot).toBeNull();
      expect(res.body.projectsRootSource).toBe("none");
      expect(res.body.inferredProjectsRoot).toBe("/inferred/path");
    });

    it("should return 500 when loadSettings throws", async () => {
      mockLoadSettings.mockRejectedValue(new Error("disk error"));

      const res = await request(app).get("/api/settings");

      expect(res.status).toBe(500);
      expect(res.body.error).toBe("disk error");
    });
  });

  describe("PUT /api/settings", () => {
    it("should save settings and return updated state", async () => {
      mockAccess.mockResolvedValue(undefined);
      mockSaveSettings.mockResolvedValue(undefined);
      mockGetProjectsRoot.mockResolvedValue("/new/path");
      mockGetProjectsRootSource.mockResolvedValue("settings");

      const res = await request(app)
        .put("/api/settings")
        .send({ projectsRoot: "/new/path" });

      expect(res.status).toBe(200);
      expect(mockSaveSettings).toHaveBeenCalledOnce();
      expect(res.body.settings.projectsRoot).toBe("/new/path");
      expect(res.body.effectiveProjectsRoot).toBe("/new/path");
    });

    it("should return 400 when projectsRoot is missing", async () => {
      const res = await request(app).put("/api/settings").send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid input");
    });

    it("should return 400 when projectsRoot is empty string", async () => {
      const res = await request(app)
        .put("/api/settings")
        .send({ projectsRoot: "" });

      expect(res.status).toBe(400);
    });

    it("should return 400 when directory does not exist", async () => {
      mockAccess.mockRejectedValue(new Error("ENOENT"));

      const res = await request(app)
        .put("/api/settings")
        .send({ projectsRoot: "/nonexistent/path" });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Directory does not exist");
    });
  });
});
