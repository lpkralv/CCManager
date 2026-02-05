import { describe, it, expect, vi, beforeEach } from "vitest";
import { makeTestTask } from "../test-helpers.js";

// Mock fs/promises before importing the module under test
vi.mock("fs/promises", () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

import { readFile, writeFile, mkdir } from "fs/promises";
import {
  loadHistory,
  saveHistory,
  addTaskToHistory,
  getCompletedTasks,
} from "./history-service.js";

const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);

function makeHistoryJson(tasks = [makeTestTask()]) {
  return JSON.stringify({
    tasks,
    lastUpdated: new Date("2024-01-01").toISOString(),
  });
}

describe("history-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe("loadHistory", () => {
    it("should return parsed history when file exists", async () => {
      const task = makeTestTask();
      mockReadFile.mockResolvedValue(makeHistoryJson([task]));

      const history = await loadHistory();

      expect(history.tasks).toHaveLength(1);
      expect(history.tasks[0]!.id).toBe(task.id);
    });

    it("should return empty history when file does not exist", async () => {
      mockReadFile.mockRejectedValue(new Error("ENOENT"));

      const history = await loadHistory();

      expect(history.tasks).toHaveLength(0);
      expect(history.lastUpdated).toBeInstanceOf(Date);
    });

    it("should return empty history when file is invalid JSON", async () => {
      mockReadFile.mockResolvedValue("invalid-json");

      const history = await loadHistory();

      expect(history.tasks).toHaveLength(0);
    });
  });

  describe("saveHistory", () => {
    it("should write history JSON and update lastUpdated", async () => {
      const history = {
        tasks: [makeTestTask()],
        lastUpdated: new Date("2024-01-01"),
      };

      await saveHistory(history);

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written.tasks).toHaveLength(1);
    });
  });

  describe("addTaskToHistory", () => {
    it("should add a new task to history", async () => {
      mockReadFile.mockResolvedValue(makeHistoryJson([]));

      const task = makeTestTask({ id: "550e8400-e29b-41d4-a716-446655440001" });
      await addTaskToHistory(task);

      expect(mockWriteFile).toHaveBeenCalledOnce();
      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written.tasks).toHaveLength(1);
      expect(written.tasks[0].id).toBe("550e8400-e29b-41d4-a716-446655440001");
    });

    it("should update existing task with same ID", async () => {
      const existingTask = makeTestTask({ status: "pending" });
      mockReadFile.mockResolvedValue(makeHistoryJson([existingTask]));

      const updatedTask = makeTestTask({ status: "completed" });
      await addTaskToHistory(updatedTask);

      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written.tasks).toHaveLength(1);
      expect(written.tasks[0].status).toBe("completed");
    });

    it("should keep only the last 100 tasks", async () => {
      // Create 100 existing tasks
      const existingTasks = Array.from({ length: 100 }, (_, i) =>
        makeTestTask({
          id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
        })
      );
      mockReadFile.mockResolvedValue(makeHistoryJson(existingTasks));

      // Add one more
      const newTask = makeTestTask({
        id: "550e8400-e29b-41d4-a716-999999999999",
      });
      await addTaskToHistory(newTask);

      const written = JSON.parse(mockWriteFile.mock.calls[0]![1] as string);
      expect(written.tasks).toHaveLength(100);
      // The newest task should be at the end
      expect(written.tasks[99].id).toBe("550e8400-e29b-41d4-a716-999999999999");
    });
  });

  describe("getCompletedTasks", () => {
    it("should return tasks with completed/failed/cancelled status", async () => {
      const tasks = [
        makeTestTask({
          id: "550e8400-e29b-41d4-a716-446655440001",
          status: "completed",
        }),
        makeTestTask({
          id: "550e8400-e29b-41d4-a716-446655440002",
          status: "failed",
        }),
        makeTestTask({
          id: "550e8400-e29b-41d4-a716-446655440003",
          status: "cancelled",
        }),
        makeTestTask({
          id: "550e8400-e29b-41d4-a716-446655440004",
          status: "pending",
        }),
        makeTestTask({
          id: "550e8400-e29b-41d4-a716-446655440005",
          status: "running",
        }),
      ];
      mockReadFile.mockResolvedValue(makeHistoryJson(tasks));

      const completed = await getCompletedTasks();

      expect(completed).toHaveLength(3);
      const statuses = completed.map((t) => t.status);
      expect(statuses).toContain("completed");
      expect(statuses).toContain("failed");
      expect(statuses).toContain("cancelled");
      expect(statuses).not.toContain("pending");
      expect(statuses).not.toContain("running");
    });

    it("should return empty array when no completed tasks exist", async () => {
      const tasks = [makeTestTask({ status: "pending" })];
      mockReadFile.mockResolvedValue(makeHistoryJson(tasks));

      const completed = await getCompletedTasks();

      expect(completed).toHaveLength(0);
    });
  });
});
