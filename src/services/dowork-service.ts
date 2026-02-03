import { readdir, readFile, stat } from "fs/promises";
import path from "path";

export interface DoWorkRequest {
  id: string;
  title: string;
  createdAt?: string;
  claimedAt?: string;
  completedAt?: string;
  status?: string;
}

export interface DoWorkQueue {
  pending: DoWorkRequest[];
  working: DoWorkRequest[];
  recentArchive: DoWorkRequest[];
}

async function dirExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function parseRequestFile(filePath: string): Promise<DoWorkRequest | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const fileName = path.basename(filePath, path.extname(filePath));

    // Parse YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);

    const request: DoWorkRequest = {
      id: fileName,
      title: fileName,
    };

    if (frontmatterMatch && frontmatterMatch[1]) {
      const frontmatter = frontmatterMatch[1];

      // Simple YAML parsing for common fields
      const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      if (titleMatch?.[1]) request.title = titleMatch[1];

      const statusMatch = frontmatter.match(/^status:\s*(\w+)/m);
      if (statusMatch?.[1]) request.status = statusMatch[1];

      const createdMatch = frontmatter.match(/^created(?:At)?:\s*(.+)/m);
      if (createdMatch?.[1]) request.createdAt = createdMatch[1].trim();

      const claimedMatch = frontmatter.match(/^claimed(?:At)?:\s*(.+)/m);
      if (claimedMatch?.[1]) request.claimedAt = claimedMatch[1].trim();

      const completedMatch = frontmatter.match(/^completed(?:At)?:\s*(.+)/m);
      if (completedMatch?.[1]) request.completedAt = completedMatch[1].trim();
    }

    // Use file stats as fallback for dates
    const stats = await stat(filePath);
    if (!request.createdAt) {
      request.createdAt = stats.birthtime.toISOString();
    }

    return request;
  } catch {
    return null;
  }
}

async function readRequestsFromDir(
  dirPath: string
): Promise<DoWorkRequest[]> {
  if (!(await dirExists(dirPath))) {
    return [];
  }

  try {
    const files = await readdir(dirPath);
    const requests: DoWorkRequest[] = [];

    for (const file of files) {
      // Skip hidden files and non-markdown files
      if (file.startsWith(".")) continue;
      if (!file.endsWith(".md")) continue;

      const filePath = path.join(dirPath, file);
      const request = await parseRequestFile(filePath);
      if (request) {
        requests.push(request);
      }
    }

    return requests;
  } catch {
    return [];
  }
}

export async function getDoWorkQueue(
  projectPath: string
): Promise<DoWorkQueue | null> {
  const doWorkPath = path.join(projectPath, "do-work");

  if (!(await dirExists(doWorkPath))) {
    return null;
  }

  const pending = await readRequestsFromDir(doWorkPath);
  const working = await readRequestsFromDir(path.join(doWorkPath, "working"));
  const archive = await readRequestsFromDir(path.join(doWorkPath, "archive"));

  // Sort archive by completedAt descending, take recent 10
  const recentArchive = archive
    .sort((a, b) => {
      const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
      const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);

  return {
    pending,
    working,
    recentArchive,
  };
}
