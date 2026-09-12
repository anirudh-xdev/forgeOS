---
name: orchestrator-development
description: Guide for developing, maintaining, and extending the DAG-based task graph, dependency scheduler, and worker queue orchestrator.
---

# Orchestrator Development Skill

## 1. Core Architecture
The orchestrator coordinates the multi-agent factory via a Directed Acyclic Graph (`TaskGraph`).

### Orchestration Primitives
- **Project**: Root container tracking overall state, requirements, and budget.
- **Task**: An individual unit of execution assigned to a specialized agent.
- **TaskDependency**: Explicit edges in the DAG defining prerequisite tasks.
- **Scheduler**: Evaluates task readiness and enqueues eligible tasks into BullMQ.
- **AgentRunner**: Worker process that loads context, invokes `AIProvider`, validates output, and saves artifacts.
- **Event Bus**: Emits domain events (`TASK_COMPLETED`, etc.) to trigger scheduler evaluations.

---

## 2. Deterministic Scheduling Rules

1. **Never Hardcode Linear Chains**:
   ```typescript
   // FORBIDDEN:
   await runPmAgent();
   await runArchitectAgent();
   await runBackendAgent();
   await runFrontendAgent();

   // REQUIRED:
   const graph = new TaskGraph(projectId);
   graph.addNode(pmTask);
   graph.addNode(architectTask, [pmTask.id]);
   graph.addNode(databaseTask, [architectTask.id]);
   graph.addNode(apiContractTask, [architectTask.id]);
   graph.addNode(backendTask, [databaseTask.id, apiContractTask.id]);
   graph.addNode(frontendTask, [apiContractTask.id]);
   graph.addNode(qaTask, [backendTask.id, frontendTask.id]);
   await scheduler.evaluateAndDispatch(graph);
   ```

2. **Parallel Scheduling**: Tasks with resolved dependencies (e.g. `frontendTask` and `qaTask`) must be enqueued into BullMQ concurrently to maximize throughput.
3. **Cycle Prevention**: The `TaskGraph` must perform topological sorting and cycle detection upon insertion. Throw a terminal error if a cycle is detected.
