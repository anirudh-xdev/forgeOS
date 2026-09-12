import { describe, it, expect } from "vitest";
import { z } from "zod";
import { MockProvider } from "@forgeos/ai-provider";
import { AgentDefinition, AgentTask } from "@forgeos/contracts";
import { AgentRunner } from "../src/agent-runner.js";
import { AgentContext } from "../src/types.js";

describe("AgentRunner", () => {
  const sampleSchema = z.object({
    title: z.string().min(3),
    items: z.array(z.string()),
  });

  const sampleAgent: AgentDefinition = {
    id: "forgeos-test-agent",
    role: "Tester",
    capabilities: ["testing"],
    inputSchema: { type: "object" },
    outputSchema: { type: "object" },
    tools: [],
    systemPromptTemplate: "You are a test agent.",
    maxRetries: 2,
    timeoutMs: 5000,
  };

  const sampleTask: AgentTask = {
    id: "11111111-1111-1111-1111-111111111111",
    projectId: "22222222-2222-2222-2222-222222222222",
    agentId: sampleAgent.id,
    input: "Generate test report",
    dependencies: [],
    status: "RUNNING",
    retryCount: 0,
  };

  const sampleContext: AgentContext = {
    projectId: sampleTask.projectId,
    taskId: sampleTask.id,
  };

  it("should successfully generate, validate, and produce an artifact on first attempt", async () => {
    const validJson = JSON.stringify({
      title: "Valid Report",
      items: ["item 1", "item 2"],
    });

    const mockProvider = new MockProvider([validJson]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const result = await runner.execute(sampleAgent, sampleTask, sampleContext, sampleSchema, "TestReport");

    expect(result.success).toBe(true);
    expect(result.retriesUsed).toBe(0);
    expect(result.artifact).toBeDefined();
    expect(result.artifact?.type).toBe("TestReport");
    expect(result.artifact?.status).toBe("draft");
    expect(result.artifact?.content).toEqual({
      title: "Valid Report",
      items: ["item 1", "item 2"],
    });
    expect(result.runRecord.status).toBe("success");
    expect(result.runRecord.inputTokens).toBeGreaterThan(0);
  });

  it("should handle markdown code fences around JSON output", async () => {
    const fencedJson = "```json\n" + JSON.stringify({
      title: "Fenced Report",
      items: ["item A"],
    }) + "\n```";

    const mockProvider = new MockProvider([fencedJson]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const result = await runner.execute(sampleAgent, sampleTask, sampleContext, sampleSchema);

    expect(result.success).toBe(true);
    expect((result.output as any).title).toBe("Fenced Report");
  });

  it("should retry with error feedback when initial response violates schema, then succeed", async () => {
    const invalidJson = JSON.stringify({
      title: "ab", // Too short (min 3)
      items: "not an array", // Invalid type
    });

    const validJson = JSON.stringify({
      title: "Correct Title",
      items: ["fixed item"],
    });

    // Queue invalid first, then valid second
    const mockProvider = new MockProvider([invalidJson, validJson]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const result = await runner.execute(sampleAgent, sampleTask, sampleContext, sampleSchema);

    expect(result.success).toBe(true);
    expect(result.retriesUsed).toBe(1);
    expect((result.output as any).title).toBe("Correct Title");

    // Verify retry prompt contained feedback
    expect(mockProvider.recordedCalls).toHaveLength(2);
    expect(mockProvider.recordedCalls[1]?.userPrompt).toContain("[VALIDATION ERRORS IN ATTEMPT 1]");
  });

  it("should return failure when max retries are exhausted", async () => {
    const brokenJson = "this is completely invalid json string";

    // Returns invalid 3 times (attempt 0, 1, 2)
    const mockProvider = new MockProvider([brokenJson, brokenJson, brokenJson]);
    const runner = new AgentRunner({ aiProvider: mockProvider });

    const result = await runner.execute(sampleAgent, sampleTask, sampleContext, sampleSchema);

    expect(result.success).toBe(false);
    expect(result.retriesUsed).toBe(2);
    expect(result.error).toContain("JSON syntax error");
    expect(result.runRecord.status).toBe("failed");
    expect(result.artifact).toBeUndefined();
  });
});
