import { Router, Request, Response } from "express";
import { getTodoList } from "../../services/todo-service.js";

const router = Router();

// GET /api/todos - Get prioritized todo list
router.get("/", async (_req: Request, res: Response) => {
  try {
    const todos = await getTodoList();
    res.json(todos);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

export default router;
