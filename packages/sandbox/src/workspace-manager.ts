import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ForgeOSError } from "@forgeos/shared";
import { WorkspaceOptions } from "./types.js";

export class WorkspaceManager {
  private baseDir: string;

  constructor(options?: WorkspaceOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), ".worktrees"));
  }

  public getWorkspacePath(taskId: string): string {
    return path.join(this.baseDir, taskId);
  }

  public async createWorkspace(taskId: string): Promise<string> {
    const wsPath = this.getWorkspacePath(taskId);
    await fs.mkdir(wsPath, { recursive: true });
    return wsPath;
  }

  private resolveSafePath(taskId: string, relativePath: string): string {
    const wsPath = this.getWorkspacePath(taskId);
    const resolved = path.resolve(wsPath, relativePath);
    if (!resolved.startsWith(wsPath)) {
      throw new ForgeOSError(
        `Path traversal detected: '${relativePath}' escapes workspace '${wsPath}'`,
        "SECURITY_VIOLATION",
        403
      );
    }
    return resolved;
  }

  public async writeFile(
    taskId: string,
    relativePath: string,
    content: string
  ): Promise<void> {
    const filePath = this.resolveSafePath(taskId, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
  }

  public async readFile(taskId: string, relativePath: string): Promise<string> {
    const filePath = this.resolveSafePath(taskId, relativePath);
    return fs.readFile(filePath, "utf-8");
  }

  public async listFiles(taskId: string): Promise<string[]> {
    const wsPath = this.getWorkspacePath(taskId);
    const results: string[] = [];

    const walk = async (currentDir: string, relPrefix = "") => {
      try {
        const entries = await fs.readdir(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const entryRel = relPrefix ? `${relPrefix}/${entry.name}` : entry.name;
          if (entry.isDirectory()) {
            await walk(path.join(currentDir, entry.name), entryRel);
          } else if (entry.isFile()) {
            results.push(entryRel);
          }
        }
      } catch (err: any) {
        if (err.code !== "ENOENT") throw err;
      }
    };

    await walk(wsPath);
    return results;
  }

  public async cleanupWorkspace(taskId: string): Promise<void> {
    const wsPath = this.getWorkspacePath(taskId);
    try {
      await fs.rm(wsPath, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}
