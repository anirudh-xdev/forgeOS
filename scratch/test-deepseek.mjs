import { OllamaProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner, runPMAgent } from "../packages/agent-runtime/dist/index.js";

async function main() {
  console.log("Testing deepseek-coder:latest...");
  const ollama = new OllamaProvider({
    defaultModel: "deepseek-coder:latest",
    timeoutMs: 60000,
  });

  const runner = new AgentRunner({ aiProvider: ollama });
  const context = {
    projectId: "11111111-1111-1111-1111-111111111111",
    taskId: "22222222-2222-2222-2222-222222222222",
  };

  const start = Date.now();
  const result = await runPMAgent(runner, "Build a simple task management app", context);
  console.log("DeepSeek Result:", {
    success: result.success,
    latencyMs: Date.now() - start,
    error: result.error,
    features: result.artifact?.content?.features?.length,
  });
  if (result.artifact) {
    console.log("Generated Content:\n", JSON.stringify(result.artifact.content, null, 2));
  }
}

main().catch(console.error);
