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
  ProductSpecificationContentSchema,
  ArchitectureSpecificationContentSchema,
} from "@forgeos/contracts";
import { ForgeOSError } from "@forgeos/shared";
import { TaskGraph } from "./task-graph.js";

export interface WorkflowOptions {
  projectId?: string;
  requirement: string;
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

  constructor(runner: AgentRunner) {
    this.runner = runner;
  }

  public async runRequirementToArchitectureWorkflow(
    options: WorkflowOptions
  ): Promise<WorkflowResult> {
    const projectId = options.projectId ?? randomUUID();
    const graph = new TaskGraph(projectId);
    const artifacts: Artifact[] = [];
    const events: DomainEvent[] = [];

    // Emit PROJECT_CREATED
    events.push({
      id: randomUUID(),
      type: "PROJECT_CREATED",
      projectId,
      timestamp: new Date().toISOString(),
      payload: { requirement: options.requirement },
    });

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
        events.push({
          id: randomUUID(),
          type: "TASK_STARTED",
          projectId,
          taskId: task.id,
          timestamp: new Date().toISOString(),
          payload: { agentId: task.agentId },
        });

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

        if (result.success && result.artifact) {
          result.artifact.status = "approved"; // Automatically approved in Phase 4 baseline
          artifacts.push(result.artifact);

          graph.updateTaskStatus(task.id, "COMPLETED");

          events.push({
            id: randomUUID(),
            type: "TASK_COMPLETED",
            projectId,
            taskId: task.id,
            timestamp: new Date().toISOString(),
            payload: {
              agentId: task.agentId,
              artifactId: result.artifact.id,
              artifactType: result.artifact.type,
            },
          });

          // Specific deliverable events
          if (result.artifact.type === "ProductSpecification") {
            events.push({
              id: randomUUID(),
              type: "SPEC_APPROVED",
              projectId,
              taskId: task.id,
              timestamp: new Date().toISOString(),
              payload: { artifactId: result.artifact.id },
            });
          } else if (result.artifact.type === "ArchitectureSpecification") {
            events.push({
              id: randomUUID(),
              type: "ARCHITECTURE_APPROVED",
              projectId,
              taskId: task.id,
              timestamp: new Date().toISOString(),
              payload: { artifactId: result.artifact.id },
            });
          }
        } else {
          graph.updateTaskStatus(task.id, "FAILED");
          events.push({
            id: randomUUID(),
            type: "TASK_FAILED",
            projectId,
            taskId: task.id,
            timestamp: new Date().toISOString(),
            payload: {
              agentId: task.agentId,
              error: result.error,
              validationIssues: result.validationIssues,
            },
          });

          events.push({
            id: randomUUID(),
            type: "PROJECT_FAILED",
            projectId,
            timestamp: new Date().toISOString(),
            payload: { failedTaskId: task.id, error: result.error },
          });

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

    events.push({
      id: randomUUID(),
      type: "PROJECT_COMPLETED",
      projectId,
      timestamp: new Date().toISOString(),
      payload: { artifactCount: artifacts.length },
    });

    return {
      projectId,
      status: "COMPLETED",
      artifacts,
      events,
      tasks: graph.getAllTasks(),
    };
  }
}
