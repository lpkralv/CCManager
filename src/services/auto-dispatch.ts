import { readdir } from "fs/promises";
import path from "path";
import { getAllProjects } from "./project-service.js";
import { taskManager } from "./task-manager.js";

const AUTO_DISPATCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

/** Check if a project has pending do-work items (REQ-*.md in do-work/ root) */
async function getPendingDoWorkItems(projectPath: string): Promise<boolean> {
  try {
    const doWorkDir = path.join(projectPath, "do-work");
    const entries = await readdir(doWorkDir);
    return entries.some((f) => /^REQ-.*\.md$/i.test(f));
  } catch {
    return false;
  }
}

/** Scan all projects and dispatch "do-work run" for those with pending items */
async function runAutoDispatch(): Promise<void> {
  try {
    const projects = await getAllProjects();

    // Get currently active task project IDs to avoid double-dispatching
    const activeTasks = taskManager.getActiveTasks();
    const activeProjectIds = new Set(activeTasks.map((t) => t.projectId));

    for (const project of projects) {
      // Skip projects that already have an active task
      if (activeProjectIds.has(project.id)) {
        continue;
      }

      const hasPending = await getPendingDoWorkItems(project.path);
      if (!hasPending) {
        continue;
      }

      console.log(`[auto-dispatch] Project "${project.name}" has pending do-work items, dispatching...`);
      try {
        await taskManager.createTask({
          projectId: project.id,
          prompt: "/do-work run",
          auto: true,
        });
      } catch (err) {
        console.error(`[auto-dispatch] Failed to dispatch for "${project.name}":`, err);
      }
    }
  } catch (err) {
    console.error("[auto-dispatch] Error during auto-dispatch scan:", err);
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Start the auto-dispatch timer. Runs an initial scan, then every 10 minutes. */
export function startAutoDispatch(): void {
  if (intervalId) return; // Already running

  console.log(`[auto-dispatch] Starting auto-dispatch (every ${AUTO_DISPATCH_INTERVAL_MS / 60000} minutes)`);

  // Run initial scan after a short delay to let the server finish starting
  setTimeout(() => runAutoDispatch(), 5000);

  intervalId = setInterval(() => runAutoDispatch(), AUTO_DISPATCH_INTERVAL_MS);
}

/** Stop the auto-dispatch timer. */
export function stopAutoDispatch(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[auto-dispatch] Stopped auto-dispatch");
  }
}
