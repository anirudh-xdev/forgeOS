import { Worker, WorkerOptions, Job } from "bullmq";
import { Redis } from "ioredis";
import { randomUUID } from "node:crypto";
import {
  AgentRunner,
  PMAgentDefinition,
  ArchitectAgentDefinition,
  DatabaseAgentDefinition,
  BackendAgentDefinition,
  FrontendAgentDefinition,
} from "@forgeos/agent-runtime";
import {
  AgentTask,
  Artifact,
  ArtifactType,
  DomainEvent,
  ProductSpecificationContentSchema,
  ArchitectureSpecificationContentSchema,
  DatabaseSchemaContentSchema,
  BackendImplementationContentSchema,
  UISpecificationContentSchema,
} from "@forgeos/contracts";
import { ArtifactRepository, ProjectRepository } from "@forgeos/database";
import { EventBus } from "@forgeos/event-bus";
import { ForgeOSError } from "@forgeos/shared";
import { AgentJobData } from "./agent-queue.js";

export interface AgentWorkerOptions {
  queueName: string;
  runner: AgentRunner;
  concurrency?: number;
  repositories?: {
    artifactRepo: ArtifactRepository;
    projectRepo: ProjectRepository;
  };
  eventBus?: EventBus;
  redisUrl?: string;
  connection?: Redis;
}

export interface WorkerJobResult {
  success: boolean;
  taskId: string;
  agentId: string;
  artifactId?: string;
  error?: string;
}

export class AgentWorker {
  public readonly worker: Worker<AgentJobData, WorkerJobResult>;
  private runner: AgentRunner;
  private repositories?: {
    artifactRepo: ArtifactRepository;
    projectRepo: ProjectRepository;
  };
  private eventBus?: EventBus;
  private connection: Redis;

  constructor(options: AgentWorkerOptions) {
    this.runner = options.runner;
    this.repositories = options.repositories;
    this.eventBus = options.eventBus;

    const url = options.redisUrl ?? process.env["REDIS_URL"] ?? "redis://localhost:6379";
    this.connection = options.connection ?? new Redis(url, { maxRetriesPerRequest: null });

    const workerOpts: WorkerOptions = {
      connection: this.connection,
      concurrency: options.concurrency ?? 2,
    };

    this.worker = new Worker<AgentJobData, WorkerJobResult>(
      options.queueName,
      async (job: Job<AgentJobData>) => {
        return this.processJob(job.data);
      },
      workerOpts
    );
  }

  private resolveAgentAndSchema(agentId: string) {
    if (agentId === PMAgentDefinition.id) {
      return {
        definition: PMAgentDefinition,
        targetSchema: ProductSpecificationContentSchema,
        artifactType: "ProductSpecification" as ArtifactType,
      };
    }
    if (agentId === ArchitectAgentDefinition.id) {
      return {
        definition: ArchitectAgentDefinition,
        targetSchema: ArchitectureSpecificationContentSchema,
        artifactType: "ArchitectureSpecification" as ArtifactType,
      };
    }
    if (agentId === DatabaseAgentDefinition.id) {
      return {
        definition: DatabaseAgentDefinition,
        targetSchema: DatabaseSchemaContentSchema,
        artifactType: "DatabaseSchema" as ArtifactType,
      };
    }
    if (agentId === BackendAgentDefinition.id) {
      return {
        definition: BackendAgentDefinition,
        targetSchema: BackendImplementationContentSchema,
        artifactType: "SourceCode" as ArtifactType,
      };
    }
    if (agentId === FrontendAgentDefinition.id) {
      return {
        definition: FrontendAgentDefinition,
        targetSchema: UISpecificationContentSchema,
        artifactType: "UISpecification" as ArtifactType,
      };
    }
    throw new ForgeOSError(`Unknown agent id '${agentId}'`, "UNKNOWN_AGENT", 400);
  }

