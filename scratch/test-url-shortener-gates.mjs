import { OllamaProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner } from "../packages/agent-runtime/dist/index.js";
import { WorkflowOrchestrator, ApprovalGateEngine } from "../packages/orchestrator/dist/index.js";

async function main() {
  console.log("Testing URL Shortener with ApprovalGateEngine on deepseek-coder:latest...");
  const ollama = new OllamaProvider({
    defaultModel: "deepseek-coder:latest",
    timeoutMs: 180000,
  });

  const isHealthy = await ollama.healthCheck();
  if (!isHealthy) {
    throw new Error("Ollama is not responding at http://localhost:11434");
  }

  const runner = new AgentRunner({ aiProvider: ollama });
  const gateEngine = new ApprovalGateEngine(runner);
  const orchestrator = new WorkflowOrchestrator(runner, undefined, undefined, gateEngine);

  const requirement = "Build a robust URL shortener service with custom slugs, click analytics, and rate limiting.";

  console.log("Running requirement_to_architecture workflow with enableGates: true...");
  const result = await orchestrator.runRequirementToArchitectureWorkflow({
    requirement,
    enableGates: true,
  });

  console.log("\n================ Workflow Finished ================");
  console.log("Status:", result.status);
  console.log("Artifacts produced:", result.artifacts.length);
  for (const art of result.artifacts) {
    console.log(`- ${art.type}: status=${art.status}, createdBy=${art.createdBy}`);
  }
  console.log("\nEvents:");
  for (const ev of result.events) {
    console.log(`[${ev.type}]`, ev.payload);
  }
}

main().catch(console.error);
