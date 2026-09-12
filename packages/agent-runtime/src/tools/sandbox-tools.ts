import { z } from "zod";
import { WorkspaceManager, SandboxRunner } from "@forgeos/sandbox";
import { ToolDefinition } from "../types.js";

export function createWorkspaceWriteFileTool(
  wsManager: WorkspaceManager
): ToolDefinition<{ path: string; content: string }, { success: boolean; filePath: string }> {
  return {
    name: "write_workspace_file",
    description: "Write source code, test suites, or configuration files into the isolated task workspace.",
    permission: "WRITE",
    schema: z.object({
      path: z.string().min(1),
      content: z.string(),
    }),
    async execute(args, context) {
      await wsManager.writeFile(context.taskId, args.path, args.content);
      return { success: true, filePath: args.path };
    },
  };
}

export function createWorkspaceReadFileTool(
  wsManager: WorkspaceManager
): ToolDefinition<{ path: string }, { content: string }> {
  return {
    name: "read_workspace_file",
    description: "Read the contents of a file from the isolated task workspace.",
    permission: "READ",
    schema: z.object({
      path: z.string().min(1),
    }),
    async execute(args, context) {
      const content = await wsManager.readFile(context.taskId, args.path);
      return { content };
    },
  };
}

export function createSandboxExecuteTool(
  wsManager: WorkspaceManager,
  runner: SandboxRunner
): ToolDefinition<
  { command: string; timeoutMs?: number },
  { exitCode: number; stdout: string; stderr: string; timedOut: boolean; durationMs: number }
> {
  return {
    name: "execute_sandbox",
    description: "Execute a command (e.g. build, tests) safely inside the isolated Docker sandbox.",
    permission: "READ",
    schema: z.object({
      command: z.string().min(1),
      timeoutMs: z.number().int().positive().optional(),
    }),
    async execute(args, context) {
      const wsPath = wsManager.getWorkspacePath(context.taskId);
      const result = await runner.executeInSandbox(wsPath, args.command, {
        timeoutMs: args.timeoutMs,
      });
      return result;
    },
  };
}
