import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { z } from "zod";
import { getAllProjects } from "./project-service.js";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.json");

export const AppSettings = z.object({
  projectsRoot: z.string().optional(),
});

export type AppSettings = z.infer<typeof AppSettings>;

async function ensureDataDir(): Promise<void> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory exists
  }
}

export async function loadSettings(): Promise<AppSettings> {
  await ensureDataDir();
  try {
    const content = await readFile(SETTINGS_PATH, "utf-8");
    const data = JSON.parse(content);
    return AppSettings.parse(data);
  } catch {
    // File doesn't exist or is invalid, return empty settings
    return {};
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await ensureDataDir();
  const content = JSON.stringify(settings, null, 2);
  await writeFile(SETTINGS_PATH, content, "utf-8");
}

export async function getProjectsRoot(): Promise<string | undefined> {
  // Environment variable takes priority as an override
  if (process.env.PROJECTS_ROOT) {
    return process.env.PROJECTS_ROOT;
  }
  const settings = await loadSettings();
  return settings.projectsRoot;
}

export async function setProjectsRoot(projectsRoot: string): Promise<void> {
  const settings = await loadSettings();
  settings.projectsRoot = projectsRoot;
  await saveSettings(settings);
}

export type ProjectsRootSource = "env" | "settings" | "none";

export async function getProjectsRootSource(): Promise<ProjectsRootSource> {
  if (process.env.PROJECTS_ROOT) {
    return "env";
  }
  const settings = await loadSettings();
  if (settings.projectsRoot) {
    return "settings";
  }
  return "none";
}

export async function inferProjectsRoot(): Promise<string | undefined> {
  try {
    const projects = await getAllProjects();
    if (projects.length === 0) {
      return undefined;
    }
    // Compute the common parent directory of all project paths
    const dirs = projects.map((p) => path.dirname(p.path));
    if (dirs.length === 1) {
      return dirs[0];
    }
    // Find common prefix by comparing path segments
    const splitDirs = dirs.map((d) => d.split(path.sep));
    const minLen = Math.min(...splitDirs.map((s) => s.length));
    const commonParts: string[] = [];
    for (let i = 0; i < minLen; i++) {
      const segment = splitDirs[0]![i];
      if (splitDirs.every((s) => s[i] === segment)) {
        commonParts.push(segment!);
      } else {
        break;
      }
    }
    const commonDir = commonParts.join(path.sep);
    return commonDir || undefined;
  } catch {
    // Inventory file may not exist
    return undefined;
  }
}
