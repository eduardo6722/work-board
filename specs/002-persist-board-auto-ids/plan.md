# Implementation Plan: Saved Board with Title-Only Tasks

**Branch**: `002-persist-board-auto-ids` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-persist-board-auto-ids/spec.md`

`002-persist-board-auto-ids` is the feature identifier from `.specify/feature.json`. No git hook created a branch. Git may still be on `main`.

## Summary

The board keeps tasks and undo history in PostgreSQL, so a restart shows the same cards and the same undo step. A person creates a task with a title only. The API assigns a UUID and a creation sequence. Cards and the new-task screen show the title and do not show the identifier. Column order is that creation sequence.

Reads use the existing Redis cache-aside port. One key holds the board document plus the saved revision. A hit is used only when that revision still matches PostgreSQL, so a repeat view cannot show a board from before the latest saved change. If Redis is down, the read uses PostgreSQL. If PostgreSQL cannot be read or the change cannot be saved, the API stays up and the board request fails with an error. The work-in-progress limit stays `BOARD_WIP_LIMIT`.

## Technical Context

**Language/Version**: TypeScript `~6.0.3` on Node.js `>=22.12.0`

**Primary Dependencies**: NestJS 12, Prisma 7 with `@prisma/adapter-pg`, existing `CachePort` and `RedisCacheService`, Next.js 16 App Router, React 19, Zod 4, TanStack Query 5, React Hook Form 7, `@dnd-kit/core`. No new framework and no new cache client.

**Storage**: PostgreSQL tables `board_meta`, `board_tasks`, and `board_history_entries` for the one board. Redis key `board:state` for the short-lived copy. `BOARD_WIP_LIMIT` stays process configuration and is not a stored column.

**Testing**: Jest domain tests and board HTTP tests stay free of PostgreSQL and Redis by using fakes. Vitest schema tests in `@repo/contracts`. Vitest and React Testing Library for the screen. `pnpm test:e2e` gains a Prisma repository spec against `work_board_test`.

**Target Platform**: Local Linux or any Node 22 host. Web on port 3000, API on port 3001. PostgreSQL and Redis from `docker-compose.yml`.

**Project Type**: Turborepo web application (`apps/web` + `apps/api` + `packages/contracts`).

**Performance Goals**: One board, about 100 tasks. A cached repeat view and a successful create, move, or undo are visible in under 1 second on the local machine. No load-test target.

**Constraints**: Domain code imports neither Nest, Prisma, Redis, HTTP, React, Next, nor `@repo/contracts`. NestJS remains the composition root. No authentication, queues, or GraphQL. No second board. The API still listens when PostgreSQL or Redis is down. Board routes do not pretend a save succeeded. Identifiers are not rendered. Refused actions still change nothing. Result codes from the Kanban specification stay, except `duplicate_task_id` is not a create-route outcome.

**Scale/Scope**: One shared board, three columns, the existing four routes, one screen. Persistence, cache freshness, title-only create, and creation order are the change.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the upstream Spec Kit template. Its principles are placeholders, and `AGENTS.md` says those placeholders are not project rules. There are no ratified constitution gates to violate.

**Pre-research**: Pass. No constitution violation to justify.

**Post-design**: Pass. The design still does not depend on a placeholder principle. It follows the repository rules that are in force:

- Domain stays inside `apps/api` and does not import Nest, Prisma, Redis, HTTP, or `@repo/contracts`.
- The repository port is a domain contract. Prisma and Redis stay in infrastructure and behind `CachePort`.
- NestJS remains the composition root. Use cases are wired with `useFactory`. No new workspace package.
- `@repo/contracts` stays Zod-only. The HTTP task still carries `id` so a card can be moved. That field is not a domain import and is not rendered.
- `@repo/ui` gains no business logic.
- No authentication, queues, or GraphQL.
- Cache-aside uses the existing port, an explicit key, `CACHE_TTL_SECONDS`, and fail-open reads. The revision check is what keeps a hit from beating the saved board.

## Project Structure

### Documentation (this feature)

```text
specs/002-persist-board-auto-ids/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── board-api.md
│   └── board-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

Implementation also adds `docs/decisions/0013-persisted-board.md`, and updates `docs/architecture/overview.md`, `docs/guides/testing.md`, and `README.md` so the board path no longer claims that a restart clears tasks or that board routes ignore PostgreSQL.

### Source Code (repository root)

