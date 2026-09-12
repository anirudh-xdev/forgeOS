import { describe, it, expect } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import { ArchitectureSpecificationContent, Artifact } from "@forgeos/contracts";
import { AgentRunner } from "../src/agent-runner.js";
import { runArchitectAgent } from "../src/agents/architect.agent.js";
import { AgentContext } from "../src/types.js";

describe("Architect Agent", () => {
  const sampleUpstreamPMArtifact: Artifact = {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    projectId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    taskId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    type: "ProductSpecification",
    version: 1,
    createdBy: "forgeos-pm-agent",
    content: {
      project: "Project Management System",
      goals: ["Manage projects and tasks"],
      actors: [{ role: "User", description: "Standard user" }],
      features: [{ id: "FEAT-1", title: "Tasks", description: "CRUD tasks", priority: "must_have" }],
      constraints: ["Adhere to PostgreSQL"],
      acceptanceCriteria: [{ featureId: "FEAT-1", scenario: "Create task", given: "Logged in", when: "Submit", then: "Saved" }],
    },
    status: "approved",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleValidArch: ArchitectureSpecificationContent = {
    architecture: {
      pattern: "Modular Event-Driven Architecture",
      components: [
        { name: "API Service", role: "Handles HTTP requests", technologies: ["Fastify", "TypeScript"] },
        { name: "Worker Service", role: "Consumes BullMQ background jobs", technologies: ["Node.js", "BullMQ"] },
      ],
    },
    database: {
      engine: "PostgreSQL 16",
      entities: ["User", "Project", "Task"],
      strategy: "Relational foreign keys with composite indexes",
    },
    apis: [
      {
        endpoint: "/api/tasks",
        method: "POST",
        description: "Create a new task",
        responseSchemaName: "TaskResponseSchema",
      },
    ],
    decisions: [
      {
        title: "ADR-001: Fastify for High-Performance API",
        decision: "Adopt Fastify over Express",
        alternatives: ["Express", "NestJS"],
        tradeoffs: "Fastify delivers higher throughput with low overhead",
      },
    ],
  };

  it("should generate a structured ArchitectureSpecification artifact based on upstream spec", async () => {
    const mockProvider = new MockProvider([JSON.stringify(sampleValidArch)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const context: AgentContext = {
      projectId: sampleUpstreamPMArtifact.projectId,
      taskId: "dddddddd-dddd-dddd-dddd-dddddddddddd",
      upstreamArtifacts: [sampleUpstreamPMArtifact],
    };

    const result = await runArchitectAgent(runner, context);

    expect(result.success).toBe(true);
    expect(result.artifact?.type).toBe("ArchitectureSpecification");
    expect(result.artifact?.status).toBe("draft");

    const content = result.artifact?.content as ArchitectureSpecificationContent;
    expect(content.architecture.pattern).toContain("Modular");
    expect(content.components ?? content.architecture.components).toHaveLength(2);
    expect(content.database.engine).toContain("PostgreSQL");
    expect(content.apis).toHaveLength(1);
    expect(content.decisions).toHaveLength(1);
  });
});
