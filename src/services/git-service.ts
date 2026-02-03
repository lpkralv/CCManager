import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface GitStatus {
  localBranch: string;
  remoteBranch: string | null;
  isClean: boolean;
  ahead: number;
  behind: number;
  uncommittedChanges: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  date: string;
  author: string;
}

async function runGitCommand(
  projectPath: string,
  command: string
): Promise<string> {
  try {
    const { stdout } = await execAsync(`git ${command}`, {
      cwd: projectPath,
      timeout: 10000,
    });
    return stdout.trim();
  } catch (err) {
    const error = err as Error & { stderr?: string };
    throw new Error(error.stderr || error.message);
  }
}

export async function getGitStatus(projectPath: string): Promise<GitStatus> {
  // Get current branch
  const localBranch = await runGitCommand(projectPath, "rev-parse --abbrev-ref HEAD");

  // Get remote branch if it exists
  let remoteBranch: string | null = null;
  try {
    remoteBranch = await runGitCommand(
      projectPath,
      `rev-parse --abbrev-ref ${localBranch}@{upstream}`
    );
  } catch {
    // No upstream set
  }

  // Get status porcelain for uncommitted changes count
  const statusOutput = await runGitCommand(projectPath, "status --porcelain");
  const uncommittedChanges = statusOutput
    ? statusOutput.split("\n").filter((line) => line.trim()).length
    : 0;

  // Get ahead/behind counts if remote exists
  let ahead = 0;
  let behind = 0;
  if (remoteBranch) {
    try {
      const aheadBehind = await runGitCommand(
        projectPath,
        `rev-list --left-right --count ${localBranch}...${remoteBranch}`
      );
      const parts = aheadBehind.split(/\s+/);
      ahead = parseInt(parts[0] ?? "0", 10) || 0;
      behind = parseInt(parts[1] ?? "0", 10) || 0;
    } catch {
      // Error getting ahead/behind
    }
  }

  return {
    localBranch,
    remoteBranch,
    isClean: uncommittedChanges === 0,
    ahead,
    behind,
    uncommittedChanges,
  };
}

export async function getRecentCommits(
  projectPath: string,
  count = 10
): Promise<GitCommit[]> {
  const format = "%H|%s|%aI|%an";
  const output = await runGitCommand(
    projectPath,
    `log --format="${format}" -n ${count}`
  );

  if (!output) return [];

  return output.split("\n").map((line) => {
    const parts = line.split("|");
    return {
      hash: parts[0] ?? "",
      message: parts[1] ?? "",
      date: parts[2] ?? "",
      author: parts[3] ?? "",
    };
  });
}

export async function fetchRemote(projectPath: string): Promise<void> {
  try {
    await runGitCommand(projectPath, "fetch --quiet");
  } catch {
    // Fetch might fail if no remote configured
  }
}
