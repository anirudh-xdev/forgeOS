import { ProviderError } from "@forgeos/shared";
import { AIProvider, GenerateRequest, GenerateResponse } from "../types.js";

export interface OllamaProviderOptions {
  baseUrl?: string;
  defaultModel?: string;
  timeoutMs?: number;
}

interface OllamaChatResponse {
  model: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements AIProvider {
  public readonly name = "ollama";
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly timeoutMs: number;

  constructor(options?: OllamaProviderOptions) {
    this.baseUrl = (options?.baseUrl ?? process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434").replace(/\/$/, "");
    this.defaultModel = options?.defaultModel ?? process.env["DEFAULT_LOCAL_MODEL"] ?? "llama3.2:3b";
    this.timeoutMs = options?.timeoutMs ?? 120000;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }

  public async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    const model = request.model ?? this.defaultModel;
    const timeout = request.timeoutMs ?? this.timeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: request.systemPrompt },
        { role: "user", content: request.userPrompt },
      ],
      stream: false,
      options: {
        temperature: request.temperature ?? 0.2,
      },
    };

    if (request.schema) {
      payload["format"] = "json";
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ProviderError(this.name, `HTTP ${response.status}: ${errorText}`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      const content = data.message?.content ?? "";
      const latencyMs = Date.now() - startTime;

      const inputTokens = data.prompt_eval_count ?? Math.max(1, Math.ceil((request.systemPrompt.length + request.userPrompt.length) / 4));
      const outputTokens = data.eval_count ?? Math.max(1, Math.ceil(content.length / 4));

      return {
        content,
        usage: {
          inputTokens,
          outputTokens,
          costEstimateUSD: 0.0, // Local execution is $0
        },
        latencyMs,
        model,
        provider: this.name,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof ProviderError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new ProviderError(this.name, `Failed to communicate with Ollama: ${message}`);
    }
  }
}
