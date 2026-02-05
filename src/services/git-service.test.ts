import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock child_process
vi.mock("child_process", () => ({
  exec: vi.fn(),
}));

import { exec } from "child_process";
import { getGitStatus, getRecentCommits, fetchRemote } from "./git-service.js";

const mockExec = vi.mocked(exec);

// Helper to make exec behave like the promisified version
function mockExecResolve(stdout: string) {
  mockExec.mockImplementation((_cmd: unknown, _opts: unknown, callback?: unknown) => {
    if (typeof _opts === "function") {
      // Two-arg form: exec(cmd, callback)
      (_opts as Function)(null, { stdout, stderr: "" });
    } else if (typeof callback === "function") {
      // Three-arg form: exec(cmd, opts, callback)
      (callback as Function)(null, { stdout, stderr: "" });
    }
    return {} as ReturnType<typeof exec>;
  });
}

function mockExecReject(error: string) {
  mockExec.mockImplementation((_cmd: unknown, _opts: unknown, callback?: unknown) => {
    if (typeof _opts === "function") {
      (_opts as Function)(new Error(error), { stdout: "", stderr: error });
    } else if (typeof callback === "function") {
      const err = new Error(error) as Error & { stderr: string };
      err.stderr = error;
      (callback as Function)(err, { stdout: "", stderr: error });
    }
    return {} as ReturnType<typeof exec>;
  });
}

// Helper that returns different responses for sequential calls
function mockExecSequence(responses: Array<{ stdout?: string; error?: string }>) {
  let callIndex = 0;
  mockExec.mockImplementation((_cmd: unknown, _opts: unknown, callback?: unknown) => {
    const response = responses[callIndex] ?? responses[responses.length - 1]!;
    callIndex++;
    const cb = typeof _opts === "function" ? _opts : callback;
    if (typeof cb === "function") {
      if (response.error) {
        const err = new Error(response.error) as Error & { stderr: string };
        err.stderr = response.error;
        (cb as Function)(err, { stdout: "", stderr: response.error });
      } else {
        (cb as Function)(null, { stdout: response.stdout ?? "", stderr: "" });
      }
    }
    return {} as ReturnType<typeof exec>;
  });
}

describe("git-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getGitStatus", () => {
    it("should parse a clean repo with remote tracking", async () => {
      mockExecSequence([
        { stdout: "main" },                    // rev-parse --abbrev-ref HEAD
        { stdout: "origin/main" },             // rev-parse --abbrev-ref main@{upstream}
        { stdout: "" },                        // status --porcelain (clean)
        { stdout: "0\t0" },                    // rev-list --left-right --count
      ]);

      const status = await getGitStatus("/test/path");

      expect(status.localBranch).toBe("main");
      expect(status.remoteBranch).toBe("origin/main");
      expect(status.isClean).toBe(true);
      expect(status.uncommittedChanges).toBe(0);
      expect(status.ahead).toBe(0);
      expect(status.behind).toBe(0);
    });

    it("should parse a dirty repo with uncommitted changes", async () => {
      mockExecSequence([
        { stdout: "feature" },                 // rev-parse --abbrev-ref HEAD
        { stdout: "origin/feature" },          // upstream
        { stdout: " M file1.ts\n M file2.ts\n?? new.ts" }, // porcelain
        { stdout: "2\t1" },                    // ahead/behind
      ]);

      const status = await getGitStatus("/test/path");

      expect(status.localBranch).toBe("feature");
      expect(status.isClean).toBe(false);
      expect(status.uncommittedChanges).toBe(3);
      expect(status.ahead).toBe(2);
      expect(status.behind).toBe(1);
    });

    it("should handle no upstream branch", async () => {
      mockExecSequence([
        { stdout: "feature-no-remote" },       // branch name
        { error: "fatal: no upstream" },       // no upstream
        { stdout: "" },                        // clean
      ]);

      const status = await getGitStatus("/test/path");

      expect(status.localBranch).toBe("feature-no-remote");
      expect(status.remoteBranch).toBeNull();
      expect(status.ahead).toBe(0);
      expect(status.behind).toBe(0);
    });
  });

  describe("getRecentCommits", () => {
    it("should parse git log output into commits", async () => {
      const logOutput = [
        "abc123|feat: add feature|2024-01-15T10:00:00+00:00|Alice",
        "def456|fix: bug fix|2024-01-14T09:00:00+00:00|Bob",
      ].join("\n");

      mockExecResolve(logOutput);

      const commits = await getRecentCommits("/test/path", 2);

      expect(commits).toHaveLength(2);
      expect(commits[0]).toEqual({
        hash: "abc123",
        message: "feat: add feature",
        date: "2024-01-15T10:00:00+00:00",
        author: "Alice",
      });
      expect(commits[1]).toEqual({
        hash: "def456",
        message: "fix: bug fix",
        date: "2024-01-14T09:00:00+00:00",
        author: "Bob",
      });
    });

    it("should return empty array when no commits exist", async () => {
      mockExecResolve("");

      const commits = await getRecentCommits("/test/path");

      expect(commits).toEqual([]);
    });

    it("should handle single commit", async () => {
      mockExecResolve("abc123|initial commit|2024-01-01T00:00:00+00:00|Dev");

      const commits = await getRecentCommits("/test/path", 1);

      expect(commits).toHaveLength(1);
      expect(commits[0]!.hash).toBe("abc123");
    });
  });

  describe("fetchRemote", () => {
    it("should not throw when fetch succeeds", async () => {
      mockExecResolve("");

      await expect(fetchRemote("/test/path")).resolves.toBeUndefined();
    });

    it("should not throw when fetch fails (no remote)", async () => {
      mockExecReject("fatal: no remote");

      await expect(fetchRemote("/test/path")).resolves.toBeUndefined();
    });
  });
});
