import { DomainEvent, TaskNode, TaskEdge, TaskGraphSnapshot } from "@forgeos/contracts";

export interface ProjectSummary {
  id: string;
  name: string;
  requirement: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED";
  createdAt: string;
  taskCount: number;
  artifactCount: number;
  eventCount: number;
}

export interface ProjectDetail {
  id: string;
  name: string;
  requirement: string;
  status: "ACTIVE" | "COMPLETED" | "FAILED";
  createdAt: string;
  updatedAt: string;
  budget?: {
    maxTokens: number;
    maxCost: number;
    maxRuntimeMinutes: number;
  };
  tasks: Array<{
    id: string;
    agentId: string;
    status: string;
    input: unknown;
    runs: Array<{
      id: string;
      model: string;
      provider: string;
      status: string;
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
      startedAt: string;
      completedAt?: string;
      error?: string;
      rawOutput?: string;
    }>;
    artifacts: Array<{
      id: string;
      type: string;
      status: string;
      version: number;
      createdAt: string;
    }>;
  }>;
  artifacts: Array<{
    id: string;
    projectId: string;
    taskId?: string;
    type: string;
    version: number;
    createdBy: string;
    content: unknown;
    status: "draft" | "approved" | "rejected";
    createdAt: string;
  }>;
  events: DomainEvent[];
}

export type { TaskNode, TaskEdge, TaskGraphSnapshot, DomainEvent };
