import { app, BrowserWindow, dialog, Menu } from "electron";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, ChildProcess } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let appInitiatedShutdown = false;

const PORT = process.env.PORT ?? 3001;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "CCManager",
    backgroundColor: "#1a1a2e",
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the local server URL
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Open DevTools in development
  if (process.env.NODE_ENV === "development") {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startServer(): void {
  // In production, the server is bundled with the app
  const serverPath = path.join(__dirname, "../server/index.js");

  // Set cwd to the app root so services can find data/ and public/ via process.cwd()
  const appRoot = path.join(__dirname, "../..");

  // Use Electron's own binary as Node runtime — system `node` may not be
  // in PATH when the app is launched from Finder.
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: PORT.toString(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.on("data", (data: Buffer) => {
    console.log(`Server: ${data.toString()}`);
  });

  serverProcess.stderr?.on("data", (data: Buffer) => {
    console.error(`Server Error: ${data.toString()}`);
  });

  serverProcess.on("error", (err) => {
    console.error("Failed to start server:", err);
  });

  serverProcess.on("exit", (code, signal) => {
    console.log(`Server exited with code ${code} and signal ${signal}`);
    serverProcess = null;

    // If the app initiated the shutdown (e.g. window closed, Cmd+Q),
    // don't do anything — the app is already quitting.
    if (appInitiatedShutdown) {
      return;
    }

    // The server exited on its own (e.g. user clicked "Stop Server" in the dashboard).
    // Quit the Electron app so we don't leave a dead window open.
    if (code !== 0 && code !== null) {
      dialog.showErrorBox(
        "Server Error",
        `The server process exited unexpectedly (code ${code}). The application will now close.`,
      );
    }
    app.quit();
  });
}

function stopServer(): void {
  if (serverProcess && !serverProcess.killed) {
    appInitiatedShutdown = true;
    serverProcess.kill("SIGTERM");
    serverProcess = null;
  }
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: "CCManager",
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        { type: "separator" },
        { role: "front" },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Learn More",
          click: async () => {
            const { shell } = await import("electron");
            await shell.openExternal("https://github.com/lpkralv/CCManager");
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Wait for server to be ready
function waitForServer(maxAttempts = 30): Promise<void> {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkServer = async () => {
      attempts++;
      try {
        const response = await fetch(`http://localhost:${PORT}/api/health`);
        if (response.ok) {
          resolve();
          return;
        }
      } catch {
        // Server not ready yet
      }

      if (attempts >= maxAttempts) {
        reject(new Error("Server failed to start"));
        return;
      }

      setTimeout(checkServer, 500);
    };

    checkServer();
  });
}

app.whenReady().then(async () => {
  createMenu();
  startServer();

  try {
    await waitForServer();
    createWindow();
  } catch (err) {
    console.error("Failed to start application:", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  stopServer(); // Always stop server when all windows close
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  stopServer();
});