  public async processJob(data: AgentJobData): Promise<WorkerJobResult> {
    const { projectId, taskId, agentId, input, dependencies } = data;

    // 1. Emit & persist TASK_STARTED
    if (this.repositories) {
      await this.repositories.projectRepo.updateTaskStatus(taskId, "RUNNING");
    }

    const startedEvent: DomainEvent = {
      id: randomUUID(),
      type: "TASK_STARTED",
      projectId,
      taskId,
      timestamp: new Date().toISOString(),
      payload: { agentId },
    };

    if (this.repositories) {
      await this.repositories.projectRepo.saveDomainEvent({
        id: startedEvent.id,
        projectId: startedEvent.projectId,
        type: startedEvent.type,
        taskId: startedEvent.taskId,
        timestamp: startedEvent.timestamp,
        payload: startedEvent.payload as Record<string, unknown>,
      });
    }
    if (this.eventBus) {
      await this.eventBus.publish(startedEvent);
    }

    // 2. Load upstream artifacts
    let upstreamArtifacts: Artifact[] = [];
    if (this.repositories) {
      upstreamArtifacts = await this.repositories.artifactRepo.listProjectArtifacts(projectId);
    }

    // 3. Resolve agent and schema
    const { definition, targetSchema, artifactType } = this.resolveAgentAndSchema(agentId);

    const task: AgentTask = {
      id: taskId,
      projectId,
      agentId,
      input,
      dependencies,
      status: "RUNNING",
      retryCount: data.attempt ?? 0,
    };

    const context = {
      projectId,
      taskId,
      upstreamArtifacts,
    };

    // 4. Execute agent
    const result = await this.runner.execute(
      definition,
      task,
      context,
      targetSchema,
      artifactType
    );

    // 5. Persist run telemetry
    if (this.repositories && result.runRecord) {
      await this.repositories.projectRepo.saveAgentRun({
        id: result.runRecord.id,
        taskId,
        provider: result.runRecord.provider,
        model: result.runRecord.model,
        startedAt: new Date(result.runRecord.startedAt),
        completedAt: result.runRecord.completedAt ? new Date(result.runRecord.completedAt) : undefined,
        inputTokens: result.runRecord.inputTokens,
        outputTokens: result.runRecord.outputTokens,
        latencyMs: result.runRecord.latencyMs,
        status: result.runRecord.status,
        error: result.runRecord.error,
        rawOutput: result.runRecord.rawOutput,
      });
    }

    if (result.success && result.artifact) {
      result.artifact.status = "approved"; // Baseline auto-approval

      if (this.repositories) {
        await this.repositories.artifactRepo.saveArtifact(result.artifact);
        await this.repositories.projectRepo.updateTaskStatus(taskId, "COMPLETED");
      }

      const completedEvent: DomainEvent = {
        id: randomUUID(),
        type: "TASK_COMPLETED",
        projectId,
        taskId,
        timestamp: new Date().toISOString(),
        payload: {
          agentId,
          artifactId: result.artifact.id,
          artifactType: result.artifact.type,
        },
      };

      if (this.repositories) {
        await this.repositories.projectRepo.saveDomainEvent({
          id: completedEvent.id,
          projectId: completedEvent.projectId,
          type: completedEvent.type,
          taskId: completedEvent.taskId,
          timestamp: completedEvent.timestamp,
          payload: completedEvent.payload as Record<string, unknown>,
        });
      }
      if (this.eventBus) {
        await this.eventBus.publish(completedEvent);
      }

      return {
        success: true,
        taskId,
        agentId,
        artifactId: result.artifact.id,
      };
    } else {
      if (this.repositories) {
        await this.repositories.projectRepo.updateTaskStatus(taskId, "FAILED");
      }

      const failedEvent: DomainEvent = {
        id: randomUUID(),
        type: "TASK_FAILED",
        projectId,
        taskId,
        timestamp: new Date().toISOString(),
        payload: {
          agentId,
          error: result.error,
          validationIssues: result.validationIssues,
        },
      };

      if (this.repositories) {
        await this.repositories.projectRepo.saveDomainEvent({
          id: failedEvent.id,
          projectId: failedEvent.projectId,
          type: failedEvent.type,
          taskId: failedEvent.taskId,
          timestamp: failedEvent.timestamp,
          payload: failedEvent.payload as Record<string, unknown>,
        });
      }
      if (this.eventBus) {
        await this.eventBus.publish(failedEvent);
      }

      throw new ForgeOSError(
        result.error ?? `Task failed for agent ${agentId}`,
        "AGENT_EXECUTION_FAILED",
        500
      );
    }
  }

  public async close(): Promise<void> {
    await Promise.allSettled([
      this.worker.close(),
      this.connection.quit(),
    ]);
  }
}
