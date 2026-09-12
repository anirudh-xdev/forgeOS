# ForgeOS Specification Gaps & Architectural Risk Register
*Documenting ambiguities, contradictions, missing details, and architectural risks identified in `docs/forgeos-spec.md`.*

---

## 1. Executive Summary

This document captures all gaps, ambiguities, architectural risks, and missing implementation details identified during the analysis of the ForgeOS Project Specification. In accordance with the core engineering principles, **no architectural decisions have been silently altered**. Instead, this register serves as the authoritative log of open questions and recommended resolutions for future AI agents and human architects.

---

## 2. Identified Specification Ambiguities & Open Questions

### GAP-01: Monorepo Workspace Tooling
- **Spec Reference**: Section 24 (*Recommended Monorepo*)
- **Ambiguity**: The specification defines the directory structure (`apps/`, `packages/`, `workers/`) and requires TypeScript throughout, but does not explicitly declare the package manager (`npm`, `pnpm`, or `yarn`) or monorepo build orchestrator (`Turborepo`, `Nx`, or native workspaces).
- **Architectural Risk**: Unsynchronized build targets, slow dependency resolution, phantom dependencies, and build caching issues in CI and Docker builds.
- **Recommended Resolution**: Adopt **pnpm workspaces** with **Turborepo**. pnpm strictly prevents phantom dependencies (crucial for isolated agent runtime packages) and Turborepo provides fast pipeline task hashing (`build`, `test`, `lint`, `typecheck`).

### GAP-02: Backend API Framework Selection
- **Spec Reference**: Section 34 (*Suggested Initial Technology Stack*)
- **Ambiguity**: The specification lists *"Fastify or Express"*.
- **Architectural Risk**: Inconsistent architectural patterns if agents switch between Express middleware style and Fastify plugin/schema validation style.
- **Recommended Resolution**: Standardize explicitly on **Fastify**. Fastify provides first-class TypeScript support, high throughput, async/await plugin lifecycle, and native integration with JSON Schema / TypeBox / Zod for request validation.

### GAP-03: Realtime Event Distribution Architecture
- **Spec Reference**: Section 10 (*Event-Driven Architecture*), Section 11 (*Queue System*), Section 23 (*Frontend Dashboard*)
- **Ambiguity**: Domain events are published by agents running in BullMQ background workers, but the frontend dashboard receives updates via WebSockets/Socket.IO connected to the API server.
- **Architectural Risk**: If workers and API run in separate processes/containers, local in-memory event emitters cannot cross the process boundary, causing the frontend to miss agent progress events.
- **Recommended Resolution**: Implement a **Redis Pub/Sub Event Bus** (`packages/event-bus`) that BullMQ workers publish to, and the Fastify Socket.IO server subscribes to for client broadcasting.

### GAP-04: Artifact Persistence vs. Filesystem Storage
- **Spec Reference**: Section 7 (*Artifact System*), Section 17 (*Database Model*)
- **Ambiguity**: The database schema defines an `Artifact` table with `content: unknown`. For text specs (Product Spec, Architecture Spec, Review Reports), storing JSON/markdown in PostgreSQL is ideal. However, for `SourceCode` artifacts consisting of multi-file directory structures, storing megabytes of code trees inside PostgreSQL columns causes database bloat.
- **Architectural Risk**: Severe database performance degradation and synchronization lag between database records and Git worktree files.
- **Recommended Resolution**:
  - Structured metadata, specifications, ADRs, test reports, and reviews are stored directly in PostgreSQL (`content: jsonb`).
  - Source code artifacts store a Git commit SHA, tree hash, or patch diff in the database, with the actual source files residing in the project's Git repository and worktrees.

