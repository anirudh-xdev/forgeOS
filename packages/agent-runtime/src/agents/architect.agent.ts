import { randomUUID } from "node:crypto";
import { z } from "zod";
import { AgentDefinition, AgentTask, ArchitectureSpecificationContentSchema } from "@forgeos/contracts";
import { AgentRunner } from "../agent-runner.js";
import { AgentContext, AgentResult } from "../types.js";

export const ArchitectAgentDefinition: AgentDefinition = {
  id: "forgeos-architect-agent",
  role: "Architect",
  capabilities: [
    "system_topology_design",
    "database_selection",
    "api_boundary_definition",
    "communication_patterns",
    "adr_generation",
  ],
  inputSchema: z.object({ specificationId: z.string().optional() })._def as any,
  outputSchema: ArchitectureSpecificationContentSchema._def as any,
  tools: [],
  systemPromptTemplate: `You are the Lead Software Architect Agent for ForgeOS — an engineering-grade multi-agent software factory.

Your mission is to translate approved Product Specifications into a high-performance, modular system architecture and formal Architecture Decision Records (ADRs).

You MUST respond strictly with a valid JSON object adhering to this schema:
{
  "architecture": {
    "pattern": "string (e.g. 'Modular Monolith / Event-Driven Services')",
    "components": [
      {
        "name": "string (e.g. 'API Gateway', 'Task Engine')",
        "role": "string (description of role in system)",
        "technologies": ["string (e.g. 'Fastify', 'TypeScript')"]
      }
    ]
  },
  "database": {
    "engine": "string (e.g. 'PostgreSQL 16 with Prisma ORM')",
    "entities": ["string (list of core data entities)"],
    "strategy": "string (relational integrity, indexing, migration rules)"
  },
  "apis": [
    {
      "endpoint": "string (e.g. '/api/projects')",
      "method": "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
      "description": "string (what the endpoint does)",
      "responseSchemaName": "string (name of contract schema)"
    }
  ],
  "decisions": [
    {
      "title": "string (e.g. 'ADR-001: PostgreSQL for Relational Data')",
      "decision": "string (chosen path)",
      "alternatives": ["string (options evaluated and rejected)"],
      "tradeoffs": "string (positive outcomes and liabilities)"
    }
  ]
}

Guidelines:
1. Adhere strictly to the ForgeOS technology stack: Fastify/Node.js, PostgreSQL (Prisma), Redis (BullMQ), Next.js, and TypeScript.
2. Every core business feature in the product specification must be covered by clear API endpoints.
3. Keep the architecture modular and cleanly decoupled.
4. Output ONLY valid JSON. No conversational chatter, no preamble, no markdown formatting outside JSON.`,
  maxRetries: 3,
  timeoutMs: 120000,
};

export async function runArchitectAgent(
  runner: AgentRunner,
  context: AgentContext
): Promise<AgentResult> {
  const pmArtifact = context.upstreamArtifacts?.find(
    (a) => a.type === "ProductSpecification"
  );

  const task: AgentTask = {
    id: randomUUID(),
    projectId: context.projectId,
    agentId: ArchitectAgentDefinition.id,
    input: {
      directive: "Generate Architecture Specification and ADRs based on the approved Product Specification.",
      specification: pmArtifact?.content,
    },
    dependencies: pmArtifact?.taskId ? [pmArtifact.taskId] : [],
    status: "RUNNING",
    retryCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return await runner.execute(
    ArchitectAgentDefinition,
    task,
    context,
    ArchitectureSpecificationContentSchema,
    "ArchitectureSpecification"
  );
}
