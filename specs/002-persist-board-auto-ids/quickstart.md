# Quickstart: Saved Board with Title-Only Tasks

Validation guide for the implemented feature. Behavior details are in [spec.md](./spec.md), [data-model.md](./data-model.md), and [contracts/board-api.md](./contracts/board-api.md).

## Prerequisites

- Node.js `>=22.12.0`
- pnpm `12.5.1` (see the root `packageManager` field)
- Docker, for the persistence proof and the manual restart check

`pnpm test` does not start Docker. `pnpm test:e2e` and the manual board do.

## Setup

From the repository root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
docker compose up -d
pnpm db:migrate
```

`BOARD_WIP_LIMIT` may be omitted. The limit is then 2.

## Automated checks

Behavior tests, without PostgreSQL or Redis:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

What must pass inside `pnpm test`:

- Domain cases in `apps/api/src/modules/board/domain/board.spec.ts`. Create still accepts an id at that boundary. Column order follows creation sequence, not id text. Undo of a create does not make that sequence available again.
- Use-case cases for a cache hit with the same revision, a miss, a stale revision, a Redis read failure that still returns the saved board, and a successful write whose cache store fails without changing the returned board.
- HTTP cases in `apps/api/src/modules/board/board.http.spec.ts`, using an in-memory repository and cache, not `AppModule`. Create sends `{ "title": "..." }` only. A repeated title is a second task. A spaces-only title is `validation_error`.
- Contract schema tests in `packages/contracts`.
- Web tests: the create dialog has a title field and no id field, cards show the title and not the id, and a storage failure does not add a card.

Persistence proof, with Docker and `work_board_test`:

```bash
pnpm test:e2e
```

The board Prisma repository spec must save tasks and history, open a second repository instance, and read the same titles, columns, creation order, and undo stack. It must not reset or delete the `work_board` database.

## Run

```bash
pnpm dev
```

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- `GET http://localhost:3001/health` with both containers healthy reports the database up.

Stop PostgreSQL and request `GET /api/v1/board`. The API process stays up. The board screen shows the error state, not three empty columns.

## Manual persistence and cache

1. With PostgreSQL and Redis running, create two tasks titled `First` and `Second`. Move `Second` to In Progress.
2. Confirm the new-task dialog has no identifier field and both cards are named by title only. To Do shows `First`. In Progress shows `Second`.
3. Stop the API process and start it again. Do not restart PostgreSQL. Both cards are still in those columns, and Undo reverses the move.
4. Create `Second` again. Two cards titled `Second` exist, and each can be moved on its own.
5. Flush Redis (`docker compose exec redis redis-cli FLUSHDB`) and reload the board. The cards and undo availability are unchanged.
6. Create another task after the flush. Reload. The new card is present.

## Sequence to re-check the limit and undo

Start from an empty saved board with limit 2. Create titles `C`, then `A`, then `B`. Move using the cards, not typed ids.

| Step | Action | Expected code | Board afterward |
| --- | --- | --- | --- |
| 1 | View | — | To Do is `C`, `A`, `B`. Other columns empty. Undo available. |
| 2 | Move `C` to In Progress | `task_moved` | In Progress is `C`. To Do is `A`, `B`. |
| 3 | Move `A` to In Progress | `task_moved` | In Progress is `C`, `A` and shows 2/2. To Do is `B`. |
| 4 | Move `B` to In Progress | `wip_limit_reached` | Unchanged. Undo still points at step 3. |
| 5 | Undo | `undo_success` | `A` returns to To Do. In Progress is `C`. To Do is `A`, `B`. |
| 6 | Move `B` to Done | `task_moved` | Done is `B`. |
| 7 | Move `B` to Done again | `already_in_column` | Unchanged. |
| 8 | Undo | `undo_success` | `B` returns to To Do. Done is empty. |

Restart the API after step 6 and confirm Done still contains `B` before continuing at step 7.
