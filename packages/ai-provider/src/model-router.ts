import { ProviderError } from "@forgeos/shared";
import { ProviderRegistry } from "./provider-registry.js";
import { AIProvider, GenerateRequest, GenerateResponse } from "./types.js";

export interface ModelRouterOptions {
  primaryProvider: string;
  fallbackProvider?: string;
  autoFallbackOnError?: boolean;
}

export class ModelRouter {
  private registry: ProviderRegistry;
  private primaryProviderName: string;
  private fallbackProviderName?: string;
  private autoFallbackOnError: boolean;

  constructor(registry: ProviderRegistry, options: ModelRouterOptions) {
    this.registry = registry;
    this.primaryProviderName = options.primaryProvider;
    this.fallbackProviderName = options.fallbackProvider;
    this.autoFallbackOnError = options.autoFallbackOnError ?? true;
  }

  public getPrimaryProvider(): AIProvider {
    return this.registry.get(this.primaryProviderName);
  }

  public getFallbackProvider(): AIProvider | undefined {
    return this.fallbackProviderName ? this.registry.get(this.fallbackProviderName) : undefined;
  }

  public setPrimaryProvider(name: string): void {
    if (!this.registry.has(name)) {
      throw new ProviderError(name, `Cannot set primary provider: '${name}' not found in registry.`);
    }
    this.primaryProviderName = name;
  }

  public async generate(request: GenerateRequest, targetProviderName?: string): Promise<GenerateResponse> {
    const selectedName = targetProviderName ?? this.primaryProviderName;
    const provider = this.registry.get(selectedName);

    try {
      return await provider.generate(request);
    } catch (error) {
      if (this.autoFallbackOnError && this.fallbackProviderName && selectedName !== this.fallbackProviderName) {
        const fallback = this.registry.get(this.fallbackProviderName);
        const response = await fallback.generate(request);
        return {
          ...response,
          model: `${response.model} (fallback from ${selectedName})`,
        };
      }
      throw error;
    }
  }
}
