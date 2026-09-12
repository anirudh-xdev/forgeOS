import { ProviderError } from "@forgeos/shared";
import { AIProvider } from "./types.js";

export class ProviderRegistry {
  private providers = new Map<string, AIProvider>();

  public register(provider: AIProvider): void {
    if (this.providers.has(provider.name)) {
      throw new ProviderError(provider.name, `Provider '${provider.name}' is already registered.`);
    }
    this.providers.set(provider.name, provider);
  }

  public get(name: string): AIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new ProviderError(name, `Provider '${name}' not found in registry. Available: [${this.list().join(", ")}]`);
    }
    return provider;
  }

  public has(name: string): boolean {
    return this.providers.has(name);
  }

  public list(): string[] {
    return Array.from(this.providers.keys());
  }

  public unregister(name: string): boolean {
    return this.providers.delete(name);
  }

  public async checkHealth(name: string): Promise<boolean> {
    const provider = this.get(name);
    try {
      return await provider.healthCheck();
    } catch {
      return false;
    }
  }

  public async checkAllHealth(): Promise<Record<string, boolean>> {
    const result: Record<string, boolean> = {};
    for (const [name, provider] of this.providers.entries()) {
      try {
        result[name] = await provider.healthCheck();
      } catch {
        result[name] = false;
      }
    }
    return result;
  }
}
