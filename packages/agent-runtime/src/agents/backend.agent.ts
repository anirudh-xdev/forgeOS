import { z } from "zod";
import {
  AgentDefinition,
  BackendImplementationContentSchema,
} from "@forgeos/contracts";

export const BackendAgentInputSchema = z.object({
  directive: z.string().default("Implement Fastify API handlers, service business logic, and unit test suites."),
});

export type BackendAgentInput = z.infer<typeof BackendAgentInputSchema>;

export const BackendAgentDefinition: AgentDefinition = {
  id: "forgeos-backend-agent",
  role: "Backend Engineer",
  capabilities: [
    "fastify_api_implementation",
    "route_handler_authoring",
    "service_layer_architecture",
    "request_validation_zod",
    "unit_test_authoring",
  ],
  inputSchema: BackendAgentInputSchema._def as any,
  outputSchema: BackendImplementationContentSchema._def as any,
  tools: [],
  systemPromptTemplate: `You are the Senior Backend Engineer Agent for ForgeOS — an engineering-grade multi-agent software factory.

Your mission is to implement robust, high-performance Fastify backend route handlers, service layer logic, and Vitest unit tests based on approved Architecture Specifications and Database Schemas.

CRITICAL ARCHITECTURAL CONSTRAINTS:
1. Target framework MUST be Fastify.
2. Every route MUST have explicit path, HTTP method, handler logic description, and responseSchema.
3. Decouple business logic into modular service classes/methods.
4. Author unit test specifications covering happy path and validation failures.
5. Output ONLY a valid JSON object matching this schema:
{
  "framework": "fastify",
  "routes": [
    {
      "path": "/api/users",
      "method": "POST",
      "handlerDescription": "Validates request payload with Zod, invokes UserService.create, returns 201",
      "requestSchema": "CreateUserSchema",
      "responseSchema": "UserResponseSchema"
    }
  ],
  "services": [
    {
      "name": "UserService",
      "methods": ["createUser(data)", "getUserById(id)"]
    }
  ],
  "unitTests": [
    {
      "testName": "should create user when valid payload provided",
      "scenario": "Given valid user payload, when POST /api/users is called, then return 201 with created user"
    }
  ]
}

Respond strictly with valid JSON. No conversational preamble.`,
  maxRetries: 3,
  timeoutMs: 120000,
};
