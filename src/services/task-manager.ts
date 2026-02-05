import { EventEmitter } from "events";
import { v4 as uuidv4 } from "uuid";
import { Task, CreateTaskInput } from "../models/task.js";
import { ClaudeProcess, spawnClaude } from "./process-spawner.js";
import { getProjectById } from "./project-service.js";
import { addTaskToHistory } from "./history-service.js";

const MAX_CONCURRENT_TASKS = 3;

export type TaskEvent =
  | { type: "task:created"; task: Task }
  | { type: "task:started"; task: Task }
  | { type: "task:output"; taskId: string; output: string }
  | { type: "task:completed"; task: Task }
  | { type: "task:failed"; task: Task }
  | { type: "task:cancelled"; task: Task };

class TaskManager extends EventEmitter {
  private pendingTasks: Task[] = [];
  private runningTasks: Map<string, { task: Task; process: ClaudeProcess }> = new Map();

  constructor() {
    super();
  }

  async createTask(input: CreateTaskInput): Promise<Task> {
    const project = await getProjectById(input.projectId);
    if (!project) {
      throw new Error(`Project not found: ${input.projectId}`);
    }

    const task: Task = {
      id: uuidv4(),
      projectId: input.projectId,
      prompt: input.prompt,
      status: "pending",
      maxBudget: input.maxBudget,
      createdAt: new Date(),
      output: "",
    };

    this.pendingTasks.push(task);
    this.emit("event", { type: "task:created", task } as TaskEvent);

    // Try to start tasks
    this.processQueue();

    return task;
  }

  private async processQueue(): Promise<void> {
    while (
      this.pendingTasks.length > 0 &&
      this.runningTasks.size < MAX_CONCURRENT_TASKS
    ) {
      const task = this.pendingTasks.shift();
      if (task) {
        await this.startTask(task);
      }
    }
  }

  private async startTask(task: Task): Promise<void> {
    const project = await getProjectById(task.projectId);
    if (!project) {
      task.status = "failed";
      task.error = `Project not found: ${task.projectId}`;
      task.completedAt = new Date();
      this.emit("event", { type: "task:failed", task } as TaskEvent);
      await addTaskToHistory(task);
      return;
    }

    task.status = "running";
    task.startedAt = new Date();

    const proc = spawnClaude({
      cwd: project.path,
      prompt: task.prompt,
      maxBudget: task.maxBudget,
    });

    this.runningTasks.set(task.id, { task, process: proc });
    this.emit("event", { type: "task:started", task } as TaskEvent);

    proc.on("output", (data) => {
      task.output += data;
      this.emit("event", { type: "task:output", taskId: task.id, output: data } as TaskEvent);
    });

    proc.on("error", (data) => {
      if (!task.error) {
        task.error = "";
      }
      task.error += data;
    });

    proc.on("exit", async (code) => {
      this.runningTasks.delete(task.id);
      task.completedAt = new Date();
      task.durationMs = task.completedAt.getTime() - (task.startedAt?.getTime() ?? 0);

      if (code === 0) {
        task.status = "completed";
        this.emit("event", { type: "task:completed", task } as TaskEvent);
      } else {
        task.status = "failed";
        if (!task.error) {
          task.error = `Process exited with code ${code}`;
        }
        this.emit("event", { type: "task:failed", task } as TaskEvent);
      }

      await addTaskToHistory(task);

      // Process next task in queue
      this.processQueue();
    });
  }

  cancelTask(taskId: string): boolean {
    // Check pending tasks
    const pendingIndex = this.pendingTasks.findIndex((t) => t.id === taskId);
    if (pendingIndex !== -1) {
      const task = this.pendingTasks.splice(pendingIndex, 1)[0];
      if (task) {
        task.status = "cancelled";
        task.completedAt = new Date();
        this.emit("event", { type: "task:cancelled", task } as TaskEvent);
        addTaskToHistory(task);
        return true;
      }
    }

    // Check running tasks
    const running = this.runningTasks.get(taskId);
    if (running) {
      running.process.kill();
      running.task.status = "cancelled";
      running.task.completedAt = new Date();
      this.runningTasks.delete(taskId);
      this.emit("event", { type: "task:cancelled", task: running.task } as TaskEvent);
      addTaskToHistory(running.task);

      // Process next task in queue
      this.processQueue();
      return true;
    }

    return false;
  }

  getTask(taskId: string): Task | undefined {
    // Check pending
    const pending = this.pendingTasks.find((t) => t.id === taskId);
    if (pending) return pending;

    // Check running
    const running = this.runningTasks.get(taskId);
    if (running) return running.task;

    return undefined;
  }

  getActiveTasks(): Task[] {
    const pending = [...this.pendingTasks];
    const running = Array.from(this.runningTasks.values()).map((r) => r.task);
    return [...running, ...pending];
  }

  getPendingCount(): number {
    return this.pendingTasks.length;
  }

  getRunningCount(): number {
    return this.runningTasks.size;
  }
}

// Singleton instance
export const taskManager = new TaskManager();
