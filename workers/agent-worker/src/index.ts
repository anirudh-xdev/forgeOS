import { OllamaProvider } from "@forgeos/ai-provider";
import { AgentRunner } from "@forgeos/agent-runtime";
import { getPrismaClient, disconnectPrisma, ArtifactRepository, ProjectRepository } from "@forgeos/database";
import { RedisEventBus } from "@forgeos/event-bus";
import { AgentWorker } from "@forgeos/orchestrator";

async function main() {
  console.log("=================================================");
  console.log("       ForgeOS BullMQ Agent Worker Service       ");
  console.log("=================================================");

  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  const ollamaBaseUrl = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
  const model = process.env["DEFAULT_LOCAL_MODEL"] ?? "deepseek-coder:latest";

  const aiProvider = new OllamaProvider({
    baseUrl: ollamaBaseUrl,
    defaultModel: model,
  });

  const runner = new AgentRunner({ aiProvider });
  const prisma = getPrismaClient();
  const artifactRepo = new ArtifactRepository(prisma);
  const projectRepo = new ProjectRepository(prisma);
  const eventBus = new RedisEventBus({ redisUrl });

  const planningWorker = new AgentWorker({
    queueName: "agent-planning",
    runner,
    repositories: { artifactRepo, projectRepo },
    eventBus,
    redisUrl,
    concurrency: 2,
  });

  const codingWorker = new AgentWorker({
    queueName: "agent-coding",
    runner,
    repositories: { artifactRepo, projectRepo },
    eventBus,
    redisUrl,
    concurrency: 4,
  });

  console.log("✔ Workers online: listening on 'agent-planning' (x2) and 'agent-coding' (x4)");

  const shutdown = async () => {
    console.log("\nShutting down workers gracefully...");
    await Promise.allSettled([
      planningWorker.close(),
      codingWorker.close(),
      eventBus.close(),
      disconnectPrisma(),
    ]);
    console.log("Workers closed.");
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Worker fatal error:", err);
  process.exit(1);
});
