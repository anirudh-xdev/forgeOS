# ForgeOS — Multi-Agent Software Factory
*Primary Architectural Specification & System Blueprint*

---

## 1. Project Overview

ForgeOS is an AI-powered software engineering orchestration platform.

The goal is not to build another chatbot or a single coding agent. ForgeOS creates a temporary engineering team of specialized AI agents that collaborate to turn a product requirement into a validated software project.

### Example
> *"Build a SaaS dashboard for managing freelance clients, projects, invoices and analytics."*

### Core Capabilities
ForgeOS should be able to:
1. Understand the requirement.
2. Convert it into a structured product specification.
3. Design the system architecture.
4. Define database and API contracts.
5. Delegate frontend/backend work to specialized agents.
6. Run agents independently or in parallel where safe.
7. Execute generated code.
8. Run tests.
9. Review implementation.
10. Detect failures and request fixes.
11. Maintain project memory and engineering decisions.
12. Produce a final engineering report.

---

## 2. Core Design Philosophy

ForgeOS should be built as an engineering platform, not as a collection of prompts.

### Key Concepts
- **Agents**: Specialized worker units with typed boundaries, explicit tool permissions, and deterministic contracts.
- **Tasks**: Units of executable work scheduled in a directed acyclic graph.
- **Contracts**: Typed JSON schemas defining inputs, outputs, and interface boundaries.
- **Events**: Asynchronous domain messages coordinating progress without tight coupling.
- **Workspaces**: Isolated execution environments and Git worktrees.
- **Artifacts**: Structured, immutable, versioned data deliverables produced by agents.
- **Evaluations**: Objective quality gates and adversarial reviews.
- **Retries**: Bounded, classified recovery loops with error context.
- **Memory**: Persistent project-level context (decisions, artifacts, failures, tests).
- **Observability**: Granular tracking of tokens, latency, cost, and timelines.
- **Provider Abstraction**: Decoupling the orchestration engine from specific LLM vendors.

### Architectural Direction
The system must be deterministic around orchestration even though the LLM output is probabilistic.

#### Anti-Pattern (Bad Architecture):
```text
User → Huge Prompt → One LLM → Code
```

#### Target Architecture:
```text
User
  ↓
Orchestrator
  ↓
Task Graph (DAG)
  ↓
Specialized Agents
  ↓
Contracts / Artifacts
  ↓
Validation Gates
  ↓
Integration
  ↓
Final Report
```

---

## 3. AI Provider Strategy

ForgeOS must support three AI modes from the beginning:

### Mode A — Local AI
Use Ollama or another local OpenAI-compatible runtime.
```text
ForgeOS → LLM Provider Interface → Local Provider → Ollama → Local Model
```
- **Advantages**: $0 inference cost, private, works offline, great for development, no API key required.
- **Disadvantages**: Limited by local hardware, smaller models may produce weaker code, long-running multi-agent workflows can be slow.
- **Recommended Development Approach**: Start with a small coding-capable model that runs comfortably on the developer's machine.

### Mode B — External Provider
ForgeOS should support cloud providers through a common adapter.
```text
ForgeOS → LLM Provider Interface → [ OpenAI Adapter | Anthropic Adapter | OpenRouter Adapter | Other ]
```
The rest of ForgeOS must not know which provider is being used.

### Mode C — Free / Limited Provider
ForgeOS should support providers that expose free or limited model access without hard-coding one "free provider":
```text
Provider Registry → Available Providers → Health / Availability → Selected Provider
```
Providers are configured with: free tier, rate limit, token limit, cost per token, maximum context, supported tools, and structured output support.

---

## 4. Provider Abstraction

### Package Structure
```text
src/
  ai/
    providers/
      ollama.provider.ts
      openai.provider.ts
      openrouter.provider.ts
    ai-provider.interface.ts
    provider-registry.ts
    model-router.ts
```

### Core Interface
```typescript
export interface AIProvider {
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  stream?(request: GenerateRequest): AsyncIterable<GenerateChunk>;
}
```

### Decoupling Rule
The agent should only know:
```typescript
const response = await ai.generate(request);
```
It must **NEVER** know or call:
```typescript
await openai.chat.completions.create(...)
```

---

## 5. Initial Agent Organization

