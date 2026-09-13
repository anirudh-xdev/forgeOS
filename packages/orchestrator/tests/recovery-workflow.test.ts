import { describe, it, expect } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import { AgentRunner } from "@forgeos/agent-runtime";
import {
  ProductSpecificationContent,
  ArchitectureSpecificationContent,
} from "@forgeos/contracts";
import { WorkflowOrchestrator } from "../src/workflow-orchestrator.js";
import {
  RecoveryStrategy,
  RetryPolicy,
  LoopDetector,
} from "@forgeos/recovery";

describe("WorkflowOrchestrator Failure Recovery & Circuit Breakers (Phase 9)", () => {
  const validPMSpec: ProductSpecificationContent = {
    project: "Self Healing Project",
    goals: ["Demonstrate self healing retries"],
    actors: [{ role: "Admin", description: "System administrator" }],
    features: [
      {
        id: "FEAT-100",
        title: "Resilient Orchestration",
        description: "Automated retry and circuit breaking",
        priority: "must_have",
      },
    ],
    constraints: ["Node.js 20+"],
    acceptanceCriteria: [
      {
        featureId: "FEAT-100",
        scenario: "Self healing retry succeeds",
        given: "Agent produces invalid schema on first try",
        when: "Remediation feedback is injected",
        then: "Agent produces valid schema on retry",
      },
    ],
  };

  const validArchSpec: ArchitectureSpecificationContent = {
    architecture: {
      pattern: "Event-Driven Self-Healing",
      components: [
        {
          name: "Recovery Engine",
          role: "Diagnoses failures and augments prompts",
          technologies: ["TypeScript", "Zod"],
        },
      ],
    },
    database: {
      engine: "PostgreSQL 16",
      entities: ["AgentTask", "DomainEvent"],
      strategy: "Relational audit logs",
    },
    apis: [
      {
        endpoint: "/api/workflows",
        method: "POST",
        description: "Trigger resilient workflow",
        responseSchemaName: "WorkflowResponse",
      },
    ],
    decisions: [
      {
        title: "ADR-009: Exponential Backoff & Circuit Breakers",
        decision: "Halt duplicate error loops after 2 consecutive identical signatures",
        alternatives: ["Infinite retries", "Manual operator intervention"],
        tradeoffs: "Prevents runaway token spend while allowing self-healing",
      },
    ],
  };

  it("should self-heal when an agent fails attempt 1 with schema validation error and succeeds on attempt 2", async () => {
    // Attempt 1: Malformed response missing required fields (3 times to exhaust AgentRunner inner retries)
    const malformedPMResponse = JSON.stringify({
      invalidField: "This is completely missing the required ProductSpecification structure",
    });

    // Attempt 2: Valid PMSpec complying with ProductSpecificationContentSchema
    const validPMResponse = JSON.stringify(validPMSpec);

    // Attempt 3: Architect Agent response (succeeds first try)
    const validArchResponse = JSON.stringify(validArchSpec);

    const mockProvider = new MockProvider([
      malformedPMResponse,
      malformedPMResponse,
      malformedPMResponse,
      malformedPMResponse, // Runner attempt 1 exhausts 4 inner attempts (0..3) -> returns success: false
      validPMResponse,     // Runner attempt 2 succeeds on first try with augmented input
      validArchResponse,   // Architect Agent succeeds on first try
    ]);

    const runner = new AgentRunner({ aiProvider: mockProvider });
    // Configure instantaneous backoff (delay = 0) for test speed
    const fastRecovery = new RecoveryStrategy(
      undefined,
      new RetryPolicy({ initialDelayMs: 0, jitter: false })
    );

    const orchestrator = new WorkflowOrchestrator(
      runner,
      undefined,
      undefined,
      undefined,
      fastRecovery
    );

    const result = await orchestrator.runRequirementToArchitectureWorkflow({
      requirement: "Build a resilient self-healing multi-agent workflow.",
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.artifacts).toHaveLength(2);

    // Verify RETRY_REQUESTED event was emitted
    const retryEvents = result.events.filter((e) => e.type === "RETRY_REQUESTED");
    expect(retryEvents).toHaveLength(1);
    expect(retryEvents[0]?.payload).toMatchObject({
      agentId: "forgeos-pm-agent",
      attempt: 1,
      category: "VALIDATION_ERROR",
      strategy: "PROMPT_AUGMENTATION",
    });

    // Verify PM task retryCount
    const pmTask = result.tasks.find((t) => t.agentId === "forgeos-pm-agent");
    expect(pmTask?.retryCount).toBe(1);
    expect(pmTask?.status).toBe("COMPLETED");

    // Verify PM task input was augmented with remediation advice
    const augmentedInput = pmTask?.input as Record<string, unknown>;
    expect(augmentedInput.recoveryFeedback).toBeDefined();
    expect((augmentedInput.recoveryFeedback as any).category).toBe("VALIDATION_ERROR");
    expect((augmentedInput.recoveryFeedback as any).remediationAdvice).toContain(
      "schema validation"
    );

    // Verify final artifacts were successfully created and approved
    const pmArtifact = result.artifacts.find((a) => a.type === "ProductSpecification");
    expect(pmArtifact?.status).toBe("approved");

    const archArtifact = result.artifacts.find((a) => a.type === "ArchitectureSpecification");
    expect(archArtifact?.status).toBe("approved");
  });

  it("should trip circuit breaker and halt immediately when identical duplicate errors repeat", async () => {
    // Both attempt 1 and attempt 2 exhaust 3 inner retries with the exact same error
    const identicalMalformed = JSON.stringify({
      errorKey: "identical broken output",
    });

    const mockProvider = new MockProvider([
      identicalMalformed,
      identicalMalformed,
      identicalMalformed, // Task Attempt 1 failure
      identicalMalformed,
      identicalMalformed,
      identicalMalformed, // Task Attempt 2 failure (identical signature)
    ]);

    const runner = new AgentRunner({ aiProvider: mockProvider });
    // Breaker trips when 2 consecutive identical error signatures occur
    const fastRecovery = new RecoveryStrategy(
      undefined,
      new RetryPolicy({ initialDelayMs: 0, jitter: false, maxRetries: 5 }),
      new LoopDetector({ maxConsecutiveIdenticalErrors: 2 })
    );

    const orchestrator = new WorkflowOrchestrator(
      runner,
      undefined,
      undefined,
      undefined,
      fastRecovery
    );

    const result = await orchestrator.runRequirementToArchitectureWorkflow({
      requirement: "Trigger circuit breaker loop detection.",
    });

    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("Circuit breaker tripped");

    // Verify LOOP_DETECTED event was emitted
    const loopEvents = result.events.filter((e) => e.type === "LOOP_DETECTED");
    expect(loopEvents).toHaveLength(1);
    expect(loopEvents[0]?.payload).toMatchObject({
      agentId: "forgeos-pm-agent",
      loopType: "DUPLICATE_ERROR",
      consecutiveFailures: 2,
    });

    // Verify task failed
    const pmTask = result.tasks.find((t) => t.agentId === "forgeos-pm-agent");
    expect(pmTask?.status).toBe("FAILED");

    // Verify Architect task was never run (remains PENDING)
    const archTask = result.tasks.find((t) => t.agentId === "forgeos-architect-agent");
    expect(archTask?.status).toBe("PENDING");
  });

  it("should trip circuit breaker when retry threshold is exceeded", async () => {
    const broken1 = JSON.stringify({ invalid: 1 });
    const broken2 = JSON.stringify({ invalid: 2 });
    const broken3 = JSON.stringify({ invalid: 3 });

    const mockProvider = new MockProvider([
      broken1, broken1, broken1, // Attempt 1 failure
      broken2, broken2, broken2, // Attempt 2 failure
      broken3, broken3, broken3, // Attempt 3 failure
    ]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    // Max 2 retries allowed, with maxConsecutiveIdenticalErrors and Outputs higher so maxRetries is tested
    const fastRecovery = new RecoveryStrategy(
      undefined,
      new RetryPolicy({ initialDelayMs: 0, jitter: false, maxRetries: 2 }),
      new LoopDetector({ maxConsecutiveIdenticalErrors: 5, maxConsecutiveIdenticalOutputs: 5, maxRetries: 2 })
    );

    const orchestrator = new WorkflowOrchestrator(
      runner,
      undefined,
      undefined,
      undefined,
      fastRecovery
    );

    const result = await orchestrator.runRequirementToArchitectureWorkflow({
      requirement: "Exceed max retries.",
    });

    expect(result.status).toBe("FAILED");
    expect(result.error).toContain("maximum allowed retry threshold");

    const loopEvents = result.events.filter((e) => e.type === "LOOP_DETECTED");
    expect(loopEvents).toHaveLength(1);
    expect(loopEvents[0]?.payload).toMatchObject({
      loopType: "MAX_RETRIES_EXCEEDED",
    });
  });
});
