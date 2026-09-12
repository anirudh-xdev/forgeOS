# AI Provider Layer Rules & Abstraction Architecture
*Standards for provider decoupling, registry routing, and zero-cost local development.*

---

## 1. Absolute Isolation of AI Providers

The provider layer isolates ForgeOS from specific model vendors and cloud APIs.

```text
┌───────────────────────────────┐
│     Agent Implementation      │
│  (PM, Architect, Backend, ...)│
└──────────────┬────────────────┘
               │  ONLY knows AIProvider interface
               ▼
┌───────────────────────────────┐
│      packages/ai-provider     │
│   • AIProvider interface      │
│   • ProviderRegistry          │
│   • ModelRouter               │
└──────────────┬────────────────┘
               │  Adapters implement interface
               ▼
┌─────────────────────────────────────────────────────────────┐
│  MockProvider   │  OllamaProvider  │  OpenRouterProvider   │
│  (Deterministic │  (Local, $0 Cost,│  (Multi-model Cloud,  │
│   In-Memory)    │   Private)       │   Production)         │
└─────────────────────────────────────────────────────────────┘
```

### Prohibited Code Pattern (Strict Lint Rule)
Agents must **NEVER** import or call vendor SDKs directly:
```typescript
// STRICTLY FORBIDDEN IN AGENT CODE:
import OpenAI from "openai";
import { Anthropic } from "@anthropic-ai/sdk";
const openai = new OpenAI();
await openai.chat.completions.create(...);

// MANDATORY IN AGENT CODE:
import { AIProvider } from "@forgeos/ai-provider";
const response = await aiProvider.generate(request);
```

---

## 2. Core Interface Contracts

```typescript
export interface GenerateRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  schema?: Record<string, unknown>; // JSON Schema for structured outputs
  stopSequences?: string[];
  timeoutMs?: number;
}

export interface GenerateResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    costEstimateUSD: number;
  };
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
```

---

## 3. Mandatory Development Providers

1. **`MockProvider` ($0 Cost, In-Memory)**:
   - Must be implemented first (Phase 1).
   - Returns deterministic, pre-configured or schema-valid mock responses without network access or token consumption.
   - Used for all automated unit, integration, and CI/CD test suites.
2. **`OllamaProvider` ($0 Cost, Local AI)**:
   - Interfaces with a local Ollama instance (default `http://localhost:11434`).
   - Enables developers to run end-to-end multi-agent flows locally with zero API keys or cloud spend.
3. **Cloud Providers (`OpenRouterProvider`, `OpenAIProvider`)**:
   - Optional adapters configured via environment variables (`OPENROUTER_API_KEY`, etc.).
   - ModelRouter dynamically falls back from cloud to local or mock providers when keys are missing.
