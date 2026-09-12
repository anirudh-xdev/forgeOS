# Core Engineering Principles
*Highest-level operational rules and design philosophy for ForgeOS.*

---

## 1. The 20 Non-Negotiable Principles

Every AI agent and engineer operating in this repository must strictly adhere to these 20 core principles:

1. **Read before modifying**: Always inspect existing files, dependencies, and architecture before proposing or making changes.
2. **Understand architecture before implementation**: Never begin writing code until the structural and conceptual requirements are clear.
3. **Never blindly overwrite existing code**: Understand the rationale of existing code. Propose precise modifications rather than wholesale file replacements.
4. **Prefer small, reversible changes**: Deliver focused, incremental commits and modular packages that can be easily reviewed and rolled back.
5. **Preserve existing architectural boundaries**: Respect the monorepo layers: `apps/`, `packages/`, and `workers/`. Never introduce circular or improper package dependencies.
6. **Use typed contracts**: All data flowing across agent, process, database, and network boundaries must be strictly typed in TypeScript and validated at runtime using Zod schemas.
7. **Treat LLM output as untrusted**: Output from any language model is untrusted user input. It must always be validated, sanitized, and normalized before execution or persistence.
8. **Never execute generated code directly on the API server**: All generated code execution, dependency installation, and automated test runs must occur inside isolated Docker containers.
9. **Keep AI providers interchangeable**: All agents must interact solely with the `AIProvider` interface. Never import vendor SDKs (`openai`, `anthropic`, `ollama`) directly into agent implementations.
10. **Keep orchestration deterministic**: The orchestration engine, task graph scheduling, and dependency resolution must be deterministic. Do not rely on probabilistic LLM responses to sequence tasks.
11. **Make failures observable**: All errors, stack traces, agent timeouts, and execution anomalies must be recorded, categorized, and exposed via structured logging and events.
12. **Keep retries bounded**: Retries must have strict ceilings, exponential or context-driven backoffs, and loop detection. Never retry the exact same failing action indefinitely.
13. **Never hide errors**: Catching exceptions without logging, re-throwing, or recording them in task run metrics is strictly forbidden.
14. **Never weaken validation just to make tests pass**: If a test or schema validation fails, fix the underlying defect, not the validation gate.
15. **Never modify unrelated code**: Keep diffs tightly scoped to the active task. Refactoring unrelated modules during feature or bugfix tasks is forbidden.
16. **Verify every implementation**: An implementation is not done when the code is written; it is done when typecheck, lint, and relevant unit/integration tests pass.
17. **Prefer composition over unnecessary abstraction**: Write clear, idiomatic TypeScript. Avoid complex inheritance hierarchies or speculative architectural layers.
18. **Do not introduce dependencies without justification**: Evaluate existing utilities before adding new third-party packages. Ensure every dependency is vetted for security and maintenance.
19. **Record important architectural decisions**: Capture non-trivial technical trade-offs, technology choices, and design pivots as Architecture Decision Records (ADRs).
20. **Follow the project's phased roadmap**: Build sequentially according to the documented development phases (Phase 0 to Phase 12). Do not skip ahead to later phases.

---

## 2. Core Positioning

> *"ForgeOS is an event-driven multi-agent engineering runtime that coordinates specialized AI agents through contracts, isolated execution, evaluation gates, failure recovery, and observable workflows."*

ForgeOS is **not** an LLM wrapper and **not** a chatbot. It is a multi-agent software engineering factory.
