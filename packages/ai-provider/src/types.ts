import { z } from "zod";

export const TokenUsageSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  costEstimateUSD: z.number().nonnegative(),
});

export type TokenUsage = z.infer<typeof TokenUsageSchema>;

export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  schema?: Record<string, unknown>; // JSON Schema definition for structured outputs
  stopSequences?: string[];
  timeoutMs?: number;
}

export interface GenerateResponse {
  content: string;
  usage: TokenUsage;
  latencyMs: number;
  model: string;
  provider: string;
}

export interface AIProvider {
  readonly name: string;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream?(request: GenerateRequest): AsyncIterable<string>;
  healthCheck(): Promise<boolean>;
}

export interface ProviderConfig {
  provider: "mock" | "ollama" | "openrouter" | "openai" | "anthropic";
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  timeoutMs?: number;
}
