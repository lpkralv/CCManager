import { readdir } from "fs/promises";
import path from "path";
import { getAllProjects } from "./project-service.js";
import { getRecentCommits, getGitStatus } from "./git-service.js";
import { loadHistory } from "./history-service.js";

export type TodoPriority = "high" | "medium" | "low";

export interface TodoItem {
  projectId: string;
  projectName: string;
  priority: TodoPriority;
  nextStep: string;
  lastActivity: string; // ISO date string
  lastActivityLabel: string; // human-readable relative time
}

/** Format a date into a human-readable relative time label */
function formatRelativeTime(date: Date, now: number): string {
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(diffMs / 86_400_000);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 14) return `${days}d ago`;
  if (weeks < 8) return `${weeks}w ago`;
  return `${months}mo ago`;
}

/** Check if a project has pending do-work items (already automatable) */
async function hasDoWorkQueue(projectPath: string): Promise<boolean> {
  try {
    const doWorkDir = path.join(projectPath, "do-work");
    const entries = await readdir(doWorkDir);
    const pendingReqs = entries.filter((f) => /^REQ-.*\.md$/i.test(f));
    if (pendingReqs.length > 0) return true;

    const workingDir = path.join(doWorkDir, "working");
    try {
      const workingEntries = await readdir(workingDir);
      return workingEntries.some((f) => /^REQ-.*\.md$/i.test(f));
    } catch {
      return false;
    }
  } catch {
    return false;
  }
}

interface ProjectInsight {
  reasons: string[];
  priority: TodoPriority;
}

/**
 * Analyze a project and determine what human attention it needs.
 *
 * Priority logic:
 *   HIGH - Requires immediate human action:
 *     - Uncommitted changes (work in progress needs review/commit)
 *     - Behind remote (someone pushed, need to review/pull)
 *     - Unpushed commits (finished work not yet shared)
 *
 *   MEDIUM - Active project, may need direction:
 *     - Recent activity (< 7 days) with no do-work queue
 *       (momentum project — what's next?)
 *
 *   LOW - On your radar but not urgent:
 *     - Some activity in past 4 weeks, no do-work queue
 *
 * Excluded:
 *   - Projects with do-work items but no git issues
 *     (automation handles these — just run do-work)
 *   - Projects with no activity in 4+ weeks and no git issues
 */
function analyzeProject(
  gitStatus: { isClean: boolean; ahead: number; behind: number; uncommittedChanges: number } | null,
  lastActivity: Date | null,
  hasQueue: boolean,
  now: number
): ProjectInsight | null {
  const reasons: string[] = [];
  let priority: TodoPriority = "low";

  // Git state signals — these need human attention regardless
  if (gitStatus) {
    if (!gitStatus.isClean) {
      reasons.push(`${gitStatus.uncommittedChanges} uncommitted change${gitStatus.uncommittedChanges !== 1 ? "s" : ""}`);
      priority = "high";
    }
    if (gitStatus.behind > 0) {
      reasons.push(`${gitStatus.behind} commit${gitStatus.behind !== 1 ? "s" : ""} behind remote`);
      priority = "high";
    }
    if (gitStatus.ahead > 0) {
      reasons.push(`${gitStatus.ahead} unpushed commit${gitStatus.ahead !== 1 ? "s" : ""}`);
      if (priority !== "high") priority = "high";
    }
  }

  // If there are git issues, always show the project
  if (reasons.length > 0) {
    return { reasons, priority };
  }

  // If the project has a do-work queue and no git issues, skip it —
  // the user just needs to run do-work, not think about it
  if (hasQueue) {
    return null;
  }

  // Activity-based signals for projects without queued work
  if (!lastActivity) {
    return null;
  }

  const ageMs = now - lastActivity.getTime();
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  const FOUR_WEEKS = 28 * 24 * 60 * 60 * 1000;

  if (ageMs < ONE_WEEK) {
    // Recently active, no queued work — user should decide what's next
    reasons.push("Recently active — what's next?");
    return { reasons, priority: "medium" };
  }

  if (ageMs < FOUR_WEEKS) {
    reasons.push("No activity in over a week");
    return { reasons, priority: "low" };
  }

  // Older than 4 weeks with no git issues and no queue — not shown
  return null;
}

/** Get the most recent activity timestamp for a project */
function getLastActivity(
  projectId: string,
  tasks: Array<{ projectId: string; completedAt?: Date; createdAt: Date }>,
  commits: Array<{ date: string }>
): Date | null {
  const taskDates = tasks
    .filter((t) => t.projectId === projectId)
    .map((t) => t.completedAt ?? t.createdAt);

  const commitDates = commits
    .map((c) => new Date(c.date))
    .filter((d) => !isNaN(d.getTime()));

  const allDates = [...taskDates, ...commitDates];
  if (allDates.length === 0) return null;

  return new Date(Math.max(...allDates.map((d) => d.getTime())));
}

/** Build the prioritized ToDo list focused on where human attention is needed */
export async function getTodoList(): Promise<TodoItem[]> {
  const [projects, history] = await Promise.all([
    getAllProjects(),
    loadHistory(),
  ]);

  const now = Date.now();

  const enriched = await Promise.all(
    projects.map(async (project) => {
      const [gitStatus, commits, hasQueue] = await Promise.all([
        getGitStatus(project.path).catch(() => null),
        getRecentCommits(project.path, 5).catch(() => []),
        hasDoWorkQueue(project.path),
      ]);

      const lastActivity = getLastActivity(project.id, history.tasks, commits);

      return { project, gitStatus, commits, lastActivity, hasQueue };
    })
  );

  const todos: TodoItem[] = [];

  for (const { project, gitStatus, commits, lastActivity, hasQueue } of enriched) {
    const insight = analyzeProject(gitStatus, lastActivity, hasQueue, now);
    if (!insight) continue;

    // Build the nextStep description
    let nextStep = insight.reasons.join("; ");

    // For medium/low, append context about latest commit
    if (insight.priority !== "high" && commits.length > 0) {
      let msg = commits[0]!.message;
      if (msg.length > 50) msg = msg.slice(0, 47) + "...";
      nextStep += ` (last: ${msg})`;
    }

    const activityLabel = lastActivity
      ? formatRelativeTime(lastActivity, now)
      : "";

    todos.push({
      projectId: project.id,
      projectName: project.name,
      priority: insight.priority,
      nextStep,
      lastActivity: lastActivity?.toISOString() ?? "",
      lastActivityLabel: activityLabel,
    });
  }

  // Sort: high first, then medium, then low. Within same priority, most recent first.
  const priorityOrder: Record<TodoPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  todos.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    const aTime = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const bTime = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    return bTime - aTime;
  });

  return todos;
}
