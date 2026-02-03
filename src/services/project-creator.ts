import { spawn } from "child_process";
import { cp, access } from "fs/promises";
import path from "path";
import { Project } from "../models/project.js";
import { addProject } from "./project-service.js";

const SANDBOX_ROOT = "/Volumes/Sheridan/sandbox";
const CCSTARTUP_PATH = path.join(SANDBOX_ROOT, "CCSTARTUP");

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

async function runClaudeInit(projectPath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["-p", "/init", "--dangerously-skip-permissions"], {
      cwd: projectPath,
      env: { ...process.env },
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
  const projectId = slugify(input.name);
  const projectPath = path.join(SANDBOX_ROOT, input.name);

  // Check if project already exists
  if (await directoryExists(projectPath)) {
    return { success: false, error: `Project directory already exists: ${projectPath}` };
  }

  // Check if CCSTARTUP exists
  if (!(await directoryExists(CCSTARTUP_PATH))) {
    return { success: false, error: `CCSTARTUP template not found at: ${CCSTARTUP_PATH}` };
  }

  try {
    // Clone CCSTARTUP to new project directory
    await cp(CCSTARTUP_PATH, projectPath, { recursive: true });

    // Run claude /init in the new project
    const initResult = await runClaudeInit(projectPath);
    if (!initResult.success) {
      return { success: false, error: `Initialization failed: ${initResult.error}` };
    }

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
