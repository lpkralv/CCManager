import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted variables - available inside vi.mock factories
// ---------------------------------------------------------------------------
const {
  mockGetProjectById,
  mockAddTaskToHistory,
  mockSpawnClaude,
  MockClaudeProcess,
  allMockProcesses,
  uuidState,
} = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { EventEmitter } = require("events") as typeof import("events");

  class _MockClaudeProcess extends EventEmitter {
    kill = vi.fn();
    getOutput = vi.fn().mockReturnValue("");
    getErrorOutput = vi.fn().mockReturnValue("");
    isRunning = vi.fn().mockReturnValue(true);
  }

  const _allMockProcesses: InstanceType<typeof _MockClaudeProcess>[] = [];

  const _mockGetProjectById = vi.fn();
  const _mockAddTaskToHistory = vi.fn().mockResolvedValue(undefined);

  const _mockSpawnClaude = vi.fn().mockImplementation(() => {
    const proc = new _MockClaudeProcess();
    _allMockProcesses.push(proc);
    return proc;
  });

  const _uuidState = { counter: 0 };

  return {
    mockGetProjectById: _mockGetProjectById,
    mockAddTaskToHistory: _mockAddTaskToHistory,
    mockSpawnClaude: _mockSpawnClaude,
    MockClaudeProcess: _MockClaudeProcess,
    allMockProcesses: _allMockProcesses,
    uuidState: _uuidState,
  };
});

// ---------------------------------------------------------------------------
// Mock: uuid
// ---------------------------------------------------------------------------
vi.mock("uuid", () => ({
  v4: () => {
    uuidState.counter += 1;
    return `test-uuid-${uuidState.counter}`;
  },
}));

// ---------------------------------------------------------------------------
// Mock: project-service
// ---------------------------------------------------------------------------
vi.mock("./project-service.js", () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

// ---------------------------------------------------------------------------
// Mock: history-service
// ---------------------------------------------------------------------------
vi.mock("./history-service.js", () => ({
  addTaskToHistory: (...args: unknown[]) => mockAddTaskToHistory(...args),
}));

// ---------------------------------------------------------------------------
// Mock: process-spawner
// ---------------------------------------------------------------------------
vi.mock("./process-spawner.js", () => ({
  spawnClaude: (...args: unknown[]) => mockSpawnClaude(...args),
  ClaudeProcess: MockClaudeProcess,
}));

// ---------------------------------------------------------------------------
// Import the module under test (after all vi.mock calls)
// ---------------------------------------------------------------------------
import { taskManager, type TaskEvent } from "./task-manager.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const FAKE_PROJECT = {
  id: "proj-1",
  name: "TestProject",
  path: "/tmp/test-project",
};

function defaultInput(overrides: Record<string, unknown> = {}) {
  return {
    projectId: "proj-1",
    prompt: "Do something useful",
    maxBudget: 1.0,
    ...overrides,
  };
}

/**
 * Drains the microtask queue so that async processQueue / startTask calls
 * settle before assertions run.
 */
