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
    const args = [
      "-p",
      this.options.prompt,
      "--dangerously-skip-permissions",
    ];

    if (this.options.maxBudget) {
      args.push("--max-turns", Math.max(25, Math.ceil(this.options.maxBudget * 10)).toString());
    }

    // Add verbose for streaming output
    args.push("--verbose");

    this.process = spawn("claude", args, {
      cwd: this.options.cwd,
      env: { ...process.env },
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
