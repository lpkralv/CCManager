import { readFile, readdir } from "fs/promises";
import path from "path";
import { getAllProjects } from "./project-service.js";
import { getGitStatus } from "./git-service.js";

export type TodoPriority = "high" | "medium" | "low";

export interface TodoItem {
  projectId: string;
  projectName: string;
  priority: TodoPriority;
  phase: string;
  nextStep: string;
  confidence: string;
  gitAlert: string; // non-empty if git needs attention
  lastActivity: string;
  lastActivityLabel: string;
}

interface ProjectInsight {
  projectId: string;
  phase: string;
  trajectory: string;
  nextSteps: string;
  confidence: string;
  rank: number;
  reasoning: string;
}

interface InsightsFile {
  generatedAt: string;
  insights: ProjectInsight[];
}

/** Load the curated project insights file */
async function loadInsights(): Promise<Map<string, ProjectInsight>> {
  const insightsPath = path.resolve(
    import.meta.dirname ?? ".",
    "../../data/project-insights.json"
  );
  try {
    const raw = await readFile(insightsPath, "utf-8");
    const data: InsightsFile = JSON.parse(raw);
    const map = new Map<string, ProjectInsight>();
    for (const insight of data.insights) {
      map.set(insight.projectId, insight);
    }
    return map;
  } catch {
    return new Map();
  }
}

/** Check if a project has pending do-work items */
async function hasDoWorkQueue(projectPath: string): Promise<boolean> {
  try {
    const doWorkDir = path.join(projectPath, "do-work");
    const entries = await readdir(doWorkDir);
    const pendingReqs = entries.filter((f) => /^REQ-.*\.md$/i.test(f));
    if (pendingReqs.length > 0) return true;

    const pendingDir = path.join(doWorkDir, "pending");
    try {
      const pendingEntries = await readdir(pendingDir);
      if (pendingEntries.some((f) => /^REQ-.*\.md$/i.test(f))) return true;
    } catch {
      /* no pending dir */
    }

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

/** Build git alert string from status */
function buildGitAlert(
  gitStatus: {
    isClean: boolean;
    ahead: number;
    behind: number;
    uncommittedChanges: number;
    untrackedFiles: number;
  } | null
): string {
  if (!gitStatus) return "";
  const parts: string[] = [];
  if (gitStatus.uncommittedChanges > 0) {
    parts.push(
      `${gitStatus.uncommittedChanges} uncommitted change${gitStatus.uncommittedChanges !== 1 ? "s" : ""}`
    );
  }
  if (gitStatus.untrackedFiles > 0) {
    parts.push(
      `${gitStatus.untrackedFiles} untracked file${gitStatus.untrackedFiles !== 1 ? "s" : ""}`
    );
  }
  if (gitStatus.behind > 0) {
    parts.push(
      `${gitStatus.behind} commit${gitStatus.behind !== 1 ? "s" : ""} behind remote`
    );
  }
  if (gitStatus.ahead > 0) {
    parts.push(
      `${gitStatus.ahead} unpushed commit${gitStatus.ahead !== 1 ? "s" : ""}`
    );
  }
  return parts.join("; ");
}

/** Format a date into a human-readable relative time label */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
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

/** Map confidence + git state to display priority */
function determinePriority(
  gitAlert: string,
  confidence: string,
  hasQueue: boolean
): TodoPriority {
  // Git issues always bump priority
  if (gitAlert) return "high";
  // Projects with active do-work queues are being handled
  if (hasQueue) return "low";
  // Otherwise base on insight confidence
  if (confidence === "high") return "medium";
  return "low";
}

/** Build the insight-driven ToDo list */
export async function getTodoList(): Promise<TodoItem[]> {
  const [projects, insightsMap] = await Promise.all([
    getAllProjects(),
    loadInsights(),
  ]);

  const enriched = await Promise.all(
    projects.map(async (project) => {
      const [gitStatus, hasQueue] = await Promise.all([
        getGitStatus(project.path).catch(() => null),
        hasDoWorkQueue(project.path),
      ]);
      return { project, gitStatus, hasQueue };
    })
  );

  const todos: TodoItem[] = [];

  for (const { project, gitStatus, hasQueue } of enriched) {
    const insight = insightsMap.get(project.id);

    // Skip projects with no insights and no git issues
    const gitAlert = buildGitAlert(gitStatus);
    if (!insight && !gitAlert) continue;

    // Skip completed projects unless they have git issues
    if (insight?.phase === "Complete" && !gitAlert) continue;

    const phase = insight?.phase ?? "Unknown";
    const nextStep = insight?.nextSteps ?? "No insight available";
    const confidence = insight?.confidence ?? "low";

    const priority = determinePriority(gitAlert, confidence, hasQueue);

    const lastActivityDate =
      project.metadata?.lastModified ??
      project.metadata?.lastScanned ??
      null;
    const lastActivity = lastActivityDate?.toISOString() ?? "";
    const lastActivityLabel = lastActivity
      ? formatRelativeTime(lastActivity)
      : "";

    todos.push({
      projectId: project.id,
      projectName: project.name,
      priority,
      phase,
      nextStep,
      confidence,
      gitAlert,
      lastActivity,
      lastActivityLabel,
    });
  }

  // Sort: high first, then by insight rank
  const priorityOrder: Record<TodoPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  todos.sort((a, b) => {
    const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (pDiff !== 0) return pDiff;
    const aRank = insightsMap.get(a.projectId)?.rank ?? 999;
    const bRank = insightsMap.get(b.projectId)?.rank ?? 999;
    return aRank - bRank;
  });

  return todos;
}
