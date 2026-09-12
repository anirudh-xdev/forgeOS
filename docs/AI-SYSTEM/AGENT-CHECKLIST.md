# AI Agent Operational Checklist
*Mandatory pre-flight and post-execution verification checklist for every agent.*

---

## The 14-Point Agent Verification Checklist

Before reporting any task, feature, or review complete, every agent must self-audit against this checklist:

```text
[ ] 1. Did I understand the requirement?
       Verified explicit goals, edge cases, and acceptance criteria.

[ ] 2. Did I inspect existing code?
       Checked directory layout, current implementations, and dependencies before writing code.

[ ] 3. Did I inspect architecture?
       Confirmed changes respect monorepo boundaries and unidirectional dependencies.

[ ] 4. Did I check existing abstractions?
       Reused established helpers, types, and schemas rather than inventing parallel ones.

[ ] 5. Did I avoid duplicate functionality?
       Ensured this capability does not already exist in another package.

[ ] 6. Did I preserve user changes?
       Checked git status; never overwrote or reverted unstaged user modifications.

[ ] 7. Did I follow project rules?
       Complied with all rules in .agents/rules/ (especially 00-core, 06-ai, 06-ai-provider).

[ ] 8. Did I validate inputs/outputs?
       Enforced Zod schemas on all boundaries; treated LLM outputs as untrusted input.

[ ] 9. Did I handle errors?
       Wrapped external calls in try/catch, typed error conditions, and avoided error swallowing.

[ ] 10. Did I add tests?
        Wrote unit/integration test cases covering happy path and failure edge cases.

[ ] 11. Did I run tests?
        Executed `pnpm test`, `pnpm typecheck`, and `pnpm lint`; verified 100% pass.

[ ] 12. Did I review my diff?
        Inspected `git diff` to ensure zero unrelated lines, debug logs, or phantom changes.

[ ] 13. Did I update documentation?
        Updated relevant specifications, schemas, ADRs, or API references.

[ ] 14. Did I verify the final result?
        Confirmed that the original requirement is completely satisfied and verified.
```
