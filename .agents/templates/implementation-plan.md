# Implementation Plan: [Feature / Task Title]

## 1. Goal
[Clear, concise description of what this change achieves and why it is needed.]

## 2. Requirements
- [Requirement 1]
- [Requirement 2]
- [Requirement 3]

## 3. Affected Files & Packages
- `packages/[package-name]/src/[file].ts` [NEW | MODIFY | DELETE]
- `apps/[app-name]/src/[file].tsx` [NEW | MODIFY | DELETE]
- `docs/[doc-name].md` [NEW | MODIFY]

## 4. Architecture Impact
- **Dependency Direction**: [Confirm no boundary or circular violations]
- **Provider Decoupling**: [Confirm zero direct LLM SDK calls in agent code]
- **Contract Updates**: [List any Zod schema changes in `packages/contracts`]

## 5. Implementation Steps
1. Step 1: [Define schema contracts]
2. Step 2: [Implement core package logic]
3. Step 3: [Wire up service / worker]
4. Step 4: [Add unit and integration tests]

## 6. Testing Strategy
- **Unit Tests**: [List test cases to author in Vitest]
- **Integration Tests**: [List integration scenarios (API -> Queue -> Worker -> DB)]
- **Validation Commands**:
  - `pnpm --filter [package] test`
  - `pnpm --filter [package] typecheck`

## 7. Risks & Mitigations
- **Risk**: [Identified architectural or operational risk]
  - **Mitigation**: [Concrete mitigation strategy]

## 8. Rollback Strategy
[Step-by-step instructions to safely revert this change if unexpected issues occur in production.]

## 9. Definition of Done
- [ ] Code implemented strictly adhering to architecture rules
- [ ] TypeScript strict compilation passes (`tsc --noEmit`)
- [ ] Linter passes with zero warnings
- [ ] Automated tests pass with 100% success rate
- [ ] Documentation updated
- [ ] Git diff inspected and verified clean
