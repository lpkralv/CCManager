import { createServer } from "http";
import dotenv from "dotenv";
import { createApp } from "./app.js";
import { setupWebSocket } from "./websocket/index.js";

// Load environment variables
dotenv.config();

const app = createApp();
const server = createServer(app);

const PORT = process.env.PORT ?? 3000;

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
