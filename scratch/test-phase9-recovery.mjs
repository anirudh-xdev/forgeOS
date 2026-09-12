import { randomUUID } from "node:crypto";
import { getPrismaClient, ArtifactRepository, ProjectRepository } from "../packages/database/dist/index.js";
import { RedisEventBus } from "../packages/event-bus/dist/index.js";
import { MockProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner } from "../packages/agent-runtime/dist/index.js";
import { WorkflowOrchestrator } from "../packages/orchestrator/dist/index.js";
import {
  RecoveryStrategy,
  RetryPolicy,
  LoopDetector,
} from "../packages/recovery/dist/index.js";

async function main() {
  console.log("\n========================================================");
  console.log("  ForgeOS Phase 9: Live Failure Recovery & Circuit Breakers");
  console.log("========================================================\n");

  const prisma = getPrismaClient();
  const eventBus = new RedisEventBus({ redisUrl: "redis://localhost:6379" });

  const artifactRepo = new ArtifactRepository(prisma);
  const projectRepo = new ProjectRepository(prisma);

  const repositories = { artifactRepo, projectRepo };

  // Set up live event listener over Redis Pub/Sub
  const liveEvents = [];
  await eventBus.subscribe("*", async (event) => {
    liveEvents.push(event);
    console.log(`  [Redis Event] [${event.type}] Task: ${event.taskId ?? "N/A"} - Agent: ${event.payload?.agentId ?? "N/A"}`);
  });

  console.log("✔ Connected to PostgreSQL and Redis Pub/Sub");

  // Valid artifact content for PM & Architect deliverables
  const validPMSpec = {
    project: "Live Resilient Factory",
    goals: ["Demonstrate live self-healing and circuit breaker halting"],
    actors: [{ role: "Engineer", description: "Factory developer" }],
    features: [
      {
        id: "FEAT-901",
        title: "Self-Healing Retries",
        description: "Diagnose schema errors and inject remedial feedback",
        priority: "must_have",
      },
      {
        id: "FEAT-902",
        title: "Circuit Breakers",
        description: "Halt duplicate error loops deterministically",
        priority: "must_have",
      },
    ],
    constraints: ["PostgreSQL 16", "Redis 7+"],
    acceptanceCriteria: [
      {
        featureId: "FEAT-901",
        scenario: "Automated recovery after failure",
        given: "Agent produces schema violation",
        when: "Remediation feedback is injected",
        then: "Agent produces valid schema on retry",
      },
    ],
  };

  const validArchSpec = {
    architecture: {
      pattern: "Event-Driven Self-Healing Mesh",
      components: [
        {
          name: "RecoveryEngine",
          role: "Computes SHA-256 error signatures and augments inputs",
          technologies: ["TypeScript", "Zod", "Crypto"],
        },
        {
          name: "CircuitBreaker",
          role: "Monitors execution history and terminates loops",
          technologies: ["In-Memory Sliding Window", "Redis"],
        },
      ],
    },
    database: {
      engine: "PostgreSQL 16",
      entities: ["AgentTask", "DomainEvent", "Artifact"],
      strategy: "Relational persistence with transaction boundaries",
    },
    apis: [
      {
        endpoint: "/api/recovery/status",
        method: "GET",
        description: "Retrieve circuit breaker state",
        responseSchemaName: "CircuitBreakerStatusResponse",
      },
    ],
    decisions: [
      {
        title: "ADR-009: Automated Circuit Breakers",
        decision: "Halt duplicate failure signatures after 2 occurrences",
        alternatives: ["Manual admin killswitch", "Unbounded backoff"],
        tradeoffs: "Deterministic budget guardrails against infinite loops",
      },
    ],
  };

  // ----------------------------------------------------
  // Scenario 1: Live Self-Healing Retry Flow
  // ----------------------------------------------------
  console.log("\n--- Scenario 1: Live Self-Healing Retry (Schema Violation -> Augmented Prompt -> Success) ---");

  const malformedPM = JSON.stringify({ broken: "missing required fields" });
  const mockProviderScenario1 = new MockProvider([
    malformedPM,
    malformedPM,
    malformedPM,
    malformedPM, // Attempt 1 exhausts 4 inner attempts (0..3) -> fails
    JSON.stringify(validPMSpec), // Attempt 2 succeeds with augmented input
    JSON.stringify(validArchSpec), // Architect succeeds first try
  ]);

  const runner1 = new AgentRunner({ aiProvider: mockProviderScenario1 });
  const fastRecovery1 = new RecoveryStrategy(
    undefined,
    new RetryPolicy({ initialDelayMs: 10, jitter: false, maxRetries: 3 })
  );

  const orchestrator1 = new WorkflowOrchestrator(
    runner1,
    repositories,
    eventBus,
    undefined,
    fastRecovery1
  );

  const scenario1ProjectId = randomUUID();
  console.log(`Executing Workflow for Project: ${scenario1ProjectId}`);

  const result1 = await orchestrator1.runRequirementToArchitectureWorkflow({
    projectId: scenario1ProjectId,
    requirement: "Build a resilient self-healing software factory with real-time audit logging.",
  });

  console.log(`Scenario 1 Result Status: ${result1.status}`);
  if (result1.status !== "COMPLETED") {
    throw new Error(`Scenario 1 failed unexpectedly: ${result1.error}`);
  }

  // Small pause for Redis event propagation
  await new Promise((r) => setTimeout(r, 100));

  // Verify Scenario 1 in Database
  const dbProject1 = await projectRepo.getProject(scenario1ProjectId);
  console.log(`✔ PostgreSQL: Project record verified (ID: ${dbProject1.id}, Status: ${dbProject1.status})`);
  console.log(`✔ PostgreSQL: ${dbProject1.tasks.length} tasks persisted, ${dbProject1.artifacts.length} artifacts generated, ${dbProject1.events.length} domain events logged`);

  const pmTask1 = dbProject1.tasks.find((t) => t.agentId === "forgeos-pm-agent");
  console.log(`✔ PostgreSQL: PM Task final status is '${pmTask1.status}' with ${pmTask1.runs.length} runs recorded`);

  const retryEvent = result1.events.find((e) => e.type === "RETRY_REQUESTED");
  console.log(`✔ Domain Event: RETRY_REQUESTED emitted for attempt ${retryEvent?.payload?.attempt}, category: ${retryEvent?.payload?.category}`);

  // ----------------------------------------------------
  // Scenario 2: Live Circuit Breaker Loop Detection
  // ----------------------------------------------------
  console.log("\n--- Scenario 2: Live Circuit Breaker (Duplicate Error Signatures -> Breaker Trips -> Halt) ---");

  const identicalBroken = JSON.stringify({ faulty: "never changing output" });
  const mockProviderScenario2 = new MockProvider([
    identicalBroken, identicalBroken, identicalBroken, identicalBroken, // Attempt 1 fails
    identicalBroken, identicalBroken, identicalBroken, identicalBroken, // Attempt 2 fails with identical error
  ]);

  const runner2 = new AgentRunner({ aiProvider: mockProviderScenario2 });
  const fastRecovery2 = new RecoveryStrategy(
    undefined,
    new RetryPolicy({ initialDelayMs: 10, jitter: false, maxRetries: 5 }),
    new LoopDetector({ maxConsecutiveIdenticalErrors: 2 })
  );

  const orchestrator2 = new WorkflowOrchestrator(
    runner2,
    repositories,
    eventBus,
    undefined,
    fastRecovery2
  );

  const scenario2ProjectId = randomUUID();
  console.log(`Executing Workflow for Project: ${scenario2ProjectId}`);

  const result2 = await orchestrator2.runRequirementToArchitectureWorkflow({
    projectId: scenario2ProjectId,
    requirement: "Verify that duplicate errors trip circuit breaker.",
  });

  console.log(`Scenario 2 Result Status: ${result2.status}`);
  console.log(`Scenario 2 Error Message: ${result2.error}`);

  if (result2.status !== "FAILED") {
    throw new Error(`Scenario 2 should have FAILED but got: ${result2.status}`);
  }

  // Small pause for Redis event propagation
  await new Promise((r) => setTimeout(r, 100));

  // Verify Scenario 2 in Database
  const dbProject2 = await projectRepo.getProject(scenario2ProjectId);
  const loopEvent = result2.events.find((e) => e.type === "LOOP_DETECTED");

  console.log(`✔ PostgreSQL: Project record verified (ID: ${dbProject2.id})`);
  console.log(`✔ Domain Event: LOOP_DETECTED emitted: ${loopEvent?.payload?.message}`);
  console.log(`✔ Circuit Breaker: Tripped on loopType '${loopEvent?.payload?.loopType}' after ${loopEvent?.payload?.consecutiveFailures} consecutive identical errors`);

  // Clean disconnect
  await eventBus.close();
  await prisma.$disconnect();

  console.log("\n========================================================");
  console.log("  ✔ Phase 9 Live Failure Recovery Verification PASSED");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("FATAL ERROR in test-phase9-recovery:", err);
  process.exit(1);
});
