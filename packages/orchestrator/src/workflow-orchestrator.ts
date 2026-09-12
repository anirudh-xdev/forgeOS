import { randomUUID } from "node:crypto";
import {
  AgentRunner,
  PMAgentDefinition,
  ArchitectAgentDefinition,
} from "@forgeos/agent-runtime";
import {
  AgentTask,
  Artifact,
  DomainEvent,
  DomainEventType,
  ProductSpecificationContentSchema,
  ArchitectureSpecificationContentSchema,
} from "@forgeos/contracts";
import { ArtifactRepository, ProjectRepository } from "@forgeos/database";
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

  constructor(runner: AgentRunner, repositories?: WorkflowRepositories) {
    this.runner = runner;
    this.repositories = repositories;
  }

  public async runRequirementToArchitectureWorkflow(
    options: WorkflowOptions
  ): Promise<WorkflowResult> {
    const projectId = options.projectId ?? randomUUID();
    const graph = new TaskGraph(projectId);
    const artifacts: Artifact[] = [];
    const events: DomainEvent[] = [];

    // Initialize database persistence if repositories are configured
    if (this.repositories) {
      const user = await this.repositories.projectRepo.findOrCreateDefaultUser();
      await this.repositories.projectRepo.createProject({
        id: projectId,
        userId: user.id,
        name: `Project ${projectId.slice(0, 8)}`,
        requirement: options.requirement,
        status: "ACTIVE",
      });
    }

    // Helper to push and optionally persist events
    const recordEvent = async (type: DomainEventType, payload: Record<string, unknown>, taskId?: string) => {
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
      return event;
    };

    // Emit PROJECT_CREATED
    await recordEvent("PROJECT_CREATED", { requirement: options.requirement });

    // Node 1: PM Agent
    const pmTaskId = randomUUID();
    const pmTask: AgentTask = {
      id: pmTaskId,
      projectId,
      agentId: PMAgentDefinition.id,
      input: { requirement: options.requirement },
      dependencies: [],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    graph.addTask(pmTask);

    if (this.repositories) {
      await this.repositories.projectRepo.saveAgentTask({
        id: pmTask.id,
        projectId,
        agentId: pmTask.agentId,
        input: pmTask.input as Record<string, unknown>,
        status: pmTask.status,
      });
    }

    // Node 2: Architect Agent (depends on PM Agent)
    const archTaskId = randomUUID();
    const archTask: AgentTask = {
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
    };
    graph.addTask(archTask);

    if (this.repositories) {
      await this.repositories.projectRepo.saveAgentTask({
        id: archTask.id,
        projectId,
        agentId: archTask.agentId,
        input: archTask.input as Record<string, unknown>,
        status: archTask.status,
      });
    }

    // Execution Loop: evaluate DAG until all nodes complete
    while (!graph.isComplete()) {
      const readyTasks = graph.getReadyTasks();

      if (readyTasks.length === 0) {
        if (graph.hasFailures()) {
          break;
        }
        throw new ForgeOSError("Orchestration deadlock: no tasks ready but graph not complete.", "DEADLOCK", 500);
      }

      for (const task of readyTasks) {
        graph.updateTaskStatus(task.id, "RUNNING");
        if (this.repositories) {
          await this.repositories.projectRepo.updateTaskStatus(task.id, "RUNNING");
        }

        await recordEvent("TASK_STARTED", { agentId: task.agentId }, task.id);

        // Resolve agent definition and target schema
        let definition;
        let targetSchema;
        let artifactType;

        if (task.agentId === PMAgentDefinition.id) {
          definition = PMAgentDefinition;
          targetSchema = ProductSpecificationContentSchema;
          artifactType = "ProductSpecification" as const;
        } else if (task.agentId === ArchitectAgentDefinition.id) {
          definition = ArchitectAgentDefinition;
          targetSchema = ArchitectureSpecificationContentSchema;
          artifactType = "ArchitectureSpecification" as const;
        } else {
          throw new ForgeOSError(`Unknown agent id '${task.agentId}'`, "UNKNOWN_AGENT", 400);
        }

        // Build context with approved upstream artifacts
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

        // Record agent run in database
        if (this.repositories && result.runRecord) {
          await this.repositories.projectRepo.saveAgentRun({
            id: result.runRecord.id,
            taskId: task.id,
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
          result.artifact.status = "approved"; // Automatically approved in baseline workflow
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

          // Specific deliverable events
          if (result.artifact.type === "ProductSpecification") {
            await recordEvent("SPEC_APPROVED", { artifactId: result.artifact.id }, task.id);
          } else if (result.artifact.type === "ArchitectureSpecification") {
            await recordEvent("ARCHITECTURE_APPROVED", { artifactId: result.artifact.id }, task.id);
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
