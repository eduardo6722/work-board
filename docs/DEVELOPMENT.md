# Development

## Prerequisites

- Node.js 22.12+ (24.x recommended)
- pnpm 12.x
- Docker and Docker Compose
- Python 3.11+ and [uv](https://docs.astral.sh/uv/) for the Specify CLI (host tool, not a workspace dependency)

## First run

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3001
- Health: http://localhost:3001/health
- Swagger: http://localhost:3001/docs

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start web and API |
| `pnpm build` | Production builds |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript |
| `pnpm test` | Unit/integration tests |
| `pnpm test:e2e` | API e2e tests |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:migrate` | Create/apply migrations |
| `specify version` | Confirm the host Specify CLI (Spec Kit 1.2.3) |

## Environment

Each app owns its environment configuration. Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.example` to `apps/web/.env`. Never commit `.env` files. There is no shared repository-root `.env`.

The API, Prisma CLI, and API test setup load `apps/api/.env` using paths relative to their files rather than the current working directory. The API path works in both `src/` and compiled `dist/`. This file holds database, Redis, port, cache, and CORS settings. Tests replace `DATABASE_URL` with the test database URL before running migrations.

Next.js loads `apps/web/.env` automatically from the web app directory. Its example contains only `NEXT_PUBLIC_API_URL`, which is exposed to the browser and embedded during builds. Next.js also supports app-local overrides such as `.env.local`; keep API credentials in the API app.

Runtime environment variables take precedence over file values, so CI and deployments can supply configuration directly without `.env` files. Turbo includes each package's `.env*` files in build, typecheck, and test inputs to invalidate cached results when configuration changes. Docker Compose uses its own local service settings and requires no `.env` file.

## Tests

Start Compose first. Integration and e2e tests use `TEST_DATABASE_URL` / `work_board_test` and apply pending migrations to that database automatically.

If `pnpm lint` is intercepted by an editor ESLint wrapper, run the same checks with:

```bash
pnpm --filter api exec eslint .
pnpm --filter web exec eslint .
pnpm --filter @repo/contracts exec eslint .
pnpm --filter @repo/ui exec eslint .
```
