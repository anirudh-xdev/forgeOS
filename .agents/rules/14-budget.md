# Budget & Resource Quota Rules
*Enforcing limits on tokens, costs, runtimes, concurrency, and retries.*

---

## 1. Project Budget Quotas (Specification Section 19)

Every project and autonomous workflow in ForgeOS must be bounded by explicit budget limits:

```typescript
export interface BudgetPolicy {
  maxTokens: number;             // e.g., 250,000 tokens
  maxCostUSD: number;            // e.g., $5.00
  maxRuntimeMinutes: number;     // e.g., 30 minutes
  maxRetriesPerTask: number;     // e.g., 3 attempts
  maxConcurrentAgents: number;   // e.g., 4 workers
}
```

---

## 2. Pre-Execution Budget Verification

1. **Check Before Dispatch**: Before scheduling or popping any task from BullMQ, the orchestrator must verify remaining project budget.
2. **Quota Exceeded Action**:
   - If `usedTokens >= maxTokens` or `usedCost >= maxCost`, transition active tasks to `BLOCKED`.
   - Emit `BUDGET_EXCEEDED` domain event.
   - Pause execution and request human authorization or quota increase in the dashboard.
3. **Local AI Budgeting**: When running local Ollama models (where dollar cost is $0), `maxTokens` and `maxRuntimeMinutes` remain strictly enforced to prevent infinite loops or CPU exhaustion.
