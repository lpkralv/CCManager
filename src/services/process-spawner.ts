import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";
import path from "path";

export interface SpawnOptions {
  cwd: string;
  prompt: string;
  maxBudget?: number;
  images?: string[];
}

export interface ProcessEvents {
  output: (data: string) => void;
  error: (data: string) => void;
  exit: (code: number | null, signal: NodeJS.Signals | null) => void;
}

export class ClaudeProcess extends EventEmitter {
  private process: ChildProcess | null = null;
  private output = "";
  private errorOutput = "";

  constructor(private options: SpawnOptions) {
    super();
  }

  start(): void {
    const maxTurns = this.options.maxBudget
      ? Math.max(100, Math.ceil(this.options.maxBudget * 50))
      : 100;

    const turnAdvisory =
      `\n\n---\nSYSTEM NOTE: This session has a maximum of ${maxTurns} turns. ` +
      `If you cannot fully complete this task within that limit, please: ` +
      `(1) save all partial work (commit any changes, create TODO/notes files, etc.), ` +
      `(2) document clearly what was completed and what still remains, and ` +
      `(3) return a concise summary of progress and remaining work as your final response. ` +
      `Do not let the session end with an unhandled error — return a meaningful partial result.`;

    const brewNote =
      `\n\nSYSTEM NOTE: The zsh completion directories /opt/homebrew/share/zsh/ and ` +
      `/opt/homebrew/share/zsh/site-functions/ are owned by user 'louisslothouber', not 'agenthome'. ` +
      `Tab-completion works fine. However, if you run brew install or brew upgrade for packages that ` +
      `include zsh completions, Homebrew may not be able to update the symlinks in site-functions/. ` +
      `If this happens, ask the louisslothouber account to run: brew link --overwrite <package-name>`;

    let attachmentBlocks = "";
    if (this.options.images && this.options.images.length > 0) {
      const imageExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".tiff"]);
      const imagePaths = this.options.images.filter(
        (p) => imageExts.has(path.extname(p).toLowerCase())
      );
      const filePaths = this.options.images.filter(
        (p) => !imageExts.has(path.extname(p).toLowerCase())
      );

      if (imagePaths.length > 0) {
        attachmentBlocks +=
          "\n\n---\nIMAGE ATTACHMENTS: The following image files have been attached to this task.\n" +
          "Use the Read tool to view each image before starting work.\n" +
          imagePaths.map((p) => `<image_path>${p}</image_path>`).join("\n");
      }

      if (filePaths.length > 0) {
        attachmentBlocks +=
          "\n\n---\nFILE ATTACHMENTS: The following files have been attached to this task.\n" +
          "Use the Read tool to read each file before starting work.\n" +
          filePaths.map((p) => `<file_path>${p}</file_path>`).join("\n");
      }
    }

    const promptWithAdvisory = this.options.prompt + attachmentBlocks + turnAdvisory + brewNote;

    const args = [
      "-p",
      promptWithAdvisory,
      "--dangerously-skip-permissions",
      "--max-turns",
      maxTurns.toString(),
    ];

    // Add verbose for streaming output
    args.push("--verbose");

    const env = { ...process.env };
    delete env.CLAUDECODE;
    env.CLAUDE_CODE_MAX_OUTPUT_TOKENS = "100000";

    this.process = spawn("claude", args, {
      cwd: this.options.cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    this.process.stdout?.on("data", (data: Buffer) => {
      const str = data.toString();
      this.output += str;
      this.emit("output", str);
    });

    this.process.stderr?.on("data", (data: Buffer) => {
      const str = data.toString();
      this.errorOutput += str;
      this.emit("error", str);
    });

    this.process.on("exit", (code, signal) => {
      this.emit("exit", code, signal);
    });

    this.process.on("error", (err) => {
      this.emit("error", err.message);
      this.emit("exit", 1, null);
    });
  }

  kill(): void {
    if (this.process && !this.process.killed) {
      this.process.kill("SIGTERM");
    }
  }

  getOutput(): string {
    return this.output;
  }

  getErrorOutput(): string {
    return this.errorOutput;
  }

  isRunning(): boolean {
    return this.process !== null && !this.process.killed;
  }
}

export function spawnClaude(options: SpawnOptions): ClaudeProcess {
  const proc = new ClaudeProcess(options);
  proc.start();
  return proc;
}
