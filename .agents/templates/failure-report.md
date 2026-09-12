# Failure & Recovery Report

## 1. Task Metadata
- **Task ID**: [UUID]
- **Project ID**: [UUID]
- **Agent ID**: [e.g. forgeos-backend-agent]
- **Failure Classification**: [BUILD_ERROR | TEST_ERROR | TYPE_ERROR | DEPENDENCY_ERROR | DATABASE_ERROR | AUTH_ERROR | ENVIRONMENT_ERROR]
- **Timestamp**: [YYYY-MM-DDTHH:mm:ssZ]

---

## 2. Error Diagnostics
- **Raw Error Message**:
  ```text
  [Paste raw error output or compiler diagnostic]
  ```
- **Failing Stack Trace / Logs**:
  ```text
  [Paste relevant stack trace or container logs]
  ```

---

## 3. Analysis & Recovery
- **Root Cause**: [Detailed analysis of why the execution failed]
- **Total Attempts**: [Number of retries executed]
- **Loop Detected**: [Yes / No]
- **Recovery Strategy Applied**:
  - [ ] Retry with structured compiler error feedback
  - [ ] Revert to previous artifact version
  - [ ] Delegate to alternative agent specialist
  - [ ] Circuit break / pause for human intervention

---

## 4. Final Result
- **Outcome**: [RESOLVED | ESCALATED | CANCELLED]
- **Resolution Summary**: [Explanation of how the problem was resolved or why it was escalated]