### GAP-05: Concurrent Worktree Merge & Conflict Resolution
- **Spec Reference**: Section 13 (*Git Workspace Strategy*), Section 6 (*Parallel Agents*)
- **Ambiguity**: When the Database Agent, Backend Agent, and Frontend Agent run concurrently on isolated Git worktrees (`forgeos/agent/backend`, `forgeos/agent/frontend`), the spec states *"Never allow two agents to blindly overwrite the same files"* but does not define how their patches are reconciled or merged into the primary branch.
- **Architectural Risk**: Git merge conflicts, broken contracts if backend and frontend drift, or race conditions during integration.
- **Recommended Resolution**:
  - Implement strict dependency ordering on contracts: Contracts (DB schema, API spec) must be approved and merged before Backend/Frontend coding branches fork.
  - An **Integration Worker** handles automated fast-forward or three-way rebasing, followed by the Reviewer and QA gates before merging into the target branch.

### GAP-06: Sandbox Security Boundary on Development Host
- **Spec Reference**: Section 12 (*Execution Sandbox*), Section 27 (*Cost Strategy*)
- **Ambiguity**: The spec mandates Docker containers for code execution to isolate untrusted generated code, but also targets $0 local development where Docker may run with host-mounted volumes or Docker-in-Docker.
- **Architectural Risk**: Careless volume mounts could expose the developer's host filesystem or environment variables to generated code during `npm install` or execution.
- **Recommended Resolution**:
  - Sandboxes must mount only a dedicated, ephemeral workspace directory.
  - Disable network access during untrusted test runs (`--network none`) after dependencies are pre-cached.
  - Enforce explicit Docker resource constraints (`--cpus="1.0" --memory="1g" --pids-limit=100 --read-only`).

### GAP-07: Authentication & Multi-Tenancy Scope in Phase 0-4
- **Spec Reference**: Section 17 (*Database Model* includes `User`), Section 32 (*First Project incorporates auth*)
- **Ambiguity**: It is unclear whether ForgeOS itself requires multi-user authentication in Phase 0–2, or if single-user / local developer mode is intended initially.
- **Architectural Risk**: Prematurely building complex OAuth2/JWT session infrastructure before the core agent runtime is functional violates the incremental development rule.
- **Recommended Resolution**: Default to a local administrative context (`default-user` / `SYSTEM`) for Phases 0–4, while maintaining `userId` foreign keys in Prisma schemas to enable zero-migration multi-tenancy later.

### GAP-08: Token & Cost Accounting for Local vs. Cloud Models
- **Spec Reference**: Section 18 (*Agent Run Tracking*), Section 19 (*Budget System*)
- **Ambiguity**: Local Ollama instances report token counts, but cost is $0. Cloud models have dynamic, tiered pricing per 1K input/output tokens.
- **Architectural Risk**: Inaccurate budget gating or failure to detect runaway loops when running local models if budget checks only evaluate dollar costs.
- **Recommended Resolution**: Enforce dual budget quotas: `maxTokens` AND `maxCost`. When running local providers (`OllamaProvider`, `MockProvider`), `maxTokens` serves as the primary runaway prevention guardrail.

---

## 3. Contradiction & Architectural Risk Matrix

| Risk ID | Component | Severity | Description | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | Orchestrator | HIGH | LLM non-determinism causing cyclic loops in task graph | Enforce DAG cycle detection and the Loop Detector skill before dispatching tasks |
| **RSK-02** | Execution Sandbox | CRITICAL | Malicious or buggy generated code compromising developer host | Strict Docker containerization with bounded CPU, memory, and blocked network |
| **RSK-03** | Agent Communication | HIGH | Agents reverting to conversational chit-chat instead of structured artifacts | All agent runners validate output against strict Zod/JSON schemas before saving |
| **RSK-04** | Queue / BullMQ | MEDIUM | Stale or duplicate job processing on worker restart | Idempotency keys based on `taskId` + `attemptCount` |
| **RSK-05** | Memory / Database | MEDIUM | Vector DB introduced prematurely violating v0.1 guidelines | Strictly enforce standard relational queries and defer `pgvector` until Phase 9+ |

---

## 4. Status Tracking

- **Date Opened**: September 12, 2026
- **Status**: Recorded & Mitigated via AI Engineering System Rules
- **Review Requirement**: Any future agent proposing an architecture change addressing these gaps must submit an ADR adhering to `.agents/templates/adr.md`.
