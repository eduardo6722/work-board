---
name: create-prisma-migration
description: Updates the Prisma schema, generates a migration, and inspects SQL safely. Use when changing PostgreSQL models. Never reset non-test databases without authorization.
---

# Create Prisma migration

1. Review the data requirement.
2. Update `apps/api/prisma/schema.prisma`.
3. Run `pnpm db:migrate` (uses `prisma migrate dev`).
4. Inspect the generated SQL.
5. Check for destructive changes and data backfill needs.
6. Update repositories/mappers.
7. Test against `work_board_test`.

Never run `prisma migrate reset` on a non-test database without explicit user authorization.
