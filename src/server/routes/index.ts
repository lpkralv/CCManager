import { Router } from "express";
import projectsRouter from "./projects.js";
import tasksRouter from "./tasks.js";

const router = Router();

router.use("/projects", projectsRouter);
router.use("/tasks", tasksRouter);

export default router;
