# New Feature Development Workflow
*Mandatory 14-step operating procedure for adding features to ForgeOS.*

---

## The 14-Step Feature Sequence

Agents must never jump directly from receiving a feature request to writing code. Every new feature must execute these 14 discrete steps:

1. **Understand Requirement**: Deconstruct the feature request into explicit functional requirements and acceptance criteria.
2. **Inspect Repository**: Audit current file layout, packages, and existing implementations to identify reusable components.
3. **Identify Affected Modules**: Map out which apps (`apps/web`, `apps/api`) or packages (`packages/contracts`, `packages/agent-runtime`, etc.) will be touched.
4. **Check Architecture**: Verify that the proposed changes strictly adhere to monorepo layering, unidirectional dependencies, and decoupled providers.
5. **Create Implementation Plan**: Draft a detailed plan following `.agents/templates/implementation-plan.md` and obtain approval.
6. **Identify Contracts**: Define or update Zod schemas and TypeScript interfaces in `packages/contracts`.
7. **Identify Tests**: Determine unit, integration, and E2E test cases required to validate acceptance criteria.
8. **Implement**: Create or modify code surgically within the targeted package.
9. **Run Validation**: Execute `pnpm typecheck` and `pnpm lint` to ensure type soundness and style compliance.
10. **Review Diff**: Inspect `git diff` to verify that no unrelated files, debug logs, or phantom changes were introduced.
11. **Run Tests**: Execute `pnpm test` across all affected packages.
12. **Perform Security Review**: Audit new endpoints, queries, or tool permissions for authorization and injection risks.
13. **Update Documentation**: Update relevant docs in `docs/` and API contract schemas.
14. **Produce Completion Report**: Provide a concise summary of changes, verified test outputs, and next steps.
