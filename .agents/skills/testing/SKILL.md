---
name: testing
description: Instructions for executing and authoring type checks, linter runs, unit tests, integration suites, and agent evaluations.
---

# Testing Skill

## 1. The Verification Gate
No task, PR, or implementation is considered complete without executing the full validation gate:

```text
Typecheck (tsc --noEmit)
       ↓
Linting (eslint)
       ↓
Unit Tests (vitest run)
       ↓
Integration Tests (vitest run --config vitest.integration.config.ts)
       ↓
Sandbox Code Verification
```

---

## 2. Testing Guidelines

1. **Unit Testing (`packages/*`)**:
   - Write tests for pure logic: DAG cycle detection, schema parsing, budget decrementing, retry backoff calculation.
   - Always use `MockProvider` to ensure sub-second, zero-cost execution.
2. **Integration Testing (`apps/api`, `workers/*`)**:
   - Verify that jobs enqueued in BullMQ are consumed by workers and persist correct state to PostgreSQL.
   - Use test databases with isolated transaction rollbacks.
3. **Agent Benchmark Testing**:
   - Run fixed benchmark tasks (e.g. CRUD API, auth check) to evaluate agent success rate, tokens consumed, and latency.
