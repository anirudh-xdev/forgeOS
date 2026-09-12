export interface ModelPricing {
  inputPerMillionUSD: number;
  outputPerMillionUSD: number;
}

export const DEFAULT_PRICING_TABLE: Record<string, ModelPricing> = {
  // Local / Mock models (free)
  "mock": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },
  "mock-provider": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },
  "llama3": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },
  "llama3:8b": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },
  "llama3:70b": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },
  "mistral": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },
  "qwen": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },
  "deepseek": { inputPerMillionUSD: 0, outputPerMillionUSD: 0 },

  // OpenAI Models
  "gpt-4o": { inputPerMillionUSD: 2.5, outputPerMillionUSD: 10.0 },
  "gpt-4o-mini": { inputPerMillionUSD: 0.15, outputPerMillionUSD: 0.6 },
  "gpt-4-turbo": { inputPerMillionUSD: 10.0, outputPerMillionUSD: 30.0 },
  "gpt-3.5-turbo": { inputPerMillionUSD: 0.5, outputPerMillionUSD: 1.5 },

  // Anthropic Models
  "claude-3-5-sonnet": { inputPerMillionUSD: 3.0, outputPerMillionUSD: 15.0 },
  "claude-3-haiku": { inputPerMillionUSD: 0.25, outputPerMillionUSD: 1.25 },
  "claude-3-opus": { inputPerMillionUSD: 15.0, outputPerMillionUSD: 75.0 },
};

export class CostEstimator {
  private pricingTable: Record<string, ModelPricing>;

  constructor(customPricing?: Record<string, ModelPricing>) {
    this.pricingTable = { ...DEFAULT_PRICING_TABLE, ...(customPricing ?? {}) };
  }

  public getModelPricing(modelName: string): ModelPricing {
    const normalized = modelName.toLowerCase().trim();

    // Exact match
    if (this.pricingTable[normalized]) {
      return this.pricingTable[normalized];
    }

    // Prefix match
    for (const [key, pricing] of Object.entries(this.pricingTable)) {
      if (normalized.includes(key)) {
        return pricing;
      }
    }

    // If local/ollama prefix, free
    if (normalized.startsWith("ollama") || normalized.startsWith("local")) {
      return { inputPerMillionUSD: 0, outputPerMillionUSD: 0 };
    }

    // Default fallback pricing ($1 / $3)
    return { inputPerMillionUSD: 1.0, outputPerMillionUSD: 3.0 };
  }

  public estimateCostUSD(modelName: string, inputTokens: number, outputTokens: number): number {
    const pricing = this.getModelPricing(modelName);
    const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillionUSD;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillionUSD;
    const total = inputCost + outputCost;

    return Number(total.toFixed(6));
  }
}

export const defaultCostEstimator = new CostEstimator();
