import { Router, Request, Response } from "express";
import path from "path";
import fs from "fs";
import fg from "fast-glob";
import { getProjectsRoot } from "../../services/settings-service.js";

const router = Router();

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
]);

function isImageFile(filename: string): boolean {
  return IMAGE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
  };
  return mimeMap[ext] || "application/octet-stream";
}

function isPathAllowed(filePath: string, projectsRoot: string): boolean {
  const resolved = path.resolve(filePath);
  const dataDir = path.resolve("data");

  return resolved.startsWith(projectsRoot) || resolved.startsWith(dataDir);
}

// GET /api/files/browse — List directory contents (images + subdirectories)
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
      // Skip node_modules
      if (entry.name === "node_modules") continue;

      const fullPath = path.join(resolved, entry.name);

      if (entry.isDirectory()) {
        directories.push({ name: entry.name, path: fullPath });
      } else if (entry.isFile() && isImageFile(entry.name)) {
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

// GET /api/files/search — Search for image files by pattern
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
    // Search for image files matching the query
    const extensions = Array.from(IMAGE_EXTENSIONS).map((e) => e.slice(1));
    const pattern = `**/*${query}*.{${extensions.join(",")}}`;

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

// GET /api/files/serve — Serve an image file for preview
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

  if (!isImageFile(resolved)) {
    res.status(400).json({ error: "Not an image file" });
    return;
  }

  res.setHeader("Content-Type", getMimeType(resolved));
  res.setHeader("Cache-Control", "public, max-age=3600");
  fs.createReadStream(resolved).pipe(res);
});

export default router;
