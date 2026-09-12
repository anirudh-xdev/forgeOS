# Review Report: [Artifact / Pull Request Title]

## 1. Summary
- **Artifact / PR ID**: [UUID or PR #]
- **Reviewer**: [Reviewer Agent Role / Human]
- **Date**: [YYYY-MM-DD]
- **Overall Decision**: [PASS | FAIL]
- **Maximum Severity Detected**: [BLOCKER | CRITICAL | HIGH | MEDIUM | LOW | INFO | NONE]

---

## 2. Check Matrix

| Dimension | Status | Notes |
| :--- | :--- | :--- |
| **Requirements** | [PASS / FAIL] | Conformance to acceptance criteria |
| **Architecture** | [PASS / FAIL] | Decoupling, package boundaries, no direct SDK calls |
| **Security** | [PASS / FAIL] | Input validation, auth, secrets, sandboxing |
| **Performance** | [PASS / FAIL] | Latency, database queries, memory leaks |
| **Tests** | [PASS / FAIL] | Test coverage, meaningful assertions, zero skips |

---

## 3. Discovered Issues

### Issue 1: [Short Title]
- **Severity**: [BLOCKER | CRITICAL | HIGH | MEDIUM | LOW | INFO]
- **File**: `path/to/file.ts`
- **Line**: [Line Number]
- **Problem**: [Detailed description of the issue]
- **Recommendation**: [Actionable fix instructions]

---

## 4. Structured Output Payload (JSON)
```json
{
  "status": "fail",
  "severity": "high",
  "issues": [
    {
      "file": "path/to/file.ts",
      "line": 42,
      "problem": "Missing authorization check on project mutation",
      "recommendation": "Verify user ownership via projectService.verifyOwnership(userId, projectId)",
      "severity": "high"
    }
  ],
  "summary": "Implementation fails security review due to missing authorization guard."
}
```
