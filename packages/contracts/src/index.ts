import { z } from "zod";

// ==========================================
// 1. Task Contracts (Spec Section 6)
// ==========================================

export const TaskStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "WAITING",
  "COMPLETED",
  "FAILED",
  "RETRYING",
  "BLOCKED",
  "CANCELLED",
]);

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  agentId: z.string().min(1),
  input: z.unknown(),
  expectedOutput: z.unknown().optional(),
  dependencies: z.array(z.string().uuid()),
  status: TaskStatusSchema,
  retryCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

// ==========================================
// 2. Artifact Contracts (Spec Section 7)
// ==========================================

export const ArtifactTypeSchema = z.enum([
  "ProductSpecification",
  "ArchitectureSpecification",
  "DatabaseSchema",
  "APIContract",
  "UISpecification",
  "SourceCode",
  "TestReport",
  "SecurityReport",
  "ReviewReport",
  "ADR",
]);

export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export const ArtifactStatusSchema = z.enum(["draft", "approved", "rejected"]);
export type ArtifactStatus = z.infer<typeof ArtifactStatusSchema>;

export const ArtifactSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  type: ArtifactTypeSchema,
  version: z.number().int().positive().default(1),
  createdBy: z.string().min(1),
  content: z.unknown(),
  status: ArtifactStatusSchema.default("draft"),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type Artifact<T = unknown> = Omit<z.infer<typeof ArtifactSchema>, "content"> & {
  content: T;
};

// ==========================================
// 3. Domain Event Contracts (Spec Section 10)
// ==========================================

export const DomainEventTypeSchema = z.enum([
  "PROJECT_CREATED",
  "SPEC_CREATED",
  "SPEC_APPROVED",
  "ARCHITECTURE_CREATED",
  "ARCHITECTURE_APPROVED",
  "CONTRACT_CREATED",
  "TASK_CREATED",
  "TASK_STARTED",
  "TASK_COMPLETED",
  "TASK_FAILED",
  "REVIEW_REQUESTED",
  "REVIEW_FAILED",
  "RETRY_REQUESTED",
  "BUILD_FAILED",
  "TEST_FAILED",
  "ARTIFACT_UPDATED",
  "PROJECT_COMPLETED",
  "PROJECT_FAILED",
  "BUDGET_EXCEEDED",
  "LOOP_DETECTED",
  "TASK_ROUTED",
]);

export type DomainEventType = z.infer<typeof DomainEventTypeSchema>;

export const DomainEventSchema = z.object({
  id: z.string().uuid(),
  type: DomainEventTypeSchema,
  projectId: z.string().uuid(),
  taskId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  payload: z.unknown(),
});

export type DomainEvent<T = unknown> = Omit<z.infer<typeof DomainEventSchema>, "payload"> & {
  payload: T;
};

// ==========================================
// 4. Agent Definition Contracts (Spec Section 6)
// ==========================================

export const AgentDefinitionSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  capabilities: z.array(z.string()),
  inputSchema: z.record(z.unknown()),
  outputSchema: z.record(z.unknown()),
  tools: z.array(z.string()),
  systemPromptTemplate: z.string().min(10),
  maxRetries: z.number().int().nonnegative().default(3),
  timeoutMs: z.number().int().positive().default(60000),
});

export type AgentDefinition = z.infer<typeof AgentDefinitionSchema>;

// ==========================================
// 5. Agent Run Contracts (Spec Section 18)
// ==========================================

export const AgentRunStatusSchema = z.enum(["running", "success", "failed"]);
export type AgentRunStatus = z.infer<typeof AgentRunStatusSchema>;

export const AgentRunSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  provider: z.string().min(1),
  model: z.string().min(1),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  inputTokens: z.number().int().nonnegative().optional(),
  outputTokens: z.number().int().nonnegative().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  status: AgentRunStatusSchema.default("running"),
  error: z.string().optional(),
  rawOutput: z.string().optional(),
});

export type AgentRun = z.infer<typeof AgentRunSchema>;

// ==========================================
// 6. Budget Contracts (Spec Section 19)
// ==========================================

export const BudgetPolicySchema = z.object({
  maxTokens: z.number().int().positive().default(500000),
  maxCostUSD: z.number().nonnegative().default(10.0),
  maxRuntimeMinutes: z.number().int().positive().default(60),
  maxRetries: z.number().int().nonnegative().default(3),
  maxConcurrentAgents: z.number().int().positive().default(4),
});

export type BudgetPolicy = z.infer<typeof BudgetPolicySchema>;

