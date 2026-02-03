import { Router, Request, Response } from "express";
import { getAllProjects, getProjectById } from "../../services/project-service.js";
import { createProject, CreateProjectInput } from "../../services/project-creator.js";
import { z } from "zod";

const router = Router();

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
});

// GET /api/projects - List all projects
router.get("/", async (_req: Request, res: Response) => {
  try {
    const projects = await getAllProjects();
    res.json(projects);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/projects/:id - Get single project
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const project = await getProjectById(req.params.id ?? "");
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }
    res.json(project);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// POST /api/projects - Create new project
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const input: CreateProjectInput = parsed.data;
    const result = await createProject(input);

    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.status(201).json(result.project);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