### 5.1 Product Manager (PM) Agent
- **Responsibilities**: Understand user requirement, identify goals, identify actors, define features, identify constraints, create acceptance criteria.
- **Output**:
  ```json
  {
    "project": "...",
    "goals": [],
    "features": [],
    "constraints": [],
    "acceptanceCriteria": []
  }
  ```

### 5.2 Architect Agent
- **Responsibilities**: Select architecture, define services, define database, define API boundaries, define communication patterns, identify scalability concerns, produce Architecture Decision Records (ADRs).
- **Output**:
  ```json
  {
    "architecture": {},
    "database": {},
    "apis": [],
    "decisions": []
  }
  ```

### 5.3 Database Agent
- **Responsibilities**: Design schema, define relationships, define indexes, define constraints, generate migrations, validate schema against requirements.

### 5.4 Backend Agent
- **Responsibilities**: Implement APIs, implement business logic, implement validation, implement authentication/authorization, write backend tests.

### 5.5 Frontend Agent
- **Responsibilities**: Build UI, build components, consume API contracts, implement state management, implement loading/error states, write frontend tests.

### 5.6 QA Agent
- **Responsibilities**: Generate test plan, run tests, analyze failures, validate acceptance criteria, detect regressions.

### 5.7 Security Agent
- **Responsibilities**: Review authentication, review authorization, check secrets, check API validation, check dangerous patterns, identify common vulnerabilities.

### 5.8 Reviewer Agent
- **Responsibilities**: Review artifacts, challenge implementation, check requirements, check architecture, reject poor output. The reviewer should **NOT** blindly approve another agent's work.

---

## 6. Agent Contracts

Every agent must have a strict contract:
```typescript
type AgentDefinition = {
  id: string;
  role: string;
  capabilities: string[];
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  tools: string[];
};

type AgentTask = {
  id: string;
  projectId: string;
  agentId: string;
  input: unknown;
  expectedOutput: unknown;
  dependencies: string[];
  status: TaskStatus;
};

type TaskStatus =
  | "PENDING"
  | "RUNNING"
  | "WAITING"
  | "COMPLETED"
  | "FAILED"
  | "RETRYING"
  | "BLOCKED"
  | "CANCELLED";
```

---

## 7. Artifact System

Agents communicate through artifacts rather than arbitrary conversational text.

### Artifact Types
- `ProductSpecification`
- `ArchitectureSpecification`
- `DatabaseSchema`
- `APIContract`
- `UISpecification`
- `SourceCode`
- `TestReport`
- `SecurityReport`
- `ReviewReport`
- `ADR`

### Schema Definition
```typescript
type Artifact = {
  id: string;
  projectId: string;
  type: ArtifactType;
  version: number;
  createdBy: string;
  content: unknown;
  status: "draft" | "approved" | "rejected";
};
```

---

## 8. Orchestrator

The orchestrator is the heart of ForgeOS.

### Responsibilities
- Create project
- Build task graph
- Schedule tasks
- Resolve dependencies
- Start agents
- Handle events
- Detect failures
- Trigger retries
- Trigger reviews
- Merge results
- Finish project

### High-Level Flow
```text
Create Project
  ↓
Generate Product Spec
  ↓
Architecture
  ↓
Database + API Contracts
  ↓
Frontend + Backend
  ↓
Integration
  ↓
Tests
  ↓
Security Review
  ↓
Code Review
  ↓
Fix Loop
  ↓
Final Validation
  ↓
Complete
```

---

## 9. Task Graph

Do not hard-code the workflow as a giant linear chain. Represent it as a Directed Acyclic Graph (DAG):
```text
         PM
          │
          ▼
      Architect
          │
    ┌─────┴─────┐
    ▼           ▼
 Database   API Contract
    │           │
    └─────┬─────┘
          ▼
       Backend
          │
    ┌─────┴─────┐
    ▼           ▼
 Frontend       QA
    │           │
    └─────┬─────┘
          ▼
        Review
          │
          ▼
         Done
```
Each node has dependencies. When all dependencies are complete, the orchestrator schedules the task.

---

## 10. Event-Driven Architecture

