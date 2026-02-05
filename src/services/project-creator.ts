import { spawn, exec } from "child_process";
import { cp, access, rm, writeFile } from "fs/promises";
import path from "path";
import { promisify } from "util";
import { Project } from "../models/project.js";
import { addProject } from "./project-service.js";
import { getProjectsRoot } from "./settings-service.js";

const execAsync = promisify(exec);

export interface CreateProjectInput {
  name: string;
  description: string;
}

export interface CreateProjectResult {
  success: boolean;
  project?: Project;
  error?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    await access(dirPath);
    return true;
  } catch {
    return false;
  }
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

interface ProjectInfo {
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

async function writeProjectInfo(projectPath: string, name: string, description: string): Promise<void> {
  const info: ProjectInfo = {
    name,
    description,
    createdAt: new Date().toISOString(),
    createdBy: "ClaudeCodeManager",
  };
  const infoPath = path.join(projectPath, ".project-info.json");
  await writeFile(infoPath, JSON.stringify(info, null, 2), "utf-8");
}

async function removeTemplateGit(projectPath: string): Promise<void> {
  const gitPath = path.join(projectPath, ".git");
  if (await directoryExists(gitPath)) {
    await rm(gitPath, { recursive: true, force: true });
  }
}

async function initFreshGitRepo(projectPath: string): Promise<{ success: boolean; error?: string }> {
  try {
    await execAsync("git init", { cwd: projectPath });
    await execAsync("git add -A", { cwd: projectPath });
    await execAsync('git commit -m "Initial commit from CCSTARTUP template"', { cwd: projectPath });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}

async function ensureMinimalSetup(projectPath: string, name: string, description: string): Promise<void> {
  // Ensure git is initialized
  const gitPath = path.join(projectPath, ".git");
  if (!(await directoryExists(gitPath))) {
    await initFreshGitRepo(projectPath);
  }

  // Ensure CLAUDE.md exists with basic content
  const claudeMdPath = path.join(projectPath, "CLAUDE.md");
  if (!(await fileExists(claudeMdPath))) {
    const basicClaudeMd = `# CLAUDE.md

## Project Overview

**Name**: ${name}
**Description**: ${description}

This project was created from the CCSTARTUP template. The full initialization process
did not complete, so this is a minimal CLAUDE.md file.

## Getting Started

Run the \`/init\` command to complete project setup:
- Detect project type
- Generate a complete CLAUDE.md
- Configure MCP servers
- Set up GitHub repository

## Project Structure

\`\`\`
src/           - Source code
docs/          - Documentation
background/    - Reference materials
  code/        - Reference implementations
  info/        - Technical documentation
init/          - Initialization templates and scripts
\`\`\`

## Notes for Claude Code

- This is a placeholder CLAUDE.md
- Run \`/init\` to generate a project-specific version
- Check \`.project-info.json\` for project metadata
`;
    await writeFile(claudeMdPath, basicClaudeMd, "utf-8");

    // Add and commit the CLAUDE.md
    try {
      await execAsync("git add CLAUDE.md", { cwd: projectPath });
      await execAsync('git commit -m "Add minimal CLAUDE.md"', { cwd: projectPath });
    } catch {
      // Git commit may fail if already staged, that's okay
    }
  }
}

async function runClaudeInit(
  projectPath: string,
  projectName: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["-p", "/init", "--dangerously-skip-permissions"], {
      cwd: projectPath,
      env: {
        ...process.env,
        PROJECT_NAME: projectName,
        PROJECT_DESCRIPTION: description,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    proc.stderr?.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("exit", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderr || `Exit code: ${code}` });
      }
    });

    proc.on("error", (err) => {
      resolve({ success: false, error: err.message });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!proc.killed) {
        proc.kill("SIGTERM");
        resolve({ success: false, error: "Initialization timed out" });
      }
    }, 5 * 60 * 1000);
  });
}

export async function createProject(input: CreateProjectInput): Promise<CreateProjectResult> {
  const projectsRoot = await getProjectsRoot();
  if (!projectsRoot) {
    return {
      success: false,
      error: "Projects root directory is not configured. Please set it in Settings.",
    };
  }

  const projectId = slugify(input.name);
  const projectPath = path.join(projectsRoot, input.name);
  const ccstartupPath = path.join(projectsRoot, "CCSTARTUP");

  // Check if project already exists
  if (await directoryExists(projectPath)) {
    return { success: false, error: `Project directory already exists: ${projectPath}` };
  }

  // Check if CCSTARTUP exists
  if (!(await directoryExists(ccstartupPath))) {
    return { success: false, error: `CCSTARTUP template not found at: ${ccstartupPath}` };
  }

  try {
    // Clone CCSTARTUP to new project directory
    await cp(ccstartupPath, projectPath, { recursive: true });

    // Write project info file with description
    await writeProjectInfo(projectPath, input.name, input.description);

    // Remove the template's .git directory and initialize fresh
    await removeTemplateGit(projectPath);
    const gitResult = await initFreshGitRepo(projectPath);
    if (!gitResult.success) {
      console.warn(`Git initialization warning: ${gitResult.error}`);
      // Continue anyway - ensureMinimalSetup will handle it
    }

    // Run claude /init in the new project (may timeout or fail)
    const initResult = await runClaudeInit(projectPath, input.name, input.description);
    if (!initResult.success) {
      console.warn(`Claude /init warning: ${initResult.error}`);
      // Don't fail - use fallback instead
    }

    // Ensure minimal setup even if /init failed or timed out
    await ensureMinimalSetup(projectPath, input.name, input.description);

    // Create project entry
    const project: Project = {
      id: projectId,
      name: input.name,
      path: projectPath,
      description: input.description,
      projectType: "utility",
      status: "active",
      technology: {
        primaryLanguage: "python",
        buildSystem: "scripts",
      },
      git: {
        initialized: true,
        defaultBranch: "master",
      },
      configuration: {
        files: {
          claudeMd: true,
          mcpJson: true,
          gitignore: true,
          readme: false,
        },
        directories: {
          src: false,
          docs: false,
          tests: false,
          background: false,
        },
      },
      relationships: [
        {
          type: "part-of",
          targetProject: "ccstartup",
          description: "Instance of CCSTARTUP template",
        },
      ],
      metadata: {
        hasClaudeMd: true,
        lastScanned: new Date(),
        lastModified: new Date(),
      },
    };

    // Add to inventory
    await addProject(project);

    return { success: true, project };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
