import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import { WorkspaceManager } from "../src/workspace-manager.js";
import { SandboxRunner } from "../src/sandbox-runner.js";

describe("SandboxRunner", () => {
  const runner = new SandboxRunner();
  const testBaseDir = path.join(process.cwd(), "scratch", "test-sandbox-ws");
  const wsManager = new WorkspaceManager({ baseDir: testBaseDir });
  const testTaskId = `sandbox-test-${Date.now()}`;
  let dockerAvailable = false;

  beforeAll(async () => {
    dockerAvailable = await runner.isDockerAvailable();
  });

  it("should check docker availability", async () => {
    expect(typeof dockerAvailable).toBe("boolean");
  });

  it(
    "should execute command inside Docker sandbox and capture output",
    async () => {
      if (!dockerAvailable) {
        console.warn("Skipping Docker test: Docker daemon not reachable");
        return;
      }

      const wsPath = await wsManager.createWorkspace(testTaskId);
      await wsManager.writeFile(testTaskId, "hello.txt", "Sandbox File Content");

      const result = await runner.executeInSandbox(
        wsPath,
        "cat hello.txt",
        {
          image: "forgeos-sandbox:latest",
          timeoutMs: 15000,
        }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe("Sandbox File Content");
      expect(result.timedOut).toBe(false);

      await wsManager.cleanupWorkspace(testTaskId);
    },
    30000
  );

  it(
    "should enforce timeout and terminate long-running commands",
    async () => {
      if (!dockerAvailable) return;

      const wsPath = await wsManager.createWorkspace(testTaskId);

      const result = await runner.executeInSandbox(
        wsPath,
        "sleep 10",
        {
          image: "forgeos-sandbox:latest",
          timeoutMs: 1000, // 1 second timeout
        }
      );

      expect(result.timedOut).toBe(true);

      await wsManager.cleanupWorkspace(testTaskId);
    },
    30000
  );
});
