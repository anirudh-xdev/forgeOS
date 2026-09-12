import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AgentDefinition, AgentTask, ProductSpecificationContentSchema } from "@forgeos/contracts";
import { AgentRunner } from "../agent-runner.js";
import { AgentContext, AgentResult } from "../types.js";

export const PMAgentInputSchema = z.object({
  requirement: z.string().min(5),
  domain: z.string().optional(),
});

export type PMAgentInput = z.infer<typeof PMAgentInputSchema>;

export const PMAgentDefinition: AgentDefinition = {
  id: "forgeos-pm-agent",
  role: "Product Manager",
  capabilities: [
    "requirements_elicitation",
    "product_specification_generation",
    "actor_definition",
    "feature_prioritization",
    "acceptance_criteria_definition",
  ],
  inputSchema: PMAgentInputSchema._def as any,
  outputSchema: ProductSpecificationContentSchema._def as any,
  tools: [],
  systemPromptTemplate: `You are the Lead Product Manager Agent for ForgeOS — an engineering-grade multi-agent software factory.

Your mission is to translate high-level natural language user requirements into a comprehensive, unambiguous, structured Product Specification.

You MUST respond strictly with a valid JSON object adhering to this schema:
{
  "project": "string (name of project)",
  "goals": ["string (key measurable business/technical objectives)"],
  "actors": [
    { "role": "string", "description": "string" }
  ],
  "features": [
    {
      "id": "FEAT-001",
      "title": "string",
      "description": "string",
      "priority": "must_have" | "should_have" | "could_have"
    }
  ],
  "constraints": ["string (technical, operational, or compliance constraints)"],
  "acceptanceCriteria": [
    {
      "featureId": "FEAT-001",
      "scenario": "string",
      "given": "string",
      "when": "string",
      "then": "string"
    }
  ]
}

Guidelines:
1. Every feature must have at least one explicit acceptance criterion written in Given/When/Then format.
2. Prioritize features ruthlessly: mark core essentials as "must_have", secondary enhancements as "should_have", and extras as "could_have".
3. Identify both primary end users and administrative/system actors.
4. Output ONLY valid JSON. No conversational chatter, no preamble, no markdown formatting outside JSON.`,
  maxRetries: 3,
  timeoutMs: 120000,
};

export async function runPMAgent(
  runner: AgentRunner,
  input: string | PMAgentInput,
  context: AgentContext
): Promise<AgentResult> {
  const normalizedInput: PMAgentInput = typeof input === "string" ? { requirement: input } : input;
  const validatedInput = PMAgentInputSchema.parse(normalizedInput);

  const task: AgentTask = {
    id: randomUUID(),
    projectId: context.projectId,
    agentId: PMAgentDefinition.id,
    input: validatedInput,
    dependencies: [],
    status: "RUNNING",
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await runner.execute(
    PMAgentDefinition,
    task,
    context,
    ProductSpecificationContentSchema,
    "ProductSpecification"
  );
}
