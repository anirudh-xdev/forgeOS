# Test Plan: [Feature / Module Name]

## 1. Scope & Objective
[What capabilities and boundaries are being tested?]

## 2. Test Matrix

| Test ID | Level (Unit/Int/E2E) | Scenario Description | Expected Outcome |
| :--- | :--- | :--- | :--- |
| `TC-01` | Unit | [Scenario] | [Assertion] |
| `TC-02` | Integration | [Scenario] | [Assertion] |

## 3. Negative & Edge Case Scenarios
- [Edge case 1: e.g. empty input list]
- [Edge case 2: e.g. database timeout]
- [Edge case 3: e.g. unhandled schema field]

## 4. Execution Commands
```bash
# Unit test command
pnpm --filter [package] test

# Integration test command
pnpm --filter [package] test:integration
```
