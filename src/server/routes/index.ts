import { Router } from "express";
import projectsRouter from "./projects.js";
import tasksRouter from "./tasks.js";
import settingsRouter from "./settings.js";

const router = Router();

router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/settings", settingsRouter);

export default router;
