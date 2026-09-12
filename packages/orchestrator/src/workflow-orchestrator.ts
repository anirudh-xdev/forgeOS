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
  RoutingStrategy,
} from "@forgeos/contracts";
import { ArtifactRepository, ProjectRepository } from "@forgeos/database";
import { EventBus } from "@forgeos/event-bus";
import { ForgeOSError } from "@forgeos/shared";
import { TaskGraph } from "./task-graph.js";
import { ApprovalGateEngine } from "./gates/approval-gate.js";
import { RecoveryStrategy, FailureContext } from "@forgeos/recovery";
import { BudgetManager } from "./budget/budget-manager.js";
import {
  DynamicAgentRouter,
  defaultDynamicRouter,
} from "./routing/dynamic-agent-router.js";
import {
  defaultTracer,
  defaultMetricsRegistry,
  defaultCostEstimator,
} from "@forgeos/logger";

export interface WorkflowOptions {
  projectId?: string;
  requirement: string;
  enableGates?: boolean;
  enableRecovery?: boolean;
  routingStrategy?: RoutingStrategy;
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
  private gateEngine?: ApprovalGateEngine;
  private recoveryStrategy?: RecoveryStrategy;
  private dynamicRouter?: DynamicAgentRouter;

  constructor(
    runner: AgentRunner,
    repositories?: WorkflowRepositories,
    eventBus?: EventBus,
    gateEngine?: ApprovalGateEngine,
    recoveryStrategy?: RecoveryStrategy,
    dynamicRouter?: DynamicAgentRouter
  ) {
    this.runner = runner;
    this.repositories = repositories;
    this.eventBus = eventBus;
    this.gateEngine = gateEngine;
    this.recoveryStrategy = recoveryStrategy ?? new RecoveryStrategy();
    this.dynamicRouter = dynamicRouter ?? defaultDynamicRouter;
  }

