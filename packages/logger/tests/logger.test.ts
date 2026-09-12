import { describe, it, expect } from "vitest";
import { CostEstimator } from "../src/cost-estimator.js";
import { ForgeTracer } from "../src/tracer.js";
import { MetricsRegistry } from "../src/metrics.js";
import { LoggerManager } from "../src/logger.js";

describe("CostEstimator", () => {
  const estimator = new CostEstimator();

  it("should estimate $0 cost for local or mock models", () => {
    expect(estimator.estimateCostUSD("mock", 10000, 5000)).toBe(0);
    expect(estimator.estimateCostUSD("llama3:8b", 20000, 10000)).toBe(0);
    expect(estimator.estimateCostUSD("ollama/mistral", 50000, 20000)).toBe(0);
  });

  it("should calculate exact monetary cost for cloud models", () => {
    // gpt-4o: $2.50 input / $10.00 output per 1M tokens
    // 10,000 input = 0.025, 5,000 output = 0.05 => total 0.075
    const cost = estimator.estimateCostUSD("gpt-4o", 10000, 5000);
    expect(cost).toBe(0.075);

    // claude-3-5-sonnet: $3.00 input / $15.00 output per 1M tokens
    // 1,000,000 input = 3.0, 1,000,000 output = 15.0 => total 18.0
    const sonnetCost = estimator.estimateCostUSD("claude-3-5-sonnet", 1000000, 1000000);
    expect(sonnetCost).toBe(18.0);
  });
});

describe("ForgeTracer", () => {
  it("should record completed spans and store them by projectId", async () => {
    const tracer = new ForgeTracer("test-service");
    const projectId = "11111111-1111-1111-1111-111111111111";

    const result = await tracer.withSpan(
      "test.agent_run",
      { projectId, taskId: "task-1", agentId: "forgeos-pm-agent" },
      async (span) => {
        span.setAttribute("custom.attr", "test_value");
        return 42;
      }
    );

    expect(result).toBe(42);

    const spans = tracer.getSpans(projectId);
    expect(spans.length).toBe(1);
    expect(spans[0].name).toBe("test.agent_run");
    expect(spans[0].status.code).toBe("OK");
    expect(spans[0].attributes["forgeos.project_id"]).toBe(projectId);
    expect(spans[0].attributes["forgeos.task_id"]).toBe("task-1");
    expect(spans[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should capture exceptions and record ERROR status on failure", async () => {
    const tracer = new ForgeTracer("test-service");
    const projectId = "22222222-2222-2222-2222-222222222222";

    await expect(
      tracer.withSpan(
        "failing.operation",
        { projectId },
        async () => {
          throw new Error("Synthetic failure for tracing test");
        }
      )
    ).rejects.toThrow("Synthetic failure for tracing test");

    const spans = tracer.getSpans(projectId);
    expect(spans.length).toBe(1);
    expect(spans[0].status.code).toBe("ERROR");
    expect(spans[0].status.message).toContain("Synthetic failure for tracing test");
  });
});

describe("MetricsRegistry", () => {
  it("should record agent runs, tokens, and output Prometheus exposition text", async () => {
    const metrics = new MetricsRegistry(false); // disable process metrics for isolated test

    metrics.recordAgentRun({
      agent: "forgeos-pm-agent",
      provider: "mock",
      model: "mock-model",
      status: "success",
      durationMs: 250,
      inputTokens: 1200,
      outputTokens: 650,
      costUSD: 0.005,
    });

    metrics.recordCircuitBreakerTrip("forgeos-pm-agent", "DUPLICATE_ERROR");
    metrics.setBudgetUtilization("proj-123", 0.45, 0.25);

    const output = await metrics.getMetrics();
    expect(output).toContain("forgeos_agent_runs_total");
    expect(output).toContain('agent="forgeos-pm-agent"');
    expect(output).toContain("forgeos_tokens_total");
    expect(output).toContain("forgeos_circuit_breaker_trips_total");
    expect(output).toContain("forgeos_budget_utilization_ratio");
    expect(metrics.getContentType()).toContain("text/plain");
  });
});

describe("LoggerManager", () => {
  it("should create root and child loggers with context", () => {
    const manager = new LoggerManager();
    const child = manager.createLogger({ projectId: "p-1", agentId: "pm" });
    expect(child).toBeDefined();
    expect(typeof child.info).toBe("function");
  });
});
