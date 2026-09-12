# Agent Handoff Protocol
*Standardized protocol for inter-agent communication, artifact exchange, and task progression.*

---

## 1. The Handoff Lifecycle

Agents in ForgeOS do not hand off work by passing conversation summaries. Handoffs occur strictly via structured database records and approved artifacts:

```text
┌─────────────────┐
│     Agent A     │
└────────┬────────┘
         │ 1. Produces deliverable
         ▼
┌─────────────────┐
│ Artifact Record │ (Status: "draft")
└────────┬────────┘
         │ 2. Automated Schema Validation + Reviewer Audit
         ▼
┌─────────────────┐
│ Approval Gate   │ (Status: "approved")
└────────┬────────┘
         │ 3. Orchestrator records Task Completion & Handoff Payload
         ▼
┌─────────────────┐
│     Agent B     │ (Loads approved artifact + task context)
└─────────────────┘
```

---

## 2. Mandatory Handoff Payload Structure

Whenever a task completes and triggers the dispatch of a downstream task, the orchestrator constructs a typed handoff payload containing:

```typescript
export interface AgentHandoffPayload {
  sourceTaskId: string;
  sourceAgentId: string;
  targetTaskId: string;
  targetAgentId: string;
  projectId: string;
  contextSummary: string;
  completedWork: string;
  approvedArtifacts: Array<{
    id: string;
    type: string;
    version: number;
  }>;
  architecturalDecisions: string[];
  knownLimitations: string[];
  remainingWork: string[];
  validationSummary: {
    typecheckPassed: boolean;
    testsPassed: number;
    testsFailed: number;
  };
}
```

---

## 3. Ingesting a Handoff (Downstream Agent Rules)
1. **Never Re-litigate Upstream Decisions**: If an upstream artifact is `approved` and recorded in `approvedArtifacts`, treat it as the binding contract for your task.
2. **Report Contract Deficiencies**: If an approved artifact has an unresolvable defect preventing downstream execution, emit a `TASK_FAILED` event with classification `CONTRACT_MISMATCH` to initiate recovery.
