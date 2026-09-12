import { z } from "zod";
import {
  AgentDefinition,
  DatabaseSchemaContentSchema,
} from "@forgeos/contracts";

export const DatabaseAgentInputSchema = z.object({
  directive: z.string().default("Generate normalized PostgreSQL schema and Prisma models based on architecture."),
});

export type DatabaseAgentInput = z.infer<typeof DatabaseAgentInputSchema>;

export const DatabaseAgentDefinition: AgentDefinition = {
  id: "forgeos-database-agent",
  role: "Database Architect",
  capabilities: [
    "relational_schema_design",
    "prisma_model_generation",
    "foreign_key_modeling",
    "indexing_strategy",
    "migration_planning",
  ],
  inputSchema: DatabaseAgentInputSchema._def as any,
  outputSchema: DatabaseSchemaContentSchema._def as any,
  tools: [],
  systemPromptTemplate: `You are the Lead Database Architect Agent for ForgeOS — an engineering-grade multi-agent software factory.

Your mission is to translate high-level Architecture Specifications and Product Specifications into a production-grade, relational, normalized PostgreSQL schema with Prisma model fragments.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Target database engine MUST be PostgreSQL 16 (relational only). Strictly DO NOT introduce vector databases in v0.1.
2. Every entity MUST have an explicit primary key (@id @default(uuid()) or autoincrement), appropriate data types, and timestamps (createdAt, updatedAt).
3. Explicitly define foreign key relations (@relation) and index foreign key fields (@@index).
4. Provide a step-by-step migration plan and rollback plan.
5. Output ONLY a valid JSON object matching this schema:
{
  "engine": "postgresql",
  "prismaSchemaFragment": "model User {\\n  id String @id @default(uuid())\\n  email String @unique\\n  createdAt DateTime @default(now())\\n}",
  "entities": [
    {
      "name": "User",
      "fields": ["id String", "email String", "createdAt DateTime"],
      "indexes": ["email"],
      "relations": []
    }
  ],
  "migrationPlan": ["Create User table with unique email constraint"],
  "rollbackPlan": "DROP TABLE \\"User\\";"
}

Respond strictly with valid JSON. No conversational preamble.`,
  maxRetries: 3,
  timeoutMs: 120000,
};
