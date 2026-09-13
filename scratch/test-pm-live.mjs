import { OllamaProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner, runPMAgent } from "../packages/agent-runtime/dist/index.js";

async function main() {
  console.log("Initializing OllamaProvider with qwen2.5-coder:14b...");
  const ollama = new OllamaProvider({
    defaultModel: "qwen2.5-coder:14b",
    timeoutMs: 180000,
  });

  const isHealthy = await ollama.healthCheck();
  console.log("Ollama health:", isHealthy);
  if (!isHealthy) {
    throw new Error("Ollama is not responding at http://localhost:11434");
  }

  const runner = new AgentRunner({ aiProvider: ollama });

  const context = {
    projectId: "55555555-5555-5555-5555-555555555555",
    taskId: "66666666-6666-6666-6666-666666666666",
  };

  const requirement = "Build a simple project management API and dashboard with tasks, members, and basic analytics.";

  console.log("Executing PM Agent on requirement:", requirement);
  const result = await runPMAgent(runner, requirement, context);

  console.log("Execution Result Status:", result.success ? "SUCCESS" : "FAILED");
  console.log("Retries Used:", result.retriesUsed);
  console.log("Run Metrics:", {
    inputTokens: result.runRecord.inputTokens,
    outputTokens: result.runRecord.outputTokens,
    latencyMs: result.runRecord.latencyMs,
  });

  if (result.success && result.artifact) {
    console.log("Generated Product Specification:");
    console.log(JSON.stringify(result.artifact.content, null, 2));
  } else {
    console.error("Error:", result.error);
    console.error("Validation issues:", result.validationIssues);
  }
}

main().catch(console.error);
