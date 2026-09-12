# Monorepo Validation & Verification Commands
*Authoritative reference for build, lint, test, format, and typecheck commands.*

---

## 1. Monorepo Pipeline Commands (Turborepo + pnpm)

These commands execute across the entire monorepo workspace using Turborepo's pipeline orchestrator:

```bash
# 1. Typecheck: Strict TypeScript compilation across all apps and packages
pnpm turbo run typecheck

# 2. Lint: ESLint code style and boundary check
pnpm turbo run lint

# 3. Unit Tests: Fast Vitest test suites (using MockProvider)
pnpm turbo run test

# 4. Integration Tests: API -> Queue -> Worker -> DB flows
pnpm turbo run test:integration

# 5. Build: Full production bundle compilation
pnpm turbo run build

# 6. Format Check: Verify formatting via Prettier
pnpm format:check

# 7. Format Fix: Automatically apply formatting fixes
pnpm format:write
```

---

## 2. Package-Specific Commands

When working surgically within a single package or application, filter by package name:

```bash
# Run tests for agent-runtime only
pnpm --filter @forgeos/agent-runtime test

# Run typecheck for contracts only
pnpm --filter @forgeos/contracts typecheck

# Run API integration tests
pnpm --filter @forgeos/api test:integration

# Generate Prisma Client & Run Migrations
pnpm --filter @forgeos/database prisma generate
pnpm --filter @forgeos/database prisma migrate dev
```

---

## 3. End-to-End (E2E) UI Testing (Playwright)
```bash
# Run Playwright E2E browser tests against apps/web
pnpm --filter @forgeos/web test:e2e
```
