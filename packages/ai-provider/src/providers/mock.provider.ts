import { AIProvider, GenerateRequest, GenerateResponse } from "../types.js";

export class MockProvider implements AIProvider {
  public readonly name = "mock";
  private queuedResponses: Array<string | Partial<GenerateResponse>> = [];
  private customHandler?: (request: GenerateRequest) => Promise<string> | string;
  public recordedCalls: GenerateRequest[] = [];

  constructor(defaultResponses?: Array<string | Partial<GenerateResponse>>) {
    if (defaultResponses) {
      this.queuedResponses.push(...defaultResponses);
    }
  }

  public queueResponse(response: string | Partial<GenerateResponse>): void {
    this.queuedResponses.push(response);
  }

  public setHandler(handler: (request: GenerateRequest) => Promise<string> | string): void {
    this.customHandler = handler;
  }

  public clear(): void {
    this.queuedResponses = [];
    this.customHandler = undefined;
    this.recordedCalls = [];
  }

  public async healthCheck(): Promise<boolean> {
    return true;
  }

  public async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const startTime = Date.now();
    this.recordedCalls.push(request);

    let content = "";
    let usageOverride: GenerateResponse["usage"] | undefined;

    if (this.queuedResponses.length > 0) {
      const next = this.queuedResponses.shift()!;
      if (typeof next === "string") {
        content = next;
      } else {
        content = next.content ?? "";
        usageOverride = next.usage;
      }
    } else if (this.customHandler) {
      content = await this.customHandler(request);
    } else {
      // Default deterministic response
      content = JSON.stringify({
        project: "ForgeOS Mock Deliverable",
        status: "success",
        mockGeneratedAt: new Date().toISOString(),
      });
    }

    const inputTokens = Math.max(1, Math.ceil((request.systemPrompt.length + request.userPrompt.length) / 4));
    const outputTokens = Math.max(1, Math.ceil(content.length / 4));

    return {
      content,
      usage: usageOverride ?? {
        inputTokens,
        outputTokens,
        costEstimateUSD: 0.0,
      },
      latencyMs: Date.now() - startTime,
      model: request.model ?? "mock-model-v1",
      provider: this.name,
    };
  }

  public async *stream(request: GenerateRequest): AsyncIterable<string> {
    const response = await this.generate(request);
    const chunks = response.content.split(" ");
    for (const chunk of chunks) {
      yield chunk + " ";
    }
  }
}
