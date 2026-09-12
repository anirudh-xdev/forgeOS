import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AIProvider, GenerateRequest } from "@forgeos/ai-provider";
import { AgentDefinition, AgentRun, AgentTask, Artifact, ArtifactType } from "@forgeos/contracts";
import { ToolRegistry } from "./tool-registry.js";
import { AgentContext, AgentResult } from "./types.js";

export interface AgentRunnerOptions {
  aiProvider: AIProvider;
  toolRegistry?: ToolRegistry;
}

export class AgentRunner {
  private aiProvider: AIProvider;
  private toolRegistry?: ToolRegistry;

  constructor(options: AgentRunnerOptions) {
    this.aiProvider = options.aiProvider;
    this.toolRegistry = options.toolRegistry;
  }

  public getToolRegistry(): ToolRegistry | undefined {
    return this.toolRegistry;
  }

  public async execute(
    definition: AgentDefinition,
    task: AgentTask,
    context: AgentContext,
    targetSchema?: z.ZodType<any>,
    artifactType?: ArtifactType
  ): Promise<AgentResult> {
    const runId = randomUUID();
    const startTime = Date.now();
    const maxRetries = definition.maxRetries ?? 3;

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let retriesUsed = 0;
    let lastError = "";
    let lastRawOutput = "";
    let lastValidationIssues: Array<{ path: string; message: string }> = [];

    // Construct base prompt
    let systemPrompt = definition.systemPromptTemplate;
    let userPrompt = this.buildUserPrompt(task, context);

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      retriesUsed = attempt;
      const request: GenerateRequest = {
        systemPrompt,
        userPrompt,
        schema: definition.outputSchema,
        timeoutMs: definition.timeoutMs,
      };

      try {
        // Stage 1: GENERATE
        const response = await this.aiProvider.generate(request);
        totalInputTokens += response.usage.inputTokens;
        totalOutputTokens += response.usage.outputTokens;
        lastRawOutput = response.content;

        // Stage 2: VALIDATE
        // 2a. Parse JSON
        let parsedJson: unknown;
        try {
          // Strip any unexpected markdown code fences if present
          const sanitized = response.content
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/```$/i, "")
            .trim();
          parsedJson = JSON.parse(sanitized);
        } catch (jsonErr) {
          const errMsg = jsonErr instanceof Error ? jsonErr.message : String(jsonErr);
          lastError = `JSON syntax error: ${errMsg}`;
          lastValidationIssues = [{ path: "root", message: lastError }];

          // Prepare feedback for retry
          userPrompt = `${userPrompt}\n\n[ERROR IN ATTEMPT ${attempt + 1}]: Output was not valid JSON (${errMsg}). Output strictly valid JSON.`;
          continue;
        }

        // 2b. Validate against Zod schema (if provided)
        if (targetSchema) {
          const validationResult = targetSchema.safeParse(parsedJson);
          if (!validationResult.success) {
            lastValidationIssues = validationResult.error.issues.map((i) => ({
              path: i.path.join("."),
              message: i.message,
            }));
            lastError = `Validation failed: ${lastValidationIssues.map((i) => `${i.path}: ${i.message}`).join("; ")}`;

            // Prepare feedback for retry
            userPrompt = `${userPrompt}\n\n[VALIDATION ERRORS IN ATTEMPT ${attempt + 1}]:\n${lastValidationIssues
              .map((i) => `- ${i.path}: ${i.message}`)
              .join("\n")}\nPlease fix these errors and re-generate.`;
            continue;
          }
          parsedJson = validationResult.data;
        }

        // Stage 3 & 4: NORMALIZE & PERSIST (Format Artifact & AgentRun)
        const artifact: Artifact = {
          id: randomUUID(),
          projectId: context.projectId,
          taskId: task.id,
          type: artifactType ?? "ProductSpecification",
          version: 1,
          createdBy: definition.id,
          content: parsedJson,
          status: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const runRecord: AgentRun = {
          id: runId,
          taskId: task.id,
          provider: response.provider,
          model: response.model,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          inputTokens: totalInputTokens,
          outputTokens: totalOutputTokens,
          latencyMs: Date.now() - startTime,
          status: "success",
          rawOutput: response.content,
        };

        return {
          success: true,
          taskId: task.id,
          agentId: definition.id,
          artifact,
          output: parsedJson,
          retriesUsed,
          runRecord,
        };
      } catch (genErr) {
        const errMsg = genErr instanceof Error ? genErr.message : String(genErr);
        lastError = `Generation error: ${errMsg}`;
        userPrompt = `${userPrompt}\n\n[ERROR IN ATTEMPT ${attempt + 1}]: ${errMsg}. Please retry.`;
      }
    }

    // Retries exhausted
    const failedRunRecord: AgentRun = {
      id: runId,
      taskId: task.id,
      provider: this.aiProvider.name,
      model: "unknown",
      startedAt: new Date(startTime).toISOString(),
      completedAt: new Date().toISOString(),
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      latencyMs: Date.now() - startTime,
      status: "failed",
      error: lastError,
      rawOutput: lastRawOutput,
    };

    return {
      success: false,
      taskId: task.id,
      agentId: definition.id,
      error: lastError,
      retriesUsed,
      runRecord: failedRunRecord,
      validationIssues: lastValidationIssues,
    };
  }

  private buildUserPrompt(task: AgentTask, context: AgentContext): string {
    const parts: string[] = [];

    parts.push(`## Task Input\n${typeof task.input === "string" ? task.input : JSON.stringify(task.input, null, 2)}`);

    if (context.upstreamArtifacts && context.upstreamArtifacts.length > 0) {
      parts.push(`## Upstream Approved Deliverables:`);
      for (const artifact of context.upstreamArtifacts) {
        parts.push(`### ${artifact.type} (v${artifact.version})\n${JSON.stringify(artifact.content, null, 2)}`);
      }
    }

    if (context.metadata) {
      parts.push(`## Additional Context\n${JSON.stringify(context.metadata, null, 2)}`);
    }

    parts.push(`\nEnsure your response is strictly valid JSON conforming to the expected schema.`);

    return parts.join("\n\n");
  }
}
