import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock fs/promises before importing the module under test
vi.mock("fs/promises", () => ({
  readdir: vi.fn(),
  readFile: vi.fn(),
  stat: vi.fn(),
}));

import { readdir, readFile, stat } from "fs/promises";
import { getDoWorkQueue } from "./dowork-service.js";

const mockReaddir = vi.mocked(readdir);
const mockReadFile = vi.mocked(readFile);
const mockStat = vi.mocked(stat);

// Minimal stat object for files
function fileStat(birthtime = new Date("2024-01-01")): ReturnType<typeof stat> {
  return Promise.resolve({
    isDirectory: () => false,
    isFile: () => true,
    birthtime,
  } as unknown as Awaited<ReturnType<typeof stat>>);
}

// Minimal stat object for directories
function dirStat(): ReturnType<typeof stat> {
  return Promise.resolve({
    isDirectory: () => true,
    isFile: () => false,
    birthtime: new Date("2024-01-01"),
  } as unknown as Awaited<ReturnType<typeof stat>>);
}

describe("dowork-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getDoWorkQueue", () => {
    it("should return null when do-work directory does not exist", async () => {
      mockStat.mockRejectedValue(new Error("ENOENT"));

      const result = await getDoWorkQueue("/test/project");

      expect(result).toBeNull();
    });

    it("should return empty queues when do-work exists but is empty", async () => {
      // First stat call: do-work dir exists
      mockStat.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("do-work")) {
          return dirStat();
        }
        // Sub-dirs don't exist
        return Promise.reject(new Error("ENOENT"));
      });

      // readdir for the main do-work dir returns empty
      mockReaddir.mockResolvedValue([] as unknown as Awaited<ReturnType<typeof readdir>>);

      const result = await getDoWorkQueue("/test/project");

      expect(result).not.toBeNull();
      expect(result!.pending).toEqual([]);
      expect(result!.working).toEqual([]);
      expect(result!.recentArchive).toEqual([]);
    });

    it("should parse pending requests with YAML frontmatter", async () => {
      // do-work dir exists; sub-dirs do not
      mockStat.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("do-work") || p.endsWith("REQ-001.md")) {
          if (p.endsWith(".md")) return fileStat();
          return dirStat();
        }
        return Promise.reject(new Error("ENOENT"));
      });

      // readdir returns one markdown file for the main dir, nothing for subdirs
      mockReaddir.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("do-work") && !p.includes("working") && !p.includes("archive")) {
          return Promise.resolve(["REQ-001.md"] as unknown as Awaited<ReturnType<typeof readdir>>);
        }
        return Promise.reject(new Error("ENOENT"));
      });

      mockReadFile.mockResolvedValue(
        `---
title: "Fix the bug"
status: pending
created: 2024-01-15
---

Some request content here.
`
      );

      const result = await getDoWorkQueue("/test/project");

      expect(result).not.toBeNull();
      expect(result!.pending).toHaveLength(1);
      expect(result!.pending[0]!.title).toBe("Fix the bug");
      expect(result!.pending[0]!.status).toBe("pending");
      expect(result!.pending[0]!.id).toBe("REQ-001");
    });

    it("should use filename as title when no frontmatter title", async () => {
      mockStat.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("do-work") || p.endsWith("my-task.md")) {
          if (p.endsWith(".md")) return fileStat();
          return dirStat();
        }
        return Promise.reject(new Error("ENOENT"));
      });

      mockReaddir.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("do-work") && !p.includes("working") && !p.includes("archive")) {
          return Promise.resolve(["my-task.md"] as unknown as Awaited<ReturnType<typeof readdir>>);
        }
        return Promise.reject(new Error("ENOENT"));
      });

      mockReadFile.mockResolvedValue("Just some content, no frontmatter.");

      const result = await getDoWorkQueue("/test/project");

      expect(result!.pending).toHaveLength(1);
      expect(result!.pending[0]!.title).toBe("my-task");
      expect(result!.pending[0]!.id).toBe("my-task");
    });

    it("should skip hidden files and non-markdown files", async () => {
      mockStat.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("do-work") || p.endsWith(".md")) {
          if (p.endsWith(".md")) return fileStat();
          return dirStat();
        }
        return Promise.reject(new Error("ENOENT"));
      });

      mockReaddir.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("do-work") && !p.includes("working") && !p.includes("archive")) {
          return Promise.resolve([
            ".hidden.md",
            "readme.txt",
            "valid.md",
          ] as unknown as Awaited<ReturnType<typeof readdir>>);
        }
        return Promise.reject(new Error("ENOENT"));
      });

      mockReadFile.mockResolvedValue("content");

      const result = await getDoWorkQueue("/test/project");

      expect(result!.pending).toHaveLength(1);
      expect(result!.pending[0]!.id).toBe("valid");
    });

    it("should return working and archive items when directories exist", async () => {
      // All three dirs exist
      mockStat.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.includes("do-work")) {
          if (p.endsWith(".md")) return fileStat();
          return dirStat();
        }
        return Promise.reject(new Error("ENOENT"));
      });

      mockReaddir.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("working")) {
          return Promise.resolve(["work-1.md"] as unknown as Awaited<ReturnType<typeof readdir>>);
        }
        if (p.endsWith("archive")) {
          return Promise.resolve(["done-1.md"] as unknown as Awaited<ReturnType<typeof readdir>>);
        }
        // Main do-work dir is empty
        return Promise.resolve([] as unknown as Awaited<ReturnType<typeof readdir>>);
      });

      mockReadFile.mockResolvedValue("content");

      const result = await getDoWorkQueue("/test/project");

      expect(result!.pending).toHaveLength(0);
      expect(result!.working).toHaveLength(1);
      expect(result!.working[0]!.id).toBe("work-1");
      expect(result!.recentArchive).toHaveLength(1);
      expect(result!.recentArchive[0]!.id).toBe("done-1");
    });

    it("should limit archive to 10 most recent items", async () => {
      mockStat.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.includes("do-work")) {
          if (p.endsWith(".md")) return fileStat();
          return dirStat();
        }
        return Promise.reject(new Error("ENOENT"));
      });

      const archiveFiles = Array.from({ length: 15 }, (_, i) => `done-${i}.md`);
      mockReaddir.mockImplementation((pathArg) => {
        const p = pathArg as string;
        if (p.endsWith("archive")) {
          return Promise.resolve(archiveFiles as unknown as Awaited<ReturnType<typeof readdir>>);
        }
        return Promise.resolve([] as unknown as Awaited<ReturnType<typeof readdir>>);
      });

      // Each file has a different completedAt
      mockReadFile.mockImplementation((pathArg) => {
        const p = pathArg as string;
        const match = p.match(/done-(\d+)\.md/);
        const idx = match ? parseInt(match[1]!) : 0;
        return Promise.resolve(`---
title: "Task ${idx}"
completedAt: 2024-01-${String(idx + 1).padStart(2, "0")}
---
Content`);
      });

      const result = await getDoWorkQueue("/test/project");

      expect(result!.recentArchive).toHaveLength(10);
    });
  });
});
