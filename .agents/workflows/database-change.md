# Database Change Workflow
*Safe migration and schema update workflow for PostgreSQL and Prisma.*

---

## 1. Safety Policy
Every database schema change carries risk of table locks, broken contracts, or data loss. Schema changes must be backward compatible.

---

## 2. The 7-Step Database Migration Sequence
1. **Audit Affected Queries**: Check API endpoints and workers querying the targeted model.
2. **Edit Prisma Schema**: Make minimal, non-breaking modifications in `packages/database/prisma/schema.prisma`.
3. **Generate Migration**: Run `pnpm --filter @forgeos/database prisma migrate dev --create-only --name <descriptive_name>`.
4. **Audit Generated SQL**: Inspect the SQL migration in `packages/database/prisma/migrations/` to ensure no destructive drops occur.
5. **Apply Migration Locally**: Run `pnpm --filter @forgeos/database prisma migrate dev`.
6. **Update Contracts**: If entity structures changed, update the corresponding Zod schemas in `packages/contracts`.
7. **Run Verification**: Run full workspace typecheck and integration tests to verify that all repository and service queries compile cleanly.
