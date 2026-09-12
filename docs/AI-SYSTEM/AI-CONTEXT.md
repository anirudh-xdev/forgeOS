# ForgeOS Master AI Context Document
*The primary mental model and operational briefing for AI agents working in this repository.*

---

## 1. What ForgeOS Is & Is NOT

- **What ForgeOS IS**:
  An event-driven multi-agent engineering runtime that coordinates specialized AI agents through contracts, isolated execution, evaluation gates, failure recovery, and observable workflows.
- **What ForgeOS IS NOT**:
  It is **not** a chatbot, **not** an LLM wrapper, and **not** a prompt-chaining script. It is an engineering platform that builds software through typed contracts and isolated execution.

---

## 2. Core Architectural Models

### 2.1 Agent Model
Agents are specialized software engineering roles (PM, Architect, Database, Backend, Frontend, QA, Security, Reviewer). Each agent has an explicit `AgentDefinition` declaring input/output Zod schemas, allowed tools, and failure modes. Agents never converse in unstructured free text; they communicate by producing versioned **Artifacts**.

### 2.2 Task & Orchestration Model
Projects are decomposed into a Directed Acyclic Graph (`TaskGraph`) of `AgentTask` nodes. Scheduling is deterministic: an agent task is only dispatched when all prerequisite tasks are completed and their required artifacts approved. Independent tasks execute concurrently across BullMQ worker queues.

### 2.3 Artifact Model
Artifacts (`ProductSpecification`, `ArchitectureSpecification`, `DatabaseSchema`, `APIContract`, `SourceCode`, `TestReport`, `SecurityReport`, `ADR`) are immutable, versioned deliverables stored in PostgreSQL with audit trails (`draft → approved | rejected`).

### 2.4 Event Model
Decoupled domain events (`PROJECT_CREATED`, `TASK_COMPLETED`, `TASK_FAILED`, `ARTIFACT_UPDATED`, etc.) are published to a Redis pub/sub bus, triggering scheduler re-evaluations and driving the live Next.js UI via WebSockets.

### 2.5 Provider Model
Agents depend exclusively on the `AIProvider` interface (`packages/ai-provider`). Direct imports of vendor SDKs (`openai`, `anthropic`, `ollama`) in agent code are strictly forbidden. Development targets $0 spend using `MockProvider` and `OllamaProvider`.

### 2.6 Execution & Security Model
**Never execute generated code directly on the host.** Generated code is installed, built, and tested inside ephemeral Docker sandboxes with bounded CPU, memory, execution timeouts, and disabled network access during tests.

### 2.7 Testing Model
Every change must pass static typecheck (`tsc --noEmit`), linter (`eslint`), and automated tests (`vitest`). An implementation is never complete without passing validation.

---

## 3. Technology Stack Summary
- **Monorepo**: Turborepo + pnpm workspaces
- **Frontend**: Next.js (App Router), Tailwind CSS, Framer Motion, Socket.IO Client
- **API**: Node.js, Fastify, Socket.IO Server
- **Database & Cache**: PostgreSQL 16 (Prisma ORM), Redis 7 (BullMQ & Pub/Sub)
- **Execution Sandbox**: Docker
- **Testing**: Vitest, Playwright

---

## 4. Current Development Phase & Limitations
- **Current Phase**: **Phase 0 — Repository Setup**
- **Current Limitations**: No application source code exists yet. The repository has just completed AI infrastructure bootstrapping.
- **Next Immediate Step**: Initialize Git, create pnpm monorepo configuration, configure TypeScript/linting, add Docker Compose for PostgreSQL + Redis.