Use domain events instead of tightly coupling agents:
- `PROJECT_CREATED`
- `SPEC_CREATED`, `SPEC_APPROVED`
- `ARCHITECTURE_CREATED`, `ARCHITECTURE_APPROVED`
- `CONTRACT_CREATED`
- `TASK_CREATED`, `TASK_STARTED`, `TASK_COMPLETED`, `TASK_FAILED`
- `REVIEW_REQUESTED`, `REVIEW_FAILED`
- `RETRY_REQUESTED`
- `BUILD_FAILED`, `TEST_FAILED`
- `ARTIFACT_UPDATED`
- `PROJECT_COMPLETED`, `PROJECT_FAILED`

### Domain Event Contract
```typescript
type DomainEvent = {
  id: string;
  type: string;
  projectId: string;
  taskId?: string;
  timestamp: string;
  payload: unknown;
};
```

---

## 11. Queue System

Use Redis + BullMQ initially.

### Queues
- `agent-planning`
- `agent-coding`
- `agent-review`
- `agent-testing`
- `agent-security`
- `agent-integration`

### Worker Architecture
```text
Redis
  ├── Planning Worker
  ├── Coding Worker
  ├── Review Worker
  ├── QA Worker
  └── Security Worker
```
The API server must never execute long-running AI jobs synchronously in HTTP request cycles.

---

## 12. Execution Sandbox

Coding agents eventually need to execute code.
**Never execute arbitrary generated code directly on the host / main server.** Use isolated Docker containers.

```text
Agent → Workspace → Docker Sandbox → Install Dependencies → Build → Test → Return Result
```

Sandbox constraints: CPU limit, memory limit, execution timeout, filesystem restrictions, network restrictions, process limits. Start locally with Docker before attempting a custom production-grade sandbox.

---

## 13. Git Workspace Strategy

Each coding agent works in isolation using Git worktrees where practical:
```text
main
  ├── forgeos/agent/frontend
  ├── forgeos/agent/backend
  └── forgeos/agent/tests
```
Flow: `Create Task → Create Worktree → Agent modifies files → Run validation → Create patch/commit → Reviewer → Integration`. Never allow two agents to blindly overwrite the same files.

---

## 14. Agent Review Loop

Every important implementation must go through evaluation:
```text
Coder → Implementation → Tests → Reviewer
  ├── PASS → Integration
  └── FAIL → Feedback → Coder
```
Structured review output:
```json
{
  "status": "fail",
  "severity": "high",
  "issues": [
    {
      "file": "src/api/projects.ts",
      "line": 42,
      "problem": "Missing authorization check",
      "recommendation": "Verify project ownership"
    }
  ]
}
```

---

## 15. Agent Debate

For important architectural decisions, allow multiple agents to propose solutions:
```text
Requirement → [ Architect A | Architect B ] → Decision Agent → Final Architecture (ADR)
```
Evaluation criteria: correctness, complexity, cost, scalability, maintainability, security.

---

## 16. Project Memory

ForgeOS maintains project-level memory: requirements, decisions, artifacts, agent outputs, failures, fixes, reviews, architecture, and test results.
- Use PostgreSQL initially.
- Use `pgvector` only when semantic retrieval becomes useful.
- Do NOT introduce a separate vector database in v0.1.

---

## 17. Database Model

### Initial Entities
`User`, `Project`, `Agent`, `AgentTask`, `Artifact`, `TaskDependency`, `Event`, `AgentRun`, `Review`, `ProjectDecision`, `Provider`, `Model`.

### Key Relationships
```text
User ──< Projects ──< Tasks, Artifacts, Events, Reviews, Decisions
Task ──< Agent, Dependencies, Runs, Artifacts
```

---

## 18. Agent Run Tracking

Track every LLM execution for performance and cost visibility:
```typescript
type AgentRun = {
  id: string;
  taskId: string;
  provider: string;
  model: string;
  startedAt: Date;
  completedAt?: Date;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs?: number;
  status: "running" | "success" | "failed";
  error?: string;
};
```

---

## 19. Budget System

Every project can enforce:
- Maximum tokens
- Maximum cost
- Maximum runtime (minutes)
- Maximum retries
- Maximum concurrent agents

The orchestrator must verify remaining budget before dispatching any agent run.

---

## 20. Failure Recovery (Gradual Progression)

