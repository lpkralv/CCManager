import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

// Mock child_process
vi.mock("child_process", () => ({
  spawn: vi.fn(),
}));

import { spawn } from "child_process";
import { ClaudeProcess, spawnClaude, SpawnOptions } from "./process-spawner.js";

const mockSpawn = vi.mocked(spawn);

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  kill = vi.fn().mockImplementation(() => {
    this.killed = true;
  });
}

function createMockProcess(): MockChildProcess {
  const mock = new MockChildProcess();
  mockSpawn.mockReturnValue(mock as unknown as ReturnType<typeof spawn>);
  return mock;
}

const defaultOptions: SpawnOptions = {
  cwd: "/tmp/test-project",
  prompt: "Fix the bug",
};

describe("ClaudeProcess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("stores the provided options", () => {
      const options: SpawnOptions = {
        cwd: "/some/path",
        prompt: "Do something",
        maxBudget: 3,
      };
      const proc = new ClaudeProcess(options);

      // Verify initial state before start
      expect(proc.getOutput()).toBe("");
      expect(proc.getErrorOutput()).toBe("");
      expect(proc.isRunning()).toBe(false);
    });
  });

  describe("start()", () => {
    it("spawns claude with correct args when no maxBudget is provided", () => {
      createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      expect(mockSpawn).toHaveBeenCalledOnce();
      expect(mockSpawn).toHaveBeenCalledWith(
        "claude",
        ["-p", "Fix the bug", "--dangerously-skip-permissions", "--verbose"],
        {
          cwd: "/tmp/test-project",
          env: expect.objectContaining({}),
          stdio: ["ignore", "pipe", "pipe"],
        },
      );
    });

    it("includes --max-turns when maxBudget is provided", () => {
      createMockProcess();
      const proc = new ClaudeProcess({ ...defaultOptions, maxBudget: 5 });
      proc.start();

      const args = mockSpawn.mock.calls[0]![1] as string[];
      expect(args).toContain("--max-turns");
      expect(args).toContain("50");
    });

    it("enforces a minimum of 25 turns for small maxBudget values", () => {
      createMockProcess();
      // maxBudget=0.5 => ceil(0.5*10)=5, but Math.max(25,5)=25
      const proc = new ClaudeProcess({ ...defaultOptions, maxBudget: 0.5 });
      proc.start();

      const args = mockSpawn.mock.calls[0]![1] as string[];
      expect(args).toContain("--max-turns");
      expect(args).toContain("25");
    });

    it("calculates max-turns correctly for higher budgets", () => {
      createMockProcess();
      // maxBudget=10 => ceil(10*10)=100, Math.max(25,100)=100
      const proc = new ClaudeProcess({ ...defaultOptions, maxBudget: 10 });
      proc.start();

      const args = mockSpawn.mock.calls[0]![1] as string[];
      expect(args).toContain("--max-turns");
      expect(args).toContain("100");
    });

    it("always appends --verbose as the last argument", () => {
      createMockProcess();
      const proc = new ClaudeProcess({ ...defaultOptions, maxBudget: 3 });
      proc.start();

      const args = mockSpawn.mock.calls[0]![1] as string[];
      expect(args[args.length - 1]).toBe("--verbose");
    });
  });

  describe("stdout handling", () => {
    it("accumulates output and emits 'output' events on stdout data", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      const outputHandler = vi.fn();
      proc.on("output", outputHandler);

      mockChild.stdout.emit("data", Buffer.from("Hello "));
      mockChild.stdout.emit("data", Buffer.from("World"));

      expect(proc.getOutput()).toBe("Hello World");
      expect(outputHandler).toHaveBeenCalledTimes(2);
      expect(outputHandler).toHaveBeenNthCalledWith(1, "Hello ");
      expect(outputHandler).toHaveBeenNthCalledWith(2, "World");
    });
  });

  describe("stderr handling", () => {
    it("accumulates error output and emits 'error' events on stderr data", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      const errorHandler = vi.fn();
      proc.on("error", errorHandler);

      mockChild.stderr.emit("data", Buffer.from("Warning: "));
      mockChild.stderr.emit("data", Buffer.from("something happened"));

      expect(proc.getErrorOutput()).toBe("Warning: something happened");
      expect(errorHandler).toHaveBeenCalledTimes(2);
      expect(errorHandler).toHaveBeenNthCalledWith(1, "Warning: ");
      expect(errorHandler).toHaveBeenNthCalledWith(2, "something happened");
    });
  });

  describe("process exit", () => {
    it("emits 'exit' event with code and signal when the process exits", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      const exitHandler = vi.fn();
      proc.on("exit", exitHandler);

      mockChild.emit("exit", 0, null);

      expect(exitHandler).toHaveBeenCalledOnce();
      expect(exitHandler).toHaveBeenCalledWith(0, null);
    });

    it("emits 'exit' with signal when killed by a signal", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      const exitHandler = vi.fn();
      proc.on("exit", exitHandler);

      mockChild.emit("exit", null, "SIGTERM");

      expect(exitHandler).toHaveBeenCalledWith(null, "SIGTERM");
    });
  });

  describe("process error", () => {
    it("emits 'error' with the error message then 'exit' with code 1", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      const errorHandler = vi.fn();
      const exitHandler = vi.fn();
      proc.on("error", errorHandler);
      proc.on("exit", exitHandler);

      mockChild.emit("error", new Error("spawn ENOENT"));

      expect(errorHandler).toHaveBeenCalledWith("spawn ENOENT");
      expect(exitHandler).toHaveBeenCalledWith(1, null);
    });
  });

  describe("kill()", () => {
    it("sends SIGTERM to a running process", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      proc.kill();

      expect(mockChild.kill).toHaveBeenCalledOnce();
      expect(mockChild.kill).toHaveBeenCalledWith("SIGTERM");
    });

    it("does nothing if the process is already killed", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      // Simulate already killed
      mockChild.killed = true;

      proc.kill();

      expect(mockChild.kill).not.toHaveBeenCalled();
    });

    it("does nothing if the process was never started", () => {
      const proc = new ClaudeProcess(defaultOptions);

      // Should not throw
      proc.kill();

      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });

  describe("getOutput() / getErrorOutput()", () => {
    it("returns empty strings before any data is received", () => {
      createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      expect(proc.getOutput()).toBe("");
      expect(proc.getErrorOutput()).toBe("");
    });

    it("returns accumulated strings after receiving data", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      // Must listen for "error" events to prevent unhandled error throws
      proc.on("error", () => {});

      mockChild.stdout.emit("data", Buffer.from("line1\n"));
      mockChild.stdout.emit("data", Buffer.from("line2\n"));
      mockChild.stderr.emit("data", Buffer.from("err1\n"));

      expect(proc.getOutput()).toBe("line1\nline2\n");
      expect(proc.getErrorOutput()).toBe("err1\n");
    });
  });

  describe("isRunning()", () => {
    it("returns false before start() is called", () => {
      const proc = new ClaudeProcess(defaultOptions);
      expect(proc.isRunning()).toBe(false);
    });

    it("returns true after start() when process is alive", () => {
      createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      expect(proc.isRunning()).toBe(true);
    });

    it("returns false after the process has been killed", () => {
      const mockChild = createMockProcess();
      const proc = new ClaudeProcess(defaultOptions);
      proc.start();

      proc.kill();

      expect(mockChild.killed).toBe(true);
      expect(proc.isRunning()).toBe(false);
    });
  });
});

describe("spawnClaude()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a ClaudeProcess, calls start(), and returns it", () => {
    createMockProcess();
    const result = spawnClaude(defaultOptions);

    expect(result).toBeInstanceOf(ClaudeProcess);
    expect(mockSpawn).toHaveBeenCalledOnce();
    expect(result.isRunning()).toBe(true);
  });

  it("passes options through to the underlying spawn call", () => {
    createMockProcess();
    const options: SpawnOptions = {
      cwd: "/my/project",
      prompt: "Refactor the module",
      maxBudget: 7,
    };

    spawnClaude(options);

    expect(mockSpawn).toHaveBeenCalledWith(
      "claude",
      expect.arrayContaining(["-p", "Refactor the module", "--max-turns", "70"]),
      expect.objectContaining({ cwd: "/my/project" }),
    );
  });
});
