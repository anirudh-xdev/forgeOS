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
  DomainEventType,
  ProductSpecificationContentSchema,
  ArchitectureSpecificationContentSchema,
  DatabaseSchemaContentSchema,
  BackendImplementationContentSchema,
  UISpecificationContentSchema,
} from "@forgeos/contracts";
import { ArtifactRepository, ProjectRepository } from "@forgeos/database";
import { EventBus } from "@forgeos/event-bus";
import { ForgeOSError } from "@forgeos/shared";
import { TaskGraph } from "./task-graph.js";

export interface WorkflowOptions {
  projectId?: string;
  requirement: string;
}

export interface WorkflowRepositories {
  artifactRepo: ArtifactRepository;
  projectRepo: ProjectRepository;
}

export interface WorkflowResult {
  projectId: string;
  status: "COMPLETED" | "FAILED";
  artifacts: Artifact[];
  events: DomainEvent[];
  tasks: AgentTask[];
  error?: string;
}

export class WorkflowOrchestrator {
  private runner: AgentRunner;
  private repositories?: WorkflowRepositories;
  private eventBus?: EventBus;

  constructor(
    runner: AgentRunner,
    repositories?: WorkflowRepositories,
    eventBus?: EventBus
  ) {
    this.runner = runner;
    this.repositories = repositories;
    this.eventBus = eventBus;
  }

  private resolveAgentDefinition(agentId: string) {
    if (agentId === PMAgentDefinition.id) {
      return {
        definition: PMAgentDefinition,
        targetSchema: ProductSpecificationContentSchema,
        artifactType: "ProductSpecification" as ArtifactType,
        approvalEvent: "SPEC_APPROVED" as DomainEventType,
      };
    }
    if (agentId === ArchitectAgentDefinition.id) {
      return {
        definition: ArchitectAgentDefinition,
        targetSchema: ArchitectureSpecificationContentSchema,
        artifactType: "ArchitectureSpecification" as ArtifactType,
        approvalEvent: "ARCHITECTURE_APPROVED" as DomainEventType,
      };
    }
    if (agentId === DatabaseAgentDefinition.id) {
      return {
        definition: DatabaseAgentDefinition,
        targetSchema: DatabaseSchemaContentSchema,
        artifactType: "DatabaseSchema" as ArtifactType,
        approvalEvent: "CONTRACT_CREATED" as DomainEventType,
      };
    }
    if (agentId === BackendAgentDefinition.id) {
      return {
        definition: BackendAgentDefinition,
        targetSchema: BackendImplementationContentSchema,
        artifactType: "SourceCode" as ArtifactType,
        approvalEvent: "TASK_COMPLETED" as DomainEventType,
      };
    }
    if (agentId === FrontendAgentDefinition.id) {
      return {
        definition: FrontendAgentDefinition,
        targetSchema: UISpecificationContentSchema,
        artifactType: "UISpecification" as ArtifactType,
        approvalEvent: "TASK_COMPLETED" as DomainEventType,
      };
    }
    throw new ForgeOSError(`Unknown agent id '${agentId}'`, "UNKNOWN_AGENT", 400);
  }

