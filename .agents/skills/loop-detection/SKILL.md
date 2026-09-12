---
name: loop-detection
description: Circuit breaker and loop detection skill for identifying repeated failures and pivoting recovery strategies.
---

# Loop Detection & Circuit Breaker Skill

## 1. Recognizing Failure Loops
Agents frequently get trapped in infinite retry cycles when encountering subtle syntax or configuration errors.

The Loop Detector tracks:
- **Error Signatures**: Normalized hash of error message and stack trace.
- **Tool Invocations**: Identical sequences of tool calls with identical arguments.
- **Artifact Hashes**: SHA-256 hash of generated files showing zero meaningful variation.
- **Test Failure Hashes**: Same failing test assertion repeating across attempts.
- **Attempt Count**: Consecutive retries without forward progress.

---

## 2. Loop Detection Response Workflow
When a duplicate failure signature is detected twice consecutively:

```text
REPEAT FAILURE DETECTED
         ↓
       PAUSE
  • Halt current task execution immediately.
  • Do not invoke the same agent with the same prompt again.
         ↓
      CLASSIFY
  • Categorize defect: SYNTAX | ENVIRONMENT | CONTRACT_MISMATCH | ARCHITECTURE_FLAW.
         ↓
CREATE RECOVERY TASK
  • Create a specialized recovery task with full diagnostic history.
         ↓
   CHANGE STRATEGY
  • Delegate to a different specialist (e.g. Architect or Reviewer).
  • Or prompt for alternative implementation approach.
```
