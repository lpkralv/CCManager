import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestProject } from "../test-helpers.js";

// Mock fs/promises before importing the module under test
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}));

import { readFile, writeFile } from "fs/promises";
import {
  loadInventory,
  saveInventory,
  getAllProjects,
  getProjectById,
  addProject,
  updateProject,
} from "./project-service.js";

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);

function makeInventoryJson(projects = [makeTestProject()]) {
  return JSON.stringify({
    version: "1.0",
    lastUpdated: new Date("2024-01-01").toISOString(),
    projects,
  });
}

describe("project-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe("loadInventory", () => {
    it("should load and parse valid inventory file", async () => {
      const project = makeTestProject();
      mockReadFile.mockResolvedValue(makeInventoryJson([project]));

      const inventory = await loadInventory();

      expect(inventory.projects).toHaveLength(1);
      expect(inventory.projects[0]!.id).toBe("test-project");
      expect(inventory.version).toBe("1.0");
    });

    it("should throw when file does not exist", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      await expect(loadInventory()).rejects.toThrow();
    });

    it("should throw when file contains invalid JSON", async () => {
      mockReadFile.mockResolvedValue("not-json");

      await expect(loadInventory()).rejects.toThrow();
    });
  });

  describe("saveInventory", () => {
    it("should write inventory as JSON and update lastUpdated", async () => {
      const inventory = {
        version: "1.0",
        lastUpdated: new Date("2024-01-01"),
        projects: [makeTestProject()],
      };

      await saveInventory(inventory);

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written.projects).toHaveLength(1);
      // lastUpdated should have been updated to a more recent date
      expect(new Date(written.lastUpdated).getTime()).toBeGreaterThan(
        new Date("2024-01-01").getTime()
      );
    });
  });

  describe("getAllProjects", () => {
    it("should return all projects from inventory", async () => {
      const p1 = makeTestProject({ id: "proj-1", name: "Project 1" });
      const p2 = makeTestProject({ id: "proj-2", name: "Project 2" });
      mockReadFile.mockResolvedValue(makeInventoryJson([p1, p2]));

      const projects = await getAllProjects();

      expect(projects).toHaveLength(2);
      expect(projects[0]!.id).toBe("proj-1");
      expect(projects[1]!.id).toBe("proj-2");
    });

    it("should return empty array when no projects exist", async () => {
      mockReadFile.mockResolvedValue(makeInventoryJson([]));

      const projects = await getAllProjects();

      expect(projects).toHaveLength(0);
    });
  });

  describe("getProjectById", () => {
    it("should return the project when found", async () => {
      const project = makeTestProject({ id: "my-project" });
      mockReadFile.mockResolvedValue(makeInventoryJson([project]));

      const found = await getProjectById("my-project");

      expect(found).toBeDefined();
      expect(found!.id).toBe("my-project");
    });

    it("should return undefined when project not found", async () => {
      mockReadFile.mockResolvedValue(makeInventoryJson([]));

      const found = await getProjectById("nonexistent");

      expect(found).toBeUndefined();
    });
  });

  describe("addProject", () => {
    it("should add a project to the inventory and save", async () => {
      const existing = makeTestProject({ id: "existing" });
      mockReadFile.mockResolvedValue(makeInventoryJson([existing]));

      const newProject = makeTestProject({ id: "new-project", name: "New" });
      await addProject(newProject);

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written.projects).toHaveLength(2);
      expect(written.projects[1].id).toBe("new-project");
    });
  });

  describe("updateProject", () => {
    it("should replace an existing project and save", async () => {
      const project = makeTestProject({ id: "update-me", name: "Old Name" });
      mockReadFile.mockResolvedValue(makeInventoryJson([project]));

      const updated = makeTestProject({ id: "update-me", name: "New Name" });
      await updateProject(updated);

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written.projects).toHaveLength(1);
      expect(written.projects[0].name).toBe("New Name");
    });

    it("should throw when project is not found", async () => {
      mockReadFile.mockResolvedValue(makeInventoryJson([]));

      const project = makeTestProject({ id: "nonexistent" });
      await expect(updateProject(project)).rejects.toThrow(
        "Project not found: nonexistent"
      );
    });
  });
});
