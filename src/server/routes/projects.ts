import { Router, Request, Response } from "express";
import { getAllProjects, getProjectById } from "../../services/project-service.js";
import { createProject, CreateProjectInput } from "../../services/project-creator.js";
import { getGitStatus, getRecentCommits, fetchRemote } from "../../services/git-service.js";
import { getDoWorkQueue } from "../../services/dowork-service.js";
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

// GET /api/projects/summary - Get all projects with git status and latest commit
router.get("/summary", async (_req: Request, res: Response) => {
  try {
    const projects = await getAllProjects();

    const summaries = await Promise.all(
      projects.map(async (project) => {
        // Fire fetch remote non-blocking
        fetchRemote(project.path).catch(() => {});

        // Get git status and latest commit in parallel
        const [git, commits] = await Promise.all([
          getGitStatus(project.path).catch(() => ({
            localBranch: "unknown",
            remoteBranch: null,
            isClean: true,
            ahead: 0,
            behind: 0,
            uncommittedChanges: 0,
          })),
          getRecentCommits(project.path, 1).catch(() => []),
        ]);

        const latestCommit = commits[0];

        return {
          id: project.id,
          name: project.name,
          status: project.status,
          lastModified: project.metadata.lastModified,
          gitBranch: git.localBranch,
          isClean: git.isClean,
          ahead: git.ahead,
          behind: git.behind,
          uncommittedChanges: git.uncommittedChanges,
          lastCommitMessage: latestCommit?.message ?? "",
          lastCommitDate: latestCommit?.date ?? "",
        };
      })
    );

    res.json(summaries);
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

// GET /api/projects/:id/details - Get detailed project info (git, commits, do-work)
router.get("/:id/details", async (req: Request, res: Response) => {
  try {
    const project = await getProjectById(req.params.id ?? "");
    if (!project) {
      res.status(404).json({ error: "Project not found" });
      return;
    }

    // Fetch remote to get latest ahead/behind info (non-blocking)
    fetchRemote(project.path).catch(() => {});

    // Get git status and recent commits in parallel
    const [git, recentCommits, doWork] = await Promise.all([
      getGitStatus(project.path).catch(() => ({
        localBranch: "unknown",
        remoteBranch: null,
        isClean: true,
        ahead: 0,
        behind: 0,
        uncommittedChanges: 0,
      })),
      getRecentCommits(project.path, 10).catch(() => []),
      getDoWorkQueue(project.path).catch(() => null),
    ]);

    res.json({
      project,
      git,
      recentCommits,
      doWork,
    });
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
