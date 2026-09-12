---
name: database-design
description: Database design skill for crafting relational models, Prisma schemas, indexes, and safe migrations in PostgreSQL.
---

# Database Design Skill

## 1. Schema-First Design Principles
1. **Normalization & Integrity**: Maintain 3rd Normal Form for transactional tables. Define explicit foreign keys, composite unique constraints, and non-null guarantees.
2. **Explicit Indexes**: Index every foreign key and frequently queried column (e.g. `[projectId, status]`, `[userId]`).
3. **No Vector Databases in v0.1**: Strictly adhere to standard PostgreSQL relational tables. Defer `pgvector` until Phase 9+.

---

## 2. Migration Protocol
1. **Deterministic Schema Editing**: Edit `packages/database/prisma/schema.prisma`.
2. **Generate Migration**: Run `pnpm --filter @forgeos/database prisma migrate dev --name <migration_name>`.
3. **Inspect SQL Output**: Audit the generated SQL migration file to verify:
   - No destructive data drops without data migration scripts.
   - Zero blocking table locks on large tables.
4. **Prisma Client Regeneration**: Ensure `@prisma/client` types are regenerated and exported cleanly.
