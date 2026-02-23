import { spawn, ChildProcess } from "child_process";
import { EventEmitter } from "events";

export interface SpawnOptions {
  cwd: string;
  prompt: string;
  maxBudget?: number;
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

    const promptWithAdvisory = this.options.prompt + turnAdvisory;

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
