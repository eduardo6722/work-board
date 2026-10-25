# Testing

| Area | Command | Runner |
| --- | --- | --- |
| All workspaces | `pnpm test` | Turbo |
| API unit/integration | `pnpm --filter api test` | Jest |
| API e2e | `pnpm test:e2e` | Jest + Supertest |
| Web | `pnpm --filter web test` | Vitest + RTL |
| Contracts | `pnpm --filter @repo/contracts test` | Vitest |

`pnpm test` does not need Docker. Board domain tests, board HTTP tests, board use-case tests, contract tests, and web tests never open PostgreSQL or Redis. The default API Jest config does not run `prisma migrate deploy`, and it skips `prisma-board.repository.spec.ts`.

`pnpm test:e2e` still needs Docker and the `work_board_test` database. That Jest config keeps global setup, applies pending Prisma migrations, and runs the board Prisma repository spec. Those tests may delete rows in the test database; they must never reset `work_board`.

API Jest specs rely on `@types/jest`. `apps/api/tsconfig.json` includes `jest` in `compilerOptions.types` so `describe` / `it` / `expect` resolve in the editor. Production typecheck (`tsconfig.build.json`) stays on Node types only.
