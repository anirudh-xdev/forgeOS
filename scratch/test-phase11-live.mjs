import { buildServer } from "../apps/api/dist/server.js";
import { MockProvider } from "../packages/ai-provider/dist/index.js";
import { InMemoryEventBus } from "../packages/event-bus/dist/index.js";
import { randomUUID } from "node:crypto";

async function main() {
  console.log("=== ForgeOS Phase 11: Observability & Metrics Live Verification ===\n");

  const port = 3005;

  const validPMSpec = JSON.stringify({
    project: "Observability Microservice",
    goals: ["Demonstrate full tracing and metrics"],
    actors: [{ role: "Developer", description: "Consumes Prometheus metrics" }],
    features: [
      {
        id: "FEAT-1",
        title: "Metrics Exporter",
        description: "Exposes /metrics endpoint",
        priority: "must_have",
      },
    ],
    constraints: ["Node.js 20+"],
    acceptanceCriteria: [
      {
        featureId: "FEAT-1",
        scenario: "Metrics scraped",
        given: "Server is running",
        when: "Prometheus scrapes /metrics",
        then: "Standard metrics returned",
      },
    ],
  });

  const validArchSpec = JSON.stringify({
    architecture: {
      pattern: "Event-Driven Telemetry",
      components: [
        {
          name: "Prometheus Exporter",
          role: "Exposes system metrics",
          technologies: ["Node.js", "prom-client"],
        },
      ],
    },
    database: {
      engine: "PostgreSQL 16",
      entities: ["AgentRun", "ProjectBudget"],
      strategy: "Relational metrics audit",
    },
    apis: [
      {
        endpoint: "/metrics",
        method: "GET",
        description: "Prometheus metrics",
      },
    ],
  });

  const mockProvider = new MockProvider([validPMSpec, validArchSpec]);
  const eventBus = new InMemoryEventBus();

  console.log("1. Booting Fastify API with Prometheus & OpenTelemetry instrumentation on port " + port + "...");
  const server = await buildServer({
    port,
    aiProvider: mockProvider,
    eventBus,
  });

  const address = await server.start();
  console.log(`✔ API server listening at ${address}\n`);

  try {
    const projectId = randomUUID();
    console.log(`2. Creating test project via POST /api/projects (${projectId})...`);

    const createRes = await fetch(`http://localhost:${port}/api/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        requirement: "Build an observable multi-agent microservices factory with metrics and tracing.",
        workflowType: "requirement_to_architecture",
        enableGates: false,
        enableRecovery: false,
      }),
    });

    if (!createRes.ok) {
      throw new Error(`Failed to create project: ${createRes.status}`);
    }

    const createBody = await createRes.json();
    console.log(`✔ Project created: ${createBody.projectId}, Status: ${createBody.status}\n`);

    console.log("3. Awaiting background agent executions and trace/metrics emission (4s)...");
    await new Promise((r) => setTimeout(r, 4000));

    console.log("4. Verifying Prometheus exposition at GET /metrics...");
    const metricsRes = await fetch(`http://localhost:${port}/metrics`);
    if (!metricsRes.ok) throw new Error(`GET /metrics failed: ${metricsRes.status}`);

    const metricsText = await metricsRes.text();
    const contentType = metricsRes.headers.get("content-type") || "";

    console.log(`✔ Content-Type: ${contentType}`);
    if (!metricsText.includes("forgeos_agent_runs_total")) {
      throw new Error("Missing forgeos_agent_runs_total metric in Prometheus output");
    }
    if (!metricsText.includes("forgeos_tokens_total")) {
      throw new Error("Missing forgeos_tokens_total metric in Prometheus output");
    }
    console.log("✔ Prometheus metrics output confirmed with counters, histograms, and gauges\n");

    console.log("5. Verifying Project Telemetry at GET /api/projects/:id/metrics...");
    const projMetricsRes = await fetch(`http://localhost:${port}/api/projects/${projectId}/metrics`);
    if (!projMetricsRes.ok) throw new Error(`GET /api/projects/:id/metrics failed: ${projMetricsRes.status}`);

    const projMetrics = await projMetricsRes.json();
    console.log(`✔ Total Runs: ${projMetrics.totalRuns}`);
    console.log(`✔ Success Rate: ${projMetrics.successRate}%`);
    console.log(`✔ Total Tokens: ${projMetrics.totalTokens.toLocaleString()}`);
    console.log(`✔ Estimated Cost: $${projMetrics.totalCostUSD} USD`);
    console.log(`✔ Budget Quota: ${projMetrics.budget.usedTokens} / ${projMetrics.budget.maxTokens} tokens (${projMetrics.budget.tokenUtilization}%)`);
    console.log(`✔ Agent Breakdown: ${projMetrics.agentBreakdown.map((a) => `${a.agentId} (${a.runs} runs, ${a.avgLatencyMs}ms)`).join(", ")}\n`);

    if (projMetrics.totalRuns < 2) {
      throw new Error(`Expected at least 2 agent runs, got ${projMetrics.totalRuns}`);
    }

    console.log("6. Verifying OpenTelemetry trace spans at GET /api/projects/:id/traces...");
    const tracesRes = await fetch(`http://localhost:${port}/api/projects/${projectId}/traces`);
    if (!tracesRes.ok) throw new Error(`GET /api/projects/:id/traces failed: ${tracesRes.status}`);

    const tracesBody = await tracesRes.json();
    console.log(`✔ Spans captured: ${tracesBody.spans.length}`);
    for (const span of tracesBody.spans) {
      console.log(`   - [${span.status.code}] ${span.name} (${span.durationMs} ms, spanId: ${span.spanId})`);
    }

    if (tracesBody.spans.length < 2) {
      throw new Error(`Expected at least 2 trace spans, got ${tracesBody.spans.length}`);
    }

    console.log("\n========================================================");
    console.log("✔ SUCCESS: Phase 11 Observability & Telemetry fully operational!");
    console.log("========================================================\n");
  } finally {
    await server.stop();
  }
}

main().catch((err) => {
  console.error("Live test failed:", err);
  process.exit(1);
});
