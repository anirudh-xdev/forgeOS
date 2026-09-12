import { describe, it, expect, afterEach } from "vitest";
import * as path from "node:path";
import { WorkspaceManager } from "../src/workspace-manager.js";

describe("WorkspaceManager", () => {
  const testBaseDir = path.join(process.cwd(), "scratch", "test-worktrees");
  const manager = new WorkspaceManager({ baseDir: testBaseDir });
  const testTaskId = `task-${Date.now()}`;

  afterEach(async () => {
    await manager.cleanupWorkspace(testTaskId);
  });

  it("should create workspace and write/read files with directory creation", async () => {
    const wsPath = await manager.createWorkspace(testTaskId);
    expect(wsPath).toContain(testTaskId);

    await manager.writeFile(testTaskId, "src/index.ts", "console.log('hello');");
    await manager.writeFile(testTaskId, "package.json", '{"name":"test-pkg"}');

    const content = await manager.readFile(testTaskId, "src/index.ts");
    expect(content).toBe("console.log('hello');");

    const files = await manager.listFiles(testTaskId);
    expect(files).toContain("src/index.ts");
    expect(files).toContain("package.json");
  });

  it("should block path traversal attempts outside the workspace", async () => {
    await manager.createWorkspace(testTaskId);

    await expect(
      manager.writeFile(testTaskId, "../../malicious.txt", "evil")
    ).rejects.toThrow("Path traversal detected");
  });

  it("should clean up workspace directory completely", async () => {
    await manager.createWorkspace(testTaskId);
    await manager.writeFile(testTaskId, "file.txt", "data");

    await manager.cleanupWorkspace(testTaskId);
    const files = await manager.listFiles(testTaskId);
    expect(files).toHaveLength(0);
  });
});
