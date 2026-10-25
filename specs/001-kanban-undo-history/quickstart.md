# Quickstart: Kanban Board with Undo History

Validation guide for the implemented feature. Behavior details are in [spec.md](./spec.md), [data-model.md](./data-model.md), and [contracts/board-api.md](./contracts/board-api.md).

## Prerequisites

- Node.js `>=22.12.0`
- pnpm `12.5.1` (see the root `packageManager` field)
- No Docker, PostgreSQL, or Redis process

## Setup

From the repository root:

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

Copying the example env files is enough. `DATABASE_URL` and `REDIS_URL` stay filled in, and the database and cache processes stay stopped. Optional: set `BOARD_WIP_LIMIT=2` in `apps/api/.env`. If the variable is omitted, the limit is 2.

## Run

```bash
pnpm dev
```

- Web: `http://localhost:3000` shows the board, not the example screen.
- API: `http://localhost:3001` listens even when PostgreSQL and Redis are down.
- `GET http://localhost:3001/health` may report the database as down. Board routes still answer.
- Example routes under `/api/v1/examples` still need PostgreSQL. They are not part of this validation.

Stop the process and start it again before a clean-board check. Restart clears tasks and undo history.

## Automated checks

Default tests do not need a database:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm test:e2e` still targets the example API and requires Docker with `work_board_test`. It is not required to prove the board.

What must pass inside `pnpm test`:

- Domain cases in `apps/api/src/modules/board/domain/board.spec.ts`, including the official sequence below.
- HTTP cases in the board supertest spec, using `BoardModule` only, covering validation, the result codes, sequential requests on one board, and undo.
- Contract schema tests in `packages/contracts`.
- Web tests for create validation, board rendering, the full-column display, undo availability, and action feedback.

## Official sequence

Start from a fresh process with limit 2. Create `A`, `B`, and `C`, then:

| Step | Action | Expected code | Board afterward |
| --- | --- | --- | --- |
| 1 | Move `A` to `in_progress` | `task_moved` | In Progress: `A`. To Do: `B`, `C`. |
| 2 | Move `B` to `in_progress` | `task_moved` | In Progress: `A`, `B` (2/2). To Do: `C`. |
| 3 | Move `C` to `in_progress` | `wip_limit_reached` | Unchanged. This attempt is not undoable. |
| 4 | Undo | `undo_success` | `B` returns to To Do. In Progress: `A` (1/2). |
| 5 | Move `C` to `done` | `task_moved` | Done: `C`. |
| 6 | Move `C` to `done` again | `already_in_column` | Unchanged. This attempt is not undoable. |
| 7 | Undo | `undo_success` | `C` returns to To Do. |

Final view: In Progress contains `A`, To Do contains `B` then `C`, Done is empty, the display is 1/2, and undo is still available.

HTTP shape for each mutation is `{ result, board }` as in [contracts/board-api.md](./contracts/board-api.md). Empty undo on a fresh process returns HTTP 200 and code `nothing_to_undo`.

## Manual demo (different from the official sequence)

Use the screen, not the table above.

1. Create `C` "Close the register", `A` "Open the register", `B` "Count items". Confirm To Do shows `A`, `B`, `C`.
2. Drag `A` to In Progress. Confirm 1/2.
3. Use the non-drag control to move `B` to In Progress. Confirm 2/2.
4. Drag `C` onto In Progress. Confirm an error, `C` still in To Do, and undo still aimed at `B`'s move.
5. Move `A` to Done with the non-drag control. Confirm 1/2.
6. Drag `C` to In Progress. Confirm success and 2/2.
7. Undo twice. `C` returns to To Do, then `A` returns to In Progress.
8. Undo until the button disables. Those clicks return `undo_success`. `nothing_to_undo` is returned when undo is requested after the history is already empty.

## Restart check

With tasks on the board, stop the API and start it again. The board is empty, undo is disabled, and the limit is back to the configured value.
