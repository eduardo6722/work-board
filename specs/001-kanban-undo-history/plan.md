# Implementation Plan: Kanban Board with Undo History

**Branch**: `001-kanban-undo-history` | **Date**: 2026-10-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-kanban-undo-history/spec.md`

`001-kanban-undo-history` is the feature identifier from `.specify/feature.json`. No git hook created a branch. Git may still be on `main`.

## Summary

A person uses one three-column board: create a task into To Do, move it with drag-and-drop or a non-drag control, and undo the last successful create or move. In Progress holds at most a fixed limit (default 2). Refusals and no-change actions leave the board and the undo stack alone. Empty undo returns the code `nothing_to_undo`.

The board is a pure TypeScript aggregate, one singleton per API process, with an operation stack. NestJS exposes four routes under `/api/v1`. Shared Zod schemas in `@repo/contracts` validate input and responses. The Next.js home page renders the confirmed board from TanStack Query after each response. PostgreSQL and Redis stay in the boilerplate but are not on the board path, and a failed database connect no longer stops the API from listening.

## Technical Context

**Language/Version**: TypeScript `~6.0.3` on Node.js `>=22.12.0`

**Primary Dependencies**: NestJS 12, Next.js 16 App Router, React 19, Zod 4, TanStack Query 5, React Hook Form 7, existing `@repo/ui` primitives, `@dnd-kit/core` (to add). No new backend framework.

**Storage**: In-memory `Board` singleton. No Prisma and no Redis for this feature. Process restart clears the board.

**Testing**: Jest for the domain and for board HTTP (Supertest, `BoardModule` only). Vitest and React Testing Library for the screen. Vitest schema tests in `@repo/contracts`. Default `pnpm test` does not need PostgreSQL. Existing example e2e stays on `pnpm test:e2e` and still needs `work_board_test`.

**Target Platform**: Local Linux or any Node 22 host. Web on port 3000, API on port 3001.

**Project Type**: Turborepo web application (`apps/web` + `apps/api` + `packages/contracts`).

**Performance Goals**: One person, sequential actions, tens of tasks. A create, move, or undo on the local machine is visible in under a second. No concurrency control and no load target.

**Constraints**: Exact column ids and result codes from the spec. Domain code imports neither Nest, Prisma, Redis, HTTP, React, Next, nor `@repo/contracts`. No authentication. No task edit or delete. No redo. No manual order. The API listens when PostgreSQL and Redis are down. Work-in-progress limit is a positive integer fixed at process start, default 2.

**Scale/Scope**: One board, three columns, two mutation kinds plus undo, four HTTP routes, one screen.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` is the upstream Spec Kit template. Its principles are placeholders, and `AGENTS.md` says those placeholders are not project rules. There are no ratified constitution gates to violate.

**Pre-research**: Pass. No constitution violation to justify.

**Post-design**: Pass. The design still does not depend on a placeholder principle. It follows the repository rules that are in force:

- Domain stays inside `apps/api` and does not import Nest, Prisma, Redis, HTTP, or `@repo/contracts`.
- NestJS remains the composition root. No new workspace package for the board.
- `@repo/contracts` stays Zod-only. Transport types are not domain types.
- `@repo/ui` gains no business logic. The screen composes existing primitives.
- No authentication, queues, or GraphQL.
- The example Prisma repository remains the persistence pattern for the example feature. This feature does not copy it, because there is no persistence boundary. That is recorded in [research.md](./research.md), not as a constitution exception.

## Project Structure

### Documentation (this feature)

```text
specs/001-kanban-undo-history/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   ├── board-api.md
│   └── board-ui.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Created later by /speckit-tasks
```

Implementation also updates `README.md`, adds `docs/VIDEO_SCRIPT.md`, adds `docs/decisions/0012-in-memory-board.md`, and adjusts `docs/architecture/overview.md` plus `docs/guides/testing.md` so startup and `pnpm test` match this plan.

### Source Code (repository root)

