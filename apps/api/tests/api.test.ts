import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import { InMemoryEventBus } from "@forgeos/event-bus";
import { MockProvider } from "@forgeos/ai-provider";
import { buildServer, ForgeOSServerInstance } from "../src/server.js";
import { randomUUID } from "node:crypto";
import { DomainEvent } from "@forgeos/contracts";

describe("Fastify API Server & Socket.IO Gateway (Phase 10)", () => {
  let serverInstance: ForgeOSServerInstance;
  let serverAddress: string;
  let clientSocket: ClientSocket;
  const testPort = 3948;

  beforeAll(async () => {
    const inMemoryBus = new InMemoryEventBus();
    const mockProvider = new MockProvider();

    serverInstance = await buildServer({
      port: testPort,
      eventBus: inMemoryBus,
      aiProvider: mockProvider,
    });

    serverAddress = await serverInstance.start();
  });

  afterAll(async () => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    await serverInstance.stop();
  });

  it("should respond to health check at GET /health", async () => {
    const response = await serverInstance.app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("forgeos-api");
  });

  it("should reject project creation with invalid payload at POST /api/projects", async () => {
    const response = await serverInstance.app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { requirement: "tiny" }, // Less than 5 chars
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain("Invalid project request payload");
  });

  it("should accept valid project creation request at POST /api/projects", async () => {
    const projectId = randomUUID();
    const response = await serverInstance.app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        projectId,
        requirement: "Build a resilient SaaS dashboard with Postgres and Redis.",
        workflowType: "requirement_to_architecture",
        enableGates: false,
        enableRecovery: false,
      },
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.projectId).toBe(projectId);
    expect(body.status).toBe("ACTIVE");
  });

  it("should return 404 for nonexistent project at GET /api/projects/:id", async () => {
    const response = await serverInstance.app.inject({
      method: "GET",
      url: `/api/projects/${randomUUID()}`,
    });

    expect(response.statusCode).toBe(404);
  });

  it("should connect Socket.IO client and stream domain events in real time", async () => {
    const projectId = randomUUID();

    // Connect Socket.IO client
    clientSocket = Client(`http://localhost:${testPort}`, {
      transports: ["websocket"],
      reconnection: false,
    });

    await new Promise<void>((resolve, reject) => {
      clientSocket.on("connect", () => {
        resolve();
      });
      clientSocket.on("connect_error", (err) => {
        reject(err);
      });
    });

    expect(clientSocket.connected).toBe(true);

    // Join project room
    clientSocket.emit("join_project", projectId);

    // Listen for domain_event
    const receivedEventPromise = new Promise<DomainEvent>((resolve) => {
      clientSocket.on("domain_event", (event: DomainEvent) => {
        resolve(event);
      });
    });

    // Broadcast test domain event
    const sampleEvent: DomainEvent = {
      id: randomUUID(),
      type: "TASK_STARTED",
      projectId,
      taskId: randomUUID(),
      timestamp: new Date().toISOString(),
      payload: { agentId: "forgeos-pm-agent", status: "RUNNING" },
    };

    serverInstance.socketGateway.broadcastDomainEvent(sampleEvent);

    const receivedEvent = await receivedEventPromise;
    expect(receivedEvent.type).toBe("TASK_STARTED");
    expect(receivedEvent.projectId).toBe(projectId);
    expect((receivedEvent.payload as any).agentId).toBe("forgeos-pm-agent");
  });

  it("should export Prometheus metrics at GET /metrics", async () => {
    const response = await serverInstance.app.inject({
      method: "GET",
      url: "/metrics",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.body).toContain("forgeos_agent_runs_total");
    expect(response.body).toContain("forgeos_tokens_total");
  });

  it("should return telemetry metrics and budget status at GET /api/projects/:id/metrics", async () => {
    // Create a project first
    const projectId = randomUUID();
    await serverInstance.app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        projectId,
        requirement: "Telemetry validation project",
        workflowType: "requirement_to_architecture",
      },
    });

    const response = await serverInstance.app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/metrics`,
    });

    expect(response.statusCode).toBe(200);
    const metrics = JSON.parse(response.body);
    expect(metrics.projectId).toBe(projectId);
    expect(metrics.budget).toBeDefined();
    expect(metrics.budget.maxTokens).toBe(500000);
    expect(metrics.budget.tokenUtilization).toBeDefined();
    expect(metrics.budget.costUtilization).toBeDefined();
    expect(Array.isArray(metrics.agentBreakdown)).toBe(true);
  });

  it("should return trace spans at GET /api/projects/:id/traces", async () => {
    const projectId = randomUUID();
    await serverInstance.app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        projectId,
        requirement: "Trace verification project",
        workflowType: "requirement_to_architecture",
      },
    });

    const response = await serverInstance.app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/traces`,
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.projectId).toBe(projectId);
    expect(Array.isArray(body.spans)).toBe(true);
  });

  it("should return agent scoreboard at GET /api/router/scoreboard", async () => {
    const response = await serverInstance.app.inject({
      method: "GET",
      url: "/api/router/scoreboard?strategy=COST_OPTIMIZED",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.strategy).toBe("COST_OPTIMIZED");
    expect(body.totalAgents).toBe(8);
    expect(Array.isArray(body.scores)).toBe(true);
    expect(body.scores[0].rank).toBe(1);
  });

  it("should recommend optimal agent at POST /api/router/recommend", async () => {
    const response = await serverInstance.app.inject({
      method: "POST",
      url: "/api/router/recommend",
      payload: {
        directive: "Design normalized database tables and Prisma migration schema",
        strategy: "BALANCED",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.selectedAgentId).toBe("forgeos-database-agent");
    expect(body.requiredCapabilities).toContain("schema_design");
    expect(body.confidenceScore).toBeGreaterThan(0.5);
  });

  it("should reject invalid recommendation payload at POST /api/router/recommend", async () => {
    const response = await serverInstance.app.inject({
      method: "POST",
      url: "/api/router/recommend",
      payload: {
        directive: "x", // too short
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body.error).toContain("Invalid agent recommendation request");
  });
});
