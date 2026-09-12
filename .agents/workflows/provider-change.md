# AI Provider Change Workflow
*Protocol for integrating, updating, or benchmarking AI provider adapters.*

---

## 1. Provider Isolation Mandate
New AI providers must be added strictly as pluggable adapters within `packages/ai-provider`. Under no circumstances should agent implementations be altered when adding a provider.

---

## 2. Integration Sequence
1. **Implement `AIProvider` Interface**:
   Create `packages/ai-provider/src/providers/<provider-name>.provider.ts` implementing:
   - `name: string`
   - `generate(request: GenerateRequest): Promise<GenerateResponse>`
   - `healthCheck(): Promise<boolean>`
2. **Error Translation**:
   Translate provider-specific network or API errors into standard `AIProviderError` instances with normalized error codes.
3. **Register in ProviderRegistry**:
   Add the new adapter to `packages/ai-provider/src/provider-registry.ts`.
4. **Configure Routing & Fallbacks**:
   Update `ModelRouter` to configure routing tiers, rate limits, and fallback paths.
5. **Write Unit Tests**:
   Author unit tests mocking the provider's HTTP client to verify request serialization and response parsing.
6. **Benchmark Evaluation**:
   Run the benchmark suite against a live instance to verify schema fidelity, token accounting, and latency.
