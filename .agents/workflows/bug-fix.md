# Bug Fix Workflow
*Standard operating procedure for isolating, fixing, and regression-testing defects.*

---

## The 10-Step Bug Fix Lifecycle

```text
1. BUG REPORT
   • Ingest symptom, environment details, and reported failure.
   ↓
2. REPRODUCE
   • Write a minimal test case or script that reliably triggers the failure.
   ↓
3. EVIDENCE
   • Capture exact error message, stack trace, and relevant logs.
   ↓
4. ROOT CAUSE
   • Identify the specific code flaw, race condition, or schema discrepancy.
   ↓
5. PLAN
   • Formulate a minimal surgical fix that addresses the root cause without side effects.
   ↓
6. MINIMAL FIX
   • Apply the targeted fix to the affected file(s).
   ↓
7. REGRESSION TEST
   • Run the reproduction test and confirm it now passes.
   ↓
8. VALIDATION
   • Execute full workspace typecheck, lint, and entire test suite.
   ↓
9. REVIEW
   • Inspect git diff to verify no unintended files or regressions were introduced.
   ↓
10. REPORT
   • Generate a failure resolution report detailing symptom, root cause, fix, and tests.
```
