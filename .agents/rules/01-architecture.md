# Architecture Rules & System Design Guidelines
*Enforcing separation of concerns, dependency direction, and deterministic orchestration.*

---

## 1. System Topology & Flow of Control

All operations within ForgeOS proceed through a deterministic, event-driven pipeline:

```text
User Requirement
       ↓
  Orchestrator
       ↓
Task Graph (DAG)
       ↓
Specialized Agents (PM → Architect → DB / API → Backend / Frontend → QA → Reviewer)
       ↓
Contracts & Artifacts (Typed JSON / Source Diffs)
       ↓
Validation Gates (Typecheck, Lint, Unit Tests, Sandbox Executions)
       ↓
Integration & Audit
       ↓
Final Engineering Report
```

### Architectural Redlines
- **No Monolithic Prompts**: Never attempt to convert a user requirement directly into code via a single massive LLM prompt.
- **No Sequential Chaining**: Do not hardcode agent workflows as flat arrays (`await pm(); await architect(); await backend()`). Workflows must be scheduled via a Directed Acyclic Graph (`TaskGraph`) where independent tasks execute concurrently.
- **No Direct Conversational Couplings**: Agents do not talk to each other in unstructured natural language. Agents exchange structured, schema-validated **Artifacts**.

---

## 2. Monorepo Layering & Dependency Direction

The ForgeOS codebase is structured into clear dependency tiers:

```text
       ┌─────────────── apps/ (web, api) ───────────────┐
       │                                                │
       ▼                                                ▼
 workers/ (agent-worker, test-worker)         packages/orchestrator
       │                                                │
       ├───────────────────────┬────────────────────────┤
       ▼                       ▼                        ▼
packages/agent-runtime   packages/task-engine     packages/event-bus
       │                       │                        │
       ├───────────────────────┴────────────────────────┤
       ▼                                                ▼
 packages/ai-provider                         packages/database
       │                                                │
       └───────────────────────┬────────────────────────┘
                               ▼
                      packages/contracts
                               ▼
                       packages/shared
```

### Strict Import Boundaries
1. `packages/contracts` and `packages/shared` have **zero** internal dependencies on other packages.
2. `packages/ai-provider` must **never** depend on `agent-runtime` or `orchestrator`.
3. `packages/agent-runtime` consumes `ai-provider` only through the `AIProvider` interface.
4. `apps/api` handles HTTP requests, client authentication, and job queuing; it must **never** execute long-running AI agent tasks in an HTTP request cycle.
5. All long-running AI runs and code executions are handled asynchronously by `workers/` consuming Redis/BullMQ queues.

---

## 3. Core Architectural Pillars

### 3.1 Task Graph (DAG) Scheduling
- Every project requirement is decomposed into a directed graph of `AgentTask` nodes.
- Each node specifies explicit dependencies (`dependencies: string[]`).
- A node is eligible for scheduling (`status: PENDING → RUNNING`) if and only if all its dependency nodes have reached status `COMPLETED` and their required artifacts are approved.

### 3.2 Artifact-Driven Communication
- Agents produce versioned `Artifact` records (e.g., `ProductSpecification`, `ArchitectureSpecification`, `DatabaseSchema`, `APIContract`, `SourceCode`, `TestReport`, `ReviewReport`, `ADR`).
- Artifacts progress through an auditable state machine: `draft → approved | rejected`.
- Downstream tasks cannot commence execution on `draft` or `rejected` artifacts.

### 3.3 Event-Driven State Transitions
- State transitions within the orchestrator emit strongly-typed `DomainEvent` objects to the Redis-backed event bus.
- Decoupled listeners update project memory, trigger WebSocket events for the frontend dashboard, and initiate downstream task evaluations.

### 3.4 Isolated Code Execution
- Generated code must never be installed or run on the host system.
- Execution takes place inside an ephemeral Docker sandbox container with enforced memory, CPU, timeout, and network constraints.

### 3.5 Bounded Retries & Loop Detection
- Failures must be classified (`BUILD_ERROR`, `TEST_ERROR`, `TYPE_ERROR`, etc.).
- Retries must provide structured error context back to the agent.
- A maximum retry ceiling (`maxRetries`, default 3) is strictly enforced. The Loop Detector must pause execution and trigger recovery if identical errors repeat.
