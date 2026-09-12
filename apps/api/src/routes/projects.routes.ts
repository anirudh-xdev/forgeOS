import { FastifyInstance, FastifyPluginAsync } from "fastify";
import { randomUUID } from "node:crypto";
import {
  CreateProjectRequestSchema,
  GateDecisionRequestSchema,
  TaskGraphSnapshot,
  TaskNode,
  TaskEdge,
  DomainEventType,
  RoutingStrategySchema,
  RecommendAgentRequestSchema,
} from "@forgeos/contracts";
import { WorkflowOrchestrator, defaultDynamicRouter } from "@forgeos/orchestrator";
import { ProjectRepository, ArtifactRepository } from "@forgeos/database";
import { SocketGateway } from "../socket.js";
import { EventBus } from "@forgeos/event-bus";
import { defaultCostEstimator, defaultTracer } from "@forgeos/logger";

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

    // Synchronously ensure project and budget exist in database
    const user = await projectRepo.findOrCreateDefaultUser();
    await projectRepo.createProject({
      id: projectId,
      userId: user.id,
      name: `Project ${projectId.slice(0, 8)}`,
      requirement: data.requirement,
      status: "ACTIVE",
    });

    // Launch orchestrator workflow in background
    (async () => {
      try {
        if (data.workflowType === "requirement_to_architecture") {
          await orchestrator.runRequirementToArchitectureWorkflow({
            projectId,
            requirement: data.requirement,
            enableGates: data.enableGates,
            enableRecovery: data.enableRecovery,
            routingStrategy: data.routingStrategy,
          });
        } else {
          await orchestrator.runFullSoftwareFactoryWorkflow({
            projectId,
            requirement: data.requirement,
            enableGates: data.enableGates,
            enableRecovery: data.enableRecovery,
            routingStrategy: data.routingStrategy,
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

  // 7. GET /api/projects/:id/metrics - Project Telemetry & Cost Aggregates (Phase 11)
  fastify.get<{ Params: { id: string } }>("/projects/:id/metrics", async (request, reply) => {
    const { id } = request.params;
    const project = await projectRepo.getProject(id);
    if (!project) {
      return reply.status(404).send({ error: `Project '${id}' not found.` });
    }

    const runs = await projectRepo.getAgentRunsByProject(id);
    const budget = await projectRepo.getProjectBudget(id);

    const totalRuns = runs.length;
    const successfulRuns = runs.filter((r) => r.status === "success").length;
    const failedRuns = runs.filter((r) => r.status === "failed").length;
    const successRate = totalRuns > 0 ? Number(((successfulRuns / totalRuns) * 100).toFixed(1)) : 100;

    let totalLatencyMs = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCostUSD = 0;

    const agentMap = new Map<string, {
      role: string;
      runs: number;
      successfulRuns: number;
      failedRuns: number;
      totalLatencyMs: number;
      inputTokens: number;
      outputTokens: number;
      costUSD: number;
    }>();

    for (const run of runs) {
      const latency = run.latencyMs ?? 0;
      const inTok = run.inputTokens ?? 0;
      const outTok = run.outputTokens ?? 0;
      const cost = defaultCostEstimator.estimateCostUSD(run.model, inTok, outTok);

      totalLatencyMs += latency;
      totalInputTokens += inTok;
      totalOutputTokens += outTok;
      totalCostUSD += cost;

      const agentId = run.task?.agentId ?? "unknown";
      if (!agentMap.has(agentId)) {
        agentMap.set(agentId, {
          role: agentId,
          runs: 0,
          successfulRuns: 0,
          failedRuns: 0,
          totalLatencyMs: 0,
          inputTokens: 0,
          outputTokens: 0,
          costUSD: 0,
        });
      }

      const stat = agentMap.get(agentId)!;
      stat.runs++;
      if (run.status === "success") stat.successfulRuns++;
      if (run.status === "failed") stat.failedRuns++;
      stat.totalLatencyMs += latency;
      stat.inputTokens += inTok;
      stat.outputTokens += outTok;
      stat.costUSD = Number((stat.costUSD + cost).toFixed(6));
    }

    const avgLatencyMs = totalRuns > 0 ? Math.round(totalLatencyMs / totalRuns) : 0;
    const totalTokens = totalInputTokens + totalOutputTokens;

    const maxTokens = budget?.maxTokens ?? 500000;
    const usedTokens = budget?.usedTokens ?? totalTokens;
    const maxCostUSD = Number(budget?.maxCost ?? 10.0);
    const usedCostUSD = Number(budget?.usedCost ?? totalCostUSD);

    const tokenUtilization = maxTokens > 0 ? Number(((usedTokens / maxTokens) * 100).toFixed(1)) : 0;
    const costUtilization = maxCostUSD > 0 ? Number(((usedCostUSD / maxCostUSD) * 100).toFixed(1)) : 0;

    const agentBreakdown = Array.from(agentMap.entries()).map(([agentId, data]) => ({
      agentId,
      role: data.role,
      runs: data.runs,
      successfulRuns: data.successfulRuns,
      failedRuns: data.failedRuns,
      avgLatencyMs: data.runs > 0 ? Math.round(data.totalLatencyMs / data.runs) : 0,
      totalInputTokens: data.inputTokens,
      totalOutputTokens: data.outputTokens,
      totalTokens: data.inputTokens + data.outputTokens,
      costUSD: data.costUSD,
    }));

    return reply.send({
      projectId: id,
      totalRuns,
      successfulRuns,
      failedRuns,
      successRate,
      totalLatencyMs,
      avgLatencyMs,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCostUSD: Number(totalCostUSD.toFixed(6)),
      budget: {
        maxTokens,
        usedTokens,
        remainingTokens: Math.max(0, maxTokens - usedTokens),
        tokenUtilization,
        maxCostUSD,
        usedCostUSD,
        remainingCostUSD: Number(Math.max(0, maxCostUSD - usedCostUSD).toFixed(4)),
        costUtilization,
        maxRuntimeMinutes: budget?.maxRuntimeMinutes ?? 60,
        isExceeded: usedTokens >= maxTokens || usedCostUSD >= maxCostUSD,
      },
      agentBreakdown,
    });
  });

  // 8. GET /api/projects/:id/traces - Execution Timeline & Trace Spans (Phase 11)
  fastify.get<{ Params: { id: string } }>("/projects/:id/traces", async (request, reply) => {
    const { id } = request.params;
    const liveSpans = defaultTracer.getSpans(id);

    if (liveSpans.length > 0) {
      return reply.send({
        projectId: id,
        spans: liveSpans,
      });
    }

    const runs = await projectRepo.getAgentRunsByProject(id);
    const synthesizedSpans = runs.map((r) => ({
      id: r.id,
      traceId: `trace-${id.slice(0, 8)}`,
      spanId: `span-${r.id.slice(0, 8)}`,
      name: `agent.${r.task?.agentId ?? "agent"}.execute`,
      startTime: r.startedAt.toISOString(),
      endTime: r.completedAt ? r.completedAt.toISOString() : undefined,
      durationMs: r.latencyMs ?? 0,
      attributes: {
        "forgeos.project_id": id,
        "forgeos.task_id": r.taskId,
        "forgeos.agent_id": r.task?.agentId,
        "llm.provider": r.provider,
        "llm.model": r.model,
        "llm.usage.prompt_tokens": r.inputTokens ?? 0,
        "llm.usage.completion_tokens": r.outputTokens ?? 0,
      },
      status: {
        code: r.status === "failed" ? "ERROR" : "OK",
        message: r.error ?? undefined,
      },
    }));

    return reply.send({
      projectId: id,
      spans: synthesizedSpans,
    });
  });

  // 9. GET /api/router/scoreboard - Agent Matrix & Performance Leaderboard (Phase 12)
  fastify.get<{ Querystring: { strategy?: string } }>("/router/scoreboard", async (request, reply) => {
    const strategyParam = request.query?.strategy;
    const parsed = RoutingStrategySchema.safeParse(strategyParam);
    const strategy = parsed.success ? parsed.data : "BALANCED";
    const scoreboard = await defaultDynamicRouter.getScoreboard(strategy);
    return reply.send(scoreboard);
  });

  // 10. POST /api/router/recommend - Dynamic Agent & Model Recommendation (Phase 12)
  fastify.post("/router/recommend", async (request, reply) => {
    const parseResult = RecommendAgentRequestSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: "Invalid agent recommendation request",
        details: parseResult.error.issues,
      });
    }

    const { directive, strategy, budgetUtilization, attemptCount } = parseResult.data;
    const decision = defaultDynamicRouter.selectOptimalAgent(
      {
        id: randomUUID(),
        input: { directive },
      },
      {
        strategy,
        budgetUtilization,
        attemptCount,
      }
    );

    return reply.send(decision);
  });
};