// ==========================================
// 7. Structured Artifact Content Schemas
// ==========================================

export const ProductSpecificationContentSchema = z.object({
  project: z.string().min(1),
  goals: z.array(z.string()),
  actors: z.array(
    z.object({
      role: z.string(),
      description: z.string(),
    })
  ),
  features: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      priority: z.enum(["must_have", "should_have", "could_have"]),
    })
  ),
  constraints: z.array(z.string()),
  acceptanceCriteria: z.array(
    z.object({
      featureId: z.string(),
      scenario: z.string(),
      given: z.string(),
      when: z.string(),
      then: z.string(),
    })
  ),
});

export type ProductSpecificationContent = z.infer<typeof ProductSpecificationContentSchema>;

export const ArchitectureSpecificationContentSchema = z.object({
  architecture: z.object({
    pattern: z.string(),
    components: z.array(
      z.object({
        name: z.string(),
        role: z.string(),
        technologies: z.array(z.string()),
      })
    ),
  }),
  database: z.object({
    engine: z.string(),
    entities: z.array(z.string()),
    strategy: z.string(),
  }),
  apis: z.array(
    z.object({
      endpoint: z.string(),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      description: z.string(),
      requestSchemaName: z.string().optional(),
      responseSchemaName: z.string(),
    })
  ),
  decisions: z.array(
    z.object({
      title: z.string(),
      decision: z.string(),
      alternatives: z.array(z.string()),
      tradeoffs: z.string(),
    })
  ),
});

export type ArchitectureSpecificationContent = z.infer<typeof ArchitectureSpecificationContentSchema>;

export const ReviewReportContentSchema = z.object({
  status: z.enum(["pass", "fail"]),
  severity: z.enum(["blocker", "critical", "high", "medium", "low", "info"]).optional(),
  issues: z.array(
    z.object({
      file: z.string(),
      line: z.number().optional(),
      problem: z.string(),
      recommendation: z.string(),
      severity: z.enum(["blocker", "critical", "high", "medium", "low", "info"]),
    })
  ),
  summary: z.string(),
});

export type ReviewReportContent = z.infer<typeof ReviewReportContentSchema>;

export const DatabaseSchemaContentSchema = z.object({
  engine: z.literal("postgresql"),
  prismaSchemaFragment: z.string().min(10),
  entities: z.array(
    z.object({
      name: z.string(),
      fields: z.array(z.string()),
      indexes: z.array(z.string()).default([]),
      relations: z.array(z.string()).default([]),
    })
  ),
  migrationPlan: z.array(z.string()),
  rollbackPlan: z.string(),
});

export type DatabaseSchemaContent = z.infer<typeof DatabaseSchemaContentSchema>;

export const BackendImplementationContentSchema = z.object({
  framework: z.literal("fastify"),
  routes: z.array(
    z.object({
      path: z.string(),
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
      handlerDescription: z.string(),
      requestSchema: z.string().optional(),
      responseSchema: z.string(),
    })
  ),
  services: z.array(
    z.object({
      name: z.string(),
      methods: z.array(z.string()),
    })
  ),
  unitTests: z.array(
    z.object({
      testName: z.string(),
      scenario: z.string(),
    })
  ),
});

export type BackendImplementationContent = z.infer<typeof BackendImplementationContentSchema>;

export const UISpecificationContentSchema = z.object({
  framework: z.literal("nextjs"),
  components: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      props: z.array(z.string()),
      state: z.array(z.string()),
    })
  ),
  layout: z.object({
    pages: z.array(z.string()),
    navigation: z.array(z.string()),
  }),
  clientRoutes: z.array(z.string()),
});

export type UISpecificationContent = z.infer<typeof UISpecificationContentSchema>;

export const SandboxExecutionResultSchema = z.object({
  exitCode: z.number(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number(),
  timedOut: z.boolean(),
});

export type SandboxExecutionResult = z.infer<typeof SandboxExecutionResultSchema>;

export const TestReportContentSchema = z.object({
  passed: z.boolean(),
  totalTests: z.number(),
  passedTests: z.number(),
  failedTests: z.number(),
  durationMs: z.number(),
  suites: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      error: z.string().optional(),
    })
  ),
  summary: z.string(),
});

export type TestReportContent = z.infer<typeof TestReportContentSchema>;

export const SecurityFindingSchema = z.object({
  id: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  category: z.string(),
  file: z.string(),
  line: z.number().optional(),
  description: z.string(),
  remediation: z.string(),
});

export type SecurityFinding = z.infer<typeof SecurityFindingSchema>;

