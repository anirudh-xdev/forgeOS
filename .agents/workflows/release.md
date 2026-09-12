# Release & Versioning Workflow
*Protocol for milestone releases, version tags, and package distribution.*

---

## 1. Release Hygiene
A release represents a stable, audited checkpoint in the development roadmap (e.g., `v0.1`, `v0.2`).

---

## 2. Release Steps
1. **Verify Definition of Done**: Confirm all requirements for the target development phase in `docs/AI-SYSTEM/DEVELOPMENT-PHASES.md` are 100% complete.
2. **Execute Full Monorepo Validation**:
   - `pnpm turbo run build`
   - `pnpm turbo run test`
   - `pnpm turbo run lint`
   - `pnpm turbo run typecheck`
3. **Audit Security & Vulnerabilities**: Run `pnpm audit` and ensure zero unmitigated high or critical CVEs.
4. **Update Changelog & Version**:
   - Update `CHANGELOG.md` with features, fixes, and architectural decisions included in the milestone.
   - Bump version in root and package `package.json` files adhering to Semantic Versioning (`MAJOR.MINOR.PATCH`).
5. **Tag Commit**:
   ```bash
   git tag -a vX.Y.Z -m "Release vX.Y.Z: Summary of milestone deliverables"
   ```
6. **Update Status**: Record milestone completion in `docs/AI-SYSTEM/PROJECT-STATUS.md`.
