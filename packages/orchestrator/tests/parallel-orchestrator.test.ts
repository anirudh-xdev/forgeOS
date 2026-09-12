import { describe, it, expect, afterAll } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import { AgentRunner } from "@forgeos/agent-runtime";
import {
  ProductSpecificationContent,
  ArchitectureSpecificationContent,
  DatabaseSchemaContent,
  BackendImplementationContent,
  UISpecificationContent,
  AgentTask,
} from "@forgeos/contracts";
import { InMemoryEventBus } from "@forgeos/event-bus";
import { WorkflowOrchestrator } from "../src/workflow-orchestrator.js";
import { AgentQueueManager } from "../src/queue/agent-queue.js";
import { AgentWorker } from "../src/queue/agent-worker.js";

describe("Parallel Orchestrator & Worker Queues (Phase 6)", () => {
  const samplePMSpec: ProductSpecificationContent = {
    project: "Parallel E2E Factory",
    goals: ["Demonstrate 5-agent parallel software factory"],
    actors: [{ role: "Admin", description: "Admin user" }],
    features: [
      {
        id: "FEAT-1",
        title: "Billing System",
        description: "Manages subscriptions",
        priority: "must_have",
      },
    ],
    constraints: ["PostgreSQL 16", "Redis 7"],
    acceptanceCriteria: [
      {
        featureId: "FEAT-1",
        scenario: "Charge card",
        given: "Valid token",
        when: "Charge requested",
        then: "Payment processed",
      },
    ],
  };

  const sampleArchSpec: ArchitectureSpecificationContent = {
    architecture: {
      pattern: "Event-Driven Microservice",
      components: [
        { name: "Billing API", role: "Handles payments", technologies: ["Fastify"] },
        { name: "Billing UI", role: "Renders dashboard", technologies: ["Next.js"] },
      ],
    },
    database: {
      engine: "PostgreSQL 16",
      entities: ["Subscription", "Invoice"],
      strategy: "Relational",
    },
    apis: [
      {
        endpoint: "/api/subscriptions",
        method: "POST",
        description: "Creates subscription",
        responseSchemaName: "SubscriptionResponse",
      },
    ],
    decisions: [
      {
        title: "ADR-001: Fastify + Redis",
        decision: "Use Fastify and Redis BullMQ",
        alternatives: ["Express"],
        tradeoffs: "High throughput",
      },
    ],
  };

  const sampleDbSchema: DatabaseSchemaContent = {
    engine: "postgresql",
    prismaSchemaFragment: "model Subscription { id String @id @default(uuid()) }",
    entities: [
      {
        name: "Subscription",
        fields: ["id String @id", "status String"],
        indexes: ["status"],
        relations: [],
      },
    ],
    migrationPlan: ["Create Subscription table"],
    rollbackPlan: 'DROP TABLE "Subscription";',
  };

  const sampleUISpec: UISpecificationContent = {
    framework: "nextjs",
    components: [
      {
        name: "SubscriptionCard",
        description: "Displays plan details",
        props: ["plan: string"],
        state: ["active: boolean"],
      },
    ],
    layout: {
      pages: ["BillingPage"],
      navigation: ["Sidebar"],
    },
    clientRoutes: ["/billing"],
  };

  const sampleBackendImpl: BackendImplementationContent = {
    framework: "fastify",
    routes: [
      {
        path: "/api/subscriptions",
        method: "POST",
        handlerDescription: "Creates subscription",
        responseSchema: "SubscriptionResponse",
      },
    ],
    services: [
      {
        name: "BillingService",
        methods: ["createSubscription(data)"],
      },
    ],
    unitTests: [
      {
        testName: "should create subscription",
        scenario: "Given valid payload, return 201",
      },
    ],
  };

  it("should execute full 5-agent parallel workflow: PM -> Arch -> [DB || Frontend] -> Backend", async () => {
    // Queue mocks in exact execution order:
    // 1. PM
    // 2. Architect
    // 3 & 4. Database & Frontend (Parallel)
    // 5. Backend
    const mockProvider = new MockProvider([
      JSON.stringify(samplePMSpec),
      JSON.stringify(sampleArchSpec),
      JSON.stringify(sampleDbSchema),
      JSON.stringify(sampleUISpec),
      JSON.stringify(sampleBackendImpl),
    ]);

    const runner = new AgentRunner({ aiProvider: mockProvider });
    const eventBus = new InMemoryEventBus();
    const orchestrator = new WorkflowOrchestrator(runner, undefined, eventBus);

    const receivedEvents: string[] = [];
    await eventBus.subscribe("*", (event) => {
      receivedEvents.push(event.type);
    });

    const result = await orchestrator.runFullSoftwareFactoryWorkflow({
      requirement: "Build automated subscription billing system.",
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.artifacts).toHaveLength(5);

    // Verify all 5 deliverables exist and are approved
    const artifactTypes = result.artifacts.map((a) => a.type);
    expect(artifactTypes).toContain("ProductSpecification");
    expect(artifactTypes).toContain("ArchitectureSpecification");
    expect(artifactTypes).toContain("DatabaseSchema");
    expect(artifactTypes).toContain("UISpecification");
    expect(artifactTypes).toContain("SourceCode");

    expect(result.artifacts.every((a) => a.status === "approved")).toBe(true);

    // Verify event bus received all lifecycle events
    expect(receivedEvents).toContain("PROJECT_CREATED");
    expect(receivedEvents).toContain("SPEC_APPROVED");
    expect(receivedEvents).toContain("ARCHITECTURE_APPROVED");
    expect(receivedEvents).toContain("PROJECT_COMPLETED");
  });

  describe("BullMQ Worker Queue Integration", () => {
    let queueManager: AgentQueueManager;
    let worker: AgentWorker;

    afterAll(async () => {
      if (worker) await worker.close();
      if (queueManager) await queueManager.close();
    });

    it("should enqueue a task to BullMQ and process it via AgentWorker", async () => {
      const mockProvider = new MockProvider([JSON.stringify(sampleDbSchema)]);
      const runner = new AgentRunner({ aiProvider: mockProvider });

      queueManager = new AgentQueueManager({
        redisUrl: "redis://localhost:6379",
      });

      worker = new AgentWorker({
        queueName: "agent-coding",
        runner,
        redisUrl: "redis://localhost:6379",
        concurrency: 2,
      });

      const task: AgentTask = {
        id: `queue-task-${Date.now()}`,
        projectId: `proj-${Date.now()}`,
        agentId: "forgeos-database-agent",
        input: { directive: "Design database" },
        dependencies: [],
        status: "PENDING",
        retryCount: 0,
      };

      const jobId = await queueManager.enqueueTask(task);
      expect(jobId).toContain(task.id);

      // Wait for BullMQ worker to process the job
      await new Promise((resolve) => setTimeout(resolve, 800));
    });
  });
});
