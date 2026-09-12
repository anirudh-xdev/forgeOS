# Backend Engineering Rules
*Standards for Fastify API, BullMQ workers, service layering, and asynchronous execution.*

---

## 1. Architectural Separation: API vs. Workers

The ForgeOS backend is bifurcated into two distinct operational roles:

```text
[ Client / UI ]
      │ (HTTP / WebSocket)
      ▼
┌────────────── apps/api ──────────────┐
│  - Fastify Server                    │
│  - Authentication & Authorization    │
│  - Project CRUD & Spec Ingestion     │
│  - Enqueues jobs into Redis/BullMQ   │
│  - Realtime Event Gateway (Socket.IO)│
│  - IMMEDIATE RESPONSES (< 200ms)     │
└──────────────────┬───────────────────┘
                   │
                   ▼ (Redis Queues)
┌───────────── workers/ ───────────────┐
│  - BullMQ Queue Workers              │
│  - AgentRunner Execution             │
│  - Sandbox Docker Runs               │
│  - Long-running Tasks (Seconds/Mins) │
│  - Publishes Domain Events to Redis  │
└──────────────────────────────────────┘
```

### Critical Rules
- **Never Run LLM Calls in Fastify Request Handlers**: An HTTP request handler must never `await` an LLM response or wait for an agent execution to complete.
- **Job Creation Pattern**: The handler validates the payload, persists the initial entity (`Project`, `AgentTask`), enqueues a job into BullMQ, and returns `202 Accepted` with the entity/job ID.

---

## 2. Fastify API Conventions

1. **Framework Choice**: Use **Fastify** exclusively for `apps/api`.
2. **Schema Validation**: Every route must declare a Fastify schema using Zod/JSON Schema for `params`, `query`, and `body`.
3. **Plugins & Lifecycle**: Use Fastify's encapsulated plugin architecture (`fastify.register`) for routes and services.
4. **Error Handling**: Implement a centralized `setErrorHandler` that formats operational errors without leaking internal stack traces in production.
5. **Graceful Shutdown**: Always register `SIGTERM` and `SIGINT` handlers to flush logs, close database connections, and shut down BullMQ queues cleanly.

---

## 3. Worker Architecture & BullMQ Queues

1. **Dedicated Queues**:
   - `agent-planning`: PM and Architect agent tasks.
   - `agent-coding`: Backend, Frontend, and Database agent code generation.
   - `agent-review`: Reviewer and Security adversarial audits.
   - `agent-testing`: QA test planning and execution.
   - `agent-integration`: Git worktree merging and patch validation.
2. **Job Idempotency**: All jobs must supply a deterministic `jobId` (e.g., `task-${taskId}-attempt-${attemptCount}`) to prevent duplicate execution upon worker restart.
3. **Concurrency Control**: Concurrency per worker must be explicitly configured according to hardware capabilities and budget rules (`maxConcurrentAgents`).
4. **Sandboxed Worker Processes**: Use isolated child processes or Docker containers for executing test runners or compiling code.
