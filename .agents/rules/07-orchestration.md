# Orchestration & Task Graph Rules
*Standards for DAG scheduling, state machines, concurrency, and event-driven coordination.*

---

## 1. Directed Acyclic Graph (DAG) Engine

The heart of ForgeOS is the `packages/orchestrator` and `packages/task-engine`. Workflows must never be hard-coded linear chains.

```text
               [ PM Agent ]
                    │  (Produces ProductSpecification)
                    ▼
            [ Architect Agent ]
                    │  (Produces ArchitectureSpecification, ADRs)
          ┌─────────┴─────────┐
          ▼                   ▼
  [ Database Agent ]   [ API Contract Gate ]
          │                   │
          └─────────┬─────────┘
                    ▼
             [ Backend Agent ]
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
  [ Frontend Agent ]     [ QA Agent ]
          │                   │
          └─────────┬─────────┘
                    ▼
            [ Reviewer Agent ]
                    │
                    ▼
               [ Complete ]
```

### Deterministic Scheduling Algorithm
1. The Task Scheduler evaluates the dependency graph after every `TASK_COMPLETED` or `TASK_FAILED` event.
2. A task transitions from `PENDING` to `RUNNING` if:
   - All prerequisite tasks in `dependencies` have status `COMPLETED`.
   - All required input artifacts from prerequisite tasks have status `approved`.
   - The project budget has not been exhausted (`usedTokens < maxTokens` and `usedCost < maxCost`).
3. Independent tasks (e.g. Frontend and QA, or Database and API Contract) **must be dispatched concurrently** across BullMQ workers.

---

## 2. Task State Machine

Task transitions must strictly follow this finite state machine:

```text
            ┌─────────┐
            │ PENDING │
            └────┬────┘
                 │ Dependencies met & budget verified
                 ▼
            ┌─────────┐
    ┌───────┤ RUNNING ├───────┐
    │       └────┬────┘       │
    │ Failure    │ Success    │ Needs human input / external lock
    ▼            ▼            ▼
┌────────┐ ┌───────────┐ ┌─────────┐
│ FAILED │ │ COMPLETED │ │ WAITING │
└───┬────┘ └───────────┘ └────┬────┘
    │                         │ Resumed
    ▼ Retries available       ▼
┌──────────┐             ┌─────────┐
│ RETRYING │────────────►│ RUNNING │
└──────────┘             └─────────┘
```

- Any terminal error without remaining retries transitions the task to `FAILED`.
- When a task fails, dependent downstream tasks immediately transition to `BLOCKED`.
- Tasks can be transitioned to `CANCELLED` if a parent project is terminated by user command.
