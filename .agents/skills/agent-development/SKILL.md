---
name: agent-development
description: Guide for creating, configuring, and testing ForgeOS specialized agents with strict contracts, schemas, and failure modes.
---

# Agent Development Skill

This skill teaches agents how to construct and integrate specialized agents into the ForgeOS runtime.

## 1. Core Rule: No Prompt-Only Agents

Agents in ForgeOS are **not** arbitrary system prompts. Every agent is an engineered software component adhering to the `AgentDefinition` contract:

```typescript
export interface AgentDefinition {
  id: string;                      // e.g., "forgeos-pm-agent"
  role: string;                    // e.g., "Product Manager"
  capabilities: string[];          // e.g., ["requirements_analysis", "spec_generation"]
  inputSchema: Record<string, any>; // JSON Schema / Zod schema for input validation
  outputSchema: Record<string, any>;// JSON Schema / Zod schema for output validation
  tools: string[];                 // Allowed tool identifiers
  systemPromptTemplate: string;    // Base prompt template with variable slots
  maxRetries?: number;             // Default retry ceiling (default 3)
  timeoutMs?: number;              // Execution timeout in ms
}
```

---

## 2. Required Elements for Every Agent

When creating a new agent in `packages/agent-runtime/src/agents/`, you must define all 11 dimensions:

1. **Role**: Formal engineering title (e.g. `Architect Agent`).
2. **Purpose**: Specific responsibility within the software development factory.
3. **Capabilities**: Concrete list of capabilities exposed to the orchestrator.
4. **Input Schema**: Strict Zod schema validating input tasks.
5. **Output Schema**: Strict Zod schema validating the generated artifact.
6. **Allowed Tools**: Minimal set of required tools (principle of least privilege).
7. **Constraints**: Non-functional limits (token budgets, disallowed actions).
8. **Failure Modes**: Documented failure conditions (e.g., ambiguous requirement, invalid syntax).
9. **Validation Pipeline**: Automated schema parser and sanitizer.
10. **Retry Behavior**: Strategy for handling validation errors and passing feedback.
11. **Expected Artifacts**: The target `ArtifactType` produced upon success.

---

## 3. Agent Implementation Template

```typescript
import { z } from "zod";
import { AgentDefinition } from "@forgeos/contracts";

export const ExampleInputSchema = z.object({
  projectId: z.string().uuid(),
  context: z.string().min(10),
});

export const ExampleOutputSchema = z.object({
  deliverableName: z.string(),
  items: z.array(z.string()),
});

export const ExampleAgent: AgentDefinition = {
  id: "forgeos-example-agent",
  role: "Example Specialist",
  capabilities: ["example_processing"],
  inputSchema: ExampleInputSchema,
  outputSchema: ExampleOutputSchema,
  tools: ["read_artifact", "query_schema"],
  systemPromptTemplate: `You are the Example Specialist in ForgeOS...`,
  maxRetries: 3,
  timeoutMs: 60000,
};
```
