# Work Board

Case 01 is a three-column Kanban board: To Do, In Progress, and Done. A person creates a task, moves it by dragging or with a select, and undoes the last successful create or move. In Progress holds a fixed number of tasks. The default limit is 2.

The board saves tasks and undo history in PostgreSQL. Redis can answer a repeat view when that copy still matches the saved revision. A successful board load needs PostgreSQL. `pnpm test` does not.

## Install and run

Requirements: Node.js `>=22.12.0` and pnpm `12.5.1`.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
pnpm dev
```

Start PostgreSQL and Redis with `docker compose up -d`, then apply migrations with `pnpm db:migrate`. Optional: set `BOARD_WIP_LIMIT=2` in `apps/api/.env`. If it is omitted, the limit is 2.

- Web: http://localhost:3000 shows the Kanban board
- API: http://localhost:3001 listens even when PostgreSQL and Redis are down
- Health: http://localhost:3001/health may report the database as down. Board routes then return an error instead of an empty board.

Stop the API and start it again. Tasks and undo history stay in PostgreSQL. Flushing Redis does not remove them.

## Checks

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

`pnpm test` does not need Docker. `pnpm test:e2e` migrates `work_board_test` and runs the board Prisma repository spec. That command needs Docker. It must not reset `work_board`.

`pnpm lint` can be intercepted by an editor ESLint wrapper that fails before ESLint runs. `pnpm exec turbo run lint`, or `eslint .` inside each package, is the check that ran successfully for this change.

## How the board works

The domain object is `Board` in `apps/api/src/modules/board/domain/board.ts`. It stores tasks in a map and successful creates and moves on a private stack. `getState()` builds `columns.todo`, `columns.in_progress`, and `columns.done` in creation order, plus `wipLimit` and `canUndo`. There is no stored utilization count. The count is `columns.in_progress.length`. PostgreSQL is the saved copy. The create route assigns the task id. The screen shows the title only.

Shared Zod schemas in `@repo/contracts` describe the board document, the create body, the move body, and the action result. The domain does not import that package. The controller parses create and move bodies itself so a refusal still returns `{ result, board }`.

A create starts in `todo`. A move into `in_progress` is refused with `wip_limit_reached` when that column is already at the limit. Moves out of In Progress are allowed. The same column returns `already_in_column`. Empty undo returns `nothing_to_undo` with HTTP 200. Refusals and no-change actions do not push history. Undo reverses one step and does not record itself.

The web screen reads `GET /api/v1/board` with TanStack Query. Create, move, and undo call `setQueryData(boardKeys.state(), body.board)` and do not invalidate the query. Drag-and-drop does not write the cache before the response, so a refused drop leaves the card where the server left it.

## Manual demo

This is the screen walkthrough from `specs/001-kanban-undo-history/quickstart.md`. It is not the official seven-step sequence.

1. Create titles `Close the register`, `Open the register`, and `Count items`, in that order. Confirm To Do shows them in that order. There is no id field.
2. Drag `Open the register` to In Progress. Confirm 1/2.
3. Use the non-drag control to move `Count items` to In Progress. Confirm 2/2.
4. Drag `Close the register` onto In Progress. Confirm an error, that card still in To Do, and undo still aimed at the previous move.
5. Move `Open the register` to Done with the non-drag control. Confirm 1/2.
6. Drag `Close the register` to In Progress. Confirm success and 2/2.
7. Undo twice. `Close the register` returns to To Do, then `Open the register` returns to In Progress.
8. Undo until the button disables. Each of those clicks is `undo_success`. The button does not send another request after that. When nothing remains to undo, `POST /api/v1/board/undo` returns `nothing_to_undo`.

## Tests that catch real mistakes

1. `Board moveTask` refuses a third task when the limit is 2 and compares the board snapshot, including `canUndo`, with the board from before the call. That fails if a refused move changes columns or pushes history.
2. `Board HTTP` posts `POST /api/v1/board/undo` on an empty board and expects HTTP 200 with code `nothing_to_undo`. That fails if empty undo is turned into an error status.
3. `createTaskSchema` parses title ` A ` and expects the same string back, with no `id` field. That fails if the schema trims titles or starts requiring an id again. A domain test creates `10` then `2` and expects that creation order, which fails an id-text or numeric sort.

## Decisions

### Persisted board

Checked the later spec: tasks and undo history remain after a restart, create sends a title only, and a repeat view matches the saved board. Investigated the in-memory board from ADR 0012 and the example module's Prisma repository and Redis cache-aside port. Alternatives were staying in memory, one JSON document, or serving Redis until its timer expired. Conclusion: PostgreSQL stores the board, a row lock serializes writes, and Redis is used only when its revision matches. A failed PostgreSQL connect is still logged and does not stop startup. See `docs/decisions/0013-persisted-board.md`. ADR 0012 still records the undo stack.

### Operation stack

Checked the spec: undo reverses one successful create or move, newest first, and does not undo a refusal. Investigated a full-board snapshot after each success. That works, but it copies every task and makes the inverse less obvious. Conclusion: push `TASK_CREATED` or `TASK_MOVED`, and pop after applying the inverse. The HTTP board exposes `canUndo` only.

## AI usage

This implementation was produced in Cursor from `specs/001-kanban-undo-history`. The language clarification in that spec replaced the original column names with `todo`, `in_progress`, and `done`, and the empty-undo code with `nothing_to_undo`. Those identifiers were checked in the domain, contracts, HTTP tests, and screen. Undo was checked so it does not call the work-in-progress rule again. `pnpm test`, `pnpm lint`, `pnpm typecheck`, and `pnpm build` are the validation commands for this change. No video was recorded.

## Limitations

- A successful board load needs PostgreSQL. If it is down, the board screen shows an error. Redis failure falls through to the saved board.
- There is no live collaboration. The last fully saved change is what the next view shows.
- There is no redo.
- There is no authentication. Do not expose the API publicly.
- There is no second board.

## Submission placeholders

| Field | Value |
| --- | --- |
| Repository URL | |
| Commit hash | |
| Video URL | |
| Time spent | |

## Documentation

- [Architecture](docs/architecture/overview.md)
- [Testing](docs/guides/testing.md)
- [In-memory board](docs/decisions/0012-in-memory-board.md)
- [Persisted board](docs/decisions/0013-persisted-board.md)
- [Remove the example feature](docs/decisions/0014-remove-example-feature.md)
- [Video outline](docs/VIDEO_SCRIPT.md)
- [Feature spec](specs/001-kanban-undo-history/spec.md)
