import { OllamaProvider } from "../packages/ai-provider/dist/index.js";
import { AgentRunner } from "../packages/agent-runtime/dist/index.js";
import { PMAgentDefinition } from "../packages/agent-runtime/dist/index.js";

const provider = new OllamaProvider({
  baseUrl: "http://localhost:11434",
  model: "qwen2.5-coder:14b",
  timeoutMs: 60000,
});

console.log("Testing Ollama healthCheck...");
const healthy = await provider.healthCheck();
console.log("Ollama health:", healthy);

const runner = new AgentRunner({ aiProvider: provider });
console.log("Running PM Agent with Ollama...");
const result = await runner.runAgent(PMAgentDefinition, {
  requirement: "Build a modern URL shortener service with analytics and custom aliases.",
});

console.log("PM Agent Result success:", result.success);
if (result.success) {
  console.log("Artifact Type:", result.artifact?.type);
  console.log("Artifact Project:", result.artifact?.content?.project);
  console.log("Artifact Features count:", result.artifact?.content?.features?.length);
  console.log("Artifact Sample:", JSON.stringify(result.artifact?.content, null, 2).slice(0, 500));
} else {
  console.error("Run Error:", result.error);
}
