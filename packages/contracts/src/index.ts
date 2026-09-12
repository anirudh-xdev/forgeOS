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

