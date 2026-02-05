import { Router, Request, Response } from "express";
import { access } from "fs/promises";
import {
  loadSettings,
  saveSettings,
  getProjectsRoot,
  getProjectsRootSource,
  inferProjectsRoot,
  AppSettings,
} from "../../services/settings-service.js";
import { z } from "zod";

const router = Router();

const UpdateSettingsSchema = z.object({
  projectsRoot: z.string().min(1, "Projects root path is required"),
});

// GET /api/settings - Get current settings
router.get("/", async (_req: Request, res: Response) => {
  try {
    const settings = await loadSettings();
    const effectiveProjectsRoot = await getProjectsRoot();
    const projectsRootSource = await getProjectsRootSource();

    // When no explicit config exists, try to infer root from existing projects
    let inferredRoot: string | undefined;
    if (projectsRootSource === "none") {
      inferredRoot = await inferProjectsRoot();
    }

    res.json({
      settings,
      effectiveProjectsRoot: effectiveProjectsRoot || null,
      projectsRootSource,
      inferredProjectsRoot: inferredRoot || null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// PUT /api/settings - Update settings
router.put("/", async (req: Request, res: Response) => {
  try {
    const parsed = UpdateSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    // Verify the directory exists
    try {
      await access(parsed.data.projectsRoot);
    } catch {
      res.status(400).json({
        error: `Directory does not exist: ${parsed.data.projectsRoot}`,
      });
      return;
    }

    const settings: AppSettings = {
      projectsRoot: parsed.data.projectsRoot,
    };
    await saveSettings(settings);

    const effectiveProjectsRoot = await getProjectsRoot();
    const projectsRootSource = await getProjectsRootSource();

    res.json({
      settings,
      effectiveProjectsRoot: effectiveProjectsRoot || null,
      projectsRootSource,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
