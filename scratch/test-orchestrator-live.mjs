import { OllamaProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner } from "../packages/agent-runtime/dist/index.js";
import { WorkflowOrchestrator } from "../packages/orchestrator/dist/index.js";

async function main() {
  console.log("Initializing OllamaProvider for Multi-Agent Workflow...");
  const ollama = new OllamaProvider({
    defaultModel: "deepseek-coder:latest",
    timeoutMs: 180000,
  });

  const isHealthy = await ollama.healthCheck();
  console.log("Ollama health:", isHealthy);
  if (!isHealthy) {
    throw new Error("Ollama is not running at http://localhost:11434");
  }

  const runner = new AgentRunner({ aiProvider: ollama });
  const orchestrator = new WorkflowOrchestrator(runner);

  const requirement = "Build a lightweight project management API and dashboard with tasks, members, and basic analytics.";

  console.log("\n=======================================================");
  console.log("STARTING MULTI-AGENT WORKFLOW: PM → ARCHITECT");
  console.log("Requirement:", requirement);
  console.log("=======================================================\n");

  const startTime = Date.now();
  const result = await orchestrator.runRequirementToArchitectureWorkflow({
    requirement,
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nWorkflow Execution Completed in ${durationSec}s!`);
  console.log("Status:", result.status);
  console.log("Total Artifacts Produced:", result.artifacts.length);
  console.log("Total Domain Events Emitted:", result.events.length);

  for (const artifact of result.artifacts) {
    console.log(`\n--- Deliverable: ${artifact.type} (by ${artifact.createdBy}) ---`);
    console.log(JSON.stringify(artifact.content, null, 2));
  }

  console.log("\nDomain Event Timeline:");
  for (const event of result.events) {
    console.log(`  [${event.timestamp.slice(11, 19)}] ${event.type}`);
  }
}

main().catch(console.error);