```text
packages/contracts/src/board/
├── board.schema.ts
├── task.schema.ts
├── action-result.schema.ts
└── board.schema.test.ts

apps/api/src/config/env.schema.ts                         # add BOARD_WIP_LIMIT
apps/api/src/shared/database/prisma.service.ts            # connect failure does not abort startup
apps/api/src/modules/board/
├── domain/
│   ├── board.ts
│   ├── board.types.ts
│   └── board.spec.ts
├── presentation/
│   ├── board.controller.ts
│   └── board-http.ts
├── board.module.ts
└── board.http.spec.ts
apps/api/src/app.module.ts                                # import BoardModule
apps/api/jest.config.cjs                                  # unit run without prisma migrate
apps/api/test/jest-e2e.json                               # keeps migrate; also runs the Prisma repository spec

apps/web/src/lib/api/board.ts
apps/web/src/features/board/
├── components/
│   ├── board-view.tsx
│   ├── board-column.tsx
│   ├── task-card.tsx
│   ├── create-task-dialog.tsx
│   ├── undo-button.tsx
│   ├── board-view.test.tsx
│   └── create-task-dialog.test.tsx
└── hooks/
    ├── board-query-keys.ts
    ├── use-board.ts
    ├── use-create-task.ts
    ├── use-move-task.ts
    └── use-undo.ts
apps/web/src/app/page.tsx                                 # render the board
```

**Structure Decision**: Use the existing apps and the example module's layer names only where they earn their keep. The board has domain plus a thin HTTP presentation. There is no `infrastructure/` directory and no application use-case class. The controller injects the singleton `Board`. HTTP status mapping lives in `board-http.ts`. The web feature follows `docs/architecture/frontend.md`: fetch helpers in `src/lib/api`, screens and hooks in `src/features/board`. Project-owned components use the required body order.

## Complexity Tracking

No constitution violations.

The simplifications that later tasks must not "correct" back into boilerplate:

| Choice | Why it stays |
| --- | --- |
| No repository and no Prisma mapper | The `Board` instance is the state. A port would not hide a second implementation. |
| No application use-case class | Four methods on `Board` are already the use cases. A forwarding service would only exist to match the example module. |
| Board HTTP tests are `*.spec.ts`, not `*.e2e-spec.ts` | The e2e Jest config migrates `work_board_test`. The board suite must run with `pnpm test` while PostgreSQL is down. |
| Global validation pipe is unchanged | Example routes keep `VALIDATION_ERROR`. Board routes parse Zod themselves so refusals still return `{ result, board }` with code `validation_error`. |

## Phase 0 and Phase 1 outputs

Research decisions are in [research.md](./research.md). The model is in [data-model.md](./data-model.md). The HTTP and screen contracts are in [contracts/](./contracts/). The run and proof steps are in [quickstart.md](./quickstart.md).

## Implementation notes for `/speckit-tasks`

Order work as domain tests and `Board`, then contracts and HTTP, then the screen, then docs. Do not add auth, edit, delete, redo, a second board, or a limit editor.

Domain `board.spec.ts` must include the official sequence and the cases listed in the spec's edge cases: duplicate id, empty text, unknown task, unknown column, same-column move, limit boundary, limit exceeded, undo of create, undo of move, repeated undo, empty undo, failure and no-change leaving history untouched, and UTF-16 id order.

HTTP mapping to implement exactly:

| Code | HTTP |
| --- | --- |
| `task_created` | 201 |
| `task_moved`, `undo_success`, `already_in_column`, `nothing_to_undo` | 200 |
| `validation_error`, `invalid_column` | 400 |
| `task_not_found` | 404 |
| `duplicate_task_id`, `wip_limit_reached` | 409 |

`BOARD_WIP_LIMIT` is `z.coerce.number().int().positive().default(2)` on the existing env schema. The provider factory passes it to `new Board(limit)`.

Frontend mutations call `setQueryData(boardKeys.state(), body.board)` and do not invalidate. Drag-and-drop does not write the cache before the response. Add `@dnd-kit/core` only.

Component files use states, library hooks, custom hooks, constants, functions, effects, return. Skip empty effect blocks.

After implementation, run the commands in [quickstart.md](./quickstart.md) and the independent code review required by the repository rules.
