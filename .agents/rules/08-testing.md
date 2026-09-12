# Testing & Verification Rules
*Enforcing automated test coverage, deterministic fixtures, and agent evaluation.*

---

## 1. Multi-Tier Testing Strategy

ForgeOS requires three rigorous testing tiers:

```text
┌──────────────────────────────────────────────┐
│ Tier 1: Unit Tests (Vitest)                 │
│ • Pure functions, DAG algorithms, schemas   │
│ • Execution time: < 100ms per suite         │
│ • Uses MockProvider (100% deterministic)    │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ Tier 2: Integration Tests (Vitest + Redis)   │
│ • API → BullMQ Queue → Worker → DB flow     │
│ • Real Prisma & Redis transactions           │
│ • Verified using isolated test databases     │
└──────────────────────┬───────────────────────┘
                       ▼
┌──────────────────────────────────────────────┐
│ Tier 3: Agent Evaluation Tests (Benchmarks)  │
│ • Fixed benchmark tasks against real models  │
│ • Evaluates code correctness & syntax        │
│ • Tracks token cost, latency, success rate   │
└──────────────────────────────────────────────┘
```

---

## 2. Hard Verification Redlines

1. **No "Done" Without Verification**: An agent must never mark a task or pull request as complete without executing the verification suite (`pnpm test`, `pnpm typecheck`, `pnpm lint`).
2. **Never Mock the System Under Test**: Mocks are reserved for external I/O (LLM API calls, Docker daemons during fast unit tests). Do not mock orchestrator DAG logic or Prisma models in integration tests.
3. **Deterministic CI/CD**: Unit and integration test suites running in CI/CD must never make real cloud LLM calls. Always inject `MockProvider`.
4. **Regression Tests for Bug Fixes**: Every bug fix must be accompanied by a failing test that reproduces the bug, followed by the minimal code fix that makes the test pass.
