# ForgeOS Definition of Done (DoD)
*Multi-tiered quality gates required before marking any unit of work complete.*

---

## 1. Task Definition of Done (Smallest Unit of Work)
A task is done when:
- [ ] Code is surgically implemented without modifying unrelated files.
- [ ] TypeScript compiles cleanly with zero errors (`pnpm typecheck`).
- [ ] Linter passes with zero warnings (`pnpm lint`).
- [ ] Unit tests for modified code are added/updated and pass (`pnpm test`).
- [ ] Git diff has been reviewed to ensure no temporary files, debug prints, or credentials were added.

---

## 2. Feature Definition of Done
A feature is done when:
- [ ] All underlying tasks satisfy the Task DoD.
- [ ] End-to-end acceptance criteria from `ProductSpecification` are verified.
- [ ] Integration tests verify the end-to-end path (API → Queue → Worker → DB).
- [ ] Public API endpoints have Zod schema validation and documented contracts.
- [ ] Security risks (auth, injection, secret handling) are evaluated.
- [ ] Documentation in `docs/` and READMEs is updated.

---

## 3. Agent Definition of Done
A specialized agent is done when:
- [ ] Defined via formal `AgentDefinition` with typed input and output schemas in `packages/contracts`.
- [ ] Implements the 4-stage pipeline: Generate → Validate → Normalize → Persist.
- [ ] Zero direct vendor LLM SDK imports; interacts solely with `AIProvider`.
- [ ] Declares explicit tool permissions (`READ`, `WRITE`, `DANGEROUS`).
- [ ] Failure modes, timeouts, and bounded retry behavior are configured.
- [ ] Evaluated against at least two benchmark tasks with verified output fidelity.

---

## 4. Architecture Definition of Done
An architectural change is done when:
- [ ] Formal Architecture Decision Record (ADR) is written and marked `ACCEPTED`.
- [ ] Monorepo package boundaries and unidirectional dependency flow are preserved.
- [ ] Database migrations are tested for backward compatibility.
- [ ] Rollback strategy is documented and verified.

---

## 5. Release Definition of Done
A milestone release (e.g. `v0.1`, `v1.0`) is done when:
- [ ] All features assigned to the target development phase satisfy the Feature DoD.
- [ ] Full monorepo CI build (`build`, `test`, `lint`, `typecheck`) passes cleanly.
- [ ] Zero unmitigated high or critical security vulnerabilities in dependencies.
- [ ] `CHANGELOG.md` is updated and Git release tag is created.
- [ ] `docs/AI-SYSTEM/PROJECT-STATUS.md` is updated.
