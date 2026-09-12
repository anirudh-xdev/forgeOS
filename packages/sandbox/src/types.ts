import { SandboxExecutionResult } from "@forgeos/contracts";

export interface WorkspaceOptions {
  baseDir?: string;
}

export interface SandboxRunnerOptions {
  image?: string;
  cpus?: number;
  memory?: string;
  pidsLimit?: number;
  timeoutMs?: number;
  network?: "none" | "bridge" | "host";
  user?: string;
}

export { SandboxExecutionResult };
