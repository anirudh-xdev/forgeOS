import { describe, it, expect } from "vitest";
import { MockProvider } from "@forgeos/ai-provider";
import { ProductSpecificationContent } from "@forgeos/contracts";
import { AgentRunner } from "../src/agent-runner.js";
import { runPMAgent } from "../src/agents/pm.agent.js";
import { AgentContext } from "../src/types.js";

describe("Product Manager (PM) Agent", () => {
  const sampleContext: AgentContext = {
    projectId: "33333333-3333-3333-3333-333333333333",
    taskId: "44444444-4444-4444-4444-444444444444",
  };

  const sampleValidSpec: ProductSpecificationContent = {
    project: "Freelance Client Management System",
    goals: [
      "Streamline invoice and client tracking",
      "Provide realtime analytics on billable hours",
    ],
    actors: [
      { role: "Freelancer", description: "Primary platform user managing clients" },
      { role: "Client", description: "External stakeholder viewing and paying invoices" },
    ],
    features: [
      {
        id: "FEAT-001",
        title: "Client Directory",
        description: "CRUD operations for managing client profiles",
        priority: "must_have",
      },
      {
        id: "FEAT-002",
        title: "Invoice Generation",
        description: "Generate and email PDF invoices",
        priority: "must_have",
      },
      {
        id: "FEAT-003",
        title: "Analytics Dashboard",
        description: "Visual charts for monthly earnings",
        priority: "should_have",
      },
    ],
    constraints: [
      "Must adhere to PostgreSQL relational schema",
      "Zero vector database dependencies in v0.1",
    ],
    acceptanceCriteria: [
      {
        featureId: "FEAT-001",
        scenario: "Add new client successfully",
        given: "Freelancer is on the clients dashboard",
        when: "Valid client name and email are submitted",
        then: "Client record is created and displayed in directory",
      },
      {
        featureId: "FEAT-002",
        scenario: "Generate monthly invoice",
        given: "Completed project with logged hours",
        when: "Freelancer clicks generate invoice",
        then: "Invoice status is marked draft with computed total",
      },
    ],
  };

  it("should successfully generate a structured ProductSpecification artifact", async () => {
    const mockProvider = new MockProvider([JSON.stringify(sampleValidSpec)]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const result = await runPMAgent(
      runner,
      "Build a freelance CRM for invoices, clients, and analytics",
      sampleContext
    );

    expect(result.success).toBe(true);
    expect(result.retriesUsed).toBe(0);
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.type).toBe("ProductSpecification");
    expect(result.artifact?.status).toBe("draft");

    const content = result.artifact?.content as ProductSpecificationContent;
    expect(content.project).toBe("Freelance Client Management System");
    expect(content.goals).toHaveLength(2);
    expect(content.actors).toHaveLength(2);
    expect(content.features).toHaveLength(3);
    expect(content.acceptanceCriteria).toHaveLength(2);
  });

  it("should reject invalid input requirements (< 5 characters)", async () => {
    const mockProvider = new MockProvider();
    const runner = new AgentRunner({ aiProvider: mockProvider });

    await expect(
      runPMAgent(runner, "abc", sampleContext)
    ).rejects.toThrow();
  });

  it("should recover from invalid response via bounded retry", async () => {
    const incompleteSpec = JSON.stringify({
      project: "Incomplete Spec",
      goals: ["Only goal"],
      // missing actors, features, constraints, acceptanceCriteria
    });

    const mockProvider = new MockProvider([
      incompleteSpec,
      JSON.stringify(sampleValidSpec),
    ]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const result = await runPMAgent(
      runner,
      "Build a freelance CRM platform",
      sampleContext
    );

    expect(result.success).toBe(true);
    expect(result.retriesUsed).toBe(1);
    expect((result.artifact?.content as ProductSpecificationContent).project).toBe(
      "Freelance Client Management System"
    );
  });
});
