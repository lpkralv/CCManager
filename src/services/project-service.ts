import { readFile, writeFile } from "fs/promises";
import path from "path";
import { ProjectInventory, Project } from "../models/project.js";

const DATA_DIR = path.join(process.cwd(), "data");
const INVENTORY_PATH = path.join(DATA_DIR, "inventory.json");

export async function loadInventory(): Promise<ProjectInventory> {
  const content = await readFile(INVENTORY_PATH, "utf-8");
  const data = JSON.parse(content);
  return ProjectInventory.parse(data);
}

export async function saveInventory(inventory: ProjectInventory): Promise<void> {
  inventory.lastUpdated = new Date();
  const content = JSON.stringify(inventory, null, 2);
  await writeFile(INVENTORY_PATH, content, "utf-8");
}

export async function getAllProjects(): Promise<Project[]> {
  const inventory = await loadInventory();
  return inventory.projects;
}

export async function getProjectById(id: string): Promise<Project | undefined> {
  const inventory = await loadInventory();
  return inventory.projects.find((p) => p.id === id);
}

export async function addProject(project: Project): Promise<void> {
  const inventory = await loadInventory();
  inventory.projects.push(project);
  await saveInventory(inventory);
}

export async function updateProject(project: Project): Promise<void> {
  const inventory = await loadInventory();
  const index = inventory.projects.findIndex((p) => p.id === project.id);
  if (index === -1) {
    throw new Error(`Project not found: ${project.id}`);
  }
  inventory.projects[index] = project;
  await saveInventory(inventory);
}
