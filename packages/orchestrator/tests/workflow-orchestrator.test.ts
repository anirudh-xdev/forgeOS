import { describe, it, expect } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import { AgentRunner } from "@forgeos/agent-runtime";
import {
  ProductSpecificationContent,
  ArchitectureSpecificationContent,
} from "@forgeos/contracts";
import { WorkflowOrchestrator } from "../src/workflow-orchestrator.js";

describe("WorkflowOrchestrator (PM → Architect Automated Handoff)", () => {
  const samplePMSpec: ProductSpecificationContent = {
    project: "Automated Workflow Project",
    goals: ["Demonstrate multi-agent orchestration"],
    actors: [{ role: "User", description: "Standard user" }],
    features: [
      {
        id: "FEAT-100",
        title: "User Management",
        description: "Manage users",
        priority: "must_have",
      },
    ],
    constraints: ["PostgreSQL 16 only"],
    acceptanceCriteria: [
      {
        featureId: "FEAT-100",
        scenario: "Register user",
        given: "User is on register page",
        when: "Valid email is submitted",
        then: "Account created",
      },
    ],
  };

  const sampleArchSpec: ArchitectureSpecificationContent = {
    architecture: {
      pattern: "Event-Driven Micro-Services",
      components: [
        {
          name: "API Gateway",
          role: "Routes HTTP calls",
          technologies: ["Fastify", "TypeScript"],
        },
      ],
    },
    database: {
      engine: "PostgreSQL 16",
      entities: ["User"],
      strategy: "Relational with foreign keys",
    },
    apis: [
      {
        endpoint: "/api/users",
        method: "POST",
        description: "Create user",
        responseSchemaName: "UserResponseSchema",
      },
    ],
    decisions: [
      {
        title: "ADR-001: PostgreSQL Database",
        decision: "Use PostgreSQL",
        alternatives: ["MongoDB"],
        tradeoffs: "ACID compliance with strong typing",
      },
    ],
  };

  it("should execute PM Agent and automatically hand off to Architect Agent", async () => {
    // Queue PM response first, Architect response second
    const mockProvider = new MockProvider([
      JSON.stringify(samplePMSpec),
      JSON.stringify(sampleArchSpec),
    ]);

    const runner = new AgentRunner({ aiProvider: mockProvider });
    const orchestrator = new WorkflowOrchestrator(runner);

    const result = await orchestrator.runRequirementToArchitectureWorkflow({
      requirement: "Build a user management service with PostgreSQL and Fastify.",
    });

    expect(result.status).toBe("COMPLETED");
    expect(result.artifacts).toHaveLength(2);

    // Verify Deliverable 1: ProductSpecification
    const pmArtifact = result.artifacts.find(
      (a) => a.type === "ProductSpecification"
    );
    expect(pmArtifact).toBeDefined();
    expect(pmArtifact?.createdBy).toBe("forgeos-pm-agent");
    expect(pmArtifact?.status).toBe("approved");

    // Verify Deliverable 2: ArchitectureSpecification
    const archArtifact = result.artifacts.find(
      (a) => a.type === "ArchitectureSpecification"
    );
    expect(archArtifact).toBeDefined();
    expect(archArtifact?.createdBy).toBe("forgeos-architect-agent");
    expect(archArtifact?.status).toBe("approved");

    // Verify Automated Handoff: Architect call received PM's content
    expect(mockProvider.recordedCalls).toHaveLength(2);
    const architectPrompt = mockProvider.recordedCalls[1]?.userPrompt;
    expect(architectPrompt).toContain("Automated Workflow Project");
    expect(architectPrompt).toContain("ProductSpecification (v1)");

    // Verify Sequence of Domain Events
    const eventTypes = result.events.map((e) => e.type);
    expect(eventTypes).toContain("PROJECT_CREATED");
    expect(eventTypes).toContain("TASK_STARTED");
    expect(eventTypes).toContain("SPEC_APPROVED");
    expect(eventTypes).toContain("ARCHITECTURE_APPROVED");
    expect(eventTypes).toContain("PROJECT_COMPLETED");
  });
});
