# Database

Prisma ORM 7 talks to PostgreSQL through `@prisma/adapter-pg`.

- Schema: `apps/api/prisma/schema.prisma`
- Config: `apps/api/prisma.config.ts`
- Generated client: `apps/api/src/generated/prisma` (gitignored)
- `PrismaService` connects on module init and disconnects on shutdown

Domain entities do not import Prisma types. Persistence mappers live in infrastructure.

## Commands

```bash
pnpm db:generate
pnpm db:migrate
```

CI uses `prisma migrate deploy` against the test database. Never run `prisma migrate reset` against a non-test database without explicit authorization.

## Test database

Docker Compose creates `work_board` and `work_board_test`. Integration and e2e tests use `TEST_DATABASE_URL` only. `pnpm db:migrate` applies to `work_board`; Jest global setup runs `prisma migrate deploy` against `work_board_test`.
