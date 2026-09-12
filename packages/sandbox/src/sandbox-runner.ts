import { spawn } from "node:child_process";
import { SandboxExecutionResult, SandboxRunnerOptions } from "./types.js";

export class SandboxRunner {
  private defaultOptions: Required<SandboxRunnerOptions>;

  constructor(options?: SandboxRunnerOptions) {
    this.defaultOptions = {
      image: options?.image ?? "forgeos-sandbox:latest",
      cpus: options?.cpus ?? 1.0,
      memory: options?.memory ?? "1024m",
      pidsLimit: options?.pidsLimit ?? 100,
      timeoutMs: options?.timeoutMs ?? 60000,
      network: options?.network ?? "none",
      user: options?.user ?? "node",
    };
  }

  public async isDockerAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn("docker", ["version"], { stdio: "ignore" });
      proc.on("error", () => resolve(false));
      proc.on("close", (code) => resolve(code === 0));
    });
  }

  public async executeInSandbox(
    workspacePath: string,
    command: string,
    customOptions?: SandboxRunnerOptions
  ): Promise<SandboxExecutionResult> {
    const opts = { ...this.defaultOptions, ...(customOptions ?? {}) };
    const startTime = Date.now();

    // Normalizing Windows path for Docker volume mounting:
    // e.g. "c:\Users\..." -> "/c/Users/..." or direct path
    const normalizedMountPath = workspacePath.replace(/\\/g, "/");

    const dockerArgs: string[] = [
      "run",
      "--rm",
      `--cpus=${opts.cpus}`,
      `--memory=${opts.memory}`,
      `--pids-limit=${opts.pidsLimit}`,
      `--network=${opts.network}`,
      "-v",
      `${normalizedMountPath}:/workspace:rw`,
      "-w",
      "/workspace",
    ];

    if (opts.user) {
      dockerArgs.push("--user", opts.user);
    }

    dockerArgs.push(opts.image, "sh", "-c", command);

    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      let timedOut = false;

      const proc = spawn("docker", dockerArgs, {
        shell: false,
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill("SIGKILL");
      }, opts.timeoutMs);

      proc.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString("utf-8");
      });

      proc.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString("utf-8");
      });

      proc.on("error", (err) => {
        clearTimeout(timer);
        resolve({
          exitCode: -1,
          stdout,
          stderr: stderr ? `${stderr}\n${err.message}` : err.message,
          durationMs: Date.now() - startTime,
          timedOut,
        });
      });

      proc.on("close", (code) => {
        clearTimeout(timer);
        resolve({
          exitCode: code ?? (timedOut ? -1 : 0),
          stdout,
          stderr,
          durationMs: Date.now() - startTime,
          timedOut,
        });
      });
    });
  }
}
