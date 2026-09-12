import { describe, it, expect } from "vitest";
import { ProviderRegistry } from "../src/provider-registry.js";
import { ModelRouter } from "../src/model-router.js";
import { MockProvider } from "../src/providers/mock.provider.js";
import { AIProvider, GenerateRequest, GenerateResponse } from "../src/types.js";
import { ProviderError } from "@forgeos/shared";

class FailingProvider implements AIProvider {
  public readonly name = "failing";
  public async generate(_request: GenerateRequest): Promise<GenerateResponse> {
    throw new ProviderError(this.name, "Connection timed out");
  }
  public async healthCheck(): Promise<boolean> {
    return false;
  }
}

describe("ModelRouter", () => {
  it("should route to primary provider successfully", async () => {
    const registry = new ProviderRegistry();
    const mock = new MockProvider(["Primary response"]);
    registry.register(mock);

    const router = new ModelRouter(registry, {
      primaryProvider: "mock",
    });

    const response = await router.generate({
      systemPrompt: "",
      userPrompt: "test",
    });

    expect(response.content).toBe("Primary response");
    expect(response.provider).toBe("mock");
  });

  it("should gracefully fallback to fallback provider when primary fails", async () => {
    const registry = new ProviderRegistry();
    const failing = new FailingProvider();
    const fallbackMock = new MockProvider(["Fallback response"]);

    registry.register(failing);
    registry.register(fallbackMock);

    const router = new ModelRouter(registry, {
      primaryProvider: "failing",
      fallbackProvider: "mock",
      autoFallbackOnError: true,
    });

    const response = await router.generate({
      systemPrompt: "",
      userPrompt: "test",
    });

    expect(response.content).toBe("Fallback response");
    expect(response.model).toContain("fallback from failing");
  });

  it("should throw error if primary fails and no fallback is configured", async () => {
    const registry = new ProviderRegistry();
    registry.register(new FailingProvider());

    const router = new ModelRouter(registry, {
      primaryProvider: "failing",
      autoFallbackOnError: false,
    });

    await expect(
      router.generate({
        systemPrompt: "",
        userPrompt: "test",
      })
    ).rejects.toThrow(ProviderError);
  });
});
