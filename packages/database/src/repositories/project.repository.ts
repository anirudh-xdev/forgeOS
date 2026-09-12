import { PrismaClient } from "@prisma/client";
import { getPrismaClient } from "../client.js";

export interface CreateProjectInput {
  id?: string;
  userId: string;
  name: string;
  requirement: string;
  status?: string;
}

export interface SaveTaskInput {
  id: string;
  projectId: string;
  agentId: string;
  input: Record<string, unknown>;
  expectedOutput?: Record<string, unknown>;
  status?: string;
}

export interface SaveAgentRunInput {
  id?: string;
  taskId: string;
  provider: string;
  model: string;
  startedAt?: Date;
  completedAt?: Date;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status?: string;
  error?: string;
  rawOutput?: string;
}

export interface SaveDomainEventInput {
  id?: string;
  projectId: string;
  type: string;
  taskId?: string;
  timestamp?: Date | string;
  payload: Record<string, unknown>;
}

export class ProjectRepository {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma ?? getPrismaClient();
  }

  public async findOrCreateDefaultUser(
    email: string = "developer@forgeos.local",
    name: string = "ForgeOS Developer"
  ) {
    return this.prisma.user.upsert({
      where: { email },
      create: {
        email,
        name,
      },
      update: {
        name,
      },
    });
  }

  public async findOrCreateAgent(agent: {
    id: string;
    role: string;
    capabilities?: string[];
    inputSchema?: unknown;
    outputSchema?: unknown;
    tools?: string[];
  }) {
    return this.prisma.agent.upsert({
      where: { id: agent.id },
      create: {
        id: agent.id,
        role: agent.role,
        capabilities: agent.capabilities ?? [],
        inputSchema: (agent.inputSchema ?? {}) as any,
        outputSchema: (agent.outputSchema ?? {}) as any,
        tools: agent.tools ?? [],
      },
      update: {
        role: agent.role,
        capabilities: agent.capabilities ?? [],
        tools: agent.tools ?? [],
      },
    });
  }

  public async createProject(data: CreateProjectInput) {
    return this.prisma.project.create({
      data: {
        id: data.id,
        userId: data.userId,
        name: data.name,
        requirement: data.requirement,
        status: data.status ?? "ACTIVE",
        budget: {
          create: {
            maxTokens: 500000,
            maxCost: 10.0,
            maxRuntimeMinutes: 60,
          },
        },
      },
      include: {
        budget: true,
      },
    });
  }

  public async getProject(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        budget: true,
        tasks: {
          include: {
            runs: true,
            artifacts: true,
          },
        },
        artifacts: {
          orderBy: { createdAt: "asc" },
        },
        events: {
          orderBy: { timestamp: "asc" },
        },
      },
    });
  }

  public async listProjects() {
    return this.prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        budget: true,
        tasks: true,
        artifacts: true,
        events: {
          orderBy: { timestamp: "asc" },
        },
      },
    });
  }

  public async saveAgentTask(data: SaveTaskInput) {
    // Ensure agent exists first if not present
    await this.findOrCreateAgent({
      id: data.agentId,
      role: data.agentId,
    });

    return this.prisma.agentTask.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        projectId: data.projectId,
        agentId: data.agentId,
        input: data.input as any,
        expectedOutput: data.expectedOutput ? (data.expectedOutput as any) : undefined,
        status: data.status ?? "PENDING",
      },
      update: {
        status: data.status,
        input: data.input as any,
        expectedOutput: data.expectedOutput ? (data.expectedOutput as any) : undefined,
      },
    });
  }

  public async updateTaskStatus(taskId: string, status: string) {
    return this.prisma.agentTask.update({
      where: { id: taskId },
      data: { status, updatedAt: new Date() },
    });
  }

  public async saveAgentRun(data: SaveAgentRunInput) {
    return this.prisma.agentRun.create({
      data: {
        id: data.id,
        taskId: data.taskId,
        provider: data.provider,
        model: data.model,
        startedAt: data.startedAt ?? new Date(),
        completedAt: data.completedAt,
        inputTokens: data.inputTokens,
        outputTokens: data.outputTokens,
        latencyMs: data.latencyMs,
        status: data.status ?? "running",
        error: data.error,
        rawOutput: data.rawOutput,
      },
    });
  }

  public async saveDomainEvent(event: SaveDomainEventInput) {
    return this.prisma.domainEventRecord.create({
      data: {
        id: event.id,
        projectId: event.projectId,
        type: event.type,
        taskId: event.taskId,
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
        payload: event.payload as any,
      },
    });
  }

  public async listDomainEvents(projectId: string) {
    return this.prisma.domainEventRecord.findMany({
      where: { projectId },
      orderBy: { timestamp: "asc" },
    });
  }
}
