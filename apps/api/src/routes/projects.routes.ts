import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import {
  CreateProjectRequestSchema,
  GateDecisionRequestSchema,
  TaskGraphSnapshot,
  TaskNode,
  TaskEdge,
  DomainEventType,
} from "@forgeos/contracts";
import { WorkflowOrchestrator } from "@forgeos/orchestrator";
import { ProjectRepository, ArtifactRepository } from "@forgeos/database";
import { SocketGateway } from "../socket.js";
import { EventBus } from "@forgeos/event-bus";

export interface ProjectsRoutesOptions {
  orchestrator: WorkflowOrchestrator;
  projectRepo: ProjectRepository;
  artifactRepo: ArtifactRepository;
  socketGateway?: SocketGateway;
  eventBus?: EventBus;
}

export const projectsRoutes: FastifyPluginAsync<ProjectsRoutesOptions> = async (
  fastify: FastifyInstance,
  options: ProjectsRoutesOptions
) => {
  const { orchestrator, projectRepo, artifactRepo, socketGateway, eventBus } = options;

  // 1. POST /api/projects - Launch workflow
  fastify.post("/projects", async (request, reply) => {
    const parseResult = CreateProjectRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid project request payload",
        details: parseResult.error.issues,
      });
    }

    const data = parseResult.data;
    const projectId = data.projectId ?? randomUUID();

    // Launch orchestrator workflow in background
    (async () => {
      try {
        if (data.workflowType === "requirement_to_architecture") {
          await orchestrator.runRequirementToArchitectureWorkflow({
            projectId,
            requirement: data.requirement,
            enableGates: data.enableGates,
            enableRecovery: data.enableRecovery,
          });
        } else {
          await orchestrator.runFullSoftwareFactoryWorkflow({
            projectId,
            requirement: data.requirement,
            enableGates: data.enableGates,
            enableRecovery: data.enableRecovery,
          });
        }
      } catch (err) {
        request.log.error(err, `Workflow failed for project ${projectId}`);
      }
    })();

    return reply.status(202).send({
      projectId,
      status: "ACTIVE",
      message: "Orchestration workflow started.",
    });
  });

  // 2. GET /api/projects - List all projects
  fastify.get("/projects", async (_request, reply) => {
    const projects = await projectRepo.listProjects();

    const summaries = projects.map((p) => ({
      id: p.id,
      name: p.name,
      requirement: p.requirement,
      status: p.status,
      createdAt: p.createdAt,
      taskCount: p.tasks.length,
      artifactCount: p.artifacts.length,
      eventCount: p.events.length,
    }));

    return reply.send(summaries);
  });

  // 3. GET /api/projects/:id - Full project details
  fastify.get<{ Params: { id: string } }>("/projects/:id", async (request, reply) => {
    const { id } = request.params;
    const project = await projectRepo.getProject(id);

    if (!project) {
      return reply.status(404).send({ error: `Project '${id}' not found.` });
    }

    return reply.send(project);
  });

  // 4. GET /api/projects/:id/dag - DAG Graph Snapshot for Visualizer
  fastify.get<{ Params: { id: string } }>("/projects/:id/dag", async (request, reply) => {
    const { id } = request.params;
    const project = await projectRepo.getProject(id);

    if (!project) {
      return reply.status(404).send({ error: `Project '${id}' not found.` });
    }

    const nodes: TaskNode[] = project.tasks.map((task) => {
      // In database, input is stored as Json
      const taskInput = (task.input ?? {}) as Record<string, unknown>;
      const deps: string[] = Array.isArray(taskInput["dependencies"])
        ? (taskInput["dependencies"] as string[])
        : [];

      return {
        id: task.id,
        agentId: task.agentId,
        role: task.agentId.replace(/^forgeos-|-agent$/g, ""),
        status: task.status as any,
        retryCount: task.runs.length > 1 ? task.runs.length - 1 : 0,
        input: task.input,
        dependencies: deps,
      };
    });

    const edges: TaskEdge[] = [];
    for (const node of nodes) {
      for (const depId of node.dependencies) {
        edges.push({ from: depId, to: node.id });
      }
    }

    const isComplete = nodes.length > 0 && nodes.every((n) => n.status === "COMPLETED" || n.status === "CANCELLED");
    const hasFailures = nodes.some((n) => n.status === "FAILED");

    const snapshot: TaskGraphSnapshot = {
      projectId: id,
      nodes,
      edges,
      isComplete,
      hasFailures,
    };

    return reply.send(snapshot);
  });

  // 5. GET /api/projects/:id/artifacts/:artifactId - Artifact Content
  fastify.get<{ Params: { id: string; artifactId: string } }>(
    "/projects/:id/artifacts/:artifactId",
    async (request, reply) => {
      const { artifactId } = request.params;
      const artifact = await artifactRepo.getArtifact(artifactId);

      if (!artifact) {
        return reply.status(404).send({ error: `Artifact '${artifactId}' not found.` });
      }

      return reply.send(artifact);
    }
  );

  // 6. POST /api/projects/:id/gates/:gateId/decision - Human-in-the-Loop Override
  fastify.post<{ Params: { id: string; gateId: string } }>(
    "/projects/:id/gates/:gateId/decision",
    async (request, reply) => {
      const { id: projectId, gateId: artifactId } = request.params;
      const parseResult = GateDecisionRequestSchema.safeParse(request.body);

      if (!parseResult.success) {
        return reply.status(400).send({
          error: "Invalid gate decision payload",
          details: parseResult.error.issues,
        });
      }

      const { action, reason, overrideFeedback } = parseResult.data;
      const artifact = await artifactRepo.getArtifact(artifactId);

      if (!artifact) {
        return reply.status(404).send({ error: `Artifact '${artifactId}' not found.` });
      }

      const newStatus = action === "approve" ? "approved" : "rejected";
      await artifactRepo.updateArtifactStatus(artifactId, newStatus);

      const eventType: DomainEventType = action === "approve" ? "SPEC_APPROVED" : "REVIEW_FAILED";

      if (eventBus) {
        await eventBus.publish({
          id: randomUUID(),
          type: eventType,
          projectId,
          taskId: artifact.taskId,
          timestamp: new Date().toISOString(),
          payload: {
            artifactId,
            humanOverride: true,
            action,
            reason,
            overrideFeedback,
          },
        });
      }

      if (socketGateway) {
        socketGateway.broadcastDomainEvent({
          id: randomUUID(),
          type: eventType,
          projectId,
          taskId: artifact.taskId,
          timestamp: new Date().toISOString(),
          payload: {
            artifactId,
            humanOverride: true,
            action,
            reason,
          },
        });
      }

      return reply.send({
        success: true,
        artifactId,
        status: newStatus,
        message: `Human override: artifact marked as ${newStatus}.`,
      });
    }
  );
};
