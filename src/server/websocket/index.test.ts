import { describe, it, expect, vi, beforeEach } from "vitest";
import { EventEmitter } from "events";

vi.mock("../../services/task-manager.js", () => ({
  taskManager: {
    getActiveTasks: vi.fn().mockReturnValue([]),
    on: vi.fn(),
    emit: vi.fn(),
  },
}));

vi.mock("ws", async () => {
  const { EventEmitter: EE } = await import("events");

  class MockWebSocketServer extends EE {
    clients = new Set();
    constructor(_opts?: any) {
      super();
    }
  }

  return {
    WebSocketServer: MockWebSocketServer,
    WebSocket: { OPEN: 1, CLOSED: 3 },
  };
});

import { setupWebSocket } from "./index.js";
import { WebSocket } from "ws";
import { taskManager } from "../../services/task-manager.js";
import type { Server } from "http";

describe("setupWebSocket", () => {
  let mockServer: Server;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {} as Server;
  });

  it("should create a WebSocketServer with the provided server", () => {
    const wss = setupWebSocket(mockServer);

    expect(wss).toBeInstanceOf(EventEmitter);
    expect(wss).toHaveProperty("clients");
  });

  it("should return the WebSocketServer instance", () => {
    const wss = setupWebSocket(mockServer);

    expect(wss).toBeDefined();
    expect(wss).toBeInstanceOf(EventEmitter);
  });

  it("should send initial state with active tasks on connection", () => {
    const activeTasks = [{ id: "task-1", status: "running" }];
    vi.mocked(taskManager.getActiveTasks).mockReturnValue(activeTasks as any);

    const wss = setupWebSocket(mockServer);

    const mockWs = new EventEmitter() as any;
    mockWs.send = vi.fn();

    wss.emit("connection", mockWs);

    expect(taskManager.getActiveTasks).toHaveBeenCalled();
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: "initial", tasks: activeTasks })
    );
  });

  it("should register close and error handlers on connection", () => {
    const wss = setupWebSocket(mockServer);

    const mockWs = new EventEmitter() as any;
    mockWs.send = vi.fn();
    const onSpy = vi.spyOn(mockWs, "on");

    wss.emit("connection", mockWs);

    const registeredEvents = onSpy.mock.calls.map((call) => call[0]);
    expect(registeredEvents).toContain("close");
    expect(registeredEvents).toContain("error");
  });

  it("should forward task events to all OPEN clients", () => {
    const wss = setupWebSocket(mockServer);

    const openClient = { readyState: WebSocket.OPEN, send: vi.fn() };
    (wss as any).clients.add(openClient);

    // Retrieve the "event" listener registered on taskManager
    const onCall = vi.mocked(taskManager.on).mock.calls.find(
      (call) => call[0] === "event"
    );
    expect(onCall).toBeDefined();
    const eventHandler = onCall![1] as (event: any) => void;

    const taskEvent = { type: "task:started", task: { id: "task-1" } };
    eventHandler(taskEvent);

    expect(openClient.send).toHaveBeenCalledWith(JSON.stringify(taskEvent));
  });

  it("should skip CLOSED clients when forwarding task events", () => {
    const wss = setupWebSocket(mockServer);

    const openClient = { readyState: WebSocket.OPEN, send: vi.fn() };
    const closedClient = { readyState: WebSocket.CLOSED, send: vi.fn() };
    (wss as any).clients.add(openClient);
    (wss as any).clients.add(closedClient);

    const onCall = vi.mocked(taskManager.on).mock.calls.find(
      (call) => call[0] === "event"
    );
    const eventHandler = onCall![1] as (event: any) => void;

    const taskEvent = { type: "task:completed", task: { id: "task-2" } };
    eventHandler(taskEvent);

    expect(openClient.send).toHaveBeenCalledWith(JSON.stringify(taskEvent));
    expect(closedClient.send).not.toHaveBeenCalled();
  });
});