export const SecurityReportContentSchema = z.object({
  status: z.enum(["secure", "vulnerable", "blocked"]),
  findings: z.array(SecurityFindingSchema),
  riskScore: z.number().min(0).max(100),
  summary: z.string(),
});

export type SecurityReportContent = z.infer<typeof SecurityReportContentSchema>;

export const GateEvaluationResultSchema = z.object({
  passed: z.boolean(),
  artifactType: ArtifactTypeSchema,
  status: ArtifactStatusSchema,
  reports: z.object({
    reviewReport: ReviewReportContentSchema.optional(),
    testReport: TestReportContentSchema.optional(),
    securityReport: SecurityReportContentSchema.optional(),
  }),
  reasons: z.array(z.string()),
});

export type GateEvaluationResult = z.infer<typeof GateEvaluationResultSchema>;

// ==========================================
// 8. Failure Recovery & Loop Detection Contracts (Spec Section 16)
// ==========================================

export const FailureCategorySchema = z.enum([
  "TRANSIENT",
  "SYNTAX_ERROR",
  "VALIDATION_ERROR",
  "TEST_FAILURE",
  "SECURITY_VIOLATION",
  "CONTRACT_MISMATCH",
  "ENVIRONMENT_ERROR",
  "RESOURCE_EXHAUSTION",
  "TERMINAL",
  "UNKNOWN",
]);

export type FailureCategory = z.infer<typeof FailureCategorySchema>;

export const FailureClassificationSchema = z.object({
  category: FailureCategorySchema,
  retryable: z.boolean(),
  errorSignature: z.string(),
  message: z.string(),
  suggestedStrategy: z.string(),
  details: z.record(z.unknown()).optional(),
});

export type FailureClassification = z.infer<typeof FailureClassificationSchema>;

export const LoopTypeSchema = z.enum([
  "DUPLICATE_ERROR",
  "IDENTICAL_OUTPUT",
  "OSCILLATING_OUTPUT",
  "MAX_RETRIES_EXCEEDED",
  "NONE",
]);

export type LoopType = z.infer<typeof LoopTypeSchema>;

export const LoopDetectionResultSchema = z.object({
  isLoop: z.boolean(),
  loopType: LoopTypeSchema,
  consecutiveFailures: z.number().int().nonnegative(),
  signature: z.string().optional(),
  message: z.string(),
});

export type LoopDetectionResult = z.infer<typeof LoopDetectionResultSchema>;

export const RecoveryStrategyTypeSchema = z.enum([
  "IMMEDIATE_RETRY",
  "EXPONENTIAL_BACKOFF",
  "PROMPT_AUGMENTATION",
  "DELEGATE_SPECIALIST",
  "CIRCUIT_BREAKER_HALT",
]);

export type RecoveryStrategyType = z.infer<typeof RecoveryStrategyTypeSchema>;

// ==========================================
// 15. Dynamic Agent Selection & Routing Contracts (Phase 12)
// ==========================================

export const RoutingStrategySchema = z.enum([
  "BALANCED",
  "BEST_QUALITY",
  "COST_OPTIMIZED",
  "LATENCY_OPTIMIZED",
]);

export type RoutingStrategy = z.infer<typeof RoutingStrategySchema>;

export const ModelTierSchema = z.enum([
  "tier_fast",
  "tier_balanced",
  "tier_reasoning",
]);

export type ModelTier = z.infer<typeof ModelTierSchema>;

export const AgentScoreRecordSchema = z.object({
  agentId: z.string(),
  role: z.string(),
  model: z.string(),
  tier: ModelTierSchema,
  totalRuns: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(1),
  avgLatencyMs: z.number().nonnegative(),
  avgCostUSD: z.number().nonnegative(),
  capabilityScore: z.number().min(0).max(1),
  compositeScore: z.number().min(0).max(100),
  rank: z.number().int().positive(),
});

export type AgentScoreRecord = z.infer<typeof AgentScoreRecordSchema>;

