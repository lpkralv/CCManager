import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import { taskManager, TaskEvent } from "../../services/task-manager.js";

export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws: WebSocket) => {
    console.log("WebSocket client connected");

    // Send current state on connect
    try {
      const activeTasks = taskManager.getActiveTasks();
      ws.send(
        JSON.stringify({
          type: "initial",
          tasks: activeTasks,
        })
      );
    } catch (err) {
      console.error("Failed to send initial state to WebSocket client:", err);
    }

    ws.on("close", () => {
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

  // Forward task events to all connected clients
  taskManager.on("event", (event: TaskEvent) => {
    const message = JSON.stringify(event);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error("Failed to send event to WebSocket client, removing dead client:", err);
          // Remove dead client to prevent future send failures
          wss.clients.delete(client);
        }
      }
    });
  });

  return wss;
}
