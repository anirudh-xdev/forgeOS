# Artifact & Code Review Workflow
*Operational gate for adversarial review and artifact approval.*

---

## 1. The Review Gatekeeper
Every artifact produced by an agent must pass through this workflow before being marked `approved`.

```text
Artifact Draft Created
         ↓
Reviewer Agent / Gate Dispatched
         ↓
Evaluate Against 10 Inspection Dimensions (Requirements, Arch, Security, etc.)
         ↓
Decision Gate
   ├── PASS → Artifact marked "approved" → Unlocks downstream DAG tasks
   └── FAIL → Artifact marked "rejected" → Produces ReviewReport → Retries task
```

---

## 2. Review Execution Steps
1. **Load Pre-requisites**: Reviewer loads the generating task's input, the parent specification, and current system architecture.
2. **Execute Static Checks**: Verify TypeScript compilation, lint results, and test pass counts.
3. **Inspect Output / Diff**: Audit code for boundary leaks, missing edge cases, and hardcoded values.
4. **Emit Structured Decision**:
   - Produce a `ReviewReport` containing explicit file and line numbers for all issues.
   - If severity is `BLOCKER`, `CRITICAL`, or `HIGH`, the review automatically fails.
