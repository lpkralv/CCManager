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

  // -----------------------------------------------------------------------
  // Regression tests: error handling in client.send()
  // -----------------------------------------------------------------------
  it("should not crash when initial state send fails on connection", () => {
    vi.mocked(taskManager.getActiveTasks).mockReturnValue([
      { id: "task-1", status: "running" },
    ] as any);

    const wss = setupWebSocket(mockServer);

    const mockWs = new EventEmitter() as any;
    mockWs.send = vi.fn().mockImplementation(() => {
      throw new Error("WebSocket is not open");
    });

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should not throw
    expect(() => wss.emit("connection", mockWs)).not.toThrow();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to send initial state to WebSocket client:",
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it("should still register close and error handlers even if initial send fails", () => {
    vi.mocked(taskManager.getActiveTasks).mockReturnValue([
      { id: "task-1", status: "running" },
    ] as any);

    const wss = setupWebSocket(mockServer);

    const mockWs = new EventEmitter() as any;
    mockWs.send = vi.fn().mockImplementation(() => {
      throw new Error("WebSocket is not open");
    });
    const onSpy = vi.spyOn(mockWs, "on");

    vi.spyOn(console, "error").mockImplementation(() => {});

    wss.emit("connection", mockWs);

    const registeredEvents = onSpy.mock.calls.map((call) => call[0]);
    expect(registeredEvents).toContain("close");
    expect(registeredEvents).toContain("error");

    vi.mocked(console.error).mockRestore();
  });

  it("should not stop event forwarding to other clients when one client.send() throws", () => {
    const wss = setupWebSocket(mockServer);

    const failingClient = {
      readyState: WebSocket.OPEN,
      send: vi.fn().mockImplementation(() => {
        throw new Error("Connection reset");
      }),
    };
    const healthyClient = { readyState: WebSocket.OPEN, send: vi.fn() };

    (wss as any).clients.add(failingClient);
    (wss as any).clients.add(healthyClient);

    const onCall = vi.mocked(taskManager.on).mock.calls.find(
      (call) => call[0] === "event"
    );
    const eventHandler = onCall![1] as (event: any) => void;

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const taskEvent = { type: "task:failed", task: { id: "task-3" } };
    eventHandler(taskEvent);

    // The healthy client should still receive the event
    expect(healthyClient.send).toHaveBeenCalledWith(JSON.stringify(taskEvent));

    consoleSpy.mockRestore();
  });

  it("should remove a dead client from the clients set after send failure", () => {
    const wss = setupWebSocket(mockServer);

    const deadClient = {
      readyState: WebSocket.OPEN,
      send: vi.fn().mockImplementation(() => {
        throw new Error("Connection reset");
      }),
    };

    (wss as any).clients.add(deadClient);
    expect((wss as any).clients.size).toBe(1);

    const onCall = vi.mocked(taskManager.on).mock.calls.find(
      (call) => call[0] === "event"
    );
    const eventHandler = onCall![1] as (event: any) => void;

    vi.spyOn(console, "error").mockImplementation(() => {});

    eventHandler({ type: "task:started", task: { id: "task-1" } });

    // Dead client should have been removed
    expect((wss as any).clients.size).toBe(0);
    expect((wss as any).clients.has(deadClient)).toBe(false);

    vi.mocked(console.error).mockRestore();
  });

  it("should continue delivering events after a previous send failure removed a dead client", () => {
    const wss = setupWebSocket(mockServer);

    const deadClient = {
      readyState: WebSocket.OPEN,
      send: vi.fn().mockImplementation(() => {
        throw new Error("Connection reset");
      }),
    };
    const healthyClient = { readyState: WebSocket.OPEN, send: vi.fn() };

    (wss as any).clients.add(deadClient);
    (wss as any).clients.add(healthyClient);

    const onCall = vi.mocked(taskManager.on).mock.calls.find(
      (call) => call[0] === "event"
    );
    const eventHandler = onCall![1] as (event: any) => void;

    vi.spyOn(console, "error").mockImplementation(() => {});

    // First event: dead client gets removed
    const event1 = { type: "task:started", task: { id: "task-1" } };
    eventHandler(event1);

    expect(healthyClient.send).toHaveBeenCalledWith(JSON.stringify(event1));
    expect((wss as any).clients.size).toBe(1);

    // Second event: only healthy client remains, should still work
    const event2 = { type: "task:completed", task: { id: "task-1" } };
    eventHandler(event2);

    expect(healthyClient.send).toHaveBeenCalledWith(JSON.stringify(event2));
    expect(healthyClient.send).toHaveBeenCalledTimes(2);

    vi.mocked(console.error).mockRestore();
  });
});
