# Context Loading Strategy
*Task-specific context matrix to optimize token efficiency and prevent prompt pollution.*

---

## 1. Context Efficiency Mandate
**Do NOT load the entire repository into context.** Dumping entire monorepos or dozens of irrelevant source files wastes tokens, increases latency, and increases LLM hallucinations.

Load only the exact documentation, rules, and contracts relevant to the active task type.

---

## 2. Task-Type Context Loading Matrix

### 2.1 Frontend Tasks
*Target: `apps/web` components, pages, dashboard views.*
- **Required Context**:
  - `docs/AI-SYSTEM/AI-CONTEXT.md`
  - `.agents/rules/00-core.md`
  - `.agents/rules/01-architecture.md`
  - `.agents/rules/04-frontend.md`
  - Relevant `APIContract` schemas in `packages/contracts`
  - Relevant component source files and tests in `apps/web`

### 2.2 Backend & API Tasks
*Target: `apps/api` Fastify routes, controllers, services.*
- **Required Context**:
  - `docs/AI-SYSTEM/AI-CONTEXT.md`
  - `.agents/rules/00-core.md`
  - `.agents/rules/02-typescript.md`
  - `.agents/rules/03-backend.md`
  - Relevant `APIContract` and `DatabaseSchema` in `packages/contracts`
  - Fastify route and service files in `apps/api`
  - Backend test suites

### 2.3 Database & Schema Tasks
*Target: `packages/database` Prisma schema, migrations, relations.*
- **Required Context**:
  - `docs/AI-SYSTEM/AI-CONTEXT.md`
  - `.agents/rules/00-core.md`
  - `.agents/rules/05-database.md`
  - `packages/database/prisma/schema.prisma`
  - Recent SQL migrations
  - Relevant entity models and contracts

### 2.4 Agent Runtime & Orchestration Tasks
*Target: `packages/agent-runtime`, `packages/orchestrator`, `packages/task-engine`.*
- **Required Context**:
  - `docs/AI-SYSTEM/AI-CONTEXT.md`
  - `.agents/rules/00-core.md`
  - `.agents/rules/06-ai.md`
  - `.agents/rules/06-ai-provider.md`
  - `.agents/rules/07-orchestration.md`
  - `.agents/rules/14-budget.md`
  - `packages/contracts/src/agents.ts` and `packages/contracts/src/events.ts`
  - Orchestrator test suites

### 2.5 Security & Review Tasks
*Target: Code review, vulnerability audits, sandbox configurations.*
- **Required Context**:
  - `docs/AI-SYSTEM/AI-CONTEXT.md`
  - `.agents/rules/00-core.md`
  - `.agents/rules/08-testing.md`
  - `.agents/rules/09-security.md`
  - `.agents/rules/99-never-do.md`
  - Target git diff and affected source files
