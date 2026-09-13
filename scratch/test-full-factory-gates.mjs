import { OllamaProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner } from "../packages/agent-runtime/dist/index.js";
import { WorkflowOrchestrator, ApprovalGateEngine } from "../packages/orchestrator/dist/index.js";
import { prisma, ProjectRepository, ArtifactRepository } from "../packages/database/dist/index.js";

async function main() {
  console.log("Testing Full Software Factory with ApprovalGateEngine on deepseek-coder:latest...");
  const ollama = new OllamaProvider({
    defaultModel: "deepseek-coder:latest",
    timeoutMs: 180000,
  });

  const isHealthy = await ollama.healthCheck();
  if (!isHealthy) {
    throw new Error("Ollama is not responding at http://localhost:11434");
  }

  const projectRepo = new ProjectRepository(prisma);
  const artifactRepo = new ArtifactRepository(prisma);
  const runner = new AgentRunner({ aiProvider: ollama });
  const gateEngine = new ApprovalGateEngine(runner);

  const orchestrator = new WorkflowOrchestrator(
    runner,
    { projectRepo, artifactRepo },
    undefined,
    gateEngine
  );

  const requirement = "Build a URL shortener with custom aliases, link expiration, QR code generator, and click analytics.";

  console.log("Running runFullSoftwareFactoryWorkflow with enableGates: true...");
  const result = await orchestrator.runFullSoftwareFactoryWorkflow({
    requirement,
    enableGates: true,
  });

  console.log("\n================ Workflow Finished ================");
  console.log("Status:", result.status);
  console.log("Artifacts produced:", result.artifacts.length);
  for (const art of result.artifacts) {
    console.log(`- ${art.type}: status=${art.status}, createdBy=${art.createdBy}`);
  }
  console.log("\nTasks:");
  for (const t of result.tasks) {
    console.log(`- [${t.agentId}]: status=${t.status}`);
  }
  await prisma.$disconnect();
}

main().catch(console.error);
