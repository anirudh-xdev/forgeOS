---
name: debugging
description: Systematic, hypothesis-driven debugging workflow for isolating root causes and delivering minimal, regression-tested fixes.
---

# Debugging Skill

## 1. The 9-Step Scientific Debugging Process

Never attempt to solve a bug by immediately guessing and rewriting large chunks of code. Always follow the 9-step sequence:

```text
1. REPRODUCE
   • Create a minimal reproducible test case or script reproducing the failure.
   ↓
2. OBSERVE
   • Read the exact error message, exit code, and stack trace without assumptions.
   ↓
3. COLLECT EVIDENCE
   • Gather relevant logs, inspect DB records, and check variable values.
   ↓
4. FORM HYPOTHESES
   • Formulate explicit, falsifiable hypotheses about what caused the defect.
   ↓
5. TEST HYPOTHESIS
   • Run targeted assertions or logging to validate or disprove each hypothesis.
   ↓
6. IDENTIFY ROOT CAUSE
   • Pinpoint the exact line, logic error, race condition, or schema discrepancy.
   ↓
7. SMALLEST SAFE FIX
   • Implement the minimal, surgical change that resolves the root cause.
   ↓
8. REGRESSION TEST
   • Run the full test suite to ensure no collateral damage or regressions.
   ↓
9. VERIFY
   • Ensure the initial reproduction test now passes reliably.
```

---

## 2. Debugging Report Format
Every resolved bug fix must document:
- **Symptom**: What failed and how it manifested.
- **Root Cause**: The underlying flaw in logic, state, or contract.
- **Affected Layer**: Monorepo package or app where the defect lived.
- **Evidence**: Stack trace or log proving the defect.
- **Fix Applied**: Summary of surgical code change.
- **Regression Risk**: Assessment of adjacent components affected.
- **Verification**: Command or test case proving resolution.
