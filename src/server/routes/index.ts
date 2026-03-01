import { Router } from "express";
import projectsRouter from "./projects.js";
import tasksRouter from "./tasks.js";
import settingsRouter from "./settings.js";
import uploadsRouter from "./uploads.js";
import filesRouter from "./files.js";

const router = Router();

router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);
router.use("/settings", settingsRouter);
router.use("/uploads", uploadsRouter);
router.use("/files", filesRouter);

export default router;