export const DynamicRoutingDecisionSchema = z.object({
  taskId: z.string(),
  requiredCapabilities: z.array(z.string()),
  selectedAgentId: z.string(),
  selectedModel: z.string(),
  selectedTier: ModelTierSchema,
  strategy: RoutingStrategySchema,
  confidenceScore: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type DynamicRoutingDecision = z.infer<typeof DynamicRoutingDecisionSchema>;

export const AgentScoreboardSchema = z.object({
  strategy: RoutingStrategySchema,
  totalAgents: z.number().int().nonnegative(),
  scores: z.array(AgentScoreRecordSchema),
  timestamp: z.string().datetime(),
});

export type AgentScoreboard = z.infer<typeof AgentScoreboardSchema>;

export const RecommendAgentRequestSchema = z.object({
  directive: z.string().min(3),
  strategy: RoutingStrategySchema.optional().default("BALANCED"),
  budgetUtilization: z.number().min(0).max(100).optional(),
  attemptCount: z.number().int().nonnegative().optional(),
});

export type RecommendAgentRequest = z.infer<typeof RecommendAgentRequestSchema>;

// ==========================================
// 14. API & Realtime UI Contracts (Phase 10)
// ==========================================

export const CreateProjectRequestSchema = z.object({
  requirement: z.string().min(5),
  projectId: z.string().uuid().optional(),
  workflowType: z.enum(["requirement_to_architecture", "full_factory"]).default("full_factory"),
  enableGates: z.boolean().optional(),
  enableRecovery: z.boolean().optional(),
  routingStrategy: RoutingStrategySchema.optional(),
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const CreateProjectResponseSchema = z.object({
  projectId: z.string().uuid(),
  status: z.string(),
  message: z.string(),
});

export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;

export const TaskNodeSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  role: z.string(),
  status: TaskStatusSchema,
  retryCount: z.number().int().nonnegative().default(0),
  input: z.unknown(),
  dependencies: z.array(z.string()),
});

export type TaskNode = z.infer<typeof TaskNodeSchema>;

export const TaskEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
});

export type TaskEdge = z.infer<typeof TaskEdgeSchema>;

export const TaskGraphSnapshotSchema = z.object({
  projectId: z.string(),
  nodes: z.array(TaskNodeSchema),
  edges: z.array(TaskEdgeSchema),
  isComplete: z.boolean(),
  hasFailures: z.boolean(),
});

export type TaskGraphSnapshot = z.infer<typeof TaskGraphSnapshotSchema>;

export const GateDecisionRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().optional(),
  overrideFeedback: z.string().optional(),
});

export type GateDecisionRequest = z.infer<typeof GateDecisionRequestSchema>;

// ==========================================
// 14. Observability & Telemetry Contracts (Phase 11)
// ==========================================

export const AgentMetricSummarySchema = z.object({
  agentId: z.string(),
  role: z.string(),
  runs: z.number().int().nonnegative(),
  successfulRuns: z.number().int().nonnegative(),
  failedRuns: z.number().int().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  totalInputTokens: z.number().int().nonnegative(),
  totalOutputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  costUSD: z.number().nonnegative(),
});

export type AgentMetricSummary = z.infer<typeof AgentMetricSummarySchema>;

export const BudgetStatusSchema = z.object({
  maxTokens: z.number().int().positive(),
  usedTokens: z.number().int().nonnegative(),
  remainingTokens: z.number().int(),
  tokenUtilization: z.number().nonnegative(),
  maxCostUSD: z.number().nonnegative(),
  usedCostUSD: z.number().nonnegative(),
  remainingCostUSD: z.number(),
  costUtilization: z.number().nonnegative(),
  maxRuntimeMinutes: z.number().int().positive(),
  isExceeded: z.boolean(),
});

export type BudgetStatus = z.infer<typeof BudgetStatusSchema>;

export const ProjectMetricsSchema = z.object({
  projectId: z.string().uuid(),
  totalRuns: z.number().int().nonnegative(),
  successfulRuns: z.number().int().nonnegative(),
  failedRuns: z.number().int().nonnegative(),
  successRate: z.number().min(0).max(100),
  totalLatencyMs: z.number().nonnegative(),
  avgLatencyMs: z.number().nonnegative(),
  totalInputTokens: z.number().int().nonnegative(),
  totalOutputTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  totalCostUSD: z.number().nonnegative(),
  budget: BudgetStatusSchema,
  agentBreakdown: z.array(AgentMetricSummarySchema),
});

export type ProjectMetrics = z.infer<typeof ProjectMetricsSchema>;

export const TraceSpanRecordSchema = z.object({
  id: z.string(),
  traceId: z.string(),
  spanId: z.string(),
  parentSpanId: z.string().optional(),
  name: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  durationMs: z.number().nonnegative(),
  attributes: z.record(z.unknown()),
  status: z.object({
    code: z.enum(["UNSET", "OK", "ERROR"]),
    message: z.string().optional(),
  }),
});

export type TraceSpanRecord = z.infer<typeof TraceSpanRecordSchema>;

