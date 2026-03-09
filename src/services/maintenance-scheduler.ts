import { taskManager } from "./task-manager.js";

const MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
const INITIAL_DELAY_MS = 15 * 1000; // 15 seconds after startup

const SELF_PROJECT_ID = "claude-code-manager";

const REBUILD_INSIGHTS_PROMPT = `Rebuild the project-insights.json file in data/project-insights.json.

For each project in data/inventory.json:
1. Read the project's CLAUDE.md to understand its purpose and current state
2. Check recent git commits and git status to assess trajectory
3. Look at the do-work queue (do-work/ directory) for pending/active work
4. Review any docs/ or background/ directories for context

Then regenerate data/project-insights.json with the same schema:
{
  "generatedAt": "<current ISO timestamp>",
  "insights": [
    {
      "projectId": "<matches inventory.json id>",
      "phase": "<short phase label>",
      "trajectory": "<1-2 sentence summary of where the project is heading>",
      "nextSteps": "<actionable next step>",
      "confidence": "high" | "medium" | "low",
      "rank": <priority rank 1=highest>,
      "reasoning": "<why this assessment>"
    }
  ]
}

Rank projects by urgency and activity. Use "Complete" phase for finished projects.
Do not commit the changes - just update the file.`;

interface ScheduledTask {
  name: string;
  promptForSelf: string;
  lastRunAt: Date | null;
}

const scheduledTasks: ScheduledTask[] = [
  {
    name: "rebuild-project-insights",
    promptForSelf: REBUILD_INSIGHTS_PROMPT,
    lastRunAt: null,
  },
];

/** Run all scheduled maintenance tasks */
async function runMaintenance(): Promise<void> {
  for (const task of scheduledTasks) {
    try {
      // Skip if this project already has an active task
      const activeTasks = taskManager.getActiveTasks();
      const hasActiveTask = activeTasks.some(
        (t) => t.projectId === SELF_PROJECT_ID
      );
      if (hasActiveTask) {
        console.log(
          `[maintenance] Skipping "${task.name}" - project already has an active task`
        );
        continue;
      }

      console.log(`[maintenance] Running scheduled task: ${task.name}`);
      await taskManager.createTask({
        projectId: SELF_PROJECT_ID,
        prompt: task.promptForSelf,
        auto: true,
      });
      task.lastRunAt = new Date();
    } catch (err) {
      console.error(
        `[maintenance] Failed to run "${task.name}":`,
        err
      );
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Start the maintenance scheduler. Runs an initial pass, then daily. */
export function startMaintenanceScheduler(): void {
  if (intervalId) return; // Already running

  console.log(
    `[maintenance] Starting maintenance scheduler (every ${MAINTENANCE_INTERVAL_MS / 3_600_000}h)`
  );

  // Run initial maintenance after a delay to let server and auto-dispatch settle
  setTimeout(() => runMaintenance(), INITIAL_DELAY_MS);

  intervalId = setInterval(() => runMaintenance(), MAINTENANCE_INTERVAL_MS);
}

/** Stop the maintenance scheduler. */
export function stopMaintenanceScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[maintenance] Stopped maintenance scheduler");
  }
}
