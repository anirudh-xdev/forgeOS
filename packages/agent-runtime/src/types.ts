import { z } from "zod";
import { AgentRun, Artifact } from "@forgeos/contracts";

export interface AgentContext {
  projectId: string;
  taskId: string;
  upstreamArtifacts?: Artifact[];
  metadata?: Record<string, unknown>;
}

export type ToolPermission = "READ" | "WRITE" | "DANGEROUS";

export interface ToolDefinition<TArgs = unknown, TResult = unknown> {
  name: string;
  description: string;
  permission: ToolPermission;
  schema: z.ZodType<TArgs>;
  execute(args: TArgs, context: AgentContext): Promise<TResult>;
}

export interface AgentResult {
  success: boolean;
  taskId: string;
  agentId: string;
  artifact?: Artifact;
  output?: unknown;
  error?: string;
  retriesUsed: number;
  runRecord: AgentRun;
  validationIssues?: Array<{ path: string; message: string }>;
}
