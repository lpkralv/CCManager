import { Router, Request, Response } from "express";
import { taskManager } from "../../services/task-manager.js";
import { getCompletedTasks } from "../../services/history-service.js";
import { CreateTaskInput } from "../../models/task.js";
import { z } from "zod";

const router = Router();

const CreateTaskSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().min(1),
  maxBudget: z.number().positive().optional().default(1.0),
});

// POST /api/tasks - Create new task
router.post("/", async (req: Request, res: Response) => {
  try {
    const parsed = CreateTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
      return;
    }

    const input: CreateTaskInput = {
      projectId: parsed.data.projectId,
      prompt: parsed.data.prompt,
      maxBudget: parsed.data.maxBudget,
    };

    const task = await taskManager.createTask(input);
    res.status(201).json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(400).json({ error: message });
  }
});

// GET /api/tasks - List active tasks
router.get("/", (_req: Request, res: Response) => {
  try {
    const tasks = taskManager.getActiveTasks();
    res.json(tasks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/tasks/history - Get completed task history
router.get("/history", async (_req: Request, res: Response) => {
  try {
    const tasks = await getCompletedTasks();
    res.json(tasks);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/tasks/:id - Get task details
router.get("/:id", (_req: Request, res: Response) => {
  try {
    const task = taskManager.getTask(_req.params.id ?? "");
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// DELETE /api/tasks/:id - Cancel task
router.delete("/:id", (_req: Request, res: Response) => {
  try {
    const cancelled = taskManager.cancelTask(_req.params.id ?? "");
    if (!cancelled) {
      res.status(404).json({ error: "Task not found or already completed" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
