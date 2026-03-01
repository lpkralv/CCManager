import { Router, Request, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const router = Router();

const UPLOADS_DIR = path.resolve("data/uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".bmp",
  ".tiff",
]);
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/tiff",
]);

// Ensure uploads directory exists
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (_req, file, cb) => {
    const sanitized = file.originalname
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_{2,}/g, "_");
    cb(null, `${uuidv4()}-${sanitized}`);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
    cb(new Error(`File type not allowed: ${file.originalname}`));
    return;
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

// POST /api/uploads — Upload one or more images
router.post(
  "/",
  upload.array("images", 10),
  (req: Request, res: Response) => {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const results = files.map((file) => ({
      id: path.basename(file.filename, path.extname(file.filename)),
      filename: file.filename,
      originalName: file.originalname,
      path: path.resolve(file.path),
      size: file.size,
      mimeType: file.mimetype,
      createdAt: new Date().toISOString(),
    }));

    res.status(201).json(results);
  },
);

// GET /api/uploads/:filename — Serve an uploaded file (for preview)
router.get("/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (!filename) {
    res.status(400).json({ error: "Filename required" });
    return;
  }

  // Find matching file (filename param may or may not include extension)
  const files = fs.readdirSync(UPLOADS_DIR);
  const match = files.find(
    (f) => f === filename || f.startsWith(filename + ".") || f.startsWith(filename + "-"),
  );

  if (!match) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, match);
  // Security: ensure path is within uploads dir
  if (!filePath.startsWith(UPLOADS_DIR)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  res.sendFile(filePath);
});

// DELETE /api/uploads/:filename — Remove an uploaded file
router.delete("/:filename", (req: Request, res: Response) => {
  const filename = req.params.filename;
  if (!filename) {
    res.status(400).json({ error: "Filename required" });
    return;
  }

  const files = fs.readdirSync(UPLOADS_DIR);
  const match = files.find(
    (f) => f === filename || f.startsWith(filename + ".") || f.startsWith(filename + "-"),
  );

  if (!match) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const filePath = path.join(UPLOADS_DIR, match);
  if (!filePath.startsWith(UPLOADS_DIR)) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  fs.unlinkSync(filePath);
  res.json({ success: true });
});

export default router;
