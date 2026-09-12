import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { getPrismaClient, ArtifactRepository, ProjectRepository } from "@forgeos/database";
import { RedisEventBus, EventBus } from "@forgeos/event-bus";
import { WorkflowOrchestrator, ApprovalGateEngine } from "@forgeos/orchestrator";
import { AgentRunner } from "@forgeos/agent-runtime";
import { AIProvider, MockProvider, OllamaProvider } from "@forgeos/ai-provider";
import { RecoveryStrategy } from "@forgeos/recovery";
import { SocketGateway } from "./socket.js";
import { projectsRoutes } from "./routes/projects.routes.js";

export interface ServerOptions {
  port?: number;
  host?: string;
  corsOrigin?: string | string[];
  eventBus?: EventBus;
  aiProvider?: AIProvider;
  orchestrator?: WorkflowOrchestrator;
  projectRepo?: ProjectRepository;
  artifactRepo?: ArtifactRepository;
}

export interface ForgeOSServerInstance {
  app: FastifyInstance;
  socketGateway: SocketGateway;
  eventBus: EventBus;
  orchestrator: WorkflowOrchestrator;
  start: () => Promise<string>;
  stop: () => Promise<void>;
}

export async function buildServer(options: ServerOptions = {}): Promise<ForgeOSServerInstance> {
  const port = options.port ?? (process.env["PORT"] ? parseInt(process.env["PORT"], 10) : 3001);
  const host = options.host ?? (process.env["HOST"] ?? "0.0.0.0");
  const corsOrigin = options.corsOrigin ?? ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "*"];

  const app = fastify({
    logger: process.env["NODE_ENV"] === "test" ? false : true,
  });

  // 1. CORS plugin
  await app.register(cors, {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  });

  // 2. Database repositories
  const prisma = getPrismaClient();
  const projectRepo = options.projectRepo ?? new ProjectRepository(prisma);
  const artifactRepo = options.artifactRepo ?? new ArtifactRepository(prisma);
  const repositories = { projectRepo, artifactRepo };

  // 3. Event Bus
  const eventBus = options.eventBus ?? new RedisEventBus({
    redisUrl: process.env["REDIS_URL"] ?? "redis://localhost:6379",
  });

  // 4. Socket.IO Gateway attached to Fastify's HTTP server
  const socketGateway = new SocketGateway(app.server, Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin]);

  // 5. Redis -> Socket.IO Bridge: Stream all domain events to connected clients
  try {
    await eventBus.subscribe("*", async (event) => {
      socketGateway.broadcastDomainEvent(event);
    });
  } catch (err) {
    app.log.warn({ err }, "Redis subscription failed or running in offline mode");
  }

  // 6. AI Provider & Orchestrator
  let aiProvider = options.aiProvider;
  if (!aiProvider) {
    if (process.env["OLLAMA_URL"]) {
      aiProvider = new OllamaProvider({
        baseUrl: process.env["OLLAMA_URL"],
        model: process.env["OLLAMA_MODEL"] ?? "deepseek-coder:latest",
      });
    } else {
      aiProvider = new MockProvider();
    }
  }

  const runner = new AgentRunner({ aiProvider });
  const gateEngine = new ApprovalGateEngine(runner);
  const recoveryStrategy = new RecoveryStrategy();

  const orchestrator = options.orchestrator ?? new WorkflowOrchestrator(
    runner,
    repositories,
    eventBus,
    gateEngine,
    recoveryStrategy
  );

  // 7. Health Check
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "forgeos-api",
      timestamp: new Date().toISOString(),
    };
  });

  // 8. Register Routes
  await app.register(projectsRoutes, {
    prefix: "/api",
    orchestrator,
    projectRepo,
    artifactRepo,
    socketGateway,
    eventBus,
  });

  const start = async () => {
    const address = await app.listen({ port, host });
    app.log.info(`ForgeOS API Server & Socket.IO listening on ${address}`);
    return address;
  };

  const stop = async () => {
    await socketGateway.close();
    await app.close();
    if (eventBus && "close" in eventBus && typeof eventBus.close === "function") {
      await eventBus.close();
    }
  };

  return {
    app,
    socketGateway,
    eventBus,
    orchestrator,
    start,
    stop,
  };
}

// Direct execution entrypoint
if (import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}`) {
  buildServer()
    .then((server) => server.start())
    .catch((err) => {
      console.error("Failed to start ForgeOS API server:", err);
      process.exit(1);
    });
}
