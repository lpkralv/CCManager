import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { Task, TaskHistory } from "../models/task.js";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_PATH = path.join(DATA_DIR, "task-history.json");

async function ensureDataDir(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

export async function loadHistory(): Promise<TaskHistory> {
  await ensureDataDir();
  try {
    const content = await readFile(HISTORY_PATH, "utf-8");
    const data = JSON.parse(content);
    return TaskHistory.parse(data);
  } catch {
    // File doesn't exist or is invalid, return empty history
    return {
      tasks: [],
      lastUpdated: new Date(),
    };
  }
}

export async function saveHistory(history: TaskHistory): Promise<void> {
  await ensureDataDir();
  history.lastUpdated = new Date();
  const content = JSON.stringify(history, null, 2);
  await writeFile(HISTORY_PATH, content, "utf-8");
}

export async function addTaskToHistory(task: Task): Promise<void> {
  const history = await loadHistory();
  // Remove existing task with same ID if present (for updates)
  const existingIndex = history.tasks.findIndex((t) => t.id === task.id);
  if (existingIndex !== -1) {
    history.tasks[existingIndex] = task;
  } else {
    history.tasks.push(task);
  }
  // Keep only the last 100 tasks
  if (history.tasks.length > 100) {
    history.tasks = history.tasks.slice(-100);
  }
  await saveHistory(history);
}

export async function getCompletedTasks(): Promise<Task[]> {
  const history = await loadHistory();
  return history.tasks.filter(
    (t) => t.status === "completed" || t.status === "failed" || t.status === "cancelled"
  );
}