```text
packages/contracts/src/board/
├── task.schema.ts                 # create body is title only; task document still has id
├── board.schema.ts
├── action-result.schema.ts
└── board.schema.test.ts

apps/api/prisma/schema.prisma      # board_meta, board_tasks, board_history_entries
apps/api/prisma/migrations/...     # additive migration, seeded meta row

apps/api/src/modules/board/
├── domain/
│   ├── board.ts                   # sequence order; create still takes an assigned id
│   ├── board.types.ts
│   ├── board.spec.ts
│   └── repositories/
│       └── board.repository.ts
├── application/
│   ├── board-cache.keys.ts
│   ├── board-unavailable.error.ts
│   └── use-cases/
│       ├── get-board.use-case.ts
│       ├── create-task.use-case.ts
│       ├── move-task.use-case.ts
│       ├── undo-board.use-case.ts
│       └── board.use-cases.spec.ts
├── infrastructure/persistence/
│   ├── mappers/board.mapper.ts
│   └── repositories/
│       ├── prisma-board.repository.ts
│       └── prisma-board.repository.spec.ts
├── presentation/
│   ├── board.controller.ts
│   └── board-http.ts
├── board.module.ts
└── board.http.spec.ts
apps/api/test/jest-e2e.json        # also run the board Prisma repository spec

apps/web/src/lib/api/board.ts
apps/web/src/features/board/
├── components/
│   ├── create-task-dialog.tsx     # title field only
│   ├── task-card.tsx              # title is the visible name
│   ├── create-task-dialog.test.tsx
│   └── board-view.test.tsx
└── hooks/
    └── use-create-task.ts
```

**Structure Decision**: Keep the board module inside `apps/api`. Add the application and infrastructure layers this module did not need while state lived on a singleton. The controller calls use cases. Use cases call `BoardRepository` and `CachePort`. `PrismaBoardRepository` is the only production repository. HTTP tests build the controller with an in-memory repository fake and an in-memory cache fake so `pnpm test` does not open PostgreSQL or Redis. The screen stays in `apps/web/src/features/board`.

## Complexity Tracking

No constitution violations.

Choices later tasks must not undo:

| Choice | Why it stays |
| --- | --- |
| Repository plus four use cases | There is now a real persistence boundary and a cache port. The controller must not own the Prisma transaction. |
| `id` remains on the HTTP task | Drag and the move route address a card. The screen does not render it. |
| Creation `sequence`, not UUID sort | The spec requires creation order. UUID text order is not that order. |
| Revision checked on every cached read | A TTL alone can show a board from before the latest save. One primary-key read confirms the copy. |
| `duplicate_task_id` stays in the result union | The aggregate still rejects an id it already holds. The create route never asks for an id and does not return that code. |
| Board HTTP tests do not use `*.e2e-spec.ts` | The e2e Jest config migrates `work_board_test`. Behavior tests stay on `pnpm test`. The Prisma spec is the e2e proof. |

## Phase 0 and Phase 1 outputs

Research decisions are in [research.md](./research.md). The model is in [data-model.md](./data-model.md). The HTTP and screen contracts are in [contracts/](./contracts/). The run and proof steps are in [quickstart.md](./quickstart.md).

## Implementation notes for `/speckit-tasks`

Order work as the domain sequence change and its tests, then the Prisma migration and repository, then use cases and cache, then the contract and HTTP wiring, then the screen, then docs. Do not add auth, a second board, redo, title editing, or a limit control.

Domain `createTask(id, title)` keeps an explicit id so tests can name tasks. The create use case is what generates `crypto.randomUUID()` inside the locked transaction and retries with a new UUID if the aggregate reports `duplicate_task_id`. After three collisions, fail with `BOARD_UNAVAILABLE`. Empty title still returns `validation_error` and writes nothing.

HTTP mapping stays:

| Code | HTTP |
| --- | --- |
| `task_created` | 201 |
| `task_moved`, `undo_success`, `already_in_column`, `nothing_to_undo` | 200 |
| `validation_error`, `invalid_column` | 400 |
| `task_not_found` | 404 |
| `wip_limit_reached` | 409 |
| `BOARD_UNAVAILABLE` | 503, API error body, not the mutation envelope |

`duplicate_task_id` remains mapped to 409 for the domain result, and the create route does not produce it.

A successful write commits PostgreSQL first, then stores the new document in Redis. A domain refusal or no-change does not bump the revision and does not need a cache write. Storage failure does not update Redis.