  /**
   * Phase 4 Sequential Baseline Workflow: PM -> Architect
   */
  public async runRequirementToArchitectureWorkflow(
    options: WorkflowOptions
  ): Promise<WorkflowResult> {
    const projectId = options.projectId ?? randomUUID();
    const graph = new TaskGraph(projectId);

    // Node 1: PM Agent
    const pmTaskId = randomUUID();
    graph.addTask({
      id: pmTaskId,
      projectId,
      agentId: PMAgentDefinition.id,
      input: { requirement: options.requirement },
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Node 2: Architect Agent
    const archTaskId = randomUUID();
    graph.addTask({
      id: archTaskId,
      projectId,
      agentId: ArchitectAgentDefinition.id,
      input: {
        directive: "Generate Architecture Specification based on approved Product Specification.",
      },
      dependencies: [pmTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return this.executeGraph(projectId, graph, options.requirement);
  }

  /**
   * Phase 6 Full Software Factory Workflow:
   * PM -> Architect -> [ Database || Frontend ] (Parallel) -> Backend
   */
  public async runFullSoftwareFactoryWorkflow(
    options: WorkflowOptions
  ): Promise<WorkflowResult> {
    const projectId = options.projectId ?? randomUUID();
    const graph = new TaskGraph(projectId);

    // 1. PM Agent Node
    const pmTaskId = randomUUID();
    graph.addTask({
      id: pmTaskId,
      projectId,
      agentId: PMAgentDefinition.id,
      input: { requirement: options.requirement },
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Architect Agent Node
    const archTaskId = randomUUID();
    graph.addTask({
      id: archTaskId,
      projectId,
      agentId: ArchitectAgentDefinition.id,
      input: { directive: "Design system topology, database, APIs, and ADRs." },
      dependencies: [pmTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Database Agent Node (Depends on Architect)
    const dbTaskId = randomUUID();
    graph.addTask({
      id: dbTaskId,
      projectId,
      agentId: DatabaseAgentDefinition.id,
      input: { directive: "Create normalized PostgreSQL schema with Prisma models." },
      dependencies: [archTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Frontend Agent Node (Depends on Architect - Runs in PARALLEL with Database Agent!)
    const frontendTaskId = randomUUID();
    graph.addTask({
      id: frontendTaskId,
      projectId,
      agentId: FrontendAgentDefinition.id,
      input: { directive: "Design Next.js client routes, layout, and components." },
      dependencies: [archTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 5. Backend Agent Node (Depends on Database + Architect)
    const backendTaskId = randomUUID();
    graph.addTask({
      id: backendTaskId,
      projectId,
      agentId: BackendAgentDefinition.id,
      input: { directive: "Implement Fastify route handlers, service layer, and unit tests." },
      dependencies: [dbTaskId, archTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return this.executeGraph(projectId, graph, options.requirement);
  }

  private async executeGraph(
    projectId: string,
    graph: TaskGraph,
    requirement: string
  ): Promise<WorkflowResult> {
    const artifacts: Artifact[] = [];
    const events: DomainEvent[] = [];

    // Initialize database persistence if repositories are configured
    if (this.repositories) {
      const user = await this.repositories.projectRepo.findOrCreateDefaultUser();
      await this.repositories.projectRepo.createProject({
        id: projectId,
        userId: user.id,
        name: `Project ${projectId.slice(0, 8)}`,
        requirement,
        status: "ACTIVE",
      });

      // Persist all initial tasks in graph
      for (const task of graph.getAllTasks()) {
        await this.repositories.projectRepo.saveAgentTask({
          id: task.id,
          projectId,
          agentId: task.agentId,
          input: task.input as Record<string, unknown>,
          status: task.status,
        });
      }
    }

    // Helper to push, persist, and publish events
    const recordEvent = async (
      type: DomainEventType,
      payload: Record<string, unknown>,
      taskId?: string
    ) => {
      const event: DomainEvent = {
        id: randomUUID(),
        type,
        projectId,
        taskId,
        timestamp: new Date().toISOString(),
        payload,
      };
      events.push(event);

      if (this.repositories) {
        await this.repositories.projectRepo.saveDomainEvent({
          id: event.id,
          projectId: event.projectId,
          type: event.type,
          taskId: event.taskId,
          timestamp: event.timestamp,
          payload: event.payload as Record<string, unknown>,
        });
      }

      if (this.eventBus) {
        await this.eventBus.publish(event);
      }

      return event;
    };

    // Emit PROJECT_CREATED
    await recordEvent("PROJECT_CREATED", { requirement });

    // Execution Loop: evaluate DAG until all nodes complete
    while (!graph.isComplete()) {
      const readyTasks = graph.getReadyTasks();

      if (readyTasks.length === 0) {
        if (graph.hasFailures()) {
          break;
        }
        throw new ForgeOSError(
          "Orchestration deadlock: no tasks ready but graph not complete.",
          "DEADLOCK",
          500
        );
      }

      // Mark all ready tasks as RUNNING simultaneously
      for (const task of readyTasks) {
        graph.updateTaskStatus(task.id, "RUNNING");
        if (this.repositories) {
          await this.repositories.projectRepo.updateTaskStatus(task.id, "RUNNING");
        }
        await recordEvent("TASK_STARTED", { agentId: task.agentId }, task.id);
      }

      // Execute ready tasks CONCURRENTLY in PARALLEL
      const results = await Promise.all(
        readyTasks.map(async (task) => {
          const { definition, targetSchema, artifactType, approvalEvent } =
            this.resolveAgentDefinition(task.agentId);

          const context = {
            projectId,
            taskId: task.id,
            upstreamArtifacts: [...artifacts],
          };

          const result = await this.runner.execute(
            definition,
            task,
            context,
            targetSchema,
            artifactType
          );

          if (this.repositories && result.runRecord) {
            await this.repositories.projectRepo.saveAgentRun({
              id: result.runRecord.id,
              taskId: task.id,
              provider: result.runRecord.provider,
              model: result.runRecord.model,
              startedAt: new Date(result.runRecord.startedAt),
              completedAt: result.runRecord.completedAt
                ? new Date(result.runRecord.completedAt)
                : undefined,
              inputTokens: result.runRecord.inputTokens,
              outputTokens: result.runRecord.outputTokens,
              latencyMs: result.runRecord.latencyMs,
              status: result.runRecord.status,
              error: result.runRecord.error,
              rawOutput: result.runRecord.rawOutput,
            });
          }

          return { task, result, approvalEvent };
        })
      );

      // Process parallel execution outcomes
      for (const { task, result, approvalEvent } of results) {
        if (result.success && result.artifact) {
          result.artifact.status = "approved"; // Baseline auto-approval
          artifacts.push(result.artifact);

          graph.updateTaskStatus(task.id, "COMPLETED");
          if (this.repositories) {
            await this.repositories.artifactRepo.saveArtifact(result.artifact);
            await this.repositories.projectRepo.updateTaskStatus(task.id, "COMPLETED");
          }

          await recordEvent(
            "TASK_COMPLETED",
            {
              agentId: task.agentId,
              artifactId: result.artifact.id,
              artifactType: result.artifact.type,
            },
            task.id
          );

          if (approvalEvent && approvalEvent !== "TASK_COMPLETED") {
            await recordEvent(approvalEvent, { artifactId: result.artifact.id }, task.id);
          }
        } else {
          graph.updateTaskStatus(task.id, "FAILED");
          if (this.repositories) {
            await this.repositories.projectRepo.updateTaskStatus(task.id, "FAILED");
          }

          await recordEvent(
            "TASK_FAILED",
            {
              agentId: task.agentId,
              error: result.error,
              validationIssues: result.validationIssues,
            },
            task.id
          );

          await recordEvent(
            "PROJECT_FAILED",
            { failedTaskId: task.id, error: result.error },
            task.id
          );

          return {
            projectId,
            status: "FAILED",
            artifacts,
            events,
            tasks: graph.getAllTasks(),
            error: result.error,
          };
        }
      }
    }

    await recordEvent("PROJECT_COMPLETED", { artifactCount: artifacts.length });

    return {
      projectId,
      status: "COMPLETED",
      artifacts,
      events,
      tasks: graph.getAllTasks(),
    };
  }
}
