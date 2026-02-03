import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import apiRoutes from "./routes/index.js";
import { setupWebSocket } from "./websocket/index.js";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

const PORT = process.env.PORT ?? 3000;

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

// Setup WebSocket server
setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║              Claude Code Manager Dashboard                 ║
╠════════════════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}                  ║
║  WebSocket at:      ws://localhost:${PORT}                    ║
║  API endpoints:     http://localhost:${PORT}/api              ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export { app, server };
