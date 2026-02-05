import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import apiRoutes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Express {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, _res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
  });

  // Serve static files from public directory
  const publicPath = path.join(__dirname, "../../public");
  app.use(express.static(publicPath));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Shutdown endpoint
  app.post("/api/shutdown", (_req, res) => {
    res.json({ message: "Server shutting down..." });
    // Give time for response to be sent
    setTimeout(() => {
      console.log("Shutdown requested via API");
      process.exit(0);
    }, 500);
  });

  // API routes
  app.use("/api", apiRoutes);

  // Catch-all for SPA (serve index.html for non-API routes)
  app.get("*", (_req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  // Error handling middleware
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error("Error:", err);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    }
  );

  return app;
}
