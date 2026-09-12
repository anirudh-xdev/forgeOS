import { describe, it, expect } from "vitest";
import { MockProvider } from "../src/providers/mock.provider.js";

describe("MockProvider", () => {
  it("should return deterministic default response when no queue or handler is provided", async () => {
    const provider = new MockProvider();
    const response = await provider.generate({
      systemPrompt: "You are an assistant",
      userPrompt: "Hello world",
    });

    expect(response.provider).toBe("mock");
    expect(response.content).toContain("ForgeOS Mock Deliverable");
    expect(response.usage.costEstimateUSD).toBe(0.0);
    expect(response.usage.inputTokens).toBeGreaterThan(0);
    expect(response.usage.outputTokens).toBeGreaterThan(0);
    expect(response.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("should return queued responses sequentially", async () => {
    const provider = new MockProvider(["First response", "Second response"]);

    const res1 = await provider.generate({ systemPrompt: "", userPrompt: "1" });
    const res2 = await provider.generate({ systemPrompt: "", userPrompt: "2" });

    expect(res1.content).toBe("First response");
    expect(res2.content).toBe("Second response");
  });

  it("should execute custom handlers", async () => {
    const provider = new MockProvider();
    provider.setHandler((req) => `Handled: ${req.userPrompt}`);

    const res = await provider.generate({
      systemPrompt: "",
      userPrompt: "Build PM Spec",
    });

    expect(res.content).toBe("Handled: Build PM Spec");
    expect(provider.recordedCalls).toHaveLength(1);
  });

  it("should pass health check", async () => {
    const provider = new MockProvider();
    expect(await provider.healthCheck()).toBe(true);
  });

  it("should support streaming chunks", async () => {
    const provider = new MockProvider(["Hello world streaming"]);
    const chunks: string[] = [];

    for await (const chunk of provider.stream!({ systemPrompt: "", userPrompt: "" })) {
      chunks.push(chunk);
    }

    expect(chunks.join("")).toContain("Hello");
  });
});