- **Level 1**: Simple retry (`Failure → Retry`).
- **Level 2**: Retry with error context (`Failure → Extract error → Send error to agent → Retry`).
- **Level 3**: Failure classification (`BUILD_ERROR`, `TEST_ERROR`, `TYPE_ERROR`, `DEPENDENCY_ERROR`, `DATABASE_ERROR`, `AUTH_ERROR`, `ENVIRONMENT_ERROR`).
- **Level 4**: Recovery strategy selection (`Failure Classifier → Recovery Strategy → Correct Agent`).

---

## 21. Loop Detection

Agents can get stuck repeating the same action.
Track: previous errors, tool calls, artifact hashes, test results, attempt count.
When loop is detected: `PAUSE → CREATE RECOVERY TASK → ASK DIFFERENT AGENT`.

---

## 22. Observability

Every project should expose an execution timeline and track: task duration, agent latency, token usage, failures, retries, provider, model, cost, queue time.

---

## 23. Frontend Dashboard

Main screens:
1. **Project Dashboard**: Status, progress, active agents, token usage, cost, failures.
2. **Agent Timeline**: Agent, task, started, duration, status, retries.
3. **Artifact Explorer**: Spec, architecture, API contracts, DB schema, test & security reports.
4. **Agent Detail**: Prompt, tools, actions, output, tokens, duration, errors, reviews.
5. **Architecture View**: Interactive diagram (Frontend → API → Backend → Database).
6. **Failure Explorer**: Failure reason, root cause, agent, attempt, recovery, result.

---

## 24. Recommended Monorepo Layout

```text
forgeos/
├── apps/
│   ├── web/           # Next.js frontend dashboard
│   └── api/           # Node.js / Fastify orchestration API
├── packages/
│   ├── agent-runtime/ # Core runner and agent definitions
│   ├── orchestrator/  # Task graph and scheduler
│   ├── ai-provider/   # Provider abstraction (Ollama, Mock, etc.)
│   ├── task-engine/   # DAG evaluation and dependency resolution
│   ├── event-bus/     # Domain event publishing and subscriptions
│   ├── contracts/     # Zod schemas, TypeScript types, artifacts
│   ├── database/      # Prisma client and migrations
│   ├── logger/        # Structured logging and OpenTelemetry
│   └── shared/        # Shared utilities and constants
├── workers/
│   ├── agent-worker/  # BullMQ agent execution workers
│   ├── test-worker/   # Test execution workers
│   └── integration-worker/ # Sandbox build and merge workers
├── docker/            # Sandbox and service compose files
├── docs/              # Documentation and specifications
└── package.json
```

---

## 25. Development Phases

- **Phase 0 — Repository Setup**: Git, monorepo, TypeScript, linting, formatting, env vars, Docker Compose (PostgreSQL + Redis).
- **Phase 1 — AI Provider Layer**: `AIProvider`, `ProviderRegistry`, `ModelRouter`, `OllamaProvider`, `MockProvider`.
- **Phase 2 — Agent Runtime**: `AgentDefinition`, `AgentContext`, `AgentTask`, `AgentRunner`, `ToolRegistry`, `AgentResult`.
- **Phase 3 — First Agent**: Implement PM Agent producing structured `ProductSpecification`.
- **Phase 4 — Orchestrator**: Task graph, dependency scheduler, PM → Architect workflow.
- **Phase 5 — Artifact System**: `Artifact`, `ArtifactVersion`, `ArtifactStatus`, `ArtifactApproval`.
- **Phase 6 — Parallel Agents**: Database, Backend, Frontend parallel dispatch using BullMQ.
- **Phase 7 — Code Execution**: Docker sandbox, `WorkspaceManager`, `SandboxRunner`.
- **Phase 8 — Review System**: Reviewer, QA, Security agents and approval gates.
- **Phase 9 — Recovery**: `RetryPolicy`, `FailureClassifier`, `RecoveryStrategy`, `LoopDetector`.
- **Phase 10 — Realtime UI**: WebSockets / Socket.IO live dashboard updates.
- **Phase 11 — Observability**: `AgentRun`, token usage, latency, cost metrics.
- **Phase 12 — Dynamic Agent Selection**: Agent performance scoring and dynamic routing.

---

## 26. Testing Strategy

- **Unit Tests**: Orchestrator, task scheduler, dependency resolver, provider adapters, budget manager, retry manager.
- **Integration Tests**: API → Queue → Worker → Agent → Database flow.
- **Agent Evaluation Tests**: Fixed benchmark tasks (Task 001: CRUD API, Task 002: Auth, Task 003: Fix failing TS project, Task 004: Auth vulnerability). Track success rate, cost, latency, failure rate.