async function flushPromises(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Forces the singleton back to a clean state between tests by cancelling
 * every active task via the public API.
 */
function resetTaskManager(): void {
  for (const task of taskManager.getActiveTasks()) {
    taskManager.cancelTask(task.id);
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("TaskManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uuidState.counter = 0;
    allMockProcesses.length = 0;
    resetTaskManager();

    // Default: project always found
    mockGetProjectById.mockResolvedValue(FAKE_PROJECT);
  });

  afterEach(() => {
    resetTaskManager();
  });

  // -----------------------------------------------------------------------
  // createTask
  // -----------------------------------------------------------------------
  describe("createTask", () => {
    it("should create a task with the correct fields", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      expect(task.id).toBe("test-uuid-1");
      expect(task.projectId).toBe("proj-1");
      expect(task.prompt).toBe("Do something useful");
      expect(task.maxBudget).toBe(1.0);
      expect(task.output).toBe("");
      expect(task.createdAt).toBeInstanceOf(Date);
    });

    it("should throw if the project is not found", async () => {
      mockGetProjectById.mockResolvedValue(undefined);

      await expect(
        taskManager.createTask(defaultInput({ projectId: "nonexistent" }))
      ).rejects.toThrow("Project not found: nonexistent");
    });

    it("should emit a task:created event", async () => {
      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      await taskManager.createTask(defaultInput());
      await flushPromises();

      taskManager.off("event", handler);

      const createdEvents = events.filter((e) => e.type === "task:created");
      expect(createdEvents).toHaveLength(1);
      expect(createdEvents[0]!.type).toBe("task:created");
      if (createdEvents[0]!.type === "task:created") {
        expect(createdEvents[0]!.task.id).toBe("test-uuid-1");
      }
    });

    it("should trigger processQueue and start the task when under the concurrency limit", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      expect(mockSpawnClaude).toHaveBeenCalledTimes(1);
      expect(mockSpawnClaude).toHaveBeenCalledWith({
        cwd: FAKE_PROJECT.path,
        prompt: "Do something useful",
        maxBudget: 1.0,
      });
      expect(task.status).toBe("running");
    });
  });

  // -----------------------------------------------------------------------
  // processQueue - concurrency limit
  // -----------------------------------------------------------------------
  describe("processQueue", () => {
    it("should respect MAX_CONCURRENT_TASKS of 3", async () => {
      for (let i = 0; i < 5; i++) {
        await taskManager.createTask(
          defaultInput({ prompt: `Task ${i}` })
        );
        await flushPromises();
      }

      expect(taskManager.getRunningCount()).toBe(3);
      expect(taskManager.getPendingCount()).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // startTask
  // -----------------------------------------------------------------------
  describe("startTask", () => {
    it("should set the task to running and emit task:started", async () => {
      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      taskManager.off("event", handler);

      expect(task.status).toBe("running");
      expect(task.startedAt).toBeInstanceOf(Date);

      const startedEvents = events.filter((e) => e.type === "task:started");
      expect(startedEvents).toHaveLength(1);
    });

    it("should accumulate output from the process", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("output", "Hello ");
      proc.emit("output", "World");

      expect(task.output).toBe("Hello World");
    });

    it("should emit task:output events for each output chunk", async () => {
      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("output", "chunk1");
      proc.emit("output", "chunk2");

      taskManager.off("event", handler);

      const outputEvents = events.filter((e) => e.type === "task:output");
      expect(outputEvents).toHaveLength(2);
      if (outputEvents[0]!.type === "task:output") {
        expect(outputEvents[0]!.output).toBe("chunk1");
      }
    });

    it("should handle successful completion (exit code 0)", async () => {
      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("output", "result data");
      proc.emit("exit", 0);
      await flushPromises();

      taskManager.off("event", handler);

      expect(task.status).toBe("completed");
      expect(task.completedAt).toBeInstanceOf(Date);
      expect(task.durationMs).toBeTypeOf("number");

      const completedEvents = events.filter(
        (e) => e.type === "task:completed"
      );
      expect(completedEvents).toHaveLength(1);

      expect(mockAddTaskToHistory).toHaveBeenCalledWith(task);
    });

    it("should handle failure with non-zero exit code", async () => {
      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("exit", 1);
      await flushPromises();

      taskManager.off("event", handler);

      expect(task.status).toBe("failed");
      expect(task.error).toBe("Process exited with code 1");

      const failedEvents = events.filter((e) => e.type === "task:failed");
      expect(failedEvents).toHaveLength(1);

      expect(mockAddTaskToHistory).toHaveBeenCalledWith(task);
    });

    it("should retry on max turns exceeded when retryCount < MAX_RETRIES", async () => {
      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("error", "Error: max_turns limit reached");
      proc.emit("exit", 1);
      await flushPromises();

      taskManager.off("event", handler);

      const retryingEvents = events.filter((e) => e.type === "task:retrying");
      expect(retryingEvents).toHaveLength(1);

      // Task should have been reset and restarted
      expect(task.retryCount).toBe(1);
      expect(task.status).toBe("running");
      expect(task.error).toBeUndefined();
    });

    it("should double the maxBudget on retry", async () => {
      const task = await taskManager.createTask(
        defaultInput({ maxBudget: 2.0 })
      );
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("error", "max turns exceeded");
      proc.emit("exit", 1);
      await flushPromises();

      expect(task.maxBudget).toBe(4.0);

      // A second process should have been spawned for the retry
      expect(mockSpawnClaude).toHaveBeenCalledTimes(2);
      expect(mockSpawnClaude).toHaveBeenLastCalledWith(
        expect.objectContaining({ maxBudget: 4.0 })
      );
    });

    it("should stop retrying after MAX_RETRIES (2) and mark as failed", async () => {
      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      // First failure -> retry 1
      allMockProcesses[0]!.emit("error", "max turns hit");
      allMockProcesses[0]!.emit("exit", 1);
      await flushPromises();
      expect(task.retryCount).toBe(1);

      // Second failure -> retry 2
      allMockProcesses[1]!.emit("error", "max turns hit");
      allMockProcesses[1]!.emit("exit", 1);
      await flushPromises();
      expect(task.retryCount).toBe(2);

      // Third failure -> should NOT retry, should fail
      allMockProcesses[2]!.emit("error", "max turns hit");
      allMockProcesses[2]!.emit("exit", 1);
      await flushPromises();

      taskManager.off("event", handler);

      expect(task.status).toBe("failed");
      expect(task.retryCount).toBe(2);

      const retryingEvents = events.filter((e) => e.type === "task:retrying");
      expect(retryingEvents).toHaveLength(2);

      const failedEvents = events.filter((e) => e.type === "task:failed");
      expect(failedEvents).toHaveLength(1);

      expect(mockAddTaskToHistory).toHaveBeenCalledWith(task);
    });

    it("should fail if the project is not found during startTask", async () => {
      // Project exists at createTask time but disappears at startTask time
      mockGetProjectById
        .mockResolvedValueOnce(FAKE_PROJECT) // createTask lookup
        .mockResolvedValueOnce(undefined); // startTask lookup

      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      taskManager.off("event", handler);

      expect(task.status).toBe("failed");
      expect(task.error).toBe("Project not found: proj-1");

      const failedEvents = events.filter((e) => e.type === "task:failed");
      expect(failedEvents).toHaveLength(1);

      // spawnClaude should NOT have been called
      expect(mockSpawnClaude).not.toHaveBeenCalled();

      expect(mockAddTaskToHistory).toHaveBeenCalledWith(task);
    });

    it("should accumulate error output on the task", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("error", "err1 ");
      proc.emit("error", "err2");

      expect(task.error).toBe("err1 err2");
    });
  });

  // -----------------------------------------------------------------------
  // cancelTask
  // -----------------------------------------------------------------------
  describe("cancelTask", () => {
    it("should cancel a pending task", async () => {
      // Fill up the concurrency slots
      for (let i = 0; i < 3; i++) {
        await taskManager.createTask(defaultInput({ prompt: `fill-${i}` }));
        await flushPromises();
      }

      // 4th task stays pending
      const pendingTask = await taskManager.createTask(
        defaultInput({ prompt: "I will be cancelled" })
      );
      await flushPromises();

      expect(pendingTask.status).toBe("pending");

      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const result = taskManager.cancelTask(pendingTask.id);

      taskManager.off("event", handler);

      expect(result).toBe(true);
      expect(pendingTask.status).toBe("cancelled");
      expect(pendingTask.completedAt).toBeInstanceOf(Date);

      const cancelledEvents = events.filter(
        (e) => e.type === "task:cancelled"
      );
      expect(cancelledEvents).toHaveLength(1);

      expect(mockAddTaskToHistory).toHaveBeenCalledWith(pendingTask);
    });

    it("should cancel a running task and kill the process", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      expect(task.status).toBe("running");

      const events: TaskEvent[] = [];
      const handler = (e: TaskEvent) => events.push(e);
      taskManager.on("event", handler);

      const result = taskManager.cancelTask(task.id);

      taskManager.off("event", handler);

      expect(result).toBe(true);
      expect(task.status).toBe("cancelled");
      expect(task.completedAt).toBeInstanceOf(Date);

      const proc = allMockProcesses[0]!;
      expect(proc.kill).toHaveBeenCalledTimes(1);

      expect(taskManager.getRunningCount()).toBe(0);

      const cancelledEvents = events.filter(
        (e) => e.type === "task:cancelled"
      );
      expect(cancelledEvents).toHaveLength(1);

      expect(mockAddTaskToHistory).toHaveBeenCalledWith(task);
    });

    it("should return false for an unknown task ID", () => {
      const result = taskManager.cancelTask("nonexistent-id");
      expect(result).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // getTask
  // -----------------------------------------------------------------------
  describe("getTask", () => {
    it("should find a pending task", async () => {
      // Fill up concurrency
      for (let i = 0; i < 3; i++) {
        await taskManager.createTask(defaultInput({ prompt: `fill-${i}` }));
        await flushPromises();
      }

      const pendingTask = await taskManager.createTask(
        defaultInput({ prompt: "pending one" })
      );
      await flushPromises();

      const found = taskManager.getTask(pendingTask.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(pendingTask.id);
      expect(found!.status).toBe("pending");
    });

    it("should find a running task", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const found = taskManager.getTask(task.id);
      expect(found).toBeDefined();
      expect(found!.id).toBe(task.id);
      expect(found!.status).toBe("running");
    });

    it("should return undefined for an unknown task ID", () => {
      const found = taskManager.getTask("does-not-exist");
      expect(found).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // getActiveTasks
  // -----------------------------------------------------------------------
  describe("getActiveTasks", () => {
    it("should return both running and pending tasks", async () => {
      for (let i = 0; i < 4; i++) {
        await taskManager.createTask(defaultInput({ prompt: `task-${i}` }));
        await flushPromises();
      }

      const active = taskManager.getActiveTasks();
      expect(active).toHaveLength(4);

      const running = active.filter((t) => t.status === "running");
      const pending = active.filter((t) => t.status === "pending");

      expect(running).toHaveLength(3);
      expect(pending).toHaveLength(1);
    });

    it("should return running tasks before pending tasks", async () => {
      for (let i = 0; i < 4; i++) {
        await taskManager.createTask(defaultInput({ prompt: `task-${i}` }));
        await flushPromises();
      }

      const active = taskManager.getActiveTasks();

      // getActiveTasks returns [...running, ...pending]
      const statuses = active.map((t) => t.status);
      const firstPendingIndex = statuses.indexOf("pending");
      const lastRunningIndex = statuses.lastIndexOf("running");

      if (firstPendingIndex !== -1 && lastRunningIndex !== -1) {
        expect(lastRunningIndex).toBeLessThan(firstPendingIndex);
      }
    });

    it("should return an empty array when no tasks exist", () => {
      const active = taskManager.getActiveTasks();
      expect(active).toEqual([]);
    });
  });

  // -----------------------------------------------------------------------
  // getPendingCount / getRunningCount
  // -----------------------------------------------------------------------
  describe("getPendingCount and getRunningCount", () => {
    it("should return correct counts", async () => {
      expect(taskManager.getPendingCount()).toBe(0);
      expect(taskManager.getRunningCount()).toBe(0);

      for (let i = 0; i < 5; i++) {
        await taskManager.createTask(defaultInput({ prompt: `task-${i}` }));
        await flushPromises();
      }

      expect(taskManager.getRunningCount()).toBe(3);
      expect(taskManager.getPendingCount()).toBe(2);
    });

    it("should update counts when a task completes and queue drains", async () => {
      for (let i = 0; i < 4; i++) {
        await taskManager.createTask(defaultInput({ prompt: `task-${i}` }));
        await flushPromises();
      }

      expect(taskManager.getRunningCount()).toBe(3);
      expect(taskManager.getPendingCount()).toBe(1);

      // Complete the first running task -> pending task should start
      allMockProcesses[0]!.emit("exit", 0);
      await flushPromises();

      expect(taskManager.getRunningCount()).toBe(3);
      expect(taskManager.getPendingCount()).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Queue draining after cancel
  // -----------------------------------------------------------------------
  describe("queue draining", () => {
    it("should start a pending task when a running task is cancelled", async () => {
      for (let i = 0; i < 4; i++) {
        await taskManager.createTask(defaultInput({ prompt: `task-${i}` }));
        await flushPromises();
      }

      expect(taskManager.getRunningCount()).toBe(3);
      expect(taskManager.getPendingCount()).toBe(1);

      const activeBefore = taskManager.getActiveTasks();
      const runningTask = activeBefore.find(
        (t) => t.status === "running"
      )!;
      taskManager.cancelTask(runningTask.id);
      await flushPromises();

      // The formerly-pending task should have been promoted to running
      expect(taskManager.getRunningCount()).toBe(3);
      expect(taskManager.getPendingCount()).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe("edge cases", () => {
    it("should use default error message when no error text is present on failure", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("exit", 42);
      await flushPromises();

      expect(task.status).toBe("failed");
      expect(task.error).toBe("Process exited with code 42");
    });

    it("should not retry when error text does not match the max turns pattern", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      proc.emit("error", "some unrelated error");
      proc.emit("exit", 1);
      await flushPromises();

      expect(task.status).toBe("failed");
      expect(task.retryCount).toBeUndefined();
    });

    it("should match various max_turns pattern formats in output text", async () => {
      const task = await taskManager.createTask(defaultInput());
      await flushPromises();

      const proc = allMockProcesses[0]!;
      // Pattern /max.?turns/i matches "MaxTurns"
      proc.emit("output", "Hit the MaxTurns limit");
      proc.emit("exit", 1);
      await flushPromises();

      expect(task.retryCount).toBe(1);
    });
  });
});