  public getRecoveryStrategy(): RecoveryStrategy | undefined {
    return this.recoveryStrategy;
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

    return this.executeGraph(
      projectId,
      graph,
      options.requirement,
      options.enableGates,
      options.enableRecovery,
      options.routingStrategy
    );
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
      input: {
        directive: "Generate Architecture Specification based on approved Product Specification.",
      },
      dependencies: [pmTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Database Engineer Node (runs in parallel with Frontend)
    const dbTaskId = randomUUID();
    graph.addTask({
      id: dbTaskId,
      projectId,
      agentId: DatabaseAgentDefinition.id,
      input: {
        directive: "Design relational database models and schema with indexing strategies.",
      },
      dependencies: [archTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Frontend Engineer Node (runs in parallel with Database)
    const uiTaskId = randomUUID();
    graph.addTask({
      id: uiTaskId,
      projectId,
      agentId: FrontendAgentDefinition.id,
      input: {
        directive: "Design user interface components and state management architecture.",
      },
      dependencies: [archTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 5. Backend Engineer Node (depends on BOTH Database AND Frontend)
    const backendTaskId = randomUUID();
    graph.addTask({
      id: backendTaskId,
      projectId,
      agentId: BackendAgentDefinition.id,
      input: {
        directive: "Implement Fastify service endpoints, business logic, and database queries.",
      },
      dependencies: [dbTaskId, uiTaskId],
      status: "PENDING",
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return this.executeGraph(
      projectId,
      graph,
      options.requirement,
      options.enableGates,
      options.enableRecovery,
      options.routingStrategy
    );
  }

  public async executeCustomGraph(
    graph: TaskGraph,
    options: WorkflowOptions
  ): Promise<WorkflowResult> {
    return this.executeGraph(
      graph.projectId,
      graph,
      options.requirement,
      options.enableGates,
      options.enableRecovery,
      options.routingStrategy
    );
  }

  private async executeGraph(
    projectId: string,
    graph: TaskGraph,
    requirement: string,
    enableGates?: boolean,
    enableRecovery?: boolean,
    routingStrategy?: RoutingStrategy
  ): Promise<WorkflowResult> {
    const artifacts: Artifact[] = [];
    const events: DomainEvent[] = [];
    const shouldRunGates = enableGates ?? (this.gateEngine !== undefined);
    const shouldRecover = (enableRecovery ?? true) && (this.recoveryStrategy !== undefined);

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

      let currentBudgetUtilization: number | undefined = undefined;

      // Pre-Execution Budget Verification (Specification Section 19)
      if (this.repositories) {
        const budgetManager = new BudgetManager(this.repositories.projectRepo);
        const budgetCheck = await budgetManager.checkBudget(projectId);
        if (budgetCheck.budget) {
          const tokenUtil =
            budgetCheck.budget.maxTokens > 0
              ? (budgetCheck.budget.usedTokens / budgetCheck.budget.maxTokens) * 100
              : 0;
          const costUtil =
            budgetCheck.budget.maxCostUSD > 0
              ? (budgetCheck.budget.usedCostUSD / budgetCheck.budget.maxCostUSD) * 100
              : 0;
          currentBudgetUtilization = Math.max(tokenUtil, costUtil);
        }

        if (!budgetCheck.allowed) {
          await recordEvent("BUDGET_EXCEEDED", {
            reason: budgetCheck.reason,
            budget: budgetCheck.budget,
          });

          for (const task of readyTasks) {
            graph.updateTaskStatus(task.id, "FAILED");
            await this.repositories.projectRepo.updateTaskStatus(task.id, "FAILED");
          }

          await recordEvent("PROJECT_FAILED", {
            error: budgetCheck.reason,
          });

          return {
            projectId,
            status: "FAILED",
            artifacts,
            events,
            tasks: graph.getAllTasks(),
            error: budgetCheck.reason,
          };
        }
      }

      // Mark all ready tasks as RUNNING simultaneously
      for (const task of readyTasks) {
        graph.updateTaskStatus(task.id, "RUNNING");
        if (this.repositories) {
          await this.repositories.projectRepo.updateTaskStatus(task.id, "RUNNING");
        }
        await recordEvent("TASK_STARTED", { agentId: task.agentId }, task.id);
      }

      // Execute ready tasks CONCURRENTLY in PARALLEL with OpenTelemetry tracing & telemetry
      const results = await Promise.all(
        readyTasks.map(async (task) => {
          // Phase 12: Dynamic Agent & Model Routing
          const router = this.dynamicRouter ?? defaultDynamicRouter;
          const routingDecision = router.selectOptimalAgent(task, {
            strategy: routingStrategy,
            attemptCount: (task.retryCount ?? 0) + 1,
            budgetUtilization: currentBudgetUtilization,
          });

          await recordEvent(
            "TASK_ROUTED",
            {
              agentId: routingDecision.selectedAgentId,
              model: routingDecision.selectedModel,
              tier: routingDecision.selectedTier,
              strategy: routingDecision.strategy,
              confidenceScore: routingDecision.confidenceScore,
              reasoning: routingDecision.reasoning,
              capabilities: routingDecision.requiredCapabilities,
            },
            task.id
          );

          const { definition, targetSchema, artifactType, approvalEvent } =
            this.resolveAgentDefinition(task.agentId);

          const context = {
            projectId,
            taskId: task.id,
            upstreamArtifacts: [...artifacts],
          };

          const result = await defaultTracer.withSpan(
            `agent.${definition.role}.execute`,
            {
              projectId,
              taskId: task.id,
              agentId: definition.id,
              attributes: {
                "agent.role": definition.role,
                "agent.id": definition.id,
                "task.attempt": (task.retryCount ?? 0) + 1,
              },
            },
            async (span) => {
              const execResult = await this.runner.execute(
                definition,
                task,
                context,
                targetSchema,
                artifactType
              );

              if (execResult.runRecord) {
                span.setAttribute("llm.provider", execResult.runRecord.provider);
                span.setAttribute("llm.model", execResult.runRecord.model);
                span.setAttribute(
                  "llm.usage.prompt_tokens",
                  execResult.runRecord.inputTokens ?? 0
                );
                span.setAttribute(
                  "llm.usage.completion_tokens",
                  execResult.runRecord.outputTokens ?? 0
                );
                span.setAttribute(
                  "llm.usage.total_tokens",
                  (execResult.runRecord.inputTokens ?? 0) +
                    (execResult.runRecord.outputTokens ?? 0)
                );
              }

              return execResult;
            }
          );

          if (result.runRecord) {
            const inputTokens = result.runRecord.inputTokens ?? 0;
            const outputTokens = result.runRecord.outputTokens ?? 0;
            const model = result.runRecord.model;
            const costUSD = defaultCostEstimator.estimateCostUSD(
              model,
              inputTokens,
              outputTokens
            );

            if (this.repositories) {
              await this.repositories.projectRepo.saveAgentRun({
                id: result.runRecord.id,
                taskId: task.id,
                provider: result.runRecord.provider,
                model: result.runRecord.model,
                startedAt: new Date(result.runRecord.startedAt),
                completedAt: result.runRecord.completedAt
                  ? new Date(result.runRecord.completedAt)
                  : undefined,
                inputTokens,
                outputTokens,
                latencyMs: result.runRecord.latencyMs,
                status: result.runRecord.status,
                error: result.runRecord.error,
                rawOutput: result.runRecord.rawOutput,
              });

              // Increment budget usage
              const budgetManager = new BudgetManager(this.repositories.projectRepo);
              await budgetManager.recordUsage(projectId, model, inputTokens, outputTokens);
            }

            // Prometheus metrics recording
            defaultMetricsRegistry.recordAgentRun({
              agent: definition.id,
              provider: result.runRecord.provider,
              model: result.runRecord.model,
              status: result.success ? "success" : "failed",
              durationMs: result.runRecord.latencyMs ?? 0,
              inputTokens,
              outputTokens,
              costUSD,
            });

            // Update Dynamic Router performance cache (Phase 12)
            router.recordOutcome({
              agentId: definition.id,
              model: result.runRecord.model,
              latencyMs: result.runRecord.latencyMs ?? 0,
              costUSD,
              success: result.success,
            });
          }

          return { task, result, approvalEvent };
        })
      );

      // Process execution outcomes
      for (const { task, result, approvalEvent } of results) {
        if (result.success && result.artifact) {
          let isApproved = true;
          let failureReasons: string[] = [];
          let gateTestOutput: string | undefined = undefined;

          if (shouldRunGates) {
            const gateEngine = this.gateEngine ?? new ApprovalGateEngine(this.runner);

            result.artifact.status = "draft";
            if (this.repositories) {
              await this.repositories.artifactRepo.saveArtifact(result.artifact);
            }

            await recordEvent(
              "REVIEW_REQUESTED",
              {
                artifactId: result.artifact.id,
                artifactType: result.artifact.type,
              },
              task.id
            );

            const gateResult = await gateEngine.evaluateArtifact(result.artifact, {
              projectId,
              taskId: task.id,
            });

            // Save individual audit reports if generated
            if (this.repositories) {
              if (gateResult.reports.reviewReport) {
                await this.repositories.artifactRepo.saveArtifact({
                  id: randomUUID(),
                  projectId,
                  taskId: task.id,
                  type: "ReviewReport",
                  version: 1,
                  createdBy: "forgeos-reviewer-agent",
                  content: gateResult.reports.reviewReport,
                  status: gateResult.reports.reviewReport.status === "pass" ? "approved" : "rejected",
                });
              }
              if (gateResult.reports.testReport) {
                await this.repositories.artifactRepo.saveArtifact({
                  id: randomUUID(),
                  projectId,
                  taskId: task.id,
                  type: "TestReport",
                  version: 1,
                  createdBy: "forgeos-qa-agent",
                  content: gateResult.reports.testReport,
                  status: gateResult.reports.testReport.passed ? "approved" : "rejected",
                });
              }
              if (gateResult.reports.securityReport) {
                await this.repositories.artifactRepo.saveArtifact({
                  id: randomUUID(),
                  projectId,
                  taskId: task.id,
                  type: "SecurityReport",
                  version: 1,
                  createdBy: "forgeos-security-agent",
                  content: gateResult.reports.securityReport,
                  status: gateResult.reports.securityReport.status === "secure" ? "approved" : "rejected",
                });
              }
            }

            if (gateResult.reports.testReport) {
              const suiteErrors = gateResult.reports.testReport.suites
                .filter((s) => !s.passed && s.error)
                .map((s) => `${s.name}: ${s.error}`)
                .join("\n");
              gateTestOutput = `${gateResult.reports.testReport.summary}${suiteErrors ? `\n${suiteErrors}` : ""}`;
            }

            if (gateResult.passed) {
              result.artifact.status = "approved";
            } else {
              result.artifact.status = "rejected";
              isApproved = false;
              failureReasons = gateResult.reasons;
            }
          } else {
            result.artifact.status = "approved"; // Baseline auto-approval
          }

          if (isApproved) {
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
            // Gate Rejected -> Check Failure Recovery & Circuit Breaker
            if (shouldRecover && this.recoveryStrategy) {
              const failureContext: FailureContext = {
                taskId: task.id,
                projectId,
                agentId: task.agentId,
                attemptCount: (task.retryCount ?? 0) + 1,
                error: `Gate evaluation failed: ${failureReasons.join("; ")}`,
                rawOutput: result.runRecord?.rawOutput,
                validationIssues: undefined,
                testOutput: gateTestOutput || undefined,
                gateReasons: failureReasons,
              };

              const plan = this.recoveryStrategy.planRecovery(
                failureContext,
                task.input as Record<string, unknown>
              );

              if (plan.loopCheck.isLoop) {
                defaultMetricsRegistry.recordCircuitBreakerTrip(task.agentId, plan.loopCheck.loopType);
                graph.updateTaskStatus(task.id, "FAILED");
                if (this.repositories) {
                  await this.repositories.artifactRepo.saveArtifact(result.artifact);
                  await this.repositories.projectRepo.updateTaskStatus(task.id, "FAILED");
                }

                await recordEvent(
                  "LOOP_DETECTED",
                  {
                    agentId: task.agentId,
                    loopType: plan.loopCheck.loopType,
                    consecutiveFailures: plan.loopCheck.consecutiveFailures,
                    message: plan.loopCheck.message,
                    errorSignature: plan.classification.errorSignature,
                  },
                  task.id
                );

                await recordEvent(
                  "REVIEW_FAILED",
                  {
                    agentId: task.agentId,
                    artifactId: result.artifact.id,
                    reasons: failureReasons,
                  },
                  task.id
                );

                await recordEvent(
                  "PROJECT_FAILED",
                  { failedTaskId: task.id, reasons: failureReasons, loopDetected: true },
                  task.id
                );

                return {
                  projectId,
                  status: "FAILED",
                  artifacts,
                  events,
                  tasks: graph.getAllTasks(),
                  error: `Circuit breaker tripped: ${plan.loopCheck.message}`,
                };
              }

              if (plan.shouldRetry) {
                graph.updateTaskStatus(task.id, "RETRYING");
                if (this.repositories) {
                  await this.repositories.projectRepo.updateTaskStatus(task.id, "RETRYING");
                }

                await recordEvent(
                  "RETRY_REQUESTED",
                  {
                    agentId: task.agentId,
                    attempt: (task.retryCount ?? 0) + 1,
                    category: plan.classification.category,
                    strategy: plan.strategy,
                    errorSignature: plan.classification.errorSignature,
                    delayMs: plan.backoffDelayMs,
                    remediationAdvice: plan.augmentedInput?.remediationAdvice,
                  },
                  task.id
                );

                if (plan.backoffDelayMs > 0) {
                  await new Promise((resolve) => setTimeout(resolve, plan.backoffDelayMs));
                }

                const updatedTask = graph.prepareRetry(
                  task.id,
                  plan.augmentedInput ? plan.augmentedInput.augmentedInput : task.input
                );

                if (this.repositories) {
                  await this.repositories.projectRepo.saveAgentTask({
                    id: updatedTask.id,
                    projectId,
                    agentId: updatedTask.agentId,
                    input: updatedTask.input as Record<string, unknown>,
                    status: "PENDING",
                  });
                }

                continue;
              }
            }

            // Gate rejection without retry
            graph.updateTaskStatus(task.id, "FAILED");
            if (this.repositories) {
              await this.repositories.artifactRepo.saveArtifact(result.artifact);
              await this.repositories.projectRepo.updateTaskStatus(task.id, "FAILED");
            }

            await recordEvent(
              "REVIEW_FAILED",
              {
                agentId: task.agentId,
                artifactId: result.artifact.id,
                reasons: failureReasons,
              },
              task.id
            );

            await recordEvent(
              "PROJECT_FAILED",
              { failedTaskId: task.id, reasons: failureReasons },
              task.id
            );

            return {
              projectId,
              status: "FAILED",
              artifacts,
              events,
              tasks: graph.getAllTasks(),
              error: `Gate evaluation failed: ${failureReasons.join("; ")}`,
            };
          }
        } else {
          // Agent runner execution failed -> Check Failure Recovery & Circuit Breaker
          if (shouldRecover && this.recoveryStrategy) {
            const failureContext: FailureContext = {
              taskId: task.id,
              projectId,
              agentId: task.agentId,
              attemptCount: (task.retryCount ?? 0) + 1,
              error: result.error ?? "Agent execution failed",
              rawOutput: result.runRecord?.rawOutput,
              validationIssues: result.validationIssues,
            };

            const plan = this.recoveryStrategy.planRecovery(
              failureContext,
              task.input as Record<string, unknown>
            );

            if (plan.loopCheck.isLoop) {
              defaultMetricsRegistry.recordCircuitBreakerTrip(task.agentId, plan.loopCheck.loopType);
              graph.updateTaskStatus(task.id, "FAILED");
              if (this.repositories) {
                await this.repositories.projectRepo.updateTaskStatus(task.id, "FAILED");
              }

              await recordEvent(
                "LOOP_DETECTED",
                {
                  agentId: task.agentId,
                  loopType: plan.loopCheck.loopType,
                  consecutiveFailures: plan.loopCheck.consecutiveFailures,
                  message: plan.loopCheck.message,
                  errorSignature: plan.classification.errorSignature,
                },
                task.id
              );

              await recordEvent(
                "TASK_FAILED",
                {
                  agentId: task.agentId,
                  error: plan.loopCheck.message,
                  loopDetected: true,
                },
                task.id
              );

              await recordEvent(
                "PROJECT_FAILED",
                { failedTaskId: task.id, error: plan.loopCheck.message, loopDetected: true },
                task.id
              );

              return {
                projectId,
                status: "FAILED",
                artifacts,
                events,
                tasks: graph.getAllTasks(),
                error: `Circuit breaker tripped: ${plan.loopCheck.message}`,
              };
            }

            if (plan.shouldRetry) {
              graph.updateTaskStatus(task.id, "RETRYING");
              if (this.repositories) {
                await this.repositories.projectRepo.updateTaskStatus(task.id, "RETRYING");
              }

              await recordEvent(
                "RETRY_REQUESTED",
                {
                  agentId: task.agentId,
                  attempt: (task.retryCount ?? 0) + 1,
                  category: plan.classification.category,
                  strategy: plan.strategy,
                  errorSignature: plan.classification.errorSignature,
                  delayMs: plan.backoffDelayMs,
                  remediationAdvice: plan.augmentedInput?.remediationAdvice,
                },
                task.id
              );

              if (plan.backoffDelayMs > 0) {
                await new Promise((resolve) => setTimeout(resolve, plan.backoffDelayMs));
              }

              const updatedTask = graph.prepareRetry(
                task.id,
                plan.augmentedInput ? plan.augmentedInput.augmentedInput : task.input
              );

              if (this.repositories) {
                await this.repositories.projectRepo.saveAgentTask({
                  id: updatedTask.id,
                  projectId,
                  agentId: updatedTask.agentId,
                  input: updatedTask.input as Record<string, unknown>,
                  status: "PENDING",
                });
              }

              continue;
            }
          }

          // Runner failure without retry
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
