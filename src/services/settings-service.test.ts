import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises before importing the module under test
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { readFile, writeFile, mkdir } from "fs/promises";
import {
  loadSettings,
  saveSettings,
  getProjectsRoot,
  getProjectsRootSource,
  setProjectsRoot,
} from "./settings-service.js";

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);

describe("settings-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // mkdir always succeeds
    mockMkdir.mockResolvedValue(undefined);
    // writeFile always succeeds
    mockWriteFile.mockResolvedValue(undefined);
    // Remove PROJECTS_ROOT env var so tests don't pick it up unexpectedly
    delete process.env.PROJECTS_ROOT;
  });

  describe("loadSettings", () => {
    it("should return parsed settings when file exists with valid JSON", async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ projectsRoot: "/some/path" })
      );

      const settings = await loadSettings();

      expect(settings).toEqual({ projectsRoot: "/some/path" });
      expect(mockMkdir).toHaveBeenCalledOnce();
    });

    it("should return empty object when file does not exist", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const settings = await loadSettings();

      expect(settings).toEqual({});
    });

    it("should return empty object when file contains invalid JSON", async () => {
      mockReadFile.mockResolvedValue("not json");

      const settings = await loadSettings();

      expect(settings).toEqual({});
    });

    it("should return empty object when file has extra fields (zod strips them)", async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ projectsRoot: "/path", unknownField: "value" })
      );

      const settings = await loadSettings();

      // Zod strips unknown fields in default mode
      expect(settings).toEqual({ projectsRoot: "/path" });
    });

    it("should return empty object for empty JSON object", async () => {
      mockReadFile.mockResolvedValue("{}");

      const settings = await loadSettings();

      expect(settings).toEqual({});
    });
  });

  describe("saveSettings", () => {
    it("should write settings as JSON to the file", async () => {
      await saveSettings({ projectsRoot: "/my/path" });

      expect(mockMkdir).toHaveBeenCalledOnce();
      expect(mockWriteFile).toHaveBeenCalledOnce();
      const writtenContent = mockWriteFile.mock.calls[0]![1] as string;
      expect(JSON.parse(writtenContent)).toEqual({ projectsRoot: "/my/path" });
    });

    it("should write empty settings correctly", async () => {
      await saveSettings({});

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const writtenContent = mockWriteFile.mock.calls[0]![1] as string;
      expect(JSON.parse(writtenContent)).toEqual({});
    });
  });

  describe("getProjectsRoot", () => {
    it("should return environment variable when PROJECTS_ROOT is set", async () => {
      process.env.PROJECTS_ROOT = "/env/path";

      const root = await getProjectsRoot();

      expect(root).toBe("/env/path");

      delete process.env.PROJECTS_ROOT;
    });

    it("should return settings value when env var is not set", async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ projectsRoot: "/settings/path" })
      );

      const root = await getProjectsRoot();

      expect(root).toBe("/settings/path");
    });

    it("should return undefined when neither env var nor settings are set", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const root = await getProjectsRoot();

      expect(root).toBeUndefined();
    });
  });

  describe("getProjectsRootSource", () => {
    it('should return "env" when PROJECTS_ROOT env var is set', async () => {
      process.env.PROJECTS_ROOT = "/env/path";

      const source = await getProjectsRootSource();

      expect(source).toBe("env");

      delete process.env.PROJECTS_ROOT;
    });

    it('should return "settings" when settings have projectsRoot', async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ projectsRoot: "/settings/path" })
      );

      const source = await getProjectsRootSource();

      expect(source).toBe("settings");
    });

    it('should return "none" when neither is configured', async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const source = await getProjectsRootSource();

      expect(source).toBe("none");
    });
  });

  describe("setProjectsRoot", () => {
    it("should save projectsRoot to settings file", async () => {
      // loadSettings is called first, so mock the readFile
      mockReadFile.mockResolvedValue(JSON.stringify({}));

      await setProjectsRoot("/new/root");

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const writtenContent = mockWriteFile.mock.calls[0]![1] as string;
      expect(JSON.parse(writtenContent)).toEqual({
        projectsRoot: "/new/root",
      });
    });

    it("should overwrite existing projectsRoot", async () => {
      mockReadFile.mockResolvedValue(
        JSON.stringify({ projectsRoot: "/old/path" })
      );

      await setProjectsRoot("/new/path");

      const writtenContent = mockWriteFile.mock.calls[0]![1] as string;
      expect(JSON.parse(writtenContent)).toEqual({
        projectsRoot: "/new/path",
      });
    });
  });
});
