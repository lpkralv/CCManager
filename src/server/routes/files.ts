import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import fg from "fast-glob";
import { getProjectsRoot } from "../../services/settings-service.js";

const router = Router();

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    // Images
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    // Text / code
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".yaml": "text/yaml",
    ".yml": "text/yaml",
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".tsx": "text/typescript",
    ".jsx": "text/javascript",
    ".py": "text/x-python",
    ".sh": "text/x-shellscript",
    ".csv": "text/csv",
    ".xml": "text/xml",
    ".toml": "text/toml",
    ".ini": "text/plain",
    ".cfg": "text/plain",
    ".env": "text/plain",
    ".log": "text/plain",
    // Documents / archives
    ".pdf": "application/pdf",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".tar": "application/x-tar",
  };
  return mimeMap[ext] || "application/octet-stream";
}

function isPathAllowed(filePath: string, projectsRoot: string): boolean {
  const resolved = path.resolve(filePath);
  const dataDir = path.resolve("data");

  return resolved.startsWith(projectsRoot) || resolved.startsWith(dataDir);
}

// GET /api/files/browse — List directory contents (all files + subdirectories)
router.get("/browse", async (req: Request, res: Response) => {
  const projectsRoot = await getProjectsRoot();
  if (!projectsRoot) {
    res.status(500).json({ error: "Projects root not configured" });
    return;
  }

  const dirPath = (req.query.path as string) || projectsRoot;

  if (!isPathAllowed(dirPath, projectsRoot)) {
    res.status(403).json({ error: "Access denied: path outside allowed directories" });
    return;
  }

  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    res.status(404).json({ error: "Directory not found" });
    return;
  }

  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true });
    const directories: { name: string; path: string }[] = [];
    const files: { name: string; path: string; size: number; mimeType: string }[] = [];

    for (const entry of entries) {
      // Skip hidden files/dirs
      if (entry.name.startsWith(".")) continue;
      // Skip node_modules, dist, .git
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;

      const fullPath = path.join(resolved, entry.name);

      if (entry.isDirectory()) {
        directories.push({ name: entry.name, path: fullPath });
      } else if (entry.isFile()) {
        const stat = fs.statSync(fullPath);
        files.push({
          name: entry.name,
          path: fullPath,
          size: stat.size,
          mimeType: getMimeType(entry.name),
        });
      }
    }

    // Sort alphabetically
    directories.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));

    res.json({ directories, files, currentPath: resolved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/files/search — Search for files by pattern
router.get("/search", async (req: Request, res: Response) => {
  const query = req.query.q as string;
  if (!query || query.length < 2) {
    res.status(400).json({ error: "Search query must be at least 2 characters" });
    return;
  }

  const projectsRoot = await getProjectsRoot();
  if (!projectsRoot) {
    res.status(500).json({ error: "Projects root not configured" });
    return;
  }

  try {
    // Search for all files matching the query
    const pattern = `**/*${query}*`;

    const matches = await fg(pattern, {
      cwd: projectsRoot,
      absolute: true,
      ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
      caseSensitiveMatch: false,
      onlyFiles: true,
      deep: 6,
    });

    // Limit results
    const results = matches.slice(0, 50).map((filePath) => {
      const stat = fs.statSync(filePath);
      // Try to determine project name from path
      const relative = path.relative(projectsRoot, filePath);
      const projectName = relative.split(path.sep)[0] || "";

      return {
        name: path.basename(filePath),
        path: filePath,
        size: stat.size,
        mimeType: getMimeType(filePath),
        projectName,
      };
    });

    res.json(results);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: message });
  }
});

// GET /api/files/serve — Serve a file for preview
router.get("/serve", async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "Path parameter required" });
    return;
  }

  const projectsRoot = await getProjectsRoot();
  if (!projectsRoot) {
    res.status(500).json({ error: "Projects root not configured" });
    return;
  }

  if (!isPathAllowed(filePath, projectsRoot)) {
    res.status(403).json({ error: "Access denied: path outside allowed directories" });
    return;
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  res.setHeader("Content-Type", getMimeType(resolved));
  res.setHeader("Cache-Control", "public, max-age=3600");
  fs.createReadStream(resolved).pipe(res);
});

// GET /api/files/download — Download a file (triggers Save-As dialog)
router.get("/download", async (req: Request, res: Response) => {
  const filePath = req.query.path as string;
  if (!filePath) {
    res.status(400).json({ error: "Path parameter required" });
    return;
  }

  const projectsRoot = await getProjectsRoot();
  if (!projectsRoot) {
    res.status(500).json({ error: "Projects root not configured" });
    return;
  }

  if (!isPathAllowed(filePath, projectsRoot)) {
    res.status(403).json({ error: "Access denied: path outside allowed directories" });
    return;
  }

  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const filename = path.basename(resolved);
  res.setHeader("Content-Type", getMimeType(resolved));
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.setHeader("Cache-Control", "no-cache");
  fs.createReadStream(resolved).pipe(res);
});

export default router;