---

## 27. Cost Strategy

Development targets **$0 cost** using Local Ollama + MockProvider + Local Postgres + Local Redis + Local Docker. Cloud providers are strictly optional.

---

## 28. Security Principles

- Never trust LLM output (`LLM output = untrusted input`).
- Validate structured outputs via schemas.
- Sanitize tool arguments.
- Isolate code execution in Docker containers.
- Enforce filesystem, network, and execution time limits.
- Never expose server secrets or database credentials to agents.
- Log tool calls and require explicit approval for dangerous operations.

---

## 29. MVP Definition

User requirement → PM Agent → Architect Agent → Backend Agent → Frontend Agent → QA Agent → Reviewer Agent → Final Report.
Supported by: Local AI, provider abstraction, PostgreSQL, Redis, BullMQ, Docker, Next.js dashboard, agent timeline, structured artifacts, retries.

---

## 30. Version Roadmap

- `v0.1`: Provider abstraction, agent runtime, PM agent.
- `v0.2`: Orchestrator, task graph, artifacts.
- `v0.3`: Architect, Database, Backend, Frontend agents.
- `v0.4`: Redis, BullMQ, parallel execution.
- `v0.5`: Docker sandbox, code execution.
- `v0.6`: QA, Reviewer, Security agents.
- `v0.7`: Failure recovery, retries, loop detection.
- `v0.8`: Realtime dashboard, agent timeline.
- `v0.9`: Project memory, decision records, evaluation system.
- `v1.0`: Dynamic agent selection, agent scoring, production orchestration.

---

## 31. Definition of Done (v1.0)

ForgeOS v1.0 is complete when it can accept a natural-language requirement, generate specifications and architecture, create and schedule tasks, run independent agents in parallel, use local or cloud AI interchangeably, generate code, execute code in sandboxes, run tests, review implementations, detect failures, retry boundedly, detect loops, preserve artifacts/decisions, show realtime timeline, track tokens/cost, and produce a final engineering report.

---

## 32. First Project to Build With ForgeOS

Test project: *"Build a simple project management API and dashboard"* (Authentication, projects, tasks, members, task status, dashboard, basic analytics).

---

## 33. Engineering Rules

1. Never let agents communicate only through free-form text.
2. Prefer typed contracts.
3. Store important decisions.
4. Keep orchestration deterministic.
5. Treat LLM output as untrusted.
6. Never execute generated code on the API server.
7. Keep providers interchangeable.
8. Build with a MockProvider.
9. Start with PostgreSQL before adding more databases.
10. Start with Redis/BullMQ before adding Kafka.
11. Start with Docker before building a custom sandbox.
12. Start with five agents before creating twenty.
13. Measure every agent run.
14. Make retries bounded.
15. Make every important action observable.
16. Build the system incrementally.

---

## 34. Suggested Initial Technology Stack

- **Frontend**: Next.js, TypeScript, Tailwind CSS, Framer Motion
- **API**: Node.js, TypeScript, Fastify (or Express)
- **Database**: PostgreSQL, Prisma
- **Queue**: Redis, BullMQ
- **Realtime**: Socket.IO
- **AI**: Ollama, OpenRouter / Cloud adapters
- **Execution**: Docker
- **Testing**: Vitest, Playwright
- **Validation**: Zod
- **Observability**: OpenTelemetry, Prometheus, Grafana
- **Version Control**: Git, Git worktrees

---

## 35. The Core Positioning

> *"An event-driven multi-agent engineering runtime that coordinates specialized AI agents through contracts, isolated execution, evaluation gates, failure recovery, and observable workflows."*

---

## 36. Immediate Next Steps (Phase 0 / Phase 1)

1. Create monorepo
2. Add PostgreSQL + Redis (Docker Compose)
3. Create `AIProvider` interface
4. Implement `MockProvider`
5. Implement `OllamaProvider`
6. Create `AgentDefinition`
7. Create `AgentRunner`
8. Build PM Agent
9. Persist `AgentTask` + `Artifact`
10. Build basic Orchestrator
11. Connect PM → Architect
12. Add realtime execution logs
